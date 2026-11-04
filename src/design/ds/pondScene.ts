/**
 * Momentory DS — 감각연못의 장면 값 (2026-11-04 · 시안 `analysis/2026-11-03-rest-list-pond/v7.html`).
 *
 * 자리는 전부 기준 화면(393 × 852)에 그림을 `cover` 로 깐 좌표다. 다른 크기의 화면에서는
 * `components/rest/pond/layout.ts` 가 같은 그림 위 자리로 옮긴다. 그림이 바뀌면 다시 잰다.
 */
export const pondScene = {
  /** 기준 화면에서 그림이 차지하는 크기 — 941 × 1672 그림을 높이 852 에 맞춘 값 */
  art: { width: 479.5, height: 852 },
  /** 바바 몸의 세로 ÷ 가로 */
  babaAspect: 1.378,
  /** 시작 화면의 물가 자리 — 발밑 가운데와 폭 */
  shore: { x: 72, y: 633, width: 104 },
  /** 연잎 일곱 장의 가운데와 크기 비율 — 앞에서 뒤로 멀어진다 */
  path: [
    { x: 196, y: 662, scale: 1 },
    { x: 288, y: 612, scale: 0.92 },
    { x: 196, y: 566, scale: 0.84 },
    { x: 150, y: 520, scale: 0.76 },
    { x: 208, y: 482, scale: 0.7 },
    { x: 296, y: 448, scale: 0.66 },
    { x: 188, y: 410, scale: 0.62 },
  ],
  /** 연잎 위 바바의 기준 폭 · 발이 연잎 가운데에서 내려앉는 깊이 */
  babaOnPad: { width: 86, sink: 8 },
  /** 연잎의 기준 폭 · 셋째마다 작은 그림을 쓸 때의 비율 */
  pad: { width: 112, smallScale: 0.78 },
  /** 끝 화면 — 마지막 연잎이 연꽃으로 바뀐 폭과, 그 위 바바의 발밑 · 폭 */
  bloom: { width: 170, baba: { x: 149, y: 418, width: 80 } },
  /** 그림의 가로 ÷ 세로 */
  artRatio: { pad1: 2.319, pad2: 2.324, pad3: 2.253, bloom: 2.319 },
  /** 위쪽 크림빛 — 모든 화면에 같은 짙기로 깐다(시작 · 진행 · 끝) */
  veil: {
    heightRatio: 0.4,
    stops: [
      { offset: 0, opacity: 0.86 },
      { offset: 0.6, opacity: 0.55 },
      { offset: 1, opacity: 0 },
    ],
  },
  /** 뒤로가기 원과 말풍선 사이 — 말풍선 위로 튀어나온 감각 표가 들어갈 자리 */
  bubbleGap: 40,
  bubble: { color: "#EBDCC7", radius: 26, side: 26, tail: 11 },
  /** 감각 표의 원 — 말풍선 위 · 시작 화면 */
  mark: { bubble: 72, cover: 54, icon: 0.74, stroke: 2.5, depth: 3, shadow: "rgba(58,38,20,0.28)" },
  /** 말풍선 글 · 시작 화면 설명의 손글씨 크기 */
  question: { fontSize: 23, lineHeight: 30 },
  description: { fontSize: 18, lineHeight: 27 },
  /** 꾸욱 누르는 동안 알약을 채우는 색의 짙기 */
  holdFill: 0.45,
  /** 물결 층이 좌우로 흔들리는 폭 · 바바가 내려앉을 때 연잎이 잠기는 깊이 · 뛰는 높이(몸 높이 비율) */
  waterSway: 5,
  padDip: 6,
  hopHeight: 0.42,
  /** 알약 아래 여백 · 양옆 여백 */
  pillSide: 24,
  pillBottom: 12,
  /** 끝 화면의 빛 알갱이 — 바바 머리 위 기준(dp · y 는 아래가 +) */
  mote: {
    color: "#FFF1D2",
    list: [
      { x: -24, y: 0, rise: 110, drift: -6, size: 8 },
      { x: 10, y: 8, rise: 120, drift: 4, size: 7 },
      { x: 34, y: -2, rise: 100, drift: 8, size: 8 },
      { x: -8, y: 14, rise: 130, drift: -4, size: 6 },
      { x: 22, y: 12, rise: 110, drift: 6, size: 7 },
      { x: -30, y: 18, rise: 100, drift: -8, size: 6 },
      { x: 2, y: 4, rise: 125, drift: 2, size: 8 },
      { x: 28, y: 20, rise: 105, drift: 5, size: 6 },
    ],
  },
} as const;

/** 움직임(ms) — 쉼터 공통 규칙 6 「느리게」 */
export const pondSceneMotion = {
  /** 바바가 다음 연잎으로 건너가는 시간 — 뛰어오르기와 같다 */
  hop: 1100,
  /** 꾸욱 누르기가 하나로 세어지는 시간 — 누르는 동안 알약이 이만큼 걸쳐 차오른다 */
  hold: 1200,
  /** 찾았어요를 누르고 다음 손짓을 받기까지 — 건너가는 것을 다 보게 한다 */
  landing: 1300,
  turn: 500,
  /** 갸웃하는 전환 */
  lean: 700,
  /** 평소 숨쉬기 · 눈 깜빡임(간격 · 떨림 · 감은 시간) */
  breath: 4800,
  blink: { every: 3200, jitter: 2400, shut: 110 },
  /** 들을 때 귀 쫑긋 한 주기 */
  ear: 2600,
  /** 연잎이 물에 흔들리는 주기 */
  bob: 5200,
  /** 물결 층이 번갈아 비치는 한 바퀴 · 좌우로 흔들리는 한 바퀴 — 맞물리지 않게 서로 다르다 */
  water: 7800,
  waterSway: 6400,
  /** 내려앉는 순간 연잎이 잠기는 시간(뛰기 시작부터 · 잠기는 데) */
  padDip: { after: 860, down: 150 },
  /** 말풍선 · 제목이 스며 나오는 시간과 올라오는 거리 */
  appear: { duration: 420, rise: 10 },
  /** 일찍 손을 뗐을 때 알약이 흔들리는 시간 */
  miss: 350,
  mote: { duration: 2800, stagger: 240 },
} as const;
