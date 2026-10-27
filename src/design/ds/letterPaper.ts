/**
 * 바바의 편지 종이(`features/letter/ui/LetterPaper` · 일기 상세 미리보기가 같이 쓴다).
 *
 * 종이는 프로토(`proto-v2.html` 의 `.lpaper`)의 크림 한 색이다. 처음엔 일기 확인 메모지 색
 * (`diaryMemo.diary.paper` `#FAF5EC`)을 빌려 썼는데, 화면 바탕(`background.normal` `#F7F4ED`)과
 * 밝기가 거의 같아 외곽선이 없으면 한 장으로 보이지 않았다. 프로토 색은 바탕보다 한 단 밝고,
 * 일기 상세에서 바로 아래 놓이는 바람 카드(`background.elevated`)와도 결이 맞는다.
 */
import { secondary, withAlpha } from "./color";

export const letterPaper = {
  paper: "#FFFCF4",
  /**
   * 형광펜 — 인용(사용자가 어제 한 말)에 칠한다. 꽉 찬 꿀색을 그대로 깔면 여러 줄일 때 노란 판처럼
   * 보이고 그 아래 밑줄도 덮는다. 반쯤 비치게 해 밑줄이 살짝 보이고 「칠한 자국」처럼 읽히게 한다
   */
  highlight: withAlpha(secondary.normal, 0.5),
  /** 읽는 부분과 고르는 부분을 가르는 점선의 굵기 */
  foldWidth: 1.5,
  /** 작은 일 줄 앞의 동그라미 지름 */
  check: 20,
  /**
   * 일기 상세의 편지 입구 — 노트에 테이프로 붙인 쪽지(`LetterPreviewCard`). 종이가 살짝 기울고,
   * 안 읽었으면 오른쪽 위 귀가 접혀 있다. 접힌 귀는 크라프트지 색으로 뒷면이 보이게 한다.
   */
  note: {
    tilt: "-1.2deg",
    polaroid: "#FFFFFF",
    polaroidTilt: "2.5deg",
    dogEar: 22,
    dogEarFill: "#E6D2AC",
  },
} as const;
