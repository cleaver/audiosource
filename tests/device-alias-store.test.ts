import assert from "node:assert/strict";
import { test } from "node:test";
import { DeviceAliasStore } from "../src/device-alias-store";

test("keeps device aliases after reload and removes aliases reset to automatic", async () => {
	const values = new Map<string, string>();
	const storage = {
		getItem: async (key: string) => values.get(key) ?? null,
		setItem: async (key: string, value: string) => {
			values.set(key, value);
		},
	};
	const store = new DeviceAliasStore(storage);

	await store.set("alsa_card.pci-0000_07_00.6", " Office ");
	assert.deepEqual(await new DeviceAliasStore(storage).list(), {
		"alsa_card.pci-0000_07_00.6": "Office",
	});

	await store.set("alsa_card.pci-0000_07_00.6", "  ");
	assert.deepEqual(await store.list(), {});
});
