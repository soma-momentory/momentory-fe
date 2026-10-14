// @ts-check
import { MIGRATION_CHECK, describeManualItem } from './manualValidation.mjs';
import { formatDuration } from './progress.mjs';
import { MAX_FIX_ATTEMPTS, STATUS } from './states.mjs';

/** @typedef {import('./harness.mjs').RunState} RunState */
/** @typedef {import('./harness.mjs').DecisionQuestion} DecisionQuestion */
/** @typedef {import('./states.mjs').Status} Status */

// 단계별 소요 시간을 보여줄 상태 (Task 011 5.9). 입력 대기 상태는 포함하지 않는다.
export const TIMED_STAGES = /** @type {const} */ ([
  STATUS.TASK_GENERATING,
  STATUS.IMPLEMENTING,
  STATUS.VERIFYING,
  STATUS.REVIEWING,
]);

/**
 * `state.history`로 단계별 소요 시간을 계산한다. (Task 011 5.9)
 * 각 항목은 그 상태에 들어간 시각부터 다음 history 항목 시각까지이며, 같은 상태의 여러 회차는 합산한다.
 * 다음 항목이 없는 마지막 항목은 계산하지 않는다.
 * @param {{ status: Status, at: string }[]} history
 * @returns {Record<string, { ms: number, count: number }>} TIMED_STAGES 상태별 합계
 */
export function computeStageDurations(history) {
  /** @type {Record<string, { ms: number, count: number }>} */
  const result = Object.fromEntries(
    TIMED_STAGES.map((stage) => [stage, { ms: 0, count: 0 }]),
  );
  history.forEach((entry, index) => {
    const next = history[index + 1];
    const total = result[entry.status];
    if (!next || !total) return;
    const ms = Date.parse(next.at) - Date.parse(entry.at);
    if (!Number.isFinite(ms)) return;
    total.ms += Math.max(0, ms);
    total.count += 1;
  });
  return result;
}

/**
 * @param {{ status: Status, at: string }[]} history
 */
function formatStageDurations(history) {
  const durations = computeStageDurations(history);
  return TIMED_STAGES.map((stage) => {
    const { ms, count } = durations[stage];
    return count > 0
      ? `${stage}: ${formatDuration(ms)} (${count}회)`
      : `${stage}: 기록 없음`;
  });
}

/**
 * @param {DecisionQuestion[]} questions
 */
export function formatDecisionQuestions(questions) {
  return questions
    .map((question) => {
      const options = question.options
        .map(
          (option) =>
            `  - ${option.label}\n    장점: ${option.pros}\n    단점: ${option.cons}`,
        )
        .join('\n');
      return [
        `### ${question.id}. ${question.question}`,
        `- 이유: ${question.reason}`,
        '- 선택지:',
        options || '  (선택지 없음)',
        `- 추천: ${question.recommendation}`,
        `- 영향: ${question.impact}`,
      ].join('\n');
    })
    .join('\n\n');
}

/**
 * @param {string[]} items
 * @param {string} [empty]
 */
function list(items, empty = '없음') {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : empty;
}

/**
 * @param {RunState} state
 * @param {{ manualItems?: import('./manualValidation.mjs').ManualItem[] | null, migrationCheck?: string }} [extras]
 *   수동 검증 체크리스트가 있으면 항목별 결과를 보여준다. (Task 010)
 */
export function buildReport(
  state,
  { manualItems = null, migrationCheck = MIGRATION_CHECK } = {},
) {
  const verifications = state.verifications.map(
    (verification) =>
      `${verification.round}회차: ` +
      verification.steps
        .map(
          (step) =>
            `${step.commandText ?? `npm run ${step.script}`} → exit ${step.code}` +
            (step.timedOut ? ' (시간 초과)' : '') +
            ` (${step.logFile})`,
        )
        .join(', '),
  );
  const reviews = state.reviews.map(
    (review) =>
      `${review.round}회차: ${review.verdict} (Must Fix ${review.mustFixCount}, Nice to Have ${review.niceToHaveCount}, ${review.file})`,
  );
  const manual = manualItems
    ? manualItems.map(describeManualItem)
    : [
        ...state.manualValidation,
        ...state.newMigrations.map((file) => `${file}: ${migrationCheck}`),
        ...(state.codexManual ?? []).map(
          (item) => `${item.id} ${item.title}: ${item.check}`,
        ),
        ...(state.manualConfirmed ?? []).map(
          (item) => `${item.id} ${item.title}: ${item.check}`,
        ),
      ];
  const manualNote =
    manualItems && state.manualChecklist?.reviewedSnapshot === null
      ? '\n리뷰 시점 working tree 기록이 없는 run이라, DONE 전 확인에서 HEAD만 비교한다.'
      : '';

  return [
    `# Harness Run ${state.runId}`,
    '',
    `## 최종 상태`,
    '',
    state.status,
    state.failureReason ? `\n사유: ${state.failureReason}` : '',
    '',
    '## 요구사항',
    '',
    state.requirement,
    '',
    '## Task',
    '',
    state.taskFile ?? '(생성되지 않음)',
    '',
    '## 변경 파일 (Git 기준)',
    '',
    list(state.changedFiles.map((change) => `${change.status} ${change.path}`)),
    '',
    '## 검증',
    '',
    list(verifications, '실행하지 않음'),
    '',
    '## Codex 리뷰',
    '',
    list(reviews, '실행하지 않음'),
    '',
    `수정 횟수: ${state.fixAttempts} / ${MAX_FIX_ATTEMPTS}`,
    '',
    '## 단계별 소요 시간',
    '',
    list(formatStageDurations(state.history)),
    '',
    '입력 대기(Human Decision, 수동 검증) 시간은 포함하지 않는다. 같은 단계의 여러 회차는 합산한다.',
    '',
    '## Nice to Have (자동 수정하지 않음)',
    '',
    list(
      state.niceToHave.map(
        (item) => `${item.title} (${item.file}): ${item.detail}`,
      ),
    ),
    '',
    '## 수동 작업 / 확인',
    '',
    list(manual),
    manualNote,
    '',
    '## 기존 결정으로 해소된 항목',
    '',
    list(
      (state.resolvedDecisions ?? []).map(
        (item) => `${item.question} → ${item.resolution} (${item.source})`,
      ),
    ),
    '',
    '## 사람의 결정',
    '',
    list(
      state.answeredDecisions.map(
        (decision) =>
          `${decision.id} ${decision.question} → ${decision.answer}`,
      ),
    ),
    state.pendingDecision
      ? `\n대기 중인 결정: ${state.pendingDecision.file}`
      : '',
    '',
  ].join('\n');
}
