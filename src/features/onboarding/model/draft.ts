import { create } from "zustand";

/**
 * 온보딩 답안 **초안**.
 *
 * `ARCHITECTURE.md §3` — "답은 화면마다 서버로 보내지 않고 초안에 쌓았다가
 * `09`/`10` 에서 한 번에 커밋한다". 그래서 이 store 는 **모으기만 한다**.
 * 네트워크를 모르고, 저장도 하지 않는다.
 *
 * 화면 로컬 `useState` 로 두면 `04 → 05-b` 로 넘어가는 순간 닉네임이 사라지고,
 * 뒤로 갔다 오면 적은 것도 날아간다. `10` 에서 제출할 데이터 자체가 남지 않는다.
 *
 * **아직 기기에 남기지 않는다.** `ARCHITECTURE.md §3` 은 "중간 이탈 시 초안은
 * MMKV 에 남음" 이라고 하지만 MMKV 도입은 M3 다. 지금은 앱을 끄면 사라진다 —
 * 온보딩은 한 자리에서 끝나는 흐름이라 그 사이 유실은 감수할 수 있고, 미리 깔면
 * 쓰지도 않는 의존성이 락파일에 굳는다(`§1`).
 *
 * **비어 있음과 「선택 안 함」을 구별한다.** `gender` 가 `null` 이면 묻지 않기를
 * 고른 것이고, `"none"` 이면 해당 없음을 고른 것이다(`05-b.md`). 타입으로 갈라
 * 둬야 `10` 에서 둘을 다르게 보낼 수 있다.
 */
export type Gender = "male" | "female" | "none";

export type OnboardingDraft = {
  /** `04` · 필수 */
  nickname: string;
  /** `05-b` · 선택. 빈 문자열은 「묻지 않기를 골랐다」 */
  age: string;
  /** `05-b` · 선택. `null` 은 미선택 — 「선택 안 함」(`"none"`)과 다르다 */
  gender: Gender | null;
  /** `06` · 필수 · 최대 3 */
  interests: string[];
  /**
   * `08` · 회고 시각. **기본 `21:30`** — 스키마가 정한 값이다
   * (`momentory.schema.mvp.json` — "time · 기본 21:30 (08 · M3에서 수정)").
   *
   * 비워두지 않는 이유: 홈이 "밤 9:30엔 제가 먼저 말 걸어요" 라고 말하고
   * `10` 이 그 시각을 요약 카드에 되돌려준다. 값이 없으면 두 화면이 할 말을 잃는다.
   * 시간 선택 모달(`08-b`)이 MVP 밖이라 아직 바꿀 길만 없다.
   *
   * `[알림 없이 쓸게요]` 를 골라도 **이 값은 남는다** — 알림만 끈다(`08.md`).
   */
  retroTime: string;
  /**
   * `09` · 캘린더 연결 여부. `10` 이 이 값으로 요약 줄을 **지운다**
   * (회색 처리하지 않는다 — `10.md`).
   */
  calendarLinked: boolean;
};

type DraftStore = OnboardingDraft & {
  set: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  /** 온보딩을 마쳤거나 로그아웃할 때. 다음 사용자에게 앞 사람 답이 남지 않게 한다 */
  reset: () => void;
};

const EMPTY: OnboardingDraft = {
  nickname: "",
  age: "",
  gender: null,
  interests: [],
  retroTime: "21:30",
  calendarLinked: false,
};

export const useDraft = create<DraftStore>((setState) => ({
  ...EMPTY,
  set: (key, value) => setState({ [key]: value } as Partial<DraftStore>),
  reset: () => setState(EMPTY),
}));

/** 관심 분야 상한 — `06` 과 `M2` 가 같은 규칙을 쓴다 (`06.md`) */
export const MAX_INTERESTS = 3;
