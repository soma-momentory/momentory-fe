// @ts-check
import readline from 'node:readline';
import { readJson, writeJsonAtomic } from './runStore.mjs';

// Human Decision 인터랙티브 입력 (Task 007, D1 / D2).
// --resume + TTY에서만 사용한다. 답변은 받을 때마다 decisions.json에 저장한다.

/** @typedef {import('./harness.mjs').DecisionQuestion & { answer?: unknown }} StoredQuestion */

/**
 * `null`은 중단(Ctrl+C / 입력 종료)을 뜻한다.
 * @typedef {object} PromptSession
 * @property {(prompt: string) => Promise<string | null>} ask
 * @property {() => void} close
 */

/**
 * @typedef {{ kind: 'answer', answer: string }
 *   | { kind: 'quit' }
 *   | { kind: 'invalid', message: string }} ParsedInput
 */

/** @param {{ answer?: unknown }} question */
export function isAnswered(question) {
  return typeof question.answer === 'string' && question.answer.trim() !== '';
}

/**
 * 번호로 고를 수 있는 선택지. label이 trim 후 비어 있으면 유효한 선택지로 보지 않는다.
 * @param {StoredQuestion} question
 */
export function selectableOptions(question) {
  return question.options.filter(
    (option) => typeof option.label === 'string' && option.label.trim() !== '',
  );
}

/**
 * Enter로 추천안을 고를 수 있는지. recommendation이 실제 선택지가 아닌 질문(DEPENDENCY)은 제외한다. (D2)
 * @param {StoredQuestion} question
 * @param {Set<string>} noDefaultIds
 */
export function allowsRecommendation(question, noDefaultIds) {
  return (
    !noDefaultIds.has(question.id) &&
    typeof question.recommendation === 'string' &&
    question.recommendation.trim() !== ''
  );
}

/**
 * 입력 해석: 번호 → 선택지 label 원문, Enter → recommendation 원문, q → 중단, 그 외 → 입력 문장 (D2)
 * @param {string} input
 * @param {StoredQuestion} question
 * @param {boolean} allowDefault
 * @returns {ParsedInput}
 */
export function parseAnswer(input, question, allowDefault) {
  const text = input.trim();
  if (text.toLowerCase() === 'q') return { kind: 'quit' };

  if (text === '') {
    const recommendation =
      typeof question.recommendation === 'string'
        ? question.recommendation.trim()
        : '';
    // 빈 answer는 저장하지 않는다.
    return allowDefault && recommendation !== ''
      ? { kind: 'answer', answer: recommendation }
      : {
          kind: 'invalid',
          message:
            '이 질문은 Enter로 추천안을 선택할 수 없습니다. 번호를 고르거나 직접 입력하세요.',
        };
  }

  if (/^\d+$/.test(text)) {
    const options = selectableOptions(question);
    const count = options.length;
    if (count === 0) {
      return {
        kind: 'invalid',
        message: '선택지가 없는 질문입니다. 결정을 직접 입력하세요.',
      };
    }
    const index = Number(text) - 1;
    if (index < 0 || index >= count) {
      return { kind: 'invalid', message: `1~${count} 사이 번호를 입력하세요.` };
    }
    return { kind: 'answer', answer: options[index].label.trim() };
  }

  return { kind: 'answer', answer: text };
}

/**
 * @param {StoredQuestion} question
 * @param {number} position 1부터
 * @param {number} total
 * @param {boolean} allowDefault
 */
export function formatQuestion(question, position, total, allowDefault) {
  const selectable = selectableOptions(question);
  const options = selectable.map((option, index) =>
    [
      `  ${index + 1}) ${option.label.trim()}`,
      `     장점: ${option.pros}`,
      `     단점: ${option.cons}`,
    ].join('\n'),
  );
  const inputs = [
    ...(selectable.length > 0 ? ['번호 선택'] : []),
    ...(allowDefault ? ['Enter = 추천안'] : []),
    '직접 입력',
    'q = 중단',
  ];
  return [
    '',
    `질문 ${position}/${total} · ${question.id}`,
    question.question,
    `이유: ${question.reason}`,
    '선택지:',
    ...(options.length > 0 ? options : ['  (선택지 없음)']),
    `추천: ${question.recommendation}`,
    `영향: ${question.impact}`,
    `입력: ${inputs.join(' / ')}${allowDefault ? '' : ' (Enter 추천안 선택 불가)'}`,
  ].join('\n');
}

/**
 * decisions.json에서 한 질문의 answer만 바꿔 저장한다.
 * @param {string} dir
 * @param {string} file
 * @param {number} index
 * @param {string} answer
 */
export function saveDecisionAnswer(dir, file, index, answer) {
  const decisions = readJson(dir, file);
  decisions.questions[index].answer = answer;
  writeJsonAtomic(dir, file, decisions);
}

/**
 * 미답변 질문을 순서대로 묻고 답할 때마다 저장한다.
 * @param {object} params
 * @param {StoredQuestion[]} params.questions
 * @param {PromptSession['ask']} params.ask
 * @param {(text: string) => void} params.print
 * @param {(index: number, answer: string) => void} params.save
 * @param {(question: StoredQuestion) => boolean} params.allowDefault
 * @returns {Promise<{ completed: true } | { completed: false, reason: 'quit' | 'interrupted' }>}
 */
export async function askDecisions({
  questions,
  ask,
  print,
  save,
  allowDefault,
}) {
  const pending = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !isAnswered(question));

  for (const [position, { question, index }] of pending.entries()) {
    const withDefault = allowDefault(question);
    print(formatQuestion(question, position + 1, pending.length, withDefault));

    for (;;) {
      const input = await ask('> ');
      if (input === null) return { completed: false, reason: 'interrupted' };
      const parsed = parseAnswer(input, question, withDefault);
      if (parsed.kind === 'quit') return { completed: false, reason: 'quit' };
      if (parsed.kind === 'invalid') {
        print(parsed.message);
        continue;
      }
      save(index, parsed.answer);
      print(`✓ ${question.id} → ${parsed.answer}`);
      break;
    }
  }
  return { completed: true };
}

/**
 * readline 기반 입력. terminal 모드에서 Ctrl+C는 rl의 SIGINT로 들어오므로 중단(null)으로 처리한다.
 * @param {{ input: NodeJS.ReadableStream, output: NodeJS.WritableStream, terminal: boolean }} streams
 * @returns {PromptSession}
 */
export function openTerminalPrompt({ input, output, terminal }) {
  const rl = readline.createInterface({ input, output, terminal });
  /** @type {string[]} */
  const lines = [];
  /** @type {((value: string | null) => void) | null} */
  let waiting = null;
  let closed = false;

  /** @param {string | null} value */
  const deliver = (value) => {
    const resolve = waiting;
    waiting = null;
    resolve?.(value);
  };

  rl.on('line', (line) => {
    if (waiting) deliver(line);
    else lines.push(line);
  });
  rl.on('SIGINT', () => {
    output.write('\n');
    closed = true;
    deliver(null);
    rl.close();
  });
  rl.on('close', () => {
    closed = true;
    deliver(null);
  });

  return {
    ask(prompt) {
      const buffered = lines.shift();
      if (buffered !== undefined) return Promise.resolve(buffered);
      if (closed) return Promise.resolve(null);
      return new Promise((resolve) => {
        waiting = resolve;
        rl.setPrompt(prompt);
        rl.prompt();
      });
    },
    close() {
      closed = true;
      rl.close();
    },
  };
}
