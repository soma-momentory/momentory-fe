/**
 * 프레임 부트스트랩 — 실제 앱을 그리기 **전에** 이 순서대로 판을 깐다.
 *
 * ```
 * a. 플랫폼 흉내      setFrameConfig — 앱 코드의 Platform 심 · 안전 영역 심이 이 값을 읽는다
 * b. 네트워크         바깥 요청 차단(Amplitude 는 200 {}) → installFakeServer → 요청 알림
 * c. 디자인 시안      applyDesignDraft — 토큰을 앱 모듈이 읽기 전에 덮는다
 * d. 세션            config.signedIn 을 SecureStore 심 저장소에 반영(설정마다 한 번)
 * e. 시계            config.now 가 있으면 fixedClock
 * f. 앱              AppFrame(ExpoRoot + 루트 app/ 라우트)
 * ```
 *
 * ⚠ **이 파일은 앱 모듈 · 가짜 서버 · 디자인 편집기를 맨 위에서 import 하지 않는다.** ES import 는
 * 끌어올려져 a 보다 먼저 평가된다 — 예컨대 `ds/typography.ts` 는 평가되는 순간 `Platform.OS` 로
 * 글자 배율을 정하므로, a 전에 불리면 iOS 프레임도 웹 배율로 굳는다. 그래서 a 다음부터는
 * 전부 `require` 로 그 자리에서 부른다.
 */
import { registerRootComponent } from "expo";

import { encodeFrameConfig, type LabFrameConfig } from "../lab-contract";

import { postToShell } from "./messages";
import { createGuardedFetch, createReportingFetch, guardBeacon } from "./network";
import { browserStorage, setFrameConfig } from "./runtime";
import { applySessionPolicy } from "./session";
import { sessionStore } from "./storage";

/* eslint-disable @typescript-eslint/no-require-imports -- 순서가 계약이다(머리말) */

export function startFrame(config: LabFrameConfig): void {
  // a. 플랫폼 · 기기
  setFrameConfig(config);

  // b. 네트워크 — 차단 겹이 가장 안쪽, 가짜 서버가 그 위, 알림 겹이 가장 바깥
  const origin = window.location.origin;
  window.fetch = createGuardedFetch(window.fetch.bind(window), origin);
  guardBeacon(origin);
  const fakeServer = require("../fake-server") as typeof import("../fake-server");
  fakeServer.installFakeServer(config);
  window.fetch = createReportingFetch(window.fetch, (request) =>
    postToShell({ type: "lab:request", frameId: config.frameId, ...request }),
  );

  // c. 디자인 시안
  const draft =
    require("../design-editor/applyDraft") as typeof import("../design-editor/applyDraft");
  draft.applyDesignDraft(config);

  // d. 세션
  const storage = browserStorage();
  const boot = sessionStore();
  if (storage && boot) {
    applySessionPolicy(config, window.name || encodeFrameConfig(config), storage, boot);
  }

  // e. 시계
  if (config.now) {
    const clock = require("@/lib/clock") as typeof import("@/lib/clock");
    clock.setClock(clock.fixedClock(config.now));
  }

  // f. 앱
  const { AppFrame } = require("./AppFrame") as typeof import("./AppFrame");
  registerRootComponent(AppFrame);
}
