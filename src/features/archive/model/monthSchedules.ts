import { create } from "zustand";

import { fetchSchedulesInPeriod } from "@/features/home/data/scheduleApi";
import type { Schedule } from "@/features/home/model/types";

/**
 * 보관함이 보는 **한 달치 일정** — 서버가 정본이다(`GET /schedules/period`).
 *
 * ## 왜 홈(`useDay`)과 따로 두나
 *
 * `useDay` 는 **오늘 하루**다(`home/model/day.ts`) — `visibleSchedules`·
 * `MAX_VISIBLE_SCHEDULES`·홈 목록이 전부 「오늘」을 전제한다. 거기에 임의의 달을
 * 섞으면 그 전제가 깨진다. 보관함은 고른 **날짜**의 일정만 읽으므로 달을 통째로
 * 받아 두고 날짜로 거른다(`archive.tsx`).
 *
 * ## 홈의 완료와 어떻게 이어지나
 *
 * 완료는 **홈에서만 바꾼다**(보관함은 읽기 전용 · `DayScheduleList`). 홈이 토글하면
 * `useDay` + 서버가 함께 바뀌고, 보관함은 탭에 들어올 때마다 `loadMonth` 로 서버
 * 정본을 다시 받아 그 완료를 그대로 비춘다. 두 store 가 값을 공유하지 않아도
 * **서버를 거쳐 이어진다** — 보관함 탭은 매번 새로 마운트되므로 자동으로 새로 받는다.
 *
 * **던지지 않는다.** 실패하면 「일정이 없는 날」과 같은 얼굴로 비운다(빈 목록).
 */
type MonthSchedulesStore = {
  /** 지금 담고 있는 달(`2026-08`). 다른 달을 부르면 갈아치운다 */
  month: string | null;
  schedules: Schedule[];
  /** 서버 답으로 그리고 있는가 — 아직이면 목록이 비어 있을 뿐이다 */
  loaded: boolean;
  /** 그달 일정을 서버에서 받는다. 마지막으로 부른 달만 반영한다(빠른 달 넘김 보호) */
  loadMonth: (month: string) => Promise<void>;
  reset: () => void;
};

/** `2026-08` → 그달 1일~말일. 말일은 **다음 달 0일**로 구한다(윤달·30/31 자동) */
export function monthRange(month: string): { from: string; to: string } {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const last = new Date(y, m, 0).getDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

/**
 * 달을 빠르게 넘기면 응답이 순서를 바꿔 도착할 수 있다 — 늦게 온 옛 달이
 * 새 달을 덮지 않게 **마지막 요청 토큰**만 반영한다.
 */
let latest = 0;

export const useMonthSchedules = create<MonthSchedulesStore>((set) => ({
  month: null,
  schedules: [],
  loaded: false,
  loadMonth: async (month) => {
    const token = ++latest;
    const { from, to } = monthRange(month);
    const result = await fetchSchedulesInPeriod(from, to);
    // 더 최근 요청이 이겼으면 버린다 — 화면은 그 달을 보고 있지 않다
    if (token !== latest) return;
    set({ month, schedules: result.ok ? result.data : [], loaded: true });
  },
  reset: () => {
    latest++;
    set({ month: null, schedules: [], loaded: false });
  },
}));
