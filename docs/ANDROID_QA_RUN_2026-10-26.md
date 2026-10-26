# Android emulator QA run — 2026-10-26

Status: **PARTIAL**. The existing Expo Design Lab's shared production home view rendered and accepted touch input on Android. The isolated Workspace Codex task did not reach its approval gate because the WSL provider failed. This run does not validate a physical Android phone, a signed production app, or an authenticated production home flow.

## Environment and source

- FE base: `workspace/structural-design-p0` at `ba34e0d`; no merge into `main`.
- Separate short-path QA worktree: `C:\SWM\mqa26` (created from `ba34e0d`).
- Android: `Medium_Phone_API_36.0` emulator, Android 16/API 36, `emulator-5554`. No physical device was connected.
- Tool: `agent-device` 0.21.31; native development build package `com.momentory.designlab.qa`.
- No Momentory API endpoint, account, or user data was used. The Lab loaded its fixture scenarios and shared `HomeV2View`.

## Observed result

1. `expo run:android --port 8089` completed Gradle `BUILD SUCCESSFUL` and installed the APK. The Lab initially had native-module errors when its full catalog was bundled. The Android-specific Lab entry loaded the shared home preview without an error overlay.
2. `agent-device snapshot -i` showed two mock schedules, the home CTA, navigation, and the Empty/Two controls. Pressing Empty changed the tree to `오늘은 일정이 없어요`; pressing Two restored both schedule rows. Pressing the unchecked schedule checkbox changed it to checked.
3. Workspace implementation task `e8207bf7-11dc-46d6-a390-d97f31a55da1` changed only `src/design/studioApproved.json`: one `home.hero.structure` text node with id `mobile-qa-caption` and text `오늘의 작은 순간을 남겨요`. The JSON SHA-256 is `5fccc046d10ae389fc9a51aac60d7a5e026643a4cc9c604547c390fb2a885d26`.
4. Only that reviewed JSON was copied into the QA worktree. After a clean Metro restart, the Android screenshot visibly showed the new text, and the accessibility snapshot exposed `studio-block-mobile-qa-caption` with the same text.
5. The isolated Workspace QA `HUMAN_TASK` `9e348fb8-f885-4a98-8371-20e48b753899` is `DONE` with screenshot, snapshot, log, and hash evidence. It is a record of emulator QA, not a code approval. The implementation task is `FAILED`; no result decision or approval request was generated.

## Code checks and artifacts

In the short-path QA worktree, the FE and Expo Lab typechecks passed, lint passed after installing the existing `design-lab` dependencies, and a direct Jest run exited 0 with 127/127 suites and 1,666/1,666 tests passed (`fe-candidate-jest.json`). The Workspace provider separately failed its WSL process, so the Workspace verification gate remains unsatisfied.

Evidence directory: `C:\SWM\ai-dev-workspace\data\mobile-qa-integration-20261026\artifacts`.

- Baseline: `minimal-entry-after-restart.png`, `home-baseline-snapshot.txt`, `android-logcat-baseline.txt`.
- Candidate: `home-candidate-verified.png`, `home-candidate-snapshot.txt`, `android-logcat-candidate.txt`.
- Build/Metro logs: sibling `android-build-ui.log`, `android-metro-candidate.log`.
- Workspace QA record: sibling `qa-task-result.json` and isolated `workspace.sqlite`.

## Remaining gate

Investigate the WSL Codex provider's Windows Git worktree path resolution and interrupted provider checks. Re-run the implementation through the existing isolated Workspace route; require its normal verifier and `AWAITING_APPROVAL` decision before any source integration. The unapproved JSON remains only in its task worktree and the separate QA copy. Physical Android and production-app authenticated flows require their own later validation.
