import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './lib/project.mjs';
import {
  createRun,
  executeRun,
  readRun,
  requestStop,
  restartRun,
} from './parallel/orchestrator.mjs';
import { loadPlan } from './parallel/plan.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const project = loadProject(path.join(repoRoot, 'harness'));
const [command, arg] = process.argv.slice(2);

try {
  if (command === 'start' && arg) {
    const plan = loadPlan(path.resolve(arg), project.protectedPaths);
    const { state } = createRun(repoRoot, plan);
    console.log(`Parallel run: ${state.runId}`);
    const result = await executeRun(repoRoot, state.runId, {
      protectedPaths: project.protectedPaths,
    });
    console.log(
      JSON.stringify(
        {
          runId: result.runId,
          status: result.status,
          tasks: result.tasks.map(({ id, status }) => ({ id, status })),
        },
        null,
        2,
      ),
    );
    process.exitCode = result.status === 'DONE' ? 0 : 1;
  } else if (command === 'status' && arg) {
    console.log(JSON.stringify(readRun(repoRoot, arg).state, null, 2));
  } else if (command === 'stop' && arg) {
    requestStop(repoRoot, arg);
    console.log(`중단 요청: ${arg}`);
  } else if (command === 'restart' && arg) {
    restartRun(repoRoot, arg);
    const result = await executeRun(repoRoot, arg, {
      protectedPaths: project.protectedPaths,
    });
    console.log(
      JSON.stringify(
        {
          runId: result.runId,
          status: result.status,
          tasks: result.tasks.map(({ id, status }) => ({ id, status })),
        },
        null,
        2,
      ),
    );
    process.exitCode = result.status === 'DONE' ? 0 : 1;
  } else {
    console.log(
      '사용법: node harness/parallel.mjs start <plan.json> | status <runId> | stop <runId> | restart <runId>',
    );
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
