/**
 * 훅 진입점이 함께 쓰는 입출력 — stdin JSON · 저장소 루트 찾기 · 자식 프로세스 · 응답 모양.
 *
 * 불변 규칙(`codex-review.mjs` 와 같다):
 *   - **인프라 문제로 막지 않는다.** 도구가 없거나 깨지면 조용히 통과한다.
 *   - Windows 에서 `.cmd` 를 spawn 하지 않는다 — `node <패키지>/bin/x.js` 를 직접 돌린다.
 *   - 저장소에 아무것도 쓰지 않는다. 임시 파일은 OS 임시 디렉터리에만.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { resolveShellPath, toRepoRelative } from "./rules.mjs";

/** `--agent=codex` 면 Codex, 아니면 Claude Code */
export function agentFromArgv(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith("--agent="));
  return flag ? flag.slice("--agent=".length) : "claude";
}

export function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** 응답 하나를 쓰고 끝낸다. 종료 코드는 언제나 0 — 판정은 JSON 이 말한다. */
export function respond(payload) {
  if (payload) process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(0);
}

/** PreToolUse 거부 — Claude Code · Codex 가 같은 모양을 받는다 */
export function denyPayload(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: `[저장소 규칙 훅] ${reason}\n(사람이 일부러 할 때만: MOMENTORY_GUARD=0 으로 에이전트를 다시 띄운다 — .claude/hooks/README.md)`,
    },
  };
}

/**
 * PostToolUse 되먹임.
 * - Claude Code: `decision: "block"` 은 도구 결과를 지우지 않고 reason 을 모델에게 붙인다.
 * - Codex: `decision: "block"` 은 **도구 결과를 갈아 끼운다**(패치가 실패한 것처럼 읽힌다) —
 *   그래서 Codex 에는 `additionalContext` 로만 알린다.
 */
export function postPayload(agent, messages, { block = false } = {}) {
  if (!messages.length) return null;
  const text = `[저장소 규칙 훅]\n${messages.join("\n\n")}`;
  if (agent === "claude" && block) return { decision: "block", reason: text };
  return { hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text } };
}

/** 파일(아직 없어도 된다)에서 위로 올라가며 `.git` 이 있는 첫 디렉터리 — worktree 도 잡힌다 */
export function findRepoRoot(start) {
  if (!start) return null;
  let dir = path.resolve(start);
  try {
    if (!fs.statSync(dir).isDirectory()) dir = path.dirname(dir);
  } catch {
    dir = path.dirname(dir);
  }
  for (let i = 0; i < 64; i++) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/** 훅 입력의 cwd — 없으면 프로젝트 디렉터리 · 프로세스 cwd */
export function inputCwd(input) {
  return input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
}

/** 도구가 넘긴 파일 경로(상대일 수 있다) → `{ abs, root, rel }` */
export function locate(filePath, cwd) {
  if (!filePath) return null;
  const abs = resolveShellPath(filePath, cwd);
  if (!abs) return null;
  const root = findRepoRoot(abs);
  if (!root) return { abs, root: null, rel: null };
  return { abs, root, rel: toRepoRelative(abs, root) };
}

/** 셸 인자 하나를 저장소 상대 경로로 — `checkCommand` 의 `relOf` */
export function relOfShellPath(p, cwd) {
  if (!p || /^[a-z]+:\/\//i.test(p) || p.startsWith("$")) return null;
  return locate(p, cwd)?.rel ?? null;
}

export function resolveDir(p, cwd) {
  return resolveShellPath(p, cwd);
}

export function currentBranch(cwd) {
  const r = spawnSync("git", ["symbolic-ref", "--short", "-q", "HEAD"], {
    cwd,
    encoding: "utf8",
    timeout: 3000,
    windowsHide: true,
  });
  if (r.error || r.status !== 0) return null;
  return r.stdout.trim() || null;
}

/** `<root>/node_modules/<pkg>/<bin>` — 없으면 null (worktree 의 junction 도 따라간다) */
export function localBin(root, rel) {
  const file = path.join(root, "node_modules", ...rel.split("/"));
  return fs.existsSync(file) ? file : null;
}

/** node 로 JS 진입점을 돌린다. 셸을 타지 않는다. */
export function runNode(script, args, { cwd, timeoutMs = 30000 } = {}) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    timeout: timeoutMs,
    windowsHide: true,
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  return {
    ok: !r.error && r.status === 0,
    status: r.status,
    timedOut: r.error?.code === "ETIMEDOUT" || r.signal === "SIGTERM",
    error: r.error ?? null,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

export function tempFile(name) {
  const dir = path.join(os.tmpdir(), "momentory-hooks");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${process.pid}-${Date.now()}-${name}`);
}
