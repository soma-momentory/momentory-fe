import { useEffect, useMemo, useState } from "react";

import { track } from "@/features/analytics";
import type { RestContentName } from "@/features/analytics/events";
import { useDiary } from "@/features/diary/model/diary";
import { useProfile } from "@/features/my/model/settings";

import {
  readRecommendationMemory,
  settledMemory,
  writeRecommendationMemory,
  type RecommendationMemory,
  type RecommendationOutcome,
} from "../data/recommendMemory";
import type { RestContentId } from "./contents";
import { dayRandom, recommendRest } from "./recommend";

/** 연달아 이만큼 닫으면 시트 대신 격자 칸에 「오늘 추천」만 붙인다 — 재촉하지 않는 장치 */
export const RECOMMEND_DISMISS_LIMIT = 3;

const CONTENT_NAME: Record<RestContentId, RestContentName> = {
  sensePond: "sense_pond",
  worryBox: "worry_box",
  treasureBox: "treasure_box",
  bodyRelease: "body_release",
  meditation: "meditation",
};

/**
 * 쉼터 탭(`R1`)이 **스스로** 정하는 쉼 추천 (2026-10-12 · 사용자와 정함).
 *
 * 오늘 쓴 일기가 있고, 오늘 아직 추천을 매듭짓지 않았으면 `delayMs` 뒤에 시트를 연다. 일기를 막 마치고
 * 왔든, 바람카드를 보고 나중에 왔든, 일기를 쓴 날 따로 들어왔든 같은 규칙이다 — 일기 화면이 추천을
 * 계산해 넘기지 않는다. 일반 진입은 해 보거나 닫으면 그날은 다시 묻지 않는다.
 * 일기 완료에서 들어온 진입(`afterDiary`)은 날짜·닫은 횟수와 관계없이 매번 시트를 연다.
 *
 * 세 번 연달아 닫은 사람에게는 시트를 띄우지 않고 `hint`(격자 칸의 「오늘 추천」)만 준다. 그 칸이나
 * 시트에서 한 번 해 보면 다시 시트로 돌아간다. 위기 안내가 나온 날은 대화가 그날을 미리 매듭짓는다
 * (`retro/talk` → `settleRecommendation`).
 *
 * 기억을 못 읽으면(`null`) **띄우지 않는다** — 권하지 않는 쪽이 먼저다.
 */
export function useRestRecommendation(today: string, delayMs: number, afterDiary = false) {
  const todayDiary = useDiary((s) => s.diaries.find((d) => d.date === today) ?? null);
  const restMethods = useProfile((s) => s.restMethods);
  const [memory, setMemory] = useState<RecommendationMemory | null>(null);
  const [open, setOpen] = useState(false);
  // 무작위는 **그날로 정해진다**(`dayRandom`) — 다시 그려도 권하는 쉼이 바뀌지 않는다
  const pick = useMemo(
    () =>
      todayDiary == null ? null : recommendRest(todayDiary.emotions, restMethods, dayRandom(today)),
    [todayDiary, restMethods, today],
  );

  useEffect(() => {
    let alive = true;
    void readRecommendationMemory().then((m) => {
      if (alive) setMemory(m);
    });
    return () => {
      alive = false;
    };
  }, []);

  const resting = !afterDiary && memory != null && memory.dismissStreak >= RECOMMEND_DISMISS_LIMIT;
  // 일기 완료에서 들어온 이번 진입은 날짜·닫은 횟수와 관계없이 추천한다.
  const due = afterDiary || (memory != null && !resting && memory.day !== today);

  useEffect(() => {
    if (!due || open || pick == null) return;
    const timer = setTimeout(() => {
      track("rest_recommendation_shown", {
        content: CONTENT_NAME[pick.content],
        basis: pick.basis,
      });
      setOpen(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [due, open, pick, delayMs]);

  const settle = (outcome: RecommendationOutcome) => {
    setOpen(false);
    if (memory == null) return;
    const next = settledMemory(memory, today, outcome);
    setMemory(next);
    void writeRecommendationMemory(next);
  };

  return {
    /** 지금 열린 시트의 추천 — 없으면 시트가 닫혀 있다 */
    sheet: open ? pick : null,
    /** 세 번 연달아 닫은 뒤 격자 칸에만 붙이는 추천 */
    hint: resting && !open ? pick : null,
    accept(form: "sheet" | "hint") {
      if (pick != null) {
        track("rest_recommendation_accepted", {
          content: CONTENT_NAME[pick.content],
          basis: pick.basis,
          form,
        });
      }
      settle("accepted");
    },
    dismiss: () => settle("dismissed"),
  };
}
