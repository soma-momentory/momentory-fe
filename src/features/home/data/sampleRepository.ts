/**
 * 오늘 하루의 데이터 공급 — **store 와 mock 사이의 경계다.**
 *
 * **일정은 여기를 떠났다**(2026-08-11) — `data/scheduleApi.ts` 가 서버에서
 * 받아온다. 남은 둘은 서버로 가지 않는다:
 *
 * - **순간**(`12-d`) — **올리지 않기로 했다**(2026-08-11 제품 결정 ·
 *   `TASKS.md` 「순간은 기기에 남는다」). 계약의 `/api/v1/memos/{date}` 는
 *   쓰지 않는다. 지금은 MMKV 전이라 앱을 껐다 켜면 사라진다
 * - **날씨** — 계약에 아예 없다
 */
import type { Moment, Weather } from "@/features/home/model/types";
import { SAMPLE_MOMENTS, SAMPLE_WEATHER } from "@/mocks/sample";

/** 오늘의 순간 — 복사해서 준다. store 의 수정이 샘플 정본을 더럽히지 않게 */
export const initialMoments = (): Moment[] => SAMPLE_MOMENTS.map((m) => ({ ...m }));

/** 오늘 날씨 — 「맑음 · 27℃」 한 줄 */
export const todayWeather = (): Weather => SAMPLE_WEATHER;
