import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Core adapter: the unchanged standalone entry point runs inside a task worktree. */
export function startCoreWorker({
  worktree,
  requirement,
  logFile,
  task,
  onExit,
}) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = fs.openSync(logFile, 'a');
  const scopedRequirement = `${requirement}\n\nParallel Harness Task ${task.id}: 변경 가능한 파일은 ${task.allowedPaths.join(', ')}입니다. Harness Core가 생성하는 Task 문서 외에 다른 파일은 변경하지 마세요.`;
  const child = spawn(
    process.execPath,
    ['harness/parallel/worker-entry.mjs', scopedRequirement],
    {
      cwd: worktree,
      stdio: ['ignore', log, log],
      detached: process.platform !== 'win32',
    },
  );
  fs.closeSync(log);
  child.once('error', (error) => onExit({ code: null, error: error.message }));
  child.once('exit', (code, signal) => onExit({ code, signal }));
  return child;
}

/** Resume the existing Core run in its original worktree; keep the first attempt's files. */
export function startResumeWorker({ worktree, coreRunId, logFile, onExit }) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const log = fs.openSync(logFile, 'wx');
  const child = spawn(
    process.execPath,
    ['harness/parallel/worker-entry.mjs', '--resume', coreRunId],
    {
      cwd: worktree,
      stdio: ['ignore', log, log],
      detached: process.platform !== 'win32',
    },
  );
  fs.closeSync(log);
  child.once('error', (error) => onExit({ code: null, error: error.message }));
  child.once('exit', (code, signal) => onExit({ code, signal }));
  return child;
}

export function stopWorker(child) {
  if (!child || child.exitCode !== null) return;
  child.kill('SIGTERM'); // The entry forwards SIGTERM to Core for lock cleanup.
  const timer = setTimeout(() => {
    if (child.exitCode !== null) return;
    try {
      if (process.platform !== 'win32' && child.pid)
        process.kill(-child.pid, 'SIGKILL');
      else child.kill('SIGKILL');
    } catch (error) {
      if (error.code !== 'ESRCH')
        console.error(`Worker 강제 종료 실패: ${error.message}`);
    }
  }, 15_000);
  child.once('exit', () => clearTimeout(timer));
}
