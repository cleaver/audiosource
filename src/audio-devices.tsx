import {
	Action,
	ActionPanel,
	Icon,
	List,
	LocalStorage,
	showToast,
	Toast,
} from "@vicinae/api";
import { useEffect, useState } from "react";
import {
	readAudioInventory,
	setCardProfile,
	setDefaultEndpoint,
	type AudioInventory,
} from "./audio-inventory";
import { CreatePresetForm } from "./create-preset-form";
import {
	applyAudioPreset,
	restoreAudioSetup,
	type PresetExecution,
} from "./preset-actions";
import { SavePresetForm } from "./save-preset-form";
import { AudioPresetStore, type AudioPreset } from "./preset-store";
import type { AudioPresetDraft } from "./preset-model";

const presetStore = new AudioPresetStore({
	getItem: (key) => LocalStorage.getItem<string>(key),
	setItem: (key, value) => LocalStorage.setItem(key, value),
});

const presetExecution: PresetExecution = {
	readInventory: readAudioInventory,
	setCardProfile,
	setDefaultEndpoint,
	saveRestoreSnapshot: (setup) => presetStore.saveRestoreSnapshot(setup),
	clearRestoreSnapshot: () => presetStore.clearRestoreSnapshot(),
};

export default function AudioDevices() {
	const [inventory, setInventory] = useState<AudioInventory | null>(null);
	const [presets, setPresets] = useState<AudioPreset[]>([]);
	const [restoreSnapshot, setRestoreSnapshot] =
		useState<AudioPresetDraft | null>(null);
	const [presetError, setPresetError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const applyDefault = async (
		kind: "input" | "output",
		name: string,
		label: string,
	) => {
		try {
			await setDefaultEndpoint(kind, name);
			setInventory(await readAudioInventory());
			await showToast({
				style: Toast.Style.Success,
				title: `Default ${label} updated`,
			});
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: `Could not set default ${label}`,
				message: reason instanceof Error ? reason.message : String(reason),
			});
		}
	};

	useEffect(() => {
		let isCurrent = true;
		readAudioInventory().then(
			(result) => {
				if (isCurrent) setInventory(result);
			},
			(reason: unknown) => {
				if (isCurrent) {
					setError(reason instanceof Error ? reason.message : String(reason));
				}
			},
		);
		presetStore.list().then(
			(result) => {
				if (isCurrent) setPresets(result);
			},
			(reason: unknown) => {
				if (isCurrent) {
					setPresetError(
						reason instanceof Error ? reason.message : String(reason),
					);
				}
			},
		);
		presetStore.getRestoreSnapshot().then(
			(result) => {
				if (isCurrent) setRestoreSnapshot(result ?? null);
			},
			(reason: unknown) => {
				if (isCurrent) {
					setPresetError(
						reason instanceof Error ? reason.message : String(reason),
					);
				}
			},
		);

		return () => {
			isCurrent = false;
		};
	}, []);

	const applyPreset = async (preset: AudioPreset) => {
		try {
			const updated = await applyAudioPreset(preset, presetExecution);
			setInventory(updated);
			setRestoreSnapshot((await presetStore.getRestoreSnapshot()) ?? null);
			await showToast({
				style: Toast.Style.Success,
				title: `Applied “${preset.name}”`,
			});
		} catch (reason) {
			const updated = await readAudioInventory().catch(() => null);
			if (updated) setInventory(updated);
			setRestoreSnapshot(
				(await presetStore.getRestoreSnapshot().catch(() => undefined)) ?? null,
			);
			await showToast({
				style: Toast.Style.Failure,
				title: `Could not apply “${preset.name}”`,
				message: reason instanceof Error ? reason.message : String(reason),
			});
		}
	};

	const restorePreviousSetup = async () => {
		if (!restoreSnapshot) return;
		try {
			const updated = await restoreAudioSetup(restoreSnapshot, presetExecution);
			await presetStore.clearRestoreSnapshot();
			setInventory(updated);
			setRestoreSnapshot(null);
			await showToast({
				style: Toast.Style.Success,
				title: "Previous audio setup restored",
			});
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Could not restore previous setup",
				message: reason instanceof Error ? reason.message : String(reason),
			});
		}
	};

	if (error) {
		return (
			<List navigationTitle="Audio Devices">
				<List.EmptyView
					title="Could not load audio devices"
					description={error}
					icon={Icon.Warning}
				/>
			</List>
		);
	}

	return (
		<List
			navigationTitle="Audio Devices"
			searchBarPlaceholder="Search audio devices..."
			isLoading={!inventory}
		>
			{inventory && (
				<>
					<List.Section title="Presets">
						{restoreSnapshot && (
							<List.Item
								title="Restore Previous Setup"
								subtitle="Return to the setup captured before the last preset"
								icon={Icon.Checkmark}
								actions={
									<ActionPanel>
										<Action
											title="Restore Previous Setup"
											icon={Icon.Checkmark}
											onAction={restorePreviousSetup}
										/>
									</ActionPanel>
								}
							/>
						)}
						<List.Item
							title="Save Current Setup as Preset"
							subtitle="Name and save the current defaults and profiles"
							icon={Icon.Plus}
							actions={
								<ActionPanel>
									<Action.Push
										title="Save Current Setup"
										icon={Icon.SaveDocument}
										target={
											<SavePresetForm
												inventory={inventory}
												saver={presetStore}
												onSaved={(preset) =>
													setPresets((current) => [...current, preset])
												}
											/>
										}
									/>
								</ActionPanel>
							}
						/>
						<List.Item
							title="Create Preset"
							subtitle="Choose connected inputs and outputs without changing defaults"
							icon={Icon.Bookmark}
							actions={
								<ActionPanel>
									<Action.Push
										title="Create Preset"
										icon={Icon.Plus}
										target={
											<CreatePresetForm
												inventory={inventory}
												saver={presetStore}
												onSaved={(preset) =>
													setPresets((current) => [...current, preset])
												}
											/>
										}
									/>
								</ActionPanel>
							}
						/>
						{presetError && (
							<List.Item
								title="Could not load saved presets"
								subtitle={presetError}
								icon={Icon.Warning}
							/>
						)}
						{presets.map((preset) => {
							const details = [
								preset.output && `Output: ${preset.output.description}`,
								preset.input && `Input: ${preset.input.description}`,
								...preset.profiles.map((profile) => profile.profileName),
							].filter(Boolean);
							return (
								<List.Item
									key={preset.id}
									title={preset.name}
									subtitle={details.join(" · ")}
									icon={Icon.Bookmark}
									actions={
										<ActionPanel>
											<Action
												title="Apply Preset"
												icon={Icon.Checkmark}
												onAction={() => applyPreset(preset)}
											/>
										</ActionPanel>
									}
								/>
							);
						})}
					</List.Section>
					<List.Section title="Outputs">
						{inventory.outputs.map((device) => (
							<List.Item
								key={device.name}
								title={device.description}
								subtitle={device.name}
								icon={Icon.SpeakerHigh}
								accessories={device.isDefault ? [{ text: "Default" }] : []}
								actions={
									<ActionPanel>
										<Action
											title="Set as Default Output"
											icon={Icon.Checkmark}
											onAction={() =>
												applyDefault("output", device.name, "output")
											}
										/>
									</ActionPanel>
								}
							/>
						))}
						{inventory.outputs.length === 0 && (
							<List.Item title="No outputs available" icon={Icon.SpeakerOff} />
						)}
					</List.Section>
					<List.Section title="Inputs">
						{inventory.inputs.map((device) => (
							<List.Item
								key={device.name}
								title={device.description}
								subtitle={device.name}
								icon={Icon.Microphone}
								accessories={device.isDefault ? [{ text: "Default" }] : []}
								actions={
									<ActionPanel>
										<Action
											title="Set as Default Input"
											icon={Icon.Checkmark}
											onAction={() =>
												applyDefault("input", device.name, "input")
											}
										/>
									</ActionPanel>
								}
							/>
						))}
						{inventory.inputs.length === 0 && (
							<List.Item
								title="No inputs available"
								icon={Icon.MicrophoneDisabled}
							/>
						)}
					</List.Section>
					<List.Section title="Device profiles">
						{inventory.cards.map((card) => (
							<List.Item
								key={card.name}
								title={card.description}
								subtitle={`Active profile: ${card.activeProfile || "Unknown"}`}
								icon={Icon.SpeakerHigh}
								accessories={[
									{
										text: `${card.profiles.filter((profile) => profile.available).length} available`,
									},
								]}
							/>
						))}
					</List.Section>
				</>
			)}
		</List>
	);
}
