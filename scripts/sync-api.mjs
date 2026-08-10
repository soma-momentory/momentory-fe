#!/usr/bin/env node
// 서버 API 계약 반입 — 개발 서버의 OpenAPI 문서 → `docs/api/openapi.json`
//
// 왜 받아서 커밋하는가:
//   계약이 서버에만 있으면 서버가 꺼져 있을 때 아무도 확인할 수 없고,
//   어제와 무엇이 달라졌는지도 알 수 없다. 스냅샷을 커밋하면 diff 가 그걸 말해준다.
//   `docs/spec/` 과 같은 성격이다 — **직접 고치지 않고 다시 받아서만 갱신한다.**
//
//   npm run sync:api                  .env 의 EXPO_PUBLIC_API_BASE_URL 에서 받는다
//   MOMENTORY_API=http://… npm run sync:api    주소를 직접 준다
//
// 서버는 springdoc 이라 JSON 으로 낸다 — 그래서 파일 이름이 `.yaml` 이 아니다.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const TARGET = join(REPO, "docs", "api", "openapi.json");
const DOC_PATH = "/v3/api-docs";
const TIMEOUT_MS = 20_000;

/** `.env` 는 앱이 읽는 값의 정본이다 — 여기서도 같은 줄을 본다 */
function baseUrlFromEnvFile() {
  const file = join(REPO, ".env");
  if (!existsSync(file)) return null;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*EXPO_PUBLIC_API_BASE_URL\s*=\s*(.*)$/.exec(line);
    if (match)
      return match[1]
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/\/+$/, "");
  }
  return null;
}

/** 엔드포인트 한 줄 목록 — 무엇이 늘고 줄었는지 눈으로 보게 한다 */
function operations(doc) {
  const out = [];
  for (const [path, methods] of Object.entries(doc.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      out.push(`${method.toUpperCase()} ${path}${op.summary ? ` — ${op.summary}` : ""}`);
    }
  }
  return out.sort();
}

const base = process.env.MOMENTORY_API?.replace(/\/+$/, "") || baseUrlFromEnvFile();
if (!base) {
  fail(
    "API 주소를 찾을 수 없다.\n" +
      "  .env 의 EXPO_PUBLIC_API_BASE_URL 을 채우거나 MOMENTORY_API 로 준다\n" +
      "  (예: MOMENTORY_API=http://127.0.0.1:8080 npm run sync:api).",
  );
}

const url = `${base}${DOC_PATH}`;
let doc;
try {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  // fail() 은 즉시 종료한다 — 아래로 흘러가지 않는다
  if (!response.ok) fail(`${url} → HTTP ${response.status}. 서버가 문서를 내주지 않는다.`);
  doc = await response.json();
} catch (error) {
  fail(
    `${url} 에서 문서를 받지 못했다 (${error?.name ?? "unknown"}).\n` +
      "  서버가 떠 있는지, .env 의 주소가 맞는지 본다.",
  );
}

const before = existsSync(TARGET) ? operations(JSON.parse(readFileSync(TARGET, "utf8"))) : null;
const after = operations(doc);

mkdirSync(dirname(TARGET), { recursive: true });
writeFileSync(TARGET, `${JSON.stringify(doc, null, 2)}\n`, "utf8");

console.log(`✓ docs/api/openapi.json — ${url} 에서 받음 (엔드포인트 ${after.length}개)`);
if (before != null) {
  for (const line of after.filter((x) => !before.includes(x))) console.log(`  + ${line}`);
  for (const line of before.filter((x) => !after.includes(x))) console.log(`  - ${line}`);
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}
