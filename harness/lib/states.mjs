// @ts-check

// 하네스 상태와 상태 전이 규칙. 부수 효과 없는 함수만 둔다.

export const STATUS = Object.freeze({
  TASK_GENERATING: 'TASK_GENERATING',
  WAITING_HUMAN_DECISION: 'WAITING_HUMAN_DECISION',
  IMPLEMENTING: 'IMPLEMENTING',
  VERIFYING: 'VERIFYING',
  REVIEWING: 'REVIEWING',
  FIXING: 'FIXING',
  MANUAL_VALIDATION_REQUIRED: 'MANUAL_VALIDATION_REQUIRED',
  HUMAN_REVIEW_REQUIRED: 'HUMAN_REVIEW_REQUIRED',
  DONE: 'DONE',
  FAILED: 'FAILED',
});

/** @typedef {typeof STATUS[keyof typeof STATUS]} Status */

export const VERDICT = Object.freeze({
  PASS: 'PASS',
  FIX_REQUIRED: 'FIX_REQUIRED',
  HUMAN_DECISION_REQUIRED: 'HUMAN_DECISION_REQUIRED',
  BLOCKED: 'BLOCKED',
});

/** @typedef {typeof VERDICT[keyof typeof VERDICT]} Verdict */

// 검증 실패 수정과 Codex Must Fix 수정이 함께 사용하는 최대 수정 횟수 (D5)
export const MAX_FIX_ATTEMPTS = 3;

/** @type {Readonly<Partial<Record<Status, number>>>} */
export const EXIT_CODES = Object.freeze({
  [STATUS.DONE]: 0,
  [STATUS.FAILED]: 1,
  [STATUS.WAITING_HUMAN_DECISION]: 2,
  [STATUS.MANUAL_VALIDATION_REQUIRED]: 3,
  [STATUS.HUMAN_REVIEW_REQUIRED]: 4,
});

/** @type {Set<Status>} */
const TERMINAL = new Set([
  STATUS.MANUAL_VALIDATION_REQUIRED,
  STATUS.HUMAN_REVIEW_REQUIRED,
  STATUS.DONE,
  STATUS.FAILED,
]);

/** @param {Status} status */
export function isTerminal(status) {
  return TERMINAL.has(status);
}

/**
 * 루프를 멈춰야 하는 상태 (종료 상태 또는 사람의 결정 대기)
 * @param {Status} status
 */
export function isStopped(status) {
  return isTerminal(status) || status === STATUS.WAITING_HUMAN_DECISION;
}

/** @param {Status} status */
export function exitCodeFor(status) {
  return EXIT_CODES[status] ?? 1;
}

/**
 * 수정이 필요할 때, 남은 수정 횟수에 따라 다음 상태를 정한다.
 * @param {number} fixAttempts 지금까지 수행한 수정 횟수
 * @returns {Status}
 */
function fixOrStop(fixAttempts) {
  return fixAttempts < MAX_FIX_ATTEMPTS
    ? STATUS.FIXING
    : STATUS.HUMAN_REVIEW_REQUIRED;
}

/**
 * @param {boolean} passed check / check:full 모두 통과했는지
 * @param {number} fixAttempts
 * @returns {Status}
 */
export function nextAfterVerification(passed, fixAttempts) {
  return passed ? STATUS.REVIEWING : fixOrStop(fixAttempts);
}

/**
 * @param {Verdict} verdict
 * @param {number} fixAttempts
 * @param {boolean} hasManualWork 사람이 직접 해야 할 외부 작업 / 확인이 있는지
 * @returns {Status}
 */
export function nextAfterReview(verdict, fixAttempts, hasManualWork) {
  switch (verdict) {
    case VERDICT.PASS:
      return hasManualWork ? STATUS.MANUAL_VALIDATION_REQUIRED : STATUS.DONE;
    case VERDICT.FIX_REQUIRED:
      return fixOrStop(fixAttempts);
    case VERDICT.HUMAN_DECISION_REQUIRED:
      return STATUS.WAITING_HUMAN_DECISION;
    case VERDICT.BLOCKED:
      return STATUS.FAILED;
    default:
      return STATUS.FAILED;
  }
}

/**
 * 재분류 질문(Must Fix → 수동 검증)에 답한 뒤의 다음 상태 (Task 010 5.3.6)
 * - change: Claude 수정 단계에서 manual-only로 신고한 경우. 다른 결정이나 코드 수정이 필요하면 결정 반영 수정,
 *   모두 수동 검증이면 이번 수정의 코드 변경을 그대로 검증한다.
 * - review: Codex가 수동 검증으로 확정된 항목을 다시 반환한 경우. 남은 코드 Must Fix는 일반 수정(수정 횟수 소비),
 *   남은 것이 없으면 리뷰를 PASS로 보고 수동 검증으로 넘어간다.
 * @param {object} params
 * @param {'change' | 'review'} params.origin
 * @param {boolean} params.hasOtherDecisions 같은 round에 재분류가 아닌 결정이 있는지
 * @param {number} params.codeMustFixCount 코드 수정이 필요한 Must Fix 수
 * @param {number} params.fixAttempts
 * @returns {Status}
 */
export function nextAfterReclassify({
  origin,
  hasOtherDecisions,
  codeMustFixCount,
  fixAttempts,
}) {
  if (origin === 'change') {
    return hasOtherDecisions || codeMustFixCount > 0
      ? STATUS.FIXING
      : STATUS.VERIFYING;
  }
  return codeMustFixCount > 0
    ? fixOrStop(fixAttempts)
    : STATUS.MANUAL_VALIDATION_REQUIRED;
}

/**
 * 수동 검증 결과에 따른 다음 상태 (Task 010 5.4)
 * 모든 항목이 pass이고 리뷰 이후 변경이 없을 때만 DONE. 그 외에는 수동 검증 대기를 유지한다.
 * @param {{ result: string }[]} items
 * @param {boolean} unchangedSinceReview
 * @returns {Status}
 */
export function nextAfterManualValidation(items, unchangedSinceReview) {
  const allPassed =
    items.length > 0 && items.every((item) => item.result === 'pass');
  return allPassed && unchangedSinceReview
    ? STATUS.DONE
    : STATUS.MANUAL_VALIDATION_REQUIRED;
}
