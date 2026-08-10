import { create } from "zustand";

import type { EmotionId } from "@/design/theme";
import { initialMoments, todayWeather } from "@/features/home/data/sampleRepository";
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  putCompletion,
  type ScheduleFailureCode,
} from "@/features/home/data/scheduleApi";
import type { Moment, Schedule, Weather } from "@/features/home/model/types";
import { clock } from "@/lib/clock";

/**
 * 오늘 하루 — 일정과 순간.
 *
 * **일정은 서버가 정본이다**(2026-08-11 · `/api/v1/schedules`). 순간(`12-d`)은
 * 아직 샘플이다 — `/api/v1/memos/{date}` 는 **하루에 하나**뿐이라 스키마
 * `Moment`(여러 개 · `createdAt` 을 가짐)와 모양이 달라 따로 정리해야 한다.
 *
 * ## 여기서 지키는 규칙
 *
 * - **되돌릴 수 있게 만든다**(`RULES.md`) — 마침은 **토글**이고 확인 모달이 없다.
 * - **먼저 화면을 바꾸고 서버에 보낸다.** 네트워크를 기다리면 체크가 굼떠진다.
 *   오류 모달·재시도 버튼은 두지 않는다(`RULES.md` 4).
 * - **되돌리는 것은 서버가 실제로 거부했을 때뿐이다.** 요청이 서버에 닿지도
 *   못한 경우(오프라인·주소 미설정)까지 되돌리면, 지하철에서 누른 체크가
 *   눈앞에서 풀린다 — local-first 설계와 정반대다(`ARCHITECTURE.md §7`).
 *   `auth.ts` 가 토큰 갱신 실패를 가르는 것과 **같은 구분**이다.
 *   아웃박스(M3-3)가 붙으면 「닿지 못한 것」이 큐로 들어간다. 그전까지는
 *   기기에만 남고 다음 `load()` 에 사라진다.
 * - **날짜·시각은 `clock` 을 지난다.** 지금 시계는 여전히 `SampleClock`(2026-07-27)
 *   이라 서버에도 그 날짜로 쌓인다 — 보관함·리포트가 아직 샘플 하루를 보고 있어
 *   여기만 실제 날짜로 옮기면 앱 안에 날짜가 둘이 된다(`TASKS.md`).
 *
 * ## 서버가 스키마와 다른 두 곳 — 화면이 아니라 여기서 흡수한다
 *
 * 1. **감정이 하나다.** 스키마는 `0~2개 권장, 상한 없음` 인데 서버는 `emotion`
 *    하나다. 그래서 고르면 **앞의 것을 갈아치운다**(같은 것을 다시 누르면 해제).
 * 2. **감정이 마침에 묶여 있다.** 서버는 `completed=false` 에 감정을 허용하지
 *    않고, 마침을 끄면 감정을 지운다(`Schedule.changeCompletion`). 스펙 `12-c`
 *    는 「마침과 감정은 서로를 요구하지 않는다」이므로 **어긋난다** — 지금은
 *    서버를 따라 **감정을 고르면 마침이 함께 켜지고, 마침을 끄면 감정이 사라진다.**
 *    화면에서 토글이 같이 움직이므로 조용한 손실은 아니다.
 *
 * 둘 다 `docs/PRODUCT.md` 「상류와 차이」에 기록했다.
 */
type DayStore = {
  schedules: Schedule[];
  moments: Moment[];
  /** 서버 답으로 그리고 있는가 — 아직 못 받았으면 목록이 비어 있을 뿐이다 */
  loaded: boolean;
  /** 홈이 뜰 때 부른다. **여러 번 불러도 요청은 하나** */
  load: () => Promise<void>;
  /** 체크 원 — 즉시 마침/취소. 확인을 묻지 않는다. **끄면 감정도 사라진다** */
  toggleDone: (id: string) => void;
  /** `12-c` 감정 — **하나만 남는다.** 같은 것을 다시 누르면 해제 */
  selectEmotion: (id: string, emotion: EmotionId) => void;
  /** `12-c` 「홈에서 숨기기」 — 서버에 자리가 없어 **기기에만** 남는다 */
  hide: (id: string) => void;
  /** `12-c` 「이 일정 삭제」 — `source === "manual"` 에만 있다 */
  remove: (id: string) => void;
  /** `12-e` 직접 추가 — **제목 하나만** 받는다. `time` 은 항상 `null` */
  addSchedule: (title: string) => void;
  /** `12-d` 순간 — 한 줄이면 충분하다 (아직 서버로 가지 않는다) */
  addMoment: (text: string) => void;
  /** 로그아웃이 부른다 — 앞 사람의 하루가 다음 사람에게 남지 않게 */
  reset: () => void;
};

/**
 * 로컬 id — 서버가 답하기 전까지 화면이 들고 있는 임시 값. 성공하면 서버 id 로
 * 갈아끼우고, 실패하면 그 줄을 걷어낸다. 아웃박스가 붙으면 **클라이언트가 만드는
 * ULID** 가 이 자리에 온다(`ARCHITECTURE.md §4` — 생성 요청의 멱등성).
 */
let seq = 0;
const nextId = (prefix: string) => `${prefix}-local-${++seq}`;

/** 진행 중인 조회 — 전역에 하나. 홈이 여러 번 떠도 두 번 보낼 이유가 없다 */
let inFlight: Promise<void> | null = null;

/**
 * **서버가 답했고 거부했다** — 이때만 화면을 되돌린다. `network`·`unconfigured`·
 * `no_session` 은 요청이 나가지도 못한 것이라 기기의 값을 그대로 둔다.
 * `unauthorized`(401)도 남긴다 — 곧 로그아웃으로 화면 전체가 바뀌므로 그 직전에
 * 체크가 풀리는 깜빡임을 만들 이유가 없다.
 */
const serverRefused = (code: ScheduleFailureCode) =>
  code === "server" || code === "malformed" || code === "not_found";

const replace = (schedules: Schedule[], id: string, patch: Partial<Schedule>) =>
  schedules.map((x) => (x.id === id ? { ...x, ...patch } : x));

export const useDay = create<DayStore>((set, get) => ({
  schedules: [],
  moments: initialMoments(),
  loaded: false,

  load: () => {
    if (inFlight != null) return inFlight;

    inFlight = fetchSchedules(clock.today())
      .then((result) => {
        // 못 받았으면 **가진 것을 그대로 둔다** — 빈 목록으로 덮으면 방금 만든
        // 일정이 연결이 흔들렸다는 이유로 사라진다
        if (result.ok) set({ schedules: result.data, loaded: true });
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  toggleDone: (id) => {
    const before = get().schedules.find((x) => x.id === id);
    if (before == null) return;
    const done = !before.done;
    // 마침을 끄면 감정도 함께 사라진다 — 서버가 그렇게 한다
    const emotions = done ? before.emotions : [];
    // 마친 **시각**은 서버가 돌려주지 않는다(`scheduleApi.ts`) — 기기에만 남는다
    const doneAt = done ? clock.now().toISOString() : null;

    set((s) => ({ schedules: replace(s.schedules, id, { done, emotions, doneAt }) }));

    void putCompletion(id, done, emotions[0] ?? null).then((result) => {
      if (result.ok || !serverRefused(result.code)) return;
      set((s) => ({
        schedules: replace(s.schedules, id, {
          done: before.done,
          emotions: before.emotions,
          doneAt: before.doneAt,
        }),
      }));
    });
  },

  selectEmotion: (id, emotion) => {
    const before = get().schedules.find((x) => x.id === id);
    if (before == null) return;
    // 하나만 남는다 — 같은 것을 다시 누르면 해제, 다른 것을 누르면 갈아치운다
    const next = before.emotions[0] === emotion ? [] : [emotion];
    // 감정을 남기려면 마침이 켜져 있어야 한다(서버 규칙). 지우는 것은 마침을 끄지 않는다
    const done = next.length > 0 ? true : before.done;
    const doneAt = done && before.doneAt == null ? clock.now().toISOString() : before.doneAt;

    set((s) => ({ schedules: replace(s.schedules, id, { emotions: next, done, doneAt }) }));

    void putCompletion(id, done, next[0] ?? null).then((result) => {
      if (result.ok || !serverRefused(result.code)) return;
      set((s) => ({
        schedules: replace(s.schedules, id, {
          emotions: before.emotions,
          done: before.done,
          doneAt: before.doneAt,
        }),
      }));
    });
  },

  hide: (id) => set((s) => ({ schedules: replace(s.schedules, id, { hidden: true }) })),

  remove: (id) => {
    const before = get().schedules;
    set({ schedules: before.filter((x) => x.id !== id) });

    void deleteSchedule(id).then((result) => {
      // 이미 서버에 없으면(404) 지운 것이 맞다 — 되돌리지 않는다
      if (result.ok || result.code === "not_found" || !serverRefused(result.code)) return;
      set({ schedules: before });
    });
  },

  addSchedule: (title) => {
    const name = title.trim();
    if (name.length === 0) return;
    const date = clock.today();
    const tempId = nextId("s");

    set((s) => ({
      schedules: [
        ...s.schedules,
        {
          id: tempId,
          date,
          // 시간 입력이 없으므로 홈 목록도 시간순이 아니라 들어온 순서다 (12-e.md)
          title: name,
          time: null,
          source: "manual",
          externalId: null,
          done: false,
          doneAt: null,
          emotions: [],
          hidden: false,
        },
      ],
    }));

    void createSchedule(date, name).then((result) => {
      if (result.ok) {
        // 서버 id 로 갈아끼운다 — 이걸 안 하면 이어지는 마침·삭제가 404 다
        set((s) => ({ schedules: s.schedules.map((x) => (x.id === tempId ? result.data : x)) }));
        return;
      }
      if (!serverRefused(result.code)) return;
      set((s) => ({ schedules: s.schedules.filter((x) => x.id !== tempId) }));
    });
  },

  addMoment: (text) =>
    set((s) => ({
      moments: [
        ...s.moments,
        {
          id: nextId("m"),
          createdAt: clock.now().toISOString(),
          date: clock.today(),
          text: text.trim(),
          // 항상 기기에 먼저 저장하고 연결되면 올린다 — 실패로 표시하지 않는다
          syncState: "local",
        },
      ],
    })),

  reset: () => {
    inFlight = null;
    set({ schedules: [], moments: initialMoments(), loaded: false });
  },
}));

/**
 * 화면 상단이 말하는 「오늘」 — 날짜와 날씨.
 *
 * 홈(`12`)과 회고 확인(`C2`)이 같은 값을 봐야 해서 한 곳에 뒀다. 화면이
 * `SAMPLE_TODAY`·`SAMPLE_WEATHER` 를 직접 읽지 않는 이유가 이 함수다 —
 * 날씨는 아직 샘플이고 서버가 붙으면 여기 안쪽만 바뀐다.
 */
export const useTodayContext = (): { date: string; weather: Weather } => ({
  date: clock.today(),
  weather: todayWeather(),
});

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
