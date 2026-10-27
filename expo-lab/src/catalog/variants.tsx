import type { ReactNode } from "react";
import type { StudioDesign } from "../../../src/design/studioDesign";

import { ArchivePreview, archiveScenarios } from "../archive/ArchivePreview";
import { ClaudeHomeMockPreview } from "../claude-home/MockPreview";
import { claudeHomeScenarios } from "../claude-home/scenarios";
import { homeVariants } from "../claude-home/variants";
import type { LetterScenarioId, WeatherScenarioId } from "../claude-home/validationScenarios";
import type { CaptureId } from "./captures";
import { MyMainPreview, myMainScenarios } from "../my/MyMainPreview";
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
    design?: StudioDesign;
    scenarioId: string;
    onMessage: (message: string) => void;
    scale?: number;
    weatherId: WeatherScenarioId;
    letterId: LetterScenarioId;
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
      letterId,
      fontScale,
      design,
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
          letterId={letterId}
          fontScale={fontScale}
          design={design}
        />
      ),
  })),
  {
    id: "app-rest",
    screenId: "rest-hub",
    label: "운영 쉼터 · 공유 UI",
    scenarios: restHubScenarios,
    render: ({ scenarioId, onMessage, fontScale, design }) => (
      <RestHubPreview
        key={scenarioId}
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
        design={design}
      />
    ),
  },
  {
    id: "app-archive",
    screenId: "archive",
    label: "운영 보관함 · 공유 UI",
    scenarios: archiveScenarios,
    render: ({ scenarioId, onMessage, fontScale, design }) => (
      <ArchivePreview
        key={scenarioId}
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
        design={design}
      />
    ),
  },
  {
    id: "app-my",
    screenId: "my-main",
    label: "운영 마이 · 공유 UI",
    scenarios: myMainScenarios,
    render: ({ scenarioId, onMessage, fontScale, design }) => (
      <MyMainPreview
        key={scenarioId}
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
        design={design}
      />
    ),
  },
  {
    id: "app-report",
    screenId: "report",
    label: "운영 리포트 · 공유 UI",
    scenarios: reportScenarios,
    render: ({ scenarioId, onMessage, fontScale, design }) => (
      <ReportPreview
        key={scenarioId}
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
        design={design}
      />
    ),
  },
];

export const variantsFor = (screenId: CaptureId) =>
  labVariants.filter((variant) => variant.screenId === screenId);
