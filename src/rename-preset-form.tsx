import {
	Action,
	ActionPanel,
	Form,
	Icon,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import type { AudioPreset } from "./preset-store";

type RenamePresetFormProps = {
	preset: AudioPreset;
	rename: (name: string) => Promise<AudioPreset>;
	onRenamed: (preset: AudioPreset) => void;
};

export function RenamePresetForm({
	preset,
	rename,
	onRenamed,
}: RenamePresetFormProps) {
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
			const updated = await rename(values.name);
			onRenamed(updated);
			await showToast({
				style: Toast.Style.Success,
				title: `Renamed to “${updated.name}”`,
			});
			pop();
			return true;
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Could not rename preset",
				message: reason instanceof Error ? reason.message : String(reason),
			});
			return false;
		}
	};

	return (
		<Form
			navigationTitle="Rename Preset"
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Rename Preset"
						icon={Icon.Pencil}
						onSubmit={submit}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField
				id="name"
				title="Preset Name"
				defaultValue={preset.name}
				autoFocus
			/>
		</Form>
	);
}
