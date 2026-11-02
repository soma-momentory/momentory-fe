/**
 * 「AI에게 맡기기」 API 의 모양 — 서버(`expo-lab/server/index.js`)가 돌려주는 JSON 그대로.
 * 서버는 CommonJS JS 라 타입을 여기 손으로 맞춘다. 바꾸면 둘을 같이 고친다.
 */

export type AgentId = "claude" | "codex";

export type WorkspaceStatus = "working" | "checking" | "edited" | "committed" | "pr" | "fresh";

export type RunStatus = "running" | "done" | "failed" | "stopped";

export type CheckStatus = "running" | "pass" | "skipped" | "findings" | "failed" | "stopped";

export type PreviewState = {
  status: "starting" | "ready" | "failed" | "stopped";
  port: number | null;
  url: string | null;
  ready: boolean;
  error: string | null;
};

export type CheckState = {
  status: CheckStatus;
  message: string | null;
  findings: string | null;
  startedAt: number;
  endedAt: number | null;
};

export type WorkspaceSummary = {
  id: string;
  kind: "edit" | "new-screen";
  route: string | null;
  title: string;
  file: string;
  specId: string | null;
  slug: string | null;
  section: string | null;
  branch: string;
  baseBranch: string;
  path: string;
  createdAt: string;
  status: WorkspaceStatus;
  changedCount: number;
  commitCount: number;
  newRoutes: string[];
  pr: { number: number | null; url: string } | null;
  broken: string | null;
  session: { agent: AgentId } | null;
  lastRun: { status: RunStatus; agent: AgentId; error: string | null } | null;
  check: CheckState | null;
  preview: PreviewState | null;
};

export type ActiveRun = { workspaceId: string; title: string; agent: AgentId; startedAt: number };

export type AgentStatus = {
  available: { claude: boolean; codex: boolean; gh: boolean };
  versions: { claude: string | null; codex: string | null; gh: string | null };
  git: { branch: string | null; dirty: boolean; dirtyFiles: string[] };
  baseBranch: string;
  activeRun: ActiveRun | null;
  workspaces: WorkspaceSummary[];
};

export type RunResult = {
  summary: string;
  changedScreens: string[];
  commitMessage: string;
  prBody: string;
  neededImages: { what: string; size: string; where: string }[];
  neededApis: { method: string; path: string; request: string; response: string }[];
  skipped: { request: string; reason: string }[];
};

export type RunSnapshot = {
  id: string;
  workspaceId: string;
  agent: AgentId;
  resumed: boolean;
  status: RunStatus;
  startedAt: number;
  endedAt: number | null;
  exitCode: number | null;
  summary: string | null;
  error: string | null;
  sessionId: string | null;
  blocks: { commitMessage: string | null; prBody: string | null };
  logPath: string;
  lastSeq: number;
  result: RunResult | null;
};

export type RunLine = {
  seq: number;
  t: number;
  kind: "text" | "tool" | "result" | "error" | "stderr";
  text: string;
};

export type WorkspaceChanges = {
  files: { status: string; path: string }[];
  fileCount: number;
  diffStat: string;
  commits: { sha: string; subject: string }[];
  newRoutes: string[];
  newAssets: string[];
};

export type WorkspaceDetail = {
  workspace: WorkspaceSummary;
  changes: WorkspaceChanges;
  run: RunSnapshot | null;
  history: RunSnapshot[];
  blocks: { commitMessage: string | null; prBody: string | null };
  check: CheckState | null;
  baseOptions: string[];
};

/** 붙인 그림 하나 — `data:` URL 로 서버에 싣는다 */
export type Attachment = {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  purpose: "reference" | "asset";
  note: string;
};

export type EditTarget = {
  kind: "edit";
  route: string;
  title?: string;
  file?: string;
  specId?: string | null;
};

export type NewScreenTarget = {
  kind: "new-screen";
  slug: string;
  title: string;
  parentSection?: string | null;
  description?: string;
};

export type RunRequest = {
  agent: AgentId;
  target: EditTarget | NewScreenTarget;
  instruction?: string;
  handoff?: object | null;
  attachments?: { name: string; dataUrl: string; purpose: "reference" | "asset"; note: string }[];
};
