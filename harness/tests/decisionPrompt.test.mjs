import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import {
  approveDecisions,
  askDecisions,
  openTerminalPrompt,
  parseAnswer,
  saveDecisionAnswer,
} from '../lib/decisionPrompt.mjs';

const question = (id) => ({
  id,
  question: `${id} 질문`,
  reason: '결정 필요',
  options: [
    { label: 'A', pros: '단순', cons: '제한' },
    { label: 'B', pros: '유연', cons: '복잡' },
  ],
  recommendation: 'A',
  impact: '구현 범위',
  answer: '',
});

function run(inputs, questions = [question('D1'), question('D2')]) {
  const queue = [...inputs];
  const saved = [];
  const printed = [];
  let approved = false;
  const result = askDecisions({
    questions,
    ask: async () => (queue.length ? queue.shift() : null),
    print: (value) => printed.push(value),
    save: (index, answer) => saved.push([index, answer]),
    approve: () => {
      approved = true;
    },
    confirmationCode: () => 'abc123',
  });
  return { result, saved, printed, isApproved: () => approved };
}

test('번호 선택과 직접 입력은 해당 답변으로 해석한다', () => {
  assert.deepEqual(parseAnswer('2', question('D1')), {
    kind: 'answer',
    answer: 'B',
  });
  assert.deepEqual(parseAnswer(' 직접 결정 ', question('D1')), {
    kind: 'answer',
    answer: '직접 결정',
  });
  assert.equal(parseAnswer('3', question('D1')).kind, 'invalid');
});

test('빈 줄은 추천안 선택이 아니며 q는 중단한다', () => {
  for (const input of ['', '   ']) {
    assert.equal(parseAnswer(input, question('D1')).kind, 'invalid');
  }
  assert.deepEqual(parseAnswer(' Q ', question('D1')), { kind: 'quit' });
});

test('질문마다 확인 코드가 필요하고 전체 요약 뒤 최종 승인한다', async () => {
  const flow = run(['1', 'abc123', '직접 결정', 'abc123', '승인 abc123']);
  assert.deepEqual(await flow.result, { completed: true });
  assert.deepEqual(flow.saved, [
    [0, 'A'],
    [1, '직접 결정'],
  ]);
  assert.equal(flow.isApproved(), true);
  assert.match(flow.printed.join('\n'), /결정 답변 요약/);
  assert.match(flow.printed.join('\n'), /D2 D2 질문\n  → 직접 결정/);
});

test('틀린 확인 코드는 현재 답변을 저장하지 않는다', async () => {
  const flow = run(['1', '틀린 코드', 'q']);
  assert.deepEqual(await flow.result, { completed: false, reason: 'quit' });
  assert.deepEqual(flow.saved, []);
  assert.equal(flow.isApproved(), false);
});

test('최종 승인이 없으면 확인한 답변만 남고 진행하지 않는다', async () => {
  const flow = run(['1', 'abc123', '2', 'abc123', '잘못된 승인', 'q']);
  assert.deepEqual(await flow.result, { completed: false, reason: 'quit' });
  assert.deepEqual(flow.saved, [
    [0, 'A'],
    [1, 'B'],
  ]);
  assert.equal(flow.isApproved(), false);
});

test('중단과 입력 종료는 승인하지 않고 현재 질문을 남긴다', async () => {
  const quit = run(['1', 'abc123', 'q']);
  assert.deepEqual(await quit.result, { completed: false, reason: 'quit' });
  assert.deepEqual(quit.saved, [[0, 'A']]);
  assert.equal(quit.isApproved(), false);

  const interrupted = run(['1', null]);
  assert.deepEqual(await interrupted.result, {
    completed: false,
    reason: 'interrupted',
  });
  assert.deepEqual(interrupted.saved, []);
});

test('이미 저장된 답변도 최종 요약과 승인이 필요하다', async () => {
  const flow = run(
    ['승인 abc123'],
    [{ ...question('D1'), answer: '기존 답변' }],
  );
  assert.deepEqual(await flow.result, { completed: true });
  assert.deepEqual(flow.saved, []);
  assert.equal(flow.isApproved(), true);
  assert.match(flow.printed.join('\n'), /기존 답변/);
});

test('파일 답변 수정은 승인을 해제하고 명시적 승인만 true로 기록한다', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'momentory-decision-'));
  try {
    const file = 'decisions.json';
    fs.writeFileSync(
      path.join(dir, file),
      JSON.stringify({ approved: true, questions: [question('D1')] }),
    );
    saveDecisionAnswer(dir, file, 0, 'B');
    let stored = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.equal(stored.approved, false);
    assert.equal(stored.questions[0].answer, 'B');
    approveDecisions(dir, file);
    stored = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.equal(stored.approved, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function streams(terminal = false) {
  const input = new PassThrough();
  const output = new PassThrough();
  output.resume();
  return {
    input,
    output,
    session: openTerminalPrompt({ input, output, terminal }),
  };
}

for (const [name, chunks] of [
  ['한 번에 붙여넣기', ['1\n\n2\n']],
  ['분할 붙여넣기', ['1\n', '\n', '2\n']],
]) {
  test(`${name}의 잔여 줄은 다음 질문이나 확인 코드가 되지 않는다`, async () => {
    const { input, session } = streams();
    const saved = [];
    const printed = [];
    const result = askDecisions({
      questions: [question('D1'), question('D2')],
      ask: (prompt) => session.ask(prompt),
      print: (value) => printed.push(value),
      save: (index, answer) => saved.push([index, answer]),
      approve: () => {},
      confirmationCode: () => 'abc123',
    });
    for (const chunk of chunks) {
      input.write(chunk);
      await new Promise((resolve) => setImmediate(resolve));
    }
    input.end();
    assert.deepEqual(await result, { completed: false, reason: 'interrupted' });
    assert.deepEqual(saved, []);
    assert.doesNotMatch(printed.join('\n'), /질문 2\/2/);
    session.close();
  });
}

test('터미널 Ctrl+C는 현재 입력을 중단한다', async () => {
  const { input, session } = streams(true);
  const answer = session.ask('> ');
  input.write('\x03');
  assert.equal(await answer, null);
  assert.equal(await session.ask('> '), null);
  session.close();
});
