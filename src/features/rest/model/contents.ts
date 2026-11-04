/**
 * 쉼터의 **쉼 콘텐츠** 여섯 가지 (2026-09-02 · 3분 명상과 소원 연꽃은 2026-11-04).
 *
 * `R1` 진입 화면에서 바람카드 아래 두 칸씩 보여 주는 항목이다. 이름·설명은 제품
 * 문안이라 디자인이 아니라 **도메인**에 둔다(`CLAUDE.md` 「디자인 파일에 제품 규칙을
 * 넣지 않는다」). 순서는 화면에 놓이는 순서 그대로다 — 왼쪽 위부터 읽는 순서.
 *
 * 화면이 생긴 콘텐츠만 `route` 를 든다 — 감각연못은 2026-09-03 에 첫 단계가
 * 생겼다(`app/rest/sense-pond.tsx`). 나머지 셋은 아직 화면이 없어 `route` 가 없고
 * 격자에서 눌리지 않는다(`RestContentGrid`).
 */
import type { IconName } from "@/components/ds";

export type RestContentId =
  | "sensePond"
  | "worryBox"
  | "treasureBox"
  | "bodyRelease"
  | "meditation"
  | "weeklyHappiness"
  | "wish";

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
  /**
   * 걸리는 시간 — 쉼터 칸이 부담을 낮추려고 보여 준다(2026-10-12).
   * 몸에 힘 빼기는 네 부위 × 15초라 정해져 있고, 나머지 셋은 하는 사람의 속도에 따라 달라
   * **어림값**이다 — Amplitude `rest_content_completed.duration_ms` 중앙값(팀 계정 제외)이
   * 나오면 그 값으로 고친다.
   */
  duration: string;
  /** 여는 화면. **없으면 아직 화면이 없다** — 카드가 눌리지 않는다 */
  route?:
    | "/rest/sense-pond"
    | "/rest/body-release"
    | "/rest/worry-box"
    | "/rest/treasure-box"
    | "/rest/meditation"
    | "/rest/weekly-happiness"
    | "/rest/wish";
};

export const REST_CONTENTS: readonly RestContent[] = [
  {
    id: "sensePond",
    title: "감각연못",
    duration: "1~2분",
    description: "보이는 것과 들리는 소리를\n하나씩 찾아봐요",
    icon: "wave",
    route: "/rest/sense-pond",
  },
  {
    id: "worryBox",
    title: "걱정상자",
    duration: "1~2분",
    description: "걱정을 적고\n잠시 상자에 맡겨봐요",
    icon: "box",
    route: "/rest/worry-box",
  },
  {
    id: "treasureBox",
    title: "오늘의 보물함",
    duration: "1~2분",
    description: "오늘 잘한 일이나\n소중한 순간을 담아봐요",
    icon: "treasure",
    route: "/rest/treasure-box",
  },
  {
    id: "bodyRelease",
    title: "몸에 힘 빼기",
    duration: "약 1분",
    description: "몸에 힘을 줬다가\n천천히 풀어봐요",
    icon: "capybara-rest",
    route: "/rest/body-release",
  },
  {
    id: "meditation",
    title: "3분 명상",
    duration: "3분",
    description: "마음에 맞는 풍경에서\n잠시 머물러봐요",
    icon: "wave",
    route: "/rest/meditation",
  },
  // ⚠ 디자인만 들어왔다 — 적은 글이 저장되지 않아 출시 빌드에는 내보내지 않는다(`model/weeklyHappiness.ts`)
  ...(__DEV__
    ? [
        {
          id: "weeklyHappiness" as const,
          title: "주간 행복",
          duration: "2분",
          description: "한 주의 좋았던 일을\n칸마다 적어봐요",
          icon: "wave" as const,
          route: "/rest/weekly-happiness" as const,
        },
      ]
    : []),
  {
    id: "wish",
    title: "소원 연꽃",
    duration: "1분",
    description: "다른 사람 소원을 같이 빌고\n내 소원도 띄워봐요",
    icon: "wave",
    route: "/rest/wish",
  },
];

/** 격자의 안내 문장 — 제목이 아니라 **권유**라 물음표·명령형을 쓰지 않는다 */
export const REST_CONTENTS_PROMPT = "지금 나에게 맞는 쉼을 골라보세요";
