import { create } from "zustand";

import {
  fetchOnboardingOptions,
  type NicknamePolicy,
  type Option,
} from "@/features/onboarding/data/optionsApi";
import { OTHER_INTEREST, UNSPECIFIED_GENDER } from "@/features/onboarding/model/draft";

/**
 * 온보딩이 그리는 선택지 — **서버가 정본이고 여기 있는 것은 대역이다.**
 *
 * `04`(닉네임 상한) · `05-b`(성별) · `06`(관심 분야) · `M2`(그 셋의 편집)가
 * 같은 목록을 봐야 한다. 그전에는 화면 파일마다 배열을 들고 있어서 관심사 8개가
 * **두 곳(`06` 과 `M2`)에 복사돼 있었다** — 한쪽만 고치면 온보딩에서 고른 칩이
 * 마이에서 사라진다.
 *
 * ## 실패해도 온보딩은 멈추지 않는다
 *
 * 선택지를 못 받았다고 첫 화면에서 붙잡아 두면, 연결이 잠깐 흔들린 사람은
 * 앱을 시작할 수조차 없다. 그래서 **화면은 언제나 즉시 그린다** — 아래 대역
 * 목록으로 먼저 그리고, 서버 답이 오면 조용히 바뀐다. 로딩 표시도 안내 문구도
 * 없다(`RULES.md` 4 — 「오류·거부·실패는 한 줄 안내로 흡수한다」, 그리고 여기는
 * 사용자가 할 수 있는 일이 아예 없으므로 그 한 줄조차 두지 않는다).
 *
 * **대역은 스펙 문안이다**(`06.md` · `05-b.md`). 서버가 언젠가 다른 라벨을
 * 주면 그때는 서버 것이 화면에 뜬다 — 다르면 `PRODUCT.md` 「상류와 차이」에
 * 적을 일이지 여기서 되돌릴 일이 아니다.
 *
 * **사용자에게 묶인 값이 아니다** — 누가 로그인해도 같은 목록이라
 * `clearUserScopedStores`(로그아웃)가 비우지 않는다.
 */
export type { NicknamePolicy, Option };

/** `04` 의 상한. 서버가 같은 10 을 주지만 못 받았을 때도 입력은 돼야 한다 */
const FALLBACK_NICKNAME: NicknamePolicy = { maxLength: 10, duplicateAllowed: true };

/** `05-b` — 비워둔 것(`null`)과 「선택 안 함」(`UNSPECIFIED`)은 다르다 */
const FALLBACK_GENDERS: Option[] = [
  { id: "MALE", label: "남성" },
  { id: "FEMALE", label: "여성" },
  { id: UNSPECIFIED_GENDER, label: "선택 안 함" },
];

/** `06` — 여덟 개를 한 화면에 다 보인다(스크롤로 감추면 뒤쪽은 선택되지 않는다) */
const FALLBACK_INTERESTS: Option[] = [
  { id: "STUDY", label: "학업" },
  { id: "CAREER", label: "취업·진로" },
  { id: "WORK", label: "일·직장생활" },
  { id: "RELATIONSHIP", label: "인간관계" },
  { id: "FAMILY", label: "가족" },
  { id: "SELF", label: "나 자신" },
  { id: "HEALTH", label: "건강" },
  { id: OTHER_INTEREST, label: "기타" },
];

type OptionsStore = {
  nickname: NicknamePolicy;
  genders: Option[];
  interestAreas: Option[];
  /** 서버 답으로 그리고 있는가 — 대역인 채로 넘어간 사용자를 구분한다 */
  fromServer: boolean;
  /**
   * 필요한 화면이 부른다(`(onboarding)/_layout` · `M2`). **여러 번 불러도
   * 요청은 한 번**이고, 실패하면 다음 호출이 다시 시도한다.
   */
  load: () => Promise<void>;
  reset: () => void;
};

const EMPTY = {
  nickname: FALLBACK_NICKNAME,
  genders: FALLBACK_GENDERS,
  interestAreas: FALLBACK_INTERESTS,
  fromServer: false,
};

/**
 * 진행 중인 조회 — 전역에 하나. 온보딩 레이아웃과 `M2` 가 거의 동시에 뜨는
 * 경우가 있고, 두 번 보낼 이유가 없다(`auth.ts` 의 `refreshInFlight` 와 같은 손잡이).
 */
let inFlight: Promise<void> | null = null;

export const useOnboardingOptions = create<OptionsStore>((set, get) => ({
  ...EMPTY,

  load: () => {
    // 이미 서버 답으로 그리고 있으면 다시 묻지 않는다 — 목록은 자주 바뀌지 않는다
    if (get().fromServer) return Promise.resolve();
    if (inFlight != null) return inFlight;

    inFlight = fetchOnboardingOptions()
      .then((result) => {
        if (!result.ok) return;
        // **받은 것만 덮는다.** 성별만 어긋난 응답에 관심사까지 대역으로
        // 되돌리면 서버가 새로 넣은 항목이 사라진다
        const { nickname, genders, interestAreas } = result.data;
        set({
          nickname: nickname ?? get().nickname,
          genders: genders ?? get().genders,
          interestAreas: interestAreas ?? get().interestAreas,
          fromServer: true,
        });
      })
      .finally(() => {
        inFlight = null;
      });

    return inFlight;
  },

  reset: () => {
    inFlight = null;
    set(EMPTY);
  },
}));
