// @ts-check
/**
 * 에이전트 출력 한 줄 → 사람이 읽을 기록 줄. 최선만 다한다 — 모르는 모양은 버리고, 원문은 로그 파일에 남는다.
 *
 * - Claude `-p --output-format stream-json --verbose`: 한 줄에 JSON 하나.
 *   `system/init`(session_id) · `assistant`(content: text · tool_use) · `user`(tool_result) · `result`.
 * - Codex `exec --json`: JSONL. `thread.started`(thread_id) · `item.started|completed`
 *   (item.type: agent_message · reasoning · command_execution · file_change · mcp_tool_call · web_search · error)
 *   · `turn.completed` · `turn.failed` · `error`.
 *
 * 2026-11-02 이 PC 에서 둘 다 한 번씩 받아 본 실제 줄이 `__tests__/fixtures/` 에 있다.
 */

/** @typedef {"text" | "tool" | "result" | "error" | "stderr"} LineKind */
/** @typedef {{ kind: LineKind; text: string }} Line */
/** @typedef {{ lines: Line[]; sessionId?: string; finalText?: string; isError?: boolean; structured?: any }} Parsed */

/** 스키마 결과처럼 보이는 JSON 글이면 객체로(울타리 ```json 도 벗긴다). @param {unknown} text */
function asResultJson(text) {
  const raw = String(text ?? "")
    .trim()
    .replace(/^```(?:json)?\s*\n?|\n?```$/g, "");
  if (!raw.startsWith("{")) return null;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" && typeof obj.summary === "string" ? obj : null;
  } catch {
    return null;
  }
}

const clip = (/** @type {unknown} */ s, max = 2000) => {
  const text = String(s ?? "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
};

/** Claude 도구 호출 한 줄 요약. @param {string} name @param {any} input */
function describeClaudeTool(name, input) {
  const i = input ?? {};
  if (name === "Bash" || name === "PowerShell") return `$ ${clip(i.command, 300)}`;
  if (name === "Read" || name === "Edit" || name === "Write" || name === "NotebookEdit")
    return `${name} ${clip(i.file_path ?? i.notebook_path, 300)}`;
  if (name === "Grep" || name === "Glob") return `${name} ${clip(i.pattern, 200)}`;
  if (name === "Skill") return `Skill ${clip(i.skill ?? i.name, 100)}`;
  if (name === "TodoWrite") return "할 일 목록 정리";
  if (name === "StructuredOutput") return "결과 정리";
  return name;
}

/** @param {string} raw @returns {Parsed} */
function parseClaudeLine(raw) {
  /** @type {any} */
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return raw.trim() ? { lines: [{ kind: "text", text: clip(raw) }] } : { lines: [] };
  }
  /** @type {Parsed} */
  const out = { lines: [] };
  if (typeof obj?.session_id === "string") out.sessionId = obj.session_id;
  if (obj?.type === "assistant" && Array.isArray(obj.message?.content)) {
    for (const block of obj.message.content) {
      if (block?.type === "text" && String(block.text ?? "").trim()) {
        out.lines.push({ kind: "text", text: clip(block.text, 8000) });
        out.finalText = String(block.text);
      } else if (block?.type === "tool_use") {
        out.lines.push({ kind: "tool", text: describeClaudeTool(String(block.name), block.input) });
      }
    }
  } else if (obj?.type === "user" && Array.isArray(obj.message?.content)) {
    for (const block of obj.message.content) {
      if (block?.type === "tool_result" && block.is_error) {
        const content = Array.isArray(block.content)
          ? block.content.map((/** @type {any} */ c) => c?.text ?? "").join(" ")
          : block.content;
        out.lines.push({ kind: "tool", text: `↳ 거절 · 실패: ${clip(content, 300)}` });
      }
    }
  } else if (obj?.type === "result") {
    const isError = obj.is_error === true || (obj.subtype && obj.subtype !== "success");
    out.isError = Boolean(isError);
    if (typeof obj.result === "string") out.finalText = obj.result;
    // --json-schema 의 결과 — 2026-11-02 실측: result 줄의 structured_output (StructuredOutput 도구로 낸다)
    if (obj.structured_output && typeof obj.structured_output === "object")
      out.structured = obj.structured_output;
    out.lines.push(
      isError
        ? { kind: "error", text: clip(obj.result || obj.subtype || "실행이 실패했어요", 1000) }
        : { kind: "result", text: "끝났어요" },
    );
  }
  return out;
}

/** @param {string} raw @returns {Parsed} */
function parseCodexLine(raw) {
  /** @type {any} */
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return raw.trim() ? { lines: [{ kind: "text", text: clip(raw) }] } : { lines: [] };
  }
  /** @type {Parsed} */
  const out = { lines: [] };
  const type = obj?.type;
  if (type === "thread.started" && typeof obj.thread_id === "string") out.sessionId = obj.thread_id;
  else if (type === "item.started" || type === "item.completed") {
    const item = obj.item ?? {};
    const done = type === "item.completed";
    if (item.type === "agent_message" && done && String(item.text ?? "").trim()) {
      // --output-schema 를 주면 마지막 말이 JSON 이다 — 기록에는 요약만 보인다
      const structured = asResultJson(item.text);
      if (structured) out.structured = structured;
      out.lines.push({
        kind: "text",
        text: clip(structured ? structured.summary : item.text, 8000),
      });
      out.finalText = String(item.text);
    } else if (item.type === "command_execution") {
      if (!done) out.lines.push({ kind: "tool", text: `$ ${clip(item.command, 300)}` });
      else if (typeof item.exit_code === "number" && item.exit_code !== 0)
        out.lines.push({ kind: "tool", text: `↳ 종료 코드 ${item.exit_code}` });
    } else if (item.type === "file_change" && done) {
      const paths = (Array.isArray(item.changes) ? item.changes : [])
        .map((/** @type {any} */ c) => `${c?.kind ?? ""} ${c?.path ?? ""}`.trim())
        .join(", ");
      out.lines.push({ kind: "tool", text: `파일 변경 ${clip(paths, 400)}` });
    } else if (item.type === "mcp_tool_call" && !done) {
      out.lines.push({ kind: "tool", text: `${item.server ?? ""} ${item.tool ?? ""}`.trim() });
    } else if (item.type === "error" && done) {
      out.lines.push({ kind: "error", text: clip(item.message, 1000) });
    }
  } else if (type === "turn.completed") {
    out.lines.push({ kind: "result", text: "끝났어요" });
  } else if (type === "turn.failed") {
    out.isError = true;
    out.lines.push({ kind: "error", text: clip(obj.error?.message ?? "실행이 실패했어요", 1000) });
  } else if (type === "error") {
    out.isError = true;
    out.lines.push({ kind: "error", text: clip(obj.message ?? "실행이 실패했어요", 1000) });
  }
  return out;
}

/** @param {"claude" | "codex"} agent */
const parserFor = (agent) => (agent === "claude" ? parseClaudeLine : parseCodexLine);

/**
 * 스트림 조각을 줄 단위로 모은다(한 JSON 이 두 조각에 걸쳐 올 수 있다).
 * @param {(line: string) => void} onLine
 */
function lineSplitter(onLine) {
  let buffer = "";
  return {
    /** @param {Buffer | string} chunk */
    push(chunk) {
      buffer += chunk.toString();
      let index;
      while ((index = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, index).replace(/\r$/, "");
        buffer = buffer.slice(index + 1);
        if (line.trim()) onLine(line);
      }
    },
    flush() {
      if (buffer.trim()) onLine(buffer);
      buffer = "";
    },
  };
}

module.exports = { parseClaudeLine, parseCodexLine, parserFor, lineSplitter, asResultJson };
