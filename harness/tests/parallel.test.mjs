import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  approvalState,
  createRun,
  executeRun,
  readRun,
  requestStop,
  restartRun,
  resumeTask,
  runStatus,
} from '../parallel/orchestrator.mjs';
import { validatePlan } from '../parallel/plan.mjs';
import { startCoreWorker, stopWorker } from '../parallel/worker.mjs';

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'momentory-parallel-'));
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  fs.writeFileSync(
    path.join(root, '.gitignore'),
    'harness/parallel-runs/\nharness/runs/\nnode_modules/\n',
  );
  fs.mkdirSync(path.join(root, 'harness', 'parallel'), { recursive: true });
  fs.copyFileSync(
    new URL('../parallel/worker-entry.mjs', import.meta.url),
    path.join(root, 'harness', 'parallel', 'worker-entry.mjs'),
  );
  fs.writeFileSync(
    path.join(root, 'package.json'),
    '{"name":"parallel-fixture","version":"1.0.0","private":true}\n',
  );
  fs.writeFileSync(
    path.join(root, 'package-lock.json'),
    '{"name":"parallel-fixture","version":"1.0.0","lockfileVersion":3,"requires":true,"packages":{"":{"name":"parallel-fixture","version":"1.0.0"}}}\n',
  );
  fs.writeFileSync(
    path.join(root, 'harness', 'run.mjs'),
    "import fs from 'node:fs'; const id = /Parallel Harness Task (task\\d+):/.exec(process.argv[2])?.[1]; if (!id) process.exit(2); setTimeout(() => { fs.writeFileSync(id + '.txt', 'done'); console.log('core stub ' + id); }, 200);\n",
  );
  git(
    'add',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'harness/run.mjs',
    'harness/parallel/worker-entry.mjs',
  );
  git('commit', '-qm', 'base');
  return root;
}

function repoWithResumableCore() {
  const root = repo();
  fs.writeFileSync(
    path.join(root, 'harness', 'run.mjs'),
    `import fs from 'node:fs';
import path from 'node:path';
const runId = '20261015-000000';
const dir = path.join('harness', 'runs', runId);
if (process.argv[2] === '--resume') {
  if (process.argv[3] !== runId) process.exit(1);
  const checklist = JSON.parse(fs.readFileSync(path.join(dir, 'manual-validation.json')));
  if (!checklist.items.every((item) => item.result === 'pass')) process.exit(3);
  const state = JSON.parse(fs.readFileSync(path.join(dir, 'state.json')));
  state.status = 'DONE';
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(state));
  fs.writeFileSync('task1.txt', 'approved');
  console.log('core resume task1');
  process.exit(0);
}
const id = /Parallel Harness Task (task\\d+):/.exec(process.argv[2])?.[1];
if (!id) process.exit(1);
fs.mkdirSync(dir, { recursive: true });
fs.mkdirSync('tasks', { recursive: true });
fs.writeFileSync('tasks/001-fixture.md', id);
fs.writeFileSync(id + '.txt', id === 'task1' ? 'draft' : 'done');
const status = id === 'task1' ? 'MANUAL_VALIDATION_REQUIRED' : 'DONE';
fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ status, taskFile: 'tasks/001-fixture.md' }));
if (id === 'task1') {
  fs.writeFileSync(path.join(dir, 'manual-validation.json'), JSON.stringify({ runId, items: [{ id: 'C1', title: 'task1.txt exists', result: '', noteRequired: false, note: '' }] }));
  process.exit(3);
}
process.exit(0);
`,
  );
  execFileSync('git', ['add', 'harness/run.mjs'], { cwd: root });
  execFileSync('git', ['commit', '-qm', 'resumable Core fixture'], {
    cwd: root,
  });
  return root;
}

function plan(count, extra = {}) {
  return validatePlan(
    {
      schemaVersion: 1,
      tasks: Array.from({ length: count }, (_, index) => {
        const id = `task${index + 1}`;
        return {
          id,
          requirement: `Do ${id}`,
          allowedPaths: [`${id}.txt`],
          dependsOn: extra[id] ?? [],
        };
      }),
    },
    ['harness/', '.env*', 'CLAUDE.md'],
  );
}

function worker(
  { worktree, task, logFile, onExit },
  delay = 250,
  fail = false,
) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  const out = fs.openSync(logFile, 'a');
  const code = `const fs=require('fs');setTimeout(()=>{fs.writeFileSync(${JSON.stringify(`${task.id}.txt`)},'done');process.exit(${fail ? 1 : 0})},${delay})`;
  const child = spawn(process.execPath, ['-e', code], {
    cwd: worktree,
    stdio: ['ignore', out, out],
    detached: process.platform !== 'win32',
  });
  fs.closeSync(out);
  child.once('error', (error) => onExit({ code: null, error: error.message }));
  child.once('exit', (exitCode, signal) => onExit({ code: exitCode, signal }));
  return child;
}

test('plan rejects protected paths, shared paths, missing dependencies and cycles', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          schemaVersion: 1,
          tasks: [
            { id: 'a', requirement: 'x', allowedPaths: ['harness/run.mjs'] },
          ],
        },
        ['harness/'],
      ),
    /보호 경로/,
  );
  assert.throws(
    () =>
      validatePlan(
        {
          schemaVersion: 1,
          tasks: [
            { id: 'a', requirement: 'x', allowedPaths: ['x'] },
            { id: 'b', requirement: 'y', allowedPaths: ['x'] },
          ],
        },
        [],
      ),
    /겹칩니다/,
  );
  assert.throws(
    () =>
      validatePlan(
        {
          schemaVersion: 1,
          tasks: [
            {
              id: 'a',
              requirement: 'x',
              allowedPaths: ['x'],
              dependsOn: ['b'],
            },
            {
              id: 'b',
              requirement: 'y',
              allowedPaths: ['y'],
              dependsOn: ['a'],
            },
          ],
        },
        [],
      ),
    /순환/,
  );
});

test('Core adapter invokes the standalone entry point in its own worktree', async (t) => {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'momentory-core-adapter-'),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'harness', 'parallel'), { recursive: true });
  fs.copyFileSync(
    new URL('../parallel/worker-entry.mjs', import.meta.url),
    path.join(root, 'harness', 'parallel', 'worker-entry.mjs'),
  );
  fs.writeFileSync(
    path.join(root, 'harness', 'run.mjs'),
    "import fs from 'node:fs'; fs.writeFileSync('received.txt', process.argv[2]); console.log('core invoked');\n",
  );
  const logFile = path.join(root, 'logs', 'task.log');
  const result = await new Promise((resolve) =>
    startCoreWorker({
      worktree: root,
      requirement: 'Do work',
      logFile,
      task: { id: 'task1', allowedPaths: ['task1.txt'] },
      onExit: resolve,
    }),
  );
  assert.equal(result.code, 0);
  assert.match(
    fs.readFileSync(path.join(root, 'received.txt'), 'utf8'),
    /task1.txt/,
  );
  assert.match(fs.readFileSync(logFile, 'utf8'), /core invoked/);
});

test('Core adapter forwards stop signal to the standalone process', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'momentory-core-stop-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'harness', 'parallel'), { recursive: true });
  fs.copyFileSync(
    new URL('../parallel/worker-entry.mjs', import.meta.url),
    path.join(root, 'harness', 'parallel', 'worker-entry.mjs'),
  );
  fs.writeFileSync(
    path.join(root, 'harness', 'run.mjs'),
    "import fs from 'node:fs'; process.on('SIGTERM', () => { fs.writeFileSync('stopped.txt','yes'); process.exit(0); }); console.log('ready'); setInterval(() => {}, 1000);\n",
  );
  const logFile = path.join(root, 'worker.log');
  let child;
  const finished = new Promise((resolve) => {
    child = startCoreWorker({
      worktree: root,
      requirement: 'wait',
      logFile,
      task: { id: 'task1', allowedPaths: ['task1.txt'] },
      onExit: resolve,
    });
  });
  for (let i = 0; i < 50 && !fs.existsSync(logFile); i++)
    await new Promise((resolve) => setTimeout(resolve, 10));
  for (
    let i = 0;
    i < 50 && !fs.readFileSync(logFile, 'utf8').includes('ready');
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 10));
  stopWorker(child);
  await finished;
  assert.equal(fs.readFileSync(path.join(root, 'stopped.txt'), 'utf8'), 'yes');
});

for (const count of [1, 2, 4]) {
  test(`${count} real worker processes run concurrently in isolated worktrees`, async (t) => {
    const root = repo();
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const { state } = createRun(root, plan(count));
    let active = 0;
    let peak = 0;
    const result = await executeRun(root, state.runId, {
      workerFactory: (options) => {
        active += 1;
        peak = Math.max(peak, active);
        const callback = options.onExit;
        return worker({
          ...options,
          onExit: (outcome) => {
            active -= 1;
            callback(outcome);
          },
        });
      },
      protectedPaths: ['harness/'],
    });
    assert.equal(
      result.status,
      'DONE',
      JSON.stringify(
        result.tasks.map(({ status, reason, changedPaths, attempts }) => ({
          status,
          reason,
          changedPaths,
          exitCode: attempts[0].exitCode,
        })),
      ),
    );
    assert.equal(peak, count);
    assert.equal(
      new Set(result.tasks.map((task) => task.attempts[0].worktree)).size,
      count,
    );
    assert.equal(
      new Set(result.tasks.map((task) => task.attempts[0].resultFile)).size,
      count,
    );
    assert.ok(
      result.tasks.every((task) => fs.existsSync(task.attempts[0].resultFile)),
    );
    assert.ok(
      result.tasks.every(
        (task) => task.changedPaths.join() === `${task.id}.txt`,
      ),
    );
  });
}

test('four Core-adapter processes overlap with separate logs and results', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(4));
  const result = await executeRun(root, state.runId);
  assert.equal(result.status, 'DONE');
  const attempts = result.tasks.map((task) => task.attempts[0]);
  assert.ok(
    Math.max(
      ...attempts.map((attempt) => new Date(attempt.startedAt).getTime()),
    ) <
      Math.min(
        ...attempts.map((attempt) => new Date(attempt.endedAt).getTime()),
      ),
  );
  for (const task of result.tasks) {
    assert.match(
      fs.readFileSync(task.attempts[0].logFile, 'utf8'),
      /\[parallel\] 의존성 설치/,
    );
    assert.match(
      fs.readFileSync(task.attempts[0].logFile, 'utf8'),
      new RegExp(`core stub ${task.id}`),
    );
    assert.equal(
      JSON.parse(fs.readFileSync(task.attempts[0].resultFile, 'utf8')).status,
      'DONE',
    );
  }
});

test('five tasks never exceed four workers', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(5));
  let active = 0;
  let peak = 0;
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) => {
      active += 1;
      peak = Math.max(peak, active);
      const callback = options.onExit;
      return worker(
        {
          ...options,
          onExit: (outcome) => {
            active -= 1;
            callback(outcome);
          },
        },
        150,
      );
    },
  });
  assert.equal(result.status, 'DONE');
  assert.equal(peak, 4);
});

test('out-of-scope output fails only its task', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(2));
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) => {
      if (options.task.id === 'task1') {
        const child = spawn(
          process.execPath,
          ['-e', "require('fs').writeFileSync('wrong.txt','x')"],
          { cwd: options.worktree },
        );
        child.once('exit', (code) => options.onExit({ code }));
        return child;
      }
      return worker(options, 100);
    },
  });
  assert.deepEqual(
    result.tasks.map((item) => item.status),
    ['FAILED', 'DONE'],
  );
  assert.match(result.tasks[0].reason, /wrong.txt/);
});

test('a Worker commit is rejected while an independent result is preserved', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(2));
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) => {
      if (options.task.id !== 'task1') return worker(options, 100);
      const code = `const fs=require('fs');const cp=require('child_process');fs.writeFileSync('task1.txt','committed');cp.execFileSync('git',['add','task1.txt']);cp.execFileSync('git',['commit','-qm','unexpected commit']);`;
      const child = spawn(process.execPath, ['-e', code], {
        cwd: options.worktree,
      });
      child.once('exit', (exitCode) => options.onExit({ code: exitCode }));
      return child;
    },
  });
  assert.deepEqual(
    result.tasks.map((task) => task.status),
    ['FAILED', 'DONE'],
  );
  assert.match(result.tasks[0].reason, /HEAD/);
  assert.ok(fs.existsSync(result.tasks[1].attempts[0].resultFile));
});

test('failure does not cancel other workers and blocks dependents', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(3, { task3: ['task1'] }));
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) =>
      worker(options, 200, options.task.id === 'task1'),
  });
  assert.deepEqual(
    result.tasks.map((item) => item.status),
    ['FAILED', 'DONE', 'BLOCKED'],
  );
  restartRun(root, state.runId);
  const retried = await executeRun(root, state.runId, {
    workerFactory: (options) => worker(options, 50),
  });
  assert.equal(retried.status, 'DONE');
  assert.deepEqual(
    retried.tasks.map((task) => task.attempts.length),
    [2, 1, 1],
  );
});

test('dependent task starts only after its predecessor finishes', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(2, { task2: ['task1'] }));
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) => worker(options, 100),
  });
  assert.equal(result.status, 'DONE');
  assert.ok(
    new Date(result.tasks[1].attempts[0].startedAt) >=
      new Date(result.tasks[0].attempts[0].endedAt),
  );
});

test('stop and restart preserve the first attempt and make a new branch', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(1));
  const running = executeRun(root, state.runId, {
    workerFactory: (options) => worker(options, 1000),
  });
  await new Promise((resolve) => setTimeout(resolve, 100));
  requestStop(root, state.runId);
  assert.equal((await running).status, 'STOPPED');
  restartRun(root, state.runId);
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) => worker(options, 50),
  });
  assert.equal(result.status, 'DONE');
  assert.equal(readRun(root, state.runId).state.tasks[0].attempts.length, 2);
  assert.notEqual(
    result.tasks[0].attempts[0].branch,
    result.tasks[0].attempts[1].branch,
  );
});

test('waiting is distinct from failure and approval resumes only its Core run', async (t) => {
  const root = repoWithResumableCore();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(3, { task3: ['task1'] }));
  const first = await executeRun(root, state.runId);
  assert.equal(
    first.status,
    'WAITING',
    JSON.stringify(
      first.tasks.map((task) => ({
        status: task.status,
        reason: task.reason,
        core: task.core,
      })),
    ),
  );
  assert.deepEqual(
    first.tasks.map((task) => task.status),
    ['WAITING', 'DONE', 'BLOCKED'],
  );
  const waiting = first.tasks[0];
  const peer = first.tasks[1];
  const firstResult = fs.readFileSync(waiting.attempts[0].resultFile, 'utf8');
  const peerResult = fs.readFileSync(peer.attempts[0].resultFile, 'utf8');
  assert.equal(approvalState(waiting).status, 'PENDING');
  await assert.rejects(resumeTask(root, state.runId, 'task1'), /사용자 승인/);
  assert.equal(readRun(root, state.runId).state.status, 'WAITING');

  const checklistFile = approvalState(waiting).file;
  const checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf8'));
  assert.equal(
    fs.readFileSync(
      path.join(waiting.attempts[0].worktree, 'task1.txt'),
      'utf8',
    ),
    'draft',
  );
  checklist.items[0].result = 'pass'; // Explicit test-fixture approval after checking the file.
  checklist.items[0].noteRequired = true;
  fs.writeFileSync(checklistFile, JSON.stringify(checklist));
  assert.equal(approvalState(waiting).status, 'PENDING');
  checklist.items[0].note = 'Verified task1.txt contains draft';
  fs.writeFileSync(checklistFile, JSON.stringify(checklist));
  assert.equal(approvalState(waiting).status, 'APPROVED');
  const resuming = resumeTask(root, state.runId, 'task1');
  await assert.rejects(resumeTask(root, state.runId, 'task1'), /이미 실행 중/);
  const resumed = await resuming;
  assert.equal(resumed.status, 'READY');
  assert.deepEqual(
    resumed.tasks.map((task) => task.status),
    ['DONE', 'DONE', 'PENDING'],
  );
  assert.equal(resumed.tasks[0].attempts.length, 1);
  assert.equal(resumed.tasks[0].resumes.length, 1);
  assert.equal(resumed.tasks[1].attempts.length, 1);
  assert.equal(
    fs.readFileSync(waiting.attempts[0].resultFile, 'utf8'),
    firstResult,
  );
  assert.equal(
    fs.readFileSync(peer.attempts[0].resultFile, 'utf8'),
    peerResult,
  );
  assert.ok(fs.existsSync(resumed.tasks[0].resumes[0].resultFile));
  assert.match(
    fs.readFileSync(resumed.tasks[0].resumes[0].logFile, 'utf8'),
    /core resume task1/,
  );
  await assert.rejects(
    resumeTask(root, state.runId, 'task1'),
    /재개할 수 없는/,
  );

  restartRun(root, state.runId);
  const finished = await executeRun(root, state.runId);
  assert.equal(finished.status, 'DONE');
  assert.equal(finished.tasks[2].attempts.length, 1);
});

test('human review is not a failed or automatically resumable worker', () => {
  assert.equal(runStatus([{ status: 'HUMAN_REVIEW_REQUIRED' }]), 'WAITING');
  assert.equal(
    runStatus([{ status: 'WAITING' }, { status: 'FAILED' }]),
    'FAILED',
  );
  assert.equal(
    approvalState({ status: 'HUMAN_REVIEW_REQUIRED' }).status,
    'REVIEW_REQUIRED',
  );
});

test('decision approval requires every answer and explicit final approval', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'momentory-approval-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'harness', 'runs', '20261015-000000');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'state.json'),
    JSON.stringify({
      status: 'WAITING_HUMAN_DECISION',
      pendingDecision: { file: 'decisions.json' },
    }),
  );
  const decisionFile = path.join(dir, 'decisions.json');
  const task = {
    status: 'WAITING',
    core: { runId: '20261015-000000' },
    attempts: [{ worktree: root }],
  };
  const decisions = { questions: [{ id: 'D1', answer: '' }], approved: false };
  fs.writeFileSync(decisionFile, JSON.stringify(decisions));
  assert.equal(approvalState(task).status, 'PENDING');
  decisions.questions[0].answer = 'chosen';
  fs.writeFileSync(decisionFile, JSON.stringify(decisions));
  assert.equal(approvalState(task).status, 'PENDING');
  decisions.approved = true;
  fs.writeFileSync(decisionFile, JSON.stringify(decisions));
  assert.equal(approvalState(task).status, 'APPROVED');
});

test('legacy M1 FAILED record with a waiting worker can resume without a new attempt', async (t) => {
  const root = repoWithResumableCore();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(1));
  const first = await executeRun(root, state.runId);
  const dir = path.join(root, 'harness', 'parallel-runs', state.runId);
  const saved = readRun(root, state.runId).state;
  saved.status = 'FAILED';
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(saved));
  assert.equal(runStatus(saved.tasks), 'WAITING');
  const checklistFile = approvalState(first.tasks[0]).file;
  const checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf8'));
  checklist.items[0].result = 'pass';
  fs.writeFileSync(checklistFile, JSON.stringify(checklist));
  const result = await resumeTask(root, state.runId, 'task1');
  assert.equal(result.status, 'DONE');
  assert.equal(result.tasks[0].attempts.length, 1);
});

test('human review blocks its dependent without hanging the orchestrator', async (t) => {
  const root = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(2, { task2: ['task1'] }));
  const result = await executeRun(root, state.runId, {
    workerFactory: (options) => {
      const child = spawn(process.execPath, ['-e', 'process.exit(4)'], {
        cwd: options.worktree,
      });
      child.once('exit', (code) => options.onExit({ code }));
      return child;
    },
  });
  assert.equal(result.status, 'WAITING');
  assert.deepEqual(
    result.tasks.map((task) => task.status),
    ['HUMAN_REVIEW_REQUIRED', 'BLOCKED'],
  );
  assert.throws(() => restartRun(root, state.runId), /resume 명령/);
});

test('resume refuses a committed Worker HEAD and preserves its first result', async (t) => {
  const root = repoWithResumableCore();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(1));
  const first = await executeRun(root, state.runId);
  const task = first.tasks[0];
  const result = fs.readFileSync(task.attempts[0].resultFile, 'utf8');
  const worktree = task.attempts[0].worktree;
  execFileSync('git', ['add', 'task1.txt'], { cwd: worktree });
  execFileSync('git', ['commit', '-qm', 'unexpected Worker commit'], {
    cwd: worktree,
  });
  await assert.rejects(
    resumeTask(root, state.runId, 'task1'),
    /HEAD가 시작 커밋과/,
  );
  assert.equal(fs.readFileSync(task.attempts[0].resultFile, 'utf8'), result);
  assert.equal(readRun(root, state.runId).state.tasks[0].resumes, undefined);
});

test('a dead resume controller is reconciled before a new resume starts', async (t) => {
  const root = repoWithResumableCore();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(1));
  const first = await executeRun(root, state.runId);
  const task = first.tasks[0];
  const checklistFile = approvalState(task).file;
  const checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf8'));
  checklist.items[0].result = 'pass';
  fs.writeFileSync(checklistFile, JSON.stringify(checklist));
  const dir = path.join(root, 'harness', 'parallel-runs', state.runId);
  const saved = readRun(root, state.runId).state;
  const record = {
    attempt: 1,
    resume: 1,
    worktree: task.attempts[0].worktree,
    branch: task.attempts[0].branch,
    logFile: path.join(dir, 'logs', 'task1-a1-r1.log'),
    resultFile: path.join(dir, 'results', 'task1-a1-r1.json'),
    startedAt: new Date().toISOString(),
  };
  saved.tasks[0].resumes = [record];
  saved.tasks[0].status = 'RESUMING';
  saved.status = 'RUNNING';
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(saved));
  const result = await resumeTask(root, state.runId, 'task1');
  assert.equal(result.status, 'DONE');
  assert.equal(result.tasks[0].attempts.length, 1);
  assert.equal(result.tasks[0].resumes.length, 2);
  assert.equal(result.tasks[0].resumes[0].recovered, true);
  assert.equal(
    JSON.parse(fs.readFileSync(record.resultFile)).status,
    'WAITING',
  );
  assert.equal(
    JSON.parse(fs.readFileSync(result.tasks[0].resumes[1].resultFile)).status,
    'DONE',
  );
});

test('an already written resume result is recovered without running Core twice', async (t) => {
  const root = repoWithResumableCore();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(1));
  const first = await executeRun(root, state.runId);
  const dir = path.join(root, 'harness', 'parallel-runs', state.runId);
  const saved = readRun(root, state.runId).state;
  const task = saved.tasks[0];
  const coreFile = path.join(
    task.attempts[0].worktree,
    'harness',
    'runs',
    task.core.runId,
    'state.json',
  );
  const core = JSON.parse(fs.readFileSync(coreFile, 'utf8'));
  core.status = 'DONE';
  fs.writeFileSync(coreFile, JSON.stringify(core));
  const resultFile = path.join(dir, 'results', 'task1-a1-r1.json');
  const firstResult = {
    taskId: 'task1',
    attempt: 1,
    resume: 1,
    status: 'DONE',
    reason: null,
    changedPaths: first.tasks[0].changedPaths,
    core: { runId: task.core.runId, status: 'DONE', taskFile: core.taskFile },
    exitCode: 0,
  };
  fs.writeFileSync(resultFile, JSON.stringify(firstResult));
  task.resumes = [{ attempt: 1, resume: 1, resultFile }];
  task.status = 'RESUMING';
  saved.status = 'RUNNING';
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(saved));
  const recovered = await resumeTask(root, state.runId, 'task1');
  assert.equal(recovered.status, 'DONE');
  assert.equal(recovered.tasks[0].resumes.length, 1);
  assert.equal(recovered.tasks[0].resumes[0].recovered, true);
  assert.equal(
    fs.readFileSync(resultFile, 'utf8'),
    JSON.stringify(firstResult),
  );
});

test('a stopped resume can continue when its Core run is still waiting', async (t) => {
  const root = repoWithResumableCore();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const { state } = createRun(root, plan(1));
  const first = await executeRun(root, state.runId);
  const dir = path.join(root, 'harness', 'parallel-runs', state.runId);
  const checklistFile = approvalState(first.tasks[0]).file;
  const checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf8'));
  checklist.items[0].result = 'pass';
  fs.writeFileSync(checklistFile, JSON.stringify(checklist));
  const saved = readRun(root, state.runId).state;
  saved.tasks[0].status = 'STOPPED';
  saved.tasks[0].resumes = [
    {
      attempt: 1,
      resume: 1,
      resultFile: path.join(dir, 'results', 'task1-a1-r1.json'),
      logFile: path.join(dir, 'logs', 'task1-a1-r1.log'),
      exitCode: 143,
    },
  ];
  saved.status = 'STOPPED';
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify(saved));
  fs.writeFileSync(saved.tasks[0].resumes[0].resultFile, '{}');
  fs.writeFileSync(saved.tasks[0].resumes[0].logFile, 'stopped');
  assert.equal(approvalState(saved.tasks[0]).status, 'APPROVED');
  assert.throws(() => restartRun(root, state.runId), /resume 명령/);
  const result = await resumeTask(root, state.runId, 'task1');
  assert.equal(result.status, 'DONE');
  assert.equal(result.tasks[0].resumes.length, 2);
});
