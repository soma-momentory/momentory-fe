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
    captionPaddingY: 9,
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
      seatWidth: 118,
      seatHeight: 106,
      width: 80,
      height: 88,
      radius: 8,
      padding: 5,
      sceneHeight: 46,
      sceneRadius: 4,
      lineHeight: 4,
      lineGap: 5,
      frontTilt: "4deg",
      backTilt: "-7deg",
      tapeTop: -9,
      tapeWidth: 40,
      tapeHeight: 15,
    },
  },
  paper: {
    sensePond: "#DFECDD",
    worryBox: "#F1E3CF",
    treasureBox: "#F8E9B8",
    bodyRelease: "#F9DFC8",
    meditation: "#DCE7EF",
    wish: "#E3E0EE",
  },
} as const;
