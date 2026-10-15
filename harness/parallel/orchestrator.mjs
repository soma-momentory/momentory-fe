import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedPath } from '../lib/scope.mjs';
import { startCoreWorker, stopWorker } from './worker.mjs';

const MAX_WORKERS = 4;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function git(root, ...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function save(runDir, state) {
  const target = path.join(runDir, 'state.json');
  const temp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(temp, target);
}

export function readRun(repoRoot, runId) {
  if (!/^\d{8}-\d{6}-[a-f0-9]{8}$/.test(runId))
    throw new Error('runId 형식이 잘못되었습니다.');
  const dir = path.join(repoRoot, 'harness', 'parallel-runs', runId);
  return {
    dir,
    state: JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8')),
  };
}

export function createRun(
  repoRoot,
  plan,
  baseHead = git(repoRoot, 'rev-parse', 'HEAD'),
) {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
  const runId = `${stamp}-${randomBytes(4).toString('hex')}`;
  const dir = path.join(repoRoot, 'harness', 'parallel-runs', runId);
  fs.mkdirSync(dir, { recursive: true });
  const state = {
    schemaVersion: 1,
    runId,
    baseHead,
    status: 'READY',
    createdAt: date.toISOString(),
    tasks: plan.tasks.map((task) => ({
      ...task,
      status: 'PENDING',
      attempts: [],
      changedPaths: [],
    })),
  };
  save(dir, state);
  return { dir, state };
}

function lock(dir) {
  const file = path.join(dir, 'controller.lock');
  try {
    fs.writeFileSync(file, `${process.pid}\n`, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(fs.readFileSync(file, 'utf8').trim());
    try {
      process.kill(pid, 0);
      throw new Error(`Orchestrator가 이미 실행 중입니다 (pid ${pid}).`);
    } catch (check) {
      if (check.code !== 'ESRCH') throw check;
    }
    fs.unlinkSync(file);
    fs.writeFileSync(file, `${process.pid}\n`, { flag: 'wx' });
  }
  return () => fs.rmSync(file, { force: true });
}

function inspectCore(worktree) {
  const runs = path.join(worktree, 'harness', 'runs');
  if (!fs.existsSync(runs)) return null;
  const ids = fs
    .readdirSync(runs)
    .filter((name) => /^\d{8}-\d{6}(?:-\d+)?$/.test(name))
    .sort();
  const runId = ids.at(-1);
  if (!runId) return null;
  try {
    const state = JSON.parse(
      fs.readFileSync(path.join(runs, runId, 'state.json'), 'utf8'),
    );
    return {
      runId,
      status: state.status,
      failureReason: state.failureReason ?? null,
    };
  } catch {
    return {
      runId,
      status: 'UNKNOWN',
      failureReason: 'Core state.json을 읽을 수 없습니다.',
    };
  }
}

function changedPaths(worktree, baseHead) {
  const fromBase = git(worktree, 'diff', '--name-only', '-z', baseHead, 'HEAD');
  const unstaged = git(worktree, 'diff', '--name-only', '-z');
  const staged = git(worktree, 'diff', '--cached', '--name-only', '-z');
  const untracked = git(
    worktree,
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  );
  return [
    ...new Set(
      [fromBase, unstaged, staged, untracked].flatMap((value) =>
        value.split('\0').filter(Boolean),
      ),
    ),
  ].sort();
}

function allowed(task, file, core) {
  return (
    task.allowedPaths.includes(file) ||
    (core?.status &&
      /^tasks\/\d{3}-[^/]+\.md$/.test(file) &&
      file === core.taskFile)
  );
}

/** Run a validated plan. workerFactory is injectable for process-level integration tests. */
export async function executeRun(
  repoRoot,
  runId,
  { workerFactory = startCoreWorker, protectedPaths = [], pollMs = 100 } = {},
) {
  const { dir, state } = readRun(repoRoot, runId);
  const unlock = lock(dir);
  const active = new Map();
  let stopping = false;
  try {
    if (!['READY', 'STOPPED', 'FAILED'].includes(state.status))
      throw new Error(`실행할 수 없는 상태: ${state.status}`);
    state.status = 'RUNNING';
    state.startedAt ??= new Date().toISOString();
    save(dir, state);

    const launch = (task) => {
      const attempt = task.attempts.length + 1;
      const branch = `harness/m1/${runId}/${task.id}-a${attempt}`;
      const worktree = path.join(dir, 'worktrees', `${task.id}-a${attempt}`);
      const logFile = path.join(dir, 'logs', `${task.id}-a${attempt}.log`);
      const resultFile = path.join(
        dir,
        'results',
        `${task.id}-a${attempt}.json`,
      );
      task.status = 'STARTING';
      task.attempts.push({
        attempt,
        branch,
        worktree,
        logFile,
        resultFile,
        startedAt: new Date().toISOString(),
      });
      save(dir, state);
      try {
        fs.mkdirSync(path.dirname(worktree), { recursive: true });
        git(
          repoRoot,
          'worktree',
          'add',
          '-b',
          branch,
          worktree,
          state.baseHead,
        );
      } catch (error) {
        task.status = 'FAILED';
        task.reason = `worktree 생성 실패: ${error.message}`;
        save(dir, state);
        return;
      }
      let child;
      const latest = task.attempts.at(-1);
      const promise = new Promise((resolve) => {
        let settled = false;
        const onExit = (result) => {
          if (settled) return;
          settled = true;
          try {
            const core = inspectCore(worktree);
            latest.endedAt = new Date().toISOString();
            latest.exitCode = result.code;
            latest.core = core;
            task.core = core;
            task.changedPaths = changedPaths(worktree, state.baseHead);
            const taskFile =
              core?.runId &&
              path.join(worktree, 'harness', 'runs', core.runId, 'state.json');
            if (taskFile && fs.existsSync(taskFile))
              core.taskFile = JSON.parse(
                fs.readFileSync(taskFile, 'utf8'),
              ).taskFile;
            const violations = task.changedPaths.filter(
              (file) =>
                isProtectedPath(file, protectedPaths) ||
                !allowed(task, file, core),
            );
            task.status = stopping
              ? 'STOPPED'
              : violations.length
                ? 'FAILED'
                : result.code === 0
                  ? 'DONE'
                  : [2, 3, 4].includes(result.code)
                    ? 'WAITING'
                    : 'FAILED';
            task.reason = violations.length
              ? `허용/보호 경로 위반: ${violations.join(', ')}`
              : (result.error ??
                (task.status === 'FAILED'
                  ? (core?.failureReason ?? `Worker 종료 코드 ${result.code}`)
                  : null));
          } catch (error) {
            task.status = 'FAILED';
            task.reason = `Worker 결과 검사 실패: ${error.message}`;
          }
          active.delete(task.id);
          fs.mkdirSync(path.dirname(resultFile), { recursive: true });
          fs.writeFileSync(
            resultFile,
            `${JSON.stringify({ taskId: task.id, attempt, status: task.status, reason: task.reason, changedPaths: task.changedPaths, core: task.core, exitCode: result.code }, null, 2)}\n`,
          );
          save(dir, state);
          resolve();
        };
        try {
          child = workerFactory({
            worktree,
            requirement: task.requirement,
            logFile,
            task,
            onExit,
          });
          latest.pid = child.pid;
          task.status = 'RUNNING';
          active.set(task.id, { child, promise: null });
          save(dir, state);
        } catch (error) {
          onExit({ code: null, error: error.message });
        }
      });
      if (active.has(task.id)) active.get(task.id).promise = promise;
    };

    for (;;) {
      if (fs.existsSync(path.join(dir, 'stop-request'))) {
        stopping = true;
        state.status = 'STOPPING';
        for (const item of active.values()) stopWorker(item.child);
        fs.rmSync(path.join(dir, 'stop-request'), { force: true });
      }
      if (!stopping) {
        for (const task of state.tasks) {
          if (task.status !== 'PENDING') continue;
          if (
            task.dependsOn.some((dep) =>
              ['FAILED', 'BLOCKED', 'WAITING', 'STOPPED'].includes(
                state.tasks.find((item) => item.id === dep).status,
              ),
            )
          ) {
            task.status = 'BLOCKED';
            task.reason = '선행 Task가 완료되지 않았습니다.';
            save(dir, state);
          }
        }
        for (const task of state.tasks) {
          if (active.size >= MAX_WORKERS) break;
          if (
            task.status === 'PENDING' &&
            task.dependsOn.every(
              (dep) =>
                state.tasks.find((item) => item.id === dep).status === 'DONE',
            )
          )
            launch(task);
        }
      }
      if (
        active.size === 0 &&
        (stopping || state.tasks.every((task) => task.status !== 'PENDING'))
      )
        break;
      await Promise.race([
        sleep(pollMs),
        ...[...active.values()].map((item) => item.promise).filter(Boolean),
      ]);
    }
    if (stopping)
      for (const task of state.tasks)
        if (task.status === 'PENDING') task.status = 'STOPPED';
    state.status = stopping
      ? 'STOPPED'
      : state.tasks.every((task) => task.status === 'DONE')
        ? 'DONE'
        : 'FAILED';
    state.endedAt = new Date().toISOString();
    save(dir, state);
    return state;
  } finally {
    unlock();
  }
}

export function requestStop(repoRoot, runId) {
  const { dir, state } = readRun(repoRoot, runId);
  if (state.status !== 'RUNNING')
    throw new Error(`중단할 수 없는 상태: ${state.status}`);
  fs.writeFileSync(
    path.join(dir, 'stop-request'),
    `${new Date().toISOString()}\n`,
    { flag: 'wx' },
  );
}

export function restartRun(repoRoot, runId) {
  const { dir, state } = readRun(repoRoot, runId);
  const controllerLock = path.join(dir, 'controller.lock');
  if (fs.existsSync(controllerLock)) {
    const controllerPid = Number(
      fs.readFileSync(controllerLock, 'utf8').trim(),
    );
    try {
      process.kill(controllerPid, 0);
      throw new Error(`Orchestrator (pid ${controllerPid})가 실행 중입니다.`);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
    fs.unlinkSync(controllerLock);
  }
  if (!['STOPPED', 'FAILED', 'RUNNING'].includes(state.status))
    throw new Error('종료된 실행만 재시작할 수 있습니다.');
  for (const task of state.tasks) {
    if (task.status === 'DONE') continue;
    const pid = task.attempts.at(-1)?.pid;
    if (pid && ['RUNNING', 'STARTING'].includes(task.status)) {
      try {
        process.kill(pid, 0);
        throw new Error(`Worker ${task.id} (pid ${pid})가 아직 실행 중입니다.`);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
    task.status = 'PENDING';
    task.reason = null;
    task.core = null;
  }
  state.status = 'READY';
  state.endedAt = null;
  save(dir, state);
  return state;
}
