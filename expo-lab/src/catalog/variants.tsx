import type { ReactNode } from "react";

import { ClaudeHomeMockPreview } from "../claude-home/MockPreview";
import { claudeHomeScenarios } from "../claude-home/scenarios";
import { homeVariants } from "../claude-home/variants";
import type { CaptureId } from "./captures";

export type VariantScenario = { id: string; label: string };
export type LabVariant = {
  id: string;
  screenId: CaptureId;
  label: string;
  scenarios: readonly VariantScenario[];
  /** `scale` — 가상 폰의 축소 배율. 메뉴처럼 화면 좌표를 쓰는 어댑터가 되돌릴 때 쓴다 */
  render: (props: {
    scenarioId: string;
    onMessage: (message: string) => void;
    scale?: number;
  }) => ReactNode;
};

/** Add independent RN variants by screen id; keep API/fixtures in their Lab adapters. */
export const labVariants: readonly LabVariant[] = homeVariants.map((variant) => ({
  id: variant.id,
  screenId: "home-main",
  label: variant.label,
  scenarios: claudeHomeScenarios,
  render: ({ scenarioId, onMessage, scale }) =>
    variant.kind === "design" ? (
      <ClaudeHomeMockPreview
        key={`${variant.id}-${scenarioId}`}
        variant={variant}
        scenarioId={scenarioId}
        onMessage={onMessage}
      />
    ) : (
      <variant.Preview
        key={`${variant.id}-${scenarioId}`}
        scenarioId={scenarioId}
        onMessage={onMessage}
        scale={scale}
      />
    ),
}));

export const variantsFor = (screenId: CaptureId) =>
  labVariants.filter((variant) => variant.screenId === screenId);
