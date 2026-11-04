import type { RestRecordContent } from "./restRecord";
import { BODY_RELEASE_PHASE_LABEL, BODY_RELEASE_SECONDS } from "./bodyRelease";
import { MEDITATION_CONCEPTS } from "./meditation";
import { TREASURE_BOX_INPUT } from "./treasureBox";
import { WORRY_BOX_CHOICES, WORRY_BOX_INPUT } from "./worryBox";

/**
 * 쉼터 **설명 카드**의 문안 (2026-11-01 · 사용자가 장마다 직접 고쳤다).
 *
 * 처음 쓰는 사람에게 바바가 세 장에 걸쳐 말한다 — 1장 무엇을 하는 곳인지 · 2장 어떻게 하는지 ·
 * 3장 하고 나면 무엇이 달라지는지. 한 장에 말풍선 하나만 둔다. 처음 문안(2026-10-12)은 소개 ·
 * 「이럴 때 좋아요」 · 「이렇게 해요」를 한 장에 모아 130~170자가 한 화면에 섰고, 3초 안에 읽히지
 * 않았다. 장마다 무엇을 말할지와 문구는 깃 밖 `analysis/2026-11-01-rest-guide-card/copy.md` 에서
 * 사용자가 정했다.
 *
 * 말풍선의 `\n` 은 사용자가 끊은 자리다 — 폭에 맡기지 않고 그대로 끊는다.
 *
 * 장마다 **예시 칸**(`example`)이 붙을 수 있다 — 글로 설명하는 대신 무엇을 누르고 무엇을 적는지
 * 보여 준다. 대개 1장이고, 걱정상자는 1장에 「적어서 상자에 넣기」, 2장에 고르는 두 길을 나눠
 * 보여 준다(한 장에 다 두니 어색했다 · 2026-11-01 사용자). 걱정상자 · 보물함의 예시 글은 입력칸의
 * 예시와 같은 말이고, 선택지 · 부위 이름도 그 쉼터가 쓰는 말을 그대로 가져온다. 그림은 디자인
 * 몫이라 `GuideCard` 가 쉼터마다 고른다.
 */
export type RestGuideExample = {
  /** 적는 쉼터의 예시 한 줄 — 상자 · 보물함 그림으로 들어간다 */
  note?: string;
  /** 그림 칸마다 붙는 두 줄 — 무엇(작게) · 동작(크게). 그림은 이 순서대로 */
  steps?: readonly { what: string; act: string }[];
  /** 작은 알약들 */
  chips?: readonly string[];
  /** 고르는 길 — 그림 · 이름 카드가 나란히 선다(걱정상자의 맡겨두기 · 흘려보내기) */
  choices?: readonly string[];
};

export type RestGuidePage = { text: string; example?: RestGuideExample };

export type RestGuide = { pages: readonly [RestGuidePage, RestGuidePage, RestGuidePage] };

const seconds = (phase: keyof typeof BODY_RELEASE_SECONDS) => `${BODY_RELEASE_SECONDS[phase]}초`;

export const REST_GUIDES: Record<RestRecordContent, RestGuide> = {
  wish: {
    pages: [
      {
        text: "다른 사람 소원이 떠 있어요.\n꾸욱 눌러 같이 빌어 봐요.",
        example: { note: "우리 강아지가 오래 건강하면 좋겠어요" },
      },
      {
        text: "내 소원은 하루에 하나 띄워요.\n익명으로 7일 동안 보여요.",
        example: { note: "내일 면접에서 떨지 않으면 좋겠어요" },
      },
      { text: "누가 내 소원을 같이 빌면\n내 소원에서 알려줄게요." },
    ],
  },
  sense_pond: {
    pages: [
      {
        text: "눈에 보이는 것, 들리는 소리, 몸에 닿는 느낌들을 찾아봐요.",
        example: {
          steps: [
            { what: "보이는 것", act: "톡 × 3" },
            { what: "들리는 소리", act: "톡 × 2" },
            { what: "몸에 닿는 느낌", act: "꾸욱 × 1" },
          ],
        },
      },
      { text: "찾을 때마다 아래 버튼을 톡 눌러요.\n몸에 닿는 느낌은 꾸욱 눌러요." },
      { text: "머리가 복잡할 때 1분이면 돼요.\n생각이 좀 가라앉아요." },
    ],
  },
  worry_box: {
    pages: [
      { text: "머리에 맴도는 걱정을 적어봐요.", example: { note: WORRY_BOX_INPUT.placeholder } },
      {
        text: "걱정을 상자에 넣은 다음,\n잠시 맡겨둘지 흘려보낼지 골라요.",
        example: {
          choices: WORRY_BOX_CHOICES.map((c) => c.title),
        },
      },
      { text: "맡겨둔 걱정은 나중에 다시 꺼내 봐요.\n흘려보낸 건 바로 사라져요." },
    ],
  },
  treasure_box: {
    pages: [
      {
        text: "오늘 좋았던 순간이나 해낸 일을\n한 줄 적어요.",
        example: { note: TREASURE_BOX_INPUT.placeholder },
      },
      { text: "보물 같은 순간을\n제가 보물함에 넣어 둘게요." },
      { text: "힘든 날에 돌아와서\n보물을 다시 꺼내봐요." },
    ],
  },
  body_release: {
    pages: [
      {
        text: "저를 따라서 손부터 다리까지 하나씩 풀어 봐요.",
        example: {
          steps: [
            { what: BODY_RELEASE_PHASE_LABEL.tense, act: `${seconds("tense")} 꽉` },
            { what: BODY_RELEASE_PHASE_LABEL.release, act: `${seconds("release")} 툭` },
          ],
          // 부위 이름(`BODY_RELEASE_PARTS`)의 앞 낱말만 — 알약 넷이 한 줄에 서야 한다
          chips: ["손", "어깨", "얼굴", "다리"],
        },
      },
      { text: "5초 동안 힘을 주고,\n10초 동안 힘을 풀어요." },
      { text: "힘을 줬다 풀면 굳어 있던\n몸이 풀리는 게 느껴져요." },
    ],
  },
  // 3장이 다른 쉼터와 다르다 — 무엇이 달라지는지 말하지 않는다. 명상은 효과를 약속하지 않는다(`meditation.ts`)
  meditation: {
    pages: [
      {
        text: "마음에 맞는 풍경을 골라\n3분 동안 잠시 머물러요.",
        example: { chips: MEDITATION_CONCEPTS.map((c) => c.name) },
      },
      { text: "안내 음성과 자막을 따라가요.\n음성은 끌 수 있어요." },
      { text: "잠시 멈춰 지금의 나를 살펴봐요.\n불편하면 언제든 멈춰도 괜찮아요." },
    ],
  },
};

/** 3분 명상 설명 카드의 마지막 장에서 콘텐츠 정보(참고한 실습 · 출처)로 가는 길 */
export const REST_GUIDE_MEDITATION_INFO = "참고한 실습 보기";

/** 마지막 장이 아닌 장의 버튼 */
export const REST_GUIDE_NEXT = "다음";
/** 마지막 장의 버튼 — 처음 저절로 뜰 때는 시작하는 말, 「?」로 다시 열었을 때는 알았다는 말 */
export const REST_GUIDE_CLOSE = { first: "시작할게요", again: "알겠어요" } as const;
