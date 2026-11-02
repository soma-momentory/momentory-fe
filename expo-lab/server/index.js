// @ts-check
/**
 * 「AI에게 맡기기」 서버 — Expo Lab 의 Metro 개발 서버에 `/__lab/agent/*` 를 단다(`metro.config.js`).
 * 터미널을 열지 않고 Lab 화면에서 Claude Code · Codex 에게 「지금 보는 화면」을 고치게 하거나 새 화면을 만들게 한다.
 *
 * 흐름: 「AI에게 수정 맡기기」 → 그 대상의 작업 공간(git worktree · 브랜치)을 처음이면 만들고 →
 * 미리보기 서버를 띄우고 → 에이전트가 그 폴더에서 고치고 검사한다(커밋하지 않는다) →
 * 사용자가 결과를 보고 「수정 저장(커밋)」 · 「검토 요청 올리기(PR)」를 누른다. 머지 API 는 없다.
 * 지시 없이 작업 공간을 만들지 않는다 — 패널을 여는 것만으로는 아무것도 생기지 않는다.
 * AI 실행은 Lab 전체에서 **한 번에 하나**다. 작업 공간은 지금 브랜치가 아니라 기준 브랜치(main)에서 갈라 낸다.
 *
 * 경로(전부 로컬 전용 — `guard.js`):
 *   GET    /__lab/agent/status                     CLI 유무 · 저장소 브랜치/더러움 · 작업 공간 목록
 *   GET    /__lab/agent/workspaces                 작업 공간 목록
 *   POST   /__lab/agent/workspaces                 작업 공간만 만들기 {kind:"edit",route,…} | {kind:"new-screen",slug,title,…}
 *   POST   /__lab/agent/run                        지시 {agent, target, instruction, attachments?} — 없으면 만들고, 있으면 잇는다
 *   GET    /__lab/agent/workspaces/:id             상세(바뀐 파일 · 통계 · 저장된 수정 · 새 라우트 · 마지막 실행 · 블록)
 *   DELETE /__lab/agent/workspaces/:id             버리기(junction 먼저 끊고 worktree 제거)
 *   POST   /__lab/agent/workspaces/:id/run         같은 작업 공간에 이어서 지시 {agent, instruction, attachments?}
 *   POST   /__lab/agent/workspaces/:id/stop        실행 중지(프로세스 트리째)
 *   GET    /__lab/agent/workspaces/:id/events      ?since=N — 폴링
 *   GET    /__lab/agent/workspaces/:id/stream      ?since=N — SSE(event: line · run)
 *   GET    /__lab/agent/workspaces/:id/image       ?path=assets/… — 바뀐 그림 썸네일
 *   GET    /__lab/agent/workspaces/:id/preview     {url, port, ready, status}
 *   POST   /__lab/agent/workspaces/:id/preview     미리보기 서버 켜기
 *   POST   /__lab/agent/workspaces/:id/check       저장 전 검사 시작(.claude/hooks/codex-review.mjs 한 번 — check.js)
 *   GET    /__lab/agent/workspaces/:id/check       {check: {status: running|pass|skipped|findings|failed|stopped, message, findings}}
 *   POST   /__lab/agent/workspaces/:id/check/stop  검사 중지
 *   POST   /__lab/agent/workspaces/:id/commit      {message} — git add -A · git commit -F
 *   POST   /__lab/agent/workspaces/:id/pr          {title, body, base} — git push -u · gh pr create
 *   POST   /__lab/agent/variants                   시안 여러 개 {agent, target(edit), instruction, attachments?, count 1~3}
 *                                                  — 같은 화면 · 같은 지시로 작업 공간 N개(한 묶음 id)를 만들고 **차례로** 돌린다
 *   POST   /__lab/agent/variants/:group/stop       지금 도는 시안을 멈추고 기다리는 시안을 거둔다
 *   DELETE /__lab/agent/variants/:group?keep=<id>  「나머지 시안 버리기」 — keep 말고 묶음의 나머지를 버린다(미리보기 먼저 끈다)
 *
 * 시안 묶음(2026-11-02): 실행은 그래도 한 번에 하나다 — 서버가 줄(queue)에 세우고 하나가 끝나면 다음을 띄운다.
 * 줄에 시안이 남아 있는 동안 다른 지시는 받지 않는다(409). 시안의 미리보기는 실행이 끝나도 저절로 켜지 않는다 —
 * 다음 시안이 바로 돌기 때문이다(아래 startRun 의 미리보기 주석). 「시안 비교」 화면이 열릴 때 셸이 켠다.
 *
 * 미리보기 서버는 한꺼번에 `maxPreviews`(기본 4 — 시안 3 + 하나)까지 띄운다. 넘으면 가장 오래 쓰지 않은 것을 끈다.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Buffer } = require("node:buffer");

const SERVER_DIR = path.resolve(require.resolve("./proc"), "..");

const { ReviewCheck } = require("./check");
const { detectTools } = require("./cli");
const { checkLocalRequest } = require("./guard");
const { PreviewServer, findFreePort } = require("./preview");
const { killTree } = require("./proc");
const {
  buildAgentCommand,
  buildPrompt,
  routeSlug,
  RESULT_SCHEMA,
  MAX_VARIANTS,
} = require("./prompt");
const { AgentRun } = require("./runs");
const { WorkspaceStore } = require("./workspaces");

const PREFIX = "/__lab/agent";
const BODY_LIMIT = 60 * 1024 * 1024; // 첨부 그림 여러 장(최대 12장)
const HISTORY = 5;
const MAX_ATTACHMENTS = 12;
/** 미리보기 서버(Metro 하나씩 — 메모리가 크다)를 한꺼번에 몇 개까지 띄우나. 넘으면 가장 오래 쓰지 않은 것을 끈다 */
const MAX_PREVIEWS = 4;

/** @typedef {import("node:http").IncomingMessage} Req */
/** @typedef {import("node:http").ServerResponse} Res */
/** @typedef {import("./workspaces").WorkspaceMeta} WorkspaceMeta */
/** @typedef {import("./prompt").Target} Target */

/**
 * Lab 이 띄우는 자식(에이전트 · 저장 전 검사 · 수정 결과 화면)의 환경 — 부모 그대로 + `MOMENTORY_LAB_RUN=1`.
 * 저장소 훅이 이 값을 본다: 알림을 끄고, 무인 에이전트가 `.claude/settings.json` · `.claude/hooks/**` · `.codex/**` 를
 * 못 고치게 막는다. 인증 값은 새로 넣지 않는다(이 PC 에 로그인된 CLI 기본값 그대로).
 * @param {NodeJS.ProcessEnv} [extra]
 * @returns {NodeJS.ProcessEnv}
 */
const labRunEnv = (extra = {}) => ({ ...process.env, MOMENTORY_LAB_RUN: "1", ...extra });

class HttpError extends Error {
  /** @param {number} status @param {string} message */
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** @param {Res} res @param {number} status @param {unknown} body */
function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(text),
  });
  res.end(text);
}

/** @param {Req} req @returns {Promise<any>} */
function readJson(req) {
  return new Promise((resolve, reject) => {
    const tooBig = () =>
      new HttpError(413, `보낸 내용이 너무 커요(${BODY_LIMIT / 1024 / 1024}MB 까지)`);
    const declared = Number(req.headers["content-length"] ?? 0);
    if (declared > BODY_LIMIT) {
      reject(tooBig());
      req.resume();
      return;
    }
    /** @type {Buffer[]} */
    const chunks = [];
    let size = 0;
    req.on("data", (/** @type {Buffer} */ chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(tooBig());
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (size === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "요청 내용을 읽지 못했어요(JSON 아님)"));
      }
    });
    req.on("error", reject);
  });
}

const str = (/** @type {unknown} */ v, max = 300) =>
  typeof v === "string" ? v.slice(0, max) : undefined;

/**
 * 무엇을 고칠지 — `{kind:"edit", route, …}`(옛 이름 `screen` 도 받는다) 또는 `{kind:"new-screen", slug, title, …}`.
 * @param {any} raw @returns {Target}
 */
function readTarget(raw) {
  if (raw && raw.kind === "new-screen") {
    const slug = routeSlug(String(raw.slug ?? ""));
    if (!raw.slug || slug === "root")
      throw new HttpError(400, "새 화면의 영문 이름(slug)을 적어 주세요");
    const title = str(raw.title, 100)?.trim();
    if (!title) throw new HttpError(400, "새 화면 이름을 적어 주세요");
    return {
      kind: "new-screen",
      slug,
      title,
      section: str(raw.parentSection ?? raw.section, 40) ?? null,
      description: str(raw.description, 8000) ?? "",
    };
  }
  if (!raw || typeof raw.route !== "string" || !raw.route.startsWith("/") || raw.route.length > 300)
    throw new HttpError(400, "어느 화면인지(route) 알려 주세요");
  return {
    kind: "edit",
    route: raw.route,
    title: str(raw.title),
    file: str(raw.file),
    specId: str(raw.specId) ?? null,
  };
}

/**
 * @param {{
 *   repoRoot: string; wsRoot?: string; nodeModules?: string | null; baseBranch?: string;
 *   tools?: () => Promise<import("./cli").Tools>;
 *   spawnImpl?: typeof import("node:child_process").spawn;
 *   checkSpawnImpl?: typeof import("node:child_process").spawn;
 *   startPreview?: (wsPath: string, port: number, logPath: string) => PreviewServer;
 *   maxPreviews?: number;
 * }} options
 */
function createLabAgent(options) {
  const store = new WorkspaceStore({
    repoRoot: options.repoRoot,
    wsRoot: options.wsRoot,
    nodeModules: options.nodeModules,
    baseBranch: options.baseBranch,
  });
  const tools = options.tools ?? detectTools;
  const startPreview =
    options.startPreview ??
    ((wsPath, port, logPath) => new PreviewServer({ wsPath, port, logPath }));
  /** @type {Map<string, AgentRun[]>} 작업 공간 id → 최근 실행(마지막이 최신) */
  const runs = new Map();
  /** @type {Map<string, PreviewServer>} */
  const previews = new Map();
  /** @type {Set<string>} 미리보기 포트를 고르는 중 */
  const previewStarting = new Set();
  /** @type {Map<string, number>} 작업 공간 id → 미리보기를 마지막으로 찾은 때(넘치면 가장 오래된 것을 끈다) */
  const previewUsed = new Map();
  const maxPreviews = Math.max(1, options.maxPreviews ?? MAX_PREVIEWS);

  /**
   * 시안 묶음의 줄 — 앞에서부터 하나씩 돈다. 실행 하나가 끝나면 `pump` 가 다음을 띄운다.
   * @typedef {{ workspaceId: string; groupId: string; who: { agent: "claude" | "codex"; launcher: { file: string; prefix: string[] } };
   *   extras: { attachments: any[]; instruction: string } }} QueueEntry
   * @type {QueueEntry[]}
   */
  const queue = [];
  /** 줄에서 다음 실행을 띄우는 중(그 사이에 끼어드는 지시를 막는다) */
  let pumping = false;
  /** @type {Map<string, string>} 줄에서 시작하지 못했거나 멈춰서 거둔 시안 — 이유 한 줄 */
  const queueNotes = new Map();

  /** @type {Map<string, ReviewCheck>} 작업 공간 id → 마지막 저장 전 검사 */
  const checks = new Map();

  /** @param {string} id */
  const latestRun = (id) => runs.get(id)?.at(-1) ?? null;

  /** Lab 전체에서 지금 돌고 있는 실행(하나뿐이다). */
  const activeRun = () => {
    for (const [id, list] of runs) {
      const run = list.at(-1);
      if (run?.status === "running")
        return {
          workspaceId: id,
          title: store.get(id)?.title ?? id,
          agent: run.agent,
          startedAt: run.startedAt,
        };
    }
    return null;
  };

  /** Codex `--output-schema` 에 줄 파일 — 저장소 밖(`<wsRoot>/.tmp`)에 한 번 쓴다. */
  const resultSchemaFile = () => {
    const file = path.join(store.wsRoot, ".tmp", "result-schema.json");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(RESULT_SCHEMA, null, 2));
    return file;
  };
  /** @param {string} id */
  const isRunning = (id) => latestRun(id)?.status === "running";
  /** @param {string} id */
  const previewState = (id) => previews.get(id)?.state() ?? null;

  /** 넘친 미리보기 — 살아 있는 것이 상한이면, 이번 것(`keep`) 말고 가장 오래 쓰지 않은 것부터 끈다. @param {string} keep */
  function evictPreviews(keep) {
    const alive = [...previews].filter(([id, p]) => p.alive && id !== keep);
    alive.sort(([a], [b]) => (previewUsed.get(a) ?? 0) - (previewUsed.get(b) ?? 0));
    while (alive.length >= maxPreviews) {
      const [id, server] = /** @type {[string, PreviewServer]} */ (alive.shift());
      server.stop();
      previews.delete(id);
      previewUsed.delete(id);
    }
  }

  /** @param {WorkspaceMeta} meta */
  async function ensurePreview(meta) {
    previewUsed.set(meta.id, Date.now());
    const current = previews.get(meta.id);
    if (current?.alive) return current.state();
    if (previewStarting.has(meta.id)) return previewState(meta.id);
    previewStarting.add(meta.id);
    try {
      evictPreviews(meta.id);
      const taken = new Set([...previews.values()].filter((p) => p.alive).map((p) => p.port));
      const port = await findFreePort(taken);
      if (port == null) throw new HttpError(503, "미리보기에 쓸 빈 포트(8100~8199)가 없어요");
      const server = startPreview(
        meta.path,
        port,
        path.join(store.wsRoot, ".logs", `${meta.id}-preview.log`),
      );
      previews.set(meta.id, server);
      return server.state();
    } finally {
      previewStarting.delete(meta.id);
    }
  }

  /** @param {string} id */
  const isQueued = (id) => queue.some((entry) => entry.workspaceId === id);

  /** 줄에 선 시안들 — 상태의 `queue` 와 409 안내에 쓴다 */
  const queueInfo = () =>
    queue.map((entry) => {
      const meta = store.get(entry.workspaceId);
      return {
        workspaceId: entry.workspaceId,
        groupId: entry.groupId,
        index: meta?.group?.index ?? null,
        title: meta?.title ?? entry.workspaceId,
      };
    });

  /** 요약의 첫 줄 — 시안이면 「방향: …」(프롬프트가 그렇게 쓰게 한다) @param {string | null} text */
  const firstLine = (text) =>
    (text ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 160) ?? null;

  /** @param {WorkspaceMeta} meta */
  async function summarize(meta) {
    const run = latestRun(meta.id);
    const check = checks.get(meta.id);
    // 실행 · 줄은 git 을 읽기(await) **전에** 한꺼번에 본다 — 그 사이에 줄을 떠나 실행이 붙으면 「아무것도 아님」으로 보인다
    const queued = isQueued(meta.id);
    const note = queueNotes.get(meta.id) ?? null;
    const changes = await store.changes(meta);
    const status =
      run?.status === "running"
        ? "working"
        : queued
          ? "queued"
          : check?.status === "running"
            ? "checking"
            : changes.fileCount > 0
              ? "edited"
              : meta.pr
                ? "pr"
                : changes.commits.length > 0
                  ? "committed"
                  : "fresh";
    return {
      id: meta.id,
      kind: meta.kind,
      route: meta.route,
      title: meta.title,
      file: meta.file,
      specId: meta.specId,
      slug: meta.slug,
      section: meta.section,
      branch: meta.branch,
      baseBranch: meta.baseBranch,
      path: meta.path,
      createdAt: meta.createdAt,
      status,
      changedCount: changes.fileCount,
      commitCount: changes.commits.length,
      newRoutes: changes.newRoutes,
      pr: meta.pr,
      broken: meta.broken ?? null,
      session: meta.session ? { agent: meta.session.agent } : null,
      lastRun: run
        ? { status: run.status, agent: run.agent, error: run.error }
        : note
          ? { status: "failed", agent: null, error: note }
          : null,
      group: meta.group ?? null,
      queued,
      // 막 끝난 실행은 요약이 아직 기록(meta)에 안 실렸을 수 있다 — 실행의 것을 먼저 본다
      summaryLine: firstLine(run?.status === "running" ? null : (run?.summary ?? meta.lastSummary)),
      check: check?.state() ?? null,
      preview: previewState(meta.id),
    };
  }

  /** @param {string} id */
  function requireWorkspace(id) {
    const meta = store.get(id);
    if (!meta) throw new HttpError(404, "그 작업 공간이 없어요");
    return meta;
  }

  /** @param {WorkspaceMeta} meta @returns {Target} */
  const targetOf = (meta) =>
    meta.kind === "new-screen"
      ? {
          kind: "new-screen",
          slug: meta.slug ?? meta.id,
          title: meta.title,
          section: meta.section,
          description: meta.description ?? "",
        }
      : {
          kind: "edit",
          route: meta.route ?? "/",
          title: meta.title,
          file: meta.file,
          specId: meta.specId,
        };

  /** 작업 공간을 만들기 **전에** 거를 것 — CLI 가 없으면 아무것도 만들지 않는다. @param {unknown} agent */
  async function launcherFor(agent) {
    if (agent !== "claude" && agent !== "codex")
      throw new HttpError(400, "Claude 또는 Codex 를 골라 주세요");
    const launcher = (await tools())[agent];
    if (!launcher)
      throw new HttpError(
        409,
        `이 PC 에서 ${agent === "claude" ? "Claude Code" : "Codex"} 를 찾지 못했어요`,
      );
    return { agent: /** @type {"claude" | "codex"} */ (agent), launcher };
  }

  /** @param {any} body */
  function readExtras(body) {
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (attachments.length > MAX_ATTACHMENTS)
      throw new HttpError(400, `그림은 ${MAX_ATTACHMENTS}장까지 붙일 수 있어요`);
    // 새 화면의 참고 그림(옛 모양 `reference: {name, dataUrl}`)도 첨부 하나로 받는다
    if (body.reference && typeof body.reference === "object")
      attachments.push({
        ...body.reference,
        purpose: "reference",
        note: body.reference.note ?? "참고 그림",
      });
    return {
      attachments,
      instruction: typeof body.instruction === "string" ? body.instruction : "",
    };
  }

  /** 줄에 시안이 남아 있으면 다른 지시를 받지 않는다 — 그 안내 한 줄(없으면 null) */
  const queueBusy = () => {
    if (queue.length === 0 && !pumping) return null;
    const next = queueInfo()[0];
    return next
      ? `시안을 차례로 만드는 중이에요(다음: ${next.title}) — 다 끝난 뒤에 지시해요`
      : "시안을 차례로 만드는 중이에요 — 다 끝난 뒤에 지시해요";
  };

  /**
   * @param {WorkspaceMeta} meta
   * @param {{ agent: "claude" | "codex"; launcher: { file: string; prefix: string[] } }} who
   * @param {ReturnType<typeof readExtras>} extras
   * @param {boolean} created
   * @param {{ fromQueue?: boolean }} [opts]
   */
  async function startRun(meta, who, extras, created, opts = {}) {
    const { agent, launcher } = who;
    // Lab 전체에서 한 번에 하나(2026-11-02 사용자 결정) — 같은 PC 의 사용량 · 저장소 검사가 겹치지 않게
    const active = activeRun();
    if (active)
      throw new HttpError(
        409,
        active.workspaceId === meta.id
          ? "이 작업은 AI 가 아직 고치는 중이에요"
          : `다른 화면(${active.title})에서 AI가 작업 중이에요`,
      );
    const waiting = opts.fromQueue ? null : queueBusy();
    if (waiting) throw new HttpError(409, waiting);
    if (checks.get(meta.id)?.status === "running")
      throw new HttpError(409, "저장 전 검사가 도는 중이에요 — 끝난 뒤에 지시해요");
    const changes = await store.changes(meta);
    if (!created && meta.runCount === 0 && changes.fileCount > 0)
      throw new HttpError(409, "작업 공간에 AI 가 하지 않은 수정이 있어서 시작하지 않아요");

    const runId = `${Date.now().toString(36)}`;
    const written = store.writeAttachments(meta, runId, extras);
    const resumeId = meta.session && meta.session.agent === agent ? meta.session.id : null;
    const prompt = buildPrompt({
      agent,
      target: targetOf(meta),
      instruction: extras.instruction,
      attachments: written.files,
      workspace: meta,
      resume: Boolean(resumeId),
      previousSummary: resumeId ? null : meta.lastSummary,
      variant: meta.group
        ? {
            index: meta.group.index,
            total: meta.group.total,
            // 차례로 도니까 앞 시안은 이미 끝났다 — 그 요약을 건네 다른 방향을 고르게 한다
            earlier: store
              .groupMembers(meta.group.id)
              .filter((m) => (m.group?.index ?? 0) < (meta.group?.index ?? 0) && m.lastSummary)
              .map((m) => ({
                index: m.group?.index ?? 0,
                summary: firstLine(m.lastSummary) ?? "",
              })),
          }
        : null,
    });
    const lastMessagePath =
      agent === "codex" ? path.join(store.wsRoot, ".logs", `${meta.id}-${runId}-last.json`) : null;
    const command = buildAgentCommand({
      agent,
      launcher,
      cwd: meta.path,
      resumeId,
      // Codex 는 그림을 -i 로 같이 보여 준다(참고용 · 앱에 넣기 둘 다 — 경로 줄은 프롬프트에 그대로 있다)
      imagePaths: written.files.map((f) => f.path),
      schemaPath: agent === "codex" ? resultSchemaFile() : null,
      lastMessagePath,
    });

    /** @type {NodeJS.ProcessEnv} */
    const env = labRunEnv({
      // 저장소의 Codex 리뷰 Stop 훅은 에이전트 실행에서는 끈다 — 「수정 저장(커밋)」 직전에 한 번만 돈다(check.js)
      CODEX_REVIEW: "0",
    });

    const run = new AgentRun({
      id: runId,
      workspaceId: meta.id,
      agent,
      resumed: Boolean(resumeId),
      file: command.file,
      args: command.args,
      cwd: meta.path,
      prompt,
      env,
      lastMessagePath,
      logPath: path.join(store.wsRoot, ".logs", `${meta.id}-${runId}.log`),
      spawnImpl: options.spawnImpl,
    });
    const list = runs.get(meta.id) ?? [];
    list.push(run);
    while (list.length > HISTORY) list.shift();
    runs.set(meta.id, list);
    store.update(meta.id, { runCount: meta.runCount + 1 });
    queueNotes.delete(meta.id);

    run.finished.then((snapshot) => {
      // 시안 줄의 다음 차례 — 이 실행의 뒷정리(아래 기록)가 끝난 뒤에 이어 간다
      setTimeout(() => void pump(), 0);
      if (!store.get(meta.id)) return;
      /** @type {Partial<WorkspaceMeta>} */
      const patch = {};
      if (snapshot.sessionId) patch.session = { agent, id: snapshot.sessionId };
      // 이어 붙이기가 실패하면 다음 지시는 새 세션 + 앞선 요약으로 시작한다
      if (snapshot.status === "failed" && snapshot.resumed) patch.session = null;
      if (snapshot.summary) patch.lastSummary = snapshot.summary.slice(0, 4000);
      if (snapshot.blocks.commitMessage || snapshot.blocks.prBody) patch.blocks = snapshot.blocks;
      store.update(meta.id, patch);
      // 미리보기는 AI 실행이 **끝난 뒤** 띄운다 — 실행 중에 Metro 첫 번들이 겹치면 PC 부하로 에이전트가 돌리는
      // jest 의 애니메이션 · 타이머 테스트가 흔들려(「Unable to locate attached view」) 없는 실패를 보고했다(2026-11-02 실측).
      // 이미 떠 있으면 그대로 둔다(파일 감시가 바뀐 코드를 다시 묶는다). 실패해도 결과는 그대로다.
      // 시안은 켜지 않는다 — 다음 시안이 바로 돌고(같은 이유), 시안 비교 화면이 열릴 때 셸이 켠다.
      if (!meta.group) ensurePreview(meta).catch(() => {});
    });
    return run;
  }

  /** 줄 맨 앞의 시안을 띄운다 — 아무것도 돌지 않을 때만. 못 띄우면 그 시안에 이유를 남기고 다음으로. */
  async function pump() {
    if (pumping || activeRun()) return;
    pumping = true;
    try {
      while (queue.length > 0) {
        // 띄우는 동안에도 줄 맨 앞에 둔다 — 그 사이에 상태를 읽어도 「기다리는 중」이고 「다 끝남」으로 보이지 않는다
        const entry = /** @type {QueueEntry} */ (queue[0]);
        const leave = () => {
          const at = queue.indexOf(entry);
          if (at >= 0) queue.splice(at, 1);
          return at >= 0;
        };
        const meta = store.get(entry.workspaceId);
        if (!meta) {
          leave();
          continue;
        }
        try {
          const run = await startRun(meta, entry.who, entry.extras, true, { fromQueue: true });
          // 띄우는 사이에 멈추기 · 버리기로 거뒀으면 바로 멈춘다
          if (!leave()) run.stop();
          return;
        } catch (error) {
          leave();
          queueNotes.set(
            entry.workspaceId,
            `시작하지 못했어요: ${String(/** @type {any} */ (error)?.message ?? error)}`,
          );
        }
      }
    } finally {
      pumping = false;
    }
  }

  /**
   * 작업 공간 하나를 버린다 — 줄에서 빼고 · 실행 · 검사 · 미리보기를 끈 뒤 worktree 를 지운다(junction 먼저 · workspaces.js).
   * @param {string} id
   */
  async function discard(id) {
    for (let i = queue.length - 1; i >= 0; i -= 1)
      if (queue[i]?.workspaceId === id) queue.splice(i, 1);
    queueNotes.delete(id);
    const run = latestRun(id);
    run?.stop();
    checks.get(id)?.stop();
    checks.delete(id);
    previews.get(id)?.stop();
    previews.delete(id);
    previewUsed.delete(id);
    if (run?.status === "running")
      await Promise.race([run.finished, new Promise((r) => setTimeout(r, 10_000))]);
    const result = await store.remove(id);
    if (result.ok) runs.delete(id);
    return result;
  }

  /** @param {Req} req @param {Res} res @param {AgentRun} run @param {number} since */
  function stream(req, res, run, since) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    /** @param {string} event @param {unknown} data @param {number} [id] */
    const send = (event, data, id) =>
      res.write(
        `${id != null ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
      );
    send("run", run.snapshot());
    for (const line of run.linesSince(since)) send("line", line, line.seq);
    const unsubscribe = run.subscribe((message) => {
      if (message.type === "line") send("line", message.line, message.line.seq);
      else send("run", message.run);
    });
    const heartbeat = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  }

  /** @param {Req} req @param {Res} res */
  async function route(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = (req.method ?? "GET").toUpperCase();
    const parts = url.pathname
      .slice(PREFIX.length)
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);

    if (method === "GET" && parts[0] === "status" && parts.length === 1) {
      const [available, repo] = await Promise.all([tools(), store.repoInfo()]);
      const workspaces = await Promise.all(store.list().map(summarize));
      return sendJson(res, 200, {
        available: {
          claude: Boolean(available.claude),
          codex: Boolean(available.codex),
          gh: Boolean(available.gh),
        },
        versions: available.versions,
        git: repo,
        baseBranch: store.baseBranch,
        activeRun: activeRun(),
        queue: queueInfo(),
        maxVariants: MAX_VARIANTS,
        maxPreviews,
        workspaces,
      });
    }

    if (parts[0] === "variants") {
      if (parts.length === 1 && method === "POST") {
        const body = await readJson(req);
        const target = readTarget(body.target ?? body.screen);
        if (target.kind !== "edit")
          throw new HttpError(400, "시안 여러 개는 화면 고치기에서만 만들어요");
        const count = Number(body.count);
        if (!Number.isInteger(count) || count < 1 || count > MAX_VARIANTS)
          throw new HttpError(400, `시안은 1개에서 ${MAX_VARIANTS}개까지 만들 수 있어요`);
        const who = await launcherFor(body.agent);
        const extras = readExtras(body);
        // 작업 공간을 만들기 **전에** 거른다 — 다른 실행 · 줄이 있으면 아무것도 만들지 않는다
        const active = activeRun();
        if (active) throw new HttpError(409, `다른 화면(${active.title})에서 AI가 작업 중이에요`);
        const waiting = queueBusy();
        if (waiting) throw new HttpError(409, waiting);
        const now = new Date();
        const groupId = `g${now.getTime().toString(36)}`;
        /** @type {WorkspaceMeta[]} */
        const members = [];
        try {
          for (let index = 1; index <= count; index += 1)
            members.push(
              await store.createVariant(
                target,
                { id: groupId, index, total: count, createdAt: now.toISOString() },
                now,
              ),
            );
        } catch (error) {
          for (const m of members) await store.remove(m.id);
          throw new HttpError(
            500,
            `시안 작업 공간을 만들지 못했어요: ${String(/** @type {any} */ (error)?.message ?? error)}`,
          );
        }
        for (const m of members) queue.push({ workspaceId: m.id, groupId, who, extras });
        await pump();
        return sendJson(res, 202, {
          group: { id: groupId, total: count, route: target.route },
          workspaces: await Promise.all(members.map((m) => summarize(store.get(m.id) ?? m))),
        });
      }
      const groupId = String(parts[1] ?? "");
      const members = store.groupMembers(groupId);
      if (!groupId || members.length === 0) throw new HttpError(404, "그 시안 묶음이 없어요");
      if (parts[2] === "stop" && parts.length === 3 && method === "POST") {
        /** @type {string[]} */
        const cancelled = [];
        for (let i = queue.length - 1; i >= 0; i -= 1) {
          const entry = queue[i];
          if (entry?.groupId !== groupId) continue;
          queue.splice(i, 1);
          cancelled.unshift(entry.workspaceId);
          queueNotes.set(entry.workspaceId, "멈춰서 만들지 않았어요");
        }
        const running = members.find((m) => isRunning(m.id));
        if (running) latestRun(running.id)?.stop();
        return sendJson(res, 200, { stopped: running?.id ?? null, cancelled });
      }
      if (parts.length === 2 && method === "DELETE") {
        const keep = url.searchParams.get("keep");
        if (!keep || !members.some((m) => m.id === keep))
          throw new HttpError(400, "남길 시안(keep)을 이 묶음에서 골라 주세요");
        /** @type {string[]} */
        const removed = [];
        /** @type {string[]} */
        const failed = [];
        for (const m of members) {
          if (m.id === keep) continue;
          const result = await discard(m.id);
          if (result.ok) removed.push(m.id);
          else failed.push(result.message);
        }
        if (failed.length) throw new HttpError(500, failed.join(" · "));
        return sendJson(res, 200, { kept: keep, removed });
      }
      throw new HttpError(405, "지원하지 않는 요청이에요");
    }

    if (parts[0] === "run" && parts.length === 1 && method === "POST") {
      const body = await readJson(req);
      const target = readTarget(body.target ?? body.screen);
      const who = await launcherFor(body.agent);
      const extras = readExtras(body);
      const existing = store.find(target);
      // 새 작업 공간을 만들기 **전에** 거른다 — 받지 못할 지시로 worktree 만 남지 않게
      if (!existing) {
        const active = activeRun();
        if (active) throw new HttpError(409, `다른 화면(${active.title})에서 AI가 작업 중이에요`);
        const waiting = queueBusy();
        if (waiting) throw new HttpError(409, waiting);
      }
      const meta = existing ?? (await store.ensure(target));
      const run = await startRun(meta, who, extras, !existing);
      return sendJson(res, 202, { workspace: await summarize(meta), run: run.snapshot() });
    }

    if (parts[0] !== "workspaces") throw new HttpError(404, "없는 경로예요");

    if (parts.length === 1) {
      if (method === "GET")
        return sendJson(res, 200, { workspaces: await Promise.all(store.list().map(summarize)) });
      if (method === "POST") {
        const meta = await store.ensure(readTarget(await readJson(req)));
        return sendJson(res, 201, { workspace: await summarize(meta) });
      }
      throw new HttpError(405, "지원하지 않는 요청이에요");
    }

    const id = String(parts[1]);
    const action = parts[2] ?? null;
    const meta = requireWorkspace(id);

    if (action === null) {
      if (method === "GET") {
        const changes = await store.changes(meta);
        return sendJson(res, 200, {
          workspace: await summarize(meta),
          changes,
          run: latestRun(id)?.snapshot() ?? null,
          history: (runs.get(id) ?? []).map((r) => r.snapshot()),
          blocks: meta.blocks,
          check: checks.get(id)?.state() ?? null,
          baseOptions: [...new Set([store.baseBranch, meta.baseBranch])],
        });
      }
      if (method === "DELETE") {
        const result = await discard(id);
        if (!result.ok) throw new HttpError(500, result.message);
        return sendJson(res, 200, { ok: true });
      }
      throw new HttpError(405, "지원하지 않는 요청이에요");
    }

    if (action === "run" && method === "POST") {
      const body = await readJson(req);
      const who = await launcherFor(body.agent);
      const run = await startRun(meta, who, readExtras(body), false);
      return sendJson(res, 202, { workspace: await summarize(meta), run: run.snapshot() });
    }
    if (action === "stop" && method === "POST") {
      latestRun(id)?.stop();
      return sendJson(res, 200, { run: latestRun(id)?.snapshot() ?? null });
    }
    if (action === "events" && method === "GET") {
      const since = Number(url.searchParams.get("since") ?? 0) || 0;
      const run = latestRun(id);
      return sendJson(res, 200, {
        run: run?.snapshot() ?? null,
        lines: run?.linesSince(since) ?? [],
      });
    }
    if (action === "stream" && method === "GET") {
      const run = latestRun(id);
      if (!run) throw new HttpError(404, "아직 실행한 적이 없어요");
      const lastId = Number(req.headers["last-event-id"] ?? NaN);
      const since = Number.isFinite(lastId)
        ? lastId
        : Number(url.searchParams.get("since") ?? 0) || 0;
      return stream(req, res, run, since);
    }
    if (action === "image" && method === "GET") {
      const image = store.readImage(meta, String(url.searchParams.get("path") ?? ""));
      if (!image) throw new HttpError(404, "그림을 찾지 못했어요");
      res.writeHead(200, {
        "Content-Type": image.type,
        "Cache-Control": "no-store",
        "Content-Length": image.bytes.length,
      });
      return res.end(image.bytes);
    }
    if (action === "preview") {
      if (method === "GET")
        return sendJson(
          res,
          200,
          previewState(id) ?? {
            status: "stopped",
            ready: false,
            url: null,
            port: null,
            error: null,
          },
        );
      if (method === "POST") return sendJson(res, 200, await ensurePreview(meta));
    }
    if (action === "check") {
      const current = checks.get(id);
      if (method === "GET" && parts.length === 3)
        return sendJson(res, 200, { check: current?.state() ?? null });
      if (method === "POST" && parts[3] === "stop") {
        current?.stop();
        return sendJson(res, 200, { check: current?.state() ?? null });
      }
      if (method === "POST" && parts.length === 3) {
        if (isRunning(id))
          throw new HttpError(409, "AI 가 아직 고치는 중이에요 — 끝난 뒤에 검사해요");
        if (current?.status === "running") return sendJson(res, 202, { check: current.state() });
        const check = new ReviewCheck({
          wsPath: meta.path,
          repoRoot: store.repoRoot,
          sessionId: `lab-${id}-${Date.now().toString(36)}`,
          logPath: path.join(store.wsRoot, ".logs", `${id}-check-${Date.now().toString(36)}.log`),
          spawnImpl: options.checkSpawnImpl,
        });
        checks.set(id, check);
        return sendJson(res, 202, { check: check.state() });
      }
    }
    if (action === "commit" && method === "POST") {
      if (checks.get(id)?.status === "running")
        throw new HttpError(409, "저장 전 검사가 도는 중이에요");
      if (isRunning(id))
        throw new HttpError(409, "AI 가 아직 고치는 중이에요 — 끝난 뒤에 저장해요");
      const body = await readJson(req);
      const result = await store.commit(meta, body.message);
      if (!result.ok) throw new HttpError(result.status, String(result.message));
      return sendJson(res, 200, { commit: result.commit, workspace: await summarize(meta) });
    }
    if (action === "pr" && method === "POST") {
      if (isRunning(id)) throw new HttpError(409, "AI 가 아직 고치는 중이에요");
      const body = await readJson(req);
      const result = await store.createPr(meta, body, (await tools()).gh);
      if (!result.ok) throw new HttpError(result.status, String(result.message));
      const updated = result.pr ? (store.update(id, { pr: result.pr }) ?? meta) : meta;
      return sendJson(res, 200, {
        pr: result.pr,
        pushedOnly: Boolean(result.pushedOnly),
        workspace: await summarize(updated),
      });
    }
    throw new HttpError(404, "없는 경로예요");
  }

  /** connect 미들웨어. `/__lab/agent` 밖은 그냥 넘긴다. @param {Req} req @param {Res} res @param {(e?: unknown) => void} next */
  function handle(req, res, next) {
    const pathname = (req.url ?? "").split("?")[0] ?? "";
    if (pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`)) return next();
    const verdict = checkLocalRequest(/** @type {any} */ (req));
    if (!verdict.ok) return sendJson(res, verdict.status, { error: verdict.message });
    route(req, res).catch((error) => {
      const status = error instanceof HttpError ? error.status : 500;
      const message =
        error instanceof HttpError
          ? error.message
          : `서버에서 처리하지 못했어요: ${String(error?.message ?? error)}`;
      if (!res.headersSent) sendJson(res, status, { error: message });
      else res.end();
    });
  }

  /** Metro 가 꺼질 때 — 남은 에이전트 · 미리보기 서버를 프로세스 트리째 끈다(동기). */
  function shutdown() {
    for (const list of runs.values())
      for (const run of list) if (run.status === "running") killTree(run.pid, { sync: true });
    for (const preview of previews.values()) if (preview.alive) preview.stop("stopped", true);
    for (const check of checks.values())
      if (check.status === "running") killTree(check.child?.pid, { sync: true });
  }

  return { handle, shutdown, store };
}

/**
 * Metro 설정에 에이전트 API 를 단다. `MOMENTORY_LAB_AGENT=off` 면 아무것도 하지 않는다(미리보기 서버가 쓴다).
 * Expo CLI 는 `server.enhanceMiddleware` 를 존중한다 — 자기 미들웨어 스택 끝에 Metro 미들웨어를 붙이기 전에
 * 우리 것으로 감싸게 해 준다(`@expo/cli` instantiateMetro.js).
 * @template {{ server?: any }} T
 * @param {T} config
 * @param {{ repoRoot?: string }} [opts]
 * @returns {T}
 */
function withLabAgent(config, opts = {}) {
  if (process.env.MOMENTORY_LAB_AGENT === "off") return config;
  const repoRoot = opts.repoRoot ?? path.resolve(SERVER_DIR, "..", "..");
  /** @type {ReturnType<typeof createLabAgent> | null} */
  let lab = null;
  const getLab = () => {
    if (!lab) {
      const created = createLabAgent({ repoRoot });
      process.once("exit", () => created.shutdown());
      lab = created;
    }
    return lab;
  };
  const server = config.server ?? {};
  const upstream = server.enhanceMiddleware;
  server.enhanceMiddleware = (/** @type {any} */ middleware, /** @type {any} */ metroServer) => {
    const inner = upstream ? upstream(middleware, metroServer) : middleware;
    return (
      /** @type {Req} */ req,
      /** @type {Res} */ res,
      /** @type {(e?: unknown) => void} */ next,
    ) => {
      const url = req.url ?? "";
      if (url === PREFIX || url.startsWith(`${PREFIX}/`) || url.startsWith(`${PREFIX}?`))
        return getLab().handle(req, res, next);
      return inner(req, res, next);
    };
  };
  config.server = server;
  return config;
}

module.exports = { createLabAgent, withLabAgent, readTarget, PREFIX, BODY_LIMIT, MAX_PREVIEWS };
