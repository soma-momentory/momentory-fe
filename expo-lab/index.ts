import "@expo/metro-runtime";
import { registerRootComponent } from "expo";

import { resolveLaunchFromWindow } from "./src/frame/launch";

/**
 * 한 번들이 두 얼굴을 갖는다.
 * - **셸**(브라우저 최상위 창) — Lab 도구(`src/App.tsx`).
 * - **프레임**(iframe 안 · 또는 `?labFrame=1`) — 실제 앱 한 벌(`src/frame/bootstrap.ts`).
 *
 * 둘 다 `require` 로 그 자리에서 부른다 — 맨 위에서 import 하면 고르지 않은 쪽의 모듈까지
 * 평가된다(프레임은 앱 모듈이 부트스트랩보다 먼저 평가되면 안 된다).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const launch = resolveLaunchFromWindow();

if (launch.mode === "frame") {
  const { startFrame } = require("./src/frame/bootstrap") as typeof import("./src/frame/bootstrap");
  startFrame(launch.config);
} else {
  const { App } = require("./src/App") as typeof import("./src/App");
  const { installShellWebStyle } =
    require("./src/shell/shellStyle") as typeof import("./src/shell/shellStyle");
  installShellWebStyle();
  registerRootComponent(App);
}
