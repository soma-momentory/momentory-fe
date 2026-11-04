/**
 * 쉼터 공통 「기분이 나아졌나요?」 · 이용 기록 — 문안과 규칙 (2026-10-08).
 *
 * 쉼터를 마칠 때 기분을 하나 고른다 — **건너뛰기가 없다**(하나를 골라야 끝맺음이 이어진다).
 * 고른 답은 「어떤 쉼터 · 언제 · 끝까지 했는지」와 함께 서버에 남고, 각 쉼터 오른쪽 위 원에서
 * 그 쉼터의 기록으로 다시 본다. 쉼터 안에서 쓴 글(걱정 원문 등)은 남기지 않는다.
 *
 * 말투: 평가하지 않는다 — 기분은 답일 뿐 점수가 아니고, 중간에 나간 것도 「잠깐 들렀어요」다.
 */
export type RestRecordContent =
  "sense_pond" | "worry_box" | "treasure_box" | "body_release" | "meditation";
export type RestMood = "better" | "same" | "unsure";

export const REST_MOOD_QUESTION = "기분이 나아졌나요?";

export const REST_MOODS: readonly { id: RestMood; label: string }[] = [
  { id: "better", label: "나아졌어요" },
  { id: "same", label: "그대로예요" },
  { id: "unsure", label: "잘 모르겠어요" },
];

export const restMoodLabel = (mood: RestMood) => REST_MOODS.find((m) => m.id === mood)!.label;

/** 끝까지 하지 않은 기록의 한 줄 — 「중간에 그만뒀어요」처럼 읽히지 않게 */
export const REST_RECORD_INCOMPLETE = "잠깐 들렀어요";

export const REST_RECORDS_LINK = "지난 기록 보기";
export const REST_RECORDS_EMPTY = "아직 남은 기록이 없어요";

export const REST_RECORD_TITLES: Record<RestRecordContent, string> = {
  sense_pond: "감각연못 기록",
  worry_box: "걱정상자 기록",
  treasure_box: "보물함 기록",
  body_release: "몸에 힘 빼기 기록",
  meditation: "3분 명상 기록",
};

export const isRestRecordContent = (v: unknown): v is RestRecordContent =>
  typeof v === "string" && v in REST_RECORD_TITLES;

/** 기록(최신순) → 하루 묶음(최신 날 먼저 · 묶음 안도 최신순) */
export const groupRecordsByDay = <T extends { date: string }>(all: readonly T[]) => {
  const days = new Map<string, T[]>();
  for (const r of all) days.set(r.date, [...(days.get(r.date) ?? []), r]);
  return [...days.entries()].map(([date, records]) => ({ date, records }));
};
