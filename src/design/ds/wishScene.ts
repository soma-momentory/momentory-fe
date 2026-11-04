/**
 * Momentory DS — 소원 연꽃의 장면 값 (2026-11-04 · 시안 `analysis/2026-11-02-wish/simple.html`).
 *
 * 그림이 감각연못 배경을 밤으로 바꾼 것이라 구도가 같다. 자리는 기준 화면(393 × 852) 좌표이고
 * `components/rest/pond/layout.ts` 의 `artPoint` 가 지금 화면의 같은 그림 위 자리로 옮긴다.
 */
export const wishScene = {
  /** 꽃 그림의 세로 ÷ 가로 */
  flowerAspect: 280 / 430,
  /** 꽃 다섯 송이의 가운데와 폭 */
  spots: [
    { x: 92, y: 406, width: 84 },
    { x: 212, y: 394, width: 72 },
    { x: 304, y: 424, width: 88 },
    { x: 116, y: 512, width: 104 },
    { x: 248, y: 530, width: 112 },
  ],
  /** 내 꽃 — 가장 앞 물 위에서 조금 크다 */
  mine: { x: 196, y: 630, width: 124 },
  /** 소원 한 장 아래의 꽃 */
  held: { x: 196, y: 610, width: 124, joinedWidth: 150 },
  /** 소원이 많을수록 뒤쪽에 늘어나는 작은 꽃 */
  tiny: { max: 34, top: 384, depth: 256, left: 12, span: 369, minWidth: 20, grow: 34 },
  /** 바바가 앉은 돌 — 발밑 가운데와 폭 */
  baba: { x: 316, y: 724, width: 118 },
  /** 쪽지 · 소원 한 장의 종이 */
  memo: {
    side: 26,
    paper: "#FAF6EE",
    radius: 4,
    shadow: "#1E140A",
    tape: "#E2E8D7",
    tapeStripe: "#BFCDB0",
    tapeWidth: 104,
    tapeHeight: 28,
    line: { minHeight: 132, fontSize: 29, lineHeight: 39 },
    one: { minHeight: 276, fontSize: 31, lineHeight: 44 },
    long: { fontSize: 24, lineHeight: 34 },
    write: { minHeight: 246, fontSize: 22, lineHeight: 31 },
    placeholder: "#7F6E5C",
    leftFace: "#F3E4C2",
    leftInk: "#6B4A1E",
  },
  /** 프로필 원 */
  avatar: { size: 52, image: 70, face: "#B9CBA8" },
  /** 소원 한 장 위 위치 막대 */
  bar: { height: 4, gap: 4, color: "rgba(255,247,238,0.75)", flower: 36 },
  /** 넘기기 원 */
  nav: { size: 44, bottom: 88 },
  toast: { face: "rgba(36,31,25,0.92)", ink: "#FFF7EE" },
  /** 위기 안내의 첫 줄 */
  careFace: "#F0C27E",
  bubble: { color: "#EBDCC7", radius: 26, tail: 11, tailRight: 51 },
  /** 이용 규칙 뒤의 짙은 막 */
  rulesDim: "rgba(48,38,28,0.82)",
  line: "#EFE7DA",
  past: "#F3EEE3",
} as const;

export const wishSceneMotion = {
  /** 쪽지의 소원이 바뀌는 간격 */
  memoTurn: 10_000,
  memoFade: 500,
  /** 꽃이 물 위에서 오르내리는 한 바퀴와 높이 */
  bob: 7_000,
  bobHeight: 6,
  /** 짧게 눌렀을 때 알약 글이 돌아오는 시간 · 신고 안내가 머무는 시간 */
  shortPress: 1_500,
  toast: 3_500,
  /** 이만큼 밀면 넘긴다 */
  swipe: 40,
} as const;
