import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { stripAttribution } = require("../runs.js");

test("PR 본문 끝의 생성 도구 표기와 공저자 줄을 걷어 낸다", () => {
  const body = [
    "## 요약",
    "",
    "보관함 제목 종이 색을 바꾼다.",
    "",
    "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
  ].join("\n");
  assert.equal(stripAttribution(body), "## 요약\n\n보관함 제목 종이 색을 바꾼다.");

  const commit = "style: 색을 바꾼다\n\n본문\n\nCo-Authored-By: Claude <noreply@anthropic.com>";
  assert.equal(stripAttribution(commit), "style: 색을 바꾼다\n\n본문");
});

test("표기가 없으면 그대로 두고, 빈 값은 null 로", () => {
  assert.equal(stripAttribution("fix: 그대로\n\n본문"), "fix: 그대로\n\n본문");
  assert.equal(stripAttribution(null), null);
  assert.equal(stripAttribution("🤖 Generated with Codex"), null);
});
