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
import { createPresetFromSelection } from "./preset-model";
import type { PresetSaver } from "./preset-actions";
import type { AudioPreset } from "./preset-store";

type CreatePresetFormProps = {
	inventory: AudioInventory;
	saver: PresetSaver;
	onSaved: (preset: AudioPreset) => void;
};

export function CreatePresetForm({
	inventory,
	saver,
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
			const draft = createPresetFromSelection(
				values.name,
				typeof values.output === "string"
					? values.output || undefined
					: undefined,
				typeof values.input === "string"
					? values.input || undefined
					: undefined,
				inventory,
			);
			const preset = await saver.save(draft);
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
				title: "Could not create preset",
				message: reason instanceof Error ? reason.message : String(reason),
			});
			return false;
		}
	};

	return (
		<Form
			navigationTitle="Create Audio Preset"
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Create Preset"
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
				autoFocus
			/>
			<Form.Dropdown
				id="output"
				title="Output"
				defaultValue={
					inventory.outputs.find((device) => device.isDefault)?.name ?? ""
				}
			>
				<Form.Dropdown.Item value="" title="Do not set output" />
				{inventory.outputs.map((device) => (
					<Form.Dropdown.Item
						key={device.name}
						value={device.name}
						title={`${device.description} — ${device.name}`}
					/>
				))}
			</Form.Dropdown>
			<Form.Dropdown
				id="input"
				title="Input"
				defaultValue={
					inventory.inputs.find((device) => device.isDefault)?.name ?? ""
				}
			>
				<Form.Dropdown.Item value="" title="Do not set input" />
				{inventory.inputs.map((device) => (
					<Form.Dropdown.Item
						key={device.name}
						value={device.name}
						title={`${device.description} — ${device.name}`}
					/>
				))}
			</Form.Dropdown>
			<Form.Description
				title="Profile behavior"
				text="The active profiles of selected devices are included. To save a different Bluetooth profile, activate it first, then reopen this command to refresh device choices."
			/>
		</Form>
	);
}
