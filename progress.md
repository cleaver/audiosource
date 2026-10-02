# Progress Log

## Session: 2026-10-02

### Phase 1: Inspect system and Vicinae path
- **Status:** complete
- Actions taken:
  - Confirmed the `audiosource` workspace was empty and found the neighboring Vicinae source checkout.
  - Read the Vicinae repository instructions and TypeScript SDK implementation.
  - Inspected current PipeWire/Pulse-compatible audio devices, defaults, and Q30 profiles without changing audio state.
  - Checked official Vicinae, WirePlumber, and PulseAudio documentation for extension installation, profiles, defaults, and stream behavior.
  - Asked the user about manual vs. app-triggered switching, restore behavior, and moving existing streams.
- Files created/modified:
  - `task_plan.md`
  - `findings.md`
  - `progress.md`

### Phase 2: Draft MVP plan
- **Status:** complete
- Actions taken:
  - Proposed a manual TypeScript extension using `pactl`, stable identifiers, JSON preset storage, profile-first application, verification, rollback, and restore.
  - Confirmed manual quick actions, a manual restore to the prior setup, defaults-only switching for new streams, and no call-end detection.
  - Updated the roadmap to reflect those choices.
- Files created/modified:
  - `task_plan.md`

### Phase 3: First vertical slice — audio inventory
- **Status:** in_progress
- Actions taken:
  - Read the TDD skill and Vicinae extension examples.
  - Confirmed `pactl` JSON exposes card profiles, endpoint names, device identity properties, and a monitor-source marker.
  - Confirmed the installed launcher version and local Node/npm versions.
  - Added the extension manifest, local SDK dependencies, a read-only device inventory reader, and the Audio Devices list view.
  - TDD: wrote one inventory behavior test, observed the expected RED failure for the missing reader, implemented the reader, and reached GREEN.
  - Verified the reader against the live audio server without changing audio state. It found 5 cards, 7 outputs, 4 inputs, and the current defaults.
  - Added input and output actions to set system defaults. Tests confirm each command maps to the corresponding `pactl` default-setting command and does not move active streams.
  - Built and linted the extension, then started a Vicinae development session. `vicinae cmd ls` reports `@local/audio-switcher:audio-devices`.
- Files created/modified:
  - `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`, `README.md`, `assets/icon.png`
  - `src/audio-inventory.ts`, `src/audio-devices.tsx`, `tests/audio-inventory.test.ts`

### Phase 3: Save current setup as a preset
- **Status:** complete
- Actions taken:
  - Added `captureCurrentSetup`, which records current default input/output and active profiles for their cards.
  - Added a validated JSON-backed `AudioPresetStore` using Vicinae `LocalStorage`.
  - Added a “Save Current Setup as Preset” form and displayed saved presets with their captured endpoints and profiles.
  - Added a behavior test connecting capture and persistence; observed RED for the missing action, then GREEN after implementation.
  - Formatted, tested, built, and linted the extension. All six tests pass, and the manifest is valid.
- Files created/modified:
  - `src/preset-model.ts`, `src/preset-store.ts`, `src/preset-actions.ts`, `src/save-preset-form.tsx`, `src/audio-devices.tsx`
  - `tests/preset-model.test.ts`, `tests/preset-store.test.ts`, `tests/preset-actions.test.ts`
  - `task_plan.md`

### Phase 3: Create, apply, and restore presets
- **Status:** complete
- Actions taken:
  - Added a direct preset form that selects any currently discovered input and output without changing defaults. It captures active profiles for those selected devices.
  - Added card-profile and default-setting operations behind an injected system boundary.
  - Applying a preset validates profile availability, changes profiles first, waits up to about 1.8 seconds for requested endpoints, changes system defaults only, and verifies the selected defaults.
  - Captures the previous defaults plus profiles on affected cards in `LocalStorage`; offers a manual restore action and clears the snapshot after restore.
  - On apply failure, best-effort rollback restores the snapshot. Tests cover profile-before-default ordering, manual restore, rollback after missing endpoints, and preservation of other devices' profiles.
  - TDD: wrote the preset application behavior test first, observed RED, implemented the action sequence, then reached GREEN.
  - Formatted, tested, built, and linted; all 13 behavior tests pass.
- Files created/modified:
  - `src/audio-inventory.ts`, `src/audio-devices.tsx`, `src/create-preset-form.tsx`
  - `src/preset-model.ts`, `src/preset-store.ts`, `src/preset-actions.ts`, `src/save-preset-form.tsx`
  - `tests/audio-selection.test.ts`, `tests/preset-creation.test.ts`, `tests/preset-application.test.ts`, `tests/preset-store.test.ts`
  - `README.md`, `task_plan.md`

### Phase 3: Switch device profiles from Vicinae
- **Status:** complete
- Actions taken:
  - Added a per-card profile picker for available profiles, with the current profile marked active.
  - Activating a profile waits for the card state to update, then refreshes the device list so newly created inputs and outputs appear.
  - TDD: wrote a behavior test first, observed RED for the missing profile action, implemented it, and reached GREEN.
  - Formatted, tested, built, and linted; all 14 behavior tests pass.
- Files created/modified:
  - `src/card-profile-picker.tsx`, `src/preset-actions.ts`, `src/audio-devices.tsx`, `src/create-preset-form.tsx`
  - `tests/profile-switching.test.ts`
  - `README.md`, `task_plan.md`

### Phase 3: Show unavailable preset targets
- **Status:** complete
- Actions taken:
  - Added profile-aware availability checks for saved presets.
  - Endpoints hidden by another available profile remain applicable; disconnected cards or unavailable profiles are marked unavailable and have no Apply action.
  - TDD: wrote the visibility behavior tests first, observed RED, implemented the model check and UI marker, then reached GREEN.
  - Formatted, tested, built, and linted; all 16 behavior tests pass.
- Files created/modified:
  - `src/preset-model.ts`, `src/audio-devices.tsx`
  - `tests/preset-availability.test.ts`
  - `task_plan.md`

### Bug fix: null LocalStorage values
- **Status:** complete
- Actions taken:
  - Reproduced the user's save error twice with a focused fake-storage test: `Cannot read properties of null (reading 'length')` in `AudioPresetStore.list()` during the initial save.
  - Confirmed Vicinae's missing-key backend result is JSON null, while the SDK TypeScript declaration says undefined.
  - Updated preset storage to handle null, undefined, and empty-string results for both preset and restore keys.
  - The regression test confirms first save succeeds and an empty restore key reads as absent.
  - All 17 behavior tests pass; build and lint pass.
- Files modified:
  - `src/preset-store.ts`, `tests/preset-store.test.ts`

### Phase 3: Automatic device names and aliases
- **Status:** complete
- Actions taken:
  - Added inferred labels for built-in, HDMI/DisplayPort, USB, and Bluetooth endpoints, including monitor name and port-number disambiguation.
  - Added persistent per-device display-name aliases and actions to edit or return to automatic labels.
  - Kept device names/IDs used for preset switching unchanged; updated device/profile/preset UI and forms to show friendly labels.
  - Live read-only inventory produced `HDMI · ASUS VG289`, `Built-in · Speaker`, and distinct digital/stereo microphone labels.
  - All 22 behavior tests passed; build and manifest lint passed.
- Commit: `80cd0c5 feat(labels): add automatic device aliases`

### User scope update: preset ownership and Bluetooth controls
- **Status:** in_progress
- Actions taken:
  - The user will create their own Q30 call preset; removed that one-off setup from the implementation checklist.
  - Added work to list paired Bluetooth devices with status, provide connect/disconnect actions, and implement bounded connect retries with final-state verification.
  - Kept profile switching and endpoint discovery in scope so the user can make presets themselves.
  - Added live Bluetooth/preset verification tasks to Phase 4.
- Next slices:
  1. Rename/delete saved presets.
  2. Discover paired Bluetooth devices and report connection status.
  3. Add connect/disconnect controls and reliable bounded connection attempts.
  4. Complete non-disruptive live checks and visual inspection.

### Next slice
- **Status:** pending
- Implement preset rename/delete and Bluetooth controls, then perform the remaining live and visual verification.

## Test Results
| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| Inventory behavior | Mocked `pactl` JSON and defaults | Shows inputs, outputs, profiles, current defaults, and omits monitor sources | Passes; first failed RED because the reader was not implemented yet | ✓ |
| Live inventory smoke check | Read-only `pactl` calls through production runner | Returns device counts and active defaults | 5 cards, 7 outputs, 4 inputs; Q30 output and C200 microphone are defaults | ✓ |
| Set output default | Injected `pactl` boundary | Requests `set-default-sink <name>` only | Pass | ✓ |
| Set input default | Injected `pactl` boundary | Requests `set-default-source <name>` only | Pass | ✓ |
| Capture and save current setup | Fake saver receives defaults and active profiles | Save the named preset with its current endpoint and profile data | Pass; first failed RED because the action was missing | ✓ |
| Preset persistence | In-memory storage, then a new store instance | Saved preset survives reload | Pass | ✓ |
| Preset creation | Select non-default endpoints in a mocked inventory | Save the selected input/output and their profiles without changing defaults | Pass; rejects endpoints absent from refreshed inventory | ✓ |
| Preset application | Injected inventory/profile/default operations | Set profiles first, then only requested defaults; save affected prior profiles | Pass | ✓ |
| Manual restore | Injected operations | Restore the prior profile before its input/output defaults | Pass | ✓ |
| Apply rollback | Target endpoints remain absent after profile change | Roll back to prior profile/defaults and clear snapshot | Pass | ✓ |
| Restore snapshot persistence | In-memory storage and a new store instance | Snapshot survives reload and clears after manual restore | Pass | ✓ |
| Missing Vicinae storage key | Storage returns null for an empty key | First preset save works; restore key reads as absent | Reproduced original null.length failure, then passes after null-safe handling | ✓ |
| Profile switching | Delayed fake card-profile update | Wait for selected profile, then return refreshed input/output inventory | Pass; first failed RED because profile helper was missing | ✓ |
| Preset availability | Connected Q30 in A2DP, then disconnected Q30 | Treat HFP endpoints as reachable while HFP profile is available; otherwise mark unavailable | Pass; first failed RED because availability check was missing | ✓ |
| Extension build/typecheck | `npm run build` | Typechecks and bundles the command | Pass | ✓ |
| Manifest validation | `npm run lint` | Manifest accepted | Pass | ✓ |

## Error Log
| Timestamp | Error | Attempt | Resolution |
|-----------|-------|---------|------------|
| 2026-10-02 | Stale `mise` shim diagnostic in login shell | 1 | Used `login:false` for shell inspection. |
| 2026-10-02 | SDK path search ran in the empty task directory | 1 | Re-ran in the Vicinae repository. |
| 2026-10-02 | Clarification request sent with unsupported field name | 1 | Resubmitted with supported `title` field. |
| 2026-10-02 | Two plan patch context mismatches | 1 | Reopened the Markdown and reapplied smaller file-specific patches. |
| 2026-10-02 | Unsupported manifest category | 1 | Replaced `Utilities` with `System`. |
| 2026-10-02 | Unsupported SDK icon name | 1 | Replaced `Icon.Audio` with `Icon.SpeakerHigh`. |
| 2026-10-02 | Build rejected a loosely typed preset saver in a test | 1 | Used the real preset draft/result types and rebuilt successfully. |
| 2026-10-02 | Build rejected unsupported `Icon.List` in the preset action row | 1 | Changed the icon to the supported `Icon.Bookmark`. |
| 2026-10-02 | Second behavior test imported the wrong module | 1 | Corrected the import to use the audio inventory interface. |
| 2026-10-02 | Plan patch context changed during an earlier hunk | 1 | Reapplied the phase update separately. |
| 2026-10-02 | First preset save failed because a missing Vicinae storage key returned `null` | Reproduced twice in a focused store test | Treat null, undefined, and empty-string values as empty storage. |

## 5-Question Reboot Check
| Question | Answer |
|----------|--------|
| Where am I? | Device inventory, default selection, direct profile switching, presets/restore, unavailable-device indicators, and friendly aliases are implemented. |
| Where am I going? | Add preset rename/delete and paired Bluetooth status/connect/disconnect, then finish safe live and visual verification. |
| What's the goal? | Build a Vicinae extension for audio switching, user-defined presets, and known Bluetooth device management. |
| What have I learned? | See `findings.md`. |
| What have I done? | Completed red-green inventory, selection, preset creation/application/restore, availability, and friendly-label slices; extension builds and is registered in Vicinae development mode. |
