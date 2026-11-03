// @ts-check
/**
 * 「수정 저장(커밋)」 직전 검사 — 저장소의 Codex 리뷰 Stop 훅(`.claude/hooks/codex-review.mjs`)을 **그대로** 한 번 돌린다.
 *
 * 왜 훅 스크립트를 다시 쓰나: 검사 순서(typecheck → lint → test → Codex read-only 리뷰)와 「인프라 문제는 막지 않는다」
 * 규칙 · 프롬프트 · 스키마 · 설정이 전부 그 한 파일과 옆 파일들에 있다. README 의 `codex exec` 명령만 따로 부르면
 * 게이트 · 패치 수집 · 제외 경로 · 판정 규칙(「findings 가 정한다」)을 여기서 다시 짜야 하고, 둘이 갈라진다.
 *
 * - 에이전트 실행(`claude -p`) 때는 `CODEX_REVIEW=0` 으로 훅을 끈다(`index.js`) — 리뷰는 여기서 한 번만 돈다.
 * - 훅 입력 모양(Stop): `{ session_id, cwd, hook_event_name: "Stop", stop_hook_active: false }` 을 stdin 으로.
 *   session_id 는 검사마다 새로 — 훅의 「같은 diff 는 다시 막지 않는다」 캐시가 이전 검사 결과를 재사용하지 않게.
 * - 훅의 출력: 막으면 `{"decision":"block","reason":"…"}` 한 줄, 아니면 「Codex review: PASS …」 ·
 *   「Codex review skipped: …」 같은 글. 훅은 언제나 exit 0 이다(스스로 죽으면 skip).
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const { IS_WIN, killTree } = require("./proc");

const HOOK = path.join(".claude", "hooks", "codex-review.mjs");
const TIMEOUT_MS = 15 * 60_000; // 게이트(최대 10분) + 리뷰(최대 8분) 중 하나는 대개 짧다

/**
 * @typedef {"running" | "pass" | "skipped" | "findings" | "failed" | "stopped"} CheckStatus
 * @typedef {{ status: CheckStatus; message: string | null; findings: string | null; startedAt: number; endedAt: number | null }} CheckState
 */

/**
 * 훅 출력 → 판정.
 * @param {string} stdout
 * @returns {{ status: "pass" | "skipped" | "findings"; message: string; findings: string | null }}
 */
function parseHookOutput(stdout) {
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim());
  for (const line of [...lines].reverse()) {
    if (!line.trim().startsWith("{")) continue;
    try {
      const obj = JSON.parse(line);
      if (obj?.decision === "block")
        return {
          status: "findings",
          message: firstLine(obj.reason) || "검사에서 고칠 것이 나왔어요",
          findings: String(obj.reason ?? ""),
        };
    } catch {
      /* JSON 이 아니다 */
    }
  }
  const text = lines.join("\n").trim();
  if (/Codex review( gate)? skipped/i.test(text))
    return { status: "skipped", message: text, findings: null };
  return { status: "pass", message: text || "검사를 통과했어요", findings: null };
}

/** @param {unknown} s */
const firstLine = (s) =>
  String(s ?? "")
    .split(/\r?\n/)
    .find((l) => l.trim()) ?? "";

/** 작업 공간의 훅, 없으면 저장소의 훅. @param {string} wsPath @param {string} repoRoot */
function findHook(wsPath, repoRoot) {
  for (const root of [wsPath, repoRoot]) {
    const file = path.join(root, HOOK);
    if (fs.existsSync(file)) return file;
  }
  return null;
}

class ReviewCheck {
  /**
   * @param {{ wsPath: string; repoRoot: string; sessionId: string; logPath: string; spawnImpl?: typeof spawn }} opts
   */
  constructor(opts) {
    /** @type {CheckStatus} */
    this.status = "running";
    /** @type {string | null} */
    this.message = null;
    /** @type {string | null} */
    this.findings = null;
    this.startedAt = Date.now();
    /** @type {number | null} */
    this.endedAt = null;
    this.stopRequested = false;
    /** @type {Promise<CheckState>} */
    this.finished = new Promise((resolve) => (this.resolve = resolve));

    const hook = findHook(opts.wsPath, opts.repoRoot);
    if (!hook) {
      this.child = null;
      this.end(
        "skipped",
        "검사 스크립트(.claude/hooks/codex-review.mjs)가 없어 건너뛰었어요",
        null,
      );
      return;
    }
    /** @type {NodeJS.ProcessEnv} */
    // MOMENTORY_LAB_RUN=1 — Lab 이 띄운 실행이라는 표시(저장소 훅이 알림을 끈다 · index.js labRunEnv 와 같다)
    const env = { ...process.env, MOMENTORY_LAB_RUN: "1", CLAUDE_PROJECT_DIR: opts.wsPath };
    delete env.CODEX_REVIEW; // 에이전트 실행 때 끈 값이 여기까지 따라오지 않게 — 이 검사가 그 리뷰다
    delete env.NODE_ENV; // Expo 의 development 가 따라가면 jest 가 없는 실패를 낸다(index.js labRunEnv)
    fs.mkdirSync(path.dirname(opts.logPath), { recursive: true });
    const log = fs.createWriteStream(opts.logPath, { flags: "a" });
    let stdout = "";
    this.child = (opts.spawnImpl ?? spawn)(process.execPath, [hook], {
      cwd: opts.wsPath,
      env,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
      detached: !IS_WIN,
      shell: false,
    });
    this.child.stdout?.on("data", (c) => {
      stdout += c;
      log.write(c);
    });
    this.child.stderr?.on("data", (c) => log.write(c));
    const timer = setTimeout(() => {
      this.message = "검사가 15분 안에 끝나지 않았어요";
      killTree(this.child?.pid);
    }, TIMEOUT_MS);
    timer.unref?.();
    this.child.on("error", (error) => {
      clearTimeout(timer);
      this.end("failed", `검사를 시작하지 못했어요: ${error.message}`, null);
    });
    this.child.on("close", (code) => {
      clearTimeout(timer);
      log.end();
      if (this.stopRequested) return this.end("stopped", "검사를 멈췄어요", null);
      if (this.message) return this.end("failed", this.message, null);
      if (code !== 0) return this.end("failed", `검사가 오류로 끝났어요(종료 코드 ${code})`, null);
      const verdict = parseHookOutput(stdout);
      this.end(verdict.status, verdict.message, verdict.findings);
    });
    this.child.stdin?.on("error", () => {});
    this.child.stdin?.end(
      JSON.stringify({
        session_id: opts.sessionId,
        cwd: opts.wsPath,
        hook_event_name: "Stop",
        stop_hook_active: false,
      }),
    );
  }

  /** @param {CheckStatus} status @param {string | null} message @param {string | null} findings */
  end(status, message, findings) {
    if (this.status !== "running") return;
    this.status = status;
    this.message = message;
    this.findings = findings;
    this.endedAt = Date.now();
    this.resolve?.(this.state());
  }

  stop() {
    if (this.status !== "running") return;
    this.stopRequested = true;
    killTree(this.child?.pid);
  }

  /** @returns {CheckState} */
  state() {
    return {
      status: this.status,
      message: this.message,
      findings: this.findings,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
    };
  }
}

module.exports = { ReviewCheck, parseHookOutput, findHook };
