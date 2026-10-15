import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  createRun,
  executeRun,
  readRun,
  requestStop,
  restartRun,
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
    'harness/parallel-runs/\nnode_modules/\n',
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
