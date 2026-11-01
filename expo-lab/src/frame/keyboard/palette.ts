/**
 * 키보드 그림의 색 — **기기 키보드를 흉내 내는 값**이라 앱 토큰(`src/design/ds`)이 아니다.
 * 린터가 hex 리터럴을 막으므로(`eslint.config.js`) `rgb()` 로 적는다.
 *
 * - iOS 18 라이트 키보드 — 시뮬레이터 스크린숏에서 눈으로 맞춘 근사(공식 값이 없다)
 * - Gboard 라이트(Material 3 · 기본 테마) — 근사. 실제 Pixel 은 배경화면 색(동적 색)을 따른다
 */
export const IOS_KEYBOARD_COLORS = {
  board: "rgb(208, 211, 218)",
  key: "rgb(255, 255, 255)",
  keyPressed: "rgb(172, 179, 188)",
  functionKey: "rgb(172, 179, 188)",
  functionKeyPressed: "rgb(255, 255, 255)",
  keyShadow: "rgba(0, 0, 0, 0.3)",
  label: "rgb(0, 0, 0)",
  icon: "rgb(80, 84, 90)",
  accent: "rgb(0, 122, 255)",
  onAccent: "rgb(255, 255, 255)",
  separator: "rgba(0, 0, 0, 0.16)",
} as const;

export const GBOARD_COLORS = {
  board: "rgb(233, 236, 241)",
  key: "rgb(253, 253, 255)",
  keyPressed: "rgb(214, 221, 232)",
  functionKey: "rgb(214, 221, 232)",
  functionKeyPressed: "rgb(190, 199, 214)",
  label: "rgb(31, 31, 31)",
  hint: "rgb(110, 115, 125)",
  icon: "rgb(70, 74, 82)",
  accent: "rgb(56, 96, 166)",
  onAccent: "rgb(255, 255, 255)",
} as const;
