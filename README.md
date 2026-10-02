# Audio Switcher

A local Vicinae extension for selecting audio inputs and outputs and managing audio presets.

## Using it

- Open **Audio Devices** to see connected inputs, outputs, profiles, and defaults.
- Set an input or output directly, or use **Create Preset** to choose connected endpoints without changing the current defaults.
- Use **Save Current Setup as Preset** to capture the current input, output, and their active profiles.
- Select a saved preset and choose **Apply Preset**. The extension activates saved profiles first, waits for their endpoints, then changes system defaults. Existing app streams stay on their current routes.
- Choose **Restore Previous Setup** to manually return to the defaults and profiles from just before the most recent preset application.

New devices appear when **Audio Devices** is opened again. To save a profile whose endpoints are currently hidden (such as Bluetooth hands-free), open that device's profile picker and activate the profile first. The device list refreshes, so you can then create or save a preset with its new endpoints. Applying the saved preset can activate that profile itself.

Saved presets remain in Vicinae storage when a device disconnects. The preset is marked unavailable until the device and required profile return.

## Development

```sh
npm install
npm test
npm run build
npm run dev
```
