import type { RestContentId } from "@/features/rest/model/contents";

export type RestTheme = {
  /** 창을 채우는 배경 — 그 콘텐츠 안에서 쓰는 장면 그대로다 */
  scene: number;
  /** 세로 그림의 어디를 창에 보일지(`contentPosition`) */
  position?: `${number}%`;
  /** 배경 아래에 까는 땅 그림 */
  ground?: number;
  /** 장면 위에 놓는 물건 하나 */
  subject?: { source: number; width: number; height: number; bottom: number };
};

/**
 * 콘텐츠마다 **세계 하나** — 새 쉼 콘텐츠는 여기에 한 줄을 더한다(빠뜨리면 타입이 막는다).
 * 카드 구조는 `RestThemeCard` 하나뿐이라 칸마다 배치를 만들지 않는다.
 */
export const REST_THEMES: Record<RestContentId, RestTheme> = {
  sensePond: {
    scene: require("../../../assets/sensory-pond/pond.webp"),
    position: "60%",
    subject: {
      source: require("../../../assets/sensory-pond/bloom.webp"),
      width: 92,
      height: 40,
      bottom: 20,
    },
  },
  worryBox: {
    scene: require("../../../assets/worry-box/forest.webp"),
    position: "68%",
    subject: {
      source: require("../../../assets/worry-box/box-closed.webp"),
      width: 72,
      height: 70,
      bottom: 6,
    },
  },
  treasureBox: {
    scene: require("../../../assets/treasure-box/meadow.webp"),
    position: "70%",
    subject: {
      source: require("../../../assets/treasure-box/chest-closed.webp"),
      width: 68,
      height: 71,
      bottom: 6,
    },
  },
  bodyRelease: {
    scene: require("../../../assets/body-release/sky.webp"),
    position: "80%",
    ground: require("../../../assets/body-release/hill.webp"),
    subject: {
      source: require("../../../assets/body-release/capybara-calm.webp"),
      width: 64,
      height: 80,
      bottom: 4,
    },
  },
  meditation: {
    scene: require("../../../assets/meditation/wave.webp"),
    position: "47%",
  },
  wish: {
    scene: require("../../../assets/rest/wish.webp"),
  },
};

/** 바람카드 미리보기의 그림 — 콘텐츠가 아니라서 표 밖에 둔다. 쉼터의 다른 칸에 없는 장면이다 */
export const REST_WISH_SCENE = {
  scene: require("../../../assets/meditation/sunlight.webp"),
  position: "42%",
} as const;
