// @ts-check
/**
 * 자식 프로세스의 단일 통로 — 「AI에게 맡기기」가 부르는 git · gh · claude · codex · expo 는 전부 여기를 지난다.
 *
 * **셸을 거치지 않는다.** 인자는 배열로만 넘기고(`shell: false`), 프롬프트처럼 긴 글은 stdin 이나
 * 임시 파일로 보낸다 — 사용자가 적은 지시가 명령줄로 해석될 길을 만들지 않는다.
 * Windows 의 `.cmd` 셈(npm 이 까는 `codex.cmd` 같은 것)은 cmd.exe 를 지나야 하므로 쓰지 않고,
 * 그 셈이 부르는 node 스크립트를 찾아 `process.execPath` 로 직접 돌린다(`cli.js`).
 */
const { execFile, spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const IS_WIN = process.platform === "win32";

/**
 * 명령을 끝까지 돌리고 결과를 돌려준다. 던지지 않는다.
 * @param {string} file
 * @param {readonly string[]} args
 * @param {{ cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv; input?: string }} [opts]
 * @returns {Promise<{ code: number; stdout: string; stderr: string }>}
 */
function run(file, args, opts = {}) {
  return new Promise((resolve) => {
    const child = execFile(
      file,
      [...args],
      {
        cwd: opts.cwd,
        env: opts.env ?? process.env,
        timeout: opts.timeoutMs ?? 60_000,
        maxBuffer: 32 * 1024 * 1024,
        windowsHide: true,
        encoding: "utf8",
        shell: false,
      },
      (error, stdout, stderr) => {
        const code =
          error == null
            ? 0
            : typeof (/** @type {any} */ (error).code) === "number"
              ? /** @type {any} */ (error).code
              : 1;
        resolve({
          code,
          stdout: String(stdout ?? ""),
          stderr: String(stderr ?? "") || (error && code !== 0 ? String(error.message) : ""),
        });
      },
    );
    if (opts.input != null) child.stdin?.end(opts.input);
  });
}

/** git 한 번. @param {string} cwd @param {readonly string[]} args @param {number} [timeoutMs] */
const git = (cwd, args, timeoutMs) => run("git", ["-C", cwd, ...args], { timeoutMs });

/**
 * 프로세스와 그 자식 전부를 끝낸다. Windows 는 `taskkill /T /F` — 셈 뒤의 node · 에이전트가 남지 않게.
 * @param {number | undefined} pid
 * @param {{ sync?: boolean }} [opts]
 */
function killTree(pid, opts = {}) {
  if (!pid) return;
  if (IS_WIN) {
    const args = ["/pid", String(pid), "/T", "/F"];
    if (opts.sync) spawnSync("taskkill", args, { windowsHide: true, stdio: "ignore" });
    else spawn("taskkill", args, { windowsHide: true, stdio: "ignore" }).on("error", () => {});
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      /* 이미 끝났다 */
    }
  }
}

/**
 * PATH 에서 실행 파일을 찾는다(셸의 `where`/`which` 대신 — 셸을 띄우지 않으려고).
 * @param {string} name 확장자 없는 이름
 * @param {readonly string[]} [exts] Windows 에서 붙여 볼 확장자
 * @returns {string | null}
 */
function findOnPath(name, exts = IS_WIN ? [".exe", ".cmd", ""] : [""]) {
  const dirs = (process.env.PATH ?? process.env.Path ?? "").split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext);
      try {
        if (fs.statSync(candidate).isFile()) return candidate;
      } catch {
        /* 없다 */
      }
    }
  }
  return null;
}

module.exports = { IS_WIN, run, git, killTree, findOnPath };
