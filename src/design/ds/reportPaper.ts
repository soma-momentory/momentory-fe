/**
 * 리포트 HTML 시안 `04-report.dc.html`의 종이·잉크·테이프 색.
 * 홈 v2와 같은 원본 팔레트를 쓰지만 리포트 전용 이름으로 둔다.
 */
export const reportPaper = {
  paper: "#F6F1E7",
  grid: "#EAE2D3",
  ink: "#48291A",
  strong: "#3A2114",
  muted: "#7A5A44",
  card: "#FBF8F1",
  white: "#FFFFFF",
  date: "#E9D6BF",
  weekday: "#CDAE8A",
  tape: "#F6DE8A",
  line: "#E3D7C4",
  border: "#EDE4D4",
  shadow: "#48291A",
  font: { regular: "Gaegu-Regular", bold: "Gaegu-Bold" },
} as const;
