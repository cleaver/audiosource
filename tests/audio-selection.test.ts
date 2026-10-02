import assert from "node:assert/strict";
import { test } from "node:test";
import { setCardProfile, setDefaultEndpoint } from "../src/audio-inventory";

test("sets the selected output as the default without moving streams", async () => {
	const commands: string[][] = [];

	await setDefaultEndpoint("output", "alsa_output.usb.new", async (args) => {
		commands.push(args);
		return "";
	});

	assert.deepEqual(commands, [["set-default-sink", "alsa_output.usb.new"]]);
});

test("sets the selected input as the default without moving streams", async () => {
	const commands: string[][] = [];

	await setDefaultEndpoint("input", "alsa_input.usb.new", async (args) => {
		commands.push(args);
		return "";
	});

	assert.deepEqual(commands, [["set-default-source", "alsa_input.usb.new"]]);
});

test("activates a selected card profile by stable card and profile names", async () => {
	const commands: string[][] = [];

	await setCardProfile("bluez_card.q30", "headset-head-unit", async (args) => {
		commands.push(args);
		return "";
	});

	assert.deepEqual(commands, [
		["set-card-profile", "bluez_card.q30", "headset-head-unit"],
	]);
});
