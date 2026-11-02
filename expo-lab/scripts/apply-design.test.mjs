import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("./apply-design.mjs", import.meta.url));
const approvedPath = fileURLToPath(
  new URL("../../src/design/studioApproved.json", import.meta.url),
);

test("design apply previews changes, writes only on request, and rejects unknown keys", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "momentory-design-apply-"));
  const scriptsDir = path.join(root, "expo-lab", "scripts");
  const designDir = path.join(root, "src", "design");
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(designDir, { recursive: true });
  const copiedScript = path.join(scriptsDir, "apply-design.mjs");
  const copiedApproved = path.join(designDir, "studioApproved.json");
  await copyFile(script, copiedScript);
  await copyFile(approvedPath, copiedApproved);
  const original = await readFile(copiedApproved, "utf8");
  const design = JSON.parse(original);
  design["rest.wishPaper.backgroundColor"] = "#123456";
  const input = path.join(root, "draft.json");
  await writeFile(input, JSON.stringify({ version: 1, name: "review", design }));

  const preview = spawnSync(process.execPath, [copiedScript, input], { encoding: "utf8" });
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /rest\.wishPaper\.backgroundColor/);
  assert.equal(await readFile(copiedApproved, "utf8"), original);

  const write = spawnSync(process.execPath, [copiedScript, input, "--write"], {
    encoding: "utf8",
  });
  assert.equal(write.status, 0, write.stderr);
  assert.equal(
    JSON.parse(await readFile(copiedApproved, "utf8"))["rest.wishPaper.backgroundColor"],
    "#123456",
  );

  // 디자인 편집기(version 2) — studio 는 바뀐 키만, tokens 는 apply-tokens 몫
  await writeFile(
    input,
    JSON.stringify({
      version: 2,
      kind: "momentory-design-draft",
      name: "editor",
      tokens: { "primary.heavy": "#335544" },
      studio: { "home.hero.borderRadius": 24 },
    }),
  );
  const v2 = spawnSync(process.execPath, [copiedScript, input, "--write"], { encoding: "utf8" });
  assert.equal(v2.status, 0, v2.stderr);
  assert.match(v2.stdout, /home\.hero\.borderRadius: 16 -> 24/);
  assert.match(v2.stdout, /DS 토큰 1개/);
  const afterV2 = JSON.parse(await readFile(copiedApproved, "utf8"));
  assert.equal(afterV2["home.hero.borderRadius"], 24);
  assert.equal(afterV2["rest.wishPaper.backgroundColor"], "#123456", "적지 않은 키는 그대로");

  await writeFile(
    input,
    JSON.stringify({ version: 2, name: "bad", tokens: {}, studio: { "nope.key": 1 } }),
  );
  const badV2 = spawnSync(process.execPath, [copiedScript, input], { encoding: "utf8" });
  assert.equal(badV2.status, 1);
  assert.match(badV2.stderr, /Unknown or missing design keys/);

  design["unsupported.node.width"] = 99;
  await writeFile(input, JSON.stringify({ version: 1, name: "invalid", design }));
  const invalid = spawnSync(process.execPath, [copiedScript, input, "--write"], {
    encoding: "utf8",
  });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Unknown or missing design keys/);
  assert.equal(
    JSON.parse(await readFile(copiedApproved, "utf8"))["rest.wishPaper.backgroundColor"],
    "#123456",
  );
});

const tabBackgroundsPath = fileURLToPath(
  new URL("../../src/design/tabBackgrounds.ts", import.meta.url),
);

/** 임시 저장소 사본 — 스크립트 · studioApproved.json · tabBackgrounds.ts */
async function sandbox() {
  const root = await mkdtemp(path.join(os.tmpdir(), "momentory-design-apply-tab-"));
  await mkdir(path.join(root, "expo-lab", "scripts"), { recursive: true });
  await mkdir(path.join(root, "src", "design"), { recursive: true });
  const copiedScript = path.join(root, "expo-lab", "scripts", "apply-design.mjs");
  const approvedFile = path.join(root, "src", "design", "studioApproved.json");
  const tabFile = path.join(root, "src", "design", "tabBackgrounds.ts");
  await copyFile(script, copiedScript);
  await copyFile(approvedPath, approvedFile);
  await copyFile(tabBackgroundsPath, tabFile);
  return { root, copiedScript, tabFile, approvedFile };
}

test("탭 배경(tabBackground.<탭>)은 tabBackgroundByTab 리터럴만 바꾸고, 넘기기 파일도 받는다", async () => {
  const { root, copiedScript, tabFile, approvedFile } = await sandbox();
  const originalTabs = await readFile(tabFile, "utf8");
  const input = path.join(root, "handoff.json");
  await writeFile(
    input,
    JSON.stringify({
      format: "momentory-lab-handoff@1",
      draft: { id: "d1", name: "탭 배경" },
      request: "",
      tokens: [],
      studio: [
        {
          key: "tabBackground.쉼터",
          label: "쉼터 탭 배경",
          before: "soft-olive",
          after: "warm-ivory",
        },
        { key: "tabBackground.홈", label: "홈 탭 배경", before: "warm-ivory", after: "soft-olive" },
        { key: "home.hero.borderRadius", label: "히어로 카드 · 모서리", before: 16, after: 20 },
      ],
      screens: [],
      lab: { platform: "ios", deviceId: "iphone-16", datasetId: "normal" },
    }),
  );

  const preview = spawnSync(process.execPath, [copiedScript, input], { encoding: "utf8" });
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /tabBackground\.쉼터: soft-olive -> warm-ivory/);
  assert.match(preview.stdout, /tabBackground\.홈: warm-ivory -> soft-olive/);
  assert.match(preview.stdout, /home\.hero\.borderRadius: 16 -> 20/);
  assert.match(preview.stdout, /^-\s+쉼터: "soft-olive",\r?$/m);
  assert.match(preview.stdout, /^\+\s+쉼터: "warm-ivory",\r?$/m);
  assert.match(preview.stdout, /3 change\(s\)/);
  assert.equal(await readFile(tabFile, "utf8"), originalTabs, "미리보기는 쓰지 않는다");

  const write = spawnSync(process.execPath, [copiedScript, input, "--write"], {
    encoding: "utf8",
  });
  assert.equal(write.status, 0, write.stderr);
  const written = await readFile(tabFile, "utf8");
  assert.match(written, /쉼터: "warm-ivory"/);
  assert.match(written, /홈: "soft-olive"/);
  assert.match(written, /보관함: "warm-ivory"/, "적지 않은 탭은 그대로");
  const blank = (text) => text.replace(/"(warm-ivory|soft-olive)"/g, '""');
  assert.equal(blank(written), blank(originalTabs), "배경 id 리터럴 말고는 한 글자도 안 바뀐다");
  assert.equal(JSON.parse(await readFile(approvedFile, "utf8"))["home.hero.borderRadius"], 20);
});

test("모르는 배경 id · 모르는 탭이 하나라도 있으면 아무 파일도 쓰지 않는다", async () => {
  const { root, copiedScript, tabFile, approvedFile } = await sandbox();
  const originalTabs = await readFile(tabFile, "utf8");
  const originalApproved = await readFile(approvedFile, "utf8");
  const input = path.join(root, "draft.json");
  for (const [studio, pattern] of [
    [{ "tabBackground.쉼터": "night-sky" }, /거부 tabBackground\.쉼터: 없는 배경 이미지다/],
    [{ "tabBackground.설정": "warm-ivory" }, /거부 tabBackground\.설정: 모르는 탭이다/],
    [{ "tabBackground.홈": 3 }, /없는 배경 이미지다/],
  ]) {
    await writeFile(
      input,
      JSON.stringify({
        version: 2,
        kind: "momentory-design-draft",
        name: "bad",
        tokens: {},
        studio: { ...studio, "home.hero.borderRadius": 30 },
      }),
    );
    const run = spawnSync(process.execPath, [copiedScript, input, "--write"], {
      encoding: "utf8",
    });
    assert.equal(run.status, 1, run.stdout);
    assert.match(run.stderr, pattern);
    assert.match(run.stderr, /아무 파일도 쓰지 않았다/);
    assert.equal(await readFile(tabFile, "utf8"), originalTabs);
    assert.equal(await readFile(approvedFile, "utf8"), originalApproved);
  }
});
