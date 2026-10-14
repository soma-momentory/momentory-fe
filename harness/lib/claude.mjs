// @ts-check
import os from 'node:os';
import path from 'node:path';
import { describeFailure } from './process.mjs';
import { validateSchema } from './schema.mjs';

// Claude 비대화형 호출 (D3, D4).
// claude-max.cmd wrapper를 shell로 실행하지 않고, 같은 설정 디렉터리로 claude를 직접 실행한다.

/** @typedef {import('./process.mjs').Runner} Runner */
/** @typedef {import('./schema.mjs').JsonSchema} JsonSchema */

export const CLAUDE_COMMAND = 'claude';

// 파일 편집은 acceptEdits로 허용되고, 그 외 Bash는 아래 목록만 허용된다. (목록에 없는 Bash는 -p에서 거부된다)
export const CLAUDE_ALLOWED_TOOLS = [
  'Bash(npm run check)',
  'Bash(npm run check:full)',
  'Bash(npm run lint*)',
  'Bash(npm run typecheck)',
  'Bash(npm run format*)',
  'Bash(npx vitest*)',
  'Bash(npx playwright test*)',
  'Bash(git status*)',
  'Bash(git diff*)',
  'Bash(git log*)',
];

export const CLAUDE_DISALLOWED_TOOLS = [
  'Bash(git commit*)',
  'Bash(git push*)',
  'Bash(git reset*)',
  'Bash(git checkout*)',
  'Bash(git clean*)',
  'Bash(npm install*)',
  'Bash(npm i *)',
  'Bash(supabase*)',
  'Bash(npx supabase*)',
  'WebFetch',
];

/** @param {JsonSchema} schema @param {{ allowedTools?: string[], disallowedTools?: string[] }} [tools] */
export function buildClaudeArgs(schema, tools = {}) {
  return [
    '-p',
    '--output-format',
    'json',
    '--json-schema',
    JSON.stringify(schema),
    '--permission-mode',
    'acceptEdits',
    '--allowedTools',
    ...(tools.allowedTools ?? CLAUDE_ALLOWED_TOOLS),
    '--disallowedTools',
    ...(tools.disallowedTools ?? CLAUDE_DISALLOWED_TOOLS),
  ];
}

/**
 * claude-max.cmd와 같은 설정 디렉터리를 사용한다.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {NodeJS.ProcessEnv}
 */
export function claudeEnv(env = process.env, configDir = '~/.claude-max') {
  const home = env.USERPROFILE ?? os.homedir();
  return {
    ...env,
    CLAUDE_CONFIG_DIR: configDir.startsWith('~/')
      ? path.join(home, configDir.slice(2))
      : configDir,
  };
}

/**
 * error는 사용자에게 보여주는 고정 요약이다. (콘솔 / state.json / report)
 * detail은 Claude 응답에서 나온 값(필드명, subtype 등)을 포함할 수 있으므로 run 로그 파일에만 쓴다. (Task 007)
 * @typedef {{ ok: true, output: any, sessionId: string | null }
 *   | { ok: false, error: string, detail?: string }} ClaudeResult
 */

const NOT_JSON = 'Claude 응답이 JSON이 아닙니다';

/**
 * `--output-format json` 응답에서 구조화 결과를 꺼내고 schema를 검사한다.
 * @param {string} stdout
 * @param {JsonSchema} schema
 * @returns {ClaudeResult}
 */
export function parseClaudeOutput(stdout, schema) {
  /** @type {any} */
  let envelope;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    return { ok: false, error: NOT_JSON };
  }

  if (envelope?.is_error || envelope?.subtype !== 'success') {
    // result / subtype은 Claude 응답 원문이므로 사유에 넣지 않는다.
    return {
      ok: false,
      error: 'Claude 실행 오류',
      detail: `is_error: ${String(envelope?.is_error)}, subtype: ${String(envelope?.subtype)}`,
    };
  }
  if (envelope.structured_output === undefined) {
    return { ok: false, error: 'Claude 응답에 structured_output이 없습니다' };
  }

  const errors = validateSchema(schema, envelope.structured_output);
  if (errors.length > 0) {
    // 오류에는 응답의 필드명이 들어갈 수 있으므로 detail로만 남긴다.
    return {
      ok: false,
      error: 'Claude 응답 형식 검증 실패',
      detail: errors.join('\n'),
    };
  }

  return {
    ok: true,
    output: envelope.structured_output,
    sessionId: envelope.session_id ?? null,
  };
}

/**
 * @param {object} params
 * @param {Runner} params.runner
 * @param {string} params.root
 * @param {string} params.prompt
 * @param {JsonSchema} params.schema
 * @param {number} params.timeoutMs
 * @param {{ command?: string, allowedTools?: string[], disallowedTools?: string[], configDir?: string }} [params.toolConfig]
 * @returns {Promise<ClaudeResult & { stdout: string, stderr: string }>}
 */
export async function callClaude({
  runner,
  root,
  prompt,
  schema,
  timeoutMs,
  toolConfig,
}) {
  const result = await runner(
    toolConfig?.command ?? CLAUDE_COMMAND,
    buildClaudeArgs(schema, toolConfig),
    {
      cwd: root,
      input: prompt,
      timeoutMs,
      env:
        toolConfig && !toolConfig.configDir
          ? process.env
          : claudeEnv(process.env, toolConfig?.configDir),
    },
  );
  const raw = { stdout: result.stdout, stderr: result.stderr };

  if (result.timedOut || result.spawnError) {
    return { ok: false, error: describeFailure('Claude', result), ...raw };
  }

  const parsed = parseClaudeOutput(result.stdout, schema);
  if (result.code !== 0) {
    // is_error 응답은 exit code가 0이 아닐 수 있다. JSON 응답이 아니면 exit code만 쓴다.
    if (parsed.ok || parsed.error === NOT_JSON) {
      return { ok: false, error: describeFailure('Claude', result), ...raw };
    }
    return {
      ...parsed,
      error: `${parsed.error} · exit ${result.code}`,
      ...raw,
    };
  }
  if (!parsed.ok) {
    // exit 0이어도 응답 형식이 맞지 않으면 실패. (형식 검증 실패와 비정상 종료를 구분한다)
    return { ...parsed, error: `${parsed.error} · exit 0`, ...raw };
  }
  return { ...parsed, ...raw };
}
