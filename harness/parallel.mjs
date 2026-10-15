import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './lib/project.mjs';
import {
  approvalState,
  createRun,
  executeRun,
  readRun,
  requestStop,
  restartRun,
  resumeTask,
  runStatus,
} from './parallel/orchestrator.mjs';
import { loadPlan } from './parallel/plan.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const project = loadProject(path.join(repoRoot, 'harness'));
const [command, arg, taskId] = process.argv.slice(2);

function exitCode(status) {
  if (status === 'DONE') return 0;
  if (status === 'WAITING' || status === 'READY') return 2;
  if (status === 'STOPPED') return 130;
  return 1;
}

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
    process.exitCode = exitCode(result.status);
  } else if (command === 'status' && arg) {
    const { state } = readRun(repoRoot, arg);
    console.log(
      JSON.stringify(
        {
          ...state,
          effectiveStatus: ['DONE', 'FAILED', 'WAITING'].includes(state.status)
            ? runStatus(state.tasks)
            : state.status,
          tasks: state.tasks.map((task) => ({
            ...task,
            approval: approvalState(task),
          })),
        },
        null,
        2,
      ),
    );
  } else if (command === 'resume' && arg && taskId) {
    const result = await resumeTask(repoRoot, arg, taskId, {
      protectedPaths: project.protectedPaths,
    });
    console.log(
      JSON.stringify(
        {
          runId: result.runId,
          status: result.status,
          task: result.tasks.find((task) => task.id === taskId)?.status,
        },
        null,
        2,
      ),
    );
    process.exitCode = exitCode(result.status);
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
    process.exitCode = exitCode(result.status);
  } else {
    console.log(
      '사용법: node harness/parallel.mjs start <plan.json> | status <runId> | resume <runId> <taskId> | stop <runId> | restart <runId>',
    );
    process.exitCode = command ? 1 : 0;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
