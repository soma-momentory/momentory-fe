import { create } from "zustand";

import type { EmotionId } from "@/design/theme";

/**
 * 회고 한 벌 — `C1` 에서 시작해 `C7` 에서 `Diary` 한 장으로 끝난다.
 *
 * `momentory.states.mvp.json` 의 `retro` 상태 기계가 라우트이고, 이 store 는
 * **그 흐름이 들고 가는 값**만 담는다. 화면 사이를 넘어가는 것은 셋이다 —
 * 시작 감정 · 대화 · 고른 방향. 지금 PR 은 그중 **시작 감정**까지다.
 *
 * ## 여기서 지키는 규칙
 *
 * - **감정 선택은 필수**이고 통과 버튼을 만들지 않는다(`C3.md`) — 시작 감정이
 *   없으면 첫 질문의 근거도, 리포트의 감정 흐름도 만들 수 없다
 * - **하나만 고른다** — 여러 개를 허용하면 "지금 가장 가까운"이라는 질문이
 *   무너진다. 그래서 `startEmotion` 이 배열이 아니다
 * - **진행률·단계 번호를 두지 않는다** — 이 store 에 `step` 이 없는 이유다.
 *   어디까지 왔는지는 라우트가 알고 화면은 세지 않는다
 * - `[잠시 쉬기]` 는 **자동 저장하고 홈에서 이어간다** — 중단을 묻지 않으므로
 *   여기에 `cancel()` 이 없다. 다시 들어오면 남아 있던 값이 그대로다
 */
type RetroStore = {
  /** `C3` 에서 고른 시작 감정. `C4`~`C4-e` 상단 알약 · `C6`·`A3-b` 로 이어진다 */
  startEmotion: EmotionId | null;
  setStartEmotion: (id: EmotionId) => void;
  /** 회고를 마쳤거나(`C7`) 로그아웃할 때 */
  reset: () => void;
};

export const useRetro = create<RetroStore>((set) => ({
  startEmotion: null,
  setStartEmotion: (id) => set({ startEmotion: id }),
  reset: () => set({ startEmotion: null }),
}));
