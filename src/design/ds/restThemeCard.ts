/**
 * 쉼터 테마 카드(`components/rest/RestThemeCard`)의 값 — 카드 틀은 하나이고 콘텐츠마다 다른 것은 아래쪽 종이 색뿐이다.
 * 그림은 값이 아니라 파일이라 부품 쪽 표(`restThemes.ts`)에 있다. 콘텐츠가 늘면 두 곳에 한 줄씩 더한다.
 *
 * 글자가 얹히는 면이라 전부 옅은 색이다 — 잉크와의 대비는 `__tests__/contrast.test.ts` 가 고정한다.
 */
export const restThemeCard = {
  size: {
    /** 그림 창 높이 — 쉼터 세계가 보이는 자리 */
    window: 102,
    /** 칸 사이 */
    gap: 14,
    captionPaddingX: 12,
    captionPaddingY: 10,
    /** 이름 ↔ 속말 · 속말 ↔ 시간 — 세 줄이 한 덩어리로 붙어 보이지 않게(2026-11-08) */
    whenGoodMarginTop: 2,
    durationMarginTop: 4,
    noteMarginTop: 3,
    notePaddingX: 5,
  },
  /** 아래에 더 있다는 표시 — 스크롤 영역 맨 아래가 탭바 쪽으로 흐려지는 높이 */
  moreFade: 36,
  moreFadeOpacity: 0.7,
  /** 바람카드 — 왼쪽 글 · 오른쪽 작은 카드 미리보기 */
  wish: {
    copyGap: 2,
    copyPaddingY: 9,
    linkTilt: "-1deg",
    underline: "#E3B65A",
    preview: {
      // 손글씨 14 세 줄이 들어가게 키웠다(2026-11-08 · 최근 카드 글을 적는다)
      seatWidth: 132,
      seatHeight: 116,
      width: 104,
      height: 98,
      radius: 8,
      padding: 5,
      lineHeight: 4,
      lineGap: 5,
      frontTilt: "4deg",
      backTilt: "-7deg",
    },
  },
  paper: {
    sensePond: "#DFECDD",
    worryBox: "#F1E3CF",
    treasureBox: "#F8E9B8",
    bodyRelease: "#F9DFC8",
    meditation: "#DCE7EF",
    weeklyHappiness: "#DBEBE8",
    wish: "#E3E0EE",
  },
} as const;
