# Android Design Lab QA with agent-device

This procedure runs the existing Expo Lab as an Android development build. Its home preview renders the shared `HomeV2View` with fixture data. It does not sign in, call a Momentory API, or validate the production app's authenticated home route.

## Prepare a separate checkout

Use a short Windows path for the QA checkout. A long path under `C:\SWM\ai-dev-workspace\data\...` failed during native C++ compilation because an object filename exceeded 260 characters. Keep the implementation task's Workspace worktree unchanged so its approval fingerprint remains valid.

On Windows, install Node 22.14+, JDK 17+, Android SDK API 36, Build Tools 36, NDK 27.1, CMake 3.22.1, ADB, and one booted emulator. Check `adb devices -l`, `emulator -list-avds`, and `adb shell getprop sys.boot_completed`. Install the tested CLI with `npm install -g agent-device@0.21.31`, then run `agent-device --version` and `agent-device devices --platform android`. No alternate mobile automation tool is needed.

From a clean short-path FE checkout at the revision under test:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
cd expo-lab
$env:EXPO_NO_DOTENV = '1'
$env:EXPO_NO_TELEMETRY = '1'
$env:EXPO_PUBLIC_API_BASE_URL = ''
..\node_modules\.bin\expo.cmd run:android --port 8089
```

The Android app ID is `com.momentory.designlab.qa`. Its Android entry (`expo-lab/src/App.android.tsx`) uses the existing `HomeV2Preview`, approved Studio JSON, and fixture scenarios. It has a separate package ID from Momentory. Let Expo finish `BUILD SUCCESSFUL`, installation, and Metro startup. Keep Metro running. Copy the development-client launch URL printed by Expo; its host address varies by machine.

## Inspect and act

Run the following from the same checkout directory so `agent-device` retains its session. Replace the device name and launch URL with the values actually printed by device discovery and Expo.

```powershell
agent-device open com.momentory.designlab.qa --platform android --device '<device name>' --metro-port 8089 --launch-url '<Expo development-client URL>' --foreground
agent-device wait 2000
agent-device snapshot -i
```

Use the current snapshot's `@eN` references to operate the Empty/Two scenario controls and at least one schedule checkbox. In PowerShell, quote the reference, for example `agent-device press '@e1' --settle`. Refresh with `agent-device snapshot -i` after each action. If a native error overlay appears, capture it and report the error; do not treat an installed APK as a rendered-screen pass. A new Metro server may require an app relaunch before the fresh bundle appears.

Save a baseline screenshot, then copy **only the reviewed Studio JSON change** into this QA checkout. Run `agent-device metro reload --metro-port 8089` with Metro in watch mode and verify the expected home text with a new snapshot. If the JSON change is absent, stop Metro, restart it with `npx expo start --dev-client --clear --port 8089`, relaunch the app, and inspect again. Do not accept the candidate until its text is present in the shared home view's screenshot and accessibility snapshot. Save the candidate screenshot and app log:

```powershell
agent-device screenshot '<artifact-dir>\home-baseline.png'
agent-device metro reload --metro-port 8089
agent-device snapshot -i
agent-device screenshot '<artifact-dir>\home-candidate.png'
agent-device logs path
adb logcat -d -s ReactNativeJS:D AndroidRuntime:E '*:S' > '<artifact-dir>\android-logcat.txt'
agent-device close
```

If `agent-device logs path` reports `active=false`, keep the scoped `adb logcat` file as the runtime log. Keep screenshots, logs, the task ID, device/API version, FE base commit, candidate JSON hash, and command results together outside the Git checkout. `agent-device` screenshots and emulator snapshots establish **emulator** behavior, not physical Android acceptance. Run the production app's `npm run android` and its authenticated home flow separately when a safe test backend and account are available.

## Record in Workspace

Use an isolated Workspace instance and the existing owner session. Create the implementation with `POST /api/tasks` (`projectId: momentory`, `repo: fe`, `provider: codex`), track `GET /api/tasks/<id>` or `GET /api/stream`, and leave the verified change at `AWAITING_APPROVAL`. Create a separate `HUMAN_TASK` whose goal names the implementation task ID. Complete it through `POST /api/tasks/<qa-id>/control` with evidence containing the emulator verdict, screenshot/log paths and hashes. This uses the existing authenticated API and preserves the implementation approval decision. The current API does not enforce the QA task as an approval prerequisite or host its artifact files; the reviewer must inspect the evidence before approving.
