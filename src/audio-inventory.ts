import { spawn } from "node:child_process";

export type AudioProfile = {
	name: string;
	description: string;
	available: boolean;
};

export type AudioCard = {
	name: string;
	description: string;
	activeProfile: string;
	profiles: AudioProfile[];
	deviceBus?: string;
	deviceProductName?: string;
	deviceFormFactor?: string;
	alsaMixerName?: string;
};

export type AudioEndpoint = {
	name: string;
	description: string;
	deviceName?: string;
	nickname?: string;
	portDescription?: string;
	deviceBus?: string;
	deviceProductName?: string;
	deviceFormFactor?: string;
	isDefault: boolean;
};

export type AudioInventory = {
	cards: AudioCard[];
	outputs: AudioEndpoint[];
	inputs: AudioEndpoint[];
};

export type PactlExecutor = (args: string[]) => Promise<string>;

const PACTL_TIMEOUT_MS = 3000;

function runPactl(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn("pactl", args, { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		let settled = false;

		const finish = (callback: () => void) => {
			if (settled) return;
			settled = true;
			clearTimeout(timeout);
			callback();
		};

		const timeout = setTimeout(() => {
			child.kill("SIGTERM");
			finish(() =>
				reject(new Error(`pactl timed out after ${PACTL_TIMEOUT_MS} ms`)),
			);
		}, PACTL_TIMEOUT_MS);

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => (stdout += chunk));
		child.stderr.on("data", (chunk: string) => (stderr += chunk));
		child.on("error", (error) => {
			finish(() =>
				reject(new Error(`Could not start pactl: ${error.message}`)),
			);
		});
		child.on("close", (code) => {
			finish(() => {
				if (code !== 0) {
					reject(
						new Error(stderr.trim() || `pactl exited with status ${code}`),
					);
					return;
				}
				resolve(stdout);
			});
		});
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parsePactlList(
	json: string,
	label: string,
): Record<string, unknown>[] {
	let value: unknown;
	try {
		value = JSON.parse(json);
	} catch {
		throw new Error(`pactl returned invalid JSON for ${label}`);
	}

	if (!Array.isArray(value) || !value.every(isRecord)) {
		throw new Error(`pactl returned an unexpected list for ${label}`);
	}
	return value;
}

function parseCards(json: string): AudioCard[] {
	return parsePactlList(json, "cards").flatMap((card) => {
		const name = readString(card.name);
		if (!name) return [];

		const properties = isRecord(card.properties) ? card.properties : {};
		const rawProfiles = isRecord(card.profiles) ? card.profiles : {};
		const profiles = Object.entries(rawProfiles).map(
			([profileName, rawProfile]) => {
				const profile = isRecord(rawProfile) ? rawProfile : {};
				return {
					name: readString(profile.name) ?? profileName,
					description: readString(profile.description) ?? profileName,
					available: profile.available === "yes" || profile.available === true,
				};
			},
		);

		return [
			{
				name,
				description: readString(properties["device.description"]) ?? name,
				activeProfile: readString(card.active_profile) ?? "",
				...(readString(properties["device.bus"])
					? { deviceBus: readString(properties["device.bus"]) }
					: {}),
				...(readString(properties["device.product.name"])
					? { deviceProductName: readString(properties["device.product.name"]) }
					: {}),
				...(readString(properties["device.form_factor"])
					? { deviceFormFactor: readString(properties["device.form_factor"]) }
					: {}),
				...(readString(properties["alsa.mixer_name"])
					? { alsaMixerName: readString(properties["alsa.mixer_name"]) }
					: {}),
				profiles,
			},
		];
	});
}

function parseEndpoints(
	json: string,
	defaultName: string,
	label: string,
): AudioEndpoint[] {
	return parsePactlList(json, label)
		.filter((endpoint) => {
			if (label !== "sources") return true;
			const properties = isRecord(endpoint.properties)
				? endpoint.properties
				: {};
			return (
				properties["device.class"] !== "monitor" &&
				!readString(endpoint.name)?.endsWith(".monitor")
			);
		})
		.flatMap((endpoint) => {
			const name = readString(endpoint.name);
			if (!name) return [];
			const properties = isRecord(endpoint.properties)
				? endpoint.properties
				: {};
			const ports = Array.isArray(endpoint.ports)
				? endpoint.ports.filter(isRecord)
				: [];
			const activePort = readString(endpoint.active_port);
			const activePortDescription = activePort
				? ports.find((port) => readString(port.name) === activePort)
						?.description
				: undefined;
			return [
				{
					name,
					description: readString(endpoint.description) ?? name,
					deviceName: readString(properties["device.name"]),
					...(readString(properties["node.nick"])
						? { nickname: readString(properties["node.nick"]) }
						: {}),
					...(readString(activePortDescription)
						? { portDescription: readString(activePortDescription) }
						: {}),
					...(readString(properties["device.bus"])
						? { deviceBus: readString(properties["device.bus"]) }
						: {}),
					...(readString(properties["device.product.name"])
						? {
								deviceProductName: readString(
									properties["device.product.name"],
								),
							}
						: {}),
					...(readString(properties["device.form_factor"])
						? { deviceFormFactor: readString(properties["device.form_factor"]) }
						: {}),
					isDefault: name === defaultName,
				},
			];
		});
}

export async function readAudioInventory(
	executePactl: PactlExecutor = runPactl,
): Promise<AudioInventory> {
	const [cardsJson, sinksJson, sourcesJson, defaultSink, defaultSource] =
		await Promise.all([
			executePactl(["--format=json", "list", "cards"]),
			executePactl(["--format=json", "list", "sinks"]),
			executePactl(["--format=json", "list", "sources"]),
			executePactl(["get-default-sink"]),
			executePactl(["get-default-source"]),
		]);

	return {
		cards: parseCards(cardsJson),
		outputs: parseEndpoints(sinksJson, defaultSink.trim(), "sinks"),
		inputs: parseEndpoints(sourcesJson, defaultSource.trim(), "sources"),
	};
}

export async function setDefaultEndpoint(
	kind: "input" | "output",
	endpointName: string,
	executePactl: PactlExecutor = runPactl,
): Promise<void> {
	if (!endpointName.trim()) throw new Error("Audio endpoint name is required");
	const command = kind === "output" ? "set-default-sink" : "set-default-source";
	await executePactl([command, endpointName]);
}

export async function setCardProfile(
	cardName: string,
	profileName: string,
	executePactl: PactlExecutor = runPactl,
): Promise<void> {
	if (!cardName.trim()) throw new Error("Audio card name is required");
	if (!profileName.trim()) throw new Error("Audio profile name is required");
	await executePactl(["set-card-profile", cardName, profileName]);
}
