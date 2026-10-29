import {
  BubbleComparisonPreview,
  bubbleComparisonScenarios,
} from "../retro/BubbleComparisonPreview";
import { bubbleStyles } from "../retro/PreviewBubble";
import {
  RetroDiaryPreview,
  retroConfirmScenarios,
  retroTalkScenarios,
} from "../retro/RetroDiaryPreview";
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
  {
    id: "diary-stickers",
    screenId: "retro-confirm",
    label: "다이어리 스티커 · 일정 확인",
    scenarios: retroConfirmScenarios,
    render: ({ scenarioId, onMessage, fontScale }) => (
      <RetroDiaryPreview
        screen="confirm"
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
      />
    ),
  },
  {
    id: "diary-stickers",
    screenId: "retro-talk",
    label: "다이어리 스티커 · 바바와 대화",
    scenarios: retroTalkScenarios,
    render: ({ scenarioId, onMessage, fontScale }) => (
      <RetroDiaryPreview
        screen="talk"
        scenarioId={scenarioId}
        onMessage={onMessage}
        fontScale={fontScale}
      />
    ),
  },

  {
    id: "diary-bubble-comparison",
    screenId: "retro-talk",
    label: "말풍선 4종 · 한눈에 비교",
    scenarios: bubbleComparisonScenarios,
    render: ({ scenarioId, fontScale }) => (
      <BubbleComparisonPreview scenarioId={scenarioId} fontScale={fontScale} />
    ),
  },
  ...bubbleStyles
    .filter((style) => style.id !== "current")
    .map((style) => ({
      id: `diary-bubble-${style.id}`,
      screenId: "retro-talk" as const,
      label: style.label,
      scenarios: retroTalkScenarios,
      render: ({ scenarioId, onMessage, fontScale }: Parameters<LabVariant["render"]>[0]) => (
        <RetroDiaryPreview
          screen="talk"
          bubbleStyle={style.id}
          scenarioId={scenarioId}
          onMessage={onMessage}
          fontScale={fontScale}
        />
      ),
    })),

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
