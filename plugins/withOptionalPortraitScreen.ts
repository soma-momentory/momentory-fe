import { withAndroidManifest, type AndroidConfig, type ConfigPlugin } from "expo/config-plugins";

/**
 * 세로 화면을 **필수가 아닌 기능**으로 선언한다(2026-11-19).
 *
 * 앱은 세로로 고정돼 있다(`app.config.ts` `orientation: "portrait"`). 액티비티가
 * `screenOrientation="portrait"` 를 가지면 Play 는 `android.hardware.screen.portrait` 를
 * **필수 기능으로 짐작**하고, 1.5.0(vc15) 업로드부터 「필수 하드웨어 기능 선언으로 인해 앱의
 * 사용 가능 여부가 제한됨」으로 검토 전송을 막았다(전화 · 태블릿 · Desktop · Android XR).
 * 매니페스트는 vc14 와 같았다 — Play 쪽 검사가 새로 생긴 것이다.
 *
 * 화면은 계속 세로로 그린다. 바뀌는 것은 **설치할 수 있는 기기**뿐이다 — 가로 화면만 있는
 * 기기에도 설치되고, 그런 기기에서는 세로 화면이 가운데에 놓인다.
 */

/** 필수가 아닌 것으로 선언할 기능 — 늘어나면 여기에 더한다 */
export const OPTIONAL_FEATURES = ["android.hardware.screen.portrait"];

/** 같은 이름의 선언이 있으면 `required="false"` 로 바꾸고, 없으면 더한다 */
export const markFeaturesOptional = (
  manifest: AndroidConfig.Manifest.AndroidManifest,
  names: string[] = OPTIONAL_FEATURES,
): AndroidConfig.Manifest.AndroidManifest => {
  const features = manifest.manifest["uses-feature"] ?? [];
  for (const name of names) {
    const existing = features.find((feature) => feature.$["android:name"] === name);
    if (existing) existing.$["android:required"] = "false";
    else features.push({ $: { "android:name": name, "android:required": "false" } });
  }
  manifest.manifest["uses-feature"] = features;
  return manifest;
};

const withOptionalPortraitScreen: ConfigPlugin = (config) =>
  withAndroidManifest(config, (cfg) => {
    cfg.modResults = markFeaturesOptional(cfg.modResults);
    return cfg;
  });

export default withOptionalPortraitScreen;
