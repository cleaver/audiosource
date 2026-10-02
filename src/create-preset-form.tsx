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
import { getEndpointDisplayName, type DeviceAliases } from "./device-labels";
import {
	createPresetFromSelection,
	updatePresetFromSelection,
} from "./preset-model";
import type { AudioPresetDraft } from "./preset-model";
import type { PresetSaver } from "./preset-actions";
import type { AudioPreset } from "./preset-store";

type CreatePresetFormProps = {
	inventory: AudioInventory;
	aliases: DeviceAliases;
	saver: PresetSaver;
	preset?: AudioPreset;
	update?: (id: string, draft: AudioPresetDraft) => Promise<AudioPreset>;
	onSaved: (preset: AudioPreset) => void;
};

export function CreatePresetForm({
	inventory,
	aliases,
	saver,
	preset,
	update,
	onSaved,
}: CreatePresetFormProps) {
	const { pop } = useNavigation();

	const submit = async (values: Form.Values) => {
		if (typeof values.name !== "string") {
			await showToast({
				style: Toast.Style.Failure,
				title: "Enter a preset name",
			});
			return false;
		}

		try {
			const outputName =
				typeof values.output === "string"
					? values.output || undefined
					: undefined;
			const inputName =
				typeof values.input === "string"
					? values.input || undefined
					: undefined;
			const draft = preset
				? updatePresetFromSelection(
						preset,
						values.name,
						outputName,
						inputName,
						inventory,
					)
				: createPresetFromSelection(
						values.name,
						outputName,
						inputName,
						inventory,
					);
			if (preset && !update) {
				throw new Error("Preset editing is not available");
			}
			const saved = preset
				? await update?.(preset.id, draft)
				: await saver.save(draft);
			if (!saved) throw new Error("Preset could not be updated");
			onSaved(saved);
			await showToast({
				style: Toast.Style.Success,
				title: `${preset ? "Updated" : "Saved"} “${saved.name}”`,
			});
			pop();
			return true;
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: `Could not ${preset ? "edit" : "create"} preset`,
				message: reason instanceof Error ? reason.message : String(reason),
			});
			return false;
		}
	};

	return (
		<Form
			navigationTitle={preset ? "Edit Audio Preset" : "Create Audio Preset"}
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title={preset ? "Update Preset" : "Create Preset"}
						icon={Icon.SaveDocument}
						onSubmit={submit}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField
				id="name"
				title="Preset Name"
				placeholder="For example, Desk Setup"
				defaultValue={preset?.name}
				autoFocus
			/>
			<Form.Dropdown
				id="output"
				title="Output"
				defaultValue={
					preset?.output?.name ??
					inventory.outputs.find((device) => device.isDefault)?.name ??
					""
				}
			>
				<Form.Dropdown.Item value="" title="Do not set output" />
				{preset?.output &&
					!inventory.outputs.some(
						(device) => device.name === preset.output?.name,
					) && (
						<Form.Dropdown.Item
							value={preset.output.name}
							title={`Unavailable — ${preset.output.description}`}
						/>
					)}
				{inventory.outputs.map((device) => (
					<Form.Dropdown.Item
						key={device.name}
						value={device.name}
						title={`${getEndpointDisplayName(device, inventory, aliases)} — ${device.description}`}
					/>
				))}
			</Form.Dropdown>
			<Form.Dropdown
				id="input"
				title="Input"
				defaultValue={
					preset?.input?.name ??
					inventory.inputs.find((device) => device.isDefault)?.name ??
					""
				}
			>
				<Form.Dropdown.Item value="" title="Do not set input" />
				{preset?.input &&
					!inventory.inputs.some(
						(device) => device.name === preset.input?.name,
					) && (
						<Form.Dropdown.Item
							value={preset.input.name}
							title={`Unavailable — ${preset.input.description}`}
						/>
					)}
				{inventory.inputs.map((device) => (
					<Form.Dropdown.Item
						key={device.name}
						value={device.name}
						title={`${getEndpointDisplayName(device, inventory, aliases)} — ${device.description}`}
					/>
				))}
			</Form.Dropdown>
			<Form.Description
				title="Profile behavior"
				text={
					preset
						? "Unchanged endpoints keep their saved profiles. Newly selected endpoints use their devices' current profiles. Activate another profile under Device Profiles before selecting its endpoints."
						: "The active profiles of selected devices are included. To use another profile, activate it from Device Profiles first, then open this form to choose its endpoints."
				}
			/>
		</Form>
	);
}
