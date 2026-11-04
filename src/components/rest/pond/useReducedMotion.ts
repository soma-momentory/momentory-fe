import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** 움직임 줄이기가 켜져 있나 — 켜져 있으면 숨쉬기 · 흔들림처럼 저절로 도는 것을 세우지 않는다 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((on) => {
        if (alive) setReduced(on);
      });
    return () => {
      alive = false;
    };
  }, []);
  return reduced;
}
