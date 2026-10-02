import assert from "node:assert/strict";
import { test } from "node:test";
import { AudioPresetStore, type PresetStorage } from "../src/preset-store";

test("keeps a saved preset available after the store is reloaded", async () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: async (key: string) => values.get(key),
		setItem: async (key: string, value: string) => {
			values.set(key, value);
		},
	};
	const store = new AudioPresetStore(storage, () => "preset-1");

	await store.save({
		name: "Calls",
		output: {
			name: "bluez_output.q30",
			description: "soundcore Life Q30",
			deviceName: "bluez_card.q30",
		},
		input: {
			name: "bluez_input.q30",
			description: "soundcore Life Q30 Handsfree",
			deviceName: "bluez_card.q30",
		},
		profiles: [
			{ cardName: "bluez_card.q30", profileName: "headset-head-unit" },
		],
	});

	const reloadedStore = new AudioPresetStore(storage);
	assert.deepEqual(await reloadedStore.list(), [
		{
			id: "preset-1",
			name: "Calls",
			output: {
				name: "bluez_output.q30",
				description: "soundcore Life Q30",
				deviceName: "bluez_card.q30",
			},
			input: {
				name: "bluez_input.q30",
				description: "soundcore Life Q30 Handsfree",
				deviceName: "bluez_card.q30",
			},
			profiles: [
				{ cardName: "bluez_card.q30", profileName: "headset-head-unit" },
			],
		},
	]);
});

test("persists one restore snapshot and clears it after manual restore", async () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: async (key: string) => values.get(key),
		setItem: async (key: string, value: string) => {
			values.set(key, value);
		},
	};
	const setup = {
		name: "Previous setup",
		output: { name: "output.speakers", description: "Speakers" },
		input: { name: "input.usb", description: "USB microphone" },
		profiles: [{ cardName: "card.q30", profileName: "a2dp-sink" }],
	};
	const store = new AudioPresetStore(storage);

	await store.saveRestoreSnapshot(setup);
	assert.deepEqual(
		await new AudioPresetStore(storage).getRestoreSnapshot(),
		setup,
	);
	await store.clearRestoreSnapshot();
	assert.equal(await store.getRestoreSnapshot(), undefined);
});

test("saves the first preset when Vicinae returns null for an empty key", async () => {
	const values = new Map<string, string>();
	const storage: PresetStorage = {
		getItem: async (key: string) => values.get(key) ?? null,
		setItem: async (key: string, value: string) => {
			values.set(key, value);
		},
	};
	const store = new AudioPresetStore(storage, () => "first-preset");

	assert.deepEqual(await store.list(), []);
	assert.equal(await store.getRestoreSnapshot(), undefined);
	await store.save({
		name: "Calls",
		output: { name: "output.q30", description: "Q30 Handsfree" },
		input: { name: "input.q30", description: "Q30 Microphone" },
		profiles: [],
	});

	assert.equal((await store.list())[0]?.name, "Calls");
});
