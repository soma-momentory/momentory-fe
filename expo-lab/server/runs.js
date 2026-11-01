// @ts-check
/**
 * 에이전트 실행 한 번 — 띄우고, 출력을 기록 줄로 바꿔 모으고, 듣는 쪽(SSE)에 흘리고, 끝을 정리한다.
 *
 * 프롬프트는 **stdin** 으로 넘긴다(명령줄에 싣지 않는다 — 따옴표 · 주입 문제가 없다).
 * 원문(stdout · stderr)은 `<wsRoot>/.logs/<작업 공간>-<실행>.log` 에 남는다.
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { parserFor, lineSplitter, asResultJson } = require("./events");
const { IS_WIN, killTree } = require("./proc");
const { normalizeResult, parseBlocks } = require("./prompt");

const MAX_LINES = 5000;

/**
 * @typedef {{ seq: number; t: number; kind: import("./events").LineKind; text: string }} RunLine
 * @typedef {"running" | "done" | "failed" | "stopped"} RunStatus
 * @typedef {{
 *   id: string; workspaceId: string; agent: "claude" | "codex"; resumed: boolean;
 *   status: RunStatus; startedAt: number; endedAt: number | null; exitCode: number | null;
 *   summary: string | null; error: string | null; sessionId: string | null;
 *   blocks: { commitMessage: string | null; prBody: string | null }; logPath: string; lastSeq: number;
 *   result: ReturnType<typeof import("./prompt").normalizeResult>;
 * }} RunSnapshot
 * @typedef {{ type: "line"; line: RunLine } | { type: "run"; run: RunSnapshot }} RunMessage
 */

class AgentRun {
  /**
   * @param {{
   *   id: string; workspaceId: string; agent: "claude" | "codex"; resumed: boolean;
   *   file: string; args: readonly string[]; cwd: string; prompt: string; logPath: string;
   *   env?: NodeJS.ProcessEnv; lastMessagePath?: string | null; spawnImpl?: typeof spawn;
   * }} opts
   */
  constructor(opts) {
    this.lastMessagePath = opts.lastMessagePath ?? null;
    /** @type {ReturnType<typeof normalizeResult>} */
    this.result = null;
    /** @type {any} */
    this.structured = null;
    this.id = opts.id;
    this.workspaceId = opts.workspaceId;
    this.agent = opts.agent;
    this.resumed = opts.resumed;
    this.logPath = opts.logPath;
    /** @type {RunStatus} */
    this.status = "running";
    this.startedAt = Date.now();
    /** @type {number | null} */
    this.endedAt = null;
    /** @type {number | null} */
    this.exitCode = null;
    /** @type {string | null} */
    this.summary = null;
    /** @type {string | null} */
    this.error = null;
    /** @type {string | null} */
    this.sessionId = null;
    this.blocks = {
      commitMessage: /** @type {string | null} */ (null),
      prBody: /** @type {string | null} */ (null),
    };
    /** @type {RunLine[]} */
    this.lines = [];
    this.seq = 0;
    this.stopRequested = false;
    this.sawError = false;
    /** @type {string[]} */
    this.stderrTail = [];
    /** @type {string[]} */
    this.texts = [];
    /** @type {Set<(m: RunMessage) => void>} */
    this.listeners = new Set();
    /** @type {Promise<RunSnapshot>} */
    this.finished = new Promise((resolve) => {
      this.resolveFinished = resolve;
    });

    fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    this.log = fs.createWriteStream(this.logPath, { flags: "a" });
    this.log.write(
      `# ${new Date().toISOString()} ${opts.agent} ${opts.cwd}\n# ${opts.file} ${JSON.stringify(opts.args)}\n`,
    );
    this.log.write(`# --- prompt ---\n${opts.prompt}\n# --- output ---\n`);

    const parse = parserFor(opts.agent);
    const out = lineSplitter((raw) => {
      this.log.write(`[out] ${raw}\n`);
      const parsed = parse(raw);
      if (parsed.sessionId && !this.sessionId) {
        this.sessionId = parsed.sessionId;
        this.emitRun();
      }
      if (parsed.finalText) {
        this.summary = parsed.finalText;
        this.texts.push(parsed.finalText);
      }
      if (parsed.structured) this.structured = parsed.structured;
      if (parsed.isError) this.sawError = true;
      for (const line of parsed.lines) this.push(line.kind, line.text);
    });
    const err = lineSplitter((raw) => {
      this.log.write(`[err] ${raw}\n`);
      this.stderrTail.push(raw);
      if (this.stderrTail.length > 20) this.stderrTail.shift();
      this.push("stderr", raw.slice(0, 2000));
    });

    const spawnImpl = opts.spawnImpl ?? spawn;
    this.child = spawnImpl(opts.file, [...opts.args], {
      cwd: opts.cwd,
      env: opts.env ?? process.env, // 부모 환경 그대로 — 이 PC 에 로그인된 CLI 기본값으로 돈다
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      detached: !IS_WIN, // POSIX 에서 프로세스 그룹째 끄려고
      shell: false,
    });
    this.child.stdout?.on("data", (chunk) => out.push(chunk));
    this.child.stderr?.on("data", (chunk) => err.push(chunk));
    this.child.on("error", (error) => {
      this.finish(null, `${opts.agent} 를 실행하지 못했어요: ${error.message}`);
    });
    this.child.on("close", (code) => {
      out.flush();
      err.flush();
      this.finish(typeof code === "number" ? code : null, null);
    });
    this.child.stdin?.on("error", () => {});
    this.child.stdin?.end(opts.prompt);
  }

  get pid() {
    return this.child.pid;
  }

  /** @param {import("./events").LineKind} kind @param {string} text */
  push(kind, text) {
    this.seq += 1;
    /** @type {RunLine} */
    const line = { seq: this.seq, t: Date.now(), kind, text };
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) this.lines.shift();
    for (const fn of this.listeners) fn({ type: "line", line });
  }

  /** @param {number | null} code @param {string | null} spawnError */
  finish(code, spawnError) {
    if (this.status !== "running") return;
    this.exitCode = code;
    this.endedAt = Date.now();
    if (spawnError) {
      this.status = "failed";
      this.error = spawnError;
      this.push("error", spawnError);
    } else if (this.stopRequested) {
      this.status = "stopped";
    } else if (code === 0 && !this.sawError) {
      this.status = "done";
    } else {
      this.status = "failed";
      const lastError = [...this.lines].reverse().find((l) => l.kind === "error")?.text;
      const lastStderr = this.stderrTail.filter((l) => l.trim()).slice(-1)[0];
      this.error =
        (lastError ?? lastStderr ?? `종료 코드 ${code}`).split(/\r?\n/)[0]?.slice(0, 300) ?? null;
    }
    // 결과: 스키마 출력(Claude structured_output · Codex -o 파일 · 마지막 말 JSON)이 먼저, 안 되면 글 블록
    let structured = this.structured;
    if (!structured && this.lastMessagePath) {
      try {
        structured = asResultJson(fs.readFileSync(this.lastMessagePath, "utf8"));
      } catch {
        /* 파일 없음 */
      }
    }
    if (!structured) structured = asResultJson(this.summary);
    this.result = normalizeResult(structured);
    if (this.result) {
      this.summary = this.result.summary;
      this.blocks = {
        commitMessage: this.result.commitMessage || null,
        prBody: this.result.prBody || null,
      };
    } else {
      const fromSummary = parseBlocks(this.summary);
      this.blocks =
        fromSummary.commitMessage || fromSummary.prBody
          ? fromSummary
          : parseBlocks(this.texts.join("\n\n"));
    }
    this.log.end(`# --- ${this.status} (exit ${code}) ---\n`);
    this.emitRun();
    this.resolveFinished?.(this.snapshot());
  }

  stop() {
    if (this.status !== "running") return;
    this.stopRequested = true;
    killTree(this.child.pid);
  }

  emitRun() {
    const run = this.snapshot();
    for (const fn of this.listeners) fn({ type: "run", run });
  }

  /** @param {(m: RunMessage) => void} fn */
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** @param {number} since */
  linesSince(since) {
    return this.lines.filter((l) => l.seq > since);
  }

  /** @returns {RunSnapshot} */
  snapshot() {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      agent: this.agent,
      resumed: this.resumed,
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      exitCode: this.exitCode,
      summary: this.summary,
      error: this.error,
      sessionId: this.sessionId,
      blocks: this.blocks,
      logPath: this.logPath,
      lastSeq: this.seq,
      result: this.result,
    };
  }
}

module.exports = { AgentRun };
