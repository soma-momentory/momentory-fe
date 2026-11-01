/** Paper assets shared by the app's tab selection and Lab comparisons. */
export const tabBackgroundAssets = {
  "warm-ivory": {
    label: "1 · 따뜻한 아이보리",
    source: require("../../assets/backgrounds/warm-ivory.png"),
  },
  "soft-olive": {
    label: "8 · 부드러운 올리브",
    source: require("../../assets/backgrounds/soft-olive.png"),
  },
} as const;

export const tabBackgroundByTab = {
  홈: "warm-ivory",
  쉼터: "soft-olive",
  보관함: "warm-ivory",
  리포트: "warm-ivory",
  마이: "warm-ivory",
} as const satisfies Record<string, keyof typeof tabBackgroundAssets>;

export type TabBackgroundTab = keyof typeof tabBackgroundByTab;
