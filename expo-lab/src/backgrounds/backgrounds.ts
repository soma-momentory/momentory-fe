import { createContext } from "react";
import type { ImageSource } from "expo-image";
import { tabBackgroundAssets } from "../../../src/design/tabBackgrounds";

export const previewBackgrounds = [
  {
    id: "warm-ivory",
    label: "1 · 따뜻한 아이보리",
    source: tabBackgroundAssets["warm-ivory"].source as ImageSource,
  },
  {
    id: "soft-olive",
    label: "8 · 부드러운 올리브",
    source: tabBackgroundAssets["soft-olive"].source as ImageSource,
  },
  { id: "grid", label: "기존 모눈", source: null },
] as const;

export type PreviewBackgroundId = (typeof previewBackgrounds)[number]["id"];

// Only Lab frames provide this context. Production screens do not depend on preview choices.
export const PreviewBackgroundContext = createContext<PreviewBackgroundId | null>(null);
