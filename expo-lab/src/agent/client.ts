/**
 * 「AI에게 맡기기」 서버(`/__lab/agent/*`) 호출 — 브라우저 쪽 단일 통로.
 *
 * - GET 이 아닌 요청에는 `X-Momentory-Lab: 1` 을 붙인다(서버의 로컬 전용 검사 — `server/guard.js`).
 * - 던지지 않는다 — `{ ok, data }` 또는 `{ ok: false, error }`(한 줄 안내)로 닫는다.
 * - 실행 기록은 SSE(`EventSource`)로 받고, 없거나 끊기면 1초 폴링으로 대신한다.
 */
import type {
  AgentStatus,
  CheckState,
  PreviewState,
  RunLine,
  RunRequest,
  RunSnapshot,
  VariantsRequest,
  WorkspaceDetail,
  WorkspaceSummary,
} from "./types";

export const AGENT_API = "/__lab/agent";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

export type RunEvents = {
  onLine: (line: RunLine) => void;
  onRun: (run: RunSnapshot) => void;
};

export type AgentClient = {
  status(): Promise<Result<AgentStatus>>;
  workspace(id: string): Promise<Result<WorkspaceDetail>>;
  run(body: RunRequest): Promise<Result<{ workspace: WorkspaceSummary; run: RunSnapshot }>>;
  continueRun(
    id: string,
    body: Omit<RunRequest, "target">,
  ): Promise<Result<{ workspace: WorkspaceSummary; run: RunSnapshot }>>;
  stop(id: string): Promise<Result<{ run: RunSnapshot | null }>>;
  /** 시안 여러 개 — 같은 지시로 작업 공간 N개를 만들고 서버가 차례로 돌린다 */
  variants(body: VariantsRequest): Promise<
    Result<{
      group: { id: string; total: number; route: string };
      workspaces: WorkspaceSummary[];
    }>
  >;
  /** 시안 만들기 멈추기 — 지금 도는 시안을 멈추고 기다리는 시안을 거둔다 */
  stopVariants(groupId: string): Promise<Result<{ stopped: string | null; cancelled: string[] }>>;
  /** 나머지 시안 버리기 — keep 말고 묶음의 나머지 작업 공간을 지운다 */
  discardOtherVariants(
    groupId: string,
    keep: string,
  ): Promise<Result<{ kept: string; removed: string[] }>>;
  startCheck(id: string): Promise<Result<{ check: CheckState }>>;
  check(id: string): Promise<Result<{ check: CheckState | null }>>;
  stopCheck(id: string): Promise<Result<{ check: CheckState | null }>>;
  commit(
    id: string,
    message: string,
  ): Promise<Result<{ commit: { sha: string; subject: string }; workspace: WorkspaceSummary }>>;
  pr(
    id: string,
    body: { title: string; body: string; base: string },
  ): Promise<
    Result<{
      pr: { number: number | null; url: string };
      pushedOnly: boolean;
      workspace: WorkspaceSummary;
    }>
  >;
  startPreview(id: string): Promise<Result<PreviewState>>;
  remove(id: string): Promise<Result<{ ok: true }>>;
  imageUrl(id: string, path: string): string;
  /** 실행 기록을 받는다. 돌려준 함수로 끊는다 */
  subscribe(id: string, since: number, events: RunEvents): () => void;
};

async function request<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
  try {
    const res = await fetch(`${AGENT_API}${path}`, {
      method,
      headers: {
        ...(method === "GET" ? {} : { "X-Momentory-Lab": "1" }),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      referrerPolicy: "same-origin",
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const error =
        data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : res.status === 404
            ? "Lab 서버에 「AI에게 맡기기」가 없어요 — Lab 을 다시 켜 주세요"
            : `서버가 ${res.status} 로 답했어요`;
      return { ok: false, error, status: res.status };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: "Lab 서버에 닿지 못했어요", status: 0 };
  }
}

const enc = encodeURIComponent;

function pollEvents(id: string, since: number, events: RunEvents): () => void {
  let last = since;
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    const res = await request<{ run: RunSnapshot | null; lines: RunLine[] }>(
      "GET",
      `/workspaces/${enc(id)}/events?since=${last}`,
    );
    if (stopped) return;
    if (res.ok) {
      for (const line of res.data.lines) {
        last = Math.max(last, line.seq);
        events.onLine(line);
      }
      if (res.data.run) events.onRun(res.data.run);
      if (res.data.run && res.data.run.status !== "running") return;
    }
    setTimeout(tick, 1000);
  };
  void tick();
  return () => {
    stopped = true;
  };
}

export function createAgentClient(): AgentClient {
  return {
    status: () => request("GET", "/status"),
    workspace: (id) => request("GET", `/workspaces/${enc(id)}`),
    run: (body) => request("POST", "/run", body),
    continueRun: (id, body) => request("POST", `/workspaces/${enc(id)}/run`, body),
    stop: (id) => request("POST", `/workspaces/${enc(id)}/stop`, {}),
    variants: (body) => request("POST", "/variants", body),
    stopVariants: (groupId) => request("POST", `/variants/${enc(groupId)}/stop`, {}),
    discardOtherVariants: (groupId, keep) =>
      request("DELETE", `/variants/${enc(groupId)}?keep=${enc(keep)}`),
    startCheck: (id) => request("POST", `/workspaces/${enc(id)}/check`, {}),
    check: (id) => request("GET", `/workspaces/${enc(id)}/check`),
    stopCheck: (id) => request("POST", `/workspaces/${enc(id)}/check/stop`, {}),
    commit: (id, message) => request("POST", `/workspaces/${enc(id)}/commit`, { message }),
    pr: (id, body) => request("POST", `/workspaces/${enc(id)}/pr`, body),
    startPreview: (id) => request("POST", `/workspaces/${enc(id)}/preview`, {}),
    remove: (id) => request("DELETE", `/workspaces/${enc(id)}`),
    imageUrl: (id, path) => `${AGENT_API}/workspaces/${enc(id)}/image?path=${enc(path)}`,
    subscribe(id, since, events) {
      if (typeof EventSource === "undefined") return pollEvents(id, since, events);
      let source: EventSource | null = new EventSource(
        `${AGENT_API}/workspaces/${enc(id)}/stream?since=${since}`,
      );
      let last = since;
      let fallback: (() => void) | null = null;
      source.addEventListener("line", (event) => {
        const line = JSON.parse((event as MessageEvent<string>).data) as RunLine;
        last = Math.max(last, line.seq);
        events.onLine(line);
      });
      source.addEventListener("run", (event) => {
        const run = JSON.parse((event as MessageEvent<string>).data) as RunSnapshot;
        events.onRun(run);
        if (run.status !== "running") {
          source?.close();
          source = null;
        }
      });
      source.onerror = () => {
        // 서버가 다시 뜨는 중이거나 SSE 가 막힌 환경 — 폴링으로 대신한다
        source?.close();
        source = null;
        if (!fallback) fallback = pollEvents(id, last, events);
      };
      return () => {
        source?.close();
        source = null;
        fallback?.();
      };
    },
  };
}

export const defaultAgentClient = createAgentClient();
