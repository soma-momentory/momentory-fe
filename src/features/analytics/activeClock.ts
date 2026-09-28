import { useEffect, useState } from "react";
import { AppState } from "react-native";

/**
 * 앱이 **전면에 있던 시간만** 흐르는 시계(2026-09-28).
 *
 * 사용자가 다른 앱에 다녀오거나 화면이 잠긴 동안은 멈춘다. 체류·턴 시간이 그 시간을 품으면
 * 「오래 고민했다」와 「잠깐 자리를 비웠다」를 가를 수 없다. `sensePond.ts` 와 같은 판단이다.
 */
export function createActiveClock(now: () => number = Date.now) {
  let banked = 0;
  let since: number | null = now();
  return {
    now: () => banked + (since == null ? 0 : now() - since),
    pause() {
      if (since == null) return;
      banked += now() - since;
      since = null;
    },
    resume() {
      if (since == null) since = now();
    },
  };
}

export type ActiveClock = ReturnType<typeof createActiveClock>;

/** 화면이 떠 있는 동안 하나인 전면 시계. `active` 가 아니면 멈춘다 */
export function useActiveClock(): ActiveClock {
  const [clock] = useState(() => createActiveClock());
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") clock.resume();
      else clock.pause();
    });
    return () => subscription.remove();
  }, [clock]);
  return clock;
}
