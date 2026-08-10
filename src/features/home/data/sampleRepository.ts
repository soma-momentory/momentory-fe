/**
 * 오늘 하루의 데이터 공급 — **store 와 mock 사이의 경계다.**
 *
 * **일정은 여기를 떠났다**(2026-08-11) — `data/scheduleApi.ts` 가 서버에서
 * 받아온다. 남은 둘은 아직 서버에 자리가 없다:
 *
 * - **순간**(`12-d`) — `/api/v1/memos/{date}` 는 **하루에 하나**뿐인데 스키마
 *   `Moment` 는 여러 개이고 `createdAt` 을 가진다. 모양이 정리되면 옮긴다
 * - **날씨** — 계약에 아예 없다
 */
import type { Moment, Weather } from "@/features/home/model/types";
import { SAMPLE_MOMENTS, SAMPLE_WEATHER } from "@/mocks/sample";

/** 오늘의 순간 — 복사해서 준다. store 의 수정이 샘플 정본을 더럽히지 않게 */
export const initialMoments = (): Moment[] => SAMPLE_MOMENTS.map((m) => ({ ...m }));

/** 오늘 날씨 — 「맑음 · 27℃」 한 줄 */
export const todayWeather = (): Weather => SAMPLE_WEATHER;
