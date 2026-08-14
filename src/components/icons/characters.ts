import type { ImageSourcePropType } from "react-native";

/**
 * 새 디자인 캐릭터 3종 (`docs/design/prototype/assets/` 반입).
 *
 * 어디에 누가 나오는지는 프로토타입이 정한다 (자산 사용처 — `PLAN.md` §1):
 * - `capybara`  — 홈 히어로 우측 (110px)
 * - `capybaraAlt` — 회고 배경(192px) · 리포트 코멘트 썸네일(52px) · 마이 아바타(56px)
 * - `chick` — 홈 히어로 좌측(67px · 탭하면 회고) · 일기 저장 FAB 안(48px)
 *
 * 옛 바바 3종(`assets/baba/`)은 아직 chat `Avatar` 등이 쓴다 — 화면 리스킨과 함께
 * 교체하고, 참조가 0 이 되면 폴더째 지운다 (`PLAN.md` Phase 3).
 */
export const CHARACTERS: Record<"capybara" | "capybaraAlt" | "chick", ImageSourcePropType> = {
  capybara: require("../../../assets/characters/capybara-trim.png"),
  capybaraAlt: require("../../../assets/characters/capybara2-trim.png"),
  chick: require("../../../assets/characters/chick-trim.png"),
};
