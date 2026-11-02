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
const { buildAgentCommand, buildPrompt, routeSlug, RESULT_SCHEMA } = require("./prompt");
const { AgentRun } = require("./runs");
const { WorkspaceStore } = require("./workspaces");

const PREFIX = "/__lab/agent";
const BODY_LIMIT = 60 * 1024 * 1024; // 첨부 그림 여러 장(최대 12장)
const HISTORY = 5;
const MAX_ATTACHMENTS = 12;

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

  /** @param {WorkspaceMeta} meta */
  async function ensurePreview(meta) {
    const current = previews.get(meta.id);
    if (current?.alive) return current.state();
    if (previewStarting.has(meta.id)) return previewState(meta.id);
    previewStarting.add(meta.id);
    try {
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

  /** @param {WorkspaceMeta} meta */
  async function summarize(meta) {
    const run = latestRun(meta.id);
    const check = checks.get(meta.id);
    const changes = await store.changes(meta);
    const status =
      run?.status === "running"
        ? "working"
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
      lastRun: run ? { status: run.status, agent: run.agent, error: run.error } : null,
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

  /**
   * @param {WorkspaceMeta} meta
   * @param {{ agent: "claude" | "codex"; launcher: { file: string; prefix: string[] } }} who
   * @param {ReturnType<typeof readExtras>} extras
   * @param {boolean} created
   */
  async function startRun(meta, who, extras, created) {
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

    run.finished.then((snapshot) => {
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
      ensurePreview(meta).catch(() => {});
    });
    return run;
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
        workspaces,
      });
    }

    if (parts[0] === "run" && parts.length === 1 && method === "POST") {
      const body = await readJson(req);
      const target = readTarget(body.target ?? body.screen);
      const who = await launcherFor(body.agent);
      const extras = readExtras(body);
      const existing = store.find(target);
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
        const run = latestRun(id);
        run?.stop();
        checks.get(id)?.stop();
        checks.delete(id);
        previews.get(id)?.stop();
        previews.delete(id);
        if (run?.status === "running")
          await Promise.race([run.finished, new Promise((r) => setTimeout(r, 10_000))]);
        const result = await store.remove(id);
        if (!result.ok) throw new HttpError(500, result.message);
        runs.delete(id);
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

module.exports = { createLabAgent, withLabAgent, readTarget, PREFIX, BODY_LIMIT };
