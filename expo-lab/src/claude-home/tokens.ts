/** Claude Design `홈화면 시안 v2.dc.html` values. Kept isolated until a design is adopted. */
export const claudeHomeColor = {
  paper: "#F6F1E7",
  bezel: "#1F1A15",
  grid: "#EAE2D3",
  ink: "#48291A",
  statusInk: "#000000",
  muted: "#7A5A44",
  card: "#FBF8F1",
  white: "#FFFFFF",
  date: "#E9D6BF",
  weekday: "#CDAE8A",
  green: "#5B7553",
  greenSoft: "#B9CBA8",
  weatherTape: "#DEC4A0",
  alert: "#E2603A",
  taskBorder: "#C9BBA8",
  taskDone: "#A8988A",
  emptyBorder: "#E3D8C6",
  separator: "#EFE7DA",
  today: "#F6DE8A",
  mood: ["#F5CF5B", "#BDB8B1", "#9CB27E", "#F28A3A", "#E8DED0", "#E8DED0", "#E8DED0"],
  shadow: "#48291A",
} as const;

/** 앱 `assets/fonts/KyoboHandwriting2025lyb.ttf` 를 `App.tsx` 가 이 이름으로 등록한다 — 앱 `homeV2.font` 와 같은 이름.
 * 교보손글씨는 굵기가 하나라 두 이름이 같은 파일이다(2026-11-01 · Gaegu 삭제) */
export const claudeHomeFont = {
  regular: "KyoboHandwriting2025lyb",
  bold: "KyoboHandwriting2025lyb",
} as const;
