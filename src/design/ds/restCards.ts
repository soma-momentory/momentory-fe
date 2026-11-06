import { homeV2 } from "./homeV2";

/**
 * 날짜별 바람카드(`R2` · `app/rest/cards`)의 값 — 홈 메모와 같은 종이 위에 달력 한 장과 쪽지 한 장.
 *
 * 탭 화면처럼 390 비례 캔버스 안에 있어서 **여기 숫자가 그대로 그리는 크기**다(`archiveType` 과 같다).
 * 종이 · 잉크는 홈 값을 그대로 빌려 와서 홈이 바뀌면 함께 바뀐다. 이 화면만의 색은 문구 둘(클립 · 압정)뿐이고,
 * 글자가 얹히지 않는 장식이다. 글자 대비는 `__tests__/contrast.test.ts` 가 고정한다.
 */
export const restCards = {
  color: {
    paper: homeV2.color.card,
    edge: homeV2.color.bubbleBorder,
    shadow: homeV2.color.shadow,
    /** 공책 줄 */
    rule: homeV2.color.emptyBorder,
    ink: homeV2.color.ink,
    muted: homeV2.color.muted,
    /** 「작은 행동」 이름의 꿀색 형광 */
    highlight: homeV2.color.today,
    /** 쪽지를 집은 쑥색 종이 클립 — 장식 */
    clip: "#7E9071",
    /** 달력을 꽂은 꿀색 압정 — 장식 */
    pin: "#E4B95B",
    pinShine: "#FFF3CF",
  },
  font: homeV2.font,
  type: {
    title: { fontSize: 22, lineHeight: 28 },
    date: { fontSize: 22, lineHeight: 28 },
    dateNote: { fontSize: 16, lineHeight: 22 },
    fieldLabel: { fontSize: 16, lineHeight: 26 },
    fieldValue: { fontSize: 18, lineHeight: 26 },
    status: { fontSize: 16, lineHeight: 22 },
    reflection: { fontSize: 17, lineHeight: 24 },
    empty: { fontSize: 17, lineHeight: 26 },
  },
  size: {
    paddingX: 20,
    /** 머리 줄과 달력 사이 */
    headerGap: 14,
    /** 달력과 쪽지 사이 — 클립이 위로 튀어나올 자리까지 */
    sheetGap: 24,
    /** 맨 아래 숨 쉴 자리 */
    bottom: 32,
    sheetPaddingX: 14,
    sheetPaddingTop: 16,
    sheetPaddingBottom: 12,
    fieldPaddingY: 5,
    /** 쪽지 머리 줄과 첫 공책 줄 사이 */
    headGap: 6,
    /** 상태 줄 위 — 공책 줄에서 떼어 놓는다 */
    footGap: 12,
    /** 날짜가 클립을 비켜서는 만큼 */
    headIndent: 44,
    clip: { width: 22, height: 48, top: -15, left: 22 },
    pin: { size: 26, top: -10 },
  },
  /** 쪽지만 살짝 기운다 — 달력은 눌러야 하는 격자라 곧게 둔다 */
  tilt: { note: "-0.6deg" },
} as const;
