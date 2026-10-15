import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isProtectedPath } from '../lib/scope.mjs';
import { startCoreWorker, startResumeWorker, stopWorker } from './worker.mjs';

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

function readState(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
}

export function readRun(repoRoot, runId) {
  if (!/^\d{8}-\d{6}-[a-f0-9]{8}$/.test(runId))
    throw new Error('runId 형식이 잘못되었습니다.');
  const dir = path.join(repoRoot, 'harness', 'parallel-runs', runId);
  return {
    dir,
    state: readState(dir),
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

function inspectCore(worktree, expectedRunId = null) {
  const runs = path.join(worktree, 'harness', 'runs');
  if (!fs.existsSync(runs)) return null;
  const runId =
    expectedRunId ??
    fs
      .readdirSync(runs)
      .filter((name) => /^\d{8}-\d{6}(?:-\d+)?$/.test(name))
      .sort()
      .at(-1);
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

function coreRunDir(task) {
  const attempt = task.attempts.at(-1);
  const runId = task.core?.runId;
  if (!attempt || !/^\d{8}-\d{6}(?:-\d+)?$/.test(runId ?? ''))
    throw new Error('Core run ID가 없습니다.');
  return path.join(attempt.worktree, 'harness', 'runs', runId);
}

/** Approval is read from Core files. This function never changes an answer. */
export function approvalState(task) {
  if (task.status === 'HUMAN_REVIEW_REQUIRED')
    return {
      status: 'REVIEW_REQUIRED',
      reason: 'Core 단독 재개를 지원하지 않습니다.',
    };
  if (
    task.status !== 'WAITING' &&
    !(task.status === 'STOPPED' && task.resumes?.length > 0)
  )
    return { status: 'NOT_REQUIRED' };
  try {
    const dir = coreRunDir(task);
    const core = JSON.parse(
      fs.readFileSync(path.join(dir, 'state.json'), 'utf8'),
    );
    if (core.status === 'WAITING_HUMAN_DECISION') {
      const name = core.pendingDecision?.file;
      if (typeof name !== 'string' || path.basename(name) !== name)
        throw new Error('결정 파일 경로가 잘못되었습니다.');
      const file = path.join(dir, name);
      const decisions = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (
        !Array.isArray(decisions.questions) ||
        decisions.questions.length === 0
      )
        throw new Error('결정 질문이 없습니다.');
      const answered = decisions.questions.every(
        (question) =>
          typeof question.answer === 'string' && question.answer.trim(),
      );
      return {
        status:
          answered && decisions.approved === true ? 'APPROVED' : 'PENDING',
        file,
      };
    }
    if (core.status === 'MANUAL_VALIDATION_REQUIRED') {
      const file = path.join(dir, 'manual-validation.json');
      const checklist = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(checklist.items) || checklist.items.length === 0)
        throw new Error('수동 검증 항목이 없습니다.');
      const approved = checklist.items.every(
        (item) =>
          item.result === 'pass' &&
          (!item.noteRequired ||
            (typeof item.note === 'string' && item.note.trim())),
      );
      return {
        status: approved ? 'APPROVED' : 'PENDING',
        file,
        remaining: checklist.items.filter((item) => item.result !== 'pass')
          .length,
      };
    }
    return {
      status: 'INVALID',
      reason: `Core 상태가 달라졌습니다: ${core.status}`,
    };
  } catch (error) {
    return { status: 'INVALID', reason: error.message };
  }
}

export function runStatus(tasks) {
  if (tasks.every((task) => task.status === 'DONE')) return 'DONE';
  if (tasks.some((task) => task.status === 'FAILED')) return 'FAILED';
  if (tasks.some((task) => task.status === 'STOPPED')) return 'STOPPED';
  if (
    tasks.some((task) =>
      ['WAITING', 'HUMAN_REVIEW_REQUIRED'].includes(task.status),
    )
  )
    return 'WAITING';
  if (tasks.some((task) => task.status === 'BLOCKED')) return 'FAILED';
  return 'READY';
}

function unblockReadyTasks(state) {
  for (const task of state.tasks) {
    if (
      task.status === 'BLOCKED' &&
      task.dependsOn.every(
        (dep) => state.tasks.find((item) => item.id === dep)?.status === 'DONE',
      )
    ) {
      task.status = 'PENDING';
      task.reason = null;
    }
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

function workerStatus(code, core, stopping, error) {
  if (stopping) return 'STOPPED';
  if (error) return 'FAILED';
  if (core?.status === 'FAILED') return 'FAILED';
  if (core?.status === 'DONE') return code === 0 ? 'DONE' : 'FAILED';
  if (core?.status === 'WAITING_HUMAN_DECISION')
    return code === 2 ? 'WAITING' : 'FAILED';
  if (core?.status === 'MANUAL_VALIDATION_REQUIRED')
    return code === 3 ? 'WAITING' : 'FAILED';
  if (core?.status === 'HUMAN_REVIEW_REQUIRED')
    return code === 4 ? 'HUMAN_REVIEW_REQUIRED' : 'FAILED';
  if (core) return 'FAILED';
  // Test adapters can return an exit code without a Core state file.
  if (code === 0) return 'DONE';
  if (code === 2 || code === 3) return 'WAITING';
  if (code === 4) return 'HUMAN_REVIEW_REQUIRED';
  return 'FAILED';
}

function finishWorker({
  task,
  record,
  worktree,
  resultFile,
  result,
  baseHead,
  protectedPaths,
  stopping,
  expectedCoreRunId = null,
}) {
  try {
    const core = inspectCore(worktree, expectedCoreRunId);
    record.endedAt = new Date().toISOString();
    record.exitCode = result.code;
    record.core = core;
    task.core = core;
    task.changedPaths = changedPaths(worktree, baseHead);
    const headChanged = git(worktree, 'rev-parse', 'HEAD') !== baseHead;
    const taskFile =
      core?.runId &&
      path.join(worktree, 'harness', 'runs', core.runId, 'state.json');
    if (taskFile && fs.existsSync(taskFile))
      core.taskFile = JSON.parse(fs.readFileSync(taskFile, 'utf8')).taskFile;
    const violations = task.changedPaths.filter(
      (file) =>
        isProtectedPath(file, protectedPaths) || !allowed(task, file, core),
    );
    task.status = headChanged
      ? 'FAILED'
      : violations.length
        ? 'FAILED'
        : workerStatus(result.code, core, stopping, result.error);
    task.reason = headChanged
      ? 'Worker HEAD가 시작 커밋과 다릅니다. Worker commit은 허용하지 않습니다.'
      : violations.length
        ? `허용/보호 경로 위반: ${violations.join(', ')}`
        : (result.error ??
          (task.status === 'FAILED'
            ? (core?.failureReason ?? `Worker 종료 코드 ${result.code}`)
            : null));
  } catch (error) {
    task.status = 'FAILED';
    task.reason = `Worker 결과 검사 실패: ${error.message}`;
  }
  fs.mkdirSync(path.dirname(resultFile), { recursive: true });
  try {
    fs.writeFileSync(
      resultFile,
      `${JSON.stringify({ taskId: task.id, attempt: record.attempt, resume: record.resume ?? null, status: task.status, reason: task.reason, changedPaths: task.changedPaths, core: task.core, exitCode: result.code }, null, 2)}\n`,
      { flag: 'wx' },
    );
  } catch (error) {
    task.status = 'FAILED';
    task.reason = `결과 파일을 보존할 수 없습니다: ${error.message}`;
  }
}

/** Run a validated plan. workerFactory is injectable for process-level integration tests. */
export async function executeRun(
  repoRoot,
  runId,
  { workerFactory = startCoreWorker, protectedPaths = [], pollMs = 100 } = {},
) {
  const { dir } = readRun(repoRoot, runId);
  const unlock = lock(dir);
  const state = readState(dir);
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
          finishWorker({
            task,
            record: latest,
            worktree,
            resultFile,
            result,
            baseHead: state.baseHead,
            protectedPaths,
            stopping,
          });
          active.delete(task.id);
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
              [
                'FAILED',
                'BLOCKED',
                'WAITING',
                'HUMAN_REVIEW_REQUIRED',
                'STOPPED',
              ].includes(state.tasks.find((item) => item.id === dep).status),
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
    state.status = runStatus(state.tasks);
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

function assertOriginalWorktree(dir, state, task, protectedPaths) {
  const attempt = task.attempts.at(-1);
  if (!attempt || !fs.existsSync(attempt.resultFile))
    throw new Error('원래 Worker 결과 파일이 없습니다.');
  const parent = fs.realpathSync(path.join(dir, 'worktrees'));
  const worktree = fs.realpathSync(attempt.worktree);
  if (!worktree.startsWith(`${parent}${path.sep}`))
    throw new Error('Worker worktree가 실행 디렉터리 밖에 있습니다.');
  if (git(worktree, 'branch', '--show-current') !== attempt.branch)
    throw new Error('Worker 브랜치가 원래 브랜치와 다릅니다.');
  if (git(worktree, 'rev-parse', 'HEAD') !== state.baseHead)
    throw new Error(
      'Worker HEAD가 시작 커밋과 다릅니다. 중복 commit을 막기 위해 재개하지 않습니다.',
    );
  const core = inspectCore(worktree, task.core?.runId);
  if (!core || core.runId !== task.core?.runId)
    throw new Error('원래 Core run을 확인할 수 없습니다.');
  core.taskFile = JSON.parse(
    fs.readFileSync(
      path.join(worktree, 'harness', 'runs', core.runId, 'state.json'),
      'utf8',
    ),
  ).taskFile;
  const violations = changedPaths(worktree, state.baseHead).filter(
    (file) =>
      isProtectedPath(file, protectedPaths) || !allowed(task, file, core),
  );
  if (violations.length)
    throw new Error(`허용 경로 밖의 변경이 있습니다: ${violations.join(', ')}`);
  return { attempt, worktree, core };
}

function processOrGroupAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  for (const target of process.platform === 'win32' ? [pid] : [pid, -pid]) {
    try {
      process.kill(target, 0);
      return true;
    } catch (error) {
      if (error.code !== 'ESRCH') return true;
    }
  }
  return false;
}

function reconcileInterruptedResume(dir, state, task, protectedPaths) {
  const record = task.resumes?.at(-1);
  if (!record || !record.resultFile)
    throw new Error('중단된 재개의 기록이 없습니다.');
  if (processOrGroupAlive(record.pid))
    throw new Error(
      `Worker ${task.id}의 이전 재개 프로세스가 아직 실행 중입니다.`,
    );
  const { worktree, core } = assertOriginalWorktree(
    dir,
    state,
    task,
    protectedPaths,
  );
  if (fs.existsSync(record.resultFile)) {
    const result = JSON.parse(fs.readFileSync(record.resultFile, 'utf8'));
    if (
      result.taskId !== task.id ||
      result.resume !== record.resume ||
      ![
        'DONE',
        'WAITING',
        'HUMAN_REVIEW_REQUIRED',
        'FAILED',
        'STOPPED',
      ].includes(result.status) ||
      !Array.isArray(result.changedPaths) ||
      result.core?.runId !== core.runId ||
      (result.status === 'DONE' && core.status !== 'DONE') ||
      (result.status === 'WAITING' &&
        !['WAITING_HUMAN_DECISION', 'MANUAL_VALIDATION_REQUIRED'].includes(
          core.status,
        )) ||
      (result.status === 'HUMAN_REVIEW_REQUIRED' &&
        core.status !== 'HUMAN_REVIEW_REQUIRED')
    )
      throw new Error('기존 재개 결과 파일이 현재 Worker와 일치하지 않습니다.');
    record.exitCode = result.exitCode;
    record.endedAt ??= new Date().toISOString();
    task.status = result.status;
    task.reason = result.reason;
    task.changedPaths = result.changedPaths;
    task.core = result.core;
  } else {
    const code =
      {
        DONE: 0,
        WAITING_HUMAN_DECISION: 2,
        MANUAL_VALIDATION_REQUIRED: 3,
        HUMAN_REVIEW_REQUIRED: 4,
      }[core.status] ?? 1;
    finishWorker({
      task,
      record,
      worktree,
      resultFile: record.resultFile,
      result: { code },
      baseHead: state.baseHead,
      protectedPaths,
      stopping: false,
      expectedCoreRunId: core.runId,
    });
  }
  record.recovered = true;
  if (task.status === 'DONE') unblockReadyTasks(state);
  state.status = runStatus(state.tasks);
  state.endedAt = new Date().toISOString();
  save(dir, state);
}

/** Resume one approved Core run in the same worktree, without re-running its peers. */
export async function resumeTask(
  repoRoot,
  runId,
  taskId,
  { workerFactory = startResumeWorker, protectedPaths = [], pollMs = 100 } = {},
) {
  const { dir } = readRun(repoRoot, runId);
  const unlock = lock(dir);
  let stopping = false;
  try {
    const state = readState(dir);
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) throw new Error(`Worker를 찾을 수 없습니다: ${taskId}`);
    if (task.status === 'RESUMING') {
      reconcileInterruptedResume(dir, state, task, protectedPaths);
      if (task.status === 'DONE') return state;
    }
    if (
      task.status !== 'WAITING' &&
      !(task.status === 'STOPPED' && task.resumes?.length > 0)
    )
      throw new Error(`재개할 수 없는 Worker 상태: ${task.status}`);
    const { attempt, worktree, core } = assertOriginalWorktree(
      dir,
      state,
      task,
      protectedPaths,
    );
    if (
      !['WAITING_HUMAN_DECISION', 'MANUAL_VALIDATION_REQUIRED'].includes(
        core.status,
      )
    )
      throw new Error(
        `Core가 재개 가능한 대기 상태가 아닙니다: ${core.status}`,
      );
    const approval = approvalState(task);
    if (approval.status !== 'APPROVED')
      throw new Error(
        `사용자 승인이 필요합니다 (${approval.status}): ${approval.file ?? approval.reason ?? ''}`,
      );

    const resume = (task.resumes?.length ?? 0) + 1;
    const prefix = `${task.id}-a${attempt.attempt}-r${resume}`;
    const logFile = path.join(dir, 'logs', `${prefix}.log`);
    const resultFile = path.join(dir, 'results', `${prefix}.json`);
    if (fs.existsSync(logFile) || fs.existsSync(resultFile))
      throw new Error('재개 로그 또는 결과 파일이 이미 있습니다.');
    const record = {
      attempt: attempt.attempt,
      resume,
      worktree,
      branch: attempt.branch,
      logFile,
      resultFile,
      startedAt: new Date().toISOString(),
    };
    task.resumes ??= [];
    task.resumes.push(record);
    task.status = 'RESUMING';
    state.status = 'RUNNING';
    state.endedAt = null;
    save(dir, state);

    let finished = false;
    let child;
    const completion = new Promise((resolve) => {
      const onExit = (result) => {
        if (finished) return;
        finished = true;
        finishWorker({
          task,
          record,
          worktree,
          resultFile,
          result,
          baseHead: state.baseHead,
          protectedPaths,
          stopping,
          expectedCoreRunId: core.runId,
        });
        if (task.status === 'DONE') unblockReadyTasks(state);
        state.status = runStatus(state.tasks);
        state.endedAt = new Date().toISOString();
        save(dir, state);
        resolve();
      };
      try {
        child = workerFactory({
          worktree,
          coreRunId: core.runId,
          logFile,
          task,
          onExit,
        });
        record.pid = child.pid;
        save(dir, state);
      } catch (error) {
        onExit({ code: null, error: error.message });
      }
    });
    while (!finished) {
      if (!stopping && fs.existsSync(path.join(dir, 'stop-request'))) {
        stopping = true;
        stopWorker(child);
        fs.rmSync(path.join(dir, 'stop-request'), { force: true });
      }
      await Promise.race([completion, sleep(pollMs)]);
    }
    return state;
  } finally {
    unlock();
  }
}

export function restartRun(repoRoot, runId) {
  const { dir } = readRun(repoRoot, runId);
  const unlock = lock(dir);
  try {
    const state = readState(dir);
    if (
      !['STOPPED', 'FAILED', 'WAITING', 'RUNNING', 'READY'].includes(
        state.status,
      )
    )
      throw new Error('종료된 실행만 재시작할 수 있습니다.');
    let reset = 0;
    for (const task of state.tasks) {
      if (
        task.status === 'DONE' ||
        task.status === 'WAITING' ||
        task.status === 'HUMAN_REVIEW_REQUIRED'
      )
        continue;
      if (
        task.status === 'STOPPED' &&
        task.resumes?.length > 0 &&
        ['WAITING_HUMAN_DECISION', 'MANUAL_VALIDATION_REQUIRED'].includes(
          inspectCore(task.attempts.at(-1).worktree, task.core?.runId)?.status,
        )
      )
        continue;
      if (task.status === 'RESUMING')
        throw new Error(`${task.id}: 재개 중단 상태를 먼저 확인해야 합니다.`);
      const pid = task.attempts.at(-1)?.pid;
      if (pid && ['RUNNING', 'STARTING'].includes(task.status)) {
        try {
          process.kill(pid, 0);
          throw new Error(
            `Worker ${task.id} (pid ${pid})가 아직 실행 중입니다.`,
          );
        } catch (error) {
          if (error.code !== 'ESRCH') throw error;
        }
      }
      if (task.status === 'BLOCKED') continue;
      task.status = 'PENDING';
      task.reason = null;
      task.core = null;
      reset += 1;
    }
    for (const task of state.tasks) {
      if (task.status !== 'BLOCKED') continue;
      if (
        task.dependsOn.some((dep) =>
          ['WAITING', 'HUMAN_REVIEW_REQUIRED', 'BLOCKED', 'STOPPED'].includes(
            state.tasks.find((item) => item.id === dep)?.status,
          ),
        )
      )
        continue;
      task.status = 'PENDING';
      task.reason = null;
      reset += 1;
    }
    if (reset === 0)
      throw new Error(
        '새 시도로 실행할 Worker가 없습니다. 대기 Worker는 resume 명령을 사용하세요.',
      );
    state.status = 'READY';
    state.endedAt = null;
    save(dir, state);
    return state;
  } finally {
    unlock();
  }
}
