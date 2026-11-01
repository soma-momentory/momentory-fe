/**
 * 셸과 말하는 자리 — `ExpoRoot` 의 `wrapper` 로 들어가 라우터 **안쪽**에서 돈다
 * (`app/_layout.tsx` 를 고치지 않고 `usePathname` 을 쓰려고).
 *
 * - 처음 그려지면 `lab:ready`(그때 경로를 싣는다), 그 뒤 경로가 바뀔 때마다 `lab:route`.
 * - 셸이 보내는 `lab:navigate`·`lab:reload`·`lab:resetData` 를 받는다.
 */
import { router, usePathname } from "expo-router";
import { useEffect, useRef, type PropsWithChildren } from "react";

import { resetFakeData } from "../fake-server";
import type { LabFrameConfig } from "../lab-contract";

import { listenToShell, postToShell } from "./messages";
import { getFrameConfig } from "./runtime";
import { forgetFrameState } from "./storage";

export function resetFrame(config: LabFrameConfig): void {
  resetFakeData(config);
  forgetFrameState(config);
  window.location.reload();
}

export function FrameBridge({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const announced = useRef<string | null>(null);

  useEffect(() => {
    const config = getFrameConfig();
    if (config == null || announced.current === pathname) return;
    const first = announced.current == null;
    announced.current = pathname;
    postToShell({ type: first ? "lab:ready" : "lab:route", frameId: config.frameId, pathname });
  }, [pathname]);

  useEffect(() => {
    const config = getFrameConfig();
    if (config == null) return;
    return listenToShell({
      navigate: (next) => router.replace(next as never),
      reload: () => window.location.reload(),
      resetData: () => resetFrame(config),
    });
  }, []);

  return children;
}
