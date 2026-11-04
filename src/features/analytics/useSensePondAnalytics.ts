import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { isAnalyticsEnabled, track } from "./index";
import { createSensePondTracker, type SensePondStepName } from "./sensePond";

/**
 * 감각연못 화면에 계측을 붙인다. 화면은 돌려받은 `find`·`holdCancel` 만 부른다.
 *
 * 시작 화면에서는 `step` 을 비워 둔다 — 놀이를 시작한 뒤의 일만 잰다.
 * 키가 없으면 앱 상태 구독도 만들지 않는다(`AnalyticsObserver` 와 같은 판단).
 */
export function useSensePondAnalytics(step: SensePondStepName | null) {
  // 화면이 떠 있는 동안 하나다 — 렌더마다 새로 만들면 시계가 처음부터 다시 간다
  const [pond] = useState(() => createSensePondTracker(track, Date.now));
  const left = useRef(false);

  useEffect(() => {
    if (step != null) pond.show(step);
  }, [pond, step]);

  useEffect(() => {
    if (!isAnalyticsEnabled) return;
    left.current = false;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") pond.resume();
      else pond.pause();
    });
    return () => {
      subscription.remove();
      // StrictMode 의 setup-cleanup-setup 은 떠난 것이 아니다 — 다시 붙으면 보내지 않는다
      left.current = true;
      void Promise.resolve().then(() => {
        if (left.current) pond.leave();
      });
    };
  }, [pond]);

  return pond;
}
