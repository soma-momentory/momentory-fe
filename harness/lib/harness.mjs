// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { CLAUDE_COMMAND, callClaude, claudeEnv } from './claude.mjs';
import { CODEX_COMMAND, callCodex } from './codex.mjs';
import {
  allowsRecommendation,
  askDecisions,
  isAnswered,
  saveDecisionAnswer,
} from './decisionPrompt.mjs';
import {
  getChangedFiles,
  getHead,
  getStatusLines,
  isGitRepo,
  showFileAt,
  snapshotWorkingTree,
} from './git.mjs';
import {
  MANUAL_VALIDATION_FILE,
  MIGRATION_CHECK,
  askManualChecklist,
  buildChecklistItems,
  describeManualItem,
  isPassed,
  mergeCodexManual,
  saveManualResult,
} from './manualValidation.mjs';
import { summarize } from './progress.mjs';
import { renderPrompt } from './prompts.mjs';
import { buildReport, formatDecisionQuestions } from './report.mjs';
import {
  acquireLock,
  activeLockRunId,
  cleanupMarkerPath,
  createCleanupMarker,
  createRunDir,
  describeChildren,
  describeLock,
  markLockCleanupRequired,
  isValidRunId,
  listRunStates,
  readJson,
  releaseLock,
  removeCleanupMarker,
  writeJson,
  writeJsonAtomic,
  writeText,
} from './runStore.mjs';
import { classifyChanges, dependenciesChanged } from './scope.mjs';
import {
  MAX_FIX_ATTEMPTS,
  STATUS,
  VERDICT,
  exitCodeFor,
  isStopped,
  nextAfterManualValidation,
  nextAfterReclassify,
  nextAfterReview,
  nextAfterVerification,
} from './states.mjs';
import { runVerification } from './verify.mjs';

// 하네스 오케스트레이션: Task 생성 → 구현 → 검증 → 리뷰 → 수정 → 재검증 → 재리뷰.
// 외부 프로세스는 모두 deps.runner로 실행한다.

/** @typedef {import('./process.mjs').Runner} Runner */
/** @typedef {import('./states.mjs').Status} Status */
/** @typedef {import('./git.mjs').FileChange} FileChange */
/** @typedef {import('./verify.mjs').VerificationStep} VerificationStep */

/**
 * @typedef {object} DecisionQuestion
 * @property {string} id
 * @property {string} question
 * @property {string} reason
 * @property {{ label: string, pros: string, cons: string }[]} options
 * @property {string} recommendation
 * @property {string} impact
 */

/**
 * @typedef {object} MustFix
 * @property {string} id
 * @property {string} title
 * @property {string} file
 * @property {number | null} line
 * @property {string} problem
 * @property {string} expected
 */

/**
 * 결정 반영 수정의 mustFix: 재분류 질문에서 사람이 "코드 수정 필요"로 답한 Must Fix (Task 010)
 * @typedef {{ kind: 'review', reviewRound: number, mustFix: MustFix[] }
 *   | { kind: 'verify', round: number, failedSteps: VerificationStep[] }
 *   | { kind: 'decision', mustFix?: MustFix[] }} FixReason
 */

/**
 * 재분류 질문(Must Fix → 수동 검증)의 출처와 재개에 필요한 정보 (Task 010 5.3.6)
 * @typedef {object} Reclassify
 * @property {'change' | 'review'} origin change: Claude가 수정 중 manual-only로 신고, review: Codex가 확정 항목을 다시 반환
 * @property {MustFix[]} items 재분류 질문을 한 Must Fix
 * @property {MustFix[]} remaining origin review: 재분류 대상이 아닌 나머지 Must Fix
 * @property {Record<string, string>} reasons Must Fix id별 Claude가 보고한 manual-only 이유
 * @property {number} reviewRound
 */

/**
 * @typedef {object} RunState
 * @property {string} runId
 * @property {Status} status
 * @property {string} requirement
 * @property {string} baseHead
 * @property {string | null} taskFile
 * @property {number} fixAttempts 검증 실패 수정 + Must Fix 수정 횟수 (최대 3)
 * @property {number} fixRound fix-<n>.json 번호 (결정 반영 수정 포함)
 * @property {number} verifyRound
 * @property {number} reviewRound
 * @property {number} decisionRound
 * @property {FixReason | null} fixReason
 * @property {MustFix[]} lastMustFix
 * @property {{ id: string, resolution: string }[]} lastResolutions
 * @property {{ title: string, file: string, detail: string }[]} niceToHave
 * @property {string[]} manualValidation Claude가 반환한 수동 작업 / 확인
 * @property {import('./manualValidation.mjs').CodexManualItem[]} codexManual Codex 리뷰의 수동 검증 항목 (id 기준 병합)
 * @property {import('./manualValidation.mjs').ConfirmedManualItem[]} manualConfirmed 사람이 수동 검증으로 확정한 Must Fix
 * @property {{ file: string, reviewedSnapshot: string | null } | null} manualChecklist 수동 검증 체크리스트와 리뷰 PASS 시점 working tree hash
 * @property {string | null} lastReviewSnapshot 마지막 리뷰 직후 working tree hash
 * @property {{ question: string, resolution: string, source: string }[]} resolvedDecisions Task 생성 시 기존 결정으로 해소한 항목
 * @property {string[]} newMigrations
 * @property {FileChange[]} changedFiles
 * @property {boolean} dependencyDecisionAnswered
 * @property {{ source: string, resumeStep: Status, file: string, reclassify?: Reclassify | null } | null} pendingDecision
 * @property {{ id: string, question: string, answer: string, source: string }[]} answeredDecisions
 * @property {{ round: number, steps: VerificationStep[] }[]} verifications
 * @property {{ round: number, verdict: string, mustFixCount: number, niceToHaveCount: number, file: string, targeted: boolean }[]} reviews
 * @property {{ status: Status, at: string, note: string }[]} history
 * @property {string | null} failureReason
 */

/**
 * @typedef {object} Timeouts
 * @property {number} version
 * @property {number} claudeTask
 * @property {number} claudeImplement
 * @property {number} claudeFix
 * @property {number} codexReview
 * @property {number} check
 * @property {number} checkFull
 */

/**
 * @typedef {object} HarnessDeps
 * @property {string} root 저장소 루트 (Git, 검증, Claude / Codex 작업 디렉터리)
 * @property {string} harnessDir prompts / schemas 위치
 * @property {import('./project.mjs').ProjectSettings} [project] 검증된 프로젝트 설정
 * @property {Runner} runner
 * @property {() => Date} now
 * @property {import('./progress.mjs').Progress} progress 콘솔 출력 (진행 표시 + 메시지)
 * @property {Timeouts} timeouts
 * @property {() => import('./decisionPrompt.mjs').PromptSession} [prompt] TTY에서만 제공. 없으면 --resume은 파일 기반으로 동작한다.
 * @property {(handler: (signal: string) => Promise<number>, options: { allowImmediateExit: () => boolean, onExitBlocked: (signal: string) => void }) => () => void} [onSignal]
 *   SIGINT / SIGTERM 처리기 등록. 해제 함수를 반환한다. allowImmediateExit가 false면 두 번째 신호로 즉시 종료하지 않는다.
 * @property {() => Promise<void>} [retryDelay] cleanup marker 재시도 간격 (기본 5초)
 * @property {import('./runStore.mjs').LockFsOps} [lockFsOps] 파일 시스템 실패 주입 (테스트용)
 * @property {() => import('./process.mjs').ChildSnapshot[]} [snapshotChildren] 지금 실행 중인 자식 프로세스 목록 (D4)
 * @property {(children: import('./process.mjs').ChildSnapshot[]) => Promise<boolean>} [killChildren] 목록의 자식 프로세스 트리 종료. 종료를 확인했으면 true (D4)
 */

/**
 * @typedef {object} Context
 * @property {HarnessDeps} deps
 * @property {string} dir run 디렉터리
 * @property {RunState} state
 * @property {boolean} [halted] 신호로 중단되어 이후 상태 기록을 막는다. (D3)
 * @property {boolean} [finalized]
 * @property {boolean} [awaitingInput] 같은 세션에서 사람의 입력(결정 / 수동 검증)을 기다리는 중 (Task 010)
 * @property {boolean} [resumePending] --resume 직후 첫 입력 대기 처리 전 (non-TTY 파일 기반 재개)
 * @property {boolean} [manualStageShown] [5/5] MANUAL VALIDATION 단계 제목을 이미 출력함
 */

/** @typedef {{ status: Status, runId: string | null, exitCode: number }} RunOutcome */

const MINUTE = 60_000;

/** @type {Timeouts} */
export const DEFAULT_TIMEOUTS = {
  version: MINUTE,
  claudeTask: 15 * MINUTE,
  claudeImplement: 60 * MINUTE,
  claudeFix: 30 * MINUTE,
  codexReview: 30 * MINUTE,
  check: 10 * MINUTE,
  checkFull: 20 * MINUTE,
};

/** @param {HarnessDeps} deps */
function promptDir(deps) {
  return deps.project
    ? path.join(deps.root, deps.project.promptDir)
    : path.join(deps.harnessDir, 'prompts');
}

/** @param {HarnessDeps} deps */
function projectContext(deps) {
  const project = deps.project;
  if (!project) return '';
  return [
    `프로젝트: ${project.projectName}`,
    `진입 문서: ${project.entryDocs.join(', ')}`,
    `참고 문서: ${project.referenceDocs.join(', ') || '탐색 문서에서 선택'}`,
    `탐색 문서: ${project.navigationDoc}`,
    `Task 템플릿: ${project.taskTemplate}`,
    `검증: ${project.verification.map((step) => `${step.command} ${step.args.join(' ')}`).join(' → ')}`,
  ].join('\n');
}

/** @param {HarnessDeps} deps @param {string} name */
function verificationLabel(deps, name) {
  const step = deps.project?.verification.find((item) => item.name === name);
  return step
    ? `${step.command} ${step.args.join(' ')}`.trim()
    : `npm run ${name}`;
}

/** @param {HarnessDeps} deps @param {string} runId */
function resumeHint(deps, runId) {
  return `${deps.project?.runCommand ?? 'npm run harness --'} --resume ${runId}`;
}

const DEPENDENCY_QUESTION_ID = 'DEPENDENCY';

/** @type {DecisionQuestion} */
const DEPENDENCY_QUESTION = {
  id: DEPENDENCY_QUESTION_ID,
  question:
    'Claude가 package 의존성을 변경했습니다. 새 라이브러리 도입을 승인합니까?',
  reason:
    '새 라이브러리 도입은 CLAUDE.md Decision Policy에 따라 사람이 결정한다. (Task 005 D8)',
  options: [
    {
      label: '승인',
      pros: '현재 구현을 유지한다.',
      cons: '의존성이 늘어나고 docs/DECISIONS.md 기록이 필요하다.',
    },
    {
      label: '거부',
      pros: '기존 기술 스택을 유지한다.',
      cons: 'Claude가 의존성 없이 다시 구현해야 한다.',
    },
  ],
  recommendation:
    'package.json / package-lock.json 변경 내용을 확인한 뒤 결정한다.',
  impact:
    'answer에 승인 / 거부와 이유를 적는다. 다음 수정 단계에서 Claude가 결정에 따라 유지하거나 되돌린다.',
};

/** @param {HarnessDeps} deps */
function dependencyQuestion(deps) {
  if (!deps.project) return DEPENDENCY_QUESTION;
  return {
    ...DEPENDENCY_QUESTION,
    question: `의존성 설정(${deps.project.dependencyFiles.join(', ')})이 변경되었습니다. 승인합니까?`,
    reason: '의존성 변경은 프로젝트 담당자의 결정이 필요합니다.',
    recommendation: '변경된 의존성과 잠금 파일을 확인한 뒤 결정합니다.',
  };
}

// 재분류 질문 (Task 010 5.3.6). 하네스는 Must Fix를 스스로 수동 검증으로 내리지 않고, 사람의 선택으로만 옮긴다.
const RECLASSIFY_PREFIX = 'RECLASSIFY-';
const MANUAL_CLASSIFY_LABEL = '수동 검증으로 분류';
const MANUAL_KEEP_LABEL = '수동 검증으로 유지';
const CODE_FIX_LABEL = '코드 수정 필요';

/**
 * @param {MustFix} item
 * @param {'change' | 'review'} origin
 * @param {string} cause 질문이 생긴 이유
 * @returns {DecisionQuestion}
 */
function reclassifyQuestion(item, origin, cause) {
  const location = item.line === null ? item.file : `${item.file}:${item.line}`;
  return {
    id: `${RECLASSIFY_PREFIX}${item.id}`,
    question:
      origin === 'review'
        ? `사람이 수동 검증으로 확정한 ${item.id}를 Codex가 다시 Must Fix로 반환했습니다. 계속 수동 검증으로 유지합니까?`
        : `Must Fix ${item.id}를 코드 수정 대상이 아닌 수동 검증 항목으로 분류합니까?`,
    reason: [
      cause,
      `Must Fix: ${item.title} (${location})`,
      `문제: ${item.problem}`,
      `기대: ${item.expected}`,
    ].join('\n  '),
    options: [
      {
        label: origin === 'review' ? MANUAL_KEEP_LABEL : MANUAL_CLASSIFY_LABEL,
        pros: 'Claude 수정 없이 수동 검증 체크리스트에서 확인한다. 수정 횟수를 쓰지 않는다.',
        cons: '자동 검증으로 보장되지 않는다. 사람이 직접 확인해야 완료된다.',
      },
      {
        label: CODE_FIX_LABEL,
        pros: '저장소 안의 변경으로 문제를 고친다.',
        cons:
          origin === 'review'
            ? '일반 Must Fix로 수정하며 수정 횟수를 1회 쓴다.'
            : 'Claude가 결정 반영 수정으로 다시 고친다. (수정 횟수 미포함)',
      },
    ],
    recommendation: 'Must Fix의 문제와 기대 동작을 확인한 뒤 선택한다.',
    impact:
      origin === 'review'
        ? `${MANUAL_KEEP_LABEL}: 이번 리뷰의 Must Fix에서 빠지고 수동 검증 목록에 남는다. ${CODE_FIX_LABEL}(직접 입력 포함): 일반 Must Fix로 수정한다.`
        : `${MANUAL_CLASSIFY_LABEL}: 수동 검증 체크리스트에 추가되고 이후 리뷰에 확정 항목으로 전달된다. ${CODE_FIX_LABEL}(직접 입력 포함): Claude가 다시 고친다.`,
  };
}

/**
 * 재분류 answer가 수동 검증을 뜻하는지. 선택지 label과 정확히 같을 때만 수동 검증으로 본다.
 * 직접 입력한 문장은 모호해도 downgrade로 이어지지 않게 코드 수정 + 추가 지시로 해석한다.
 * @param {string} answer
 */
export function wantsManualValidation(answer) {
  const text = answer.trim();
  return text === MANUAL_CLASSIFY_LABEL || text === MANUAL_KEEP_LABEL;
}

/**
 * @param {RunState} state
 * @param {MustFix} item
 * @param {string} reason
 */
function confirmManual(state, item, reason) {
  state.manualConfirmed = state.manualConfirmed.filter(
    (saved) => saved.id !== item.id,
  );
  state.manualConfirmed.push({
    id: item.id,
    title: item.title,
    check: item.expected,
    reason,
  });
}

/** @param {string} root @param {import('./project.mjs').ProjectSettings} [project] */
export function getRunsDir(root, project) {
  return path.join(root, project?.runsDir ?? 'harness/runs');
}

/**
 * @param {string} root
 * @param {string} file
 */
function toRepoPath(root, file) {
  return path
    .relative(root, path.resolve(root, file))
    .split(path.sep)
    .join('/');
}

/** @param {string} root */
export function nextTaskNumber(root, taskDir = 'tasks') {
  const numbers = fs
    .readdirSync(path.join(root, taskDir))
    .map((file) => /^(\d{3})-/.exec(file)?.[1])
    .filter((value) => value !== undefined)
    .map(Number);
  return String(Math.max(0, ...numbers) + 1).padStart(3, '0');
}

/** @param {HarnessDeps} deps */
function loadSchemas(deps) {
  /** @param {string} name */
  const load = (name) =>
    JSON.parse(
      fs.readFileSync(path.join(deps.harnessDir, 'schemas', name), 'utf8'),
    );
  return {
    task: load('claude-task.schema.json'),
    implement: load('claude-implement.schema.json'),
  };
}

// ---------------------------------------------------------------------------
// 상태 저장 / 전이

/** @param {Context} ctx */
function saveState(ctx) {
  if (ctx.halted) return;
  writeJson(ctx.dir, 'state.json', ctx.state);
}

/**
 * 진행 표시 단계 제목 (D6). 주 단계는 고정 번호, 수정은 별도 회차로 표시한다.
 * 회차는 전이 시점 기준 다음 회차다.
 * @param {RunState} state
 * @param {Status} status
 */
function stageTitle(state, status) {
  switch (status) {
    case STATUS.TASK_GENERATING:
      return '[1/5] TASK_GENERATING';
    case STATUS.IMPLEMENTING:
      return '[2/5] IMPLEMENTING';
    case STATUS.VERIFYING:
      return `[3/5] VERIFYING (${state.verifyRound + 1}회차)`;
    case STATUS.REVIEWING:
      return `[4/5] REVIEWING (${state.reviewRound + 1}회차${state.lastMustFix.length > 0 ? ', re-review' : ''})`;
    case STATUS.FIXING:
      return !state.fixReason || state.fixReason.kind === 'decision'
        ? '[수정] FIXING (결정 반영, 수정 횟수에 포함하지 않음)'
        : `[수정 ${state.fixAttempts + 1}/${MAX_FIX_ATTEMPTS}] FIXING`;
    default:
      return null;
  }
}

/**
 * @param {Context} ctx
 * @param {Status} status
 * @param {string} [note]
 */
function transition(ctx, status, note = '') {
  if (ctx.halted) return;
  ctx.state.status = status;
  ctx.state.history.push({ status, at: ctx.deps.now().toISOString(), note });
  saveState(ctx);
  const title = stageTitle(ctx.state, status);
  if (title) ctx.deps.progress.stage(title);
}

/**
 * @param {Context} ctx
 * @param {string} reason
 */
function fail(ctx, reason) {
  if (ctx.halted) return;
  ctx.state.failureReason = reason;
  transition(ctx, STATUS.FAILED, reason);
}

/**
 * @param {Context} ctx
 * @param {string} source
 * @param {DecisionQuestion[]} questions
 * @param {Status} resumeStep
 * @param {Reclassify | null} [reclassify]
 */
function waitForDecision(
  ctx,
  source,
  questions,
  resumeStep,
  reclassify = null,
) {
  ctx.state.decisionRound += 1;
  writeJson(ctx.dir, 'decisions.json', {
    runId: ctx.state.runId,
    source,
    instructions: `터미널에서 ${resumeHint(ctx.deps, ctx.state.runId)} 를 실행해 질문에 답하거나, 각 질문의 answer에 결정을 적은 뒤 같은 명령으로 재개하세요.`,
    questions: questions.map((question) => ({ ...question, answer: '' })),
  });
  ctx.state.pendingDecision = {
    source,
    resumeStep,
    file: 'decisions.json',
    reclassify,
  };
  transition(
    ctx,
    STATUS.WAITING_HUMAN_DECISION,
    `${source} 단계에서 결정 필요`,
  );
}

/**
 * @param {Context} ctx
 * @param {string} name
 * @param {Awaited<ReturnType<typeof callClaude>>} result
 */
function saveClaudeResult(ctx, name, result) {
  // stdout / stderr 원문은 로그 파일에만 저장한다. 실패 사유(콘솔 / report)에는 로그 경로만 붙인다. (logRef)
  writeJson(
    ctx.dir,
    `${name}.json`,
    result.ok
      ? { ok: true, sessionId: result.sessionId, output: result.output }
      : { ok: false, error: result.error },
  );
  // 검증 상세(응답의 필드명 등)도 원문에서 나온 값이므로 로그 파일에만 남긴다.
  const detail =
    !result.ok && result.detail
      ? `\n--- harness 검증 ---\n${result.detail}\n`
      : '';
  writeText(
    ctx.dir,
    `${name}.log`,
    `${result.stdout}\n--- stderr ---\n${result.stderr}${detail}`,
  );
}

/**
 * 실패 사유에 붙일 로그 경로. Claude / Codex 원문 출력은 이 파일에만 있다. (Task 007)
 * @param {Context} ctx
 * @param {string} name run 디렉터리 기준 로그 파일 이름
 */
function logRef(ctx, name) {
  return ` · 로그: ${toRepoPath(ctx.deps.root, path.join(ctx.dir, name))}`;
}

/** @param {RunState} state */
function formatAnsweredDecisions(state) {
  if (state.answeredDecisions.length === 0) return '없음';
  return state.answeredDecisions
    .map(
      (decision) =>
        `- ${decision.id} ${decision.question}\n  → ${decision.answer}`,
    )
    .join('\n');
}

// ---------------------------------------------------------------------------
// 범위 검사

/**
 * @param {Context} ctx
 * @param {FileChange[]} changes
 */
async function hasDependencyChange(ctx, changes) {
  const { runner, root } = ctx.deps;
  const dependencyFiles = ctx.deps.project?.dependencyFiles ?? [
    'package.json',
    'package-lock.json',
  ];
  if (
    changes.some(
      (change) =>
        dependencyFiles.includes(change.path) && change.path !== 'package.json',
    )
  )
    return true;
  if (
    !dependencyFiles.includes('package.json') ||
    !changes.some((change) => change.path === 'package.json')
  )
    return false;

  const base = await showFileAt(
    runner,
    root,
    ctx.state.baseHead,
    'package.json',
  );
  const currentPath = path.join(root, 'package.json');
  const current = fs.existsSync(currentPath)
    ? fs.readFileSync(currentPath, 'utf8')
    : null;
  return dependenciesChanged(base, current);
}

/**
 * Claude 변경 직후 하네스가 Git으로 직접 범위를 검사한다.
 * @param {Context} ctx
 * @param {string} label
 * @returns {Promise<{ ok: false } | { ok: true, dependencyChanged: boolean }>}
 */
async function checkScope(ctx, label) {
  const { runner, root } = ctx.deps;
  const { state } = ctx;

  const head = await getHead(runner, root);
  if (head !== state.baseHead) {
    fail(
      ctx,
      `HEAD가 변경되었습니다 (${state.baseHead} → ${head}). 하네스 실행 중 commit은 금지입니다.`,
    );
    return { ok: false };
  }

  const changes = await getChangedFiles(runner, root, state.baseHead);
  state.changedFiles = changes;
  writeText(
    ctx.dir,
    `changed-files-${label}.txt`,
    changes.map((change) => `${change.status} ${change.path}`).join('\n'),
  );

  const { protectedViolations, newMigrations } = classifyChanges(
    changes,
    ctx.deps.project,
  );
  if (protectedViolations.length > 0) {
    fail(
      ctx,
      `보호 경로가 변경되었습니다: ${protectedViolations
        .map((change) => `${change.status} ${change.path}`)
        .join(', ')}`,
    );
    return { ok: false };
  }
  state.newMigrations = newMigrations;

  const dependencyChanged =
    !state.dependencyDecisionAnswered &&
    (await hasDependencyChange(ctx, changes));
  return { ok: true, dependencyChanged };
}

/**
 * Claude가 manual-only로 신고한 Must Fix 중 이번 수정에 실제로 전달된 것만 재분류 대상으로 삼는다. (Task 010 5.3.5)
 * @param {Context} ctx
 * @param {string} label
 * @param {{ id: string, reason: string }[]} manualOnly
 * @param {FixReason | null} reason
 */
function manualOnlyTargets(ctx, label, manualOnly, reason) {
  const passed =
    reason && (reason.kind === 'review' || reason.kind === 'decision')
      ? (reason.mustFix ?? [])
      : [];
  /** @type {MustFix[]} */
  const items = [];
  /** @type {Record<string, string>} */
  const reasons = {};
  for (const entry of manualOnly) {
    const item = passed.find((candidate) => candidate.id === entry.id);
    if (!item) {
      // 전달되지 않은 id는 재분류할 Must Fix가 없으므로 질문하지 않고 로그에만 남긴다.
      fs.appendFileSync(
        path.join(ctx.dir, `${label}.log`),
        `\n--- harness ---\nmanualOnlyMustFix ${entry.id}: 이번 수정에 전달되지 않은 Must Fix라 무시함\n`,
      );
      continue;
    }
    if (items.includes(item)) continue;
    items.push(item);
    reasons[item.id] = entry.reason;
  }
  return { items, reasons };
}

/**
 * 구현 / 수정 결과 처리: 범위 검사 → (결정 필요 시 중지) → 검증
 * @param {Context} ctx
 * @param {string} label
 * @param {{ manualValidation: string[], humanDecisions: DecisionQuestion[], manualOnlyMustFix: { id: string, reason: string }[] }} output
 * @param {FixReason | null} [reason] 수정 단계의 수정 사유 (구현 단계는 null)
 */
async function afterClaudeChange(ctx, label, output, reason = null) {
  const { state } = ctx;
  for (const item of output.manualValidation) {
    if (!state.manualValidation.includes(item))
      state.manualValidation.push(item);
  }

  const scope = await checkScope(ctx, label);
  if (!scope.ok) return;

  const manualOnly = manualOnlyTargets(
    ctx,
    label,
    output.manualOnlyMustFix,
    reason,
  );
  const questions = [
    ...(scope.dependencyChanged ? [dependencyQuestion(ctx.deps)] : []),
    ...output.humanDecisions,
    ...manualOnly.items.map((item) =>
      reclassifyQuestion(
        item,
        'change',
        `Claude: ${manualOnly.reasons[item.id]}`,
      ),
    ),
  ];
  if (questions.length > 0) {
    waitForDecision(
      ctx,
      label,
      questions,
      STATUS.FIXING,
      manualOnly.items.length > 0
        ? {
            origin: 'change',
            items: manualOnly.items,
            remaining: [],
            reasons: manualOnly.reasons,
            reviewRound: state.reviewRound,
          }
        : null,
    );
    return;
  }
  transition(ctx, STATUS.VERIFYING);
}

// ---------------------------------------------------------------------------
// 단계

/** @param {Context} ctx */
async function generateTask(ctx) {
  const { deps, state } = ctx;
  const { runner, root } = deps;
  const taskDir = deps.project?.taskDir ?? 'tasks';
  const prefix = `${taskDir}/${nextTaskNumber(root, taskDir)}-`;

  const prompt = renderPrompt(
    deps.harnessDir,
    'task',
    {
      requirement: state.requirement,
      taskFilePrefix: prefix,
      projectContext: projectContext(deps),
    },
    promptDir(deps),
  );
  const activity = deps.progress.start('Claude Task 작성 중');
  const result = await callClaude({
    runner,
    root,
    prompt,
    schema: loadSchemas(deps).task,
    timeoutMs: deps.timeouts.claudeTask,
    toolConfig: deps.project?.ai.claude,
  });
  if (result.ok) activity.succeed('Task 생성 완료');
  else activity.fail('Task 생성 실패');
  saveClaudeResult(ctx, 'task', result);
  if (!result.ok)
    return fail(
      ctx,
      `Task 생성 실패: ${result.error}${logRef(ctx, 'task.log')}`,
    );

  const taskFile = toRepoPath(root, result.output.taskFile);
  if (
    !taskFile.startsWith(prefix) ||
    !taskFile.endsWith('.md') ||
    !fs.existsSync(path.join(root, taskFile))
  ) {
    return fail(
      ctx,
      // 반환된 경로는 Claude 응답 값이므로 사유에 넣지 않는다. (task.json / task.log에 남음)
      `Task 파일이 올바르지 않습니다 (${prefix}<slug>.md 형식의 실제 파일이어야 함)${logRef(ctx, 'task.json')}`,
    );
  }

  const head = await getHead(runner, root);
  if (head !== state.baseHead) {
    return fail(ctx, `HEAD가 변경되었습니다 (${state.baseHead} → ${head}).`);
  }
  const changes = await getChangedFiles(runner, root, state.baseHead);
  state.changedFiles = changes;
  const unexpected = changes.filter((change) => change.path !== taskFile);
  if (unexpected.length > 0) {
    return fail(
      ctx,
      `Task 생성 단계에서 Task 파일 외 파일이 변경되었습니다: ${unexpected
        .map((change) => change.path)
        .join(', ')}`,
    );
  }

  state.taskFile = taskFile;
  deps.progress.step(`Task 파일: ${taskFile}`);
  // 기존 결정으로 해소한 항목은 묻지 않고 보여주기만 한다. (Task 010 5.2)
  state.resolvedDecisions = result.output.resolvedDecisions;
  if (state.resolvedDecisions.length > 0) {
    deps.progress.step(
      `✓ 기존 결정으로 해소 ${state.resolvedDecisions.length}개`,
    );
    deps.progress.log(
      state.resolvedDecisions
        .map(
          (item) =>
            `  - ${summarize(item.question)} → ${summarize(item.resolution)} (${item.source})`,
        )
        .join('\n'),
    );
  }
  if (result.output.decisionsNeeded.length > 0) {
    return waitForDecision(
      ctx,
      'task',
      result.output.decisionsNeeded,
      STATUS.IMPLEMENTING,
    );
  }
  transition(ctx, STATUS.IMPLEMENTING, taskFile);
}

/** @param {Context} ctx */
async function implement(ctx) {
  const { deps, state } = ctx;
  const prompt = renderPrompt(
    deps.harnessDir,
    'implement',
    {
      requirement: state.requirement,
      taskFile: state.taskFile ?? '',
      decisions: formatAnsweredDecisions(state),
      projectContext: projectContext(deps),
    },
    promptDir(deps),
  );
  const activity = deps.progress.start('Claude 구현 중');
  const result = await callClaude({
    runner: deps.runner,
    root: deps.root,
    prompt,
    schema: loadSchemas(deps).implement,
    timeoutMs: deps.timeouts.claudeImplement,
    toolConfig: deps.project?.ai.claude,
  });
  if (result.ok) activity.succeed('구현 완료');
  else activity.fail('구현 실패');
  saveClaudeResult(ctx, 'implement', result);
  if (!result.ok)
    return fail(
      ctx,
      `구현 실패: ${result.error}${logRef(ctx, 'implement.log')}`,
    );

  await afterClaudeChange(ctx, 'implement', result.output);
}

/**
 * @param {Context} ctx
 * @param {FixReason} reason
 */
function describeFixReason(ctx, reason) {
  const { root } = ctx.deps;
  switch (reason.kind) {
    case 'review':
      return [
        `## Codex Must Fix (리뷰 ${reason.reviewRound}회차)`,
        '',
        '아래 Must Fix만 수정한다. Nice to Have는 수정하지 않는다.',
        '',
        '```json',
        JSON.stringify(reason.mustFix, null, 2),
        '```',
      ].join('\n');
    case 'verify':
      return [
        `## 검증 실패 (${reason.round}회차)`,
        '',
        '하네스가 직접 실행한 검증이 실패했다. 원인을 고쳐 검증이 통과하게 한다.',
        '테스트를 삭제하거나 검증 수준을 낮춰서 통과시키지 않는다.',
        '',
        ...reason.failedSteps.flatMap((step) => {
          const logPath = path.join(ctx.dir, step.logFile);
          const tail = fs.existsSync(logPath)
            ? fs.readFileSync(logPath, 'utf8').split('\n').slice(-80).join('\n')
            : '(로그 없음)';
          return [
            `### ${step.commandText ?? `npm run ${step.script}`} → exit ${step.code}${step.timedOut ? ' (시간 초과)' : ''}`,
            '',
            `전체 로그: ${toRepoPath(root, logPath)}`,
            '',
            '```',
            tail,
            '```',
          ];
        }),
      ].join('\n');
    case 'decision':
      return [
        '## 사람의 결정 반영',
        '',
        '아래 "사람의 결정"에 따라 작업을 이어서 진행한다.',
        ctx.deps.project
          ? `결정 내용은 ${ctx.deps.project.taskTemplate} 형식과 관련 프로젝트 문서에 기록한다.`
          : '결정 내용은 CLAUDE.md 규칙에 따라 Task 문서(11. Decisions Needed)와 필요한 docs에 기록한다.',
        ...(reason.mustFix && reason.mustFix.length > 0
          ? [
              '',
              '### 사람이 코드 수정이 필요하다고 결정한 Must Fix',
              '',
              '아래 Must Fix는 수동 검증 항목이 아니라 저장소 안의 변경으로 고쳐야 한다. "사람의 결정"에 추가 지시가 있으면 함께 반영한다.',
              '',
              '```json',
              JSON.stringify(reason.mustFix, null, 2),
              '```',
            ]
          : []),
      ].join('\n');
  }
}

/**
 * @param {RunState} state
 * @param {FixReason} reason
 */
function describeFixStart(state, reason) {
  switch (reason.kind) {
    case 'review':
      return `${state.fixAttempts}/${MAX_FIX_ATTEMPTS} · Must Fix ${reason.mustFix.length}개`;
    case 'verify':
      return `${state.fixAttempts}/${MAX_FIX_ATTEMPTS} · 검증 실패: ${reason.failedSteps
        .map((step) => step.commandText ?? `npm run ${step.script}`)
        .join(', ')}`;
    case 'decision':
      return '결정 반영';
  }
}

/** @param {Context} ctx */
async function fix(ctx) {
  const { deps, state } = ctx;
  /** @type {FixReason} */
  const reason = state.fixReason ?? { kind: 'decision' };
  if (reason.kind !== 'decision') state.fixAttempts += 1;
  state.fixRound += 1;
  const label = `fix-${state.fixRound}`;
  saveState(ctx);

  const prompt = renderPrompt(
    deps.harnessDir,
    'fix',
    {
      requirement: state.requirement,
      taskFile: state.taskFile ?? '',
      decisions: formatAnsweredDecisions(state),
      fixReason: describeFixReason(ctx, reason),
      attempt:
        reason.kind === 'decision'
          ? '결정 반영 (수정 횟수에 포함하지 않음)'
          : `${state.fixAttempts} / ${MAX_FIX_ATTEMPTS}`,
      projectContext: projectContext(deps),
    },
    promptDir(deps),
  );
  deps.progress.step(`→ Claude 수정 시작 (${describeFixStart(state, reason)})`);
  const activity = deps.progress.start('Claude 수정 중');
  const result = await callClaude({
    runner: deps.runner,
    root: deps.root,
    prompt,
    schema: loadSchemas(deps).implement,
    timeoutMs: deps.timeouts.claudeFix,
    toolConfig: deps.project?.ai.claude,
  });
  if (result.ok) activity.succeed('수정 완료');
  else activity.fail('수정 실패');
  saveClaudeResult(ctx, label, result);
  if (!result.ok)
    return fail(
      ctx,
      `수정 실패: ${result.error}${logRef(ctx, `${label}.log`)}`,
    );

  state.fixReason = null;
  state.lastResolutions = result.output.resolvedMustFix;
  await afterClaudeChange(ctx, label, result.output, reason);
}

/** @param {Context} ctx */
async function verify(ctx) {
  const { deps, state } = ctx;
  state.verifyRound += 1;
  const round = state.verifyRound;

  const result = await runVerification({
    runner: deps.runner,
    root: deps.root,
    round,
    timeouts: {
      check: deps.timeouts.check,
      checkFull: deps.timeouts.checkFull,
    },
    plan: deps.project?.verification.map((step, index) => ({
      script: step.name,
      command: step.command,
      args: step.args,
      timeoutMs:
        step.timeoutMs ??
        (index === 0 ? deps.timeouts.check : deps.timeouts.checkFull),
    })),
    writeLog: (name, content) => writeText(ctx.dir, name, content),
    onStep: (script) => {
      deps.progress.step(`▶ ${verificationLabel(deps, script)}`);
      const activity = deps.progress.start(
        `${verificationLabel(deps, script)} 실행 중`,
      );
      return (step) => {
        if (step.code === 0 && !step.timedOut) return activity.succeed('PASS');
        const logPath = toRepoPath(deps.root, path.join(ctx.dir, step.logFile));
        const reason = step.timedOut ? '시간 초과' : `exit ${step.code}`;
        activity.fail(`FAIL (${reason}) → ${logPath}`);
      };
    },
  });
  state.verifications.push({ round, steps: result.steps });

  const next = nextAfterVerification(result.passed, state.fixAttempts);
  if (next === STATUS.FIXING) {
    state.fixReason = {
      kind: 'verify',
      round,
      failedSteps: result.steps.filter(
        (step) => step.code !== 0 || step.timedOut,
      ),
    };
    return transition(ctx, next, '검증 실패 → 수정');
  }
  if (next === STATUS.HUMAN_REVIEW_REQUIRED) {
    state.failureReason = `수정 ${MAX_FIX_ATTEMPTS}회 후에도 검증이 실패했습니다.`;
    return transition(ctx, next, state.failureReason);
  }
  transition(ctx, next, '검증 통과');
}

/**
 * @param {Context} ctx
 * @param {FileChange[]} changes
 */
function reviewPromptVars(ctx, changes) {
  const { state } = ctx;
  const lastVerification = state.verifications.at(-1);
  return {
    requirement: state.requirement,
    taskFile: state.taskFile ?? '',
    baseHead: state.baseHead,
    changedFiles: changes
      .map((change) => `- ${change.status} ${change.path}`)
      .join('\n'),
    verification: (lastVerification?.steps ?? [])
      .map(
        (step) =>
          `- ${step.commandText ?? `npm run ${step.script}`} → exit ${step.code} (${toRepoPath(ctx.deps.root, path.join(ctx.dir, step.logFile))})`,
      )
      .join('\n'),
    decisions: formatAnsweredDecisions(state),
    previousMustFix: JSON.stringify(state.lastMustFix, null, 2),
    resolutions: JSON.stringify(state.lastResolutions, null, 2),
    manualConfirmed: formatManualConfirmed(state),
    manualList: formatManualList(state, ctx.deps.project?.migrationCheck),
  };
}

/** @param {RunState} state */
function formatManualConfirmed(state) {
  if (state.manualConfirmed.length === 0) return '없음';
  return state.manualConfirmed
    .map((item) => `- ${item.id} ${item.title}\n  확인: ${item.check}`)
    .join('\n');
}

/** @param {RunState} state */
function formatManualList(state, migrationCheck = MIGRATION_CHECK) {
  const items = [
    ...state.manualValidation.map((text) => `- (Claude) ${text}`),
    ...state.newMigrations.map(
      (file) => `- (migration) ${file}: ${migrationCheck}`,
    ),
    ...state.codexManual.map(
      (item) => `- (Codex ${item.id}) ${item.title}: ${item.check}`,
    ),
  ];
  return items.length > 0 ? items.join('\n') : '없음';
}

/** @param {RunState} state */
function hasManualWork(state) {
  return (
    state.manualValidation.length > 0 ||
    state.newMigrations.length > 0 ||
    state.codexManual.length > 0 ||
    state.manualConfirmed.length > 0
  );
}

/**
 * 수동 검증 체크리스트를 만들고 MANUAL_VALIDATION_REQUIRED로 전이한다. (Task 010 5.4)
 * @param {Context} ctx
 * @param {string} note
 */
function enterManualValidation(ctx, note) {
  if (ctx.halted) return;
  const { state, dir } = ctx;
  writeChecklist(ctx, state.lastReviewSnapshot);
  transition(ctx, STATUS.MANUAL_VALIDATION_REQUIRED, note);
  const { items } = readJson(dir, MANUAL_VALIDATION_FILE);
  ctx.deps.progress.step(`⚠ 수동 검증 ${items.length}개`);
}

/**
 * @param {Context} ctx
 * @param {string | null} reviewedSnapshot
 */
function writeChecklist(ctx, reviewedSnapshot) {
  const { state, dir } = ctx;
  writeJsonAtomic(dir, MANUAL_VALIDATION_FILE, {
    runId: state.runId,
    instructions: `터미널에서 ${resumeHint(ctx.deps, state.runId)} 를 실행해 확인 결과를 입력하거나, 각 항목의 result에 pass / fail을 적은 뒤 같은 명령으로 재개하세요. 하네스는 ${ctx.deps.project ? '외부 적용' : 'migration 적용'}이나 SQL 실행을 하지 않습니다.`,
    items: buildChecklistItems({
      claude: state.manualValidation,
      migrations: state.newMigrations,
      migrationCheck: ctx.deps.project?.migrationCheck,
      codex: state.codexManual,
      confirmed: state.manualConfirmed,
    }),
  });
  state.manualChecklist = { file: MANUAL_VALIDATION_FILE, reviewedSnapshot };
}

/**
 * @param {import('./progress.mjs').Activity} activity
 * @param {{ verdict: string, mustFix: unknown[], humanDecisions: unknown[], manualValidation: unknown[] }} output
 */
function reportVerdict(activity, output) {
  const manual =
    output.manualValidation.length > 0
      ? ` · 수동 검증 ${output.manualValidation.length}개`
      : '';
  switch (output.verdict) {
    case VERDICT.PASS:
      return activity.succeed(`PASS${manual}`);
    case VERDICT.FIX_REQUIRED:
      return activity.warn(
        `FIX_REQUIRED · Must Fix ${output.mustFix.length}개${manual}`,
      );
    case VERDICT.HUMAN_DECISION_REQUIRED:
      return activity.warn(
        `HUMAN_DECISION_REQUIRED · 결정 ${output.humanDecisions.length}개`,
      );
    default:
      return activity.fail(output.verdict);
  }
}

/** @param {Context} ctx */
async function review(ctx) {
  const { deps, state } = ctx;
  const { runner, root } = deps;
  state.reviewRound += 1;
  const round = state.reviewRound;
  const targeted = state.lastMustFix.length > 0;

  const changes = await getChangedFiles(runner, root, state.baseHead);
  state.changedFiles = changes;
  const prompt = renderPrompt(
    deps.harnessDir,
    targeted ? 're-review' : 'review',
    { ...reviewPromptVars(ctx, changes), projectContext: projectContext(deps) },
    promptDir(deps),
  );

  const before = await snapshotWorkingTree(runner, root, state.baseHead);
  const activity = deps.progress.start(
    targeted ? 'Codex 재리뷰 중' : 'Codex 리뷰 중',
  );
  const result = await callCodex({
    runner,
    root,
    prompt,
    schemaPath: path.join(
      deps.harnessDir,
      'schemas',
      'codex-review.schema.json',
    ),
    outputPath: path.join(ctx.dir, `review-${round}.json`),
    timeoutMs: deps.timeouts.codexReview,
    command: deps.project?.ai.codex.command,
  });
  if (result.ok) reportVerdict(activity, result.review);
  else activity.fail('Codex 리뷰 실패');
  writeText(ctx.dir, `review-${round}.log`, result.log);
  const after = await snapshotWorkingTree(runner, root, state.baseHead);

  if (before !== after) {
    return fail(
      ctx,
      'Codex 리뷰 중 working tree가 변경되었습니다. Codex는 파일을 수정할 수 없어야 합니다.',
    );
  }
  if (!result.ok) {
    return fail(
      ctx,
      `Codex 리뷰 실패: ${result.error}${logRef(ctx, `review-${round}.log`)}`,
    );
  }

  const { review: output } = result;
  state.reviews.push({
    round,
    verdict: output.verdict,
    mustFixCount: output.mustFix.length,
    niceToHaveCount: output.niceToHave.length,
    file: `review-${round}.json`,
    targeted,
  });
  // Nice to Have는 자동 수정하지 않으므로 회차별 제안을 모두 최종 보고에 남긴다.
  for (const item of output.niceToHave) {
    const exists = state.niceToHave.some(
      (saved) => saved.title === item.title && saved.file === item.file,
    );
    if (!exists) state.niceToHave.push(item);
  }
  // 수동 검증 항목은 verdict와 상관없이 병합한다. Claude에 수정 요청하지 않는다. (Task 010 5.3.3)
  state.codexManual = mergeCodexManual(
    state.codexManual,
    output.manualValidation,
  );
  state.lastReviewSnapshot = after;
  state.lastMustFix = output.mustFix;

  // 사람이 수동 검증으로 확정한 id가 다시 Must Fix로 오면, 수정 횟수를 쓰기 전에 사람에게 다시 확인한다. (D1)
  // 같은 id라는 이유만으로 하네스가 수동 검증으로 내리지 않는다.
  /** @type {MustFix[]} */
  const mustFixItems = output.mustFix;
  const confirmedIds = new Set(state.manualConfirmed.map((item) => item.id));
  const reraised =
    output.verdict === VERDICT.FIX_REQUIRED
      ? mustFixItems.filter((item) => confirmedIds.has(item.id))
      : [];
  if (reraised.length > 0) {
    deps.progress.step(
      `⚠ 수동 검증 확정 항목 재반환 · ${reraised.map((item) => item.id).join(', ')} (수정 횟수 미소비, 사람 확인 필요)`,
    );
    return waitForDecision(
      ctx,
      'review',
      reraised.map((item) =>
        reclassifyQuestion(
          item,
          'review',
          `Codex가 리뷰 ${round}회차에서 같은 id를 다시 Must Fix로 반환함`,
        ),
      ),
      STATUS.FIXING,
      {
        origin: 'review',
        items: reraised,
        remaining: mustFixItems.filter((item) => !confirmedIds.has(item.id)),
        reasons: {},
        reviewRound: round,
      },
    );
  }

  const next = nextAfterReview(
    output.verdict,
    state.fixAttempts,
    hasManualWork(state),
  );

  switch (next) {
    case STATUS.FIXING:
      state.fixReason = {
        kind: 'review',
        reviewRound: round,
        mustFix: output.mustFix,
      };
      return transition(ctx, next, `Must Fix ${output.mustFix.length}건`);
    case STATUS.WAITING_HUMAN_DECISION:
      return waitForDecision(
        ctx,
        'review',
        output.humanDecisions,
        STATUS.FIXING,
      );
    case STATUS.FAILED:
      return fail(ctx, `Codex BLOCKED: ${output.blockedReason}`);
    case STATUS.HUMAN_REVIEW_REQUIRED:
      state.failureReason = `수정 ${MAX_FIX_ATTEMPTS}회 후에도 Must Fix가 남아 있습니다.`;
      return transition(ctx, next, state.failureReason);
    case STATUS.MANUAL_VALIDATION_REQUIRED:
      return enterManualValidation(ctx, `Codex ${output.verdict}`);
    default:
      return transition(ctx, next, `Codex ${output.verdict}`);
  }
}

/** @type {Partial<Record<Status, (ctx: Context) => Promise<void>>>} */
const STEPS = {
  [STATUS.TASK_GENERATING]: generateTask,
  [STATUS.IMPLEMENTING]: implement,
  [STATUS.VERIFYING]: verify,
  [STATUS.REVIEWING]: review,
  [STATUS.FIXING]: fix,
};

// ---------------------------------------------------------------------------
// 실행 루프

/** @param {Status} status */
function statusSymbol(status) {
  if (status === STATUS.DONE) return '✓';
  if (status === STATUS.FAILED) return '✗';
  return '⚠';
}

/** @param {RunState} state */
function outcomeOf(state) {
  return {
    status: state.status,
    runId: state.runId,
    exitCode: exitCodeFor(state.status),
  };
}

/**
 * 수동 검증 체크리스트 항목. 체크리스트가 없으면 null.
 * @param {Context} ctx
 * @returns {import('./manualValidation.mjs').ManualItem[] | null}
 */
function readChecklistItems(ctx) {
  const checklist = ctx.state.manualChecklist;
  if (!checklist || !fs.existsSync(path.join(ctx.dir, checklist.file))) {
    return null;
  }
  return readJson(ctx.dir, checklist.file).items;
}

/** @param {Context} ctx */
function writeReport(ctx) {
  writeText(
    ctx.dir,
    'report.md',
    buildReport(ctx.state, {
      manualItems: readChecklistItems(ctx),
      migrationCheck: ctx.deps.project?.migrationCheck,
    }),
  );
}

/** @param {Context} ctx */
function finalize(ctx) {
  const { state, deps, dir } = ctx;
  const { progress } = deps;
  ctx.finalized = true;
  writeReport(ctx);
  const reportPath = toRepoPath(deps.root, path.join(dir, 'report.md'));

  // 같은 세션 수동 검증을 했으면 같은 [5/5] 아래에 이어서 쓴다. (Task 010 5.6)
  if (!ctx.manualStageShown) progress.stage('[5/5] 최종 보고');
  progress.step(`${statusSymbol(state.status)} 최종 상태: ${state.status}`);
  if (state.failureReason) progress.log(`사유: ${state.failureReason}`);

  if (state.status === STATUS.WAITING_HUMAN_DECISION && state.pendingDecision) {
    const decisionsPath = toRepoPath(
      deps.root,
      path.join(dir, state.pendingDecision.file),
    );
    // 터미널에서는 질문을 이미 보여줬으므로 재개 방법만 안내한다.
    if (!deps.prompt) {
      const decisions = readJson(dir, state.pendingDecision.file);
      progress.log('');
      progress.log('사람의 결정이 필요합니다.');
      progress.log('');
      progress.log(formatDecisionQuestions(decisions.questions));
      progress.log('');
    }
    progress.log(`재개: ${resumeHint(deps, state.runId)}`);
    progress.log(
      `- 터미널에서 재개하면 질문에 바로 답할 수 있습니다. (${decisionsPath}의 각 answer를 직접 채운 뒤 재개해도 됩니다)`,
    );
  }
  if (state.status === STATUS.MANUAL_VALIDATION_REQUIRED) {
    const items = readChecklistItems(ctx);
    if (items) {
      const remaining = items.filter((item) => !isPassed(item));
      progress.log('사람이 직접 확인해야 할 항목이 있습니다.');
      if (!ctx.manualStageShown) {
        progress.log(
          remaining.map((item) => `- ${describeManualItem(item)}`).join('\n'),
        );
      }
      progress.log(
        `수동 검증 체크리스트: ${toRepoPath(deps.root, path.join(dir, MANUAL_VALIDATION_FILE))} (남은 항목 ${remaining.length}개)`,
      );
      progress.log(`재개: ${resumeHint(deps, state.runId)}`);
      progress.log(
        '- 터미널에서 재개하면 체크리스트에 바로 답할 수 있습니다. (각 항목의 result에 pass / fail을 직접 적은 뒤 재개해도 됩니다)',
      );
    } else {
      progress.log('사람이 직접 해야 할 작업이 있습니다. 보고서를 확인하세요.');
    }
  }
  progress.log(`보고서: ${reportPath}`);
}

/**
 * 신호로 중단: FAILED + 사유 기록, report 작성, 이후 상태 기록 차단 (D3)
 * 진행 중이던 단계가 자식 프로세스 종료 후 돌아와도 state.json과 report를 덮어쓰지 않는다.
 * @param {Context} ctx
 * @param {string} signal
 */
function interrupt(ctx, signal) {
  ctx.deps.progress.stop();
  if (!ctx.halted && !isStopped(ctx.state.status)) {
    fail(ctx, `사용자 중단 (${signal})`);
  }
  ctx.halted = true;
  if (!ctx.finalized) finalize(ctx);
}

/**
 * 입력 대기 중 신호로 중단: 대기 상태(결정 / 수동 검증)와 입력한 결과를 그대로 두고 report만 남긴다. (Task 010 5.8)
 * @param {Context} ctx
 * @param {string} signal
 */
function interruptInput(ctx, signal) {
  const { deps, state } = ctx;
  deps.progress.stop();
  ctx.halted = true;
  if (!ctx.finalized) {
    ctx.finalized = true;
    writeReport(ctx);
  }
  deps.progress.log(
    `\n중단 (${signal}). 입력한 내용은 저장되었습니다. 재개: ${resumeHint(ctx.deps, state.runId)}`,
  );
}

/**
 * 결정 대기 상태의 미답변 질문을 같은 세션에서 묻는다. (Task 010 5.1)
 * @param {Context} ctx
 * @param {() => import('./decisionPrompt.mjs').PromptSession} openPrompt
 * @returns {Promise<boolean>} 모든 질문에 답했으면 true
 */
async function answerInSession(ctx, openPrompt) {
  const { deps, dir, state } = ctx;
  const pending = /** @type {NonNullable<RunState['pendingDecision']>} */ (
    state.pendingDecision
  );
  /** @type {{ questions: import('./decisionPrompt.mjs').StoredQuestion[] }} */
  const decisions = readJson(dir, pending.file);
  const unanswered = decisions.questions.filter(
    (question) => !isAnswered(question),
  );
  if (unanswered.length === 0) return true;

  deps.progress.stop();
  deps.progress.step(
    `⚠ Human Decision ${unanswered.length}개${state.taskFile ? ` (상세: ${state.taskFile})` : ''}`,
  );
  ctx.awaitingInput = true;
  /** @type {Awaited<ReturnType<typeof askUnanswered>>} */
  let result;
  try {
    result = await askUnanswered(
      ctx,
      openPrompt,
      pending.file,
      decisions.questions,
    );
  } finally {
    ctx.awaitingInput = false;
  }
  if (ctx.halted) return false;
  if (!result.completed) {
    const remaining = readJson(dir, pending.file).questions.filter(
      (/** @type {{ answer?: unknown }} */ question) => !isAnswered(question),
    ).length;
    deps.progress.log(
      `\n${result.reason === 'quit' ? '중단했습니다' : '입력이 중단되었습니다'}. 입력한 결정은 저장되었습니다. (남은 질문 ${remaining}개: ${toRepoPath(deps.root, path.join(dir, pending.file))})`,
    );
    return false;
  }
  deps.progress.step(`✓ 결정 완료 (${unanswered.length}개)`);
  return true;
}

/**
 * 답이 모두 채워진 결정을 반영하고 다음 단계로 전이한다. (--resume / 같은 세션 공통)
 * @param {Context} ctx
 * @returns {Promise<boolean>} 실행 루프를 계속하면 true
 */
async function applyDecisions(ctx) {
  const { deps, dir, state } = ctx;
  const pending = /** @type {NonNullable<RunState['pendingDecision']>} */ (
    state.pendingDecision
  );
  const decisionsPath = toRepoPath(deps.root, path.join(dir, pending.file));

  // 다음 단계로 넘어가기 직전 전체 결정을 다시 검증한다. (파일 직접 수정 포함, trim 후 빈 answer는 미답변)
  /** @type {{ questions: (DecisionQuestion & { answer: string })[] }} */
  const answered = readJson(dir, pending.file);
  const missing = answered.questions.filter(
    (question) => !isAnswered(question),
  );
  if (missing.length > 0) {
    deps.progress.log(
      `\n아직 답하지 않은 결정이 있습니다 (${decisionsPath}): ${missing
        .map((question) => question.id)
        .join(', ')}`,
    );
    deps.progress.log(
      `answer를 채운 뒤 다시 재개하세요: ${resumeHint(ctx.deps, state.runId)}`,
    );
    return false;
  }

  // 입력을 기다리는 동안 commit하면 결정을 반영하지 않는다. (answer는 보존)
  const head = await getHead(deps.runner, deps.root);
  if (head !== state.baseHead) {
    deps.progress.log(
      `\nHEAD가 시작 시점과 다릅니다 (${state.baseHead} → ${head}). 결정은 저장했지만 진행하지 않습니다. 결정 대기 중에는 commit하지 마세요.`,
    );
    return false;
  }

  for (const question of answered.questions) {
    state.answeredDecisions.push({
      id: question.id,
      question: question.question,
      answer: question.answer.trim(),
      source: pending.source,
    });
    if (question.id === DEPENDENCY_QUESTION_ID) {
      state.dependencyDecisionAnswered = true;
    }
  }
  fs.renameSync(
    path.join(dir, pending.file),
    path.join(dir, `decisions-answered-${state.decisionRound}.json`),
  );
  state.pendingDecision = null;

  const reclassify = pending.reclassify ?? null;
  if (!reclassify) {
    if (pending.resumeStep === STATUS.FIXING) {
      state.fixReason = { kind: 'decision' };
    }
    transition(ctx, pending.resumeStep, '사람의 결정 반영');
    return true;
  }
  return applyReclassify(ctx, reclassify, answered.questions);
}

/**
 * 재분류 답변 반영 (Task 010 5.3.6). 수동 검증은 사람이 선택지를 고른 경우에만 한다.
 * @param {Context} ctx
 * @param {Reclassify} reclassify
 * @param {(DecisionQuestion & { answer: string })[]} questions
 */
async function applyReclassify(ctx, reclassify, questions) {
  const { deps, state } = ctx;
  /** @param {MustFix} item */
  const answerOf = (item) =>
    questions.find(
      (question) => question.id === `${RECLASSIFY_PREFIX}${item.id}`,
    )?.answer ?? '';
  const manual = reclassify.items.filter((item) =>
    wantsManualValidation(answerOf(item)),
  );
  const code = reclassify.items.filter((item) => !manual.includes(item));

  for (const item of manual) {
    confirmManual(
      state,
      item,
      reclassify.reasons[item.id] ??
        state.manualConfirmed.find((saved) => saved.id === item.id)?.reason ??
        '사람이 수동 검증으로 분류',
    );
  }
  // 코드 수정이 필요하다고 답한 항목은 더 이상 수동 검증 확정 항목이 아니다.
  state.manualConfirmed = state.manualConfirmed.filter(
    (saved) => !code.some((item) => item.id === saved.id),
  );
  deps.progress.step(
    `✓ 재분류: 수동 검증 ${manual.length}개 · 코드 수정 ${code.length}개`,
  );

  const codeMustFix =
    reclassify.origin === 'review' ? [...reclassify.remaining, ...code] : code;
  const next = nextAfterReclassify({
    origin: reclassify.origin,
    hasOtherDecisions: questions.some(
      (question) => !question.id.startsWith(RECLASSIFY_PREFIX),
    ),
    codeMustFixCount: codeMustFix.length,
    fixAttempts: state.fixAttempts,
  });

  switch (next) {
    case STATUS.FIXING:
      if (reclassify.origin === 'change') {
        // 결정 반영 수정: 수정 횟수에 포함하지 않는다.
        state.fixReason = { kind: 'decision', mustFix: code };
      } else {
        // Codex Must Fix를 사람이 코드 수정으로 확인: 일반 수정 (수정 횟수 소비)
        state.lastMustFix = codeMustFix;
        state.fixReason = {
          kind: 'review',
          reviewRound: reclassify.reviewRound,
          mustFix: codeMustFix,
        };
      }
      transition(ctx, next, '사람의 결정 반영');
      return true;
    case STATUS.HUMAN_REVIEW_REQUIRED:
      state.failureReason = `수정 ${MAX_FIX_ATTEMPTS}회 후에도 Must Fix가 남아 있습니다.`;
      transition(ctx, next, state.failureReason);
      return false;
    case STATUS.MANUAL_VALIDATION_REQUIRED:
      state.lastMustFix = [];
      enterManualValidation(ctx, '재분류: 수동 검증 유지');
      return true;
    default:
      transition(ctx, next, '재분류: 수동 검증으로 분류');
      return true;
  }
}

/**
 * v1.1에서 만든 수동 검증 대기 run처럼 체크리스트가 없으면 state.json으로 만든다.
 * 리뷰 시점 working tree 기록이 없으므로 DONE 전 확인은 HEAD만 비교한다.
 * @param {Context} ctx
 */
function ensureChecklist(ctx) {
  if (readChecklistItems(ctx)) return;
  writeChecklist(ctx, ctx.state.manualChecklist?.reviewedSnapshot ?? null);
  saveState(ctx);
}

/**
 * 리뷰 PASS 이후 HEAD와 working tree가 바뀌지 않았는지 (Task 010 5.4.4)
 * @param {Context} ctx
 */
async function unchangedSinceReview(ctx) {
  const { deps, state } = ctx;
  const head = await getHead(deps.runner, deps.root);
  if (head !== state.baseHead) return false;
  const reviewed = state.manualChecklist?.reviewedSnapshot ?? null;
  if (reviewed === null) return true;
  return (
    (await snapshotWorkingTree(deps.runner, deps.root, state.baseHead)) ===
    reviewed
  );
}

/**
 * 체크리스트 결과로 DONE 여부를 정한다. 실패 / 미확인 항목이 있거나 리뷰 이후 변경이 있으면 대기를 유지한다.
 * @param {Context} ctx
 * @param {{ listPending?: boolean }} [options] 남은 항목 목록을 출력할지 (non-TTY 재개)
 */
async function completeManualValidation(ctx, { listPending = false } = {}) {
  const { deps } = ctx;
  const items = readChecklistItems(ctx) ?? [];
  if (items.length === 0) {
    deps.progress.log(
      '수동 검증 항목이 없습니다. run 기록(state.json)을 확인하세요.',
    );
    return;
  }
  const failed = items.filter((item) => item.result === 'fail');
  const remaining = items.filter((item) => !isPassed(item));
  if (failed.length > 0) {
    deps.progress.step(
      `✗ 수동 검증 실패 ${failed.length}개 · DONE으로 기록하지 않습니다.`,
    );
    deps.progress.log(
      failed.map((item) => `- ${describeManualItem(item)}`).join('\n'),
    );
  }
  if (remaining.length > 0) {
    if (listPending && failed.length < remaining.length) {
      deps.progress.log('아직 확인하지 않은 수동 검증 항목이 있습니다:');
      deps.progress.log(
        remaining
          .filter((item) => item.result !== 'fail')
          .map((item) => `- ${describeManualItem(item)}`)
          .join('\n'),
      );
    }
    return;
  }

  const next = nextAfterManualValidation(
    items,
    await unchangedSinceReview(ctx),
  );
  if (next !== STATUS.DONE) {
    deps.progress.step(
      '⚠ 리뷰 이후 HEAD 또는 working tree가 바뀌어 DONE으로 기록하지 않습니다. 리뷰되지 않은 변경을 확인하세요.',
    );
    return;
  }
  deps.progress.step(`✓ 수동 검증 완료 (${items.length}/${items.length} 통과)`);
  transition(ctx, STATUS.DONE, '수동 검증 완료');
}

/**
 * 수동 검증 체크리스트를 같은 세션에서 묻는다. (Task 010 5.4)
 * @param {Context} ctx
 * @param {() => import('./decisionPrompt.mjs').PromptSession} openPrompt
 */
async function validateInSession(ctx, openPrompt) {
  const { deps, dir } = ctx;
  ensureChecklist(ctx);
  const items = readChecklistItems(ctx) ?? [];
  const pending = items.filter((item) => !isPassed(item));
  const checklistPath = toRepoPath(
    deps.root,
    path.join(dir, MANUAL_VALIDATION_FILE),
  );

  deps.progress.stop();
  deps.progress.stage('[5/5] MANUAL VALIDATION');
  ctx.manualStageShown = true;
  deps.progress.log(
    [
      `수동 검증 ${items.length}개 (남은 항목 ${pending.length}개) · 결과는 ${checklistPath}에 저장됩니다.`,
      '하네스는 migration 적용이나 SQL 실행을 하지 않습니다. 직접 수행한 결과를 기록하세요.',
      '입력: y = 통과 / n = 실패 / q = 중단',
    ].join('\n'),
  );

  if (pending.length > 0) {
    ctx.awaitingInput = true;
    const session = openPrompt();
    /** @type {Awaited<ReturnType<typeof askManualChecklist>>} */
    let result;
    try {
      result = await askManualChecklist({
        items,
        ask: (prompt) => session.ask(prompt),
        print: (text) => deps.progress.log(text),
        save: (index, value) =>
          saveManualResult(dir, index, {
            ...value,
            checkedAt: deps.now().toISOString(),
          }),
      });
    } finally {
      session.close();
      ctx.awaitingInput = false;
    }
    if (ctx.halted) return;
    if (!result.completed) {
      const remaining = (readChecklistItems(ctx) ?? []).filter(
        (item) => !isPassed(item),
      ).length;
      deps.progress.log(
        `\n${result.reason === 'quit' ? '중단했습니다' : '입력이 중단되었습니다'}. 입력한 결과는 저장되었습니다. (남은 항목 ${remaining}개: ${checklistPath})`,
      );
      return;
    }
  }
  await completeManualValidation(ctx);
}

/**
 * 실행 루프가 멈춘 입력 대기 상태를 처리한다. (Task 010)
 * - 결정 대기: 터미널이면 같은 세션에서 묻고 반영한다. non-TTY는 --resume 직후 파일 기반으로만 반영한다.
 * - 수동 검증 대기: 터미널이면 체크리스트, non-TTY는 --resume 직후 파일 결과로만 판정한다.
 * @param {Context} ctx
 * @returns {Promise<boolean>} 실행 루프를 계속하면 true
 */
async function settle(ctx) {
  const { deps, state } = ctx;
  const resuming = ctx.resumePending === true;
  ctx.resumePending = false;

  if (state.status === STATUS.WAITING_HUMAN_DECISION && state.pendingDecision) {
    if (deps.prompt) {
      if (!(await answerInSession(ctx, deps.prompt))) return false;
    } else if (!resuming) {
      return false;
    }
    return applyDecisions(ctx);
  }
  if (state.status === STATUS.MANUAL_VALIDATION_REQUIRED) {
    if (deps.prompt) {
      await validateInSession(ctx, deps.prompt);
    } else if (resuming) {
      ensureChecklist(ctx);
      await completeManualValidation(ctx, { listPending: true });
    }
  }
  return false;
}

/**
 * @param {Context} ctx
 * @returns {Promise<RunOutcome>}
 */
async function runLoop(ctx) {
  for (;;) {
    while (!ctx.halted && !isStopped(ctx.state.status)) {
      const step = STEPS[ctx.state.status];
      if (!step) {
        fail(ctx, `처리할 수 없는 상태입니다: ${ctx.state.status}`);
        break;
      }
      try {
        await step(ctx);
      } catch (error) {
        ctx.deps.progress.stop();
        fail(
          ctx,
          `예상하지 않은 오류: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    if (ctx.halted) break;

    // 입력 대기 상태(결정 / 수동 검증)는 같은 세션에서 처리하고, 진행할 수 있으면 루프를 계속한다.
    let proceed = false;
    try {
      proceed = await settle(ctx);
    } catch (error) {
      ctx.awaitingInput = false;
      ctx.deps.progress.stop();
      fail(
        ctx,
        `예상하지 않은 오류: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!proceed) break;
  }
  if (!ctx.finalized) finalize(ctx);
  return outcomeOf(ctx.state);
}

/**
 * 예외를 던지지 않는 기록. 실패하면 false.
 * @param {() => boolean} write
 */
function tryRecord(write) {
  try {
    return write();
  } catch {
    return false;
  }
}

/**
 * 현재 실행이 소유한 lock과 cleanup marker의 책임을 한 곳에 모은다.
 * - 신호 정리가 시작되면 일반 종료(finally)는 lock을 해제하지 않는다.
 * - lock / marker 해제는 신호 정리가 하위 프로세스 종료를 확인한 경우에만, 한 번만, 현재 run의 것만 한다.
 * @param {string} runsDir
 * @param {string} runId
 * @param {import('./runStore.mjs').LockFsOps} [fsOps] 실패 주입용
 */
function createLockGuard(runsDir, runId, fsOps = {}) {
  let signalled = false;
  let released = false;
  let markerPersisted = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseLock(runsDir, runId);
  };
  return {
    lockPath: path.join(runsDir, '.lock'),
    markerPath: cleanupMarkerPath(runsDir, runId),
    get signalled() {
      return signalled;
    },
    /** 자동 복구를 막는 영속적 근거(cleanup marker)가 있는지 */
    get markerPersisted() {
      return markerPersisted;
    },
    /** 이후 lock 해제는 신호 정리가 맡는다. */
    claimForSignal: () => {
      signalled = true;
    },
    /**
     * 하위 프로세스 종료 미확인을 기록한다. 동기적으로, 예외 없이 실행한다.
     * 1. cleanup marker (존재 자체가 자동 복구 차단의 근거) 2. lock metadata (보조)
     * @param {import('./runStore.mjs').CleanupRequired} cleanup
     */
    recordCleanupRequired: (cleanup) => {
      markerPersisted = tryRecord(() =>
        createCleanupMarker(runsDir, runId, cleanup, fsOps),
      );
      tryRecord(() =>
        markLockCleanupRequired(runsDir, runId, cleanup, {
          renameSync: fsOps.renameSync,
        }),
      );
    },
    /**
     * cleanup marker 생성을 다시 시도한다.
     * @param {import('./runStore.mjs').CleanupRequired} cleanup
     */
    retryMarker: (cleanup) => {
      markerPersisted =
        markerPersisted ||
        tryRecord(() => createCleanupMarker(runsDir, runId, cleanup, fsOps));
      return markerPersisted;
    },
    /** 하위 프로세스 종료가 확인된 뒤에만 호출한다. 현재 run의 marker → lock 순서로 해제한다. */
    releaseAfterSignal: () => {
      try {
        removeCleanupMarker(runsDir, runId);
      } finally {
        release();
      }
    },
    releaseOnFinish: () => {
      if (!signalled) release();
    },
  };
}

const MARKER_RETRY_MS = 5_000;

/** @returns {Promise<void>} */
function defaultRetryDelay() {
  return new Promise((resolve) => setTimeout(resolve, MARKER_RETRY_MS));
}

/**
 * 실행 동안 SIGINT / SIGTERM을 처리한다. (D3, D4)
 * 안전 원칙: 하위 프로세스 종료 미확인이라는 사실을 영속적으로 남기지 못했다면, 하네스(lock 소유자)가 종료되어
 * stale lock으로 오인될 수 있는 상태를 만들지 않는다.
 * 1. lock 해제 책임을 가져온다.
 * 2. 첫 await 전에 동기적으로 cleanup marker를 만들고 lock에 종료 미확인을 기록한다.
 * 3. 새 단계 진행을 막고, 신호 시점의 자식 프로세스 트리 종료를 요청해 종료를 확인한다.
 * 4. 종료가 확인되면 현재 run의 marker와 lock을 해제하고 종료한다.
 * 5. 종료를 확인하지 못했고 marker가 있으면 lock / marker를 남기고 종료한다. (다음 실행은 복구 보류)
 * 6. 종료를 확인하지 못했고 marker도 없으면 종료하지 않고 lock을 유지한 채 marker 생성을 계속 다시 시도한다.
 *    이 상태에서는 두 번째 신호로도 즉시 종료하지 않는다.
 * @param {HarnessDeps} deps
 * @param {ReturnType<typeof createLockGuard>} guard
 * @param {string} runId
 * @param {() => Context | null} getRunning 현재 run의 context. 입력 대기 중이면 awaitingInput이 true
 * @returns {() => void} 처리기 해제. 신호 정리 중이면 정리가 끝난 뒤 해제한다.
 */
function watchSignals(deps, guard, runId, getRunning) {
  if (!deps.onSignal) return () => {};
  // 하위 프로세스가 있는데 종료 확인도 marker도 없는 동안 true
  let unsafeToExit = false;
  let cleaning = false;
  let disposeRequested = false;

  const dispose = deps.onSignal(
    async (signal) => {
      cleaning = true;
      try {
        guard.claimForSignal();
        const ctx = getRunning();
        // 입력 대기 중(결정 / 수동 검증)이면 대기 상태를 유지한다. (Task 007 D3, Task 010 5.8)
        const inputting = !ctx || ctx.awaitingInput === true;
        const children = deps.snapshotChildren?.() ?? [];
        /** @type {import('./runStore.mjs').CleanupRequired} */
        const cleanup = {
          reason:
            '신호를 받아 하위 프로세스를 종료하는 중에 중단되었거나, 종료를 확인하지 못함',
          signal,
          stage: ctx ? ctx.state.status : STATUS.WAITING_HUMAN_DECISION,
          children: children.map((child) => child.info),
          markedAt: deps.now().toISOString(),
        };
        guard.recordCleanupRequired(cleanup);
        unsafeToExit = children.length > 0 && !guard.markerPersisted;
        const exitCode = () =>
          exitCodeFor(ctx ? ctx.state.status : STATUS.WAITING_HUMAN_DECISION);

        try {
          if (ctx && !inputting) {
            interrupt(ctx, signal);
          } else if (ctx) {
            interruptInput(ctx, signal);
          } else {
            deps.progress.stop();
            deps.progress.log(
              `\n중단 (${signal}). 입력한 내용은 저장되었습니다. 재개: ${resumeHint(deps, runId)}`,
            );
          }
        } catch (error) {
          deps.progress.log(
            `⚠ 중단 기록 중 오류: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        // 종료 요청 함수가 없으면 자식이 없을 때만 종료된 것으로 본다. 오류는 미확인으로 본다.
        let exited = false;
        try {
          exited = deps.killChildren
            ? await deps.killChildren(children)
            : children.length === 0;
        } catch {
          exited = false;
        }

        if (exited) {
          unsafeToExit = false;
          guard.releaseAfterSignal();
          return exitCode();
        }

        if (!guard.markerPersisted) {
          deps.progress.log(
            [
              `⚠ 하위 프로세스 종료를 확인하지 못했고, 이를 기록할 cleanup marker도 만들지 못했습니다: ${toRepoPath(deps.root, guard.markerPath)}`,
              '  지금 하네스를 종료하면 다음 실행이 lock을 자동으로 복구할 수 있으므로, 종료하지 않고 lock을 유지합니다.',
              `  추적했던 프로세스: ${describeChildren(cleanup.children)}`,
              `  - harness/runs 쓰기 문제를 해결하면 marker를 기록한 뒤 종료합니다. (${MARKER_RETRY_MS / 1000}초마다 다시 시도)`,
              '  - 또는 위 프로세스와 그 하위 프로세스가 모두 종료됐는지 직접 확인한 뒤 이 하네스 프로세스를 종료하고 lock 파일을 삭제하세요.',
            ].join('\n'),
          );
          const retryDelay = deps.retryDelay ?? defaultRetryDelay;
          while (!guard.retryMarker(cleanup)) await retryDelay();
          unsafeToExit = false;
        }

        deps.progress.log(
          [
            `⚠ 하위 프로세스 종료를 확인하지 못해 lock을 복구 보류 상태로 남겨 둡니다: ${toRepoPath(deps.root, guard.lockPath)}`,
            `  cleanup marker: ${toRepoPath(deps.root, guard.markerPath)}`,
            `  추적했던 프로세스: ${describeChildren(cleanup.children)}`,
            '  이 프로세스와 그 하위 프로세스가 모두 종료됐는지 확인한 뒤 marker 파일과 lock 파일을 직접 삭제해야 다음 실행을 시작할 수 있습니다.',
          ].join('\n'),
        );
        return exitCode();
      } finally {
        cleaning = false;
        if (disposeRequested) dispose();
      }
    },
    {
      allowImmediateExit: () => !unsafeToExit,
      onExitBlocked: (signal) =>
        deps.progress.log(
          `⚠ ${signal}: 하위 프로세스 종료가 확인되지 않았고 cleanup marker도 없어 지금 종료하지 않습니다. 위 안내를 확인하세요.`,
        ),
    },
  );

  return () => {
    // 신호 정리 중에는 처리기를 유지한다. (두 번째 신호가 Node 기본 동작으로 즉시 종료시키지 않게)
    if (cleaning) disposeRequested = true;
    else dispose();
  };
}

/**
 * @param {HarnessDeps} deps
 * @param {string} runsDir
 * @param {string} runId
 */
function lockRun(deps, runsDir, runId) {
  const { stale } = acquireLock(runsDir, runId, { now: deps.now() });
  if (stale) {
    deps.progress.step(
      `⚠ 이전 실행(${describeLock(stale)})이 비정상 종료되어 남은 lock을 제거했습니다.`,
    );
  }
}

/**
 * @param {HarnessDeps} deps
 * @param {RunState} state
 * @param {boolean} resumed
 */
function logRunHeader(deps, state, resumed) {
  deps.progress.log(`run ${state.runId}${resumed ? ' 재개' : ''}`);
  deps.progress.log(`요구사항: ${summarize(state.requirement)}`);
  deps.progress.log(`baseHead: ${state.baseHead.slice(0, 7)}`);
}

/**
 * 시작 전 검사. 문제가 있으면 사유를 반환한다.
 * @param {HarnessDeps} deps
 */
async function preflight(deps) {
  const { runner, root, timeouts } = deps;

  if (!(await isGitRepo(runner, root))) return 'Git 저장소가 아닙니다.';
  if ((await getHead(runner, root)) === null) {
    return 'commit이 없습니다. 최초 commit 후 실행하세요.';
  }
  const status = await getStatusLines(runner, root);
  if (status.length > 0) {
    return `working tree가 clean하지 않습니다. commit 또는 정리 후 실행하세요.\n${status.join('\n')}`;
  }

  const claude = await runner(
    deps.project?.ai.claude.command ?? CLAUDE_COMMAND,
    ['--version'],
    {
      cwd: root,
      timeoutMs: timeouts.version,
      env:
        deps.project && !deps.project.ai.claude.configDir
          ? process.env
          : claudeEnv(process.env, deps.project?.ai.claude.configDir),
    },
  );
  if (claude.code !== 0) return 'claude 명령을 실행할 수 없습니다.';
  const codex = await runner(
    deps.project?.ai.codex.command ?? CODEX_COMMAND,
    ['--version'],
    {
      cwd: root,
      timeoutMs: timeouts.version,
      shell: process.platform === 'win32',
    },
  );
  if (codex.code !== 0) return 'codex 명령을 실행할 수 없습니다.';
  return null;
}

/**
 * @param {string} requirement
 * @param {HarnessDeps} deps
 * @returns {Promise<RunOutcome>}
 */
export async function startRun(requirement, deps) {
  const runsDir = getRunsDir(deps.root, deps.project);
  const problem = await preflight(deps);
  if (problem) {
    deps.progress.log(`시작할 수 없습니다: ${problem}`);
    return { status: STATUS.FAILED, runId: null, exitCode: 1 };
  }
  const baseHead = /** @type {string} */ (
    await getHead(deps.runner, deps.root)
  );

  const { runId, dir } = createRunDir(runsDir, deps.now());
  try {
    lockRun(deps, runsDir, runId);
  } catch (error) {
    fs.rmSync(dir, { recursive: true, force: true });
    deps.progress.log(
      `시작할 수 없습니다: ${/** @type {Error} */ (error).message}`,
    );
    return { status: STATUS.FAILED, runId: null, exitCode: 1 };
  }

  /** @type {Context} */
  const ctx = {
    deps,
    dir,
    state: {
      runId,
      status: STATUS.TASK_GENERATING,
      requirement,
      baseHead,
      taskFile: null,
      fixAttempts: 0,
      fixRound: 0,
      verifyRound: 0,
      reviewRound: 0,
      decisionRound: 0,
      fixReason: null,
      lastMustFix: [],
      lastResolutions: [],
      niceToHave: [],
      manualValidation: [],
      codexManual: [],
      manualConfirmed: [],
      manualChecklist: null,
      lastReviewSnapshot: null,
      resolvedDecisions: [],
      newMigrations: [],
      changedFiles: [],
      dependencyDecisionAnswered: false,
      pendingDecision: null,
      answeredDecisions: [],
      verifications: [],
      reviews: [],
      history: [],
      failureReason: null,
    },
  };
  const guard = createLockGuard(runsDir, runId, deps.lockFsOps);
  const stopWatching = watchSignals(deps, guard, runId, () => ctx);
  try {
    writeText(dir, 'requirement.md', `${requirement}\n`);
    logRunHeader(deps, ctx.state, false);
    transition(ctx, STATUS.TASK_GENERATING);
    return await runLoop(ctx);
  } finally {
    stopWatching();
    guard.releaseOnFinish();
  }
}

/**
 * 미답변 결정을 터미널에서 묻는다. 답할 때마다 decisions.json에 저장한다. (Task 007)
 * @param {Context} ctx
 * @param {() => import('./decisionPrompt.mjs').PromptSession} openPrompt
 * @param {string} file
 * @param {import('./decisionPrompt.mjs').StoredQuestion[]} questions
 */
async function askUnanswered(ctx, openPrompt, file, questions) {
  const { deps, dir } = ctx;
  const noDefault = new Set([
    DEPENDENCY_QUESTION_ID,
    ...questions
      .map((question) => question.id)
      .filter((id) => id.startsWith(RECLASSIFY_PREFIX)),
  ]);
  const session = openPrompt();
  try {
    return await askDecisions({
      questions,
      ask: (prompt) => session.ask(prompt),
      print: (text) => deps.progress.log(text),
      save: (index, answer) => saveDecisionAnswer(dir, file, index, answer),
      allowDefault: (question) => allowsRecommendation(question, noDefault),
    });
  } finally {
    session.close();
  }
}

/**
 * v1.1에서 만든 run에는 Task 010 필드가 없다.
 * @param {RunState} state
 */
function withDefaults(state) {
  state.codexManual ??= [];
  state.manualConfirmed ??= [];
  state.manualChecklist ??= null;
  state.lastReviewSnapshot ??= null;
  state.resolvedDecisions ??= [];
  return state;
}

/**
 * 재개할 수 있는 상태: 결정 대기 / 수동 검증 대기
 * @param {RunState} state
 */
function isResumable(state) {
  return (
    (state.status === STATUS.WAITING_HUMAN_DECISION &&
      Boolean(state.pendingDecision)) ||
    state.status === STATUS.MANUAL_VALIDATION_REQUIRED
  );
}

/**
 * 후보 run 한 줄 설명
 * @param {{ runId: string, dir: string, state: RunState }} run
 */
function describeCandidate({ runId, dir, state }) {
  return `${runId} · ${state.status} · ${state.taskFile ?? '(Task 없음)'} · ${summarize(state.requirement, 40)} · ${describePendingInput(dir, state)}`;
}

/**
 * 후보 run에 남은 질문 / 확인 항목 수
 * @param {string} dir
 * @param {RunState} state
 */
function describePendingInput(dir, state) {
  try {
    if (
      state.status === STATUS.WAITING_HUMAN_DECISION &&
      state.pendingDecision
    ) {
      /** @type {{ questions: { answer?: unknown }[] }} */
      const { questions } = readJson(dir, state.pendingDecision.file);
      return `남은 질문 ${questions.filter((question) => !isAnswered(question)).length}개`;
    }
    if (fs.existsSync(path.join(dir, MANUAL_VALIDATION_FILE))) {
      /** @type {{ items: import('./manualValidation.mjs').ManualItem[] }} */
      const { items } = readJson(dir, MANUAL_VALIDATION_FILE);
      return `남은 항목 ${items.filter((item) => !isPassed(item)).length}개`;
    }
    return '체크리스트 미생성';
  } catch {
    return '진행 정보를 읽을 수 없음';
  }
}

/**
 * runId 없이 --resume하면 재개할 run을 찾는다. (Task 010 5.5)
 * @param {HarnessDeps} deps
 * @param {string} runsDir
 * @returns {Promise<string | null>}
 */
async function selectResumableRun(deps, runsDir) {
  const { progress } = deps;
  const head = await getHead(deps.runner, deps.root);
  const active = activeLockRunId(runsDir);
  let headMismatch = 0;
  let locked = 0;
  let unreadable = 0;
  /** @type {{ runId: string, dir: string, state: RunState }[]} */
  const candidates = [];
  for (const run of listRunStates(runsDir).sort((a, b) =>
    b.runId.localeCompare(a.runId),
  )) {
    if (!run.state) {
      unreadable += 1;
      continue;
    }
    if (!isResumable(run.state)) continue;
    if (run.state.baseHead !== head) {
      headMismatch += 1;
      continue;
    }
    if (run.runId === active) {
      locked += 1;
      continue;
    }
    candidates.push(run);
  }

  const excluded = [
    headMismatch > 0 ? `HEAD가 시작 시점과 달라 제외 ${headMismatch}개` : '',
    locked > 0 ? `다른 터미널에서 진행 중 ${locked}개` : '',
    unreadable > 0 ? `state.json을 읽을 수 없음 ${unreadable}개` : '',
  ].filter(Boolean);

  if (candidates.length === 0) {
    progress.log(
      `재개할 run이 없습니다.${excluded.length > 0 ? ` (${excluded.join(', ')})` : ''}`,
    );
    progress.log(
      '결정 대기(WAITING_HUMAN_DECISION) 또는 수동 검증 대기(MANUAL_VALIDATION_REQUIRED) 상태이고, HEAD가 시작 시점과 같은 run만 재개할 수 있습니다.',
    );
    return null;
  }
  if (candidates.length === 1) {
    progress.log(
      `재개할 run을 자동으로 선택했습니다: ${describeCandidate(candidates[0])}`,
    );
    return candidates[0].runId;
  }

  const list = candidates
    .map((run, index) => `  ${index + 1}) ${describeCandidate(run)}`)
    .join('\n');
  if (!deps.prompt) {
    progress.log(
      `재개할 수 있는 run이 ${candidates.length}개입니다. runId를 지정하세요: ${resumeHint(deps, '<runId>')}`,
    );
    progress.log(list);
    return null;
  }

  progress.log(`재개할 수 있는 run이 ${candidates.length}개입니다.`);
  progress.log(list);
  progress.log('입력: 번호 선택 / q = 중단');
  const session = deps.prompt();
  try {
    for (;;) {
      const input = await session.ask('> ');
      const text = input?.trim() ?? null;
      if (text === null || text.toLowerCase() === 'q') {
        progress.log('재개하지 않았습니다.');
        return null;
      }
      const index = /^\d+$/.test(text) ? Number(text) - 1 : -1;
      if (index >= 0 && index < candidates.length) {
        return candidates[index].runId;
      }
      progress.log(`1~${candidates.length} 사이 번호를 입력하세요.`);
    }
  } finally {
    session.close();
  }
}

/**
 * @param {string | null} requestedRunId null이면 재개할 run을 찾는다. (Task 010)
 * @param {HarnessDeps} deps
 * @returns {Promise<RunOutcome>}
 */
export async function resumeRun(requestedRunId, deps) {
  const runsDir = getRunsDir(deps.root, deps.project);
  const runId = requestedRunId ?? (await selectResumableRun(deps, runsDir));
  if (runId === null) {
    return { status: STATUS.FAILED, runId: null, exitCode: 1 };
  }
  const dir = path.join(runsDir, runId);
  /** @param {string} message */
  const refuse = (message) => {
    deps.progress.log(`재개할 수 없습니다: ${message}`);
    return { status: STATUS.FAILED, runId, exitCode: 1 };
  };

  if (!isValidRunId(runId) || !fs.existsSync(path.join(dir, 'state.json'))) {
    return refuse(`run ${runId}을 찾을 수 없습니다.`);
  }
  /** @type {RunState} */
  const state = withDefaults(readJson(dir, 'state.json'));
  if (!isResumable(state)) {
    return refuse(
      `run ${runId}은 결정 대기 / 수동 검증 대기 상태가 아닙니다 (${state.status}).`,
    );
  }

  const head = await getHead(deps.runner, deps.root);
  if (head !== state.baseHead) {
    return refuse(
      `HEAD가 시작 시점과 다릅니다 (${state.baseHead} → ${head}). 결정 / 수동 검증 대기 중에는 commit하지 마세요.`,
    );
  }

  const pending = state.pendingDecision;
  if (state.status === STATUS.WAITING_HUMAN_DECISION && pending) {
    /** @type {{ questions: import('./decisionPrompt.mjs').StoredQuestion[] }} */
    const decisions = readJson(dir, pending.file);
    const unanswered = decisions.questions.filter(
      (question) => !isAnswered(question),
    );
    // non-TTY: 기존 파일 기반 동작
    if (unanswered.length > 0 && !deps.prompt) {
      const decisionsPath = toRepoPath(deps.root, path.join(dir, pending.file));
      deps.progress.log(`아직 답하지 않은 결정이 있습니다 (${decisionsPath}):`);
      deps.progress.log(formatDecisionQuestions(unanswered));
      deps.progress.log(
        '\nanswer를 채운 뒤 다시 재개하세요. 터미널(TTY)에서 재개하면 질문에 바로 답할 수 있습니다.',
      );
      return outcomeOf(state);
    }
  }

  // 같은 run을 두 곳에서 동시에 답하지 않도록 입력 전에 lock을 획득한다.
  try {
    lockRun(deps, runsDir, runId);
  } catch (error) {
    return refuse(/** @type {Error} */ (error).message);
  }

  /** @type {Context} */
  const ctx = { deps, dir, state, resumePending: true };
  const guard = createLockGuard(runsDir, runId, deps.lockFsOps);
  const stopWatching = watchSignals(deps, guard, runId, () => ctx);
  try {
    logRunHeader(deps, state, true);
    return await runLoop(ctx);
  } finally {
    stopWatching();
    guard.releaseOnFinish();
  }
}
