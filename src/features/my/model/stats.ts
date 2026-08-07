import type { EmotionId } from "@/design/theme";
import { SAMPLE_ALL_TIME_EMOTIONS } from "@/mocks/sample";

/**
 * 마이(`M1`)가 세는 것 — **전체 기간** 기준.
 *
 * 가장 많이 기록한 감정은 **기간마다 다른 값**이다 — 전체는 여기(마이),
 * 이번 달은 보관함, 그 주는 리포트. **한 값을 세 곳에 넣지 않는다**(`RULES.md`).
 */

/** 감정별 기록 수에서 가장 많은 것 하나 */
export function topEmotionOf(counts: Partial<Record<EmotionId, number>>): EmotionId | null {
  let top: EmotionId | null = null;
  let best = 0;
  for (const [key, n] of Object.entries(counts)) {
    if ((n ?? 0) > best) {
      best = n ?? 0;
      top = Number(key) as EmotionId;
    }
  }
  return top;
}

/**
 * 전체 기간 가장 많이 기록한 감정.
 *
 * ⚠ **일정에 붙은 감정까지 센 값**이라 일기 태그만으로는 나오지 않는다 —
 * 지난 달들의 `Schedule` 을 MVP 가 들고 있지 않아 **서버가 줄 집계를 샘플로
 * 둔다.** 서버가 붙으면 이 함수 안쪽만 응답 값으로 바뀐다.
 */
export const allTimeTopEmotion = (): EmotionId | null => topEmotionOf(SAMPLE_ALL_TIME_EMOTIONS);
