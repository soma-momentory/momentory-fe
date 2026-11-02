#!/usr/bin/env node
/**
 * `PreToolUse` 훅 — 저장소 규칙을 어기는 편집·명령을 **실행 전에** 거부한다.
 *
 *   Claude Code: Edit · Write · MultiEdit · NotebookEdit · Bash · PowerShell
 *   Codex:       apply_patch · Bash (`--agent=codex`)
 *
 * 판정은 `lib/rules.mjs` 하나에 있다. 여기는 입력을 풀어 넘기고 응답을 쓰기만 한다.
 * 끄기: `MOMENTORY_GUARD=0` (사람이 일부러 할 때만 — 에이전트가 스스로 켜고 끌 수 없다:
 * 훅은 에이전트 프로세스의 환경을 물려받고, 에이전트가 돌리는 명령의 환경은 받지 않는다).
 * 어떤 오류든 **통과**로 끝난다 — 가드가 깨졌다고 작업을 막지 않는다.
 */

import {
  agentFromArgv,
  currentBranch,
  denyPayload,
  inputCwd,
  locate,
  readHookInput,
  relOfShellPath,
  resolveDir,
  respond,
} from "./lib/runtime.mjs";
import {
  checkCommand,
  checkProtectedPath,
  isOff,
  isOn,
  needsBranch,
  parseApplyPatchPaths,
} from "./lib/rules.mjs";

const FILE_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
const SHELL_TOOLS = new Set(["Bash", "PowerShell", "shell", "exec_command", "local_shell"]);

function commandText(toolInput) {
  const c = toolInput?.command ?? toolInput?.cmd;
  if (Array.isArray(c)) return c.join(" ");
  return typeof c === "string" ? c : "";
}

function checkFiles(paths, cwd, labRun) {
  for (const p of paths) {
    const where = locate(p, cwd);
    const rule = checkProtectedPath(where?.rel, { labRun });
    if (rule) return `${where.rel} 를 고치려 한다 — ${rule.reason}`;
  }
  return null;
}

function main() {
  if (isOff(process.env.MOMENTORY_GUARD)) respond(null);

  const agent = agentFromArgv();
  const input = readHookInput();
  const tool = input.tool_name ?? "";
  const toolInput = input.tool_input ?? {};
  const cwd = inputCwd(input);
  const labRun = isOn(process.env.MOMENTORY_LAB_RUN);

  if (FILE_TOOLS.has(tool)) {
    const file = toolInput.file_path ?? toolInput.notebook_path ?? toolInput.path;
    const reason = checkFiles([file], cwd, labRun);
    respond(reason ? denyPayload(reason) : null);
  }

  // Codex 의 파일 편집 — tool_input.command 가 패치 본문이다
  if (
    tool === "apply_patch" ||
    (agent === "codex" && /\*\*\* Begin Patch/.test(commandText(toolInput)))
  ) {
    const reason = checkFiles(parseApplyPatchPaths(commandText(toolInput)), cwd, labRun);
    respond(reason ? denyPayload(reason) : null);
  }

  if (SHELL_TOOLS.has(tool) || (agent === "codex" && commandText(toolInput))) {
    const command = commandText(toolInput);
    if (!command) respond(null);
    const hit = checkCommand(command, {
      branch: needsBranch(command) ? currentBranch(cwd) : null,
      cwd,
      labRun,
      relOf: relOfShellPath,
      resolve: resolveDir,
    });
    respond(hit ? denyPayload(hit.reason) : null);
  }

  respond(null);
}

try {
  main();
} catch {
  process.exit(0);
}
