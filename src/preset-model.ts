import type { AudioEndpoint, AudioInventory } from "./audio-inventory";

export type PresetEndpoint = Pick<
	AudioEndpoint,
	"name" | "description" | "deviceName"
>;

export type PresetProfile = {
	cardName: string;
	profileName: string;
};

export type AudioPresetDraft = {
	name: string;
	output?: PresetEndpoint;
	input?: PresetEndpoint;
	profiles: PresetProfile[];
};

function presetEndpoint(
	endpoint: AudioEndpoint | undefined,
): PresetEndpoint | undefined {
	if (!endpoint) return undefined;
	return {
		name: endpoint.name,
		description: endpoint.description,
		...(endpoint.deviceName ? { deviceName: endpoint.deviceName } : {}),
	};
}

export function createPresetFromSelection(
	name: string,
	outputName: string | undefined,
	inputName: string | undefined,
	inventory: AudioInventory,
): AudioPresetDraft {
	const presetName = name.trim();
	if (!presetName) throw new Error("Preset name is required");

	const output = outputName
		? inventory.outputs.find((endpoint) => endpoint.name === outputName)
		: undefined;
	if (outputName && !output) {
		throw new Error("Selected output is no longer available");
	}

	const input = inputName
		? inventory.inputs.find((endpoint) => endpoint.name === inputName)
		: undefined;
	if (inputName && !input) {
		throw new Error("Selected input is no longer available");
	}
	if (!output && !input) {
		throw new Error("Choose at least one input or output");
	}

	const profiles: PresetProfile[] = [];
	const seenCards = new Set<string>();
	for (const endpoint of [output, input]) {
		if (!endpoint?.deviceName || seenCards.has(endpoint.deviceName)) continue;
		seenCards.add(endpoint.deviceName);
		const card = inventory.cards.find(
			(candidate) => candidate.name === endpoint.deviceName,
		);
		if (card?.activeProfile) {
			profiles.push({ cardName: card.name, profileName: card.activeProfile });
		}
	}

	return {
		name: presetName,
		output: presetEndpoint(output),
		input: presetEndpoint(input),
		profiles,
	};
}

export function updatePresetFromSelection(
	existing: AudioPresetDraft & { id: string },
	name: string,
	outputName: string | undefined,
	inputName: string | undefined,
	inventory: AudioInventory,
): AudioPresetDraft {
	const presetName = name.trim();
	if (!presetName) throw new Error("Preset name is required");

	const selectEndpoint = (
		kind: "output" | "input",
		selectedName: string | undefined,
		original: PresetEndpoint | undefined,
	) => {
		if (!selectedName) return undefined;
		if (original?.name === selectedName) {
			return { endpoint: original, unchanged: true };
		}

		const endpoint = inventory[kind === "output" ? "outputs" : "inputs"].find(
			(candidate) => candidate.name === selectedName,
		);
		if (!endpoint) {
			throw new Error(`Selected ${kind} is no longer available`);
		}
		return { endpoint: presetEndpoint(endpoint)!, unchanged: false };
	};

	const output = selectEndpoint("output", outputName, existing.output);
	const input = selectEndpoint("input", inputName, existing.input);
	if (!output && !input) throw new Error("Choose at least one input or output");

	const profilesByCard = new Map<string, PresetProfile>();
	const recordProfile = (profile: PresetProfile) => {
		const previous = profilesByCard.get(profile.cardName);
		if (previous && previous.profileName !== profile.profileName) {
			throw new Error(
				`Selected preset devices require incompatible profiles for ${profile.cardName}`,
			);
		}
		profilesByCard.set(profile.cardName, profile);
	};

	for (const selection of [output, input]) {
		const endpoint = selection?.endpoint;
		if (!selection || !endpoint?.deviceName) continue;
		const cardName = endpoint.deviceName;
		if (selection.unchanged) {
			for (const profile of existing.profiles.filter(
				(candidate) => candidate.cardName === cardName,
			)) {
				recordProfile(profile);
			}
		} else {
			const activeProfile = inventory.cards.find(
				(card) => card.name === cardName,
			)?.activeProfile;
			if (activeProfile)
				recordProfile({ cardName, profileName: activeProfile });
		}
	}

	return {
		name: presetName,
		...(output ? { output: output.endpoint } : {}),
		...(input ? { input: input.endpoint } : {}),
		profiles: [...profilesByCard.values()],
	};
}

export function captureCurrentSetup(
	name: string,
	inventory: AudioInventory,
): AudioPresetDraft {
	const presetName = name.trim();
	if (!presetName) throw new Error("Preset name is required");

	const output = inventory.outputs.find((endpoint) => endpoint.isDefault);
	const input = inventory.inputs.find((endpoint) => endpoint.isDefault);
	if (!output && !input)
		throw new Error("There is no default input or output to save");

	const profiles: PresetProfile[] = [];
	const seenCards = new Set<string>();
	for (const endpoint of [output, input]) {
		if (!endpoint?.deviceName || seenCards.has(endpoint.deviceName)) continue;
		seenCards.add(endpoint.deviceName);
		const card = inventory.cards.find(
			(candidate) => candidate.name === endpoint.deviceName,
		);
		if (card?.activeProfile) {
			profiles.push({ cardName: card.name, profileName: card.activeProfile });
		}
	}

	return {
		name: presetName,
		output: presetEndpoint(output),
		input: presetEndpoint(input),
		profiles,
	};
}

export function captureRestoreSetup(
	inventory: AudioInventory,
	additionalCardNames: string[],
): AudioPresetDraft {
	const current = captureCurrentSetup("Previous setup", inventory);
	const profiles = new Map(
		current.profiles.map((profile) => [profile.cardName, profile]),
	);

	for (const cardName of additionalCardNames) {
		const card = inventory.cards.find(
			(candidate) => candidate.name === cardName,
		);
		if (card?.activeProfile) {
			profiles.set(card.name, {
				cardName: card.name,
				profileName: card.activeProfile,
			});
		}
	}

	return { ...current, profiles: [...profiles.values()] };
}

export type PresetAvailability = {
	available: boolean;
	unavailableTargets: string[];
};

export function getPresetAvailability(
	preset: AudioPresetDraft,
	inventory: AudioInventory,
): PresetAvailability {
	const unavailableTargets: string[] = [];

	for (const [endpoint, endpoints] of [
		[preset.output, inventory.outputs],
		[preset.input, inventory.inputs],
	] as const) {
		if (!endpoint) continue;
		if (endpoints.some((candidate) => candidate.name === endpoint.name))
			continue;

		const deviceName = endpoint.deviceName;
		const card = inventory.cards.find(
			(candidate) => candidate.name === deviceName,
		);
		const targetProfile = preset.profiles.find(
			(profile) => profile.cardName === deviceName,
		);
		const profileCanCreateEndpoint =
			card !== undefined &&
			targetProfile !== undefined &&
			card.activeProfile !== targetProfile.profileName &&
			card.profiles.some(
				(profile) =>
					profile.name === targetProfile.profileName && profile.available,
			);
		if (!profileCanCreateEndpoint)
			unavailableTargets.push(endpoint.description);
	}

	for (const target of preset.profiles) {
		const card = inventory.cards.find(
			(candidate) => candidate.name === target.cardName,
		);
		if (!card) {
			unavailableTargets.push(target.cardName);
		} else if (
			card.activeProfile !== target.profileName &&
			!card.profiles.some(
				(profile) => profile.name === target.profileName && profile.available,
			)
		) {
			unavailableTargets.push(target.profileName);
		}
	}

	return {
		available: unavailableTargets.length === 0,
		unavailableTargets,
	};
}
