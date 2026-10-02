import {
	Action,
	ActionPanel,
	Icon,
	List,
	showToast,
	Toast,
	useNavigation,
} from "@vicinae/api";
import type { AudioCard, AudioInventory } from "./audio-inventory";
import { getCardDisplayName, type DeviceAliases } from "./device-labels";
import {
	changeAudioCardProfile,
	type ProfileChangeExecution,
} from "./preset-actions";

type CardProfilePickerProps = {
	card: AudioCard;
	aliases: DeviceAliases;
	execution: ProfileChangeExecution;
	onChanged: (inventory: AudioInventory) => void;
};

export function CardProfilePicker({
	card,
	aliases,
	execution,
	onChanged,
}: CardProfilePickerProps) {
	const { pop } = useNavigation();

	const activate = async (profileName: string) => {
		try {
			const inventory = await changeAudioCardProfile(
				card.name,
				profileName,
				execution,
			);
			onChanged(inventory);
			await showToast({
				style: Toast.Style.Success,
				title: `Activated ${profileName}`,
			});
			pop();
		} catch (reason) {
			await showToast({
				style: Toast.Style.Failure,
				title: "Could not change audio profile",
				message: reason instanceof Error ? reason.message : String(reason),
			});
		}
	};

	const profiles = card.profiles.filter(
		(profile) => profile.available || profile.name === card.activeProfile,
	);

	return (
		<List navigationTitle={`${getCardDisplayName(card, aliases)} Profiles`}>
			<List.Section title="Available Profiles">
				{profiles.map((profile) => {
					const isActive = profile.name === card.activeProfile;
					return (
						<List.Item
							key={profile.name}
							title={profile.description}
							subtitle={profile.name}
							icon={Icon.SpeakerHigh}
							accessories={isActive ? [{ text: "Active" }] : []}
							actions={
								<ActionPanel>
									{!isActive && (
										<Action
											title="Activate Profile"
											icon={Icon.Checkmark}
											onAction={() => activate(profile.name)}
										/>
									)}
								</ActionPanel>
							}
						/>
					);
				})}
				{profiles.length === 0 && (
					<List.Item title="No profiles available" icon={Icon.Warning} />
				)}
			</List.Section>
		</List>
	);
}
