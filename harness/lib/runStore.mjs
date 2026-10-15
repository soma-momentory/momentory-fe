// @ts-check
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// harness/runs/<runId>/ 실행 기록과 동시 실행 lock.

const RUN_ID = /^\d{8}-\d{6}(-\d+)?$/;
const LOCK_FILE = '.lock';
// stale lock 복구를 한 번에 한 실행만 하도록 하는 mutex (Task 007 리뷰 반영)
const RECOVERY_FILE = '.lock.recovery';

/** @param {string} runId */
export function isValidRunId(runId) {
  return RUN_ID.test(runId);
}

/** @param {Date} date */
export function formatRunId(date) {
  const pad = (/** @type {number} */ value) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * @param {string} runsDir
 * @param {Date} now
 */
export function createRunDir(runsDir, now) {
  fs.mkdirSync(runsDir, { recursive: true });
  const base = formatRunId(now);
  for (let suffix = 1; ; suffix += 1) {
    const runId = suffix === 1 ? base : `${base}-${suffix}`;
    const dir = path.join(runsDir, runId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      return { runId, dir };
    }
  }
}

/**
 * @param {string} dir
 * @param {string} name
 * @param {unknown} data
 */
export function writeJson(dir, name, data) {
  fs.writeFileSync(path.join(dir, name), `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * 저장 중 중단되어도 파일이 손상되지 않게 임시 파일에 쓴 뒤 rename한다.
 * @param {string} dir
 * @param {string} name
 * @param {unknown} data
 */
export function writeJsonAtomic(dir, name, data) {
  const target = path.join(dir, name);
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temp, target);
}

/**
 * @param {string} dir
 * @param {string} name
 * @param {string} text
 */
export function writeText(dir, name, text) {
  fs.writeFileSync(path.join(dir, name), text);
}

/**
 * @param {string} dir
 * @param {string} name
 * @returns {any}
 */
export function readJson(dir, name) {
  return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
}

// ---------------------------------------------------------------------------
// 동시 실행 lock (Task 007: pid 기반 stale lock 복구)
//
// 안전 원칙: 확실하지 않으면 lock을 해제하지 않고, 확실하지 않으면 stale lock을 복구하지 않는다.

/**
 * 신호 정리 중 기록하는 하위 프로세스 정보 (lock metadata)
 * @typedef {object} TrackedChild
 * @property {number} pid
 * @property {string} command 실행 파일 이름 (인자는 기록하지 않는다)
 * @property {number | null} processGroup POSIX process group id (Windows는 null)
 */

/**
 * 하위 프로세스 종료를 확인하지 못한 상태. 이 정보가 있는 lock은 소유자 pid가 죽어도 자동 복구하지 않는다.
 * @typedef {object} CleanupRequired
 * @property {string} reason
 * @property {string} signal
 * @property {string} stage 중단 당시 하네스 상태
 * @property {TrackedChild[]} children
 * @property {string} markedAt
 */

/**
 * @typedef {object} LockInfo
 * @property {number} pid
 * @property {string} runId
 * @property {string | null} createdAt 이전 형식 lock에는 없다.
 * @property {CleanupRequired | null} cleanupRequired
 */

const LEGACY_LOCK = /^(\S+)\r?\npid (\d+)\r?\n?$/;

/**
 * lock 내용을 해석한다. JSON 형식과 이전 형식(`<runId>\npid <n>\n`)을 읽고, 해석할 수 없으면 null.
 * @param {string} text
 * @returns {LockInfo | null}
 */
export function parseLock(text) {
  /** @type {any} */
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const legacy = LEGACY_LOCK.exec(text);
    if (!legacy) return null;
    const pid = Number(legacy[2]);
    return pid > 0
      ? { pid, runId: legacy[1], createdAt: null, cleanupRequired: null }
      : null;
  }
  if (
    !Number.isInteger(data?.pid) ||
    data.pid <= 0 ||
    typeof data.runId !== 'string'
  ) {
    return null;
  }
  return {
    pid: data.pid,
    runId: data.runId,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : null,
    cleanupRequired: parseCleanupRequired(data.cleanupRequired),
  };
}

/**
 * cleanupRequired 필드. 필드가 있는데 형식이 깨졌어도 "종료 미확인"으로 본다. (안전한 쪽)
 * @param {any} value
 * @returns {CleanupRequired | null}
 */
function parseCleanupRequired(value) {
  if (value === undefined || value === null) return null;
  const children = Array.isArray(value?.children)
    ? value.children
        .filter((/** @type {any} */ child) => Number.isInteger(child?.pid))
        .map((/** @type {any} */ child) => ({
          pid: child.pid,
          command: typeof child.command === 'string' ? child.command : '?',
          processGroup: Number.isInteger(child.processGroup)
            ? child.processGroup
            : null,
        }))
    : [];
  /** @param {unknown} field */
  const text = (field) => (typeof field === 'string' ? field : '?');
  return {
    reason: text(value?.reason),
    signal: text(value?.signal),
    stage: text(value?.stage),
    children,
    markedAt: text(value?.markedAt),
  };
}

/**
 * pid 프로세스가 살아 있는지 확인한다. 확실히 없을 때(ESRCH)만 false.
 * @param {number} pid
 */
export function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return /** @type {NodeJS.ErrnoException} */ (error).code !== 'ESRCH';
  }
}

/** @param {LockInfo} lock */
export function describeLock(lock) {
  const createdAt = lock.createdAt ? `, 시작 ${lock.createdAt}` : '';
  return `${lock.runId}, pid ${lock.pid}${createdAt}`;
}

/** @param {TrackedChild[]} children */
export function describeChildren(children) {
  if (children.length === 0) return '(기록된 하위 프로세스 없음)';
  return children
    .map(
      (child) =>
        `pid ${child.pid} (${child.command}` +
        (child.processGroup === null
          ? ')'
          : `, process group ${child.processGroup})`),
    )
    .join(', ');
}

/**
 * @param {LockInfo} holder
 * @param {string} lockPath
 * @param {CleanupRequired} cleanup
 */
function describeCleanupRequired(holder, lockPath, cleanup) {
  return [
    `이전 하네스 실행(${describeLock(holder)})의 하위 프로세스 종료를 확인하지 못해 lock이 복구 보류 상태입니다: ${lockPath}`,
    `- 이유: ${cleanup.reason} (${cleanup.signal}, 중단 당시 상태 ${cleanup.stage})`,
    `- 추적했던 프로세스: ${describeChildren(cleanup.children)}`,
    '위 프로세스와 그 하위 프로세스(claude / codex / node / npm 등)가 모두 종료됐는지 직접 확인한 뒤 lock 파일을 삭제하고 다시 실행하세요.',
    '(추적했던 pid가 종료됐더라도 그 하위 프로세스까지 종료됐다는 뜻은 아니므로 자동으로 복구하지 않습니다.)',
  ].join('\n');
}

export class AtomicLockUnsupportedError extends Error {}

/**
 * lock 파일을 내용이 채워진 상태로 원자적으로 만든다. 이미 있으면 false.
 * 임시 파일에 내용을 모두 쓴 뒤 hard link로 lock 이름을 만든다. link는 이름이 이미 있으면 실패(EEXIST)하는
 * 원자적 생성이므로, 다른 실행이 내용을 쓰는 중인 빈 lock을 보지 않는다.
 * hard link를 쓸 수 없으면 non-atomic 생성으로 내려가지 않고 실패한다. (기존 lock은 건드리지 않는다)
 * @param {string} lockPath
 * @param {string} content
 * @param {typeof fs.linkSync} link
 */
function tryCreateLock(lockPath, content, link) {
  const temp = `${lockPath}.${process.pid}.${randomUUID()}.tmp`;
  fs.writeFileSync(temp, content);
  try {
    link(temp, lockPath);
    return true;
  } catch (error) {
    const { code } = /** @type {NodeJS.ErrnoException} */ (error);
    if (code === 'EEXIST') return false;
    // Windows: 지워지는 중인 같은 이름이 있으면 EPERM. 이름이 있으면 다른 실행이 획득한 것으로 본다.
    if (
      code === 'EPERM' &&
      process.platform === 'win32' &&
      fs.existsSync(lockPath)
    ) {
      return false;
    }
    throw new AtomicLockUnsupportedError(
      `이 파일 시스템에서는 lock을 원자적으로 만들 수 없어(hard link 실패: ${code ?? 'unknown'}) 실행할 수 없습니다: ${lockPath}\n` +
        'harness/runs가 hard link를 지원하는 로컬 파일 시스템(NTFS, ext4, APFS 등)에 있는지 확인하세요.',
    );
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

/** @param {string} lockPath */
function readLockText(lockPath) {
  try {
    return fs.readFileSync(lockPath, 'utf8');
  } catch {
    return null;
  }
}

const RACE_MESSAGE =
  '다른 하네스 실행이 방금 lock을 획득했습니다. 잠시 후 다시 실행하세요.';

/**
 * @typedef {'stale-detected' | 'recovery-locked' | 'stale-removed'} RecoveryStep
 */

/**
 * lock을 획득한다. 살아 있는 실행의 lock이 있거나 lock을 해석할 수 없으면 예외를 던진다. (D5)
 * 죽은 pid의 일반 lock(stale)은 제거하고 획득하며, 제거한 lock 정보를 반환한다.
 * 하위 프로세스 종료를 확인하지 못했다는 기록(cleanupRequired)이 있는 lock은 소유자가 죽었어도 복구하지 않는다.
 *
 * 경쟁 처리:
 * - 새 lock 생성은 항상 원자적 생성(이미 있으면 실패)이므로 lock 파일이 있는 동안 두 실행이 함께 획득할 수 없다.
 * - lock 파일을 지우는 경로는 둘뿐이다. (1) 소유자가 자신의 lock을 해제 (2) 복구 mutex(`.lock.recovery`)를
 *   가진 실행이 stale lock을 제거. 복구는 한 번에 하나만 하고, mutex를 가진 뒤 lock 내용을 다시 읽어
 *   처음 확인한 stale lock과 같을 때만 지운다. 그 사이 lock 파일은 죽은 소유자도, 다른 복구자도 바꿀 수 없으므로
 *   다른 실행이 새로 만든 lock을 지우지 않는다.
 * @param {string} runsDir
 * @param {string} runId
 * @param {{ now?: Date, pid?: number, isAlive?: (pid: number) => boolean, onRecoveryStep?: (step: RecoveryStep) => void, link?: typeof fs.linkSync }} [options]
 *   onRecoveryStep / link는 경쟁 상황과 파일 시스템 제약을 재현하는 테스트용이다.
 * @returns {{ stale: LockInfo | null }}
 */
export function acquireLock(runsDir, runId, options = {}) {
  const {
    now = new Date(),
    pid = process.pid,
    isAlive = isProcessAlive,
    onRecoveryStep,
    link = fs.linkSync,
  } = options;
  fs.mkdirSync(runsDir, { recursive: true });
  const lockPath = path.join(runsDir, LOCK_FILE);
  const recoveryPath = path.join(runsDir, RECOVERY_FILE);
  const content = `${JSON.stringify({ pid, runId, createdAt: now.toISOString() })}\n`;

  // 이전 run의 하위 프로세스 종료가 확인되지 않았다는 marker가 있으면 lock을 만들거나 복구하지 않는다.
  assertNoCleanupMarkers(runsDir, lockPath);
  if (tryCreateLock(lockPath, content, link)) return { stale: null };

  const text = readLockText(lockPath);
  if (text === null) {
    // 읽기 전에 소유자가 lock을 해제한 경우
    if (tryCreateLock(lockPath, content, link)) return { stale: null };
    throw new Error(RACE_MESSAGE);
  }

  const holder = parseLock(text);
  if (!holder) {
    throw new Error(
      `lock 파일을 해석할 수 없습니다: ${lockPath}\n` +
        '진행 중인 하네스 실행(node harness/run.mjs)이 없는지 확인한 뒤 이 파일을 직접 삭제하고 다시 실행하세요.',
    );
  }
  if (isAlive(holder.pid)) {
    throw new Error(
      `다른 하네스 실행(${describeLock(holder)})이 진행 중입니다.\n` +
        `해당 pid가 하네스가 아닌 다른 프로세스라면(pid 재사용) 진행 중인 실행이 없는지 확인한 뒤 ${lockPath}를 삭제하세요.`,
    );
  }
  // 소유자가 죽었어도 하위 프로세스 종료가 확인되지 않은 lock은 복구 보류: 자동 삭제 / 복구하지 않는다.
  if (holder.cleanupRequired) {
    throw new Error(
      describeCleanupRequired(holder, lockPath, holder.cleanupRequired),
    );
  }

  // 소유자가 만든 marker는 소유자가 종료되기 전에 만들어지므로, 소유자 사망을 확인한 이 시점에는 반드시 보인다.
  assertNoCleanupMarkers(runsDir, lockPath);

  onRecoveryStep?.('stale-detected');
  if (!tryCreateLock(recoveryPath, content, link)) {
    throw new Error(describeRecoveryConflict(recoveryPath, isAlive));
  }
  try {
    onRecoveryStep?.('recovery-locked');
    // mutex를 가진 뒤 다시 확인한다. 그 사이 다른 실행이 복구해 새 lock을 만들었으면 지우지 않는다.
    if (readLockText(lockPath) !== text) throw new Error(RACE_MESSAGE);
    assertNoCleanupMarkers(runsDir, lockPath);
    fs.rmSync(lockPath, { force: true });
    onRecoveryStep?.('stale-removed');
    // 지운 직후 다른 실행이 새로 획득했으면 그 lock을 유지하고 거부한다.
    if (!tryCreateLock(lockPath, content, link)) throw new Error(RACE_MESSAGE);
    return { stale: holder };
  } finally {
    // mutex는 이 실행이 원자적으로 만든 것이므로 그대로 제거한다.
    fs.rmSync(recoveryPath, { force: true });
  }
}

/**
 * 복구 mutex를 얻지 못한 이유. 다른 실행이 복구 중이거나, 복구 도중 비정상 종료되어 mutex가 남은 경우다.
 * @param {string} recoveryPath
 * @param {(pid: number) => boolean} isAlive
 */
function describeRecoveryConflict(recoveryPath, isAlive) {
  const text = readLockText(recoveryPath);
  if (text === null) return RACE_MESSAGE;
  const recovering = parseLock(text);
  if (recovering && isAlive(recovering.pid)) {
    return `다른 하네스 실행(${describeLock(recovering)})이 남은 lock을 복구하고 있습니다. 잠시 후 다시 실행하세요.`;
  }
  // 복구 mutex는 동기 파일 작업 동안만 존재하므로, 남아 있다면 비정상 상황이다. 자동으로 지우지 않는다. (D5와 같은 원칙)
  return (
    `lock 복구 도중 비정상 종료된 기록이 남아 있습니다: ${recoveryPath}\n` +
    '진행 중인 하네스 실행(node harness/run.mjs)이 없는지 확인한 뒤 이 파일을 직접 삭제하고 다시 실행하세요.'
  );
}

/**
 * 현재 실행이 소유한 lock에 "하위 프로세스 종료 미확인"을 기록한다.
 * 신호 정리를 시작할 때 종료 요청 전에 기록하므로, 정리 도중 강제 종료되어도(두 번째 신호 등) 기록이 남는다.
 * 소유자가 아니면 기록하지 않는다. 기록은 임시 파일 + rename으로 원자적으로 바꾼다.
 * 이 기록은 보조 근거다. 기록 실패에 대비해 자동 복구 차단의 주 근거는 cleanup marker다.
 * @param {string} runsDir
 * @param {string} runId
 * @param {CleanupRequired} cleanup
 * @param {{ pid?: number, renameSync?: typeof fs.renameSync }} [options] renameSync는 실패 주입용
 * @returns {boolean} 기록했으면 true
 */
export function markLockCleanupRequired(runsDir, runId, cleanup, options = {}) {
  const { pid = process.pid, renameSync = fs.renameSync } = options;
  const lockPath = path.join(runsDir, LOCK_FILE);
  const text = readLockText(lockPath);
  const holder = text === null ? null : parseLock(text);
  if (!holder || holder.pid !== pid || holder.runId !== runId) return false;

  const content = `${JSON.stringify({
    pid: holder.pid,
    runId: holder.runId,
    createdAt: holder.createdAt,
    cleanupRequired: cleanup,
  })}\n`;
  const temp = `${lockPath}.${pid}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, content);
    renameSync(temp, lockPath);
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

// ---------------------------------------------------------------------------
// cleanup marker (Task 007 마지막 리뷰 반영)
//
// 신호 정리를 시작할 때 현재 run 전용 marker(`.lock.cleanup-required.<runId>`)를 원자적으로(O_EXCL) 만든다.
// marker는 "파일이 존재한다는 사실" 자체가 근거다. 내용(JSON)은 안내용이며 비어 있거나 깨져 있어도 유효하다.
// marker가 하나라도 있으면 lock 상태와 상관없이 다음 실행을 거부하고, lock / marker를 자동으로 지우지 않는다.
// marker는 하위 프로세스 트리 종료가 확인된 뒤에만, 자기 run의 것만 제거한다.

const CLEANUP_MARKER_PREFIX = `${LOCK_FILE}.cleanup-required.`;

/**
 * 테스트에서 파일 시스템 실패를 주입하기 위한 함수 (기본: node:fs)
 * @typedef {object} LockFsOps
 * @property {typeof fs.openSync} [openSync] marker 생성
 * @property {typeof fs.writeSync} [writeSync] marker 내용 기록
 * @property {typeof fs.renameSync} [renameSync] lock metadata 기록
 */

/**
 * @param {string} runsDir
 * @param {string} runId
 */
export function cleanupMarkerPath(runsDir, runId) {
  return path.join(runsDir, `${CLEANUP_MARKER_PREFIX}${runId}`);
}

/**
 * 현재 run의 cleanup marker를 만든다. 내용 기록에 실패해도 파일이 만들어졌으면 성공이다.
 * @param {string} runsDir
 * @param {string} runId
 * @param {CleanupRequired} cleanup
 * @param {LockFsOps} [ops]
 * @returns {boolean} marker 파일이 존재하게 됐으면 true (같은 run의 marker가 이미 있어도 true)
 */
export function createCleanupMarker(runsDir, runId, cleanup, ops = {}) {
  const { openSync = fs.openSync, writeSync = fs.writeSync } = ops;
  const markerPath = cleanupMarkerPath(runsDir, runId);
  /** @type {number} */
  let fd;
  try {
    fd = openSync(markerPath, 'wx');
  } catch (error) {
    const { code } = /** @type {NodeJS.ErrnoException} */ (error);
    return code === 'EEXIST' && fs.existsSync(markerPath);
  }
  try {
    writeSync(fd, `${JSON.stringify({ runId, ...cleanup })}\n`);
  } catch {
    // 내용은 안내용이다. 파일 존재만으로 유효하다.
  } finally {
    try {
      fs.closeSync(fd);
    } catch {
      // 닫기 실패도 marker 존재에는 영향이 없다.
    }
  }
  return true;
}

/**
 * harness/runs에 있는 모든 cleanup marker 경로
 * @param {string} runsDir
 */
export function listCleanupMarkers(runsDir) {
  /** @type {string[]} */
  let names;
  try {
    names = fs.readdirSync(runsDir);
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  return names
    .filter((name) => name.startsWith(CLEANUP_MARKER_PREFIX))
    .sort()
    .map((name) => path.join(runsDir, name));
}

/**
 * 현재 run의 cleanup marker만 제거한다. 하위 프로세스 트리 종료가 확인된 뒤에만 호출한다.
 * @param {string} runsDir
 * @param {string} runId
 */
export function removeCleanupMarker(runsDir, runId) {
  fs.rmSync(cleanupMarkerPath(runsDir, runId), { force: true });
}

/**
 * marker가 있으면 실행을 거부한다. 내용은 읽을 수 있을 때만 안내에 덧붙인다.
 * @param {string} runsDir
 * @param {string} lockPath
 */
function assertNoCleanupMarkers(runsDir, lockPath) {
  const markers = listCleanupMarkers(runsDir);
  if (markers.length === 0) return;
  const lines = markers.map((markerPath) => {
    const runId = path.basename(markerPath).slice(CLEANUP_MARKER_PREFIX.length);
    /** @type {any} */
    let data = null;
    try {
      data = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    } catch {
      // 비어 있거나 깨진 marker도 존재 자체로 유효하다.
    }
    const cleanup = data ? parseCleanupRequired(data) : null;
    const detail = cleanup
      ? `신호 ${cleanup.signal}, 중단 당시 상태 ${cleanup.stage}, 추적 프로세스 ${describeChildren(cleanup.children)}`
      : '내용을 읽을 수 없음 (존재만으로 유효)';
    return `- marker: ${markerPath} (run ${runId}: ${detail})`;
  });
  throw new Error(
    [
      '이전 하네스 실행의 하위 프로세스 종료가 확인되지 않아 실행할 수 없습니다. (cleanup marker 존재)',
      ...lines,
      `- lock: ${lockPath}${fs.existsSync(lockPath) ? '' : ' (없음)'}`,
      '해당 run의 하위 프로세스(claude / codex / node / npm 등)가 모두 종료됐는지 직접 확인한 뒤 marker 파일과 lock 파일을 삭제하고 다시 실행하세요.',
    ].join('\n'),
  );
}

/**
 * 현재 실행(pid + runId)이 소유한 lock만 제거한다.
 * 하위 프로세스 종료 확인 여부는 호출하는 쪽(신호 정리)이 판단한다.
 * @param {string} runsDir
 * @param {string} runId
 * @param {number} [pid]
 */
export function releaseLock(runsDir, runId, pid = process.pid) {
  const lockPath = path.join(runsDir, LOCK_FILE);
  const text = readLockText(lockPath);
  if (text === null) return;
  const holder = parseLock(text);
  if (holder && holder.pid === pid && holder.runId === runId) {
    fs.rmSync(lockPath, { force: true });
  }
}

/**
 * harness/runs 아래 run들의 state.json을 읽는다. (재개 대상 검색용, Task 010)
 * 해석할 수 없는 state.json은 `state: null`로 돌려준다.
 * @param {string} runsDir
 * @returns {{ runId: string, dir: string, state: any }[]}
 */
export function listRunStates(runsDir) {
  if (!fs.existsSync(runsDir)) return [];
  return (
    fs
      .readdirSync(runsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isValidRunId(entry.name))
      .map((entry) => ({
        runId: entry.name,
        dir: path.join(runsDir, entry.name),
      }))
      // state.json이 아직 없는 run(시작 직후)은 run으로 보지 않는다.
      .filter(({ dir }) => fs.existsSync(path.join(dir, 'state.json')))
      .map(({ runId, dir }) => {
        try {
          return { runId, dir, state: readJson(dir, 'state.json') };
        } catch {
          return { runId, dir, state: null };
        }
      })
  );
}

/**
 * 살아 있는 프로세스가 소유한 lock의 runId. lock이 없거나 소유자가 없으면 null.
 * @param {string} runsDir
 */
export function activeLockRunId(runsDir) {
  const text = readLockText(path.join(runsDir, LOCK_FILE));
  if (text === null) return null;
  const holder = parseLock(text);
  return holder && isProcessAlive(holder.pid) ? holder.runId : null;
}
