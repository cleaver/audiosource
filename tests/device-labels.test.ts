import assert from "node:assert/strict";
import { test } from "node:test";
import type { AudioEndpoint, AudioInventory } from "../src/audio-inventory";
import {
	getCardDisplayName,
	getEndpointDisplayName,
} from "../src/device-labels";

const hdmiCard = {
	name: "alsa_card.pci-0000_07_00.1",
	description: "Renoir/Cezanne HDMI/DP Audio Controller",
	activeProfile: "HiFi",
	profiles: [],
};

const hdmiEndpoint: AudioEndpoint = {
	name: "alsa_output.pci-0000_07_00.1.HiFi__HDMI4__sink",
	description:
		"Renoir/Cezanne HDMI/DP Audio Controller HDMI / DisplayPort 4 Output",
	deviceName: hdmiCard.name,
	isDefault: false,
	nickname: "ASUS VG289",
	portDescription: "HDMI / DisplayPort 4 Output",
};

test("gives connected display audio a short label with its monitor name", () => {
	const inventory: AudioInventory = {
		cards: [hdmiCard],
		outputs: [hdmiEndpoint],
		inputs: [],
	};

	assert.equal(
		getEndpointDisplayName(hdmiEndpoint, inventory),
		"HDMI · ASUS VG289",
	);
});

test("uses a generic port number when HDMI has no display nickname", () => {
	const endpoint: AudioEndpoint = {
		...hdmiEndpoint,
		name: "alsa_output.pci-0000_07_00.1.HiFi__HDMI3__sink",
		description:
			"Renoir/Cezanne HDMI/DP Audio Controller HDMI / DisplayPort 3 Output",
		nickname: "HDMI 2",
		portDescription: "HDMI / DisplayPort 3 Output",
	};
	const inventory: AudioInventory = {
		cards: [hdmiCard],
		outputs: [endpoint],
		inputs: [],
	};

	assert.equal(getEndpointDisplayName(endpoint, inventory), "HDMI · Port 3");
});

test("labels built-in endpoints by role and applies a user alias", () => {
	const card = {
		name: "alsa_card.pci-0000_07_00.6",
		description: "Ryzen HD Audio Controller",
		activeProfile: "HiFi",
		profiles: [],
	};
	const endpoint: AudioEndpoint = {
		name: "alsa_output.pci-0000_07_00.6.HiFi__Speaker__sink",
		description: "Ryzen HD Audio Controller Speaker",
		deviceName: card.name,
		portDescription: "Speaker",
		isDefault: true,
	};
	const inventory: AudioInventory = {
		cards: [card],
		outputs: [endpoint],
		inputs: [],
	};

	assert.equal(getCardDisplayName(card), "Built-in");
	assert.equal(getCardDisplayName(card, { [card.name]: "Office" }), "Office");
	assert.equal(
		getEndpointDisplayName(endpoint, inventory),
		"Built-in · Speaker",
	);
	assert.equal(
		getEndpointDisplayName(endpoint, inventory, { [card.name]: "Office" }),
		"Office · Speaker",
	);
	assert.equal(
		endpoint.name,
		"alsa_output.pci-0000_07_00.6.HiFi__Speaker__sink",
	);
});

test("keeps digital and stereo built-in microphones distinct", () => {
	const card = {
		name: "alsa_card.pci-0000_07_00.6",
		description: "Ryzen HD Audio Controller",
		activeProfile: "HiFi",
		profiles: [],
	};
	const endpoints: AudioEndpoint[] = [
		{
			name: "alsa_input.pci-0000_07_00.6.HiFi__Mic1__source",
			description: "Ryzen HD Audio Controller Digital Microphone",
			deviceName: card.name,
			portDescription: "Digital Microphone",
			isDefault: false,
		},
		{
			name: "alsa_input.pci-0000_07_00.6.HiFi__Mic2__source",
			description: "Ryzen HD Audio Controller Stereo Microphone",
			deviceName: card.name,
			portDescription: "Stereo Microphone",
			isDefault: false,
		},
	];
	const inventory: AudioInventory = {
		cards: [card],
		outputs: [],
		inputs: endpoints,
	};

	assert.deepEqual(
		endpoints.map((endpoint) => getEndpointDisplayName(endpoint, inventory)),
		["Built-in · Digital Mic", "Built-in · Stereo Mic"],
	);
});
