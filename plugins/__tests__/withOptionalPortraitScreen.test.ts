import type { AndroidConfig } from "expo/config-plugins";

import { markFeaturesOptional } from "../withOptionalPortraitScreen";

/**
 * 세로 고정 앱이 Play 에서 「세로 화면 필수」로 짐작되지 않게 하는 선언(`withOptionalPortraitScreen` 머리말).
 * 빠지면 Play 가 검토 전송을 막는다.
 */
describe("withOptionalPortraitScreen", () => {
  const manifestWith = (
    features?: AndroidConfig.Manifest.AndroidManifest["manifest"]["uses-feature"],
  ): AndroidConfig.Manifest.AndroidManifest => ({
    manifest: {
      $: { "xmlns:android": "http://schemas.android.com/apk/res/android" },
      queries: [],
      ...(features ? { "uses-feature": features } : {}),
    },
  });

  const portrait = (manifest: AndroidConfig.Manifest.AndroidManifest) =>
    manifest.manifest["uses-feature"]?.filter(
      (feature) => feature.$["android:name"] === "android.hardware.screen.portrait",
    );

  it("선언이 없으면 세로 화면을 필수 아님으로 더한다", () => {
    expect(portrait(markFeaturesOptional(manifestWith()))).toEqual([
      { $: { "android:name": "android.hardware.screen.portrait", "android:required": "false" } },
    ]);
  });

  it("이미 필수로 선언돼 있으면 하나만 남기고 필수 아님으로 바꾼다", () => {
    const manifest = manifestWith([
      { $: { "android:name": "android.hardware.screen.portrait", "android:required": "true" } },
    ]);
    expect(portrait(markFeaturesOptional(manifest))).toEqual([
      { $: { "android:name": "android.hardware.screen.portrait", "android:required": "false" } },
    ]);
  });

  it("다른 기능 선언은 그대로 둔다", () => {
    const camera = {
      $: { "android:name": "android.hardware.camera", "android:required": "true" as const },
    };
    const result = markFeaturesOptional(manifestWith([camera]));
    expect(result.manifest["uses-feature"]).toContainEqual(camera);
  });
});
