/**
 * 프레임 문서 하나에 키보드는 **하나**다 — 앱 코드의 `Keyboard` 심 · `KeyboardAvoidingView` 심 ·
 * 키보드 그림(`layer.ts`)이 모두 이 인스턴스를 본다. 판(플랫폼 · 기기 · 창 크기)은 열 때마다
 * 프레임 설정(`runtime.ts`)과 창에서 새로 읽는다. 셸이면 판이 없어 열리지 않는다.
 */
import { findDevice } from "../../lab-devices";
import { getFrameConfig } from "../runtime";

import { createKeyboardController, type KeyboardEnv } from "./controller";
import { keyboardSpecFor } from "./heights";

export function currentKeyboardEnv(): KeyboardEnv | null {
  const config = getFrameConfig();
  if (config == null || typeof window === "undefined") return null;
  const device = findDevice(config.deviceId);
  return {
    platform: config.platform,
    spec: keyboardSpecFor(device),
    screenWidth: window.innerWidth || device.width,
    screenHeight: window.innerHeight || device.height,
  };
}

export const frameKeyboard = createKeyboardController(currentKeyboardEnv);

export type {
  KeyboardEnv,
  KeyboardEventName,
  KeyboardMetrics,
  KeyboardVisualState,
  LabKeyboardEvent,
} from "./controller";
