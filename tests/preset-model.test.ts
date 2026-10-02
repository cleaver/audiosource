import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioInventory } from "../src/audio-inventory";
import { captureCurrentSetup } from "../src/preset-model";

test("captures the current input, output, and profiles as a preset", () => {
	const inventory: AudioInventory = {
		outputs: [
			{
				name: "bluez_output.q30",
				description: "soundcore Life Q30",
				deviceName: "bluez_card.q30",
				isDefault: true,
			},
		],
		inputs: [
			{
				name: "alsa_input.usb.mic",
				description: "USB Microphone",
				deviceName: "alsa_card.usb.mic",
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
			{
				name: "alsa_card.usb.mic",
				description: "USB Microphone",
				activeProfile: "input:analog-stereo",
				profiles: [],
			},
		],
	};

	assert.deepEqual(captureCurrentSetup("  Calls  ", inventory), {
		name: "Calls",
		output: {
			name: "bluez_output.q30",
			description: "soundcore Life Q30",
			deviceName: "bluez_card.q30",
		},
		input: {
			name: "alsa_input.usb.mic",
			description: "USB Microphone",
			deviceName: "alsa_card.usb.mic",
		},
		profiles: [
			{ cardName: "bluez_card.q30", profileName: "headset-head-unit" },
			{ cardName: "alsa_card.usb.mic", profileName: "input:analog-stereo" },
		],
	});
});
