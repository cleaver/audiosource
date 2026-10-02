import type { DeviceAliases } from "./device-labels";

export type DeviceAliasStorage = {
	getItem(key: string): Promise<string | null | undefined>;
	setItem(key: string, value: string): Promise<void>;
};

const STORAGE_KEY = "audio-device-aliases";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class DeviceAliasStore {
	constructor(private readonly storage: DeviceAliasStorage) {}

	async list(): Promise<DeviceAliases> {
		const serialized = await this.storage.getItem(STORAGE_KEY);
		if (serialized == null || serialized.length === 0) return {};

		let value: unknown;
		try {
			value = JSON.parse(serialized);
		} catch {
			throw new Error("Saved device names are invalid JSON");
		}

		if (!isRecord(value)) {
			throw new Error("Saved device names have an invalid format");
		}

		const aliases: DeviceAliases = {};
		for (const [deviceName, alias] of Object.entries(value)) {
			if (typeof alias !== "string" || !alias.trim()) {
				throw new Error("Saved device names have an invalid format");
			}
			aliases[deviceName] = alias.trim();
		}
		return aliases;
	}

	async set(deviceName: string, alias: string): Promise<void> {
		if (!deviceName.trim()) throw new Error("Audio device name is required");
		const aliases = await this.list();
		const normalizedAlias = alias.trim();
		if (normalizedAlias) aliases[deviceName] = normalizedAlias;
		else delete aliases[deviceName];
		await this.storage.setItem(STORAGE_KEY, JSON.stringify(aliases));
	}
}
