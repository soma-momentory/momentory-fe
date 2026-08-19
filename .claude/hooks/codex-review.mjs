#!/usr/bin/env node
/**
 * Claude Code `Stop` hook — Codex 자동 코드 리뷰 게이트.
 *
 *   변경 수집 → (변경 없으면 통과) → 검증 명령(typecheck·lint·test) → Codex read-only 리뷰
 *   → pass 면 종료 허용 · fail 이면 findings 를 붙여 종료 block
 *
 * 불변 규칙 두 가지:
 *   1) Codex 인프라 문제(미설치·미인증·타임아웃·JSON 깨짐·spawn 실패)는 **절대 막지 않는다**.
 *      막는 것은 실제 코드 문제(검증 실패 · P0/P1/P2 finding)뿐이다.
 *   2) 같은 diff 를 두 번 리뷰하지 않는다. 세션당 block 횟수에도 상한이 있다.
 *
 * 설정: .claude/hooks/codex-review.config.json  (환경변수로 덮어쓸 수 있다 — README.md)
 * 상태: OS 임시 디렉터리. 저장소에 아무것도 쓰지 않는다.
 */

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK_DIR = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_FILE = path.join(HOOK_DIR, "codex-review-schema.json");
const PROMPT_FILE = path.join(HOOK_DIR, "codex-review-prompt.md");
const CONFIG_FILE = path.join(HOOK_DIR, "codex-review.config.json");

const IS_WIN = process.platform === "win32";
const MAX_GATE_OUTPUT = 4000;

const DEFAULT_CONFIG = {
  enabled: true,
  model: null,
  codexTimeoutMs: 480000,
  gateTimeoutMs: 600000,
  maxBlocksPerSession: 3,
  maxPatchBytes: 180000,
  maxUntrackedFiles: 60,
  maxUntrackedInlineBytes: 60000,
  maxUntrackedInlineBytesPerFile: 20000,
  runGates: true,
  runTests: true,
  gates: [
    { name: "typecheck", args: ["run", "typecheck"] },
    { name: "lint", args: ["run", "lint"] },
    { name: "test", args: ["test", "--", "--silent"], requires: "runTests" },
  ],
  codePathPattern: "\\.(ts|tsx|js|jsx|mjs|cjs)$",
  excludePathspecs: [],
  designSsotPaths: [],
};

/* ------------------------------------------------------------------ 출력 */

/** 종료 허용. stdout 은 transcript 에만 보이고 Claude 를 막지 않는다. */
function allow(message) {
  if (message) process.stdout.write(`${message}\n`);
  process.exit(0);
}

/** Codex 를 쓸 수 없는 상황 — 리뷰만 건너뛴다. */
function skip(reason) {
  allow(`Codex review skipped: ${reason}`);
}

/** 종료 block. reason 이 Claude 에게 그대로 전달된다. */
function block(reason) {
  process.stdout.write(`${JSON.stringify({ decision: "block", reason })}\n`);
  process.exit(0);
}

/* ------------------------------------------------------------------ 입력 */

function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function isOff(value) {
  return value != null && /^(0|off|false|no)$/i.test(String(value).trim());
}

function isOn(value) {
  return value != null && /^(1|on|true|yes)$/i.test(String(value).trim());
}

function loadConfig() {
  const file = readJson(CONFIG_FILE, {});
  const config = { ...DEFAULT_CONFIG, ...file };

  if (isOff(process.env.CODEX_REVIEW)) config.enabled = false;
  if (isOn(process.env.CODEX_REVIEW_SKIP_GATES)) config.runGates = false;
  if (isOn(process.env.CODEX_REVIEW_SKIP_TESTS)) config.runTests = false;
  if (process.env.CODEX_REVIEW_MODEL) config.model = process.env.CODEX_REVIEW_MODEL;

  const maxBlocks = Number.parseInt(process.env.CODEX_REVIEW_MAX_BLOCKS ?? "", 10);
  if (Number.isFinite(maxBlocks) && maxBlocks >= 0) config.maxBlocksPerSession = maxBlocks;

  return config;
}

/* ------------------------------------------------------- 프로세스 실행 */

/** shell 을 탈 때만 필요한 만큼 따옴표를 씌운다. 인자는 전부 우리가 만든 값이다. */
function shellQuote(value) {
  const text = String(value);
  // 명령 이름을 통째로 따옴표로 감싸면 cmd.exe 에서 `%~dp0` 해석이 깨진다 —
  // 공백·메타문자가 있을 때만 감싼다.
  if (!/[\s&|<>^()"]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Windows 의 npm.cmd / codex.cmd 는 shell 없이는 spawn 되지 않는다(Node 20+ EINVAL).
 * 그래서 가능하면 `.cmd` 대신 실제 JS 진입점을 node 로 직접 돌리고(shell 없음),
 * 못 찾을 때만 shell 로 떨어진다.
 */
function runCommand(command, args, { cwd, timeoutMs, input, shell = false }) {
  const useShell = shell;
  const finalArgs = useShell ? args.map(shellQuote) : args;
  const finalCommand = useShell ? shellQuote(command) : command;

  const result = spawnSync(finalCommand, finalArgs, {
    cwd,
    shell: useShell,
    timeout: timeoutMs,
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", CI: "1" },
  });

  return {
    ok: !result.error && result.status === 0,
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    timedOut: result.error?.code === "ETIMEDOUT",
    error: result.error ?? null,
  };
}

function git(cwd, args) {
  return runCommand("git", args, { cwd, timeoutMs: 60000 });
}

/* ------------------------------------------------------------ 변경 수집 */

function buildPathspecs(config) {
  const excludes = (config.excludePathspecs ?? []).map((p) => `:(exclude)${p}`);
  return ["--", ".", ...excludes];
}

function collectChanges(cwd, config) {
  const pathspecs = buildPathspecs(config);
  const hasHead = git(cwd, ["rev-parse", "--verify", "--quiet", "HEAD"]).ok;
  const base = hasHead ? ["diff", "HEAD"] : ["diff"];

  const patchResult = git(cwd, [...base, "--no-color", "--no-ext-diff", "-M", ...pathspecs]);
  if (!patchResult.ok && !patchResult.stdout) {
    return { error: patchResult.stderr.trim() || "git diff 실패" };
  }

  const statResult = git(cwd, [...base, "--no-color", "--stat", ...pathspecs]);
  const namesResult = git(cwd, [...base, "--no-color", "--name-only", ...pathspecs]);

  const untrackedResult = git(cwd, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    ...pathspecs,
  ]);
  const untracked = (untrackedResult.stdout ?? "").split("\0").filter(Boolean);

  const trackedNames = (namesResult.stdout ?? "").split(/\r?\n/).filter(Boolean);

  return {
    patch: patchResult.stdout ?? "",
    stat: (statResult.stdout ?? "").trim(),
    untracked,
    // untracked 파일은 패치에 안 들어간다 — 이름만 세면 내용 수정이 안 보인다.
    untrackedFingerprint: fingerprintUntracked(cwd, untracked),
    changedPaths: [...trackedNames, ...untracked],
  };
}

/** untracked 파일의 "내용까지" 담은 지문. 이게 없으면 새 파일 수정이 같은 diff 로 보인다. */
function fingerprintUntracked(cwd, untracked) {
  return untracked
    .map((rel) => {
      const abs = path.join(cwd, rel);
      try {
        const stat = fs.statSync(abs);
        if (stat.size > 4 * 1024 * 1024) {
          return `${rel}:${stat.size}:${stat.mtimeMs}`;
        }
        const digest = crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex");
        return `${rel}:${stat.size}:${digest.slice(0, 16)}`;
      } catch {
        return `${rel}:missing`;
      }
    })
    .join("\n");
}

function truncate(text, limit, label) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n... [${label} ${text.length - limit}자 잘림 — 필요하면 저장소에서 직접 읽어라]`;
}

const TEXT_EXTENSIONS =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|scss|html|ya?ml|sh|ps1|txt|svg|toml|env\.example)$/i;

/**
 * 새로 생긴 파일은 패치에 안 들어간다. 이름만 주면 Codex 가 매번 다시 읽어야 하니
 * 작은 텍스트 파일은 본문까지 붙여 준다 — 새 파일 리뷰는 이게 없으면 껍데기가 된다.
 */
function formatUntracked(untracked, cwd, config) {
  if (untracked.length === 0) return "(없음)";

  const max = config.maxUntrackedFiles;
  const perFileCap = config.maxUntrackedInlineBytesPerFile ?? 20000;
  let budget = config.maxUntrackedInlineBytes ?? 60000;

  const blocks = untracked.slice(0, max).map((rel) => {
    let size = null;
    try {
      size = fs.statSync(path.join(cwd, rel)).size;
    } catch {
      return `### ${rel}\n(읽을 수 없다)`;
    }

    const header = `### ${rel} (${size}B, 새 파일)`;
    if (!TEXT_EXTENSIONS.test(rel) || size > perFileCap || budget <= 0) {
      return `${header}\n(본문 생략 — 필요하면 직접 읽어라)`;
    }

    try {
      const body = fs.readFileSync(path.join(cwd, rel), "utf8");
      budget -= body.length;
      return `${header}\n\`\`\`\n${body}\n\`\`\``;
    } catch {
      return `${header}\n(본문 생략 — 읽기 실패)`;
    }
  });

  if (untracked.length > max) {
    blocks.push(`### ... 외 ${untracked.length - max}개 (목록 생략)`);
  }
  return blocks.join("\n\n");
}

/* -------------------------------------------------------------- 상태 저장 */

function stateFileFor(cwd, sessionId) {
  const slug = (path.basename(cwd) || "workspace").replace(/[^a-zA-Z0-9._-]+/g, "-");
  const hash = crypto.createHash("sha256").update(path.resolve(cwd)).digest("hex").slice(0, 12);
  const dir = path.join(os.tmpdir(), "claude-codex-review", `${slug}-${hash}`);
  fs.mkdirSync(dir, { recursive: true });
  const id = String(sessionId || "no-session").replace(/[^a-zA-Z0-9._-]+/g, "-");
  return path.join(dir, `${id}.json`);
}

function loadState(file) {
  const empty = { verdicts: {}, blockedHashes: [], gateBlocks: {}, gateBlockCount: 0 };
  const state = readJson(file, null);
  if (!state || typeof state !== "object") return empty;
  return {
    verdicts: state.verdicts ?? {},
    blockedHashes: Array.isArray(state.blockedHashes) ? state.blockedHashes : [],
    // 게이트 실패는 diff 별 **횟수**로도 센다 — verdicts 와 같은 칸을 쓰면
    // "같은 diff 는 통과시킨다" 규칙에 걸려 깨진 트리가 그대로 빠져나간다.
    // 이 값은 **진단용**이다("같은 diff 로 n번째")
    gateBlocks: state.gateBlocks ?? {},
    // 세션 상한은 **이쪽**이 센다. diff 별로만 세면 조금씩 고쳐 해시가 바뀔 때마다
    // 1 로 초기화돼 상한에 영영 닿지 않는다 — README 가 약속한 「세션당 3회」가 깨진다
    gateBlockCount: typeof state.gateBlockCount === "number" ? state.gateBlockCount : 0,
  };
}

function saveState(file, state) {
  try {
    fs.writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch {
    /* 상태 저장 실패가 리뷰를 막아서는 안 된다 */
  }
}

/* ------------------------------------------------------------ Codex 준비 */

/**
 * PATH 에서 CLI 를 찾되, 가능하면 `.cmd` 래퍼 대신 실제 JS 진입점을 집는다.
 * node 로 직접 돌리면 shell 을 타지 않아 경로 공백·따옴표 문제가 없다.
 * `relEntries` 는 CLI 가 놓인 디렉터리 기준 상대 경로 후보다.
 */
function resolveNodeCli(binName, relEntries) {
  const lookup = runCommand(IS_WIN ? "where" : "which", [binName], { timeoutMs: 15000 });
  if (!lookup.ok) return null;

  const candidates = lookup.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    for (const rel of relEntries) {
      const entry = path.resolve(path.dirname(candidate), rel);
      if (fs.existsSync(entry)) {
        return { command: process.execPath, prefix: [entry], shell: false };
      }
    }
  }

  // JS 진입점을 못 찾았다 — 이름 그대로 shell 에 맡긴다.
  return { command: binName, prefix: [], shell: IS_WIN };
}

function resolveCodex() {
  const override = process.env.CODEX_BIN;
  if (override) {
    if (/\.m?js$/i.test(override)) {
      return { command: process.execPath, prefix: [override], shell: false };
    }
    return { command: override, prefix: [], shell: IS_WIN };
  }

  return resolveNodeCli("codex", [
    "node_modules/@openai/codex/bin/codex.js",
    "../lib/node_modules/@openai/codex/bin/codex.js",
  ]);
}

function resolveNpm() {
  return (
    resolveNodeCli("npm", [
      "node_modules/npm/bin/npm-cli.js",
      "../lib/node_modules/npm/bin/npm-cli.js",
    ]) ?? { command: IS_WIN ? "npm.cmd" : "npm", prefix: [], shell: IS_WIN }
  );
}

function codexAvailability(codex, cwd) {
  const version = runCommand(codex.command, [...codex.prefix, "--version"], {
    cwd,
    timeoutMs: 30000,
    shell: codex.shell,
  });
  if (!version.ok) {
    return { ok: false, reason: "Codex CLI 를 실행할 수 없다 (codex --version 실패)" };
  }

  const login = runCommand(codex.command, [...codex.prefix, "login", "status"], {
    cwd,
    timeoutMs: 30000,
    shell: codex.shell,
  });
  const text = `${login.stdout}${login.stderr}`;
  if (!login.ok || !/logged in/i.test(text)) {
    return { ok: false, reason: "Codex 인증이 없다 (`codex login` 이 필요하다)" };
  }

  return { ok: true, version: version.stdout.trim() };
}

/* ------------------------------------------------------------- 검증 명령 */

/**
 * npm 자체가 못 돈 것(설치 문제·스크립트 없음)과 스크립트가 실패한 것을 가른다.
 * 앞의 것은 인프라 문제라 절대 막지 않는다.
 */
/** npm 이 스크립트를 아예 못 띄운 경우에만 해당한다 — 스크립트가 돈 뒤의 실패는 코드 문제다. */
const NPM_STARTUP_PATTERNS = [
  /Cannot find module\s+'?[^'\n]*[\\/]npm[\\/]bin[\\/]/i, // npm 자체가 깨졌다
  /is not recognized as an internal or external command/i,
  /command not found/i,
  /Could not read package\.json/i,
  /ENOENT.*package\.json/i,
];

/** 스크립트 자체가 없는 것 — 게이트 설정 문제지 코드 문제가 아니다. */
const NPM_MISSING_SCRIPT = /npm (ERR!|error)\s+Missing script/i;

/** npm 이 스크립트를 실행하면 `> 이름` / `> 명령` 헤더를 먼저 찍는다. */
const NPM_SCRIPT_HEADER = /^>\s/m;

function runGates(cwd, config) {
  if (!config.runGates) return null;
  if (!fs.existsSync(path.join(cwd, "package.json"))) return null;

  const npm = resolveNpm();

  for (const gate of config.gates ?? []) {
    if (gate.requires && !config[gate.requires]) continue;

    const result = runCommand(npm.command, [...npm.prefix, ...gate.args], {
      cwd,
      timeoutMs: config.gateTimeoutMs,
      shell: npm.shell,
    });
    if (result.ok) continue;

    const combined = `${result.stdout}\n${result.stderr}`.trim();

    // 스크립트가 한 번이라도 떴으면 그 뒤의 실패는 전부 코드 문제다.
    // (jest 의 "Cannot find module" 처럼 인프라 문구와 똑같이 생긴 진짜 회귀가 있다.)
    const scriptRan = NPM_SCRIPT_HEADER.test(combined);
    const startupFailure =
      !result.timedOut &&
      ((result.error != null && result.status == null) ||
        NPM_MISSING_SCRIPT.test(combined) ||
        (!scriptRan && NPM_STARTUP_PATTERNS.some((re) => re.test(combined))));

    if (startupFailure) {
      // 코드 문제가 아니다. 이 게이트만 건너뛴다.
      process.stdout.write(`Codex review gate skipped: \`npm ${gate.args.join(" ")}\` 실행 실패\n`);
      continue;
    }

    return {
      name: gate.name,
      command: `npm ${gate.args.join(" ")}`,
      timedOut: result.timedOut,
      output: truncate(combined, MAX_GATE_OUTPUT, "출력"),
    };
  }

  return null;
}

/* -------------------------------------------------------------- Codex 리뷰 */

function buildPrompt(cwd, config, changes) {
  let template;
  try {
    template = fs.readFileSync(PROMPT_FILE, "utf8");
  } catch {
    return null;
  }

  const branch = git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim() || "(unknown)";
  const ssot = (config.designSsotPaths ?? []).filter((p) => fs.existsSync(path.join(cwd, p)));

  return template
    .replace("{{PROJECT_DIR}}", cwd)
    .replace("{{BRANCH}}", branch)
    .replace(
      "{{DESIGN_SSOT}}",
      ssot.length ? ssot.map((p) => `- ${p}`).join("\n") : "(이 저장소에는 없다 — 건너뛴다)",
    )
    .replace("{{STAT}}", changes.stat || "(tracked 변경 없음)")
    .replace("{{UNTRACKED}}", formatUntracked(changes.untracked, cwd, config))
    .replace("{{PATCH}}", truncate(changes.patch || "(빈 패치)", config.maxPatchBytes, "패치"));
}

function runCodexReview(codex, cwd, config, prompt, artifactDir) {
  const outFile = path.join(artifactDir, "last-message.json");
  try {
    fs.rmSync(outFile, { force: true });
  } catch {
    /* 없으면 그만 */
  }

  const args = [
    ...codex.prefix,
    "exec",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "--skip-git-repo-check",
    "-C",
    cwd,
    "--output-schema",
    SCHEMA_FILE,
    "-o",
    outFile,
    "-c",
    "approval_policy=never",
  ];
  if (config.model) args.push("--model", config.model);
  args.push("-");

  const result = runCommand(codex.command, args, {
    cwd,
    timeoutMs: config.codexTimeoutMs,
    input: prompt,
    shell: codex.shell,
  });

  try {
    fs.writeFileSync(
      path.join(artifactDir, "last-run.log"),
      `${result.stdout}\n----- stderr -----\n${result.stderr}\n`,
      "utf8",
    );
  } catch {
    /* 로그 실패는 무시 */
  }

  if (result.timedOut) {
    return {
      ok: false,
      reason: `Codex 리뷰가 ${Math.round(config.codexTimeoutMs / 1000)}초 안에 끝나지 않았다`,
    };
  }
  if (result.error) {
    return { ok: false, reason: `Codex 실행 실패 (${result.error.code ?? result.error.message})` };
  }
  if (!result.ok) {
    const detail = (result.stderr || result.stdout || "").trim().split(/\r?\n/).slice(-3).join(" ");
    return { ok: false, reason: `Codex 가 오류로 끝났다 (exit ${result.status}) ${detail}`.trim() };
  }

  let raw;
  try {
    raw = fs.readFileSync(outFile, "utf8").trim();
  } catch {
    return { ok: false, reason: "Codex 가 최종 응답을 남기지 않았다" };
  }
  if (!raw) return { ok: false, reason: "Codex 최종 응답이 비어 있다" };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Codex 응답이 JSON 이 아니다" };
  }

  if (parsed?.verdict !== "pass" && parsed?.verdict !== "fail") {
    return { ok: false, reason: "Codex 응답이 스키마와 다르다 (verdict 없음)" };
  }
  if (!Array.isArray(parsed.findings)) parsed.findings = [];

  return { ok: true, review: parsed };
}

/* -------------------------------------------------------------- 리포트 */

function formatFindings(review) {
  const rank = { P0: 0, P1: 1, P2: 2 };
  const findings = review.findings
    .filter((f) => f && rank[f.severity] != null)
    .sort((a, b) => rank[a.severity] - rank[b.severity]);

  const lines = findings.map((f, i) => {
    const parts = [`${i + 1}. [${f.severity}] ${f.file || "(경로 불명)"}`, `   문제: ${f.message}`];
    if (f.reason) parts.push(`   이유: ${f.reason}`);
    if (f.suggestion) parts.push(`   수정 방향: ${f.suggestion}`);
    return parts.join("\n");
  });

  return { findings, text: lines.join("\n\n") };
}

/* ---------------------------------------------------------------- main */

function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const config = loadConfig();

  if (!config.enabled) skip("CODEX_REVIEW 로 꺼져 있다");

  if (!git(cwd, ["rev-parse", "--is-inside-work-tree"]).ok) {
    skip("git 저장소가 아니다");
  }

  const changes = collectChanges(cwd, config);
  if (changes.error) skip(changes.error);

  const hasChanges = Boolean(changes.patch.trim()) || changes.untracked.length > 0;
  if (!hasChanges) allow("Codex review: 워킹 트리 변경 없음 — 리뷰 없이 종료한다.");

  const diffHash = crypto
    .createHash("sha256")
    .update(changes.patch)
    .update("\0")
    .update(changes.untrackedFingerprint)
    .digest("hex")
    .slice(0, 16);

  const stateFile = stateFileFor(cwd, input.session_id);
  const state = loadState(stateFile);

  // ── 무한 루프 방지 ────────────────────────────────────────────────
  //
  // ⚠ 이 캐시는 **Codex 리뷰 결과에만** 적용된다. 게이트(typecheck·lint·test)
  // 실패는 여기로 들어오지 않는다 — 같은 diff 를 통과시키는 규칙에 얹으면
  // "한 번 막히고 그대로 다시 종료" 로 깨진 트리가 검증 없이 빠져나간다.
  // 리뷰는 같은 입력에 같은 findings 를 내지만, 게이트는 **사실**을 말한다.
  const cached = state.verdicts[diffHash];
  if (cached === "pass") {
    allow("Codex review: 이 diff 는 이미 통과했다 — 재리뷰 없이 종료한다.");
  }
  if (cached === "fail") {
    // 막았는데 diff 가 그대로다. 또 막으면 무한 루프다.
    allow(
      "Codex review: 직전과 동일한 diff 다 (findings 는 이미 전달했다) — 재리뷰 없이 종료한다.",
    );
  }
  // 세션 상한은 **게이트 차단과 리뷰 차단을 함께** 센다 — README 「세션당 block 상한」이
  // 약속하는 것이 그 합이다. 둘을 따로 세면 상한이 사실상 두 배가 된다
  const blocksThisSession = state.blockedHashes.length + state.gateBlockCount;
  if (blocksThisSession >= config.maxBlocksPerSession) {
    allow(
      `Codex review: 이 세션에서 이미 ${blocksThisSession}번 막았다 — 루프 방지를 위해 통과시킨다. 필요하면 직접 리뷰해라.`,
    );
  }

  const recordBlock = (verdict) => {
    state.verdicts[diffHash] = verdict;
    if (!state.blockedHashes.includes(diffHash)) state.blockedHashes.push(diffHash);
    saveState(stateFile, state);
  };

  // ── 1. 검증 명령 ─────────────────────────────────────────────────
  const codePattern = new RegExp(config.codePathPattern);
  const touchesCode = changes.changedPaths.some((p) => codePattern.test(p));

  if (touchesCode) {
    const failed = runGates(cwd, config);
    if (failed) {
      // **게이트는 같은 diff 여도 다시 막는다.** 리뷰 findings 와 달리 이건
      // 의견이 아니라 사실이라, 안 고쳤으면 여전히 깨져 있다.
      //
      // 갇히지 않는 것은 **위쪽 세션 상한**이 맡는다(`gateBlockCount`). 여기서
      // diff 별 횟수로 놓아주면, 조금씩 고쳐 해시가 바뀔 때마다 1 로 초기화돼
      // 상한에 영영 닿지 않는다.
      const tries = (state.gateBlocks[diffHash] ?? 0) + 1;
      state.gateBlocks[diffHash] = tries;
      state.gateBlockCount += 1;
      saveState(stateFile, state);

      // 남은 횟수도 **합산 기준**이어야 한다 — 상한이 합을 보는데 안내만 게이트 수를
      // 세면 리뷰가 이미 막은 세션에서 실제보다 여유가 있다고 말하게 된다
      const left = Math.max(
        0,
        config.maxBlocksPerSession - (state.blockedHashes.length + state.gateBlockCount),
      );
      block(
        [
          `검증 실패: \`${failed.command}\`${failed.timedOut ? " (타임아웃)" : ""}`,
          tries > 1 ? `(같은 diff 로 ${tries}번째다 — 아직 안 고쳐졌다)` : "",
          "",
          "Codex 리뷰 이전 단계다. 아래 출력을 보고 고친 뒤 typecheck · lint · test 를 다시 돌려라.",
          left === 0
            ? "⚠ 다음 종료부터는 세션 상한에 걸려 **검증 없이 통과**한다 — 여기서 고쳐라."
            : `(이 세션에서 ${left}번 더 막을 수 있다)`,
          "",
          "```",
          failed.output,
          "```",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    // 게이트를 통과했으면 이 diff 의 실패 기록은 지운다 —
    // 고쳐 놓고도 옛 횟수 때문에 일찍 놓여나지 않게
    if (state.gateBlocks[diffHash] != null) {
      delete state.gateBlocks[diffHash];
      saveState(stateFile, state);
    }
  }

  // ── 2. Codex 준비 ────────────────────────────────────────────────
  const codex = resolveCodex();
  if (!codex) skip("Codex CLI 가 설치되어 있지 않다");

  const availability = codexAvailability(codex, cwd);
  if (!availability.ok) skip(availability.reason);

  const prompt = buildPrompt(cwd, config, changes);
  if (!prompt) skip("리뷰 프롬프트 파일을 읽을 수 없다");

  const artifactDir = path.dirname(stateFile);
  const result = runCodexReview(codex, cwd, config, prompt, artifactDir);
  if (!result.ok) skip(result.reason);

  // ── 3. 판정 ──────────────────────────────────────────────────────
  const { review } = result;
  const { findings, text } = formatFindings(review);

  // 판정은 **findings 가 정한다.** `verdict` 는 참고만 한다 —
  // 스키마가 "pass + findings 3건" 같은 모순을 막지 못하는데,
  // verdict 를 믿으면 진짜 finding 이 통과해 버린다(fail-open).
  if (findings.length === 0) {
    state.verdicts[diffHash] = "pass";
    saveState(stateFile, state);
    const note = review.verdict === "fail" ? " (verdict 는 fail 이었으나 finding 이 없다)" : "";
    allow(`Codex review: PASS — ${review.summary || "문제 없음"}${note}`);
  }

  recordBlock("fail");
  block(
    [
      `Codex 코드 리뷰가 문제를 찾았다 (${findings.length}건). 종료 전에 고쳐라.`,
      "",
      `요약: ${review.summary || "(없음)"}`,
      "",
      text,
      "",
      "고친 뒤에 `npm run typecheck` · `npm run lint` · `npm test` 를 다시 돌리고 마무리해라.",
      "다시 종료하면 바뀐 diff 를 Codex 가 재검토한다.",
      "findings 가 틀렸다고 판단하면 그 근거를 답변에 적고 그대로 마무리해도 된다 —",
      "같은 diff 로는 다시 막히지 않는다.",
    ].join("\n"),
  );
}

try {
  main();
} catch (error) {
  // 훅 자체의 버그가 작업을 막아서는 안 된다.
  skip(`hook 오류 — ${error instanceof Error ? error.message : String(error)}`);
}
