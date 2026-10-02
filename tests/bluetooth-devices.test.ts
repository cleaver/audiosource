import assert from "node:assert/strict";
import { test } from "node:test";
import {
	connectBluetoothAudioDevice,
	disconnectBluetoothAudioDevice,
	readBluetoothAudioDevices,
	type BluetoothctlExecutor,
} from "../src/bluetooth-devices";

const addresses = {
	trackpad: "A0:78:17:E2:70:01",
	gamepad: "60:06:E3:1F:CE:A6",
	q30: "98:47:44:BE:62:86",
};

function info(
	name: string,
	icon: string,
	connected: boolean,
	uuids: string[] = [],
) {
	return [
		`${addresses.q30} (public)`,
		`\tName: ${name}`,
		`\tAlias: ${name}`,
		`\tIcon: ${icon}`,
		"\tPaired: yes",
		`\tConnected: ${connected ? "yes" : "no"}`,
		...uuids.map((uuid) => `\tUUID: ${uuid}`),
	].join("\n");
}

const pairedList = [
	`Device ${addresses.trackpad} Magic Trackpad`,
	`Device ${addresses.gamepad} Gamepad`,
	`Device ${addresses.q30} soundcore Life Q30`,
].join("\n");

test("lists paired audio devices with their current connection state", async () => {
	const executor: BluetoothctlExecutor = async (args) => {
		if (args[0] === "devices") return pairedList;
		if (args[0] === "info" && args[1] === addresses.trackpad)
			return info("Magic Trackpad", "input-mouse", true, [
				"Human Interface Device",
			]);
		if (args[0] === "info" && args[1] === addresses.gamepad)
			return info("Gamepad", "computer", false, [
				"Human Interface Device",
				"Audio Source",
				"Advanced Audio Distribution",
				"Handsfree Audio Gateway",
			]);
		if (args[0] === "info" && args[1] === addresses.q30)
			return info("Q30 renamed", "audio-headset", true, [
				"Audio Sink",
				"Handsfree",
			]);
		throw new Error(`Unexpected command: ${args.join(" ")}`);
	};

	assert.deepEqual(await readBluetoothAudioDevices(executor), [
		{
			address: addresses.q30,
			name: "Q30 renamed",
			icon: "audio-headset",
			connected: true,
		},
	]);
});

test("recognizes an audio sink by profile when BlueZ reports a generic icon", async () => {
	const speakerAddress = "12:34:56:78:9A:BC";
	const executor: BluetoothctlExecutor = async (args) => {
		if (args[0] === "devices")
			return `Device ${speakerAddress} Wireless Speaker`;
		if (args[0] === "info")
			return [
				`Device ${speakerAddress} (public)`,
				"\tAlias: Wireless Speaker",
				"\tIcon: computer",
				"\tPaired: yes",
				"\tConnected: no",
				"\tUUID: Audio Sink (0000110b-0000-1000-8000-00805f9b34fb)",
			].join("\n");
		throw new Error(`Unexpected command: ${args.join(" ")}`);
	};

	assert.deepEqual(await readBluetoothAudioDevices(executor), [
		{
			address: speakerAddress,
			name: "Wireless Speaker",
			icon: "computer",
			connected: false,
		},
	]);
});

test("does not invoke bluetoothctl for an invalid device address", async () => {
	let invoked = false;
	const executor: BluetoothctlExecutor = async () => {
		invoked = true;
		return "";
	};

	await assert.rejects(
		connectBluetoothAudioDevice("not-an-address", { execute: executor }),
		{
			message: "Bluetooth device address is invalid",
		},
	);
	assert.equal(invoked, false);
});

test("retries connection once only after status remains disconnected", async () => {
	let isConnected = false;
	let connectCalls = 0;
	const calls: string[][] = [];
	const executor: BluetoothctlExecutor = async (args) => {
		calls.push(args);
		if (args[0] === "info")
			return info("soundcore Life Q30", "audio-headset", isConnected, [
				"Audio Sink",
			]);
		if (args[0] === "connect") {
			connectCalls += 1;
			if (connectCalls === 2) isConnected = true;
			return "Attempting to connect";
		}
		throw new Error(`Unexpected command: ${args.join(" ")}`);
	};

	const connected = await connectBluetoothAudioDevice(addresses.q30, {
		execute: executor,
		delay: async () => {},
	});

	assert.equal(connectCalls, 2);
	assert.equal(connected.connected, true);
	const firstConnect = calls.findIndex(([command]) => command === "connect");
	const secondConnect = calls.findIndex(
		([command], index) => command === "connect" && index > firstConnect,
	);
	assert.ok(secondConnect > firstConnect);
	assert.ok(
		calls
			.slice(firstConnect + 1, secondConnect)
			.some(([command]) => command === "info"),
	);
});

test("accepts an already connected device without reconnecting it", async () => {
	let connectCalls = 0;
	const executor: BluetoothctlExecutor = async (args) => {
		if (args[0] === "info")
			return info("soundcore Life Q30", "audio-headset", true, ["Audio Sink"]);
		if (args[0] === "connect") connectCalls += 1;
		return "";
	};

	const connected = await connectBluetoothAudioDevice(addresses.q30, {
		execute: executor,
		delay: async () => {},
	});

	assert.equal(connected.connected, true);
	assert.equal(connectCalls, 0);
});

test("trusts verified connection state even when bluetoothctl reports an error", async () => {
	let isConnected = false;
	let connectCalls = 0;
	const executor: BluetoothctlExecutor = async (args) => {
		if (args[0] === "info")
			return info("soundcore Life Q30", "audio-headset", isConnected, ["Audio Sink"]);
		if (args[0] === "connect") {
			connectCalls += 1;
			isConnected = true;
			throw new Error("org.bluez.Error.InProgress");
		}
		throw new Error(`Unexpected command: ${args.join(" ")}`);
	};

	const connected = await connectBluetoothAudioDevice(addresses.q30, {
		execute: executor,
		delay: async () => {},
	});

	assert.equal(connectCalls, 1);
	assert.equal(connected.connected, true);
});

test("stops after two unsuccessful attempts and reports disconnected state", async () => {
	let connectCalls = 0;
	const executor: BluetoothctlExecutor = async (args) => {
		if (args[0] === "info")
			return info("soundcore Life Q30", "audio-headset", false, ["Audio Sink"]);
		if (args[0] === "connect") {
			connectCalls += 1;
			return "Failed to connect";
		}
		throw new Error(`Unexpected command: ${args.join(" ")}`);
	};

	await assert.rejects(
		connectBluetoothAudioDevice(addresses.q30, {
			execute: executor,
			delay: async () => {},
		}),
		{
			message:
				"Could not connect to soundcore Life Q30 after 2 attempts; device remains disconnected (Failed to connect)",
		},
	);
	assert.equal(connectCalls, 2);
});

test("disconnects and verifies the final connection state", async () => {
	let isConnected = true;
	const executor: BluetoothctlExecutor = async (args) => {
		if (args[0] === "info")
			return info("soundcore Life Q30", "audio-headset", isConnected, [
				"Audio Sink",
			]);
		if (args[0] === "disconnect") {
			isConnected = false;
			return "Successful disconnected";
		}
		throw new Error(`Unexpected command: ${args.join(" ")}`);
	};

	const disconnected = await disconnectBluetoothAudioDevice(addresses.q30, {
		execute: executor,
		delay: async () => {},
	});

	assert.equal(disconnected.connected, false);
});
