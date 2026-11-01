import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildSourceMap,
  formatSourceMap,
  listTokenFiles,
  parseTokenSource,
  planTokenChanges,
  readTokenSources,
  sourceMapPath,
} from "./apply-tokens.mjs";

const script = fileURLToPath(new URL("./apply-tokens.mjs", import.meta.url));
const repoDs = fileURLToPath(new URL("../../src/design/ds", import.meta.url));
const modulesFile = fileURLToPath(new URL("../src/design-editor/tokenModules.ts", import.meta.url));

/** 저장소의 ds 폴더를 임시 루트로 복사한다 — `--write` 는 그쪽만 바꾼다 */
async function tempRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "momentory-apply-tokens-"));
  await mkdir(path.join(root, "src/design"), { recursive: true });
  await mkdir(path.join(root, "expo-lab/src/design-editor"), { recursive: true });
  await cp(repoDs, path.join(root, "src/design/ds"), { recursive: true });
  return root;
}

const run = (root, args) =>
  spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, MOMENTORY_DESIGN_ROOT: root },
  });

const exportFile = async (root, tokens, studio = {}) => {
  const file = path.join(root, "draft.json");
  await writeFile(
    file,
    JSON.stringify({ version: 2, kind: "momentory-design-draft", name: "검토", tokens, studio }),
  );
  return file;
};

test("소스를 리터럴 · 기준 pt · 계산식 · 배열 · 최상위 값으로 가른다", () => {
  const entries = new Map(
    parseTokenSource(
      "typography.ts",
      [
        'const HAND = "X";',
        "export const fontFamily = { hand: HAND } as const;",
        'export const gothicFamily = { regular: "Pretendard-Regular" } as const;',
        'export const text = { body1: style("medium", 16, 24), b: style("x", 14 * BOOST, 20) } as const;',
        'export const tilt = { a: -2, b: "66%" as const, c: 598 / 1024, d: [1, 2] };',
        'export const dot = "#BBD494";',
        "export const fn = (x: number) => x;",
      ].join("\n"),
    ).map((entry) => [entry.key, entry]),
  );
  assert.equal(entries.get("fontFamily.hand").kind, "derived");
  assert.equal(entries.get("gothicFamily.regular").kind, "literal");
  assert.deepEqual(
    [entries.get("text.body1.fontSize").kind, entries.get("text.body1.fontSize").value],
    ["typeScale", 16],
  );
  assert.equal(entries.get("text.body1.fontFamily").kind, "derived");
  assert.equal(entries.get("text.b.fontSize").kind, "derived");
  assert.equal(entries.get("text.b.lineHeight").kind, "typeScale");
  assert.equal(entries.get("tilt.a").value, -2);
  assert.equal(entries.get("tilt.b").value, "66%");
  assert.equal(entries.get("tilt.c").kind, "derived");
  assert.equal(entries.get("tilt.d").kind, "array");
  assert.equal(entries.get("dot").kind, "topLevel");
  assert.equal(entries.get("fn").kind, "function");
});

test("편집기의 소스 지도가 최신이고, 모든 ds 파일을 프레임이 불러온다", async () => {
  const { byKey } = await readTokenSources();
  assert.equal(
    (await readFile(sourceMapPath, "utf8")).replace(/\r\n/g, "\n"),
    formatSourceMap(buildSourceMap(byKey)),
    "낡았다 — node expo-lab/scripts/apply-tokens.mjs --source-map",
  );
  const loader = await readFile(modulesFile, "utf8");
  for (const file of await listTokenFiles())
    assert.match(
      loader,
      new RegExp(`src/design/ds/${file.replace(/\.ts$/, "")}"\\)`),
      `tokenModules.ts 에 ${file} 이 없다`,
    );
});

test("미리보기는 통합 diff 만 내고, --write 만 리터럴을 바꾼다", async () => {
  const root = await tempRoot();
  const colorPath = path.join(root, "src/design/ds/color.ts");
  const typographyPath = path.join(root, "src/design/ds/typography.ts");
  const originalColor = await readFile(colorPath, "utf8");
  const input = await exportFile(
    root,
    {
      "primary.heavy": "#335544",
      "color.label.normal": "rgba(10,20,30,0.9)",
      "typography.title2.fontSize": 30,
      "space.lg": 18,
    },
    { "home.hero.borderRadius": 24 },
  );

  const preview = run(root, [input]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /--- a\/src\/design\/ds\/color\.ts/);
  assert.match(preview.stdout, /^- {2}heavy: "#56755F",$/m);
  assert.match(preview.stdout, /^\+ {2}heavy: "#335544",$/m);
  assert.match(preview.stdout, /^\+ {2}normal: "rgba\(10,20,30,0\.9\)",$/m);
  assert.match(preview.stdout, /^\+ {2}title2: style\("bold", 30, 38\),$/m);
  assert.match(preview.stdout, /^\+ {2}lg: 18,$/m);
  assert.match(preview.stdout, /^@@ -\d+,\d+ \+\d+,\d+ @@$/m);
  assert.match(preview.stdout, /토큰 4개 변경 · 파일 3개/);
  assert.match(preview.stdout, /Studio 속성 1개/);
  assert.equal(await readFile(colorPath, "utf8"), originalColor, "미리보기는 쓰지 않는다");

  const write = run(root, [input, "--write"]);
  assert.equal(write.status, 0, write.stderr);
  const written = await readFile(colorPath, "utf8");
  assert.match(written, /heavy: "#335544",/);
  assert.equal(written.split("\n").length, originalColor.split("\n").length);
  assert.match(await readFile(typographyPath, "utf8"), /title2: style\("bold", 30, 38\),/);

  // 다시 돌리면 바뀔 것이 없다
  const again = run(root, [input]);
  assert.equal(again.status, 0, again.stderr);
  assert.match(again.stdout, /토큰 0개 변경/);
});

test("소스 리터럴로 떨어지지 않는 키가 하나라도 있으면 아무것도 쓰지 않는다", async () => {
  const root = await tempRoot();
  const colorPath = path.join(root, "src/design/ds/color.ts");
  const original = await readFile(colorPath, "utf8");
  const input = await exportFile(root, {
    "primary.heavy": "#335544",
    "fill.normal": "#FFFFFF",
    scheduleDot: "#FFFFFF",
    "bodyReleaseFinish.motes": 1,
    "text.buttonLabel.fontSize": 18,
    "nope.key": 1,
    "label.strong": "red",
  });
  const result = run(root, [input, "--write"]);
  assert.equal(result.status, 1);
  for (const key of [
    "fill.normal",
    "scheduleDot",
    "bodyReleaseFinish.motes",
    "text.buttonLabel.fontSize",
    "nope.key",
    "label.strong",
  ])
    assert.match(result.stderr, new RegExp(`거부 ${key.replace(/\./g, "\\.")}:`));
  assert.match(result.stderr, /아무 파일도 쓰지 않았다/);
  assert.equal(await readFile(colorPath, "utf8"), original);
});

test("두 파일에 같은 키가 있으면 모호하다고 거부한다", () => {
  const byKey = new Map();
  for (const [file, text] of [
    ["a.ts", 'export const paper = { ink: "#111111" };'],
    ["b.ts", 'export const paper = { ink: "#222222" };'],
  ])
    for (const entry of parseTokenSource(file, text)) {
      const seen = byKey.get(entry.key);
      byKey.set(entry.key, seen ? { ...seen, kind: "ambiguous", files: [seen.file, file] } : entry);
    }
  const { changes, refused } = planTokenChanges({ "paper.ink": "#333333" }, byKey);
  assert.equal(changes.length, 0);
  assert.match(refused[0].reason, /두 파일/);
});

test("「AI에게 넘기기」 파일(momentory-lab-handoff@1)의 tokens 목록도 받는다", async () => {
  const root = await tempRoot();
  const file = path.join(root, "momentory-handoff-검토-20261102-2130.json");
  await writeFile(
    file,
    JSON.stringify({
      format: "momentory-lab-handoff@1",
      createdAt: "2026-11-02T21:30:00+09:00",
      draft: { id: "d1", name: "넘기기" },
      request: "",
      tokens: [
        {
          key: "primary.heavy",
          label: "브랜드 초록 · 진하게",
          before: "#56755F",
          after: "#335544",
        },
      ],
      studio: [
        {
          key: "tabBackground.쉼터",
          label: "쉼터 탭 배경",
          before: "soft-olive",
          after: "warm-ivory",
        },
      ],
      screens: [],
      lab: { platform: "ios", deviceId: "iphone-16", datasetId: "normal" },
    }),
  );
  const preview = run(root, [file]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /^\+ {2}heavy: "#335544",$/m);
  assert.match(preview.stdout, /시안 「넘기기」 — 토큰 1개 변경/);
  assert.match(preview.stdout, /Studio 속성 1개/);
});
