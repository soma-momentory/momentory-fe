// @ts-check
import { spawn } from 'node:child_process';
import path from 'node:path';

// 외부 프로세스 실행을 한 곳에 모은다. 오케스트레이션은 Runner를 주입받아 테스트에서 fake로 바꾼다.

/**
 * @typedef {object} RunOptions
 * @property {string} cwd
 * @property {number} timeoutMs
 * @property {string} [input] stdin으로 전달할 내용
 * @property {NodeJS.ProcessEnv} [env]
 * @property {boolean} [shell] Windows에서 .cmd 명령(npm, codex)을 실행할 때만 사용
 */

/**
 * @typedef {object} RunResult
 * @property {number | null} code
 * @property {string} stdout
 * @property {string} stderr
 * @property {boolean} timedOut
 * @property {string} [spawnError]
 */

/** @typedef {(command: string, args: string[], options: RunOptions) => Promise<RunResult>} Runner */

// cmd.exe 안에서 큰따옴표로도 막을 수 없는 문자. 하네스가 만드는 인자에는 나오지 않아야 한다.
const CMD_UNSAFE = /["%\r\n]/;
const CMD_NEEDS_QUOTES = /[\s&|<>^()]/;

/**
 * shell(cmd.exe)로 실행할 인자를 안전하게 감싼다.
 * @param {string} arg
 */
export function quoteForCmd(arg) {
  if (CMD_UNSAFE.test(arg)) {
    throw new Error(`cmd.exe로 안전하게 전달할 수 없는 인자입니다: ${arg}`);
  }
  return arg === '' || CMD_NEEDS_QUOTES.test(arg) ? `"${arg}"` : arg;
}

// ---------------------------------------------------------------------------
// 프로세스 트리 종료 (Task 007 D4)
// Windows: taskkill /T /F로 트리를 종료하고 taskkill 완료를 기다린다.
// POSIX: 자식을 detached(별도 process group)로 실행하고 group 전체에 SIGTERM → SIGKILL을 보낸다.
// 어느 쪽이든 실제 종료를 확인한 경우에만 true를 반환하고, 확인할 수 없는 상황은 모두 false(미확인)다.

const KILL_WAIT_MS = 5_000;
const POLL_MS = 100;

/**
 * @typedef {object} TerminateOptions
 * @property {NodeJS.Platform} [platform]
 * @property {(pid: number) => Promise<number | null>} [taskkill] Windows: `taskkill /T /F` 실행 후 exit code (실행 실패 시 null)
 * @property {(pid: number, signal: NodeJS.Signals | 0) => void} [signalGroup] POSIX: process group에 신호를 보낸다.
 * @property {number} [waitMs]
 */

/** @param {number} pid */
function runTaskkill(pid) {
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    killer.once('error', () => resolve(null));
    killer.once('exit', (code) => resolve(code));
  });
}

/**
 * @param {number} pid
 * @param {NodeJS.Signals | 0} signal
 */
function signalProcessGroup(pid, signal) {
  process.kill(-pid, signal);
}

/** @param {number} ms */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * promise가 ms 안에 끝나면 true.
 * @param {Promise<unknown>} promise
 * @param {number} ms
 */
async function settlesWithin(promise, ms) {
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  const settled = await Promise.race([promise.then(() => true), timeout]);
  clearTimeout(timer);
  return settled === true;
}

/**
 * POSIX: group의 프로세스가 모두 없어질 때까지 기다린다. 확인할 수 없으면(EPERM 등) 살아 있는 것으로 본다.
 * @param {(pid: number, signal: NodeJS.Signals | 0) => void} signalGroup
 * @param {number} pid
 * @param {number} ms
 */
async function waitGroupGone(signalGroup, pid, ms) {
  const deadline = Date.now() + ms;
  for (;;) {
    try {
      signalGroup(pid, 0);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ESRCH') {
        return true;
      }
    }
    if (Date.now() >= deadline) return false;
    await delay(POLL_MS);
  }
}

/**
 * 프로세스 트리를 종료하고 실제로 종료됐는지 확인한다.
 * @param {number} pid
 * @param {Promise<void>} closed 직접 실행한 자식의 종료 이벤트
 * @param {TerminateOptions} [options]
 * @returns {Promise<boolean>} 종료를 확인했으면 true
 */
export async function terminateTree(pid, closed, options = {}) {
  const {
    platform = process.platform,
    taskkill = runTaskkill,
    signalGroup = signalProcessGroup,
    waitMs = KILL_WAIT_MS,
  } = options;

  if (platform === 'win32') {
    // 종료 확인 근거: taskkill /T /F가 exit 0이면 지정 pid가 실행 중이었고, 그 시점의 하위 트리(부모-자식 관계)를
    // 찾아 모두 강제 종료했다는 뜻이다. 여기에 직접 실행한 자식의 종료 이벤트까지 확인되어야 종료로 본다.
    // 128(pid를 찾을 수 없음)은 부모가 먼저 끝나 하위 트리를 찾지 못했을 수 있으므로, 직접 자식이 종료됐더라도 미확인이다.
    // 그 외 exit code, taskkill 실행 실패, 자식 종료 시간 초과도 미확인이다.
    const code = await taskkill(pid);
    const exited = await settlesWithin(closed, waitMs);
    return code === 0 && exited;
  }

  for (const signal of /** @type {const} */ (['SIGTERM', 'SIGKILL'])) {
    try {
      signalGroup(pid, signal);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'ESRCH') {
        return false;
      }
    }
    if (await waitGroupGone(signalGroup, pid, waitMs / 2)) {
      return settlesWithin(closed, waitMs);
    }
  }
  return false;
}

// 실행 중인 자식 프로세스. 신호를 받으면 lock 정리 전에 모두 종료한다. (Task 007 D4)
/** @type {Map<import('node:child_process').ChildProcess, { command: string, closed: Promise<void> }>} */
const activeChildren = new Map();

/**
 * 신호를 받은 시점의 자식 프로세스 목록
 * @typedef {object} ChildSnapshot
 * @property {import('./runStore.mjs').TrackedChild} info
 * @property {Promise<void>} closed
 */

/**
 * 지금 실행 중인 자식 프로세스 목록. 이후 자식이 스스로 종료돼도 목록에 남아 종료 확인 대상이 된다.
 * (직접 자식이 종료됐다고 하위 프로세스까지 종료됐다는 뜻은 아니다)
 * @returns {ChildSnapshot[]}
 */
export function snapshotActiveChildren() {
  /** @type {ChildSnapshot[]} */
  const snapshot = [];
  for (const [child, { command, closed }] of activeChildren) {
    if (child.pid === undefined) continue;
    snapshot.push({
      info: {
        pid: child.pid,
        command,
        processGroup: process.platform === 'win32' ? null : child.pid,
      },
      closed,
    });
  }
  return snapshot;
}

/**
 * 목록의 자식 프로세스 트리를 모두 종료한다.
 * @param {ChildSnapshot[]} snapshot
 * @param {TerminateOptions} [options]
 * @returns {Promise<boolean>} 모두 종료를 확인했으면 true. 하나라도 확인하지 못하면 false
 */
export async function terminateChildren(snapshot, options) {
  const results = await Promise.all(
    snapshot.map(({ info, closed }) =>
      terminateTree(info.pid, closed, options),
    ),
  );
  return results.every(Boolean);
}

/**
 * 지금 실행 중인 자식 프로세스 트리를 모두 종료한다.
 * @param {TerminateOptions} [options]
 */
export function killActiveChildren(options) {
  return terminateChildren(snapshotActiveChildren(), options);
}

/** @type {Runner} */
export function runProcess(command, args, options) {
  const { cwd, timeoutMs, input, env, shell = false } = options;

  return new Promise((resolve) => {
    let finalArgs = args;
    if (shell && process.platform === 'win32') {
      try {
        finalArgs = args.map(quoteForCmd);
      } catch (error) {
        resolve({
          code: null,
          stdout: '',
          stderr: '',
          timedOut: false,
          spawnError: String(error),
        });
        return;
      }
    }

    const child = spawn(command, finalArgs, {
      cwd,
      env,
      shell,
      windowsHide: true,
      // POSIX: 별도 process group으로 실행해 하위 프로세스까지 group 단위로 종료한다. (Windows는 taskkill /T)
      detached: process.platform !== 'win32',
    });
    /** @type {Promise<void>} */
    const closed = new Promise((resolveClosed) => {
      child.once('close', () => resolveClosed());
      child.once('error', () => resolveClosed());
    });
    activeChildren.set(child, { command: path.basename(command), closed });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      if (child.pid !== undefined) void terminateTree(child.pid, closed);
    }, timeoutMs);

    /** @param {RunResult} result */
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeChildren.delete(child);
      resolve(result);
    };

    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (chunk) => (stdout += chunk));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.on('error', (error) =>
      finish({
        code: null,
        stdout,
        stderr,
        timedOut,
        spawnError: error.message,
      }),
    );
    child.on('close', (code) => finish({ code, stdout, stderr, timedOut }));

    child.stdin?.on('error', () => {});
    child.stdin?.end(input ?? '');
  });
}

/**
 * 실패한 실행 결과를 사람이 읽을 수 있는 한 줄 사유로 만든다.
 * @param {string} label
 * @param {RunResult} result
 */
export function describeFailure(label, result) {
  if (result.spawnError) return `${label} 실행 실패: ${result.spawnError}`;
  if (result.timedOut) return `${label} 시간 초과`;
  // stdout / stderr 원문은 콘솔 / report에 넣지 않는다. 원문은 run 로그 파일에만 남긴다. (Task 007)
  return `${label} 비정상 종료 · exit ${result.code}`;
}
