// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { describeFailure } from './process.mjs';
import { validateSchema } from './schema.mjs';
import { VERDICT } from './states.mjs';

// Codex 리뷰 호출 (D2). Codex는 read-only sandbox에서 reviewer 역할만 한다.

/** @typedef {import('./process.mjs').Runner} Runner */
/** @typedef {import('./schema.mjs').JsonSchema} JsonSchema */

export const CODEX_COMMAND = 'codex';

/**
 * @param {string} schemaPath 저장소 루트 기준 경로
 * @param {string} outputPath 저장소 루트 기준 경로
 */
export function buildCodexArgs(schemaPath, outputPath) {
  return [
    'exec',
    '--sandbox',
    'read-only',
    '--output-schema',
    schemaPath,
    '--output-last-message',
    outputPath,
    '--color',
    'never',
    // prompt는 stdin으로 전달한다.
    '-',
  ];
}

/**
 * schema 검사 + verdict와 배열의 일관성 검사.
 * @param {any} review
 * @param {JsonSchema} schema
 * @returns {string[]}
 */
export function validateReview(review, schema) {
  const errors = validateSchema(schema, review);
  if (errors.length > 0) return errors;

  switch (review.verdict) {
    case VERDICT.PASS:
      if (review.mustFix.length > 0) errors.push('PASS인데 mustFix가 있음');
      if (review.humanDecisions.length > 0) {
        errors.push('PASS인데 humanDecisions가 있음');
      }
      break;
    case VERDICT.FIX_REQUIRED:
      if (review.mustFix.length === 0) {
        errors.push('FIX_REQUIRED인데 mustFix가 비어 있음');
      }
      break;
    case VERDICT.HUMAN_DECISION_REQUIRED:
      if (review.humanDecisions.length === 0) {
        errors.push('HUMAN_DECISION_REQUIRED인데 humanDecisions가 비어 있음');
      }
      break;
    case VERDICT.BLOCKED:
      if (review.blockedReason.trim() === '') {
        errors.push('BLOCKED인데 blockedReason이 비어 있음');
      }
      break;
  }
  return errors;
}

/**
 * @param {object} params
 * @param {Runner} params.runner
 * @param {string} params.root
 * @param {string} params.prompt
 * @param {string} params.schemaPath 절대 경로
 * @param {string} params.outputPath 절대 경로
 * @param {number} params.timeoutMs
 * @param {string} [params.command]
 * @returns {Promise<({ ok: true, review: any } | { ok: false, error: string }) & { log: string }>}
 */
export async function callCodex({
  runner,
  root,
  prompt,
  schemaPath,
  outputPath,
  timeoutMs,
  command = CODEX_COMMAND,
}) {
  const toRepoPath = (/** @type {string} */ file) =>
    path.relative(root, file).split(path.sep).join('/');
  const result = await runner(
    command,
    buildCodexArgs(toRepoPath(schemaPath), toRepoPath(outputPath)),
    {
      cwd: root,
      input: prompt,
      timeoutMs,
      // codex는 Windows에서 npm .cmd shim이므로 shell을 거쳐 실행한다. 인자는 quoteForCmd로 검사된다.
      shell: process.platform === 'win32',
    },
  );
  const log = `${result.stdout}\n--- stderr ---\n${result.stderr}`;

  if (result.code !== 0 || result.timedOut || result.spawnError) {
    return { ok: false, error: describeFailure('Codex', result), log };
  }

  let review;
  try {
    review = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  } catch {
    return {
      ok: false,
      error: 'Codex 리뷰 결과 파일을 읽을 수 없거나 JSON이 아닙니다.',
      log,
    };
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  // schema 오류에는 응답의 필드명 등 원문 값이 들어갈 수 있으므로 사유에는 고정 요약만, 상세는 로그에만 남긴다.
  const schemaErrors = validateSchema(schema, review);
  if (schemaErrors.length > 0) {
    return {
      ok: false,
      error: 'Codex 응답 형식 검증 실패 · exit 0',
      log: `${log}\n--- harness 검증 ---\n${schemaErrors.join('\n')}\n`,
    };
  }
  // verdict와 배열의 일관성 오류는 하네스가 만든 고정 문구라 그대로 보여준다.
  const errors = validateReview(review, schema);
  if (errors.length > 0) {
    return {
      ok: false,
      error: `Codex 리뷰 결과가 올바르지 않습니다: ${errors.join(', ')}`,
      log,
    };
  }
  return { ok: true, review, log };
}
