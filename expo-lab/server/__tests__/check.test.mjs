import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { parseHookOutput } = require("../check.js");

// 출력 모양은 .claude/hooks/codex-review.mjs 의 allow() · skip() · block() 그대로다
test("훅 출력 읽기 — block JSON 은 findings · skipped · PASS · 변경 없음", () => {
  const reason = "Codex 코드 리뷰가 문제를 찾았다 (2건). 종료 전에 고쳐라.\n\n1. [P1] a.ts";
  assert.deepEqual(parseHookOutput(`${JSON.stringify({ decision: "block", reason })}\n`), {
    status: "findings",
    message: "Codex 코드 리뷰가 문제를 찾았다 (2건). 종료 전에 고쳐라.",
    findings: reason,
  });
  const gate = JSON.stringify({
    decision: "block",
    reason: "검증 실패: `npm run lint`\n\n```\nerror\n```",
  });
  assert.equal(parseHookOutput(`Codex review gate skipped: x\n${gate}\n`).status, "findings");
  assert.equal(parseHookOutput("Codex review skipped: Codex 인증이 없다\n").status, "skipped");
  assert.equal(parseHookOutput("Codex review: PASS — 문제 없음\n").status, "pass");
  assert.equal(
    parseHookOutput("Codex review: 워킹 트리 변경 없음 — 리뷰 없이 종료한다.\n").status,
    "pass",
  );
  assert.equal(parseHookOutput("").status, "pass");
});
