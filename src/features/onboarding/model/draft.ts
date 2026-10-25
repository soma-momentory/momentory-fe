import { create } from "zustand";

import { useProfile, useSettings } from "@/features/my/model/settings";
import type { Answers, Goal, QuestionKey } from "@/features/onboarding/model/flow";

/**
 * 온보딩 답안 **초안**(v2 · 2026-10-25).
 *
 * 답은 화면마다 서버로 보내지 않고 여기 쌓았다가 마지막 화면(지금 첫 회고)에서 한 번에
 * 보낸다(`PUT /api/v2/users/me/onboarding`). 이 store 는 **모으기만 한다** — 네트워크를
 * 모르고 기기에 남기지도 않는다. 질문은 로그인 뒤라 로그인 중에 앱이 꺼져도 잃는 답이 없다.
 *
 * **성별은 서버 코드 그대로 든다**(`FEMALE` · `MALE` · `UNSPECIFIED`).
 *
 * 아래 상수 넷은 마이페이지 편집(`app/my/*`)이 함께 쓴다 — 옛 온보딩(관심사 · 쉬는 방법)이
 * 남긴 규칙이다.
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
  /** 이름 · 필수 · 최대 10자 */
  nickname: string;
  /** 나이 · 선택. 빈 문자열은 건너뛴 것이다 */
  age: string;
  /** 성별 · 선택. 서버 코드(`FEMALE` · `MALE` · `UNSPECIFIED`). `null` 은 미선택이고 `UNSPECIFIED` 로 보낸다 */
  gender: string | null;
  /**
   * 회고 알림 시각. **`null` 은 아직 안 골랐다** — 알림 화면이 질문 3 답으로 기본값을 고른다
   * (`flow.ts` `defaultRetroTime`). 다시 온보딩하는 기존 사용자는 지금 시각이 미리 들어 있다.
   */
  retroTime: string | null;
  /** 알림 화면 — 켰고 OS 도 허락했다 */
  notifyRetro: boolean;
  /** 캘린더 화면 — 연결했고 OS 도 허락했다 */
  calendarLinked: boolean;
  /** 질문 넷의 답. 건너뛴 질문은 `null` */
  answers: Answers;
  goals: Goal[];
  /** 프로필이 이미 있는 사람이 다시 온보딩한다 — 계측이 새 가입자와 가른다 */
  reonboarding: boolean;
};

type DraftStore = OnboardingDraft & {
  set: <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => void;
  answer: <K extends QuestionKey>(key: K, value: Answers[K]) => void;
  /**
   * 질문을 시작할 때 부른다. 프로필이 이미 있으면(다시 온보딩) 이름 · 나이 · 성별 · 알림 · 캘린더를
   * **지금 값으로 미리 채운다.** 질문 답은 모두에게서 새로 받는다.
   */
  prefill: () => void;
  /** 온보딩을 마쳤거나 로그아웃할 때. 다음 사용자에게 앞 사람 답이 남지 않게 한다 */
  reset: () => void;
};

const EMPTY: OnboardingDraft = {
  nickname: "",
  age: "",
  gender: null,
  retroTime: null,
  notifyRetro: false,
  calendarLinked: false,
  answers: { moodChange: null, knowWhy: null, dayEnd: null, diaryHistory: null },
  goals: [],
  reonboarding: false,
};

export const useDraft = create<DraftStore>((setState) => ({
  ...EMPTY,
  set: (key, value) => setState({ [key]: value } as Partial<DraftStore>),
  answer: (key, value) => setState((s) => ({ answers: { ...s.answers, [key]: value } })),
  prefill: () => {
    const profile = useProfile.getState();
    if (profile.nickname.length === 0) {
      setState(EMPTY);
      return;
    }
    const retro = useSettings.getState().notify.retro;
    setState({
      ...EMPTY,
      nickname: profile.nickname,
      age: profile.age,
      gender: profile.gender,
      retroTime: retro.time,
      notifyRetro: retro.enabled,
      calendarLinked: profile.calendarLinked,
      reonboarding: true,
    });
  },
  reset: () => setState(EMPTY),
}));

/** 관심 분야 상한 — `06` 과 `M2` 가 같은 규칙을 쓴다 (`06.md`) */
export const MAX_INTERESTS = 3;

/**
 * 「기타」 인라인 입력의 글자 상한 — `06-b` · `07` · `M2` 가 같은 줄을 나눠 쓴다.
 * 상한에 닿으면 **오류 문구 없이 카운터 색만** 바뀐다(`06-c.md`).
 *
 * ⚠ **디자인 값이 아니라 제품 규칙이다** — `design/tokens.mvp.ts` 의
 * `otherRow.maxLength` 에서 옮겨 왔다(토큰 파일과 함께 사라지면 안 된다).
 */
export const MAX_OTHER_LENGTH = 12;
