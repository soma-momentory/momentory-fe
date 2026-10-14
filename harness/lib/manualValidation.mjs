// @ts-check
import { readJson, writeJsonAtomic } from './runStore.mjs';

// 수동 검증 체크리스트 (Task 010 5.4).
// 하네스는 migration 적용, SQL 실행, 외부 서비스 작업을 하지 않는다. 사람이 외부에서 한 결과를 확인 / 기록만 한다.

export const MANUAL_VALIDATION_FILE = 'manual-validation.json';

export const MIGRATION_CHECK =
  'Supabase Dashboard SQL Editor에서 수동 적용 필요';

/**
 * Codex 리뷰의 수동 검증 항목 (codex-review.schema.json `manualValidation`)
 * @typedef {object} CodexManualItem
 * @property {string} id
 * @property {string} title
 * @property {string} check
 * @property {string} reason
 * @property {boolean} noteRequired
 */

/**
 * 사람이 재분류 질문에서 수동 검증으로 확정한 Must Fix
 * @typedef {object} ConfirmedManualItem
 * @property {string} id Must Fix id
 * @property {string} title
 * @property {string} check
 * @property {string} reason
 */

/**
 * @typedef {object} ManualItem
 * @property {string} id
 * @property {'claude' | 'migration' | 'codex' | 'human'} source
 * @property {string} title
 * @property {string} check
 * @property {string} reason
 * @property {boolean} noteRequired
 * @property {'' | 'pass' | 'fail'} result
 * @property {string} note
 * @property {string | null} checkedAt
 */

/**
 * @typedef {object} ManualChecklist
 * @property {string} runId
 * @property {string} instructions
 * @property {ManualItem[]} items
 */

/**
 * @typedef {{ kind: 'pass' } | { kind: 'fail' } | { kind: 'quit' } | { kind: 'invalid', message: string }} ManualInput
 */

/** @param {ManualItem['source']} source */
function sourceLabel(source) {
  switch (source) {
    case 'claude':
      return 'Claude';
    case 'migration':
      return 'migration';
    case 'codex':
      return 'Codex';
    case 'human':
      return '재분류';
  }
}

/**
 * Codex 수동 검증 항목을 id 기준으로 병합한다. 같은 id는 새 내용으로 바꾸고, 이전 항목은 지우지 않는다.
 * @param {CodexManualItem[]} current
 * @param {CodexManualItem[]} incoming
 */
export function mergeCodexManual(current, incoming) {
  const merged = [...current];
  for (const item of incoming) {
    const index = merged.findIndex((saved) => saved.id === item.id);
    if (index >= 0) merged[index] = item;
    else merged.push(item);
  }
  return merged;
}

/**
 * 출처별 수동 검증 목록을 하나의 체크리스트 항목으로 만든다. id가 겹치면 접미사를 붙인다.
 * @param {object} sources
 * @param {string[]} sources.claude Claude manualValidation (문자열)
 * @param {string[]} sources.migrations 새 migration 파일
 * @param {CodexManualItem[]} sources.codex
 * @param {ConfirmedManualItem[]} sources.confirmed
 * @param {string} [sources.migrationCheck]
 * @returns {ManualItem[]}
 */
export function buildChecklistItems({
  claude,
  migrations,
  codex,
  confirmed,
  migrationCheck = MIGRATION_CHECK,
}) {
  /** @type {ManualItem[]} */
  const items = [];
  const used = new Set();
  /** @param {string} id */
  const uniqueId = (id) => {
    let candidate = id;
    for (let suffix = 2; used.has(candidate); suffix += 1) {
      candidate = `${id}-${suffix}`;
    }
    used.add(candidate);
    return candidate;
  };
  /**
   * @param {string} id
   * @param {ManualItem['source']} source
   * @param {{ title: string, check: string, reason: string, noteRequired: boolean }} fields
   */
  const add = (id, source, fields) =>
    items.push({
      id: uniqueId(id),
      source,
      ...fields,
      result: '',
      note: '',
      checkedAt: null,
    });

  claude.forEach((text, index) =>
    add(`C${index + 1}`, 'claude', {
      title: text,
      check: '',
      reason: '',
      noteRequired: false,
    }),
  );
  migrations.forEach((file, index) =>
    add(`MIG${index + 1}`, 'migration', {
      title: file,
      check: migrationCheck,
      reason: '',
      noteRequired: false,
    }),
  );
  for (const item of codex) {
    add(item.id, 'codex', {
      title: item.title,
      check: item.check,
      reason: item.reason,
      noteRequired: item.noteRequired,
    });
  }
  for (const item of confirmed) {
    add(item.id, 'human', {
      title: item.title,
      check: item.check,
      reason: item.reason,
      noteRequired: false,
    });
  }
  return items;
}

/** @param {ManualItem} item */
export function isPassed(item) {
  return item.result === 'pass';
}

/**
 * 체크리스트 입력 해석: y / pass → 통과, n / fail → 실패, q → 중단
 * @param {string} input
 * @returns {ManualInput}
 */
export function parseManualInput(input) {
  const text = input.trim().toLowerCase();
  if (text === 'y' || text === 'pass') return { kind: 'pass' };
  if (text === 'n' || text === 'fail') return { kind: 'fail' };
  if (text === 'q') return { kind: 'quit' };
  return {
    kind: 'invalid',
    message: 'y(pass) / n(fail) / q 중 하나를 입력하세요.',
  };
}

/**
 * @param {ManualItem} item
 * @param {number} position 1부터
 * @param {number} total
 */
export function formatManualItem(item, position, total) {
  return [
    '',
    `${position}/${total} · ${item.id} (${sourceLabel(item.source)})`,
    item.title,
    ...(item.check ? [`확인: ${item.check}`] : []),
    ...(item.reason ? [`수동 검증 이유: ${item.reason}`] : []),
    ...(item.result === 'fail' ? [`이전 결과: 실패 — ${item.note}`] : []),
    ...(item.noteRequired ? ['결과 메모가 필요한 항목입니다.'] : []),
  ].join('\n');
}

/**
 * 한 줄 요약 (report / 진행 표시)
 * @param {ManualItem} item
 */
export function describeManualItem(item) {
  const result =
    item.result === 'pass'
      ? 'PASS'
      : item.result === 'fail'
        ? 'FAIL'
        : '미확인';
  const check = item.check ? `: ${item.check}` : '';
  const note = item.note ? ` — 메모: ${item.note}` : '';
  return `[${result}] ${item.id} (${sourceLabel(item.source)}) ${item.title}${check}${note}`;
}

/**
 * 체크리스트에서 항목 하나의 결과만 바꿔 저장한다.
 * @param {string} dir
 * @param {number} index
 * @param {{ result: 'pass' | 'fail', note: string, checkedAt: string }} result
 */
export function saveManualResult(dir, index, result) {
  /** @type {ManualChecklist} */
  const checklist = readJson(dir, MANUAL_VALIDATION_FILE);
  checklist.items[index] = { ...checklist.items[index], ...result };
  writeJsonAtomic(dir, MANUAL_VALIDATION_FILE, checklist);
}

/**
 * 필수 메모를 받는다. 빈 입력은 다시 묻는다.
 * @param {(prompt: string) => Promise<string | null>} ask
 * @param {(text: string) => void} print
 * @param {string} label
 * @returns {Promise<{ note: string } | { stopped: 'quit' | 'interrupted' }>}
 */
async function askNote(ask, print, label) {
  for (;;) {
    const input = await ask(`${label} (필수): `);
    if (input === null) return { stopped: 'interrupted' };
    const text = input.trim();
    if (text.toLowerCase() === 'q') return { stopped: 'quit' };
    if (text !== '') return { note: text };
    print('메모를 입력하세요.');
  }
}

/**
 * pass가 아닌 항목을 순서대로 묻고, 답할 때마다 저장한다. (실패 항목도 다시 묻는다)
 * @param {object} params
 * @param {ManualItem[]} params.items
 * @param {(prompt: string) => Promise<string | null>} params.ask `null`은 중단(Ctrl+C / 입력 종료)
 * @param {(text: string) => void} params.print
 * @param {(index: number, result: { result: 'pass' | 'fail', note: string }) => void} params.save
 * @returns {Promise<{ completed: true } | { completed: false, reason: 'quit' | 'interrupted' }>}
 */
export async function askManualChecklist({ items, ask, print, save }) {
  const pending = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !isPassed(item));

  for (const [position, { item, index }] of pending.entries()) {
    print(formatManualItem(item, position + 1, pending.length));

    for (;;) {
      const input = await ask('[y/n/q]: ');
      if (input === null) return { completed: false, reason: 'interrupted' };
      const parsed = parseManualInput(input);
      if (parsed.kind === 'quit') return { completed: false, reason: 'quit' };
      if (parsed.kind === 'invalid') {
        print(parsed.message);
        continue;
      }

      const needsNote = parsed.kind === 'fail' || item.noteRequired;
      const answer = needsNote
        ? await askNote(
            ask,
            print,
            parsed.kind === 'fail' ? '실패 내용' : '결과 메모',
          )
        : { note: '' };
      if ('stopped' in answer) {
        return { completed: false, reason: answer.stopped };
      }

      save(index, { result: parsed.kind, note: answer.note });
      print(parsed.kind === 'pass' ? `✓ ${item.id} PASS` : `✗ ${item.id} FAIL`);
      break;
    }
  }
  return { completed: true };
}
