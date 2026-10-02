import {
	Action,
	ActionPanel,
	Form,
	Icon,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import type { AudioInventory } from "./audio-inventory";
import {
	getCardDisplayName,
	getEndpointDisplayName,
	type DeviceAliases,
} from "./device-labels";
import { saveCurrentSetupAsPreset, type PresetSaver } from "./preset-actions";
import type { AudioPreset } from "./preset-store";

type SavePresetFormProps = {
	inventory: AudioInventory;
	aliases: DeviceAliases;
	saver: PresetSaver;
	onSaved: (preset: AudioPreset) => void;
};

function defaultDescription(
	kind: "Input" | "Output",
	devices: AudioInventory["inputs"],
	inventory: AudioInventory,
	aliases: DeviceAliases,
) {
	const endpoint = devices.find((device) => device.isDefault);
	return `${kind}: ${endpoint ? getEndpointDisplayName(endpoint, inventory, aliases) : "Not set"}`;
}

export function SavePresetForm({
	inventory,
	aliases,
	saver,
	onSaved,
}: SavePresetFormProps) {
	const { pop } = useNavigation();
	const selectedCardNames = new Set(
		[inventory.outputs, inventory.inputs]
			.flatMap(
				(devices) => devices.find((device) => device.isDefault)?.deviceName,
			)
			.filter((name): name is string => name !== undefined),
	);
	const activeProfiles = inventory.cards
		.filter((card) => selectedCardNames.has(card.name) && card.activeProfile)
		.map(
			(card) => `${getCardDisplayName(card, aliases)} — ${card.activeProfile}`,
		);

	const submit = async (values: Form.Values) => {
		if (typeof values.name !== "string") {
			await showToast({
				style: Toast.Style.Failure,
				title: "Enter a preset name",
			});
			return false;
		}

		try {
			const preset = await saveCurrentSetupAsPreset(
				values.name,
				inventory,
				saver,
			);
			onSaved(preset);
			await showToast({
				style: Toast.Style.Success,
				title: `Saved “${preset.name}”`,
			});
			pop();
			return true;
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Could not save preset",
				message: reason instanceof Error ? reason.message : String(reason),
			});
			return false;
		}
	};

	return (
		<Form
			navigationTitle="Save Current Setup"
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Save Preset"
						icon={Icon.SaveDocument}
						onSubmit={submit}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField
				id="name"
				title="Preset Name"
				placeholder="For example, Calls — Q30"
				autoFocus
			/>
			<Form.Description
				title="Captured setup"
				text={[
					defaultDescription("Output", inventory.outputs, inventory, aliases),
					defaultDescription("Input", inventory.inputs, inventory, aliases),
					`Profiles captured: ${activeProfiles.join(", ") || "None"}`,
				].join("\n")}
			/>
		</Form>
	);
}
