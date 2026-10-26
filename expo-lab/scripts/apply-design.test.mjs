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

  delete design["unsupported.node.width"];
  design["home.hero.structure"] = [
    {
      id: "group-one",
      kind: "group",
      children: [{ id: "text-one", kind: "text", text: "오늘의 한 걸음" }],
    },
  ];
  await writeFile(input, JSON.stringify({ version: 1, name: "structured", design }));
  const structured = spawnSync(process.execPath, [copiedScript, input, "--write"], {
    encoding: "utf8",
  });
  assert.equal(structured.status, 0, structured.stderr);
  assert.deepEqual(
    JSON.parse(await readFile(copiedApproved, "utf8"))["home.hero.structure"],
    design["home.hero.structure"],
  );

  design["home.hero.structure"] = [{ id: "group-one", kind: "script", children: [] }];
  await writeFile(input, JSON.stringify({ version: 1, name: "rejected", design }));
  const blocked = spawnSync(process.execPath, [copiedScript, input, "--write"], {
    encoding: "utf8",
  });
  assert.equal(blocked.status, 1);
  assert.deepEqual(JSON.parse(await readFile(copiedApproved, "utf8"))["home.hero.structure"], [
    {
      id: "group-one",
      kind: "group",
      children: [{ id: "text-one", kind: "text", text: "오늘의 한 걸음" }],
    },
  ]);
});
