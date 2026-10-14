import type { ComponentType } from "react";

import { ClaudeHomeView, type ClaudeHomeActions, type ClaudeHomeModel } from "./HomeView";

export type HomeVariantProps = {
  model: ClaudeHomeModel;
  actions: ClaudeHomeActions;
  gridPhaseY?: number;
};
export type HomeVariant = { id: string; label: string; Screen: ComponentType<HomeVariantProps> };

/** Add A/B/C RN views here only after they implement the same model/action contract. */
export const homeVariants: HomeVariant[] = [
  { id: "claude-v2", label: "Claude Design v2", Screen: ClaudeHomeView },
];
