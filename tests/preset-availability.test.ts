import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioInventory } from "../src/audio-inventory";
import { getPresetAvailability } from "../src/preset-model";
import type { AudioPreset } from "../src/preset-store";

const preset: AudioPreset = {
	id: "calls-q30",
	name: "Calls — Q30 Handsfree",
	output: {
		name: "output.q30.handsfree",
		description: "Q30 Handsfree Output",
		deviceName: "card.q30",
	},
	input: {
		name: "input.q30.handsfree",
		description: "Q30 Handsfree Microphone",
		deviceName: "card.q30",
	},
	profiles: [{ cardName: "card.q30", profileName: "headset-head-unit" }],
};

const a2dpInventory: AudioInventory = {
	outputs: [
		{
			name: "output.q30.a2dp",
			description: "Q30 Stereo",
			deviceName: "card.q30",
			isDefault: true,
		},
	],
	inputs: [],
	cards: [
		{
			name: "card.q30",
			description: "Q30",
			activeProfile: "a2dp-sink",
			profiles: [
				{ name: "a2dp-sink", description: "Stereo", available: true },
				{
					name: "headset-head-unit",
					description: "Handsfree",
					available: true,
				},
			],
		},
	],
};

test("treats endpoints hidden by another available profile as reachable", () => {
	assert.deepEqual(getPresetAvailability(preset, a2dpInventory), {
		available: true,
		unavailableTargets: [],
	});
});

test("marks profile targets unavailable when the device is disconnected", () => {
	const disconnected: AudioInventory = {
		outputs: [],
		inputs: [],
		cards: [],
	};

	assert.deepEqual(getPresetAvailability(preset, disconnected), {
		available: false,
		unavailableTargets: [
			"Q30 Handsfree Output",
			"Q30 Handsfree Microphone",
			"card.q30",
		],
	});
});
