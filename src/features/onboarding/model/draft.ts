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
};

export const useDraft = create<DraftStore>((setState) => ({
  ...EMPTY,
  set: (key, value) => setState({ [key]: value } as Partial<DraftStore>),
  reset: () => setState(EMPTY),
}));

/** 관심 분야 상한 — `06` 과 `M2` 가 같은 규칙을 쓴다 (`06.md`) */
export const MAX_INTERESTS = 3;
