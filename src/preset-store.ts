import { randomUUID } from "node:crypto";
import type {
	AudioPresetDraft,
	PresetEndpoint,
	PresetProfile,
} from "./preset-model";

export type AudioPreset = AudioPresetDraft & { id: string };

export type PresetStorage = {
	getItem(key: string): Promise<string | undefined>;
	setItem(key: string, value: string): Promise<void>;
};

const STORAGE_KEY = "audio-presets";
const RESTORE_STORAGE_KEY = "audio-restore-snapshot";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEndpoint(value: unknown): value is PresetEndpoint {
	return (
		isRecord(value) &&
		typeof value.name === "string" &&
		typeof value.description === "string" &&
		(value.deviceName === undefined || typeof value.deviceName === "string")
	);
}

function isProfile(value: unknown): value is PresetProfile {
	return (
		isRecord(value) &&
		typeof value.cardName === "string" &&
		typeof value.profileName === "string"
	);
}

function isAudioPresetDraft(value: unknown): value is AudioPresetDraft {
	return (
		isRecord(value) &&
		typeof value.name === "string" &&
		(value.output === undefined || isEndpoint(value.output)) &&
		(value.input === undefined || isEndpoint(value.input)) &&
		Array.isArray(value.profiles) &&
		value.profiles.every(isProfile)
	);
}

function isAudioPreset(value: unknown): value is AudioPreset {
	return (
		isRecord(value) && typeof value.id === "string" && isAudioPresetDraft(value)
	);
}

export class AudioPresetStore {
	constructor(
		private readonly storage: PresetStorage,
		private readonly createId: () => string = randomUUID,
	) {}

	async list(): Promise<AudioPreset[]> {
		const serialized = await this.storage.getItem(STORAGE_KEY);
		if (serialized === undefined || serialized.length === 0) return [];

		let value: unknown;
		try {
			value = JSON.parse(serialized);
		} catch {
			throw new Error("Saved audio presets are invalid JSON");
		}

		if (!Array.isArray(value) || !value.every(isAudioPreset)) {
			throw new Error("Saved audio presets have an invalid format");
		}
		return value;
	}

	async save(draft: AudioPresetDraft): Promise<AudioPreset> {
		const name = draft.name.trim();
		if (!name) throw new Error("Preset name is required");

		const preset: AudioPreset = { ...draft, name, id: this.createId() };
		const existing = await this.list();
		await this.storage.setItem(
			STORAGE_KEY,
			JSON.stringify([...existing, preset]),
		);
		return preset;
	}

	async getRestoreSnapshot(): Promise<AudioPresetDraft | undefined> {
		const serialized = await this.storage.getItem(RESTORE_STORAGE_KEY);
		if (serialized === undefined || serialized.length === 0) return undefined;

		let value: unknown;
		try {
			value = JSON.parse(serialized);
		} catch {
			throw new Error("Saved restore setup is invalid JSON");
		}

		if (!isAudioPresetDraft(value)) {
			throw new Error("Saved restore setup has an invalid format");
		}
		return value;
	}

	async saveRestoreSnapshot(setup: AudioPresetDraft): Promise<void> {
		if (!setup.name.trim()) throw new Error("Restore setup name is required");
		await this.storage.setItem(RESTORE_STORAGE_KEY, JSON.stringify(setup));
	}

	async clearRestoreSnapshot(): Promise<void> {
		await this.storage.setItem(RESTORE_STORAGE_KEY, "");
	}
}
