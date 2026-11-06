import { withAlpha } from "./color";

/**
 * 주간 행복(`app/rest/weekly-happiness.tsx`)의 값 — 청록 선으로 칸을 나눈 기록장 한 장.
 *
 * 시안(`주간행복_5a.html`)의 선 `oklch(0.62 0.07 195)` 은 글자로 쓰면 종이 위 3.12 라, 글자 · 화살표는
 * 같은 색상에서 어둡게 내린 `text` 를 쓴다(`__tests__/contrast.test.ts`).
 */
const line = "#4E9493";

export const weeklyHappiness = {
  color: {
    /** 칸을 나누는 선 — 장식(종이 위 3.12) */
    line,
    /** 제목 · 칸 이름 · 화살표 — 종이 위 5.12 */
    text: "#287070",
    /** 적은 글 — 시안의 펜 색 */
    entry: "#1F1F22",
    /** 적으려고 누른 빈 칸에만 뜨는 예시 글 */
    placeholder: "#6F675C",
    /** 지금 적고 있는 칸 */
    focus: withAlpha(line, 0.08),
  },
  size: {
    paddingX: 20,
    titlePaddingX: 6,
    titlePaddingTop: 14,
    titlePaddingBottom: 22,
    title: { fontSize: 34, lineHeight: 40 },
    weekBarHeight: 54,
    weekBarTopLine: 2.5,
    line: 2,
    arrowTouch: 44,
    arrowDisabledOpacity: 0.25,
    weekFrom: { fontSize: 24, lineHeight: 30 },
    rowMinHeight: 54,
    /** 칸 이름 자리 — 「좋았던 콘텐츠」가 한 줄에 든다 */
    labelWidth: 108,
    labelPaddingX: 6,
    dividerMarginY: 14,
    entryPaddingX: 14,
    entryPaddingY: 13,
    entry: { fontSize: 19, lineHeight: 28 },
    /** 주를 넘길 때 글이 밀려오는 거리 */
    slide: 28,
    /** 마지막 칸과 「다 적었어요」 사이 */
    doneTop: 32,
    /** 맨 아래 숨 쉴 자리 */
    bottom: 40,
  },
  motion: { pageMs: 380 },
  /** 쉼터 칸의 그림 — 화면 윗부분을 창 폭에 맞춰 줄인 값. 세 번째 줄이 창 끝에 걸려 아래로 이어져 보인다 */
  art: {
    rows: 3,
    paddingX: 10,
    paddingTop: 7,
    line: 1,
    weekBarTopLine: 1.5,
    weekBarHeight: 25,
    weekPaddingX: 3,
    week: { fontSize: 11, lineHeight: 14 },
    rowHeight: 24,
    labelWidth: 56,
    label: { fontSize: 10, lineHeight: 13 },
    dividerMarginY: 6,
  },
} as const;
