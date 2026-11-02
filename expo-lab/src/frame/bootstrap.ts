/**
 * 프레임 부트스트랩 — 실제 앱을 그리기 **전에** 이 순서대로 판을 깐다.
 *
 * ```
 * a. 플랫폼 흉내      setFrameConfig — 앱 코드의 Platform 심 · 안전 영역 심이 이 값을 읽는다
 *                    + 화면 크기(screen = 창) · 글씨 배율 · 화면 키보드(keyboard/ — 입력칸 포커스로 열린다)
 * b. 네트워크         바깥 요청 차단(Amplitude 는 200 {}) → installFakeServer → onFakeRequest 로 셸에 알림
 * c. 세션            config.signedIn 을 SecureStore 심 저장소에 반영(설정마다 한 번)
 * d. 시계            config.now 가 있으면 fixedClock
 * e. 앱              AppFrame(ExpoRoot + 루트 app/ 라우트)
 * ```
 *
 * ⚠ **이 파일은 앱 모듈 · 가짜 서버를 맨 위에서 import 하지 않는다.** ES import 는
 * 끌어올려져 a 보다 먼저 평가된다 — 예컨대 `ds/typography.ts` 는 평가되는 순간 `Platform.OS` 로
 * 글자 배율을 정하므로, a 전에 불리면 iOS 프레임도 웹 배율로 굳는다. 그래서 a 다음부터는
 * 전부 `require` 로 그 자리에서 부른다.
 */
import { registerRootComponent } from "expo";

import { encodeFrameConfig, type LabFrameConfig } from "../lab-contract";

import { postToShell } from "./messages";
import { createGuardedFetch, guardBeacon } from "./network";
import { browserStorage, setFrameConfig } from "./runtime";
import { applySessionPolicy } from "./session";
import { sessionStore } from "./storage";
import { emulateFontScale } from "./fontScale";
import { frameKeyboard } from "./keyboard";
import { installKeyboardLayer } from "./keyboard/layer";
import { emulateScreenAsWindow } from "./keyboard/screen";
import { installFrameWebStyle } from "./webStyle";

/* eslint-disable @typescript-eslint/no-require-imports -- 순서가 계약이다(머리말) */

export function startFrame(config: LabFrameConfig): void {
  // a. 플랫폼 · 기기 — 웹에만 있는 브라우저 기본 모양(포커스 테두리)도 여기서 지운다
  setFrameConfig(config);
  installFrameWebStyle();
  // 글씨 배율 — OS 배율처럼(줄 높이 계산까지). 글자 크기는 FrameBridge 의 PreviewFontScaleContext
  const { Dimensions } = require("react-native") as typeof import("react-native");
  // 폰의 화면 = 앱 창 — 웹의 screen(모니터 크기)을 창으로 돌린다(키보드 회피 계산이 읽는다).
  // 글씨 배율보다 먼저 감싼다 — 배율 심이 이 결과 위에 fontScale 을 얹는다
  emulateScreenAsWindow(Dimensions as unknown as Parameters<typeof emulateScreenAsWindow>[0]);
  emulateFontScale(
    Dimensions as unknown as Parameters<typeof emulateFontScale>[0],
    config.textScale,
  );
  // 화면 키보드 — 앱의 첫 입력칸(autoFocus)보다 먼저 듣고 있어야 한다
  if (document.body) installKeyboardLayer({ keyboard: frameKeyboard });
  else {
    document.addEventListener("DOMContentLoaded", () =>
      installKeyboardLayer({ keyboard: frameKeyboard }),
    );
  }

  // b. 네트워크 — 차단 겹이 안쪽, 가짜 서버가 그 위. 가짜 서버가 응답할 때마다 셸에 알린다
  const origin = window.location.origin;
  window.fetch = createGuardedFetch(window.fetch.bind(window), origin);
  guardBeacon(origin);
  const fakeServer = require("../fake-server") as typeof import("../fake-server");
  fakeServer.installFakeServer(config);
  fakeServer.onFakeRequest(({ frameId, method, path, status }) =>
    postToShell({ type: "lab:request", frameId, method, path, status }),
  );

  // c. 세션
  const storage = browserStorage();
  const boot = sessionStore();
  if (storage && boot) {
    applySessionPolicy(config, window.name || encodeFrameConfig(config), storage, boot);
  }

  // d. 시계
  if (config.now) {
    const clock = require("@/lib/clock") as typeof import("@/lib/clock");
    clock.setClock(clock.fixedClock(config.now));
  }

  // e. 앱
  const { AppFrame } = require("./AppFrame") as typeof import("./AppFrame");
  registerRootComponent(AppFrame);
}
