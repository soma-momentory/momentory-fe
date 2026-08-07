/**
 * 오늘 하루의 데이터 공급 — **store 와 mock 사이의 경계다.**
 *
 * 서버가 붙으면 이 파일 안쪽만 API 호출(TanStack Query)로 갈리고, store 와
 * 화면은 그대로다(`CLAUDE.md` 「BE 는 마지막에 붙인다」).
 */
import type { Moment, Schedule, Weather } from "@/features/home/model/types";
import { SAMPLE_MOMENTS, SAMPLE_SCHEDULES, SAMPLE_WEATHER } from "@/mocks/sample";

/** 오늘의 일정 — 복사해서 준다. store 의 수정이 샘플 정본을 더럽히지 않게 */
export const initialSchedules = (): Schedule[] =>
  SAMPLE_SCHEDULES.map((s) => ({ ...s, emotions: [...s.emotions] }));

/** 오늘의 순간 */
export const initialMoments = (): Moment[] => SAMPLE_MOMENTS.map((m) => ({ ...m }));

/** 오늘 날씨 — 「맑음 · 27℃」 한 줄 */
export const todayWeather = (): Weather => SAMPLE_WEATHER;
