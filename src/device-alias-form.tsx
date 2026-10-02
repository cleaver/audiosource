import {
	Action,
	ActionPanel,
	Form,
	Icon,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import type { DeviceAliasStore } from "./device-alias-store";

type DeviceAliasFormProps = {
	deviceName: string;
	automaticName: string;
	currentAlias?: string;
	store: DeviceAliasStore;
	onSaved: (alias: string | undefined) => void;
};

export function DeviceAliasForm({
	deviceName,
	automaticName,
	currentAlias,
	store,
	onSaved,
}: DeviceAliasFormProps) {
	const { pop } = useNavigation();

	const submit = async (values: Form.Values) => {
		const alias = typeof values.name === "string" ? values.name.trim() : "";
		try {
			await store.set(deviceName, alias);
			onSaved(alias || undefined);
			await showToast({
				style: Toast.Style.Success,
				title: alias ? "Device name saved" : "Using automatic device name",
			});
			pop();
			return true;
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Could not save device name",
				message: reason instanceof Error ? reason.message : String(reason),
			});
			return false;
		}
	};

	return (
		<Form
			navigationTitle="Name Audio Device"
			actions={
				<ActionPanel>
					<Action.SubmitForm
						title="Save Device Name"
						icon={Icon.SaveDocument}
						onSubmit={submit}
					/>
				</ActionPanel>
			}
		>
			<Form.TextField
				id="name"
				title="Display Name"
				placeholder={automaticName}
				defaultValue={currentAlias ?? ""}
				autoFocus
			/>
			<Form.Description
				title="Automatic name"
				text={`${automaticName}\nWhen available, this name is shared by the device’s inputs and outputs. Leave the field empty to use the automatic name.`}
			/>
		</Form>
	);
}
