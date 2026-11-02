import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { after, before, test } from "node:test";

import { git, makeRepo, PNG_DATA_URL } from "./helpers.mjs";

const require = createRequire(import.meta.url);
const { WorkspaceStore, unlinkJunction, safeFileName, prCreateArgs } = require("../workspaces.js");

/** @type {ReturnType<typeof makeRepo>} */
let fx;
/** @type {InstanceType<typeof WorkspaceStore>} */
let store;
const now = new Date(2026, 10, 2, 21, 30);

/** origin/main 에만 있는 커밋 — 작업 공간은 이것에서 갈라져야 한다 */
let remoteMain = "";

before(() => {
  fx = makeRepo();
  // 원격 main 이 로컬보다 하나 앞서 있고, 사용자는 다른 브랜치에 있다 · 원격 추적 ref 도 아직 모른다
  git(fx.repo, ["push", "-q", "origin", "main"]);
  fs.writeFileSync(path.join(fx.repo, "REMOTE_ONLY.md"), "원격 main 에만 있다\n");
  git(fx.repo, ["add", "REMOTE_ONLY.md"]);
  git(fx.repo, ["commit", "-q", "-m", "docs: 원격에만"]);
  git(fx.repo, ["push", "-q", "origin", "main"]);
  remoteMain = git(fx.repo, ["rev-parse", "HEAD"]);
  git(fx.repo, ["reset", "-q", "--hard", "HEAD~1"]);
  git(fx.repo, ["update-ref", "-d", "refs/remotes/origin/main"]);
  git(fx.repo, ["switch", "-q", "-c", "feat/somewhere-else"]);
  store = new WorkspaceStore({ repoRoot: fx.repo });
});

test("기준은 지금 브랜치가 아니라 main — origin/main 최신을 받아 거기서 갈라진다", async () => {
  assert.equal(store.baseBranch, "main");
  const base = await store.resolveBase();
  assert.equal(base.sha, remoteMain);
  assert.equal(base.ref, "refs/remotes/origin/main");
  const local = new WorkspaceStore({ repoRoot: fx.repo, baseBranch: "feat/somewhere-else" });
  assert.equal(
    (await local.resolveBase()).ref,
    "refs/heads/feat/somewhere-else",
    "원격에 없으면 로컬",
  );
  await assert.rejects(
    new WorkspaceStore({ repoRoot: fx.repo, baseBranch: "nope" }).resolveBase(),
    /nope/,
  );
});
after(() => fx.cleanup());

const edit = {
  kind: "edit",
  route: "/(tabs)/home",
  title: "홈",
  file: "app/(tabs)/home.tsx",
  specId: "12",
};
const fresh = {
  kind: "new-screen",
  slug: "sleep-log",
  title: "잠 기록",
  section: "rest",
  description: "잠든 시각",
};

test("작업 공간 — 저장소 밖 형제 폴더 · lab/ 브랜치 · node_modules junction · 같은 화면은 재사용", async () => {
  const meta = await store.ensure(edit, now);
  assert.equal(meta.id, "tabs-home");
  assert.equal(meta.path, path.join(fx.wsRoot, "tabs-home"));
  assert.ok(!meta.path.startsWith(fx.repo + path.sep), "저장소 안에 만들지 않는다");
  assert.equal(meta.branch, "lab/tabs-home-20261102-2130");
  assert.equal(meta.baseBranch, "main");
  assert.equal(meta.baseSha, remoteMain);
  assert.ok(fs.existsSync(path.join(meta.path, "REMOTE_ONLY.md")), "origin/main 에서 갈라졌다");
  assert.equal(git(meta.path, ["branch", "--show-current"]), meta.branch);

  const link = path.join(meta.path, "node_modules");
  assert.ok(fs.lstatSync(link).isSymbolicLink(), "junction 이다");
  assert.equal(
    fs.realpathSync.native(link),
    fs.realpathSync.native(path.join(fx.repo, "node_modules")),
  );
  assert.equal(git(meta.path, ["status", "--porcelain"]), "", "junction 은 git 에 안 잡힌다");
  assert.equal(git(fx.repo, ["status", "--porcelain"]), "", "사용자 작업 트리는 그대로다");

  const again = await store.ensure({ ...edit, title: "다른 이름" }, new Date());
  assert.equal(again.id, meta.id);
  assert.equal(store.list().length, 1);
});

test("새 화면 작업 공간 — new-<slug> · lab/new-<slug>-<시각>", async () => {
  const meta = await store.ensure(fresh, now);
  assert.equal(meta.id, "new-sleep-log");
  assert.equal(meta.kind, "new-screen");
  assert.equal(meta.branch, "lab/new-sleep-log-20261102-2130");
  assert.equal(meta.route, null);
  assert.equal((await store.ensure(fresh)).id, meta.id);
});

test("첨부 — .lab-attachments/<실행>/ 에 원본 이름 그대로 · git 에서 빠진다", async () => {
  const meta = /** @type {any} */ (store.find(edit));
  const written = store.writeAttachments(meta, "r1", {
    attachments: [
      {
        name: "바바 카드.png",
        dataUrl: PNG_DATA_URL,
        purpose: "asset",
        note: "쉼터 카드 오른쪽 위",
      },
      { name: "바바 카드.png", dataUrl: PNG_DATA_URL },
      { name: "../../evil.png", dataUrl: PNG_DATA_URL },
      { name: "not-image", dataUrl: "data:text/plain;base64,aGk=" },
    ],
  });
  assert.equal(written.dir, path.join(meta.path, ".lab-attachments", "r1"));
  const names = written.files.map((f) => path.basename(f.path));
  assert.deepEqual(names, [
    "바바 카드.png",
    "바바 카드-2.png",
    ".._.._evil.png".replace(/^[.]+/, ""),
  ]);
  assert.ok(
    written.files.every((f) => path.dirname(f.path) === written.dir),
    "폴더 밖으로 못 나간다",
  );
  assert.equal(written.files[0]?.purpose, "asset");
  assert.equal(written.files[1]?.purpose, "reference");
  assert.ok(!("handoffPath" in written), "시안 파일은 더 쓰지 않는다");
  assert.equal(git(meta.path, ["status", "--porcelain", "-uall"]), "", "첨부는 git 에 안 올라간다");
});

test("바뀐 것 — 새 라우트 · 새 그림 · 썸네일 읽기", async () => {
  const meta = /** @type {any} */ (store.find(fresh));
  fs.mkdirSync(path.join(meta.path, "app", "rest"), { recursive: true });
  fs.writeFileSync(
    path.join(meta.path, "app", "rest", "sleep-log.tsx"),
    "export default function S() {}\n",
  );
  fs.writeFileSync(
    path.join(meta.path, "app", "rest", "_layout.tsx"),
    "export default function L() {}\n",
  );
  fs.mkdirSync(path.join(meta.path, "assets", "images"), { recursive: true });
  fs.writeFileSync(
    path.join(meta.path, "assets", "images", "baba.png"),
    Buffer.from(PNG_DATA_URL.split(",")[1] ?? "", "base64"),
  );
  const changes = await store.changes(meta);
  assert.equal(changes.fileCount, 3);
  assert.deepEqual(changes.newRoutes, ["/rest/sleep-log"]);
  assert.deepEqual(changes.newAssets, ["assets/images/baba.png"]);
  assert.equal(store.readImage(meta, "assets/images/baba.png")?.type, "image/png");
  assert.equal(store.readImage(meta, "../repo/app/(tabs)/home.tsx"), null);
  assert.equal(store.readImage(meta, "node_modules/pkg/SENTINEL"), null);
});

test("수정 저장(커밋) — git add -A · 메시지 그대로 · 바뀐 것 없으면 409", async () => {
  const meta = /** @type {any} */ (store.find(fresh));
  const message = "feat: 잠 기록 화면을 만든다\n\n쉼터에서 잠든 시각을 적는다.";
  const result = await store.commit(meta, message);
  assert.equal(result.ok, true);
  assert.equal(git(meta.path, ["log", "-1", "--format=%B"]), message);
  assert.equal(git(meta.path, ["status", "--porcelain"]), "");
  const changes = await store.changes(meta);
  assert.equal(changes.commits.length, 1);
  assert.deepEqual(changes.newRoutes, ["/rest/sleep-log"], "커밋 뒤에도 새 라우트는 남는다");
  const again = await store.commit(meta, message);
  assert.equal(again.ok, false);
  assert.equal(again.status, 409);
  assert.equal((await store.commit(meta, "  ")).status, 400);
});

test("검토 요청(PR) — 인자 모양 · push 뒤 gh 가 없으면 한 줄 안내 · 가짜 gh 로 PR 번호", async () => {
  assert.deepEqual(prCreateArgs("main", "lab/x", "-제목", "C:\\b.md"), [
    "pr",
    "create",
    "--base=main",
    "--head=lab/x",
    "--title=-제목",
    "--body-file=C:\\b.md",
  ]);
  const meta = /** @type {any} */ (store.find(fresh));
  assert.equal(
    (await store.createPr(meta, { title: "t", body: "b", base: "--evil" }, null)).status,
    400,
  );
  const noGh = await store.createPr(
    meta,
    { title: "feat: 잠 기록", body: "본문", base: "main" },
    null,
  );
  assert.equal(noGh.ok, false);
  assert.match(String(noGh.message), /gh/);
  assert.equal(
    git(fx.origin, ["rev-parse", meta.branch]),
    git(meta.path, ["rev-parse", "HEAD"]),
    "올라갔다",
  );

  const record = path.join(fx.tmp, "gh-args.json");
  const fakeGh = path.join(fx.tmp, "fake-gh.cjs");
  fs.writeFileSync(
    fakeGh,
    `const fs=require("fs");const a=process.argv.slice(2);const body=a.find(x=>x.startsWith("--body-file="));` +
      `fs.writeFileSync(${JSON.stringify(record)},JSON.stringify({a,body:fs.readFileSync(body.slice(12),"utf8")}));` +
      `console.log("https://github.com/soma-momentory/momentory-fe/pull/42");`,
  );
  const ok = await store.createPr(
    meta,
    { title: "feat: 잠 기록", body: "## 변경 목적\n잠", base: "main" },
    { file: process.execPath, prefix: [fakeGh] },
  );
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.pr, {
    number: 42,
    url: "https://github.com/soma-momentory/momentory-fe/pull/42",
  });
  const seen = JSON.parse(fs.readFileSync(record, "utf8"));
  assert.deepEqual(seen.a.slice(0, 5), [
    "pr",
    "create",
    "--base=main",
    `--head=${meta.branch}`,
    "--title=feat: 잠 기록",
  ]);
  assert.equal(seen.body, "## 변경 목적\n잠");
});

test("버리기 — junction 을 먼저 끊고 worktree 를 지운다 · 원본 node_modules 는 그대로 · 빈 브랜치만 지운다", async () => {
  const editMeta = /** @type {any} */ (store.find(edit));
  fs.writeFileSync(path.join(editMeta.path, "app", "(tabs)", "home.tsx"), "// 고친 것\n");
  const removed = await store.remove(editMeta.id);
  assert.deepEqual(removed, { ok: true });
  assert.ok(!fs.existsSync(editMeta.path));
  assert.ok(fs.existsSync(fx.sentinel), "원본 node_modules 가 살아 있다");
  assert.equal(
    git(fx.repo, ["branch", "--list", editMeta.branch]),
    "",
    "커밋 없는 브랜치는 지운다",
  );

  const newMeta = /** @type {any} */ (store.find(fresh));
  store.update(newMeta.id, { pr: null });
  assert.deepEqual(await store.remove(newMeta.id), { ok: true });
  assert.ok(fs.existsSync(fx.sentinel));
  assert.notEqual(
    git(fx.repo, ["branch", "--list", newMeta.branch]),
    "",
    "저장된 수정이 있는 브랜치는 남긴다",
  );
  assert.equal(store.list().length, 0);
  assert.equal(git(fx.repo, ["worktree", "list"]).split("\n").length, 1);
});

test("junction 끊기 — 링크가 아니면 손대지 않는다 · 없으면 그대로 통과", async () => {
  const dir = path.join(fx.tmp, "real-dir");
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "keep"), "x");
  assert.deepEqual(await unlinkJunction(dir), { ok: true, removed: false });
  assert.ok(fs.existsSync(path.join(dir, "keep")));
  assert.deepEqual(await unlinkJunction(path.join(fx.tmp, "nope")), { ok: true, removed: false });
  const link = path.join(fx.tmp, "link");
  fs.symlinkSync(dir, link, "junction");
  assert.deepEqual(await unlinkJunction(link), { ok: true, removed: true });
  assert.ok(fs.existsSync(path.join(dir, "keep")), "링크 너머는 그대로");
});

test("파일 이름 다듬기", () => {
  assert.equal(safeFileName("a/b\\c:d.png", "png"), "a_b_c_d.png");
  assert.equal(safeFileName("", "jpg"), "image.jpg");
  assert.equal(safeFileName("바바", "webp"), "바바.webp");
});
