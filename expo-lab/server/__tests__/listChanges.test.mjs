import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";

import { makeRepo } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const { createLabAgent, limitConcurrency } = require("../index.js");

const TTL_MS = 3000;

/** @type {ReturnType<typeof makeRepo>} */
let fx;
/** @type {http.Server} */
let server;
let base = "";

before(async () => {
  fx = makeRepo();
  const lab = createLabAgent({
    repoRoot: fx.repo,
    changesTtlMs: TTL_MS,
    tools: async () => ({
      claude: null,
      codex: null,
      gh: null,
      versions: { claude: null, codex: null, gh: null },
    }),
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

/** @param {string} p @param {{ method?: string; json?: unknown }} [init] */
async function call(p, init = {}) {
  const headers = {
    Origin: base,
    Referer: `${base}/`,
    "X-Momentory-Lab": "1",
    ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}),
  };
  const res = await fetch(`${base}/__lab/agent${p}`, {
    method: init.method ?? "GET",
    headers,
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  return res.json();
}

/** @param {string} id */
const listed = async (id) =>
  (await call("/status")).workspaces.find((/** @type {{ id: string }} */ w) => w.id === id);

/** @param {string} wsPath @param {string} name */
const touch = (wsPath, name) => fs.writeFileSync(path.join(wsPath, name), "x");

test("목록은 기억한 변경 내역을 주고, 오래되면 뒤에서 읽어 다음 번에 새 값을 준다", async () => {
  const { workspace } = await call("/workspaces", {
    method: "POST",
    json: { kind: "edit", route: "/(tabs)/home" },
  });
  assert.equal((await listed(workspace.id)).changedCount, 0);

  touch(workspace.path, "by-hand.txt");
  assert.equal((await listed(workspace.id)).changedCount, 0, "기억한 동안은 git 을 돌리지 않는다");

  await new Promise((resolve) => setTimeout(resolve, TTL_MS + 50));
  assert.equal((await listed(workspace.id)).changedCount, 0, "오래된 값을 바로 주고 뒤에서 읽는다");
  for (let i = 0; i < 50 && (await listed(workspace.id)).changedCount === 0; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal((await listed(workspace.id)).changedCount, 1);
});

test("한 작업 공간을 열면 그 자리에서 새로 읽고, 목록도 그 값을 받는다", async () => {
  const { workspace } = await call("/workspaces", {
    method: "POST",
    json: { kind: "edit", route: "/(tabs)/archive" },
  });
  assert.equal((await listed(workspace.id)).changedCount, 0);

  touch(workspace.path, "by-hand.txt");
  const detail = await call(`/workspaces/${workspace.id}`);
  assert.equal(detail.workspace.changedCount, 1);
  assert.equal((await listed(workspace.id)).changedCount, 1);
});

test("재시작 뒤 — 있던 작업 공간을 목록으로 처음 읽어도 시간이 지나면 새로 읽는다", async () => {
  const { workspace } = await call("/workspaces", {
    method: "POST",
    json: { kind: "edit", route: "/(tabs)/report" },
  });
  // 같은 저장소를 새로 띄운 서버 — 기억한 것이 없어서 첫 읽기가 목록에서 일어난다
  const restarted = createLabAgent({
    repoRoot: fx.repo,
    changesTtlMs: 0,
    tools: async () => ({
      claude: null,
      codex: null,
      gh: null,
      versions: { claude: null, codex: null, gh: null },
    }),
  });
  const other = http.createServer((req, res) =>
    restarted.handle(req, res, () => res.writeHead(404).end()),
  );
  await new Promise((resolve) => other.listen(0, "127.0.0.1", () => resolve(undefined)));
  const address = /** @type {import("node:net").AddressInfo} */ (other.address());
  const origin = `http://localhost:${address.port}`;
  const changedCount = async () => {
    const res = await fetch(`${origin}/__lab/agent/status`, {
      headers: { Origin: origin, Referer: `${origin}/`, "X-Momentory-Lab": "1" },
    });
    const { workspaces } = await res.json();
    return workspaces.find((/** @type {{ id: string }} */ w) => w.id === workspace.id).changedCount;
  };
  try {
    assert.equal(await changedCount(), 0);
    touch(workspace.path, "by-hand.txt");
    let seen = 0;
    for (let i = 0; i < 50 && seen === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      seen = await changedCount();
    }
    assert.equal(seen, 1);
  } finally {
    await new Promise((resolve) => other.close(() => resolve(undefined)));
  }
});

test("limitConcurrency — 동시에 max 개까지만 돌고, 실패해도 다음 일이 이어진다", async () => {
  const limit = limitConcurrency(2);
  let active = 0;
  let peak = 0;
  const work = (/** @type {boolean} */ fail) => async () => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    if (fail) throw new Error("실패");
    return "끝";
  };
  const results = await Promise.allSettled(
    [false, true, false, false, false].map((fail) => limit(work(fail))),
  );
  assert.equal(peak, 2);
  assert.deepEqual(
    results.map((r) => r.status),
    ["fulfilled", "rejected", "fulfilled", "fulfilled", "fulfilled"],
  );
});
