import assert from "node:assert/strict";
import { test } from "node:test";
import { readAudioInventory } from "../src/audio-inventory";

test("lists selectable devices and profiles with current defaults", async () => {
	const responses = new Map<string, string>([
		[
			"--format=json list cards",
			JSON.stringify([
				{
					name: "bluez_card.q30",
					properties: {
						"device.description": "soundcore Life Q30",
						"device.bus": "bluetooth",
						"device.product.name": "soundcore Life Q30",
						"device.form_factor": "headset",
					},
					active_profile: "a2dp-sink",
					profiles: {
						"a2dp-sink": {
							name: "a2dp-sink",
							description: "High Fidelity Playback",
							available: "yes",
						},
						"headset-head-unit": {
							name: "headset-head-unit",
							description: "Headset Head Unit",
							available: "no",
						},
					},
				},
			]),
		],
		[
			"--format=json list sinks",
			JSON.stringify([
				{
					name: "bluez_output.q30",
					description: "soundcore Life Q30",
					active_port: "headset-output",
					ports: [
						{
							name: "headset-output",
							description: "Headphones",
						},
					],
					properties: {
						"device.name": "bluez_card.q30",
						"device.class": "sound",
						"node.nick": "Life Q30",
						"device.bus": "bluetooth",
						"device.product.name": "soundcore Life Q30",
						"device.form_factor": "headset",
					},
				},
				{
					name: "alsa_output.speakers",
					description: "Built-in Speakers",
					properties: {
						"device.name": "alsa_card.speakers",
						"device.class": "sound",
					},
				},
			]),
		],
		[
			"--format=json list sources",
			JSON.stringify([
				{
					name: "bluez_output.q30.monitor",
					description: "Monitor of soundcore Life Q30",
					properties: {
						"device.name": "bluez_card.q30",
						"device.class": "monitor",
					},
				},
				{
					name: "bluez_input.q30",
					description: "soundcore Life Q30 Handsfree",
					properties: {
						"device.name": "bluez_card.q30",
						"device.class": "sound",
					},
				},
			]),
		],
		["get-default-sink", "bluez_output.q30\n"],
		["get-default-source", "bluez_input.q30\n"],
	]);

	const inventory = await readAudioInventory(async (args) => {
		const response = responses.get(args.join(" "));
		if (response === undefined)
			throw new Error(`Unexpected pactl command: ${args.join(" ")}`);
		return response;
	});

	assert.equal(
		inventory.outputs.find((device) => device.isDefault)?.name,
		"bluez_output.q30",
	);
	assert.deepEqual(
		inventory.outputs.find((device) => device.name === "bluez_output.q30"),
		{
			name: "bluez_output.q30",
			description: "soundcore Life Q30",
			deviceName: "bluez_card.q30",
			nickname: "Life Q30",
			portDescription: "Headphones",
			deviceBus: "bluetooth",
			deviceProductName: "soundcore Life Q30",
			deviceFormFactor: "headset",
			isDefault: true,
		},
	);
	assert.deepEqual(
		inventory.inputs.map(({ name, isDefault }) => ({ name, isDefault })),
		[{ name: "bluez_input.q30", isDefault: true }],
	);
	assert.deepEqual(inventory.cards[0], {
		name: "bluez_card.q30",
		description: "soundcore Life Q30",
		activeProfile: "a2dp-sink",
		deviceBus: "bluetooth",
		deviceProductName: "soundcore Life Q30",
		deviceFormFactor: "headset",
		profiles: [
			{
				name: "a2dp-sink",
				description: "High Fidelity Playback",
				available: true,
			},
			{
				name: "headset-head-unit",
				description: "Headset Head Unit",
				available: false,
			},
		],
	});
});
