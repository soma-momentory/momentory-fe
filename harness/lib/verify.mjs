// @ts-check

// 하네스가 직접 check / check:full을 실행하고 exit code로 판정한다. Claude의 보고는 사용하지 않는다.

/** @typedef {import('./process.mjs').Runner} Runner */

/**
 * @typedef {object} VerificationStep
 * @property {string} script
 * @property {number | null} code
 * @property {boolean} timedOut
 * @property {string} logFile run 디렉터리 기준 파일 이름
 * @property {string} [commandText]
 */

/**
 * `npm run <script>` 실행 방법. `npm run harness`로 실행되면 npm-cli.js를 node로 직접 실행해 shell을 거치지 않는다.
 * @param {string} script
 * @param {NodeJS.ProcessEnv} [env]
 */
export function npmRunCommand(script, env = process.env) {
  const npmCli = env.npm_execpath;
  if (npmCli && /\.c?js$/.test(npmCli)) {
    return {
      command: process.execPath,
      args: [npmCli, 'run', script],
      shell: false,
    };
  }
  return {
    command: 'npm',
    args: ['run', script],
    shell: process.platform === 'win32',
  };
}

/**
 * @param {object} params
 * @param {Runner} params.runner
 * @param {string} params.root
 * @param {number} params.round
 * @param {{ check: number, checkFull: number }} params.timeouts
 * @param {(fileName: string, content: string) => void} params.writeLog
 * @param {(script: string) => (step: VerificationStep) => void} [params.onStep] 명령 시작 시 호출, 반환한 함수는 명령 종료 시 호출 (진행 표시용)
 * @param {{ script: string, command?: string, args?: string[], timeoutMs: number }[]} [params.plan]
 * @returns {Promise<{ passed: boolean, steps: VerificationStep[] }>}
 */
export async function runVerification({
  runner,
  root,
  round,
  timeouts,
  writeLog,
  onStep,
  plan: configuredPlan,
}) {
  const plan = configuredPlan ?? [
    { script: 'check', timeoutMs: timeouts.check },
    { script: 'check:full', timeoutMs: timeouts.checkFull },
  ];
  /** @type {VerificationStep[]} */
  const steps = [];

  for (const item of plan) {
    const { script, timeoutMs } = item;
    const npmScript =
      item.command === 'npm' &&
      item.args?.length === 2 &&
      item.args[0] === 'run' &&
      item.args[1] === script;
    const { command, args, shell } =
      item.command && !npmScript
        ? {
            command: item.command,
            args: item.args ?? [],
            shell: process.platform === 'win32',
          }
        : npmRunCommand(script);
    const done = onStep?.(script);
    const result = await runner(command, args, {
      cwd: root,
      timeoutMs,
      shell,
      // Playwright HTML reporter가 실패 시 브라우저를 열고 대기하지 않게 한다.
      env: { ...process.env, PLAYWRIGHT_HTML_OPEN: 'never' },
    });
    const logFile = `verify-${round}-${script.replace(/[^a-zA-Z0-9_-]/g, '-')}.log`;
    writeLog(
      logFile,
      [
        item.command
          ? `$ ${item.command} ${(item.args ?? []).join(' ')}`
          : `$ npm run ${script}`,
        `exit code: ${result.code}${result.timedOut ? ' (시간 초과)' : ''}`,
        result.spawnError ? `spawn error: ${result.spawnError}` : '',
        '--- stdout ---',
        result.stdout,
        '--- stderr ---',
        result.stderr,
      ].join('\n'),
    );
    /** @type {VerificationStep} */
    const step = {
      script,
      code: result.code,
      timedOut: result.timedOut,
      logFile,
      ...(item.command
        ? {
            commandText:
              `${item.command} ${(item.args ?? []).join(' ')}`.trim(),
          }
        : {}),
    };
    steps.push(step);
    done?.(step);

    // check가 실패하면 check:full을 실행하지 않는다.
    if (result.code !== 0 || result.timedOut) {
      return { passed: false, steps };
    }
  }

  return { passed: true, steps };
}
