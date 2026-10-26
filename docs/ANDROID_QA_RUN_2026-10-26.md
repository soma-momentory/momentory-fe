# Android emulator QA run — 2026-10-26

Integration status: **DONE for the Android emulator Design Lab workflow**. The existing Expo Design Lab's shared production home view rendered and accepted touch input on Android. A real isolated Workspace Codex task passed its verifier and is awaiting owner approval. This run does not validate a physical Android phone, a signed production app, or an authenticated production home route; release readiness remains unchanged.

## Environment and source

- FE base for the approval-pending task: `workspace/structural-design-p0` at `fb4ddc5`; no merge into `main`.
- Separate short-path QA worktree: `C:\SWM\mqa26` (created from `ba34e0d`).
- Android: `Medium_Phone_API_36.0` emulator, Android 16/API 36, `emulator-5554`. No physical device was connected.
- Tool: `agent-device` 0.21.31; native development build package `com.momentory.designlab.qa`.
- No Momentory API endpoint, account, or user data was used. The Lab loaded its fixture scenarios and shared `HomeV2View`.

## Observed result

1. `expo run:android --port 8089` completed Gradle `BUILD SUCCESSFUL` and installed the APK. The Lab initially had native-module errors when its full catalog was bundled. The Android-specific Lab entry loaded the shared home preview without an error overlay.
2. `agent-device snapshot -i` showed two mock schedules, the home CTA, navigation, and the Empty/Two controls. Pressing Empty changed the tree to `오늘은 일정이 없어요`; pressing Two restored both schedule rows. Pressing the unchecked schedule checkbox changed it to checked.
3. The first implementation task `e8207bf7-11dc-46d6-a390-d97f31a55da1` changed the JSON but failed when its WSL Codex process spent too long running checks. That failed task and its QA record remain as failure evidence. A new isolated task `5e94be11-5d35-4689-90c5-550147943c73` completed normally and changed only `src/design/studioApproved.json`: one `home.hero.structure` text node with id `mobile-qa-caption` and text `오늘의 작은 순간을 남겨요`. The final JSON SHA-256 is `ff7ff76d7e02d485c8502c9aedff376dd14d35df1ee10391b4d8cd856dc2523a`.
4. Only that exact JSON was copied into the QA worktree. The Android screenshot visibly showed the new text, and the accessibility snapshot exposed `studio-block-mobile-qa-caption` with the same text. Empty/Two and checkbox interactions were repeated with this final candidate.
5. Workspace verified the implementation and created result decision `55ce39b1-2404-43fa-9929-0331af585db3`; the task remains `AWAITING_APPROVAL`. The isolated QA `HUMAN_TASK` `2fd0e4d6-8d48-4657-9262-f3cc9b2fc3c6` is `DONE` with screenshot, snapshot, log, and hash evidence. It records emulator QA and does not approve or merge code.

## Code checks and artifacts

In the short-path QA worktree, the FE and Expo Lab typechecks passed, lint passed after installing the existing `design-lab` dependencies, and a direct Jest run exited 0 with 127/127 suites and 1,666/1,666 tests passed (`fe-candidate-jest.json`). The final Workspace task independently passed its isolated typecheck, lint, and Jest checks (127/127 suites, 1,666/1,666 tests), with verified diff fingerprint `dbd2f93900a0ff2b31f6ac4da7a9f3519b5d34eb4fd803dccb85de508c86efb5`.

Evidence directory: `C:\SWM\ai-dev-workspace\data\mobile-qa-integration-20261026\artifacts`.

- Baseline: `minimal-entry-after-restart.png`, `home-baseline-snapshot.txt`, `android-logcat-baseline.txt`.
- Final candidate: `home-approved-candidate.png`, `home-approved-candidate-snapshot.txt`, `home-approved-interaction-snapshot.txt`, `android-logcat-approved-candidate.txt`.
- Build/Metro logs: sibling `android-build-ui.log`, `android-metro-approved-candidate.log`.
- Workspace QA record: sibling `qa-task-result-approved.json` and isolated `workspace.sqlite`.

## Remaining gate

The owner must review the implementation diff, Workspace checks, and emulator evidence before approving decision `55ce39b1-2404-43fa-9929-0331af585db3`. The unapproved JSON remains only in its task worktree and the separate QA copy; it was not merged into FE `main` or the structural branch. The WSL Codex process still logged Windows Git worktree path resolution warnings despite returning success; this is an operational issue for a later hardening pass. Physical Android, the production app's authenticated home route, macOS/iOS, and remote network scenarios require separate validation.
