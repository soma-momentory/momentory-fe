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
  /**
   * 2026-11-10 · 사용자 요청(「글씨가 작아 읽기 힘들다」) — 쪽지 글자를 한두 단씩 올렸다.
   * 손글씨는 글자 몸이 작아 같은 크기의 고딕보다 작게 읽힌다. 값(20)이 이름(17)보다 크게 서는 위계는 그대로다
   */
  type: {
    title: { fontSize: 22, lineHeight: 28 },
    date: { fontSize: 24, lineHeight: 30 },
    dateNote: { fontSize: 17, lineHeight: 24 },
    fieldLabel: { fontSize: 17, lineHeight: 30 },
    fieldValue: { fontSize: 20, lineHeight: 30 },
    status: { fontSize: 18, lineHeight: 24 },
    reflection: { fontSize: 19, lineHeight: 28 },
    empty: { fontSize: 18, lineHeight: 28 },
  },
  size: {
    /** 화면 좌우 — 20 은 쪽지 그림자 · 기울기까지 화면 끝에 붙어 보였다(2026-11-10 · 사용자 요청) */
    paddingX: 28,
    /** 머리 줄과 달력 사이 */
    headerGap: 14,
    /** 달력과 쪽지 사이 — 클립이 위로 튀어나올 자리까지 */
    sheetGap: 24,
    /** 맨 아래 숨 쉴 자리 */
    bottom: 32,
    sheetPaddingX: 20,
    sheetPaddingTop: 18,
    /** 쪽지 아래 — 손으로 오린 윤곽과 버튼 밑 그림자(3)가 먹는 자리까지 둔다. 16 은 버튼이 종이 끝에 붙어 보였다 */
    sheetPaddingBottom: 26,
    fieldPaddingY: 6,
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
