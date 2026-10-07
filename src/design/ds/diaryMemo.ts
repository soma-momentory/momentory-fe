/**
 * 일기 확인(`C6`) 메모지 — 사용자 시안(2026-10-07 · HTML 미리보기에서 함께 골랐다).
 *
 * 일기는 **아이보리 수채화지 한 장**, 그날 일정은 그 아래 붙인 **연노랑 수채화지 한 장**이다.
 * 두 장 다 모눈 없이 오돌토돌한 결만 있고, 제목은 종이가 아니라 **테이프 위에** 손글씨로 적는다.
 *
 * - 종이 결은 화면이 그리지 않는다 — `scripts/make-memo-paper.py` 가 **이 파일의 `paper` 색을 넣어
 *   구운 타일**(`assets/diary/memo-paper-*.png`)을 깔기만 한다. 색을 바꾸면 그 스크립트도 같이 고친다
 * - 테이프는 **불투명 · 그림자 없음 · 주름 없음**이다(시안에서 하나씩 뺐다). 남은 것은 찢긴 끝 ·
 *   위쪽 광택 · 결 방향의 가는 섬유뿐이다
 */
import { background } from "./color";

export const diaryMemo = {
  diary: {
    paper: "#FAF5EC",
    tape: "#D8C29D",
    tapeInk: "#4A3826",
  },
  schedule: {
    paper: "#F5E8B8",
    tape: "#B5CFA3",
    tapeInk: "#33452F",
  },
  /** 테이프 위쪽 광택과 섬유 — 흰 빛을 옅게 얹는다 */
  tapeSheen: "#FFFFFF",
  /** 테이프 아래쪽이 아주 조금 가라앉는 자리 */
  tapeShade: "#5A3E1C",
  /** 종이 그림자 — 오른쪽 아래로 얕게 진다(테이프에는 그림자가 없다) */
  paperShadow: "3px 10px 18px -10px rgba(90, 66, 36, 0.42), 0px 1px 2px rgba(90, 66, 36, 0.08)",
  /** 버튼 위로 본문이 이어진다는 표시 — 화면 바탕색으로 흐려진다 */
  fade: background.normal,
  /** 종이 결 타일 한 장의 크기(dp) — `scripts/make-memo-paper.py` 의 `TILE_DP` 와 같다 */
  paperTile: 160,
  /** 종이 모서리 — 수채화지라 거의 각진다 */
  radius: 3,
  /** 일정 메모는 오른쪽으로 살짝 기울여 붙인다 */
  scheduleTilt: "1.6deg",
  /** 테이프는 둘 다 왼쪽으로 살짝 */
  tapeTilt: "-2deg",
  /** 찢긴 끝이 들쭉날쭉한 깊이(dp) */
  tornDepth: 4.5,
} as const;
