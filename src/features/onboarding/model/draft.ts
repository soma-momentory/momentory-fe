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
 * 고른 것이고, `"UNSPECIFIED"` 면 해당 없음을 고른 것이다(`05-b.md`). 타입으로
 * 갈라 둬야 `10` 에서 둘을 다르게 보낼 수 있다.
 *
 * **성별·관심사는 서버 코드 그대로 든다**(`MALE` · `RELATIONSHIP` …). 목록의
 * 주인이 서버(`GET /api/v1/onboarding/options`)라, 우리 id 로 옮겼다가 되돌리면
 * **서버가 새로 넣은 코드에는 옮길 이름이 없어 그 칩만 조용히 사라진다.**
 * 값의 뜻을 알아야 하는 곳은 아래 코드 둘뿐이다.
 */

/**
 * 관심사 「기타」 — `06-b` 의 직접 입력 줄이 이 칩에 매여 있다.
 * **문자열을 화면에 적지 않는다** — 서버가 코드를 바꾸면 어디를 고쳐야
 * 하는지 알 수 없게 된다.
 */
export const OTHER_INTEREST = "OTHER";

/**
 * 쉬는 방법 「기타」 — `07` 의 직접 입력 줄이 이 칩에 매여 있다.
 *
 * **`OTHER_INTEREST` 와 문자열이 같지만 같은 것이 아니다.** 하나는
 * `interestAreas` 의 코드고 하나는 `restMethods` 의 코드다 — 서버가 한쪽만
 * 바꿔도 다른 쪽이 따라 움직이지 않도록 따로 둔다.
 */
export const OTHER_REST_METHOD = "OTHER";

/**
 * 성별 「선택 안 함」. **`null`(미선택)과 다르다** — 앞은 묻지 않기를 고른
 * 것이고 이것은 해당 없음을 고른 것이다(`05-b.md`).
 */
export const UNSPECIFIED_GENDER = "UNSPECIFIED";
export type OnboardingDraft = {
  /** `04` · 필수 */
  nickname: string;
  /** `05-b` · 선택. 빈 문자열은 「묻지 않기를 골랐다」 */
  age: string;
  /** `05-b` · 선택. 서버 `genders[].code`. `null` 은 미선택 — `"UNSPECIFIED"` 와 다르다 */
  gender: string | null;
  /** `06` · 필수 · 최대 3. 서버 `interestAreas[].code` */
  interests: string[];
  /**
   * `06-b`/`06-c` · 「기타」 직접 입력 값 (최대 12자, trim 저장).
   * `interests` 에 `OTHER_INTEREST` 가 있을 때만 의미를 갖는다 — 기타를 끄면 함께 비운다.
   */
  interestOther: string;
  /**
   * `07` · 쉬는 방법 · 필수 · 복수 · 상한 없음. 서버 `restMethods[].code`.
   * MVP 에서 이 값을 보여주는 화면은 없다 — **저장만** 한다
   * (`momentory.schema.mvp.json` `User.restMethods` · `07.md`).
   *
   * ⚠ **이모지 라벨이 아니라 코드다**(`SLEEP` · `LISTENING_TO_MUSIC` …).
   * 관심사·성별과 같은 이유로 목록의 주인이 서버다 — 라벨을 id 로 쓰면
   * 서버가 항목을 늘렸을 때 그 칩만 조용히 사라진다(`ARCHITECTURE §4`).
   */
  restMethods: string[];
  /**
   * `07` · 「기타」 직접 입력 값 (최대 12자, trim 저장).
   * `restMethods` 에 `OTHER_REST_METHOD` 가 있을 때만 의미를 갖는다 —
   * 기타를 끄면 함께 비운다. `interestOther` 와 같은 규칙이다.
   *
   * **서버가 `OTHER` 와 함께 이 값을 요구한다** — 없으면 온보딩 제출이 400 이다
   * (`DISCUSSION.md` §1-7). 그래서 `07` 에 입력 줄이 생겼다.
   */
  restMethodOther: string;
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
   * `08` · 회고 알림 의도 — 스키마 `User.notifyRetro`.
   * `[다음]` 은 켠 채 두고 `[알림 없이 쓸게요]` 만 끈다. `10-b` 의 부분 건너뜀
   * 분기("알림만 끄면 캘린더 줄이 남는다")가 이 값을 본다.
   * 실제 OS 권한 요청은 M2 에서 `expo-notifications` 와 함께 붙는다.
   */
  notifyRetro: boolean;
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
  interestOther: "",
  restMethods: [],
  restMethodOther: "",
  retroTime: "21:30",
  notifyRetro: true,
  calendarLinked: false,
};

export const useDraft = create<DraftStore>((setState) => ({
  ...EMPTY,
  set: (key, value) => setState({ [key]: value } as Partial<DraftStore>),
  reset: () => setState(EMPTY),
}));

/** 관심 분야 상한 — `06` 과 `M2` 가 같은 규칙을 쓴다 (`06.md`) */
export const MAX_INTERESTS = 3;
