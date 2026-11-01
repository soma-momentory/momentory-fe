#!/usr/bin/env node
/**
 * `PostToolUse` 훅 — 파일을 고친 **직후** 세 가지를 한다.
 *
 *   1. prettier --write  (그 파일만 · `.prettierignore` 는 prettier 가 판정 · 1MB 넘으면 건너뜀)
 *   2. src/design/ds/** 를 고쳤으면 대비 테스트(contrast.test.ts)만 — 깨지면 모델에게 알린다
 *   3. app/** 에 화면 파일을 새로 썼으면 Lab 라우트 목록 동기화 확인 — 어긋나면 할 일을 알린다
 *
 *   Claude Code: Edit · Write · MultiEdit  ·  Codex: apply_patch (`--agent=codex`)
 *
 * 무엇도 **막지 않는다**(도구는 이미 돌았다). 알릴 것이 있을 때만 말한다.
 * 도구가 없거나 시간이 넘거나 깨지면 조용히 통과한다. 끄기: `MOMENTORY_POST_EDIT=0`.
 */

import fs from "node:fs";
import path from "node:path";

import {
  agentFromArgv,
  inputCwd,
  locate,
  localBin,
  postPayload,
  readHookInput,
  respond,
  runNode,
  tempFile,
} from "./lib/runtime.mjs";
import {
  checkProtectedPath,
  isDesignToken,
  isOff,
  isPrettierTarget,
  parseApplyPatchWrittenPaths,
  routeOf,
} from "./lib/rules.mjs";

const MAX_FORMAT_BYTES = 1024 * 1024;
const CONTRAST_TEST = "src/design/ds/__tests__/contrast.test.ts";
const CONTRAST_TIMEOUT_MS = Number(process.env.MOMENTORY_CONTRAST_TIMEOUT_MS) || 60000;

const stripAnsi = (s) => String(s ?? "").replace(/\u001b\[[0-9;]*m/g, "");

/** 이번 도구 호출이 쓴 파일들 — `{ file, created }` */
function writtenFiles(agent, input) {
  const tool = input.tool_name ?? "";
  const ti = input.tool_input ?? {};
  if (tool === "Write") return [{ file: ti.file_path, created: true }];
  if (tool === "Edit" || tool === "MultiEdit") return [{ file: ti.file_path, created: false }];
  const command = typeof ti.command === "string" ? ti.command : "";
  if (tool === "apply_patch" || (agent === "codex" && /\*\*\* Begin Patch/.test(command))) {
    const added = new Set(
      [...command.matchAll(/^\*\*\* (?:Add File|Move to):\s*(.+?)\s*$/gm)].map((m) => m[1]),
    );
    return parseApplyPatchWrittenPaths(command).map((file) => ({ file, created: added.has(file) }));
  }
  return [];
}

function formatFiles(root, files) {
  const prettier = localBin(root, "prettier/bin/prettier.cjs");
  if (!prettier || !files.length) return null;
  const r = runNode(prettier, ["--write", "--log-level", "warn", ...files], {
    cwd: root,
    timeoutMs: 20000,
  });
  if (r.ok || r.timedOut || r.error) return null;
  const firstError = stripAnsi(r.stderr)
    .split("\n")
    .find((l) => /\[error\]/.test(l));
  // 구문이 깨진 파일은 prettier 가 못 읽는다 — 알려만 준다(타입검사가 어차피 잡는다)
  return firstError
    ? `prettier 가 서식을 맞추지 못했다 — 구문을 확인한다: ${firstError.replace(/^\[error\]\s*/, "").slice(0, 300)}`
    : null;
}

function contrastCheck(root) {
  const jest = localBin(root, "jest/bin/jest.js");
  if (!jest || !fs.existsSync(path.join(root, CONTRAST_TEST))) return null;
  const out = tempFile("contrast.json");
  try {
    const r = runNode(
      jest,
      [CONTRAST_TEST, "--silent", "--json", `--outputFile=${out}`, "--ci", "--colors=false"],
      { cwd: root, timeoutMs: CONTRAST_TIMEOUT_MS },
    );
    if (r.timedOut || r.error) return null;
    let report;
    try {
      report = JSON.parse(fs.readFileSync(out, "utf8"));
    } catch {
      return null; // jest 가 결과를 못 남겼다 — 인프라 문제로 본다
    }
    const suite = report.testResults?.[0];
    const failed = (suite?.assertionResults ?? []).filter((a) => a.status === "failed");
    if (!failed.length) {
      if (report.numFailedTestSuites > 0 && suite?.message) {
        const line = stripAnsi(suite.message)
          .split("\n")
          .map((l) => l.trim())
          .find(Boolean);
        return {
          block: false,
          text: `대비 테스트(${CONTRAST_TEST})가 돌지 못했다 — 방금 고친 토큰 파일이 깨졌을 수 있다: ${line?.slice(0, 300) ?? "(메시지 없음)"}`,
        };
      }
      return null;
    }
    const lines = failed.slice(0, 8).map((a) => {
      const detail = stripAnsi(a.failureMessages?.[0] ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => /^(Expected|Received)/.test(l))
        .slice(0, 2)
        .join(" · ");
      const name = [...(a.ancestorTitles ?? []), a.title].filter(Boolean).join(" › ");
      return `- ${name || a.fullName}${detail ? ` (${detail.replace(/\s+/g, " ")})` : ""}`;
    });
    return {
      block: true,
      text: [
        `대비 테스트가 깨졌다 — ${CONTRAST_TEST} 에서 ${failed.length}건:`,
        ...lines,
        "",
        "이 쌍은 글자·UI 대비(WCAG AA — 본문 4.5 · 큰 글자/비텍스트 3.0)를 못 넘는다는 뜻이다.",
        "**값을 억지로 맞추거나 테스트를 고치지 않는다.** 바꾸려던 값을 되돌리거나, 사용자에게",
        "「이 색은 글자 대비(WCAG AA)를 못 넘는다 — 후보 둘」로 되묻는다.",
        "(expo-lab/HANDOFF.md 「AI 의 절차」 6 · PLAN.md A-5 · src/design/ds/color.ts 머리말)",
      ].join("\n"),
    };
  } finally {
    fs.rmSync(out, { force: true });
  }
}

function routeCheck(root, created) {
  const script = path.join(root, "expo-lab/scripts/gen-routes.mjs");
  if (!created.length || !fs.existsSync(script)) return null;
  const r = runNode(script, ["--check"], { cwd: root, timeoutMs: 20000 });
  if (r.timedOut || (r.error && r.status == null)) return null;

  const metaFile = path.join(root, "expo-lab/src/shell/routeMeta.ts");
  let meta = null;
  try {
    meta = fs.readFileSync(metaFile, "utf8");
  } catch {
    // routeMeta 가 없는 브랜치 — 제목 확인은 건너뛴다
  }
  const untitled = meta
    ? created.filter((route) => {
        const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return !new RegExp(`path:\\s*["'\`]${escaped}["'\`]`).test(meta);
      })
    : [];

  if (r.ok && !untitled.length) return null;
  const list = created.map((route) => `\`${route}\``).join(" · ");
  return [
    `새 화면 파일이 생겼다(${list}) — Expo Lab 화면 목록에도 올린다:`,
    ...(r.ok
      ? []
      : ["1. `npm run lab:routes` 로 expo-lab/src/shell/routes.generated.ts 를 다시 만든다"]),
    `${r.ok ? "1" : "2"}. expo-lab/src/shell/routeMeta.ts 의 알맞은 묶음에 \`{ path, title }\` 를 더한다 — 한국어 제목`,
    "   (바로 열면 다른 화면으로 넘기는 가드가 있으면 `openVia` · `hint` 도 둔다)",
    "안 하면 expo-lab/src/shell/__tests__/routes.test.ts 가 깨진다. (expo-lab/HANDOFF.md 「새 화면 만들기」 4)",
  ].join("\n");
}

function main() {
  if (isOff(process.env.MOMENTORY_POST_EDIT)) respond(null);
  const agent = agentFromArgv();
  const input = readHookInput();
  const cwd = inputCwd(input);

  /** root → { format: [], design: bool, routes: [] } */
  const byRoot = new Map();
  for (const { file, created } of writtenFiles(agent, input)) {
    const where = locate(file, cwd);
    if (!where?.root || where.rel == null) continue;
    if (checkProtectedPath(where.rel)) continue; // 보호 경로는 손대지 않는다
    let stat;
    try {
      stat = fs.statSync(where.abs);
    } catch {
      continue; // 지워졌다
    }
    const bucket = byRoot.get(where.root) ?? { format: [], design: false, routes: [] };
    byRoot.set(where.root, bucket);
    if (isPrettierTarget(where.rel) && stat.size <= MAX_FORMAT_BYTES) bucket.format.push(where.abs);
    if (isDesignToken(where.rel)) bucket.design = true;
    const route = created ? routeOf(where.rel) : null;
    if (route) bucket.routes.push(route);
  }

  const messages = [];
  let block = false;
  for (const [root, bucket] of byRoot) {
    const fmt = formatFiles(root, bucket.format);
    if (fmt) messages.push(fmt);
    if (bucket.design) {
      const contrast = contrastCheck(root);
      if (contrast) {
        messages.push(contrast.text);
        block ||= contrast.block;
      }
    }
    const routes = routeCheck(root, [...new Set(bucket.routes)]);
    if (routes) {
      messages.push(routes);
      block = true;
    }
  }
  respond(postPayload(agent, messages, { block }));
}

try {
  main();
} catch {
  process.exit(0);
}
