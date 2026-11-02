/** 「AI에게 맡기기」 — 셸이 쓰는 것. 서버는 `expo-lab/server/`(Metro 미들웨어 `/__lab/agent/*`). */
export {
  AgentPanel,
  buildInstructionHeader,
  instructionBody,
  type AgentPanelProps,
  type AgentScreen,
} from "./AgentPanel";
export { NewScreenForm, type NewScreenFormProps } from "./NewScreenForm";
export { WorkspaceCard, STATUS_LABEL, statusText } from "./WorkspaceCard";
export { createAgentClient, defaultAgentClient, type AgentClient } from "./client";
export { useAgentStatus } from "./useAgentStatus";
export { NEW_SCREEN_SECTIONS } from "./sections";
export type * from "./types";
export { VariantDecision } from "./VariantDecision";
export { VariantGroupCard } from "./VariantGroupCard";
