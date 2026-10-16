import type { ReactNode } from "react";

import { ClaudeHomeMockPreview } from "../claude-home/MockPreview";
import { claudeHomeScenarios } from "../claude-home/scenarios";
import { homeVariants } from "../claude-home/variants";
import type { InboxScenarioId, WeatherScenarioId } from "../claude-home/validationScenarios";
import type { CaptureId } from "./captures";
import { ReportPreview, reportScenarios } from "../report/ReportPreview";
import { RestHubPreview, restHubScenarios } from "../rest/RestHubPreview";

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
    weatherId: WeatherScenarioId;
    inboxId: InboxScenarioId;
    fontScale: 1 | 1.3 | 1.5;
  }) => ReactNode;
};

/** Add independent RN variants by screen id; keep API/fixtures in their Lab adapters. */
export const labVariants: readonly LabVariant[] = [
  ...homeVariants.map((variant) => ({
    id: variant.id,
    screenId: "home-main" as const,
    label: variant.label,
    scenarios: claudeHomeScenarios,
    render: ({
      scenarioId,
      onMessage,
      scale,
      weatherId,
      inboxId,
      fontScale,
    }: Parameters<LabVariant["render"]>[0]) =>
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
          weatherId={weatherId}
          inboxId={inboxId}
          fontScale={fontScale}
        />
      ),
  })),
  {
    id: "app-rest",
    screenId: "rest-hub",
    label: "운영 쉼터 · 공유 UI",
    scenarios: restHubScenarios,
    render: ({ scenarioId, onMessage, fontScale }) => (
      <RestHubPreview
        key={scenarioId}
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
      />
    ),
  },
  {
    id: "app-report",
    screenId: "report",
    label: "운영 리포트 · 공유 UI",
    scenarios: reportScenarios,
    render: ({ scenarioId, onMessage, fontScale }) => (
      <ReportPreview
        key={scenarioId}
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
      />
    ),
  },
];

export const variantsFor = (screenId: CaptureId) =>
  labVariants.filter((variant) => variant.screenId === screenId);
