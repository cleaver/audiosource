import type { AudioInventory } from "./audio-inventory";
import {
	captureCurrentSetup,
	captureRestoreSetup,
	type AudioPresetDraft,
} from "./preset-model";
import type { AudioPreset } from "./preset-store";

export type PresetSaver = {
	save(draft: ReturnType<typeof captureCurrentSetup>): Promise<AudioPreset>;
};

export async function saveCurrentSetupAsPreset(
	name: string,
	inventory: AudioInventory,
	saver: PresetSaver,
): Promise<AudioPreset> {
	return saver.save(captureCurrentSetup(name, inventory));
}

export type PresetExecution = {
	readInventory: () => Promise<AudioInventory>;
	setCardProfile: (cardName: string, profileName: string) => Promise<void>;
	setDefaultEndpoint: (kind: "input" | "output", name: string) => Promise<void>;
	saveRestoreSnapshot: (setup: AudioPresetDraft) => Promise<void>;
	clearRestoreSnapshot: () => Promise<void>;
	delay?: (milliseconds: number) => Promise<void>;
};

export type ProfileChangeExecution = Pick<
	PresetExecution,
	"readInventory" | "setCardProfile" | "delay"
>;

const PROFILE_POLL_ATTEMPTS = 12;
const PROFILE_POLL_INTERVAL_MS = 150;

function messageOf(reason: unknown): string {
	return reason instanceof Error ? reason.message : String(reason);
}

function validateProfiles(
	profiles: AudioPresetDraft["profiles"],
	inventory: AudioInventory,
) {
	for (const target of profiles) {
		const card = inventory.cards.find(
			(candidate) => candidate.name === target.cardName,
		);
		if (!card) {
			throw new Error(`Preset device is unavailable: ${target.cardName}`);
		}
		if (
			card.activeProfile !== target.profileName &&
			!card.profiles.some(
				(profile) => profile.name === target.profileName && profile.available,
			)
		) {
			throw new Error(`Preset profile is unavailable: ${target.profileName}`);
		}
	}
}

function targetEndpointsAvailable(
	setup: AudioPresetDraft,
	inventory: AudioInventory,
): boolean {
	return (
		(!setup.output ||
			inventory.outputs.some(
				(endpoint) => endpoint.name === setup.output?.name,
			)) &&
		(!setup.input ||
			inventory.inputs.some((endpoint) => endpoint.name === setup.input?.name))
	);
}

async function applySetup(
	setup: AudioPresetDraft,
	execution: PresetExecution,
): Promise<AudioInventory> {
	let inventory = await execution.readInventory();
	validateProfiles(setup.profiles, inventory);

	for (const target of setup.profiles) {
		const card = inventory.cards.find(
			(candidate) => candidate.name === target.cardName,
		);
		if (card && card.activeProfile !== target.profileName) {
			await execution.setCardProfile(target.cardName, target.profileName);
		}
	}

	for (let attempt = 0; attempt < PROFILE_POLL_ATTEMPTS; attempt += 1) {
		inventory = await execution.readInventory();
		if (targetEndpointsAvailable(setup, inventory)) break;
		if (attempt === PROFILE_POLL_ATTEMPTS - 1) {
			const missing = [
				setup.output &&
					!inventory.outputs.some(
						(endpoint) => endpoint.name === setup.output?.name,
					) &&
					`output “${setup.output.description}”`,
				setup.input &&
					!inventory.inputs.some(
						(endpoint) => endpoint.name === setup.input?.name,
					) &&
					`input “${setup.input.description}”`,
			].filter(Boolean);
			throw new Error(
				`Preset ${missing.join(" and ")} did not become available`,
			);
		}
		await (
			execution.delay ??
			((milliseconds) =>
				new Promise((resolve) => setTimeout(resolve, milliseconds)))
		)(PROFILE_POLL_INTERVAL_MS);
	}

	if (setup.output) {
		await execution.setDefaultEndpoint("output", setup.output.name);
	}
	if (setup.input) {
		await execution.setDefaultEndpoint("input", setup.input.name);
	}

	inventory = await execution.readInventory();
	if (
		(setup.output &&
			!inventory.outputs.some(
				(endpoint) =>
					endpoint.name === setup.output?.name && endpoint.isDefault,
			)) ||
		(setup.input &&
			!inventory.inputs.some(
				(endpoint) => endpoint.name === setup.input?.name && endpoint.isDefault,
			))
	) {
		throw new Error("Audio defaults did not match the requested preset");
	}
	return inventory;
}

export async function applyAudioPreset(
	preset: AudioPreset,
	execution: PresetExecution,
): Promise<AudioInventory> {
	const before = await execution.readInventory();
	validateProfiles(preset.profiles, before);
	const snapshot = captureRestoreSetup(
		before,
		preset.profiles.map((profile) => profile.cardName),
	);
	await execution.saveRestoreSnapshot(snapshot);

	try {
		return await applySetup(preset, execution);
	} catch (reason) {
		try {
			await applySetup(snapshot, execution);
			await execution.clearRestoreSnapshot();
		} catch (rollbackReason) {
			throw new Error(
				`${messageOf(reason)}; rollback failed: ${messageOf(rollbackReason)}`,
			);
		}
		throw reason;
	}
}

export async function restoreAudioSetup(
	setup: AudioPresetDraft,
	execution: PresetExecution,
): Promise<AudioInventory> {
	return applySetup(setup, execution);
}

export async function changeAudioCardProfile(
	cardName: string,
	profileName: string,
	execution: ProfileChangeExecution,
): Promise<AudioInventory> {
	const initial = await execution.readInventory();
	const card = initial.cards.find((candidate) => candidate.name === cardName);
	if (!card) throw new Error(`Audio device is unavailable: ${cardName}`);
	if (card.activeProfile === profileName) return initial;
	if (
		!card.profiles.some(
			(profile) => profile.name === profileName && profile.available,
		)
	) {
		throw new Error(`Audio profile is unavailable: ${profileName}`);
	}
	if (!card.activeProfile) {
		throw new Error(`Current audio profile is unknown for ${cardName}`);
	}

	await execution.setCardProfile(cardName, profileName);
	for (let attempt = 0; attempt < PROFILE_POLL_ATTEMPTS; attempt += 1) {
		const updated = await execution.readInventory();
		const updatedCard = updated.cards.find(
			(candidate) => candidate.name === cardName,
		);
		if (updatedCard?.activeProfile === profileName) {
			await (
				execution.delay ??
				((milliseconds) =>
					new Promise((resolve) => setTimeout(resolve, milliseconds)))
			)(PROFILE_POLL_INTERVAL_MS);
			return execution.readInventory();
		}
		await (
			execution.delay ??
			((milliseconds) =>
				new Promise((resolve) => setTimeout(resolve, milliseconds)))
		)(PROFILE_POLL_INTERVAL_MS);
	}

	try {
		await execution.setCardProfile(cardName, card.activeProfile);
	} catch (reason) {
		throw new Error(
			`Audio profile did not change to ${profileName}; rollback failed: ${messageOf(reason)}`,
		);
	}
	throw new Error(`Audio profile did not change to ${profileName}`);
}
