import { useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/features/auth/model/auth";
import { flushAnalytics, isAnalyticsEnabled, track } from "./index";
import { createForegroundObserver, createScreenObserver } from "./observation";

let opened = false;

/** Provider에서 하나만 설치한다. 키 미설정일 때는 라우터 구독도 만들지 않는다. */
export function AnalyticsObserver() {
  return isAnalyticsEnabled ? <ActiveObserver /> : null;
}

function ActiveObserver() {
  const segments = useSegments();
  const auth = useAuth((s) => s.status);
  const observe = useRef(createScreenObserver(track));
  const route = segments.join("/");

  useEffect(() => {
    if (!opened) {
      opened = true;
      track("app_opened", {});
    }
    const foreground = createForegroundObserver(() => track("app_foregrounded", {}));
    foreground(AppState.currentState);
    const subscription = AppState.addEventListener("change", (state) => {
      foreground(state);
      if (state === "background") flushAnalytics();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // 가드가 보호 화면 대신 스플래시/로그인을 렌더하는 동안은 조회가 아니다.
    if (auth === "hydrating") return;
    if (auth === "anonymous" && route !== "(auth)/login") return;
    observe.current(route);
  }, [route, auth]);
  return null;
}
