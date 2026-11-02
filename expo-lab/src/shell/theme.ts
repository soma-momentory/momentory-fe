/**
 * 셸(도구 UI) 색 — 앱 디자인과 섞이지 않게 무채색 위주로 따로 둔다.
 * 린터가 hex 리터럴을 막으므로(`eslint.config.js` NO_RAW_HEX) rgb 로 적는다.
 */
export const shellColor = {
  page: "rgb(240, 240, 237)",
  panel: "rgb(252, 252, 250)",
  border: "rgb(222, 222, 216)",
  ink: "rgb(31, 33, 30)",
  muted: "rgb(110, 112, 105)",
  faint: "rgb(160, 162, 155)",
  accent: "rgb(66, 104, 78)",
  accentSoft: "rgb(226, 236, 228)",
  onAccent: "rgb(255, 255, 255)",
  draft: "rgb(176, 96, 40)",
  draftSoft: "rgb(248, 233, 220)",
  danger: "rgb(176, 48, 48)",
  stage: "rgb(229, 229, 224)",
  // 기기 외형
  body: "rgb(22, 22, 24)",
  bodyRim: "rgb(82, 82, 88)",
  bodyButton: "rgb(58, 58, 62)",
  glass: "rgb(0, 0, 0)",
  seBody: "rgb(240, 240, 242)",
  seRim: "rgb(200, 200, 205)",
  seButtonRing: "rgb(178, 178, 184)",
  statusDark: "rgb(0, 0, 0)",
  statusLight: "rgb(255, 255, 255)",
  androidStatusDark: "rgb(31, 31, 31)",
} as const;

export const shellFont =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
