// @ts-check
/**
 * 이 PC 에 깔린 CLI 를 찾는다 — claude · codex · gh.
 *
 * - claude : 네이티브 실행 파일(`claude.exe`)이라 그대로 띄운다.
 * - codex  : npm 전역 설치는 `codex.cmd` 셈이다. 셈은 cmd.exe 를 거쳐야 돌아서 인자 따옴표가
 *            cmd 규칙으로 다시 해석된다 — 그래서 셈 옆의 `node_modules/@openai/codex/bin/codex.js` 를
 *            찾아 `process.execPath`(지금 Metro 를 돌리는 node)로 직접 띄운다. 못 찾으면 쓰지 않는다.
 * - gh     : 「검토 요청 올리기(PR)」에만 쓴다.
 *
 * 인증은 손대지 않는다 — 자식은 부모 환경 그대로, 이 PC 에 로그인된 CLI 기본값으로 돈다.
 */
const fs = require("node:fs");
const path = require("node:path");

const { IS_WIN, findOnPath, run } = require("./proc");

/** @typedef {{ file: string; prefix: string[] }} Launcher 실행 파일 + 앞에 붙일 인자 */
/** @typedef {{ claude: Launcher | null; codex: Launcher | null; gh: Launcher | null;
 *   versions: { claude: string | null; codex: string | null; gh: string | null } }} Tools */

/** @param {string} shimPath `codex.cmd` 또는 `codex` 셈 @returns {Launcher | null} */
function codexFromShim(shimPath) {
  const dir = path.dirname(shimPath);
  const script = path.join(dir, "node_modules", "@openai", "codex", "bin", "codex.js");
  if (fs.existsSync(script)) return { file: process.execPath, prefix: [script] };
  return null;
}

/** @returns {Launcher | null} */
function findClaude() {
  const exe = findOnPath("claude", IS_WIN ? [".exe"] : [""]);
  if (exe) return { file: exe, prefix: [] };
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (home) {
    const local = path.join(home, ".local", "bin", IS_WIN ? "claude.exe" : "claude");
    if (fs.existsSync(local)) return { file: local, prefix: [] };
  }
  return null;
}

/** @returns {Launcher | null} */
function findCodex() {
  const shim = findOnPath("codex", IS_WIN ? [".cmd", ""] : [""]);
  if (!shim) return null;
  if (IS_WIN) return codexFromShim(shim);
  return { file: shim, prefix: [] };
}

/** @returns {Launcher | null} */
function findGh() {
  const exe = findOnPath("gh", IS_WIN ? [".exe"] : [""]);
  return exe ? { file: exe, prefix: [] } : null;
}

/** @param {Launcher | null} tool */
async function versionOf(tool) {
  if (!tool) return null;
  const result = await run(tool.file, [...tool.prefix, "--version"], { timeoutMs: 15_000 });
  if (result.code !== 0) return null;
  return result.stdout.trim().split(/\r?\n/)[0] ?? null;
}

/** @type {Promise<Tools> | null} */
let cached = null;
let cachedAt = 0;

/** 1분 동안 기억한다 — 상태를 열 때마다 `--version` 셋을 돌리지 않게. @returns {Promise<Tools>} */
function detectTools() {
  if (cached && Date.now() - cachedAt < 60_000) return cached;
  cachedAt = Date.now();
  cached = (async () => {
    const claude = findClaude();
    const codex = findCodex();
    const gh = findGh();
    const [cv, xv, gv] = await Promise.all([versionOf(claude), versionOf(codex), versionOf(gh)]);
    return {
      claude: cv ? claude : null,
      codex: xv ? codex : null,
      gh: gv ? gh : null,
      versions: { claude: cv, codex: xv, gh: gv },
    };
  })();
  return cached;
}

module.exports = { detectTools, codexFromShim };
