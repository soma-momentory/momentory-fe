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
  render: (props: { scenarioId: string; onMessage: (message: string) => void }) => ReactNode;
};

/** Add independent RN variants by screen id; keep API/fixtures in their Lab adapters. */
export const labVariants: readonly LabVariant[] = homeVariants.map((variant) => ({
  id: variant.id,
  screenId: "home-main",
  label: variant.label,
  scenarios: claudeHomeScenarios,
  render: ({ scenarioId, onMessage }) => (
    <ClaudeHomeMockPreview
      key={`${variant.id}-${scenarioId}`}
      variant={variant}
      scenarioId={scenarioId}
      onMessage={onMessage}
    />
  ),
}));

export const variantsFor = (screenId: CaptureId) =>
  labVariants.filter((variant) => variant.screenId === screenId);
