/**
 * 쉼 추천을 **기기에** 기억한다 (2026-10-12) — 오늘 이미 매듭지었는지와, 연달아 닫은 횟수 둘뿐이다.
 *
 * 하루 한 번만 묻고(`day`), 세 번 연달아 닫은 사람에게는 시트를 그만 띄운다(`dismissStreak`).
 * 서버에 두지 않는 것은 이 둘이 「얼마나 권할까」를 정하는 기기 쪽 사정일 뿐이라서다 — 앱을 다시
 * 깔면 처음부터 다시 묻는 정도는 괜찮다.
 *
 * ⚠ **위기 안내가 나온 날도 닫은 날과 같은 모양으로 남긴다**(`skipped` — 날만 적고 횟수는 그대로).
 * 저장된 값을 들여다봐도 그날 위기 안내가 있었는지 알 수 없게.
 *
 * 기기 저장소는 `deviceStorage.ts` 를 지난다(쓸 때 불러온다). **던지지 않는다.**
 */
import { storage } from "./deviceStorage";

const KEY = "momentory.rest-recommendation";

export type RecommendationMemory = {
  /** 마지막으로 추천을 매듭지은 날(04:00 경계) — 없으면 한 번도 없었다 */
  day: string | null;
  /** 연달아 닫은 횟수 — 한 번 해 보면 0 으로 돌아간다 */
  dismissStreak: number;
};

export type RecommendationOutcome = "accepted" | "dismissed" | "skipped";

const EMPTY: RecommendationMemory = { day: null, dismissStreak: 0 };

/** 못 읽으면 `null` — 부르는 쪽은 그때 **띄우지 않는다**(권하지 않는 쪽이 먼저다) */
export async function readRecommendationMemory(): Promise<RecommendationMemory | null> {
  try {
    const raw = await storage().getItem(KEY);
    if (raw == null) return EMPTY;
    const v: unknown = JSON.parse(raw);
    if (typeof v !== "object" || v == null) return EMPTY;
    const { day, dismissStreak } = v as Record<string, unknown>;
    return {
      day: typeof day === "string" ? day : null,
      dismissStreak: typeof dismissStreak === "number" && dismissStreak > 0 ? dismissStreak : 0,
    };
  } catch {
    return null;
  }
}

/** 오늘 추천을 매듭지은 다음 상태 — 해 봤으면 0, 닫았으면 하나 더, 건너뛰었으면 그대로 */
export const settledMemory = (
  memory: RecommendationMemory,
  day: string,
  outcome: RecommendationOutcome,
): RecommendationMemory => ({
  day,
  dismissStreak:
    outcome === "accepted"
      ? 0
      : outcome === "dismissed"
        ? memory.dismissStreak + 1
        : memory.dismissStreak,
});

export async function writeRecommendationMemory(memory: RecommendationMemory): Promise<void> {
  try {
    await storage().setItem(KEY, JSON.stringify(memory));
  } catch {
    // 못 남기면 다음에 한 번 더 묻는 것뿐이다
  }
}

/** 화면 밖에서 오늘을 매듭짓는다 — 위기 안내가 뜬 대화(`retro/talk`)가 쓴다 */
export async function settleRecommendation(
  day: string,
  outcome: RecommendationOutcome,
): Promise<void> {
  const memory = (await readRecommendationMemory()) ?? EMPTY;
  await writeRecommendationMemory(settledMemory(memory, day, outcome));
}

/** 로그아웃 · 탈퇴 때 지운다 — 다음 사람이 앞 사람의 「연달아 닫은 횟수」를 물려받지 않게(`auth.ts`) */
export async function clearRecommendationMemory(): Promise<void> {
  try {
    await storage().removeItem(KEY);
  } catch {
    // 못 지워도 담긴 것은 날짜와 횟수뿐이다 — 다음 사람에게 시트가 하루 덜 뜨는 정도다
  }
}
