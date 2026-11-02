/**
 * 셸과 말하는 자리 — `ExpoRoot` 의 `wrapper` 로 들어가 라우터 **안쪽**에서 돈다
 * (`app/_layout.tsx` 를 고치지 않고 `usePathname` 을 쓰려고).
 *
 * - 처음 그려지면 `lab:ready`(그때 경로를 싣는다), 그 뒤 경로가 바뀔 때마다 `lab:route`.
 * - 셸이 보내는 `lab:navigate`·`lab:reload`·`lab:resetData` 를 받는다.
 */
import { DefaultTheme, ThemeProvider, router, usePathname } from "expo-router";
import { useEffect, useRef, type PropsWithChildren } from "react";

import { PreviewFontScaleContext } from "@/components/ds/Text";
import { useDay } from "@/features/home/model/day";

import { resetFakeData } from "../fake-server";
import type { LabFrameConfig } from "../lab-contract";

import { retargetScheduleEdit } from "./liveTarget";
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
      navigate: (requested, mode) => {
        const next = retargetScheduleEdit(requested, useDay.getState().schedules);
        if (next == null) return; // 오늘 일정이 없다 — 열어도 바로 닫히므로 홈에 머문다
        if (mode === "push") router.push(next as never);
        else router.replace(next as never);
      },
      reload: () => window.location.reload(),
      resetData: () => resetFrame(config),
    });
  }, []);

  // 글씨 배율 모의 — 앱이 Lab 용으로 열어 둔 `PreviewFontScaleContext` 를 쓴다(1 이면 끼우지 않는다)
  const textScale = getFrameConfig()?.textScale;
  const content =
    typeof textScale !== "number" || textScale === 1 ? (
      children
    ) : (
      <PreviewFontScaleContext.Provider value={textScale}>
        {children}
      </PreviewFontScaleContext.Provider>
    );
  // 웹 스택은 중첩 스택 화면의 바탕을 테마 배경(#F2F2F2)으로 칠해서 홈 위 투명 시트(`app/home/*`)
  // 뒤의 홈을 가린다. 네이티브에는 없는 차이라 프레임에서만 테마 배경을 투명으로 둔다 —
  // 화면은 저마다 제 바탕을 그린다
  return <ThemeProvider value={LAB_NAV_THEME}>{content}</ThemeProvider>;
}

const LAB_NAV_THEME = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: "transparent" },
};
