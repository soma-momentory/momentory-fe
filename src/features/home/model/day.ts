import { create } from "zustand";

import {
  SAMPLE_MOMENTS,
  SAMPLE_SCHEDULES,
  type Moment,
  type Schedule,
} from "@/mocks/sample";

/**
 * 오늘 하루 — 일정과 순간.
 *
 * **서버를 모른다.** BE 는 마지막에 붙이므로 지금은 샘플 데이터(스키마의
 * `meta.sampleData`)로 시작한다. 다만 **모양은 스키마 그대로**여서, 서버가
 * 붙을 때 이 store 안쪽만 TanStack Query 로 갈아끼우면 화면은 그대로다 —
 * 화면이 `useState` 로 데이터를 직접 들면 그때 컴포넌트를 다시 쓰게 된다.
 *
 * ## 여기서 지키는 규칙
 *
 * - **되돌릴 수 있게 만든다**(`RULES.md`) — 마침은 **토글**이고 확인 모달이 없다.
 *   그래서 `toggleDone` 하나뿐이고 `markDone`/`undo` 로 나누지 않았다.
 * - **가져온 일정은 읽기 전용** — 제목 수정 없음, 삭제 대신 `hidden`.
 *   수정·삭제는 `source === "manual"` 에만(`12-c` 에서 화면이 된다).
 * - **`hidden` 은 목록에서만 감춘다** — 캘린더 원본을 지우지 않는다.
 *   그래서 배열에서 빼지 않고 플래그만 켠다.
 */
type DayStore = {
  schedules: Schedule[];
  moments: Moment[];
  /** 체크 원 — 즉시 마침/취소. 확인을 묻지 않는다 */
  toggleDone: (id: string) => void;
  /** `12-c` 「홈에서 숨기기」 — 캘린더 원본은 그대로다 */
  hide: (id: string) => void;
};

export const useDay = create<DayStore>((set) => ({
  schedules: SAMPLE_SCHEDULES,
  moments: SAMPLE_MOMENTS,

  toggleDone: (id) =>
    set((s) => ({
      schedules: s.schedules.map((x) =>
        x.id === id
          ? { ...x, done: !x.done, doneAt: x.done ? null : new Date().toISOString() }
          : x,
      ),
    })),

  hide: (id) =>
    set((s) => ({
      schedules: s.schedules.map((x) => (x.id === id ? { ...x, hidden: true } : x)),
    })),
}));

/** 목록에 보이는 일정 — 숨긴 것은 빼고 센다 */
export const visibleSchedules = (schedules: readonly Schedule[]) =>
  schedules.filter((s) => !s.hidden);

/**
 * 「2/4 마침」. **진행률·배지가 아니라 사실**이다(`12.md`) — 퍼센트로 바꾸거나
 * 막대를 그리지 않는다.
 */
export const doneCountLabel = (schedules: readonly Schedule[]) => {
  const shown = visibleSchedules(schedules);
  return `${shown.filter((s) => s.done).length}/${shown.length} 마침`;
};
