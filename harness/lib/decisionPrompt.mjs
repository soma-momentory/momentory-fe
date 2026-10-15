// @ts-check
import readline from 'node:readline';
import { randomBytes } from 'node:crypto';
import { readJson, writeJsonAtomic } from './runStore.mjs';

// Human Decision 인터랙티브 입력 (Task 007, D1 / D2).
// TTY에서만 사용한다. 질문별 확인을 마친 답변만 decisions.json에 저장한다.

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
 * 입력 해석: 번호 → 선택지 label 원문, q → 중단, 그 외 → 입력 문장.
 * 빈 줄은 결정을 뜻하지 않는다.
 * @param {string} input
 * @param {StoredQuestion} question
 * @returns {ParsedInput}
 */
export function parseAnswer(input, question) {
  const text = input.trim();
  if (text.toLowerCase() === 'q') return { kind: 'quit' };

  if (text === '') {
    return {
      kind: 'invalid',
      message:
        '빈 줄은 답변으로 저장하지 않습니다. 번호를 고르거나 직접 입력하세요.',
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
 */
export function formatQuestion(question, position, total) {
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
    `입력: ${inputs.join(' / ')} (빈 줄은 선택하지 않음)`,
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
  decisions.approved = false;
  writeJsonAtomic(dir, file, decisions);
}

/**
 * 최종 요약을 확인한 뒤에만 다음 단계로 진행할 수 있게 기록한다.
 * @param {string} dir
 * @param {string} file
 */
export function approveDecisions(dir, file) {
  const decisions = readJson(dir, file);
  decisions.approved = true;
  writeJsonAtomic(dir, file, decisions);
}

/**
 * 미답변 질문을 순서대로 묻고 답할 때마다 저장한다.
 * @param {object} params
 * @param {StoredQuestion[]} params.questions
 * @param {PromptSession['ask']} params.ask
 * @param {(text: string) => void} params.print
 * @param {(index: number, answer: string) => void} params.save
 * @param {() => void} params.approve
 * @param {() => string} [params.confirmationCode] 테스트에서 고정 코드 주입
 * @returns {Promise<{ completed: true } | { completed: false, reason: 'quit' | 'interrupted' }>}
 */
export async function askDecisions({
  questions,
  ask,
  print,
  save,
  approve,
  confirmationCode = () => randomBytes(4).toString('hex'),
}) {
  const pending = questions
    .map((question, index) => ({ question, index }))
    .filter(({ question }) => !isAnswered(question));

  for (const [position, { question, index }] of pending.entries()) {
    print(formatQuestion(question, position + 1, pending.length));

    for (;;) {
      const input = await ask('> ');
      if (input === null) return { completed: false, reason: 'interrupted' };
      const parsed = parseAnswer(input, question);
      if (parsed.kind === 'quit') return { completed: false, reason: 'quit' };
      if (parsed.kind === 'invalid') {
        print(parsed.message);
        continue;
      }
      const code = confirmationCode();
      print(`답변 확인 · ${question.id} → ${parsed.answer}`);
      print(
        `이 질문의 답을 저장하려면 확인 코드 ${code}를 입력하세요. 다시 답하려면 r, 중단하려면 q.`,
      );
      for (;;) {
        const confirmation = await ask(`확인 코드 ${code}> `);
        if (confirmation === null)
          return { completed: false, reason: 'interrupted' };
        if (confirmation.trim().toLowerCase() === 'q')
          return { completed: false, reason: 'quit' };
        if (confirmation.trim().toLowerCase() === 'r') break;
        if (confirmation.trim() !== code) {
          print(
            '확인 코드가 맞지 않습니다. 현재 질문의 답은 아직 저장되지 않았습니다.',
          );
          continue;
        }
        save(index, parsed.answer);
        question.answer = parsed.answer;
        print(`✓ ${question.id} → ${parsed.answer}`);
        break;
      }
      if (question.answer === parsed.answer) break;
    }
  }

  print(
    [
      '',
      '결정 답변 요약',
      ...questions.map((q) => `- ${q.id} ${q.question}\n  → ${q.answer}`),
    ].join('\n'),
  );
  const finalCode = confirmationCode();
  print(`모든 결정을 반영하려면 승인 ${finalCode}를 입력하세요. q = 중단.`);
  for (;;) {
    const approval = await ask(`최종 승인 ${finalCode}> `);
    if (approval === null) return { completed: false, reason: 'interrupted' };
    if (approval.trim().toLowerCase() === 'q')
      return { completed: false, reason: 'quit' };
    if (approval.trim() === `승인 ${finalCode}`) {
      approve();
      return { completed: true };
    }
    print(
      '최종 승인 코드가 맞지 않습니다. 결정은 아직 다음 단계에 반영되지 않았습니다.',
    );
  }
}

/**
 * readline 기반 입력. terminal 모드에서 Ctrl+C는 rl의 SIGINT로 들어오므로 중단(null)으로 처리한다.
 * @param {{ input: NodeJS.ReadableStream, output: NodeJS.WritableStream, terminal: boolean }} streams
 * @returns {PromptSession}
 */
export function openTerminalPrompt({ input, output, terminal }) {
  const rl = readline.createInterface({ input, output, terminal });
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
    // 한 번에 붙여 넣은 남은 줄을 다음 질문에 전달하지 않는다.
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
