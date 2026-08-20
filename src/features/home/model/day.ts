import { create } from "zustand";

import type { EmotionId } from "@/features/emotion/model/emotion";
import { initialMoments, todayWeather } from "@/features/home/data/sampleRepository";
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  patchScheduleOrder,
  patchScheduleTitle,
  patchScheduleVisibility,
  putCompletion,
  type ScheduleFailureCode,
} from "@/features/home/data/scheduleApi";
import type { Moment, Schedule, Weather } from "@/features/home/model/types";
import { clock } from "@/lib/clock";

/**
 * 오늘 하루 — 일정과 순간.
 *
 * **일정은 서버가 정본이다**(2026-08-11 · `/api/v1/schedules`). **순간(`12-d`)은
 * 기기의 것이다** — 서버로 올리지 않기로 했다(2026-08-11 제품 결정 ·
 * `TASKS.md` 「순간은 기기에 남는다」 · `PRODUCT.md` 「상류와 차이」 16번).
 * MMKV(M3) 전이라 지금은 앱을 껐다 켜면 사라진다.
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
 * - **날짜·시각은 `clock` 을 지난다.** 운영 앱은 기기 시각을 쓰고, 테스트만
 *   고정 시계를 심는다.
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
  /**
   * 오늘의 순간 — **읽기만 남았다.** 만드는 화면(`12-d`)이 새 홈에서 사라져
   * `addMoment` 도 함께 지웠다(2026-08-14 · `docs/PRODUCT.md` 「상류와 차이」 #18).
   * 회고 인트로(`C1`)의 「순간 n개」와 확인(`C2`)의 목록이 아직 이 값을 읽으므로
   * 모델·샘플은 남긴다 — **다시 만들 길이 생기기 전까지 샘플 밖의 순간은 없다.**
   */
  moments: Moment[];
  /** 서버 답으로 그리고 있는가 — 아직 못 받았으면 목록이 비어 있을 뿐이다 */
  loaded: boolean;
  /** 홈이 뜰 때 부른다. **여러 번 불러도 요청은 하나** */
  load: () => Promise<void>;
  /** 캘린더 화해 직후, 진행 중 조회가 있으면 끝낸 뒤 서버 정본을 다시 받는다 */
  reload: () => Promise<void>;
  /**
   * 체크박스 — 즉시 마침/취소. 확인을 묻지 않는다.
   *
   * ⚠ **감정을 묻지 않는다**(2026-08-20 · N7 · `PLAN.md` A-8). `DESIGN.md` 「일정」이
   * 「완료: 체크박스 한 번, **감정 입력 없음**」이라 감정 인자로 늘 `null` 을 보낸다.
   * 서버가 `emotion:null` 을 받으면 그 일정의 감정을 지우므로 **기기에서도 함께
   * 비운다** — 화면만 감정을 든 채로 두면 다음 `load()` 에 조용히 사라진다.
   */
  toggleDone: (id: string) => void;
  /**
   * `12-c` 감정 — **하나만 남는다.** 같은 것을 다시 누르면 해제.
   *
   * ⚠ **부르는 화면이 없다**(N7 로 감정 시트가 사라졌다). 서버 계약
   * (`PUT /schedules/{id}/completion`)은 그대로라 **좁히지 않고 남긴다** —
   * 계약을 지우면 되살릴 때 BE 를 다시 손대야 한다(`PLAN.md` A-8).
   */
  selectEmotion: (id: string, emotion: EmotionId) => void;
  /** `12-c` 「홈에서 숨기기」 — 캘린더 원본은 두고 서버 표시 상태만 바꾼다 */
  hide: (id: string) => void;
  /** `12-c` 「이 일정 삭제」 — `source === "manual"` 에만 있다 */
  remove: (id: string) => void;
  /** `12-e` 직접 추가 — **제목 하나만** 받는다. `time` 은 항상 `null` */
  addSchedule: (title: string) => void;
  /** `12-c` 편집 — 제목만 고친다. 가져온 일정은 화면이 부르지 않는다 */
  renameSchedule: (id: string, title: string) => void;
  /**
   * 순서 — 보이는 목록에서 한 칸 위/아래로. **손잡이를 잡을 수 없는 사람**을 위한
   * 접근성 동작이 이걸 부른다(`PLAN.md` D10).
   */
  moveSchedule: (id: string, direction: "up" | "down") => void;
  /** 순서 — 끌어 놓은 자리(보이는 목록 기준 index)로 옮긴다 */
  reorderSchedule: (id: string, toIndex: number) => void;
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

  reload: async () => {
    const pending = inFlight;
    if (pending != null) await pending;
    await get().load();
  },

  toggleDone: (id) => {
    const before = get().schedules.find((x) => x.id === id);
    if (before == null) return;
    const done = !before.done;
    // 켜든 끄든 감정은 남지 않는다 — 이 화면이 감정을 더 이상 묻지 않으므로(N7)
    // 서버에도 `null` 을 보낸다. 서버가 지우는 것을 기기가 그대로 비춘다
    const emotions: EmotionId[] = [];
    // 마친 **시각**은 서버가 돌려주지 않는다(`scheduleApi.ts`) — 기기에만 남는다
    const doneAt = done ? clock.now().toISOString() : null;

    set((s) => ({ schedules: replace(s.schedules, id, { done, emotions, doneAt }) }));

    void putCompletion(id, done, null).then((result) => {
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

  hide: (id) => {
    const before = get().schedules.find((x) => x.id === id);
    if (before == null || before.source !== "calendar" || before.hidden) return;

    set((s) => ({ schedules: replace(s.schedules, id, { hidden: true }) }));
    void patchScheduleVisibility(id, true).then((result) => {
      if (result.ok || !serverRefused(result.code)) return;
      set((s) => ({ schedules: replace(s.schedules, id, { hidden: false }) }));
    });
  },

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

  renameSchedule: (id, title) => {
    const before = get().schedules.find((x) => x.id === id);
    const name = title.trim();
    if (before == null || name.length === 0 || name === before.title) return;

    set((s) => ({ schedules: replace(s.schedules, id, { title: name }) }));

    void patchScheduleTitle(id, before.date, name).then((result) => {
      if (result.ok || !serverRefused(result.code)) return;
      set((s) => ({ schedules: replace(s.schedules, id, { title: before.title }) }));
    });
  },

  moveSchedule: (id, direction) => {
    const shown = visibleSchedules(get().schedules);
    const at = shown.findIndex((x) => x.id === id);
    if (at < 0) return;
    get().reorderSchedule(id, direction === "up" ? at - 1 : at + 1);
  },

  reorderSchedule: (id, toIndex) => {
    const before = get().schedules;
    // 보이는 줄끼리만 자리를 옮긴다 — 숨긴 줄은 화면에 없으니 자리를 세지 않는다
    const shown = visibleSchedules(before);
    const at = shown.findIndex((x) => x.id === id);
    if (at < 0 || toIndex < 0 || toIndex >= shown.length || toIndex === at) return;

    // 보이는 목록에서 뽑아 넣은 뒤, **숨긴 줄의 자리는 그대로 두고** 다시 엮는다
    const moved = [...shown];
    moved.splice(toIndex, 0, moved.splice(at, 1)[0]!);
    let k = 0;
    const next = before.map((x) => (x.hidden ? x : moved[k++]!));
    set({ schedules: next });

    // 서버에는 **그날의 결과 목록**을 통째로 보낸다. 임시 id(아직 서버가 모르는
    // 줄)가 섞여 있으면 보내지 않는다 — 다음 `load` 가 서버 순서로 되돌린다
    const ids = next.filter((x) => !x.hidden).map((x) => Number(x.id));
    if (ids.some((n) => !Number.isInteger(n))) return;

    void patchScheduleOrder(clock.today(), ids).then((result) => {
      if (result.ok || !serverRefused(result.code)) return;
      set({ schedules: before });
    });
  },

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

/**
 * 그 날짜가 든 주의 **월요일** — 홈의 「이번 주 감정」이 보는 창(`DESIGN.md` 「홈」).
 *
 * 주는 월요일에 시작한다(시안의 요일 줄이 `월…일` 이다). 일요일(`getDay()===0`)은
 * **앞선 월요일**에 붙는다 — 그 주의 마지막 날이지 다음 주의 첫날이 아니다.
 */
export function weekStartOf(iso: string): string {
  const [y = "2026", m = "1", d = "1"] = iso.split("-");
  const at = new Date(Number(y), Number(m) - 1, Number(d));
  const back = (at.getDay() + 6) % 7;
  const monday = new Date(at.getFullYear(), at.getMonth(), at.getDate() - back);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
}

/** 목록에 보이는 일정 — 숨긴 것은 빼고 센다 */
export const visibleSchedules = (schedules: readonly Schedule[]) =>
  schedules.filter((s) => !s.hidden);

/**
 * 목록이 이 수를 넘으면 여기까지만 펼치고 `[n개 더 보기]` 로 접는다(`12.md`).
 *
 * ⚠ **디자인 값이 아니라 제품 규칙이다.** 오랫동안 `design/tokens.mvp.ts` 의
 * `home.maxVisibleSchedules` 로 있었는데, 그러면 토큰 파일을 지우는 순간 규칙이
 * 조용히 사라진다 — 디자인 세대가 바뀌어도 「5개까지 펼친다」는 그대로다.
 */
export const MAX_VISIBLE_SCHEDULES = 5;

/**
 * 「2/4 마침」. **진행률·배지가 아니라 사실**이다(`12.md`) — 퍼센트로 바꾸거나
 * 막대를 그리지 않는다.
 *
 * ⚠ **홈은 더 이상 이 말을 쓰지 않는다** — `DESIGN.md` 「홈」이 「`N개 남음` 은
 * 미완료 수예요」로 바꿨다(아래 `remainingLabel`). 아직 옛 디자인인 회고 확인
 * (`C2`)이 쓰고 있어 남긴다 — 그 화면이 넘어오면 함께 사라진다.
 */
export const doneCountLabel = (schedules: readonly Schedule[]) => {
  const shown = visibleSchedules(schedules);
  return `${shown.filter((s) => s.done).length}/${shown.length} 마침`;
};

/**
 * 「3개 남음」 — **남은(미완료) 수**다(`DESIGN.md` 「홈」).
 *
 * 마친 수를 세면 「얼마나 해냈는가」가 되고, 남은 수를 세면 「무엇이 남았는가」가
 * 된다. 진행률·배지를 만들지 않는다는 규칙(`12.md`)은 그대로다 — 다 마쳤을 때도
 * 점수 대신 **끝났다는 사실**만 말한다.
 */
export const remainingLabel = (schedules: readonly Schedule[]) => {
  const shown = visibleSchedules(schedules);
  const left = shown.filter((s) => !s.done).length;
  return left > 0 ? `${left}개 남음` : "모두 완료";
};
