// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { USAGE, parseArgs } from './lib/args.mjs';
import { openTerminalPrompt } from './lib/decisionPrompt.mjs';
import { DEFAULT_TIMEOUTS, resumeRun, startRun } from './lib/harness.mjs';
import {
  runProcess,
  snapshotActiveChildren,
  terminateChildren,
} from './lib/process.mjs';
import { createProgress } from './lib/progress.mjs';
import { installSignalHandlers } from './lib/signals.mjs';
import { loadProject } from './lib/project.mjs';

// 개발 하네스 진입점 (Task 005, Task 007, Task 010)
//   npm run harness -- "<요구사항>"
//   npm run harness -- --resume [runId]

const harnessDir = path.dirname(fileURLToPath(import.meta.url));

const parsed = parseArgs(process.argv.slice(2));

if (parsed.mode === 'help') {
  if (parsed.error) console.error(parsed.error);
  let usage = USAGE;
  try {
    usage = USAGE.replaceAll(
      'npm run harness --',
      loadProject(harnessDir).runCommand,
    );
  } catch {
    /* 설정 오류가 있어도 도움말은 표시한다. */
  }
  console.log(usage);
  process.exitCode = parsed.error ? 1 : 0;
} else {
  const tty = Boolean(process.stdout.isTTY);
  // 결정 입력은 입력 / 출력이 모두 터미널일 때만 사용한다. (non-TTY는 파일 기반)
  const interactive = tty && Boolean(process.stdin.isTTY);

  /** @type {import('./lib/project.mjs').ProjectSettings} */
  let project;
  try {
    project = loadProject(harnessDir);
  } catch (error) {
    console.error(/** @type {Error} */ (error).message);
    process.exit(1);
  }
  /** @type {import('./lib/harness.mjs').HarnessDeps} */
  const deps = {
    root: project.root,
    harnessDir,
    project,
    runner: runProcess,
    now: () => new Date(),
    progress: createProgress({
      tty,
      write: (text) => process.stdout.write(text),
    }),
    timeouts: DEFAULT_TIMEOUTS,
    prompt: interactive
      ? () =>
          openTerminalPrompt({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
          })
      : undefined,
    onSignal: (handler, options) =>
      installSignalHandlers({
        onSignal: handler,
        exit: (code) => process.exit(code),
        ...options,
      }),
    snapshotChildren: snapshotActiveChildren,
    killChildren: (children) => terminateChildren(children),
  };
  const outcome =
    parsed.mode === 'start'
      ? await startRun(parsed.requirement, deps)
      : await resumeRun(parsed.runId, deps);
  process.exitCode = outcome.exitCode;
}
