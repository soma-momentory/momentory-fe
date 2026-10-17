/** Static asset table shared by the app view and Expo Lab. Metro must see literal require paths. */
export const studioAssets = [
  {
    id: "rest-baba-sleep",
    label: "잠자는 바바",
    category: "바바 캐릭터",
    source: require("../../assets/rest/baba-sleep.webp"),
  },
  {
    id: "home-baba-idle",
    label: "홈 바바 기본",
    category: "바바 캐릭터",
    source: require("../../assets/home/capybara-idle.png"),
  },
  {
    id: "home-baba-wave",
    label: "홈 바바 인사",
    category: "바바 캐릭터",
    source: require("../../assets/home/capybara-wave.png"),
  },
  {
    id: "rest-records",
    label: "쉼터 기록",
    category: "쉼터 콘텐츠",
    source: require("../../assets/rest/rest-records.webp"),
  },
  {
    id: "rest-treasures",
    label: "쉼터 보물",
    category: "쉼터 콘텐츠",
    source: require("../../assets/rest/treasures.webp"),
  },
] as const;

export type StudioAssetId = (typeof studioAssets)[number]["id"];

export function isStudioAssetId(value: unknown): value is StudioAssetId {
  return typeof value === "string" && studioAssets.some((asset) => asset.id === value);
}

export function studioAssetSource(id: string) {
  return studioAssets.find((asset) => asset.id === id)?.source ?? studioAssets[0].source;
}
