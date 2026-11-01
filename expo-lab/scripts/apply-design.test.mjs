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
