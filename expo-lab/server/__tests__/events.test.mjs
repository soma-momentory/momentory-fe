import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { parseClaudeLine, parseCodexLine, lineSplitter } = require("../events.js");

// 2026-11-02 이 PC 에서 실제로 받은 줄(길이만 줄였다):
//   claude -p --output-format stream-json --verbose --tools "" "오늘 날짜만 말해"   (Claude Code 2.1.316)
//   codex -a never exec --json -s read-only --skip-git-repo-check --ephemeral -     (codex-cli 0.166.0)
// 도구 줄(tool_use · command_execution · file_change)은 두 CLI 의 문서화된 모양이다 — 실측 실행은 도구를 막았다.
const CLAUDE = [
  '{"type":"system","subtype":"init","cwd":"C:\\\\tmp","session_id":"5c9c7ba4-041f-4c5e-b766-0fb30ef30028","tools":[],"model":"claude-opus-5-5"}',
  '{"type":"assistant","message":{"model":"claude-opus-5-5","id":"msg_1","type":"message","role":"assistant","content":[{"type":"thinking","thinking":"","signature":"x"}]},"session_id":"5c9c7ba4-041f-4c5e-b766-0fb30ef30028"}',
  '{"type":"assistant","message":{"model":"claude-opus-5-5","id":"msg_1","type":"message","role":"assistant","content":[{"type":"text","text":"오늘은 2026년 11월 2일입니다."}]},"session_id":"5c9c7ba4-041f-4c5e-b766-0fb30ef30028"}',
  '{"type":"rate_limit_event","rate_limit_info":{"status":"allowed"},"session_id":"5c9c7ba4-041f-4c5e-b766-0fb30ef30028"}',
  '{"duration_api_ms":2530,"stop_reason":"end_turn","session_id":"5c9c7ba4-041f-4c5e-b766-0fb30ef30028","total_cost_usd":0.04,"is_error":false,"num_turns":1,"subtype":"success","result":"오늘은 2026년 11월 2일입니다.","type":"result"}',
];
const CODEX = [
  '{"type":"thread.started","thread_id":"01a1988f-bdf7-7510-a64e-04fc7cc5226a"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message","text":"2026년 11월 2일"}}',
  '{"type":"turn.completed","usage":{"input_tokens":23185,"cached_input_tokens":0,"output_tokens":38}}',
];

test("Claude stream-json 실측 — 세션 id · 본문 · 끝", () => {
  const parsed = CLAUDE.map(parseClaudeLine);
  assert.equal(parsed[0]?.sessionId, "5c9c7ba4-041f-4c5e-b766-0fb30ef30028");
  assert.deepEqual(parsed[1]?.lines, []); // thinking 은 버린다
  assert.deepEqual(parsed[2]?.lines, [{ kind: "text", text: "오늘은 2026년 11월 2일입니다." }]);
  assert.deepEqual(parsed[3]?.lines, []);
  assert.equal(parsed[4]?.isError, false);
  assert.equal(parsed[4]?.finalText, "오늘은 2026년 11월 2일입니다.");
  assert.deepEqual(parsed[4]?.lines, [{ kind: "result", text: "끝났어요" }]);
});

test("Claude 도구 줄 · 거절된 도구 · 실패 결과", () => {
  const tool = parseClaudeLine(
    JSON.stringify({
      type: "assistant",
      message: {
        content: [
          { type: "tool_use", name: "Bash", input: { command: "npm run typecheck" } },
          { type: "tool_use", name: "Edit", input: { file_path: "src/a.ts" } },
        ],
      },
    }),
  );
  assert.deepEqual(tool.lines, [
    { kind: "tool", text: "$ npm run typecheck" },
    { kind: "tool", text: "Edit src/a.ts" },
  ]);
  const denied = parseClaudeLine(
    JSON.stringify({
      type: "user",
      message: { content: [{ type: "tool_result", is_error: true, content: "Permission denied" }] },
    }),
  );
  assert.equal(denied.lines[0]?.kind, "tool");
  const failed = parseClaudeLine(
    JSON.stringify({
      type: "result",
      subtype: "error_during_execution",
      is_error: true,
      result: "",
    }),
  );
  assert.equal(failed.isError, true);
  assert.equal(failed.lines[0]?.kind, "error");
  assert.deepEqual(parseClaudeLine("not json at all").lines, [
    { kind: "text", text: "not json at all" },
  ]);
});

test("Codex JSONL 실측 — thread id · 본문 · 끝", () => {
  const parsed = CODEX.map(parseCodexLine);
  assert.equal(parsed[0]?.sessionId, "01a1988f-bdf7-7510-a64e-04fc7cc5226a");
  assert.deepEqual(parsed[1]?.lines, []);
  assert.deepEqual(parsed[2]?.lines, [{ kind: "text", text: "2026년 11월 2일" }]);
  assert.equal(parsed[2]?.finalText, "2026년 11월 2일");
  assert.deepEqual(parsed[3]?.lines, [{ kind: "result", text: "끝났어요" }]);
});

test("Codex 명령 · 파일 변경 · 실패", () => {
  const started = parseCodexLine(
    JSON.stringify({
      type: "item.started",
      item: { type: "command_execution", command: "npm run lint", status: "in_progress" },
    }),
  );
  assert.deepEqual(started.lines, [{ kind: "tool", text: "$ npm run lint" }]);
  const exited = parseCodexLine(
    JSON.stringify({
      type: "item.completed",
      item: { type: "command_execution", command: "npm run lint", exit_code: 1 },
    }),
  );
  assert.deepEqual(exited.lines, [{ kind: "tool", text: "↳ 종료 코드 1" }]);
  const ok = parseCodexLine(
    JSON.stringify({
      type: "item.completed",
      item: { type: "command_execution", command: "x", exit_code: 0 },
    }),
  );
  assert.deepEqual(ok.lines, []);
  const change = parseCodexLine(
    JSON.stringify({
      type: "item.completed",
      item: { type: "file_change", changes: [{ path: "src/a.ts", kind: "update" }] },
    }),
  );
  assert.deepEqual(change.lines, [{ kind: "tool", text: "파일 변경 update src/a.ts" }]);
  const failed = parseCodexLine(
    JSON.stringify({ type: "turn.failed", error: { message: "401 Unauthorized" } }),
  );
  assert.equal(failed.isError, true);
  assert.deepEqual(failed.lines, [{ kind: "error", text: "401 Unauthorized" }]);
});

test("구조화 결과 — Claude structured_output(실측 모양) · Codex 마지막 말 JSON", () => {
  // claude -p --output-format stream-json --verbose --json-schema '<스키마>' 실측(2026-11-02)
  const claude = parseClaudeLine(
    '{"type":"result","subtype":"success","is_error":false,"result":"{\\"summary\\":\\"2026-11-02\\",\\"items\\":[]}","structured_output":{"summary":"2026-11-02","items":[]},"session_id":"51d7d361"}',
  );
  assert.deepEqual(claude.structured, { summary: "2026-11-02", items: [] });
  const tool = parseClaudeLine(
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "StructuredOutput", input: {} }] },
    }),
  );
  assert.deepEqual(tool.lines, [{ kind: "tool", text: "결과 정리" }]);
  const codex = parseCodexLine(
    JSON.stringify({
      type: "item.completed",
      item: { type: "agent_message", text: '{"summary":"고쳤어요","skipped":[]}' },
    }),
  );
  assert.deepEqual(codex.structured, { summary: "고쳤어요", skipped: [] });
  assert.deepEqual(codex.lines, [{ kind: "text", text: "고쳤어요" }], "기록에는 JSON 대신 요약");
});

test("줄 나누기 — 한 JSON 이 두 조각에 걸쳐 와도 한 줄", () => {
  /** @type {string[]} */
  const lines = [];
  const split = lineSplitter((l) => lines.push(l));
  split.push('{"a":');
  split.push('1}\r\n{"b"');
  split.push(":2}\n\n");
  split.push('{"c":3}');
  split.flush();
  assert.deepEqual(lines, ['{"a":1}', '{"b":2}', '{"c":3}']);
});
