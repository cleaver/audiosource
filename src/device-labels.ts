import type {
	AudioCard,
	AudioEndpoint,
	AudioInventory,
} from "./audio-inventory";

export type DeviceAliases = Record<string, string>;

export function getDeviceAliasKey(device: {
	name: string;
	deviceName?: string;
}): string {
	return device.deviceName ?? device.name;
}

type DeviceKind = "hdmi" | "builtin" | "bluetooth" | "usb" | undefined;

function deviceKind(card?: AudioCard, endpoint?: AudioEndpoint): DeviceKind {
	const details = [
		card?.description,
		card?.name,
		card?.deviceProductName,
		card?.alsaMixerName,
		endpoint?.description,
		endpoint?.name,
		endpoint?.deviceProductName,
		endpoint?.deviceBus,
		card?.deviceBus,
		endpoint?.deviceFormFactor,
		card?.deviceFormFactor,
	]
		.filter(Boolean)
		.join(" ");

	if (/hdmi|displayport/i.test(details)) return "hdmi";
	if (/bluez|bluetooth/i.test(details)) return "bluetooth";
	if (
		/ryzen hd audio controller|built[- ]?in|internal|onboard|alc\s*\d+/i.test(
			details,
		) ||
		/^(internal|built-in)$/i.test(
			card?.deviceFormFactor ?? endpoint?.deviceFormFactor ?? "",
		)
	) {
		return "builtin";
	}
	if (/\busb\b/i.test(details)) return "usb";
	return undefined;
}

function automaticCardName(card: AudioCard): string {
	switch (deviceKind(card)) {
		case "hdmi":
			return "HDMI";
		case "builtin":
			return "Built-in";
		case "bluetooth":
			return `Bluetooth · ${card.deviceProductName ?? card.description}`;
		case "usb":
			return `USB · ${card.deviceProductName ?? card.description}`;
		default:
			return card.description;
	}
}

export function getCardDisplayName(
	card: AudioCard,
	aliases: DeviceAliases = {},
): string {
	return aliases[card.name]?.trim() || automaticCardName(card);
}

function hdmiEndpointDetail(endpoint: AudioEndpoint): string | undefined {
	const nickname = endpoint.nickname?.trim();
	if (nickname && !/^(hdmi|displayport)\s*\d+$/i.test(nickname)) {
		return nickname;
	}

	const port = endpoint.portDescription ?? endpoint.description;
	const displayPort = port.match(
		/(?:HDMI\s*\/\s*DisplayPort|DisplayPort)\s*(\d+)/i,
	);
	if (displayPort) return `Port ${displayPort[1]}`;
	const hdmi = `${port} ${endpoint.name}`.match(/HDMI\s*(\d+)/i);
	return hdmi ? `Port ${hdmi[1]}` : undefined;
}

function builtinEndpointRole(endpoint: AudioEndpoint): string | undefined {
	const details = `${endpoint.portDescription ?? ""} ${endpoint.description} ${endpoint.name}`;
	if (/digital\s+(?:microphone|mic)/i.test(details)) return "Digital Mic";
	if (/stereo\s+(?:microphone|mic)/i.test(details)) return "Stereo Mic";
	if (/headphones?/i.test(details)) return "Headphones";
	if (/speaker/i.test(details)) return "Speaker";
	if (/microphone|\bmic\b/i.test(details)) return "Microphone";
	return undefined;
}

export function getEndpointDisplayName(
	endpoint: AudioEndpoint,
	inventory: AudioInventory,
	aliases: DeviceAliases = {},
): string {
	const card = inventory.cards.find(
		(candidate) => candidate.name === endpoint.deviceName,
	);
	const alias = aliases[getDeviceAliasKey(endpoint)]?.trim();
	const kind = deviceKind(card, endpoint);

	if (kind === "hdmi") {
		const detail = hdmiEndpointDetail(endpoint);
		if (detail) return `${alias || "HDMI"} · ${detail}`;
		if (alias) return alias;
		return endpoint.description;
	}

	if (kind === "builtin") {
		const role = builtinEndpointRole(endpoint);
		const prefix = alias || "Built-in";
		return role ? `${prefix} · ${role}` : prefix;
	}

	if (alias) return alias;
	if (kind === "bluetooth") {
		const model =
			card?.deviceProductName ?? card?.description ?? endpoint.description;
		return `Bluetooth · ${model}`;
	}
	if (kind === "usb") {
		const model =
			card?.deviceProductName ?? card?.description ?? endpoint.description;
		return `USB · ${model}`;
	}
	return endpoint.description;
}
