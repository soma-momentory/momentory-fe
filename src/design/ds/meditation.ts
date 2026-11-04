/**
 * Momentory DS — 쉼터 3분 명상의 **크기와 시간과 자리** (2026-11-04 · Design 시안 값).
 * 색은 `color.ts` 의 `meditation`. 3분 · 자막 시각은 제품 규칙이라 도메인에 있다
 * (`features/rest/model/meditation.ts`).
 */
export const meditationSize = {
  /** 풍경 고르기 칸 하나의 폭 상한 · 동그라미 · 글리프 */
  conceptCell: 68,
  conceptLabel: 80,
  conceptCircle: 54,
  conceptGlyph: 26,
  /** 재생 조작 — 가운데 큰 원 · 옆 작은 원(음성 안내 · 멈춤) */
  mainControl: 76,
  mainGlyph: 26,
  sideControl: 54,
  sideGlyph: 22,
  voiceGlyph: 24,
  alertGlyph: 22,
  sideSlot: 72,
  controlGap: 28,
  /** 자막의 낱말 사이 — 낱말을 칸으로 세워 생긴 자리라 글자 사이 공백 대신 쓴다 */
  cueWordGap: 6,
  /** 멈춤 확인 카드의 폭 상한 */
  stopCard: 318,
  /** 콘텐츠 정보 시트가 화면 위에서 떨어진 거리 */
  infoTop: 120,
} as const;

export const meditationLayout = {
  /** 위쪽 원 윗변에서 제목 · 시계까지 — 시안의 52 → 120 · 52 → 132 */
  titleBelowTop: 68,
  clockBelowTop: 80,
  /**
   * 자막의 첫 줄 높이(화면 높이 대비) — 다섯 풍경 모두 같은 자리다. 파도의 바다가 시작되는 58.8% 보다
   * 살짝 아래에 맞췄다(2026-11-04 · 실기기 피드백). 조작 위로 `cueMaxHeight` 를 못 남기는 작은 화면에서는
   * 그만큼 올라간다
   */
  cueTopRatio: 0.605,
  /** 가장 긴 자막(다섯 줄)의 높이 — 조작에 닿지 않게 비워 두는 자리 */
  cueMaxHeight: 160,
  /** 풍경 고르기와 시작하기 사이 */
  pickerGap: 32,
  /** 음성 로딩 실패 카드 · 버튼 사이 */
  errorGap: 14,
  /** 조작 아래 여백 — 시안의 58 에서 안전 영역 몫을 뺀다 */
  controlsBottom: 24,
} as const;

export const meditationMotion = {
  /** 풍경을 고를 때 그림이 겹쳐 바뀌는 시간 — 툭 갈리면 깜빡임으로 읽힌다 */
  sceneSwap: 400,
  /** 자막이 옅어졌다 돌아오는 시간 */
  cueOut: 400,
  cueIn: 700,
  /** 음성이 끝난 뒤 자막이 천천히 사라지는 시간 */
  cueHide: 1_000,
  /** 시계가 화면에 알리는 간격 */
  tick: 250,
} as const;
