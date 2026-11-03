// 「시안 여러 개」 — 같은 화면 · 같은 지시로 작업 공간 N개(한 묶음)를 만들고 동시에 돌린다(server/index.js).
// 가짜 CLI · 가짜 미리보기로만 돈다 — 실제 AI 는 부르지 않는다.
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { PassThrough } from "node:stream";
import { after, before, test } from "node:test";

import { makeRepo } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const { createLabAgent } = require("../index.js");
const { buildPrompt, MAX_VARIANTS, VARIANT_DIRECTIONS } = require("../prompt.js");

/** @type {{ cwd: string; stdin: string; env: NodeJS.ProcessEnv }[]} */
const spawned = [];
let running = 0;
let maxRunning = 0;
/** 값이 있으면 그 약속이 풀릴 때까지 실행이 끝나지 않는다 */
/** @type {Promise<void> | null} */
let hold = null;
/** 이 이름으로 끝나는 작업 공간은 띄우지 못한다 */
let spawnFailsFor = "";

/** 가짜 claude — 요약 첫 줄에 「방향: <작업 공간 폴더 이름>」 */
function fakeSpawn(
  /** @type {string} */ _file,
  /** @type {string[]} */ _args,
  /** @type {any} */ opts,
) {
  if (spawnFailsFor && opts.cwd.endsWith(spawnFailsFor)) throw new Error("띄우기 실패");
  const child = /** @type {any} */ (new EventEmitter());
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new PassThrough();
  child.pid = undefined;
  running += 1;
  maxRunning = Math.max(maxRunning, running);
  let input = "";
  const wait = hold;
  child.stdin.on("data", (/** @type {Buffer} */ c) => (input += c));
  child.stdin.on("end", async () => {
    spawned.push({ cwd: opts.cwd, stdin: input, env: opts.env });
    const summary = `방향: ${path.basename(opts.cwd)} 쪽\n카드를 고쳤어요.`;
    const structured = {
      summary,
      changedScreens: [],
      commitMessage: "feat: 시안",
      prBody: "",
      neededImages: [],
      neededApis: [],
      skipped: [],
    };
    child.stdout.write('{"type":"system","subtype":"init","session_id":"sess-v"}\n');
    if (wait) await wait;
    setTimeout(() => {
      child.stdout.write(
        `${JSON.stringify({ type: "result", subtype: "success", is_error: false, result: summary, structured_output: structured })}\n`,
      );
      child.stdout.end();
      child.stderr.end();
      setTimeout(() => {
        running -= 1;
        child.emit("close", 0);
      }, 5);
    }, 5);
  });
  return child;
}

/** @type {string[]} */
const previewsStarted = [];
/** @param {string} wsPath @param {number} port */
function fakePreview(wsPath, port) {
  previewsStarted.push(path.basename(wsPath));
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

/** @type {ReturnType<typeof makeRepo>} */
let fx;
/** @type {http.Server} */
let server;
let base = "";

before(async () => {
  fx = makeRepo();
  const lab = createLabAgent({
    repoRoot: fx.repo,
    tools: async () => ({
      claude: { file: "claude-fake", prefix: [] },
      codex: null,
      gh: null,
      versions: { claude: "test", codex: null, gh: null },
    }),
    spawnImpl: /** @type {any} */ (fakeSpawn),
    startPreview: /** @type {any} */ (fakePreview),
    maxPreviews: 2,
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
  const headers = { Origin: base, Referer: `${base}/`, "X-Momentory-Lab": "1" };
  const res = await fetch(`${base}/__lab/agent${p}`, {
    ...init,
    headers: init.json !== undefined ? { ...headers, "Content-Type": "application/json" } : headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

/** 아무것도 돌지 않을 때까지 */
async function waitIdle() {
  for (let i = 0; i < 300; i += 1) {
    const { body } = await call("/status");
    const busy = body.workspaces.some(
      (/** @type {any} */ w) => w.status === "working" || w.status === "starting",
    );
    if (body.activeRuns.length === 0 && !busy) return body;
    await new Promise((r) => setTimeout(r, 20));
  }
  throw new Error("실행이 끝나지 않았다");
}

const HOME = { kind: "edit", route: "/(tabs)/home", title: "홈", file: "app/(tabs)/home.tsx" };

test("시안 프롬프트 — 「시안 k / N」 · 맡은 방향 · 다른 시안이 맡은 방향 · 검사 범위", () => {
  const prompt = buildPrompt({
    agent: "claude",
    target: HOME,
    instruction: "지시: 카드를 더 눈에 띄게",
    workspace: { path: "/ws", branch: "lab/x", baseBranch: "main" },
    variant: { index: 2, total: 3 },
  });
  assert.ok(prompt.includes("[시안 2 / 3]"));
  assert.ok(prompt.includes(`이 시안이 맡은 방향: ${VARIANT_DIRECTIONS[1]}`));
  assert.ok(prompt.includes(`시안 1 이 맡은 방향(이쪽과 겹치지 않게): ${VARIANT_DIRECTIONS[0]}`));
  assert.ok(prompt.includes(`시안 3 이 맡은 방향(이쪽과 겹치지 않게): ${VARIANT_DIRECTIONS[2]}`));
  assert.ok(prompt.includes("「방향: …」"));
  // 시안은 초안이다 — 바뀐 파일만 검사하고 저장소 전체 검사는 시키지 않는다
  assert.ok(prompt.includes("고치고 바뀐 파일만 검사한다"));
  assert.ok(prompt.includes("--maxWorkers=2"));
  assert.ok(!prompt.includes("고치고 검사(npm run typecheck"));
  const plain = buildPrompt({
    agent: "claude",
    target: HOME,
    workspace: { path: "/ws", branch: "lab/x", baseBranch: "main" },
  });
  assert.ok(plain.includes("고치고 검사(npm run typecheck"), "시안이 아니면 전체 검사 그대로");
  assert.ok(!plain.includes("고치고 바뀐 파일만 검사한다"));
  // 시안이 둘이면 없는 시안 3 의 방향은 말하지 않는다
  const two = buildPrompt({
    agent: "claude",
    target: HOME,
    workspace: { path: "/ws", branch: "lab/x", baseBranch: "main" },
    variant: { index: 1, total: 2 },
  });
  assert.ok(two.includes("시안 2 이 맡은 방향"));
  assert.ok(!two.includes("시안 3 이 맡은 방향"));
  // 이어지는 지시(같은 세션)에는 다시 싣지 않는다
  const resumed = buildPrompt({
    agent: "claude",
    target: HOME,
    workspace: { path: "/ws", branch: "lab/x", baseBranch: "main" },
    resume: true,
    variant: { index: 2, total: 3 },
  });
  assert.ok(!resumed.includes("[시안 2 / 3]"));
  assert.equal(MAX_VARIANTS, 3);
});

test("시안 개수 검사 — 0 · 4 · 새 화면은 400 이고 아무것도 만들지 않는다", async () => {
  for (const count of [0, 4, 1.5]) {
    const res = await call("/variants", {
      method: "POST",
      json: { agent: "claude", target: HOME, instruction: "x", count },
    });
    assert.equal(res.status, 400);
  }
  const newScreen = await call("/variants", {
    method: "POST",
    json: {
      agent: "claude",
      target: { kind: "new-screen", slug: "a", title: "가" },
      instruction: "x",
      count: 2,
    },
  });
  assert.equal(newScreen.status, 400);
  assert.deepEqual((await call("/workspaces")).body.workspaces, []);
});

test("묶음 — 작업 공간 3개 · 같은 묶음 id · 시안 수만큼 동시에 돈다 · 미리보기는 저절로 켜지 않는다", async () => {
  /** @type {() => void} */
  let release = () => {};
  hold = new Promise((r) => (release = () => r()));
  // Expo 가 켠 NODE_ENV 는 에이전트에게 물려주지 않는다 — jest 가 없는 실패를 낸다
  const nodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  const res = await call("/variants", {
    method: "POST",
    json: { agent: "claude", target: HOME, instruction: "지시: 카드를 더 눈에 띄게", count: 3 },
  });
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  hold = null;
  assert.equal(res.status, 202);
  const { group, workspaces } = res.body;
  assert.equal(group.total, 3);
  assert.deepEqual(
    workspaces.map((/** @type {any} */ w) => w.id),
    ["tabs-home-s1", "tabs-home-s2", "tabs-home-s3"],
  );
  assert.deepEqual(
    workspaces.map((/** @type {any} */ w) => w.title),
    ["홈 · 시안 1", "홈 · 시안 2", "홈 · 시안 3"],
  );
  for (const [i, w] of workspaces.entries()) {
    assert.deepEqual(
      { id: w.group.id, index: w.group.index, total: w.group.total },
      { id: group.id, index: i + 1, total: 3 },
    );
  }
  // 응답이 올 때 셋 다 이미 돌고 있다 — 앞 시안을 기다리지 않는다
  assert.deepEqual(
    workspaces.map((/** @type {any} */ w) => w.status),
    ["working", "working", "working"],
  );
  assert.equal(running, 3);
  const during = (await call("/status")).body;
  assert.deepEqual(
    during.activeRuns.map((/** @type {any} */ r) => [r.workspaceId, r.groupId]),
    [
      ["tabs-home-s1", group.id],
      ["tabs-home-s2", group.id],
      ["tabs-home-s3", group.id],
    ],
  );
  // 묶음이 도는 동안 다른 지시는 받지 않는다 — 다른 화면도, 묶음의 시안에 이어서도, 새 묶음도
  const other = await call("/run", {
    method: "POST",
    json: { agent: "claude", target: { kind: "edit", route: "/my" }, instruction: "x" },
  });
  assert.equal(other.status, 409);
  assert.equal(other.body.error, "시안을 만드는 중이에요 — 다 끝난 뒤에 지시해요");
  assert.ok(
    !(await call("/workspaces")).body.workspaces.some((/** @type {any} */ w) => w.id === "my"),
    "받지 못한 지시로 작업 공간을 만들지 않는다",
  );
  const more = await call("/workspaces/tabs-home-s1/run", {
    method: "POST",
    json: { agent: "claude", instruction: "더" },
  });
  assert.equal(more.status, 409);
  const again = await call("/variants", {
    method: "POST",
    json: { agent: "claude", target: HOME, instruction: "x", count: 2 },
  });
  assert.equal(again.status, 409);
  release();

  const idle = await waitIdle();
  assert.equal(maxRunning, 3, "시안 수만큼 동시에 돈다");
  assert.deepEqual(spawned.map((s) => path.basename(s.cwd)).sort(), [
    "tabs-home-s1",
    "tabs-home-s2",
    "tabs-home-s3",
  ]);
  for (const index of [1, 2, 3]) {
    const stdin = spawned.find((s) => path.basename(s.cwd) === `tabs-home-s${index}`)?.stdin ?? "";
    assert.ok(stdin.includes(`[시안 ${index} / 3]`));
    assert.ok(stdin.includes(`이 시안이 맡은 방향: ${VARIANT_DIRECTIONS[index - 1]}`));
    assert.ok(stdin.includes("지시: 카드를 더 눈에 띄게"));
  }
  assert.ok(spawned.every((s) => s.env.NODE_ENV === undefined));
  assert.ok(spawned.every((s) => s.env.MOMENTORY_LAB_RUN === "1"));
  assert.deepEqual(previewsStarted, [], "시안의 미리보기는 시안 비교 화면이 켠다");
  const done = idle.workspaces.filter((/** @type {any} */ w) => w.group?.id === group.id);
  assert.deepEqual(
    done.map((/** @type {any} */ w) => w.summaryLine),
    ["방향: tabs-home-s1 쪽", "방향: tabs-home-s2 쪽", "방향: tabs-home-s3 쪽"],
  );
  // 같은 화면의 「이어서 맡기기」(라우트 열쇠)는 시안을 잡지 않는다 — 시안이 아닌 새 작업 공간
  const single = await call("/run", {
    method: "POST",
    json: { agent: "claude", target: HOME, instruction: "하나만" },
  });
  assert.equal(single.status, 202);
  assert.equal(single.body.workspace.id, "tabs-home");
  assert.equal(single.body.workspace.group, null);
  await waitIdle();
});

test("멈추기 — 도는 시안을 모두 멈춘다", async () => {
  /** @type {() => void} */
  let release = () => {};
  hold = new Promise((r) => (release = () => r()));
  const before = spawned.length;
  const res = await call("/variants", {
    method: "POST",
    json: {
      agent: "claude",
      target: { kind: "edit", route: "/my", title: "마이" },
      count: 3,
      instruction: "x",
    },
  });
  hold = null;
  assert.equal(res.status, 202);
  const groupId = res.body.group.id;
  const stop = await call(`/variants/${groupId}/stop`, { method: "POST" });
  assert.equal(stop.status, 200);
  assert.deepEqual(stop.body.stopped, ["my-s1", "my-s2", "my-s3"]);
  assert.deepEqual(stop.body.cancelled, []);
  release();
  const idle = await waitIdle();
  assert.equal(spawned.length - before, 3);
  const members = idle.workspaces.filter((/** @type {any} */ w) => w.group?.id === groupId);
  assert.deepEqual(
    members.map((/** @type {any} */ w) => w.lastRun.status),
    ["stopped", "stopped", "stopped"],
  );
  // 멈춘 뒤에는 다른 지시를 받는다
  const next = await call("/workspaces/my-s2/run", {
    method: "POST",
    json: { agent: "claude", instruction: "다시" },
  });
  assert.equal(next.status, 202);
  await waitIdle();
});

test("시안 하나를 못 띄워도 나머지는 돌고, 그 시안에 이유가 남는다", async () => {
  spawnFailsFor = "report-s2";
  const res = await call("/variants", {
    method: "POST",
    json: {
      agent: "claude",
      target: { kind: "edit", route: "/report", title: "리포트" },
      count: 3,
      instruction: "x",
    },
  });
  spawnFailsFor = "";
  assert.equal(res.status, 202);
  const idle = await waitIdle();
  const members = idle.workspaces.filter(
    (/** @type {any} */ w) => w.group?.id === res.body.group.id,
  );
  assert.deepEqual(
    members.map((/** @type {any} */ w) => w.lastRun.status),
    ["done", "failed", "done"],
  );
  assert.equal(members[1].lastRun.error, "시작하지 못했어요: 띄우기 실패");
});

test("나머지 시안 버리기 — keep 말고 같은 묶음만 지운다 · 미리보기도 끈다 · 원본 node_modules 는 그대로", async () => {
  const list = (await call("/workspaces")).body.workspaces;
  const groupId = list.find((/** @type {any} */ w) => w.id === "tabs-home-s2").group.id;
  assert.equal((await call(`/workspaces/tabs-home-s1/preview`, { method: "POST" })).status, 200);
  assert.equal((await call(`/variants/${groupId}`, { method: "DELETE" })).status, 400);
  assert.equal(
    (await call(`/variants/${groupId}?keep=my-s1`, { method: "DELETE" })).status,
    400,
    "다른 묶음의 시안은 keep 으로 받지 않는다",
  );
  const res = await call(`/variants/${groupId}?keep=tabs-home-s2`, { method: "DELETE" });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.removed, ["tabs-home-s1", "tabs-home-s3"]);
  const ids = (await call("/workspaces")).body.workspaces.map((/** @type {any} */ w) => w.id);
  assert.ok(ids.includes("tabs-home-s2"));
  assert.ok(ids.includes("tabs-home"), "같은 화면의 다른 작업은 남는다");
  assert.ok(ids.includes("my-s1") && ids.includes("my-s2") && ids.includes("my-s3"));
  assert.ok(!ids.includes("tabs-home-s1") && !ids.includes("tabs-home-s3"));
  assert.equal(fs.existsSync(path.join(fx.wsRoot, "tabs-home-s1")), false);
  assert.equal(
    (await call("/workspaces/tabs-home-s1/preview")).status,
    404,
    "버린 시안의 미리보기도 없다",
  );
  assert.ok(fs.existsSync(fx.sentinel));
});

test("미리보기 상한 — 넘으면 가장 오래 쓰지 않은 것을 끈다", async () => {
  previewsStarted.length = 0;
  // 상한 2(이 테스트의 maxPreviews) — tabs-home-s1 은 위에서 버렸다
  const open = async (/** @type {string} */ id) =>
    (await call(`/workspaces/${id}/preview`, { method: "POST" })).body;
  await open("my-s1");
  await open("my-s2");
  await new Promise((r) => setTimeout(r, 5));
  await open("my-s1"); // my-s1 을 다시 찾았다 — my-s2 가 가장 오래됐다
  await new Promise((r) => setTimeout(r, 5));
  const third = await open("my-s3");
  assert.equal(third.status, "ready");
  const state = async (/** @type {string} */ id) =>
    (await call(`/workspaces/${id}/preview`)).body.status;
  assert.equal(await state("my-s2"), "stopped");
  assert.equal(await state("my-s1"), "ready");
  assert.equal(await state("my-s3"), "ready");
  const status = (await call("/status")).body;
  assert.equal(status.maxPreviews, 2);
  const alive = status.workspaces.filter((/** @type {any} */ w) => w.preview?.ready);
  assert.equal(alive.length, 2);
});
