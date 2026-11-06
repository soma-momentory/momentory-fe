import { useEffect, useRef, useState } from "react";

import { addRestRecord } from "../data/restRecordApi";
import { maybeRequestStoreReview } from "../data/storeReview";
import type { RestMood, RestRecordContent } from "./restRecord";

/**
 * 쉼터 한 판의 이용 기록 — 화면을 떠날 때 **한 번** 남긴다(2026-10-08). 기분을 골랐으면
 * 「끝까지 + 마지막으로 고른 기분」을, 고르기 전에 떠나면 「중간에 나감」을 남긴다. 고를 때마다
 * 보내지 않는다 — 다시 고를 수 있어서(사용자 피드백) 마지막 답이 정본이다.
 *
 * `started` 는 화면이 안다 — 들어오자마자 뒤로 간 판은 남기지 않는다(기록이 소음이 된다).
 * 보내기는 기다리지 않는다 — 실패해도 화면은 그대로 흐른다(`RULES.md` 4).
 *
 * `send` 가 꺼져 있으면 기분은 고를 수 있지만 아무것도 보내지 않는다 — 서버가 아직 받지 않는 쉼터용
 * (주간 행복 · `WEEKLY_HAPPINESS_RECORDS_LIVE`).
 */
export function useRestRecord(content: RestRecordContent, started: boolean, send = true) {
  const [mood, setMood] = useState<RestMood | null>(null);
  const now = useRef<{ started: boolean; picked: RestMood | null; left: boolean; send: boolean }>({
    started,
    picked: null,
    left: false,
    send,
  });

  useEffect(() => {
    now.current.started = started;
    now.current.send = send;
  }, [started, send]);

  useEffect(() => {
    const s = now.current;
    s.left = false;
    return () => {
      // StrictMode 의 setup-cleanup-setup 은 떠난 것이 아니다(`useRestContentAnalytics` 와 같다)
      s.left = true;
      void Promise.resolve().then(() => {
        if (!s.left || !s.send) return;
        if (s.picked != null) void addRestRecord(content, { completed: true, mood: s.picked });
        else if (s.started) void addRestRecord(content, { completed: false });
        // 「나아졌어요」로 마치고 나온 때가 별점을 물을 자리다(`storeReview.ts`)
        if (s.picked === "better") void maybeRequestStoreReview();
      });
    };
  }, [content]);

  const pick = (next: RestMood) => {
    now.current.picked = next;
    setMood(next);
  };

  return { mood, pick };
}
