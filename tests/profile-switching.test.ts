import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioInventory } from "../src/audio-inventory";
import {
	changeAudioCardProfile,
	type ProfileChangeExecution,
} from "../src/preset-actions";

function inventory(profileName: string): AudioInventory {
	return {
		outputs: [
			{
				name:
					profileName === "a2dp-sink" ? "output.q30.a2dp" : "output.q30.hfp",
				description: "Q30 output",
				deviceName: "card.q30",
				isDefault: true,
			},
		],
		inputs:
			profileName === "a2dp-sink"
				? []
				: [
						{
							name: "input.q30.hfp",
							description: "Q30 microphone",
							deviceName: "card.q30",
							isDefault: true,
						},
					],
		cards: [
			{
				name: "card.q30",
				description: "Q30",
				activeProfile: profileName,
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

test("changes an available profile and waits for the card and endpoints to refresh", async () => {
	let requested = false;
	let waits = 0;
	let active = false;
	const events: string[] = [];
	const execution: ProfileChangeExecution = {
		readInventory: async () => {
			if (requested && waits > 0) active = true;
			return inventory(active ? "headset-head-unit" : "a2dp-sink");
		},
		setCardProfile: async (cardName, profileName) => {
			events.push(`set:${cardName}:${profileName}`);
			requested = true;
		},
		delay: async () => {
			waits += 1;
			events.push("wait");
		},
	};

	const refreshed = await changeAudioCardProfile(
		"card.q30",
		"headset-head-unit",
		execution,
	);

	assert.deepEqual(events, ["set:card.q30:headset-head-unit", "wait", "wait"]);
	assert.equal(refreshed.cards[0]?.activeProfile, "headset-head-unit");
	assert.equal(refreshed.inputs[0]?.name, "input.q30.hfp");
});
