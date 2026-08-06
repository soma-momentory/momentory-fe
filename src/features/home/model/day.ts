import { create } from "zustand";

import type { EmotionId } from "@/design/theme";
import {
  SAMPLE_MOMENTS,
  SAMPLE_SCHEDULES,
  SAMPLE_TODAY,
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
  /** `12-c` 감정 — 다시 누르면 취소되는 토글. 마침과 서로를 요구하지 않는다 */
  toggleEmotion: (id: string, emotion: EmotionId) => void;
  /** `12-c` 「홈에서 숨기기」 — 캘린더 원본은 그대로다 */
  hide: (id: string) => void;
  /** `12-e` 직접 추가 — **제목 하나만** 받는다. `time` 은 항상 `null` */
  addSchedule: (title: string) => void;
  /** `12-d` 순간 — 한 줄이면 충분하다 */
  addMoment: (text: string) => void;
};

/**
 * 로컬 id — 서버가 붙으면 **클라이언트가 만드는 ULID** 가 이 자리에 온다
 * (`ARCHITECTURE.md §4` — 생성 요청을 멱등하게 만드는 근거). 지금은 화면만
 * 만드는 단계라 형식만 맞춘다.
 */
let seq = 0;
const nextId = (prefix: string) => `${prefix}-local-${++seq}`;

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

  toggleEmotion: (id, emotion) =>
    set((s) => ({
      schedules: s.schedules.map((x) =>
        x.id === id
          ? {
              ...x,
              emotions: x.emotions.includes(emotion)
                ? x.emotions.filter((e) => e !== emotion)
                : [...x.emotions, emotion],
            }
          : x,
      ),
    })),

  hide: (id) =>
    set((s) => ({
      schedules: s.schedules.map((x) => (x.id === id ? { ...x, hidden: true } : x)),
    })),

  addSchedule: (title) =>
    set((s) => ({
      schedules: [
        ...s.schedules,
        {
          id: nextId("s"),
          date: SAMPLE_TODAY,
          title: title.trim(),
          // 시간 입력이 없으므로 홈 목록도 시간순이 아니라 들어온 순서다 (12-e.md)
          time: null,
          source: "manual",
          externalId: null,
          done: false,
          doneAt: null,
          emotions: [],
          hidden: false,
        },
      ],
    })),

  addMoment: (text) =>
    set((s) => ({
      moments: [
        ...s.moments,
        {
          id: nextId("m"),
          createdAt: new Date().toISOString(),
          date: SAMPLE_TODAY,
          text: text.trim(),
          // 항상 기기에 먼저 저장하고 연결되면 올린다 — 실패로 표시하지 않는다
          syncState: "local",
        },
      ],
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
