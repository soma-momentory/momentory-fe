#!/usr/bin/env node
// 디자인 토큰 동기화 — 상류 `02_디자인시스템/theme.ts` → `src/design/theme.ts`
//
// 왜 복사하고 커밋까지 하는가:
//   momentory-fe 는 별도 저장소다. 상류 파일을 상대 경로로 import 하면
//   CI 와 새 개발자는 부모 저장소 없이 빌드할 수 없다. 그래서 생성물을 커밋한다.
//   대신 어느 원본에서 왔는지 헤더에 못박아 조용한 드리프트를 막는다.
//
//   node scripts/sync-theme.mjs            상류에서 다시 복사
//   node scripts/sync-theme.mjs --verify   커밋된 파일이 손대졌는지만 검사 (CI)
//
// 상류 토큰을 바꾸려면 여기가 아니라 `05_도구/lib.mjs` 를 고치고
// `node 05_도구/export-theme.mjs` 를 돌린 뒤 이 스크립트를 다시 실행한다.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const UPSTREAM_REPO = resolve(REPO, "..");
const SOURCE = join(UPSTREAM_REPO, "02_디자인시스템", "theme.ts");
const TARGET = join(REPO, "src", "design", "theme.ts");

const MARKER = "// @generated-sha256 ";
const DELIM = "\n// ─── 여기부터 상류 원본 ───\n";
const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

/** 헤더와 본문을 가른다. 본문만 해시한다 — 헤더에는 해시 자신이 들어 있다. */
function split(text) {
  const at = text.indexOf(DELIM);
  if (at === -1) return null;
  return { header: text.slice(0, at), body: text.slice(at + DELIM.length) };
}

function verify() {
  if (!existsSync(TARGET)) {
    fail(`${rel(TARGET)} 가 없다. \`npm run sync:theme\` 를 먼저 돌린다.`);
  }
  const text = readFileSync(TARGET, "utf8");
  const parts = split(text);
  if (!parts) fail(`${rel(TARGET)} 에 생성 헤더가 없다. 손으로 만든 파일인가?`);

  const line = parts.header.split("\n").find((l) => l.startsWith(MARKER));
  if (!line) fail(`${rel(TARGET)} 헤더에 ${MARKER.trim()} 줄이 없다.`);

  const recorded = line.slice(MARKER.length).trim();
  const actual = sha256(parts.body);
  if (recorded !== actual) {
    fail(
      `${rel(TARGET)} 가 생성 이후에 수정됐다.\n` +
        `  기록된 해시: ${recorded}\n` +
        `  실제 해시:   ${actual}\n` +
        `  이 파일은 생성물이다. 값을 바꾸려면 상류 05_도구/lib.mjs 를 고치고\n` +
        `  export-theme.mjs → npm run sync:theme 순서로 다시 만든다.`,
    );
  }
  console.log(`✓ ${rel(TARGET)} — 생성 이후 수정 없음 (${actual.slice(0, 12)}…)`);
}

function sync() {
  if (!existsSync(SOURCE)) {
    fail(
      `상류 원본을 찾을 수 없다: ${SOURCE}\n` +
        `  이 스크립트는 momentory-fe 가 부모 저장소 안에 있을 때만 돈다.\n` +
        `  커밋된 src/design/theme.ts 만으로 빌드는 되므로, 동기화가 필요할 때만 실행한다.`,
    );
  }

  const body = readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n");
  const hash = sha256(body);
  const header = [
    "// ⚠ 생성 파일 — 직접 고치지 말 것.",
    "//",
    "//   원본:   momentory/02_디자인시스템/theme.ts",
    "//   재생성: npm run sync:theme",
    "//   검증:   npm run check:theme   (CI 가 돌린다)",
    "//",
    "// 값을 바꾸려면 상류 05_도구/lib.mjs 를 고치고 node 05_도구/export-theme.mjs 를",
    "// 돌린 뒤 여기로 다시 동기화한다. 이 파일을 고치면 다음 동기화에 덮인다.",
    "//",
    `// @generated-from  ${upstreamRef()}`,
    `${MARKER}${hash}`,
  ].join("\n");

  mkdirSync(dirname(TARGET), { recursive: true });
  const next = `${header}${DELIM}${body}`;
  const prev = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : null;

  writeFileSync(TARGET, next, "utf8");
  console.log(
    prev === next
      ? `= ${rel(TARGET)} — 변경 없음`
      : `✓ ${rel(TARGET)} — 갱신됨 (${hash.slice(0, 12)}…)`,
  );
}

/** 상류가 git 저장소면 커밋 SHA 를, 아니면 경로만 남긴다. */
function upstreamRef() {
  try {
    const sha = execFileSync("git", ["-C", UPSTREAM_REPO, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    const dirty = execFileSync(
      "git",
      ["-C", UPSTREAM_REPO, "status", "--porcelain", "02_디자인시스템/theme.ts"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return `momentory@${sha}${dirty ? " (미커밋 변경 있음)" : ""}`;
  } catch {
    return "momentory (git 정보 없음)";
  }
}

const rel = (p) => p.slice(REPO.length + 1).replace(/\\/g, "/");
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (process.argv.includes("--verify")) {
  verify();
} else {
  sync();
}
