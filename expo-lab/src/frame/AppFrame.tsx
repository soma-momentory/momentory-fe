/**
 * 프레임의 뿌리 — 루트 `app/` 의 expo-router 라우트 전부를 **그대로** 그린다.
 *
 * `expo-router/entry` 가 하는 일(`build/qualified-entry.js`)을 옮겨 적은 것이다. 다른 점 둘:
 * - 라우트를 모으는 `require.context` 가 이 파일에 있다 — 앱 뿌리가 `expo-lab/app` 이 아니라
 *   저장소 루트 `app/` 이다. 정규식은 `expo-router/_ctx.web.js` 와 같고, 테스트 파일
 *   (`__tests__/` · `*.test.*`)을 더 뺀다. 빼지 않으면 테스트가 라우트로 잡힌다.
 * - `wrapper` 로 `FrameBridge` 를 끼운다 — 셸에 경로를 알리고 셸의 명령을 받는다.
 *
 * ⚠ 이 모듈은 부트스트랩이 **다 끝난 뒤에** 불려야 한다(`bootstrap.ts`) — 불리는 순간 앱 모듈이
 * 평가되고, 그중 일부(`ds/typography.ts` 등)는 그때 `Platform.OS` 를 읽는다.
 */
/// <reference types="expo/types/metro-require" />
import { ExpoRoot } from "expo-router";
import Head from "expo-router/head";

import { FrameBridge } from "./FrameBridge";

const appContext = require.context(
  "../../../app",
  true,
  /^(?:\.\/)(?!(?:(?:(?:.*\+api)|(?:\+middleware)|(?:\+(html|native-intent))))\.[tj]sx?$)(?!(?:.*\/)?__tests__\/)(?!.*\.test\.[tj]sx?$).*(?:\.android|\.ios|\.native)?\.[tj]sx?$/,
);

export function AppFrame() {
  return (
    <Head.Provider>
      <ExpoRoot context={appContext} wrapper={FrameBridge} />
    </Head.Provider>
  );
}
