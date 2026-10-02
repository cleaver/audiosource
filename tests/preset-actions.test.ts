import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioInventory } from "../src/audio-inventory";
import type { AudioPresetDraft } from "../src/preset-model";
import type { AudioPreset } from "../src/preset-store";
import { saveCurrentSetupAsPreset } from "../src/preset-actions";

const inventory: AudioInventory = {
	outputs: [
		{
			name: "bluez_output.q30",
			description: "soundcore Life Q30 Handsfree",
			deviceName: "bluez_card.q30",
			isDefault: true,
		},
	],
	inputs: [
		{
			name: "bluez_input.q30",
			description: "soundcore Life Q30 Handsfree",
			deviceName: "bluez_card.q30",
			isDefault: true,
		},
	],
	cards: [
		{
			name: "bluez_card.q30",
			description: "soundcore Life Q30",
			activeProfile: "headset-head-unit",
			profiles: [],
		},
	],
};

test("saves current defaults and active profiles as a named preset", async () => {
	let savedDraft: AudioPresetDraft | undefined;
	const saver = {
		save: async (draft: AudioPresetDraft): Promise<AudioPreset> => {
			savedDraft = draft;
			return { ...draft, id: "preset-1" };
		},
	};

	const preset = await saveCurrentSetupAsPreset("Calls", inventory, saver);

	assert.equal(preset.id, "preset-1");
	assert.deepEqual(savedDraft, {
		name: "Calls",
		output: {
			name: "bluez_output.q30",
			description: "soundcore Life Q30 Handsfree",
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
});
