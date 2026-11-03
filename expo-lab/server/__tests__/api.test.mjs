import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { PassThrough } from "node:stream";
import { after, before, test } from "node:test";

import { makeRepo, PNG_DATA_URL } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const { createLabAgent } = require("../index.js");

/** @type {{ file: string; args: string[]; cwd: string; stdin: string; env: NodeJS.ProcessEnv }[]} */
const spawned = [];
/** 다음 가짜 실행의 모양: structured(스키마 결과) · text(글 블록만 — 대체 경로) */
let mode = "structured";
/** 값이 있으면 그 약속이 풀릴 때까지 끝나지 않는다(「한 번에 하나」 시험) */
/** @type {Promise<void> | null} */
let hold = null;

const STRUCTURED = {
  summary: "카드 간격을 넓혔어요.",
  changedScreens: ["/(tabs)/home"],
  commitMessage: "feat: 홈 카드 간격을 넓힌다\n\n시안대로.",
  prBody: "## 변경 목적\n간격",
  neededImages: [{ what: "바바 손 흔들기", size: "120×120", where: "홈 카드 오른쪽 위" }],
  neededApis: [],
  skipped: [{ request: "탭바 모양 바꾸기", reason: "DESIGN.md 와 부딪힌다" }],
};

/** 가짜 claude — stdin 을 다 받으면 stream-json 몇 줄을 내고 끝난다. 실제 CLI 는 부르지 않는다. */
function fakeSpawn(
  /** @type {string} */ file,
  /** @type {string[]} */ args,
  /** @type {any} */ opts,
) {
  const child = /** @type {any} */ (new EventEmitter());
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.pid = undefined;
  let input = "";
  const kind = mode;
  const wait = hold;
  child.stdin.on("data", (/** @type {Buffer} */ c) => (input += c));
  child.stdin.on("end", async () => {
    spawned.push({ file, args, cwd: opts.cwd, stdin: input, env: opts.env });
    const session = '{"type":"system","subtype":"init","session_id":"sess-1"}';
    const tool = JSON.stringify({
      type: "assistant",
      message: {
        content: [{ type: "tool_use", name: "Bash", input: { command: "npm run typecheck" } }],
      },
    });
    const textFinal =
      "고쳤어요.\n\nCOMMIT_MESSAGE:\n~~~~\nfeat: 글 블록 제목\n\n본문.\n~~~~\n\nPR_BODY:\n~~~~\n## 변경 목적\n글\n~~~~";
    const final = kind === "structured" ? JSON.stringify(STRUCTURED) : textFinal;
    const text = JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: final }] },
    });
    const result = JSON.stringify({
      type: "result",
      subtype: "success",
      is_error: false,
      result: final,
      ...(kind === "structured" ? { structured_output: STRUCTURED } : {}),
    });
    child.stdout.write(`${session}\n${tool}\n`);
    if (wait) await wait;
    setTimeout(() => {
      child.stdout.write(`${text}\n${result}\n`);
      child.stdout.end();
      child.stderr.end();
      setTimeout(() => child.emit("close", 0), 5);
    }, 5);
  });
  return child;
}

/** 가짜 훅 — Stop 훅 입력을 받고 block(지적 1건)을 낸다. */
/** @type {string[]} */
const hookInputs = [];
function fakeHook(
  /** @type {string} */ _file,
  /** @type {string[]} */ args,
  /** @type {any} */ opts,
) {
  const child = /** @type {any} */ (new EventEmitter());
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  let input = "";
  child.stdin.on("data", (/** @type {Buffer} */ c) => (input += c));
  child.stdin.on("end", () => {
    hookInputs.push(
      JSON.stringify({
        input: JSON.parse(input),
        hook: args[0],
        env: opts.env.CODEX_REVIEW ?? null,
        labRun: opts.env.MOMENTORY_LAB_RUN ?? null,
      }),
    );
    const reason =
      "Codex 코드 리뷰가 문제를 찾았다 (1건). 종료 전에 고쳐라.\n\n1. [P1] app/(tabs)/home.tsx\n   문제: 간격 값이 하드코딩";
    child.stdout.end(`${JSON.stringify({ decision: "block", reason })}\n`);
    setTimeout(() => child.emit("close", 0), 5);
  });
  return child;
}

/** @type {ReturnType<typeof makeRepo>} */
let fx;
/** @type {http.Server} */
let server;
let base = "";
/** @type {string[]} */
const previewsStarted = [];

before(async () => {
  fx = makeRepo();
  const lab = createLabAgent({
    repoRoot: fx.repo,
    tools: async () => ({
      claude: { file: "claude-fake", prefix: [] },
      codex: null,
      gh: null,
      versions: { claude: "2.1.316 (Claude Code)", codex: null, gh: null },
    }),
    spawnImpl: /** @type {any} */ (fakeSpawn),
    checkSpawnImpl: /** @type {any} */ (fakeHook),
    startPreview: /** @type {any} */ (
      (/** @type {string} */ wsPath, /** @type {number} */ port) => {
        previewsStarted.push(wsPath);
        let status = "ready";
        return {
          port,
          get alive() {
            return status === "ready";
          },
          state: () => ({
            status,
            port,
            url: `http://localhost:${port}`,
            ready: status === "ready",
            error: null,
            startedAt: 0,
          }),
          stop: () => (status = "stopped"),
        };
      }
    ),
  });
  server = http.createServer((req, res) => lab.handle(req, res, () => res.writeHead(404).end()));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
  const address = /** @type {import("node:net").AddressInfo} */ (server.address());
  base = `http://localhost:${address.port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(() => resolve(undefined)));
  fx.cleanup();
});

/** @param {string} p @param {RequestInit & { json?: unknown }} [init] */
async function call(p, init = {}) {
  const headers = {
    Origin: base,
    Referer: `${base}/`,
    "X-Momentory-Lab": "1",
    ...(init.headers ?? {}),
  };
  const res = await fetch(`${base}/__lab/agent${p}`, {
    ...init,
    headers: init.json !== undefined ? { ...headers, "Content-Type": "application/json" } : headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** @param {string} id */
async function waitDone(id) {
  for (let i = 0; i < 100; i += 1) {
    const { body } = await call(`/workspaces/${id}/events?since=0`);
    if (body.run && body.run.status !== "running") return body;
    await new Promise((r) => setTimeout(r, 30));
  }
  throw new Error("끝나지 않았다");
}

test("머리글이 없는 POST · 출처 없는 GET 은 403", async () => {
  const res = await fetch(`${base}/__lab/agent/run`, {
    method: "POST",
    headers: { Origin: base },
    body: "{}",
  });
  assert.equal(res.status, 403);
  const bare = await fetch(`${base}/__lab/agent/status`);
  assert.equal(bare.status, 403);
});

test("상태 — CLI 유무 · 저장소 · 작업 공간은 아직 없다(패널을 여는 것만으로는 아무것도 안 만든다)", async () => {
  const { status, body } = await call("/status");
  assert.equal(status, 200);
  assert.deepEqual(body.available, { claude: true, codex: false, gh: false });
  assert.equal(body.git.branch, "main");
  assert.equal(body.git.dirty, false);
  assert.deepEqual(body.workspaces, []);
});

test("없는 CLI 로 지시하면 409 이고 작업 공간도 만들지 않는다", async () => {
  const { status, body } = await call("/run", {
    method: "POST",
    json: { agent: "codex", target: { kind: "edit", route: "/(tabs)/home" }, instruction: "x" },
  });
  assert.equal(status, 409);
  assert.match(body.error, /Codex/);
  assert.equal(fs.existsSync(path.join(fx.wsRoot, "tabs-home")), false);
});

test("첫 지시 — 작업 공간 · 미리보기를 만들고 · stdin 으로 프롬프트 · 블록과 세션을 남긴다 · 이어서는 --resume", async () => {
  const first = await call("/run", {
    method: "POST",
    json: {
      agent: "claude",
      target: {
        kind: "edit",
        route: "/(tabs)/home",
        title: "홈",
        file: "app/(tabs)/home.tsx",
        specId: "12",
      },
      instruction: "[화면] 홈 (12) · /(tabs)/home\n지시: 카드 간격을 넓혀줘",
      attachments: [
        { name: "baba.png", dataUrl: PNG_DATA_URL, purpose: "asset", note: "오른쪽 위" },
      ],
    },
  });
  assert.equal(first.status, 202);
  const ws = first.body.workspace;
  assert.equal(ws.id, "tabs-home");
  assert.equal(ws.kind, "edit");
  assert.match(ws.branch, /^lab\/tabs-home-\d{8}-\d{4}$/);
  assert.equal(previewsStarted.length, 1, "첫 실행과 함께 미리보기를 띄운다");

  const done = await waitDone(ws.id);
  assert.equal(done.run.status, "done");
  assert.equal(done.run.sessionId, "sess-1");
  assert.equal(done.run.blocks.commitMessage, "feat: 홈 카드 간격을 넓힌다\n\n시안대로.");
  assert.equal(done.run.summary, "카드 간격을 넓혔어요.");
  assert.deepEqual(done.run.result.skipped, STRUCTURED.skipped);
  assert.deepEqual(done.run.result.neededImages, STRUCTURED.neededImages);
  assert.ok(
    done.lines.some(
      (/** @type {any} */ l) => l.kind === "tool" && l.text === "$ npm run typecheck",
    ),
  );

  const call0 = spawned[0];
  assert.ok(call0);
  assert.equal(call0.cwd, ws.path);
  assert.equal(call0.env.CODEX_REVIEW, "0", "에이전트 실행에서는 Codex 리뷰 훅을 끈다");
  assert.equal(
    call0.env.MOMENTORY_LAB_RUN,
    "1",
    "Lab 실행 표시 — 훅이 알림을 끄고 설정 · 훅 파일을 지킨다",
  );
  assert.ok(call0.args.includes("--json-schema"));
  assert.ok(call0.stdin.includes("카드 간격을 넓혀줘"));
  assert.ok(call0.stdin.includes("커밋 · push · PR 을 하지 않는다"));
  assert.ok(call0.stdin.includes(`[첨부] ${path.join(ws.path, ".lab-attachments")}`));
  assert.ok(!call0.args.some((a) => a.includes("카드 간격")), "프롬프트는 명령줄에 없다");
  assert.ok(!call0.args.includes("--resume"));

  const detail = await call(`/workspaces/${ws.id}`);
  assert.equal(detail.body.blocks.commitMessage, "feat: 홈 카드 간격을 넓힌다\n\n시안대로.");
  assert.deepEqual(detail.body.baseOptions, ["main"]);
  assert.equal(detail.body.workspace.session.agent, "claude");

  const again = await call(`/workspaces/${ws.id}/run`, {
    method: "POST",
    json: { agent: "claude", instruction: "더 넓게" },
  });
  assert.equal(again.status, 202);
  await waitDone(ws.id);
  assert.deepEqual(spawned[1]?.args.slice(-2), ["--resume", "sess-1"]);
  assert.ok(spawned[1]?.stdin.includes("이어지는 지시"));
  assert.equal(previewsStarted.length, 1, "미리보기는 하나만");

  const sameRoute = await call("/run", {
    method: "POST",
    json: { agent: "claude", target: { kind: "edit", route: "/(tabs)/home" }, instruction: "또" },
  });
  assert.equal(sameRoute.body.workspace.id, ws.id, "같은 화면은 같은 작업 공간");
  await waitDone(ws.id);
});

test("SSE — event: run 으로 시작하고 줄을 id 와 함께 흘린다", async () => {
  const controller = new AbortController();
  const res = await fetch(`${base}/__lab/agent/workspaces/tabs-home/stream?since=0`, {
    headers: { Referer: `${base}/` },
    signal: controller.signal,
  });
  assert.equal(res.status, 200);
  assert.match(String(res.headers.get("content-type")), /text\/event-stream/);
  const reader = /** @type {ReadableStreamDefaultReader<Uint8Array>} */ (res.body?.getReader());
  let text = "";
  while (!text.includes("event: line"))
    text += new TextDecoder().decode((await reader.read()).value);
  controller.abort();
  assert.ok(text.startsWith("event: run\n"));
  assert.match(text, /id: 1\nevent: line\ndata: /);
});

test("새 화면 — kind 와 새 라우트가 목록에 실린다", async () => {
  const res = await call("/run", {
    method: "POST",
    json: {
      agent: "claude",
      target: {
        kind: "new-screen",
        slug: "Sleep Log",
        title: "잠 기록",
        parentSection: "rest",
        description: "잠든 시각",
      },
      reference: { name: "sketch.png", dataUrl: PNG_DATA_URL },
    },
  });
  assert.equal(res.status, 202);
  const ws = res.body.workspace;
  assert.equal(ws.id, "new-sleep-log");
  assert.equal(ws.kind, "new-screen");
  assert.match(ws.branch, /^lab\/new-sleep-log-/);
  await waitDone(ws.id);
  const prompt = spawned.at(-1)?.stdin ?? "";
  assert.ok(prompt.includes("「새 화면 만들기」"));
  assert.ok(prompt.includes("sketch.png · 용도: 참고용"));

  fs.mkdirSync(path.join(ws.path, "app", "rest"), { recursive: true });
  fs.writeFileSync(
    path.join(ws.path, "app", "rest", "sleep-log.tsx"),
    "export default function S() {}\n",
  );
  const list = await call("/workspaces");
  const entry = list.body.workspaces.find((/** @type {any} */ w) => w.id === ws.id);
  assert.deepEqual(entry.newRoutes, ["/rest/sleep-log"]);
  assert.equal(entry.status, "edited");
  assert.equal(entry.title, "잠 기록");

  const commit = await call(`/workspaces/${ws.id}/commit`, {
    method: "POST",
    json: { message: "feat: 잠 기록 화면" },
  });
  assert.equal(commit.status, 200);
  assert.equal(commit.body.workspace.status, "committed");
  assert.equal(
    (await call(`/workspaces/${ws.id}/commit`, { method: "POST", json: { message: "x" } })).status,
    409,
  );
});

test("AI 실행은 Lab 전체에서 한 번에 한 건 — 다른 화면에서 돌면 409 · 상태에 activeRuns", async () => {
  /** @type {() => void} */
  let release = () => {};
  hold = new Promise((r) => (release = () => r()));
  const first = await call("/workspaces/new-sleep-log/run", {
    method: "POST",
    json: { agent: "claude", instruction: "더" },
  });
  assert.equal(first.status, 202);
  hold = null;
  const other = await call("/run", {
    method: "POST",
    json: { agent: "claude", target: { kind: "edit", route: "/(tabs)/home" }, instruction: "x" },
  });
  assert.equal(other.status, 409);
  assert.equal(other.body.error, "다른 화면(잠 기록)에서 AI가 작업 중이에요");
  const status = await call("/status");
  assert.equal(status.body.activeRuns.length, 1);
  assert.equal(status.body.activeRuns[0].workspaceId, "new-sleep-log");
  assert.equal(status.body.activeRuns[0].title, "잠 기록");
  assert.equal(status.body.activeRuns[0].groupId, null);
  release();
  await waitDone("new-sleep-log");
  assert.deepEqual((await call("/status")).body.activeRuns, []);
});

test("스키마 결과가 없으면 글 블록(COMMIT_MESSAGE · PR_BODY)으로 대신한다", async () => {
  mode = "text";
  const res = await call("/workspaces/tabs-home/run", {
    method: "POST",
    json: { agent: "claude", instruction: "x" },
  });
  assert.equal(res.status, 202);
  const done = await waitDone("tabs-home");
  mode = "structured";
  assert.equal(done.run.result, null);
  assert.equal(done.run.blocks.commitMessage, "feat: 글 블록 제목\n\n본문.");
  assert.equal(done.run.blocks.prBody, "## 변경 목적\n글");
});

test("저장 전 검사 — 훅을 Stop 입력으로 한 번 · 지적이 있으면 findings", async () => {
  const ws = (await call("/workspaces/tabs-home")).body.workspace;
  fs.mkdirSync(path.join(ws.path, ".claude", "hooks"), { recursive: true });
  fs.writeFileSync(
    path.join(ws.path, ".claude", "hooks", "codex-review.mjs"),
    "// 가짜 — 실제로는 fakeHook 이 돈다\n",
  );
  fs.writeFileSync(path.join(ws.path, "app", "(tabs)", "home.tsx"), "// 고친 것\n");
  const started = await call(`/workspaces/${ws.id}/check`, { method: "POST" });
  assert.equal(started.status, 202);
  let check = started.body.check;
  for (let i = 0; i < 100 && check.status === "running"; i += 1) {
    await new Promise((r) => setTimeout(r, 20));
    check = (await call(`/workspaces/${ws.id}/check`)).body.check;
  }
  assert.equal(check.status, "findings");
  assert.match(check.findings, /\[P1\] app\/\(tabs\)\/home\.tsx/);
  const seen = JSON.parse(hookInputs.at(-1) ?? "{}");
  assert.equal(seen.input.hook_event_name, "Stop");
  assert.equal(seen.input.stop_hook_active, false);
  assert.equal(seen.input.cwd, ws.path);
  assert.match(seen.input.session_id, /^lab-tabs-home-/);
  assert.equal(seen.env, null, "검사에서는 CODEX_REVIEW=0 을 넘기지 않는다");
  assert.equal(seen.labRun, "1");
  assert.ok(seen.hook.endsWith(path.join(".claude", "hooks", "codex-review.mjs")));
  assert.equal(
    (await call("/workspaces")).body.workspaces.find((/** @type {any} */ w) => w.id === ws.id).check
      .status,
    "findings",
  );
});

test("AI 가 하지 않은 수정이 있는 작업 공간에는 새로 시작하지 않는다", async () => {
  const created = await call("/workspaces", {
    method: "POST",
    json: { kind: "edit", route: "/my/profile" },
  });
  assert.equal(created.status, 201);
  const ws = created.body.workspace;
  fs.writeFileSync(path.join(ws.path, "hand.txt"), "사람이 고친 것");
  const res = await call("/run", {
    method: "POST",
    json: { agent: "claude", target: { kind: "edit", route: "/my/profile" }, instruction: "x" },
  });
  assert.equal(res.status, 409);
  assert.match(res.body.error, /AI 가 하지 않은 수정/);
});

test("버리기 — 작업 공간 · 미리보기가 사라지고 원본 node_modules 는 그대로", async () => {
  const res = await call("/workspaces/tabs-home", { method: "DELETE" });
  assert.equal(res.status, 200);
  assert.equal(fs.existsSync(path.join(fx.wsRoot, "tabs-home")), false);
  assert.ok(fs.existsSync(fx.sentinel));
  assert.equal((await call("/workspaces/tabs-home")).status, 404);
  for (const id of ["new-sleep-log", "my-profile"])
    assert.equal((await call(`/workspaces/${id}`, { method: "DELETE" })).status, 200);
  assert.ok(fs.existsSync(fx.sentinel));
});
