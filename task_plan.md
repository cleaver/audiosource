# Vicinae Audio Switcher Plan

## Goal
Build a local Vicinae extension that switches audio inputs and outputs, manages named presets, and connects or disconnects known Bluetooth audio devices with visible status.

## Current Phase
Phase 4: Verify and install the completed extension. Audio device selection, paired Bluetooth controls, preset creation/editing/restore, unavailable-device status, and friendly labels are implemented; visual and remaining live verification are pending.

## Phases

### Phase 1: Inspect this system and the Vicinae extension path
- [x] Confirm the workspace and nearby Vicinae source checkout.
- [x] Identify the audio server, available tools, current Q30 profile, and relevant Vicinae APIs.
- [x] Record findings and current constraints in `findings.md`.
- **Status:** complete

### Phase 2: Set MVP behavior
- [x] Choose manual preset activation.
- [x] Provide a manual action to restore the captured prior setup.
- [x] Change system defaults only; leave existing app streams routed as they are.
- [x] Do not detect call end; the user will switch back manually.
- [x] Set Linux/PipeWire as the first target, based on this machine's environment.
- **Status:** complete

### Phase 3: Build the local audio control extension
- [x] Create a TypeScript `@vicinae/api` extension in this workspace with an audio-device command.
- [x] Add a `pactl` adapter using `node:child_process` with argument arrays, process timeouts, and clear errors.
- [x] Discover cards, profiles, sinks, sources, and current defaults at launch; store stable names/properties, never temporary numeric IDs.
- [x] Add direct input/output selection actions to the device list; these update system defaults only.
- [x] Add “Save current setup as preset”; capture the selected defaults and active card profiles.
- [x] Store and reload named presets using Vicinae `LocalStorage` as JSON text.
- [x] Add a “Create preset” editor to select a name and currently available input/output without changing current defaults; capture the selected devices' active profiles.
- [x] Add an editor to change a saved preset's name, input, output, and active profiles.
- [x] Add rename and delete actions for saved presets.
- [x] Add automatically inferred device labels and saved display-name aliases without changing stable audio IDs.
- [x] List paired Bluetooth audio devices even while disconnected and show connection state; filter out paired non-audio devices.
- [x] Add connect/disconnect actions for known Bluetooth devices.
- [x] Make Bluetooth connection reliable with two bounded attempts and state verification; report the final result clearly.
- [x] Refresh device choices whenever the command opens.
- [x] Keep saved presets when devices are disconnected.
- [x] Mark disconnected preset targets unavailable until they reconnect; still allow endpoints hidden by an available inactive profile.
- [x] Add a direct card-profile action to the device list and refresh inventory after the profile changes.
- [x] Apply saved profiles first, wait for requested endpoints, change system defaults only, verify the result, and roll back best-effort if a step fails.
- [x] Save a one-level “restore previous setup” snapshot in Vicinae `LocalStorage` as JSON text; offer manual restore.
- **Status:** complete

### Phase 4: Verify and install for this user
- [x] Read paired-device status from the live Bluetooth service without changing connection state.
- [ ] Verify live connect/disconnect and bounded retry behavior when safe; development validation used injected state and left the Q30 connected.
- [ ] Verify the Q30's connection state and audio endpoints across A2DP and hands-free profile changes; the user will create their own call preset.
- [x] Test USB inventory, missing/disconnected targets, command errors, and restoring prior defaults/profile using live read-only discovery and mocked control flows.
- [x] Verify preset application only changes profiles and system defaults and has no operation to move existing app streams; profile changes can recreate that device's endpoints.
- [x] Build and lint the extension, then load it in a Vicinae development session from this source tree.
- [ ] Visually inspect the rendered device list and default markers in Vicinae.
- **Status:** in_progress

### Phase 5: Optional follow-up
- [ ] Consider app-triggered preset activation only if requested. Call-end detection remains out of scope.
- [ ] Consider per-app stream routing, multiple saved restore points, or extension-store packaging if they become useful.
- **Status:** pending

## Proposed MVP
- One Vicinae command showing current input/output and saved presets.
- Direct actions to set the default input or output.
- Create a preset from the current system setup, or define one by selecting currently connected input/output devices. Active profiles for those devices are captured; also support rename, edit, and delete.
- Keep saved device targets when disconnected and show them as unavailable until they return. A not-yet-connected device cannot be selected yet.
- Provide profile switching and endpoint discovery so the user can create a “Calls — Q30 hands-free” preset themselves.
- A manually invoked restore action that returns to the setup captured just before the last preset application.
- Manual activation in version one; do not monitor apps or detect call end.
- Applying a preset changes defaults for new streams without moving existing app streams.

## Confirmed MVP Choices
- Manual quick actions.
- Provide a manual action to restore the prior audio profile and system defaults after a call preset.
- Change system defaults only; do not move existing app streams.
- Do not detect call end; the user will switch back manually.
- The user will create their own Q30 call preset; adding that specific preset is outside this implementation task.

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Target Linux with PipeWire/WirePlumber first | This machine runs PipeWire and has `pactl` and `wpctl`; the requested Q30 hands-free behavior depends on Bluetooth profiles. |
| Use a Vicinae TypeScript extension with a small `pactl` adapter | Vicinae's SDK supports list/form UI and storage, while the current in-process audio API covers output sinks but not audio sources or Bluetooth profiles. |
| Resolve devices by stable names/properties and re-query after profile changes | PipeWire node IDs change, and switching the Q30 from A2DP creates/removes its capture node. |
| Make profile activation precede endpoint selection | The selected Bluetooth profile determines which input and output nodes exist. |
| Do not move active app streams in version one | User wants preset application to change system defaults only. |
| Keep call activation and restore manual | User will switch back manually and does not want call-end detection. |
| The first slice is a read-only device/profile list | Establishes discovery and in-launch freshness without changing system audio. |
| Direct selection uses only `set-default-sink` or `set-default-source` | Matches the user's request to leave active app streams where they are. |
| Keep the example Q30 call preset user-owned | The profile picker and preset editor already let the user create it. |
| Show paired Bluetooth devices independently of active audio cards | Disconnected devices are absent from PipeWire's card inventory, but should remain connectable from Vicinae. |
| Retry Bluetooth connection a bounded number of times and verify state | Addresses intermittent connection attempts without leaving background retries running. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Login shell reported a stale `mise` shim for an uninstalled tool | 1 | Reran shell inspection with login behavior disabled. |
| One SDK file search ran from the empty `audiosource` directory | 1 | Re-ran from the neighboring Vicinae checkout. |
| Clarification form used an unsupported `question` field | 1 | Re-sent using the tool's `title` field; both questions were accepted. |
| Plan patch context did not match the decision table | 1 | Reopened the plan and patched against the current text. |
| Multi-file plan patch missed the findings heading | 1 | Reopened all planning files and split the patch into exact file contexts. |
| Manifest category `Utilities` is not supported | 1 | Changed it to the allowed `System` category. |
| SDK has no `Icon.Audio` icon | 1 | Used the supported speaker icon for device profiles. |
| First preset form build found a loosely typed test double | 1 | Gave the fake saver the real draft/result types and rebuilt successfully. |
| Scope update patch did not match the decision table | 1 | Split it into smaller patches against the current headings. |
