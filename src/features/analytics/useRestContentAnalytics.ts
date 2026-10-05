import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { RestContentName, RestStageName } from "./events";
import { isAnalyticsEnabled, track } from "./index";
import { createRestContentTracker, restVisit } from "./restContent";

/**
 * 쉼 콘텐츠 화면에 공통 계측을 붙인다 — 열기 · 단계 · 끝까지 · 나가기(`restContent.ts`).
 * 화면은 지금 단계를 넘기고, 끝까지 갔을 때 돌려받은 `complete` 를 부른다.
 *
 * `diaryToday` 는 화면이 안다 — 분석 모듈은 다른 기능의 저장소를 읽지 않는다.
 * 키가 없으면 열기도 앱 상태 구독도 하지 않는다(`useSensePondAnalytics` 와 같은 판단).
 */
export function useRestContentAnalytics(
  content: RestContentName,
  stage: RestStageName | null,
  diaryToday: boolean,
) {
  // 화면이 떠 있는 동안 하나다 — 렌더마다 새로 만들면 시계가 처음부터 다시 간다
  const [tracker] = useState(() => createRestContentTracker(track, content));
  const left = useRef(false);
  // 연 것은 한 번이다 — StrictMode 가 효과를 두 번 붙여도 다시 보내지 않는다
  const opened = useRef(false);
  // 들어온 순간의 값으로 한 번만 연다 — 머무는 동안 일기 목록이 바뀌어도 다시 보내지 않는다
  const [openedWith] = useState(() => ({ entry: restVisit.entry(), diaryToday }));

  useEffect(() => {
    if (stage != null) tracker.stage(stage);
  }, [tracker, stage]);

  useEffect(() => {
    if (!isAnalyticsEnabled) return;
    left.current = false;
    if (!opened.current) {
      opened.current = true;
      tracker.open(openedWith.entry, openedWith.diaryToday);
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tracker.resume();
      else tracker.pause();
    });
    return () => {
      subscription.remove();
      // StrictMode 의 setup-cleanup-setup 은 떠난 것이 아니다 — 다시 붙으면 보내지 않는다
      left.current = true;
      void Promise.resolve().then(() => {
        if (left.current) tracker.leave();
      });
    };
  }, [tracker, openedWith]);

  return tracker;
}
