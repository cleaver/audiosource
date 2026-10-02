import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioInventory } from "../src/audio-inventory";
import {
	createPresetFromSelection,
	updatePresetFromSelection,
} from "../src/preset-model";

const inventory: AudioInventory = {
	outputs: [
		{
			name: "output.usb",
			description: "USB Headphones",
			deviceName: "card.usb",
			isDefault: true,
		},
		{
			name: "output.hdmi",
			description: "HDMI Monitor",
			deviceName: "card.hdmi",
			isDefault: false,
		},
	],
	inputs: [
		{
			name: "input.usb",
			description: "USB Headset Mic",
			deviceName: "card.usb",
			isDefault: false,
		},
		{
			name: "input.laptop",
			description: "Laptop Microphone",
			deviceName: "card.laptop",
			isDefault: true,
		},
	],
	cards: [
		{
			name: "card.usb",
			description: "USB Headset",
			activeProfile: "duplex",
			profiles: [],
		},
		{
			name: "card.hdmi",
			description: "HDMI Monitor",
			activeProfile: "output:hdmi-stereo",
			profiles: [],
		},
		{
			name: "card.laptop",
			description: "Laptop Microphone",
			activeProfile: "input:analog-stereo",
			profiles: [],
		},
	],
};

test("creates a preset from chosen devices without changing current defaults", () => {
	assert.deepEqual(
		createPresetFromSelection(
			"Monitor and headset mic",
			"output.hdmi",
			"input.usb",
			inventory,
		),
		{
			name: "Monitor and headset mic",
			output: {
				name: "output.hdmi",
				description: "HDMI Monitor",
				deviceName: "card.hdmi",
			},
			input: {
				name: "input.usb",
				description: "USB Headset Mic",
				deviceName: "card.usb",
			},
			profiles: [
				{ cardName: "card.hdmi", profileName: "output:hdmi-stereo" },
				{ cardName: "card.usb", profileName: "duplex" },
			],
		},
	);
});

test("rejects a selected endpoint that disappeared before the preset was saved", () => {
	assert.throws(
		() =>
			createPresetFromSelection(
				"Missing device",
				"output.missing",
				undefined,
				inventory,
			),
		/Selected output is no longer available/,
	);
});

test("edits selected devices and profiles while preserving unchanged unavailable targets", () => {
	const existing = {
		id: "preset-1",
		name: "Old preset",
		output: {
			name: "output.old",
			description: "Old output",
			deviceName: "card.old",
		},
		input: {
			name: "input.usb",
			description: "USB Headset Mic",
			deviceName: "card.usb",
		},
		profiles: [
			{ cardName: "card.old", profileName: "old-profile" },
			{ cardName: "card.usb", profileName: "duplex" },
		],
	};

	assert.deepEqual(
		updatePresetFromSelection(
			existing,
			"  Updated preset  ",
			"output.hdmi",
			"input.usb",
			inventory,
		),
		{
			name: "Updated preset",
			output: {
				name: "output.hdmi",
				description: "HDMI Monitor",
				deviceName: "card.hdmi",
			},
			input: existing.input,
			profiles: [
				{ cardName: "card.hdmi", profileName: "output:hdmi-stereo" },
				{ cardName: "card.usb", profileName: "duplex" },
			],
		},
	);

	assert.deepEqual(
		updatePresetFromSelection(
			existing,
			"Renamed",
			"output.old",
			"input.usb",
			inventory,
		),
		{
			name: "Renamed",
			output: existing.output,
			input: existing.input,
			profiles: existing.profiles,
		},
	);
});

test("rejects incompatible saved profiles for two selected endpoints on one card", () => {
	const existing = {
		id: "preset-1",
		name: "Calls",
		input: {
			name: "input.usb",
			description: "USB Headset Mic",
			deviceName: "card.usb",
		},
		profiles: [{ cardName: "card.usb", profileName: "handsfree" }],
	};

	assert.throws(
		() =>
			updatePresetFromSelection(
				existing,
				"Calls",
				"output.usb",
				"input.usb",
				inventory,
			),
		/Selected preset devices require incompatible profiles for card.usb/,
	);
});
