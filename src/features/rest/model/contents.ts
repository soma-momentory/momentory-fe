/**
 * 쉼터의 **쉼 콘텐츠** 네 가지 (2026-09-02).
 *
 * `R1` 진입 화면에서 바람카드 아래 2×2 로 보여 주는 항목이다. 이름·설명은 제품
 * 문안이라 디자인이 아니라 **도메인**에 둔다(`CLAUDE.md` 「디자인 파일에 제품 규칙을
 * 넣지 않는다」). 순서는 화면에 놓이는 순서 그대로다 — 왼쪽 위부터 읽는 순서.
 *
 * 화면이 생긴 콘텐츠만 `route` 를 든다 — 감각연못은 2026-09-03 에 첫 단계가
 * 생겼다(`app/rest/sense-pond.tsx`). 나머지 셋은 아직 화면이 없어 `route` 가 없고
 * 격자에서 눌리지 않는다(`RestContentGrid`).
 */
import type { IconName } from "@/components/ds";

export type RestContentId = "sensePond" | "worryBox" | "treasureBox" | "bodyRelease";

export type RestContent = {
  id: RestContentId;
  title: string;
  /**
   * 두 줄로 **미리 끊어 둔다**(`\n`). 카드 폭(반 폭)에 맡기면 한글이 글자 단위로
   * 접혀 「맡/겨봐요」처럼 낱말 가운데가 갈린다 — 읽는 리듬이 끊기는 자리라
   * 의미 단위로 끊는다(2026-09-02).
   */
  description: string;
  /** 카드 우상단의 작은 시각 포인트 — 기능 메뉴가 아니라 **공간**으로 읽히게 */
  icon: IconName;
  /**
   * 아직 화면이 없는 콘텐츠임을 카드에 적는 한 줄. `route` 가 없는 칸이 왜 눌리지
   * 않는지 **카드 안에서** 알려 준다 — 눌러 보고서야 아는 일이 없게(2026-09-07).
   *
   * 제목 옆이 아니라 **아래 줄**이다. 반 폭 카드에서 「걱정상자 (개발 중이에요)」는
   * 제목과 아이콘 사이를 넘겨 제목이 글자 단위로 접힌다.
   */
  note?: string;
  /** 여는 화면. **없으면 아직 화면이 없다** — 카드가 눌리지 않는다 */
  route?: "/rest/sense-pond" | "/rest/body-release" | "/rest/worry-box";
};

export const REST_CONTENTS: readonly RestContent[] = [
  {
    id: "sensePond",
    title: "감각연못",
    description: "보이는 것과 들리는 소리를\n하나씩 찾아봐요",
    icon: "wave",
    route: "/rest/sense-pond",
  },
  {
    id: "worryBox",
    title: "걱정상자",
    description: "걱정을 적고\n잠시 상자에 맡겨봐요",
    icon: "box",
    route: "/rest/worry-box",
  },
  {
    id: "treasureBox",
    title: "오늘의 보물함",
    note: "(개발 중이에요)",
    description: "오늘 잘한 일이나\n소중한 순간을 담아봐요",
    icon: "treasure",
  },
  {
    id: "bodyRelease",
    title: "몸에 힘 빼기",
    description: "몸에 힘을 줬다가\n천천히 풀어봐요",
    icon: "capybara-rest",
    route: "/rest/body-release",
  },
];

/** 격자의 안내 문장 — 제목이 아니라 **권유**라 물음표·명령형을 쓰지 않는다 */
export const REST_CONTENTS_PROMPT = "지금 나에게 맞는 쉼을 골라보세요";
