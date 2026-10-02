import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioInventory } from "../src/audio-inventory";
import {
	applyAudioPreset,
	restoreAudioSetup,
	type PresetExecution,
} from "../src/preset-actions";
import type { AudioPreset } from "../src/preset-store";

function inventory(
	profile: string,
	defaultOutput: string,
	defaultInput: string,
): AudioInventory {
	const handsfree = profile === "headset-head-unit";
	return {
		outputs: [
			{
				name: "output.speakers",
				description: "Speakers",
				deviceName: "card.speakers",
				isDefault: defaultOutput === "output.speakers",
			},
			...(handsfree
				? [
						{
							name: "output.q30.handsfree",
							description: "Q30 Handsfree",
							deviceName: "card.q30",
							isDefault: defaultOutput === "output.q30.handsfree",
						},
					]
				: [
						{
							name: "output.q30.a2dp",
							description: "Q30 Stereo",
							deviceName: "card.q30",
							isDefault: defaultOutput === "output.q30.a2dp",
						},
					]),
		],
		inputs: [
			{
				name: "input.usb",
				description: "USB Microphone",
				deviceName: "card.usb",
				isDefault: defaultInput === "input.usb",
			},
			...(handsfree
				? [
						{
							name: "input.q30.handsfree",
							description: "Q30 Handsfree Mic",
							deviceName: "card.q30",
							isDefault: defaultInput === "input.q30.handsfree",
						},
					]
				: []),
		],
		cards: [
			{
				name: "card.speakers",
				description: "Speakers",
				activeProfile: "output:analog-stereo",
				profiles: [],
			},
			{
				name: "card.usb",
				description: "USB Microphone",
				activeProfile: "input:analog-stereo",
				profiles: [],
			},
			{
				name: "card.q30",
				description: "Q30",
				activeProfile: profile,
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
}

const callPreset: AudioPreset = {
	id: "calls",
	name: "Calls — Q30",
	output: {
		name: "output.q30.handsfree",
		description: "Q30 Handsfree",
		deviceName: "card.q30",
	},
	input: {
		name: "input.q30.handsfree",
		description: "Q30 Handsfree Mic",
		deviceName: "card.q30",
	},
	profiles: [{ cardName: "card.q30", profileName: "headset-head-unit" }],
};

test("applies profiles before defaults and saves a restorable previous setup", async () => {
	let current = inventory("a2dp-sink", "output.speakers", "input.usb");
	let snapshot: unknown;
	const events: string[] = [];
	const execution: PresetExecution = {
		readInventory: async () => current,
		setCardProfile: async (cardName, profileName) => {
			events.push(`profile:${cardName}:${profileName}`);
			current = inventory(profileName, "output.speakers", "input.usb");
		},
		setDefaultEndpoint: async (kind, name) => {
			events.push(`default:${kind}:${name}`);
			current = {
				...current,
				outputs: current.outputs.map((device) => ({
					...device,
					isDefault:
						kind === "output" ? device.name === name : device.isDefault,
				})),
				inputs: current.inputs.map((device) => ({
					...device,
					isDefault: kind === "input" ? device.name === name : device.isDefault,
				})),
			};
		},
		saveRestoreSnapshot: async (setup) => {
			snapshot = setup;
		},
		clearRestoreSnapshot: async () => {
			snapshot = undefined;
		},
		delay: async () => {},
	};

	await applyAudioPreset(callPreset, execution);

	assert.deepEqual(events, [
		"profile:card.q30:headset-head-unit",
		"default:output:output.q30.handsfree",
		"default:input:input.q30.handsfree",
	]);
	assert.deepEqual(
		(snapshot as { profiles: Array<{ cardName: string; profileName: string }> })
			.profiles,
		[
			{ cardName: "card.speakers", profileName: "output:analog-stereo" },
			{ cardName: "card.usb", profileName: "input:analog-stereo" },
			{ cardName: "card.q30", profileName: "a2dp-sink" },
		],
	);
	assert.equal(
		current.outputs.find((device) => device.isDefault)?.name,
		"output.q30.handsfree",
	);
	assert.equal(
		current.inputs.find((device) => device.isDefault)?.name,
		"input.q30.handsfree",
	);
});

test("manually restores the previous profile before its input and output", async () => {
	let current = inventory(
		"headset-head-unit",
		"output.q30.handsfree",
		"input.q30.handsfree",
	);
	const events: string[] = [];
	const execution: PresetExecution = {
		readInventory: async () => current,
		setCardProfile: async (cardName, profileName) => {
			events.push(`profile:${cardName}:${profileName}`);
			current = inventory(profileName, "output.speakers", "input.usb");
		},
		setDefaultEndpoint: async (kind, name) => {
			events.push(`default:${kind}:${name}`);
			current = {
				...current,
				outputs: current.outputs.map((device) => ({
					...device,
					isDefault:
						kind === "output" ? device.name === name : device.isDefault,
				})),
				inputs: current.inputs.map((device) => ({
					...device,
					isDefault: kind === "input" ? device.name === name : device.isDefault,
				})),
			};
		},
		saveRestoreSnapshot: async () => {},
		clearRestoreSnapshot: async () => {},
		delay: async () => {},
	};

	const restored = await restoreAudioSetup(
		{
			name: "Previous setup",
			output: { name: "output.speakers", description: "Speakers" },
			input: { name: "input.usb", description: "USB Microphone" },
			profiles: [
				{ cardName: "card.q30", profileName: "a2dp-sink" },
				{
					cardName: "card.speakers",
					profileName: "output:analog-stereo",
				},
				{ cardName: "card.usb", profileName: "input:analog-stereo" },
			],
		},
		execution,
	);

	assert.deepEqual(events, [
		"profile:card.q30:a2dp-sink",
		"default:output:output.speakers",
		"default:input:input.usb",
	]);
	assert.equal(
		restored.outputs.find((device) => device.isDefault)?.name,
		"output.speakers",
	);
	assert.equal(
		restored.inputs.find((device) => device.isDefault)?.name,
		"input.usb",
	);
});

test("rolls back profiles and defaults if preset endpoints never appear", async () => {
	let current = inventory("a2dp-sink", "output.speakers", "input.usb");
	let snapshotSaved = false;
	let snapshotCleared = false;
	const events: string[] = [];
	const execution: PresetExecution = {
		readInventory: async () => current,
		setCardProfile: async (cardName, profileName) => {
			events.push(`profile:${cardName}:${profileName}`);
			if (profileName === "headset-head-unit") {
				const missingNodes = inventory(
					"headset-head-unit",
					"output.speakers",
					"input.usb",
				);
				missingNodes.outputs = missingNodes.outputs.filter(
					(device) => device.name !== "output.q30.handsfree",
				);
				missingNodes.inputs = missingNodes.inputs.filter(
					(device) => device.name !== "input.q30.handsfree",
				);
				current = missingNodes;
			} else {
				current = inventory(profileName, "output.speakers", "input.usb");
			}
		},
		setDefaultEndpoint: async (kind, name) => {
			events.push(`default:${kind}:${name}`);
			current = {
				...current,
				outputs: current.outputs.map((device) => ({
					...device,
					isDefault:
						kind === "output" ? device.name === name : device.isDefault,
				})),
				inputs: current.inputs.map((device) => ({
					...device,
					isDefault: kind === "input" ? device.name === name : device.isDefault,
				})),
			};
		},
		saveRestoreSnapshot: async () => {
			snapshotSaved = true;
		},
		clearRestoreSnapshot: async () => {
			snapshotCleared = true;
		},
		delay: async () => {},
	};

	await assert.rejects(
		applyAudioPreset(callPreset, execution),
		/Preset output “Q30 Handsfree” and input “Q30 Handsfree Mic” did not become available/,
	);
	assert.equal(snapshotSaved, true);
	assert.equal(snapshotCleared, true);
	assert.deepEqual(events, [
		"profile:card.q30:headset-head-unit",
		"profile:card.q30:a2dp-sink",
		"default:output:output.speakers",
		"default:input:input.usb",
	]);
	assert.equal(
		current.cards.find((card) => card.name === "card.q30")?.activeProfile,
		"a2dp-sink",
	);
});
