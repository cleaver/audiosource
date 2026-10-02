# Findings & Decisions

## Requirements
- Vicinae plugin/extension to select system audio input and output.
- User-defined presets that bundle input/output (and, when needed, the device profile).
- Example: Q30 headset call mode should select its hands-free input and output; other activities should use a different setup.
- Feature scope is open; user asked for a draft plan and invited clarifying questions.
- Confirmed choices: manual quick actions; a manual restore action for the prior setup; change defaults for new streams only; do not detect call end because the user will switch back manually.
- Preset definition should support saving the current setup and selecting from newly discovered devices; an absent device stays saved but unavailable until it reconnects.
- The user will define their own Q30 call preset in the extension; the project should not ship a preset specific to their headset.
- Add controls for already-paired Bluetooth audio devices: show live connection status, connect/disconnect on demand, and retry connection a small bounded number of times with state verification.

## System Findings
- Workspace `audiosource` was empty; the neighboring `/home/cleaver/Documents/projects/build/vicinae` checkout contains Vicinae's TypeScript extension SDK and boilerplate.
- This machine runs Manjaro Linux with PipeWire 1.6.8 and the PulseAudio compatibility server. `pactl`, `wpctl`, and `bluetoothctl` are installed.
- The soundcore Life Q30 is connected. Its current profile is `a2dp-sink`, which exposes playback only. Available Bluetooth profiles include `headset-head-unit` (HFP/MSBC) and `headset-head-unit-cvsd`; the hands-free profiles expose one sink and one source.
- At inspection time the Q30 was the default output and the Anker PowerConf C200 was the default input. Activating HFP changes the Q30's available nodes, so the extension must switch the card profile before resolving/setting its input and output.
- `wpctl`/`pactl` numeric object IDs are session-specific. Store stable card/node names or identifying properties and re-query after transitions.
- `pactl --format=json list cards` returns each card's active profile and available profiles. Sink/source JSON exposes a stable node `name` and `properties.device.name`; monitor sources are marked with `properties.device.class = "monitor"` and should not be offered as microphones.
- The device-label slice now reads card and endpoint metadata such as bus, product name, node nickname, and active port; common built-in, HDMI, USB, and Bluetooth devices receive short labels, while unknown devices retain their descriptions.
- Read-only BlueZ CLI inspection shows `bluetoothctl devices Paired` lists the Q30, a Magic Trackpad, and a gamepad even when only some are audio devices. `bluetoothctl info <address>` reports device alias, paired/trusted flags, and `Connected: yes/no`; the Q30 is currently paired, trusted, and connected. No Bluetooth state was changed during inspection.
- The Bluetooth UI filters by audio-specific BlueZ icons or usable remote roles (`Audio Sink`, `Headset`, or `Handsfree`). Generic A2DP/audio-source and hands-free-gateway UUIDs can belong to phones or controllers and do not alone make a paired device an output/input headset.
- A live, read-only scan confirmed the filter shows the Q30 as connected while excluding the Magic Trackpad and `c134v3r p4d (2)`; the latter advertises generic audio-source/remote-control roles but has BlueZ icon `computer` and no headset/sink role. The system's current default sink/source were unchanged by discovery.
- Official BlueZ CLI docs support `devices Paired`, `connect <address>`, and `disconnect <address>`. BlueZ's `Device1.Connected` property is the authoritative connection state; `Connect()` can return `InProgress`/`AlreadyConnected`, and reports success if at least one eligible profile connects. A bounded retry must check actual state before repeating. `Disconnect()` drops connected profiles and the link but does not remove pairing. Sources: https://github.com/bluez/bluez/blob/master/doc/bluetoothctl.rst and https://github.com/bluez/bluez/blob/master/doc/org.bluez.Device.rst.
- Installed versions: Vicinae v0.23.2, Node v24.21.0, npm v11.13.0. The `vici` executable is not global; extension scripts should invoke the project-local SDK CLI.

## Vicinae Findings
- `@vicinae/api` provides React-based list/form components and `LocalStorage`. Local storage values are scalar strings/numbers/booleans, so serialize a preset collection as JSON text.
- The SDK's `runInTerminal` opens a terminal and is not an appropriate silent command runner. Current extension workers use Node.js; `patch-require.ts` delegates unknown modules to Node's normal loader, so `node:child_process` is a viable adapter to validate in a small spike.
- Vicinae's in-tree audio-control abstraction lists and sets output sinks only. It does not expose input selection or Bluetooth card profiles to TypeScript extensions. Use `pactl` through the extension process unless Vicinae adds a broader API.
- The Vicinae source checkout is clean on `main`; no project files have been changed there.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Start with a local TypeScript extension for Linux/PipeWire | Matches the installed launcher and current hardware; avoids changing Vicinae core. |
| Use `pactl` for card profiles and default source/sink selection | The PulseAudio-compatible interface is available on this PipeWire system and can control both inputs and outputs. |
| Use stable identities and bounded polling | Profile changes create and remove nodes asynchronously; numeric IDs are transient. |
| Keep app-triggered switching out of MVP | Manual quick actions have clear activation/restore behavior and avoid monitoring other applications until the user asks for it. |
| Offer rollback and an explicit restore action | A partial profile/device switch should not leave audio silently misconfigured. |
| Do not move active streams or detect call end | User wants defaults-only switching and will restore manually. |
| Support both saving the current setup and selecting live devices in a preset editor | Lets the user define presets for hardware as it is added, without requiring hand-edited config. |
| Verify Bluetooth connection actions against the reported connection state and cap connect attempts at two | Handles already-connected and in-progress outcomes, allows one retry when the first attempt does not connect, and prevents indefinite retries. |

## Research Findings
- WirePlumber documents `wpctl set-default` and its use of node IDs; it also documents Bluetooth HFP and A2DP roles and automatic headset profile switching.
- PulseAudio's default device docs describe sink/source defaults as fallback choices; an existing stream can remain routed to its remembered device. The user chose defaults-only switching.
- Vicinae's install docs support building an extension from a source tree with `npm install` and `npm run build`.

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| Interactive login shell printed stale `mise` shim diagnostics | Ran read-only inspection with `login:false`. |
| Initial SDK search used the task directory rather than the neighboring source checkout | Corrected `workdir` and inspected the SDK there. |
| Two patch attempts did not match current Markdown context | Re-read the current files, then split the edits into smaller file-specific patches. |
| `vici` was not available as a global command | Use the `vici` binary installed from this extension's `@vicinae/api` dependency. |

## Resources
- Vicinae extension installation docs: https://docs.vicinae.com/install-extensions
- WirePlumber `wpctl` docs: https://pipewire.pages.freedesktop.org/wireplumber/man/wpctl.html
- WirePlumber Bluetooth docs: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/bluetooth.html
- WirePlumber settings docs: https://pipewire.pages.freedesktop.org/wireplumber/daemon/configuration/settings.html
- PulseAudio default device behavior: https://wiki.freedesktop.org/www/Software/PulseAudio/Documentation/User/DefaultDevice/
- Vicinae extension API README: `/home/cleaver/Documents/projects/build/vicinae/src/typescript/README.md`
- Vicinae extension runtime module loading: `/home/cleaver/Documents/projects/build/vicinae/src/typescript/extension-manager/src/patch-require.ts`
- Vicinae sink-only audio abstraction: `/home/cleaver/Documents/projects/build/vicinae/src/server/src/services/audio-control/abstract-audio-control.hpp`
