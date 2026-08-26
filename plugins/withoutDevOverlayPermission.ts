import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { withDangerousMod, type ConfigPlugin } from "expo/config-plugins";

/**
 * 출시본에서 **`SYSTEM_ALERT_WINDOW`(다른 앱 위에 표시)** 를 걷어낸다.
 *
 * 이 권한을 넣는 것은 `expo-dev-client` 다 — 개발자 메뉴를 앱 위에 띄우려고
 * prebuild 가 `src/main/AndroidManifest.xml` 에 적는다. **출시본에는 개발자 메뉴가
 * 없으므로 쓸 일이 없는데**, 사용자에게는 「다른 앱 위에 표시」로 보이고 Play 도
 * 민감 권한으로 취급한다. 회고 앱이 화면을 덮을 이유를 설명할 길이 없다.
 *
 * ## debug 는 그대로 둔다
 *
 * 지우는 자리를 **`src/release/` 로 좁힌 것이 핵심**이다. main 에서 지우면 개발
 * 빌드의 개발자 메뉴가 함께 죽는다 — `withInsecureDevApi` 가 network security
 * config 를 빌드 타입별로 나눠 둔 것과 같은 이유이고, 같은 방법이다.
 * Gradle 은 `src/<buildType>/AndroidManifest.xml` 을 `src/main` 것과 병합한다.
 *
 * ## 왜 파일을 지우지 않고 `tools:node="remove"` 인가
 *
 * 매니페스트 병합은 **라이브러리 AAR 의 매니페스트까지** 합친다. main 에서 한 줄을
 * 지워도 어떤 라이브러리가 같은 권한을 선언하면 도로 들어온다 — `remove` 표식은
 * 병합 **결과**에서 빼므로 출처가 어디든 걸린다.
 *
 * ⚠ **`WRITE_CALENDAR` 는 같은 방법으로 빼면 안 된다.** `expo-calendar` 가
 * `READ_CALENDAR` 와 한 쌍으로 묻고 확인해서(`CalendarNextModule.kt`
 * `requestCalendarPermissions`), 매니페스트에서 빠지면 Android 가 묻지도 않고
 * 거부로 답한다 — `09` 캘린더 연결이 영원히 거부로 닫힌다. 앱이 실제로 쓰기를
 * 하지 않는다는 사실은 `src/lib/calendar.ts` 가 지키고, 권한 목록은 라이브러리 제약이다.
 */

/** release 소스셋의 매니페스트 자리 — main 것과 병합된다 */
export const releaseManifestPath = join("app", "src", "release", "AndroidManifest.xml");

/** 지울 권한 — 늘어나면 여기에 더한다 */
export const REMOVED_IN_RELEASE = ["android.permission.SYSTEM_ALERT_WINDOW"];

export const releaseManifestXml = (permissions: string[]) => `<?xml version="1.0" encoding="utf-8"?>
<!--
  생성물 — plugins/withoutDevOverlayPermission.ts 가 쓴다. 직접 고치지 않는다.
  release 빌드에서만 개발용 권한을 병합 결과에서 뺀다 (debug 는 그대로 둔다).
-->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools">
${permissions.map((name) => `    <uses-permission android:name="${name}" tools:node="remove" />`).join("\n")}
</manifest>
`;

const withoutDevOverlayPermission: ConfigPlugin = (config) =>
  withDangerousMod(config, [
    "android",
    (cfg) => {
      const target = join(cfg.modRequest.platformProjectRoot, releaseManifestPath);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, releaseManifestXml(REMOVED_IN_RELEASE), "utf8");
      return cfg;
    },
  ]);

export default withoutDevOverlayPermission;
