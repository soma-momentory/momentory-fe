import { useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useAuth } from "@/features/auth/model/auth";
import { onReminderOpened } from "@/lib/notifications";
import { flushAnalytics, isAnalyticsEnabled, track } from "./index";
import { createForegroundObserver, createScreenObserver } from "./observation";
import { restVisit } from "./restContent";

let opened = false;

/** Provider에서 하나만 설치한다. 키 미설정일 때는 라우터 구독도 만들지 않는다. */
export function AnalyticsObserver() {
  return isAnalyticsEnabled ? <ActiveObserver /> : null;
}

function ActiveObserver() {
  const segments = useSegments();
  const auth = useAuth((s) => s.status);
  const observe = useRef(createScreenObserver(track, Date.now, restVisit.move));
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
      // 체류 구간을 먼저 닫는다 — 그래야 바로 아래 flush 가 그 이벤트까지 내보낸다
      observe.current.appState(state);
      if (state === "background") flushAnalytics();
    });
    // 회고 알림을 눌러 들어왔다 — 리마인더가 재방문으로 이어지는지 본다
    const stopReminder = onReminderOpened((reminder) => track("reminder_opened", { reminder }));
    return () => {
      subscription.remove();
      stopReminder();
    };
  }, []);

  useEffect(() => {
    // 가드가 보호 화면 대신 스플래시/로그인을 렌더하는 동안은 조회가 아니다.
    if (auth === "hydrating") return;
    if (auth === "anonymous" && route !== "(auth)/login") return;
    observe.current.route(route);
  }, [route, auth]);
  return null;
}
