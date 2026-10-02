import { spawn } from "node:child_process";

export type BluetoothAudioDevice = {
	address: string;
	name: string;
	icon?: string;
	connected: boolean;
};

export type BluetoothctlExecutor = (args: string[]) => Promise<string>;

export type BluetoothControlOptions = {
	execute?: BluetoothctlExecutor;
	delay?: (milliseconds: number) => Promise<void>;
};

const BLUETOOTHCTL_TIMEOUT_MS = 10_000;
const MAX_CONNECT_ATTEMPTS = 2;
const STATUS_POLL_ATTEMPTS = 6;
const STATUS_POLL_INTERVAL_MS = 350;
const ADDRESS_PATTERN = /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i;

function runBluetoothctl(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn("bluetoothctl", args, {
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, LC_ALL: "C" },
		});
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
				reject(
					new Error(
						`bluetoothctl timed out after ${BLUETOOTHCTL_TIMEOUT_MS} ms`,
					),
				),
			);
		}, BLUETOOTHCTL_TIMEOUT_MS);

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk: string) => (stdout += chunk));
		child.stderr.on("data", (chunk: string) => (stderr += chunk));
		child.on("error", (error) => {
			finish(() =>
				reject(new Error(`Could not start bluetoothctl: ${error.message}`)),
			);
		});
		child.on("close", (code) => {
			finish(() => {
				if (code !== 0) {
					reject(
						new Error(
							stderr.trim() || `bluetoothctl exited with status ${code}`,
						),
					);
					return;
				}
				resolve(stdout);
			});
		});
	});
}

function parsePairedDevices(output: string) {
	return output.split(/\r?\n/).flatMap((line) => {
		const match = line.match(
			/^Device\s+((?:[0-9a-f]{2}:){5}[0-9a-f]{2})\s+(.+)$/i,
		);
		return match ? [{ address: match[1], listedName: match[2].trim() }] : [];
	});
}

function parseDeviceInfo(
	address: string,
	listedName: string,
	output: string,
): BluetoothAudioDevice | undefined {
	const fields = new Map<string, string>();
	const uuids: string[] = [];
	for (const line of output.split(/\r?\n/)) {
		const match = line.match(/^\s*([^:]+):\s*(.*)$/);
		if (!match) continue;
		const key = match[1].trim();
		const value = match[2].trim();
		if (key === "UUID") uuids.push(value);
		else fields.set(key, value);
	}

	if (fields.get("Paired") !== "yes") return undefined;
	const icon = fields.get("Icon");
	const hasAudioUuid = uuids.some((uuid) => {
		const serviceName = uuid.replace(/\s+\([^)]*\)\s*$/, "").trim();
		return /^(audio sink|headset|handsfree)$/i.test(serviceName);
	});
	if (!icon?.toLowerCase().startsWith("audio-") && !hasAudioUuid) {
		return undefined;
	}

	const connectedField = fields.get("Connected");
	if (connectedField !== "yes" && connectedField !== "no") {
		throw new Error(`Could not determine Bluetooth status for ${listedName}`);
	}

	return {
		address,
		name: fields.get("Alias") || fields.get("Name") || listedName,
		...(icon ? { icon } : {}),
		connected: connectedField === "yes",
	};
}

async function readAudioDevice(
	address: string,
	execute: BluetoothctlExecutor,
): Promise<BluetoothAudioDevice> {
	const output = await execute(["info", address]);
	const device = parseDeviceInfo(address, address, output);
	if (!device) {
		throw new Error(`Paired Bluetooth audio device was not found: ${address}`);
	}
	return device;
}

export async function readBluetoothAudioDevices(
	execute: BluetoothctlExecutor = runBluetoothctl,
): Promise<BluetoothAudioDevice[]> {
	const output = await execute(["devices", "Paired"]);
	const paired = parsePairedDevices(output);
	const devices: BluetoothAudioDevice[] = [];

	for (const item of paired) {
		const info = await execute(["info", item.address]);
		const device = parseDeviceInfo(item.address, item.listedName, info);
		if (device) devices.push(device);
	}

	return devices;
}

function validateAddress(address: string) {
	if (!ADDRESS_PATTERN.test(address)) {
		throw new Error("Bluetooth device address is invalid");
	}
}

function messageOf(reason: unknown): string {
	return reason instanceof Error ? reason.message : String(reason);
}

async function pause(
	delay: BluetoothControlOptions["delay"],
	milliseconds: number,
) {
	await (
		delay ??
		((duration) => new Promise((resolve) => setTimeout(resolve, duration)))
	)(milliseconds);
}

async function pollConnectionState(
	address: string,
	expected: boolean,
	execute: BluetoothctlExecutor,
	delay: BluetoothControlOptions["delay"],
): Promise<{
	device?: BluetoothAudioDevice;
	lastError?: string;
}> {
	let device: BluetoothAudioDevice | undefined;
	let lastError: string | undefined;
	for (let attempt = 0; attempt < STATUS_POLL_ATTEMPTS; attempt += 1) {
		try {
			device = await readAudioDevice(address, execute);
			lastError = undefined;
			if (device.connected === expected) return { device };
		} catch (reason) {
			lastError = messageOf(reason);
		}
		if (attempt < STATUS_POLL_ATTEMPTS - 1) {
			await pause(delay, STATUS_POLL_INTERVAL_MS);
		}
	}
	return { ...(device ? { device } : {}), ...(lastError ? { lastError } : {}) };
}

export async function connectBluetoothAudioDevice(
	address: string,
	options: BluetoothControlOptions = {},
): Promise<BluetoothAudioDevice> {
	validateAddress(address);
	const execute = options.execute ?? runBluetoothctl;
	const initial = await readAudioDevice(address, execute);
	if (initial.connected) return initial;

	let lastCommandError: string | undefined;
	let finalCheck: Awaited<ReturnType<typeof pollConnectionState>> = {};
	for (let attempt = 0; attempt < MAX_CONNECT_ATTEMPTS; attempt += 1) {
		try {
			const result = await execute(["connect", address]);
			const failure = result
				.split(/\r?\n/)
				.find((line) => /failed to connect/i.test(line));
			if (failure) lastCommandError = failure.trim();
		} catch (reason) {
			lastCommandError = messageOf(reason);
		}

		finalCheck = await pollConnectionState(
			address,
			true,
			execute,
			options.delay,
		);
		if (finalCheck.device?.connected) return finalCheck.device;
	}

	const detail = finalCheck.device
		? "device remains disconnected"
		: `status check failed${finalCheck.lastError ? `: ${finalCheck.lastError}` : ""}`;
	throw new Error(
		`Could not connect to ${initial.name} after ${MAX_CONNECT_ATTEMPTS} attempts; ${detail}${lastCommandError ? ` (${lastCommandError})` : ""}`,
	);
}

export async function disconnectBluetoothAudioDevice(
	address: string,
	options: BluetoothControlOptions = {},
): Promise<BluetoothAudioDevice> {
	validateAddress(address);
	const execute = options.execute ?? runBluetoothctl;
	const initial = await readAudioDevice(address, execute);
	if (!initial.connected) return initial;

	let commandError: string | undefined;
	try {
		await execute(["disconnect", address]);
	} catch (reason) {
		commandError = messageOf(reason);
	}

	const finalCheck = await pollConnectionState(
		address,
		false,
		execute,
		options.delay,
	);
	if (finalCheck.device && !finalCheck.device.connected)
		return finalCheck.device;
	const detail = finalCheck.device
		? "device remains connected"
		: `status check failed${finalCheck.lastError ? `: ${finalCheck.lastError}` : ""}`;
	throw new Error(
		`Could not disconnect ${initial.name}; ${detail}${commandError ? ` (${commandError})` : ""}`,
	);
}
