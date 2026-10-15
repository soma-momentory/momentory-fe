import type { ComponentType } from "react";

import { ClaudeHomeView, type ClaudeHomeActions, type ClaudeHomeModel } from "./HomeView";
import { HomeV2Preview, type HomeV2PreviewProps } from "./HomeV2Preview";

export type HomeVariantProps = {
  model: ClaudeHomeModel;
  actions: ClaudeHomeActions;
  gridPhaseY?: number;
};

/**
 * 홈 비교 변형 — 두 갈래다.
 *
 * - `design` — Claude Design 시안의 RN 번역(`ClaudeHomeView`). 시안 모델(`ClaudeHomeModel`)을 받고
 *   `MockPreview.tsx` 가 5a~5f 를 그 모델로 바꾼다. **비교용 원본**으로 남긴다
 * - `app` — 운영 앱의 공유 뷰를 Lab Mock 으로 그리는 어댑터(`HomeV2Preview`). 앱의 store · API 를
 *   import 하지 않고 시나리오를 뷰 Props 로 바꾼다(`current-home/MockPreview.tsx` 선례)
 */
export type HomeVariant =
  | { id: string; label: string; kind: "design"; Screen: ComponentType<HomeVariantProps> }
  | { id: string; label: string; kind: "app"; Preview: ComponentType<HomeV2PreviewProps> };

export const homeVariants: HomeVariant[] = [
  {
    id: "claude-v2",
    label: "시안 원본 · Claude Design v2",
    kind: "design",
    Screen: ClaudeHomeView,
  },
  { id: "app-v2", label: "운영판 v2 · 공유 뷰", kind: "app", Preview: HomeV2Preview },
];
