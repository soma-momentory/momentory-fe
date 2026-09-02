/**
 * 쉼터의 **쉼 콘텐츠** 네 가지 (2026-09-02).
 *
 * `R1` 진입 화면에서 행동카드 아래 2×2 로 보여 주는 항목이다. 이름·설명은 제품
 * 문안이라 디자인이 아니라 **도메인**에 둔다(`CLAUDE.md` 「디자인 파일에 제품 규칙을
 * 넣지 않는다」). 순서는 화면에 놓이는 순서 그대로다 — 왼쪽 위부터 읽는 순서.
 *
 * 각 콘텐츠의 **실제 화면은 아직 없다** — 이 목록은 「무엇이 있는가」만 말하고,
 * 어디로 가는지는 화면이 생길 때 여기에 라우트를 더한다.
 */
export type RestContentId = "sensePond" | "worryBox" | "treasureBox" | "bodyRelease";

export type RestContent = {
  id: RestContentId;
  title: string;
  description: string;
};

export const REST_CONTENTS: readonly RestContent[] = [
  {
    id: "sensePond",
    title: "감각연못",
    description: "보이는 것과 들리는 소리를 하나씩 찾아봐요",
  },
  {
    id: "worryBox",
    title: "걱정상자",
    description: "걱정을 적고 잠시 상자에 맡겨봐요",
  },
  {
    id: "treasureBox",
    title: "오늘의 보물함",
    description: "오늘 잘한 일이나 소중한 순간을 담아봐요",
  },
  {
    id: "bodyRelease",
    title: "몸에 힘 빼기",
    description: "몸에 힘을 줬다가 천천히 풀어봐요",
  },
];

/** 격자의 안내 문장 — 제목이 아니라 **권유**라 물음표·명령형을 쓰지 않는다 */
export const REST_CONTENTS_PROMPT = "지금 나에게 맞는 쉼을 골라보세요";
