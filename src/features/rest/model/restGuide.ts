import type { RestContentId } from "./contents";
import type { RestRecordContent } from "./restRecord";

/**
 * 쉼터 **설명 카드**의 문안 (2026-10-12 · 사용자와 정함).
 *
 * 처음 쓰는 사람은 그 쉼터를 왜 하는지, 어떻게 하는지 모른다. 처음 들어간 쉼터에서 카드 한 장이
 * 세 가지를 말한다 — 한 줄 소개(`tagline`) · 이럴 때 좋아요(`why`) · 이렇게 해요(`steps`).
 *
 * `why` 는 **우리가 이 쉼터를 왜 들였는지**다 — 언제 좋은지, 하고 나면 무엇이 달라지는지, 어디서 빌려 온
 * 방법인지(그라운딩 · 점진적 근육 이완). 평가 · 칭찬을 하지 않는다(`DESIGN.md` 「쉼 콘텐츠 공통 규칙」 8).
 * 이름과 아이콘은 쉼터 탭 카드와 같은 것을 쓴다(`contents.ts` — `id`).
 */
export type RestGuide = {
  id: RestContentId;
  tagline: string;
  why: string;
  steps: readonly [string, string, string];
  /** 덧붙이는 작은 한 줄 — 걱정상자는 적은 걱정이 남지 않는다는 것 */
  note?: string;
};

export const REST_GUIDES: Record<RestRecordContent, RestGuide> = {
  sense_pond: {
    id: "sensePond",
    tagline: "지금 여기, 내 감각으로 돌아오는 쉼",
    why: "생각이 복잡할 때 좋아요. 생각에서 잠시 멀어져 지금 주변에서 보이는 것, 들리는 것, 몸에 느껴지는 것을 찾다 보면 머릿속이 조용해져요. 마음을 가라앉힐 때 쓰는 ‘그라운딩’을 짧게 옮겼어요.",
    steps: [
      "보이는 것 3개를 찾을 때마다 연못을 톡 건드려요",
      "들리는 소리 2개도 같은 방법으로 찾아요",
      "몸에 닿는 감각 1개는 연못을 꾸욱 눌러요",
    ],
  },
  worry_box: {
    id: "worryBox",
    tagline: "머릿속 걱정을 잠시 내려놓는 곳",
    why: "같은 걱정이 머릿속에서 맴돌 때 좋아요. 글로 꺼내 두면 한 발 떨어져 볼 수 있고, 잠시 내려놓을 틈이 생겨요.",
    steps: [
      "가장 마음에 걸리는 걱정을 적어요",
      "카피바라에게 건네면 상자에 담아 줘요",
      "잠시 맡겨둘지, 흘려보낼지 골라요",
    ],
    note: "흘려보낸 걱정은 어디에도 남지 않아요. 맡겨둔 걱정만 나중에 다시 볼 수 있어요",
  },
  treasure_box: {
    id: "treasureBox",
    tagline: "오늘의 작은 순간을 모아 두는 곳",
    why: "하루가 힘들게 느껴질 때 좋아요. 좋았던 순간은 금방 잊혀서, 적어 두면 하루를 조금 다르게 기억하게 돼요.",
    steps: [
      "오늘 소중했던 순간이나 해낸 일을 한 줄 적어요",
      "카피바라가 보물함에 넣어 둬요",
      "지난 보물은 오른쪽 위 목록에서 다시 볼 수 있어요",
    ],
  },
  body_release: {
    id: "bodyRelease",
    tagline: "몸에 쌓인 긴장을 천천히 푸는 1분",
    why: "어깨가 굳고 몸이 긴장될 때 좋아요. 일부러 힘을 줬다 풀면 힘이 빠지는 느낌을 알아채기 쉬워요. 긴장을 푸는 ‘점진적 근육 이완’을 1분으로 줄였어요.",
    steps: [
      "손 · 어깨 · 얼굴 · 다리 순서로 따라가요",
      "5초 동안 힘을 꽉 주고, 10초 동안 천천히 풀어요",
      "카피바라와 해를 따라 숨을 쉬어요",
    ],
  },
};

export const REST_GUIDE_WHY = "이럴 때 좋아요";
export const REST_GUIDE_HOW = "이렇게 해요";
/** 닫는 알약 — 처음 저절로 뜰 때는 시작하는 말, 「?」로 다시 열었을 때는 알았다는 말 */
export const REST_GUIDE_CLOSE = { first: "시작할게요", again: "알겠어요" } as const;
