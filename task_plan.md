# Vicinae Audio Switcher Plan

## Goal
Draft an implementation plan for a local Vicinae extension that switches audio inputs and outputs and lets the user save and apply named combinations, including a Q30 hands-free call setup.

## Current Phase
Phase 3: Finish and verify the manual preset workflow. Device discovery, profile switching, preset creation/application, restore, and unavailable-device status are implemented; preset editing and live hardware verification remain.

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
- [ ] Add rename and delete actions for saved presets.
- [x] Refresh device choices whenever the command opens.
- [x] Keep saved presets when devices are disconnected.
- [x] Mark disconnected preset targets unavailable until they reconnect; still allow endpoints hidden by an available inactive profile.
- [x] Add a direct card-profile action to the device list and refresh inventory after the profile changes.
- [ ] Add a Q30 call preset using the available HFP/MSBC profile, then resolve its newly created input and output nodes.
- [x] Apply saved profiles first, wait for requested endpoints, change system defaults only, verify the result, and roll back best-effort if a step fails.
- [x] Save a one-level “restore previous setup” snapshot in Vicinae `LocalStorage` as JSON text; offer manual restore.
- **Status:** in_progress

### Phase 4: Verify and install for this user
- [ ] Check behavior with Q30 in A2DP and hands-free profiles, including its input and output appearing/disappearing across profile changes.
- [ ] Check ordinary USB devices, a missing/disconnected device, command errors, and restoring prior defaults/profile.
- [ ] Verify applying a preset leaves already-running app streams on their current routes.
- [x] Build and lint the extension, then load it in a Vicinae development session from this source tree.
- [ ] Visually inspect the rendered device list and default markers in Vicinae.
- **Status:** pending

### Phase 5: Optional follow-up
- [ ] Consider app-triggered preset activation only if requested. Call-end detection remains out of scope.
- [ ] Consider per-app stream routing, multiple saved restore points, or extension-store packaging if they become useful.
- **Status:** pending

## Proposed MVP
- One Vicinae command showing current input/output and saved presets.
- Direct actions to set the default input or output.
- Create a preset from the current system setup, or define one by selecting currently connected input/output devices. Active profiles for those devices are captured; also support rename, edit, and delete.
- Keep saved device targets when disconnected and show them as unavailable until they return. A not-yet-connected device cannot be selected yet.
- A “Calls — Q30 hands-free” preset that activates the headset's HFP hands-free profile and selects both resulting endpoints.
- A manually invoked restore action that returns to the setup captured just before the last preset application.
- Manual activation in version one; do not monitor apps or detect call end.
- Applying a preset changes defaults for new streams without moving existing app streams.

## Confirmed MVP Choices
- Manual quick actions.
- Provide a manual action to restore the prior audio profile and system defaults after a call preset.
- Change system defaults only; do not move existing app streams.
- Do not detect call end; the user will switch back manually.

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
