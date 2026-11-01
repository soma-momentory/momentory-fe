/**
 * 디자인 시안의 **DS 토큰**을 `src/design/ds/*.ts` 소스에 옮긴다 — 브라우저 편집기는 파일을 바꾸지 않는다.
 *
 *   node expo-lab/scripts/apply-tokens.mjs <내보낸 시안.json>            # 통합 diff 만 출력
 *   node expo-lab/scripts/apply-tokens.mjs <내보낸 시안.json> --write    # 검토 뒤 실제로 쓴다
 *   node expo-lab/scripts/apply-tokens.mjs --source-map                  # 편집기의 소스 지도 다시 만들기
 *   node expo-lab/scripts/apply-tokens.mjs --check-source-map            # 소스 지도가 최신인지(아니면 1)
 *
 * 키 = 내보낸 export 경로를 점으로 이은 것(`primary.heavy` · `text.body1.fontSize`). 키 하나가 소스의
 * **리터럴 하나**로 정확히 떨어질 때만 바꾼다 — 계산식(`withAlpha(...)` · 템플릿 · 다른 토큰 참조) ·
 * 배열 · 모듈 최상위 값 · 함수 · 두 파일에 같은 이름이 있는 키는 **하나라도 있으면 아무것도 쓰지 않는다.**
 * 쓴 뒤의 판정(대비 · 타입 · 시각)은 평소의 게이트(`npm run test` · contrast.test.ts)가 한다.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

/** 저장소 루트 — 테스트가 임시 사본을 가리킬 때만 `MOMENTORY_DESIGN_ROOT` 로 바꾼다 */
const root =
  process.env.MOMENTORY_DESIGN_ROOT ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const dsDir = path.join(root, "src/design/ds");
export const sourceMapPath = path.join(root, "expo-lab/src/design-editor/tokenSourceMap.json");

/** 묶음 export — 같은 객체를 다시 가리킬 뿐이라 키를 만들지 않는다(편집기 `tokens.ts` 와 같은 목록) */
export const AGGREGATE_EXPORTS = new Set(["color", "metrics", "typography", "ds", "default"]);

/** 계산식 미리보기 길이 */
const EXPR_PREVIEW = 80;

const COLOR_RE =
  /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+|1\.0+)\s*)?\))$/;
export const isColorString = (value) => typeof value === "string" && COLOR_RE.test(value.trim());

export async function listTokenFiles(dir = dsDir) {
  return (await readdir(dir))
    .filter((name) => name.endsWith(".ts") && name !== "index.ts" && !name.endsWith(".d.ts"))
    .sort();
}

const unwrap = (node) => {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  )
    current = current.expression;
  return current;
};

const propertyName = (name) => {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name))
    return name.text;
  return null;
};

const preview = (node, source) => node.getText(source).replace(/\s+/g, " ").slice(0, EXPR_PREVIEW);

/** 리터럴이면 { value, start, end } — 음수 숫자(`-2`)도 리터럴로 본다 */
function literalOf(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return { value: node.text, start: node.getStart(), end: node.getEnd() };
  if (ts.isNumericLiteral(node))
    return { value: Number(node.text), start: node.getStart(), end: node.getEnd() };
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(node.operand)
  )
    return { value: -Number(node.operand.text), start: node.getStart(), end: node.getEnd() };
  return null;
}

/**
 * 파일 하나의 토큰 잎을 전부 꺼낸다.
 * kind: literal(바꿀 수 있다) · typeScale(`text.*` 의 기준 pt — `style()` 인자) · derived(계산·참조) ·
 * array · topLevel(모듈 최상위 원시값) · function
 */
export function parseTokenSource(fileName, text) {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const entries = [];
  const push = (entry) => entries.push({ file: fileName, ...entry });

  const visit = (node, keyPath) => {
    const value = unwrap(node);
    if (ts.isObjectLiteralExpression(value)) {
      for (const property of value.properties) {
        if (ts.isPropertyAssignment(property)) {
          const name = propertyName(property.name);
          if (name === null) continue;
          visit(property.initializer, [...keyPath, name]);
        } else if (ts.isShorthandPropertyAssignment(property)) {
          push({
            key: [...keyPath, property.name.text].join("."),
            kind: "derived",
            expr: property.name.text,
          });
        } else if (ts.isMethodDeclaration(property)) {
          const name = propertyName(property.name);
          if (name !== null) push({ key: [...keyPath, name].join("."), kind: "function" });
        }
      }
      return;
    }
    const key = keyPath.join(".");
    if (ts.isArrayLiteralExpression(value)) return push({ key, kind: "array" });
    if (ts.isArrowFunction(value) || ts.isFunctionExpression(value))
      return push({ key, kind: "function" });
    // typography.ts 의 `style("medium", 16, 24)` — 크기·행간은 기준 pt 리터럴이고 런타임 값은 typeScale 을 곱한 것
    if (
      fileName === "typography.ts" &&
      keyPath[0] === "text" &&
      ts.isCallExpression(value) &&
      ts.isIdentifier(value.expression) &&
      value.expression.text === "style" &&
      value.arguments.length === 3
    ) {
      const [family, fontSize, lineHeight] = value.arguments;
      push({
        key: `${key}.fontFamily`,
        kind: "derived",
        expr: `fontFamily[${preview(family, source)}]`,
      });
      for (const [prop, arg] of [
        ["fontSize", fontSize],
        ["lineHeight", lineHeight],
      ]) {
        const literal = literalOf(unwrap(arg));
        if (literal && typeof literal.value === "number")
          push({ key: `${key}.${prop}`, kind: "typeScale", ...literal });
        else push({ key: `${key}.${prop}`, kind: "derived", expr: preview(arg, source) });
      }
      return;
    }
    const literal = literalOf(value);
    if (literal) return push({ key, kind: "literal", ...literal });
    push({ key, kind: "derived", expr: preview(value, source) });
  };

  for (const statement of source.statements) {
    const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      push({ key: statement.name.text, kind: "function" });
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const name = declaration.name.text;
      if (AGGREGATE_EXPORTS.has(name)) continue;
      const value = unwrap(declaration.initializer);
      if (ts.isObjectLiteralExpression(value)) visit(value, [name]);
      else if (ts.isArrowFunction(value) || ts.isFunctionExpression(value))
        push({ key: name, kind: "function" });
      else if (ts.isArrayLiteralExpression(value)) push({ key: name, kind: "array" });
      else push({ key: name, kind: "topLevel", expr: preview(value, source) });
    }
  }
  return entries;
}

/** ds 폴더 전체 — 키 → 항목. 두 파일에 같은 키가 있으면 `ambiguous` 로 남긴다 */
export async function readTokenSources(dir = dsDir) {
  const files = await listTokenFiles(dir);
  const texts = new Map();
  const byKey = new Map();
  for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf8");
    texts.set(file, text);
    for (const entry of parseTokenSource(file, text)) {
      const seen = byKey.get(entry.key);
      if (seen)
        byKey.set(entry.key, { ...seen, kind: "ambiguous", files: [seen.file, entry.file] });
      else byKey.set(entry.key, entry);
    }
  }
  return { files, texts, byKey };
}

/**
 * 편집기가 브라우저에서 쓰는 **소스 지도** — 리터럴이 아닌 잎만 적는다(리터럴은 런타임 값이 곧 정본).
 * 그래서 토큰 **값**이 바뀌어도 낡지 않고, 계산식·참조가 생기거나 없어질 때만 다시 만든다.
 */
export function buildSourceMap(byKey) {
  const keys = [...byKey.keys()].sort();
  const map = {};
  for (const key of keys) {
    const entry = byKey.get(key);
    if (entry.kind === "literal" || entry.kind === "array" || entry.kind === "function") continue;
    if (entry.kind === "topLevel") continue; // 런타임이 스스로 안다(모듈 최상위 원시값)
    if (entry.kind === "typeScale")
      map[key] = { file: entry.file, kind: "typeScale", base: entry.value };
    else if (entry.kind === "ambiguous")
      map[key] = { file: entry.files.join(" · "), kind: "ambiguous" };
    else map[key] = { file: entry.file, kind: "derived", expr: entry.expr };
  }
  return map;
}

export const formatSourceMap = (map) =>
  `${JSON.stringify(
    { $comment: "생성물 — node expo-lab/scripts/apply-tokens.mjs --source-map", entries: map },
    null,
    2,
  )}\n`;

/** 시안 키를 정규 키로 — `color.primary.heavy` · `typography.title2.fontSize` 같은 묶음 경로도 받는다 */
export function canonicalKey(key, byKey) {
  if (byKey.has(key)) return key;
  const [head, ...rest] = key.split(".");
  if (AGGREGATE_EXPORTS.has(head) && rest.length) {
    const stripped = rest.join(".");
    if (byKey.has(stripped)) return stripped;
    if (head === "typography" && byKey.has(`text.${stripped}`)) return `text.${stripped}`;
  }
  return key;
}

const REASONS = {
  derived: (entry) => `계산된 값이다(${entry.expr}) — 원본 식이나 가리키는 토큰을 고친다`,
  array: () => "배열이다 — 항목별 반영을 열지 않는다",
  topLevel: () => "모듈 최상위 값이다 — 편집기가 덮어쓰지 못하므로 시안에 있을 수 없다",
  function: () => "함수다",
  ambiguous: (entry) => `같은 키가 두 파일에 있다(${entry.files.join(", ")})`,
};

function literalText(entry, value) {
  if (typeof entry.value === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return { error: "숫자가 필요하다" };
    return { text: String(value) };
  }
  if (typeof value !== "string" || !value.trim() || /[\r\n]/.test(value) || value.length > 200)
    return { error: "한 줄 문자열이 필요하다" };
  if (isColorString(entry.value) && !isColorString(value))
    return { error: "색 토큰에는 #hex 나 rgb()/rgba() 만 넣는다" };
  return { text: JSON.stringify(value) };
}

/** 바꿀 목록을 만든다 — 거부가 하나라도 있으면 `refused` 에 모두 담는다 */
export function planTokenChanges(tokens, byKey) {
  const changes = [];
  const refused = [];
  if (typeof tokens !== "object" || tokens === null || Array.isArray(tokens))
    return { changes, refused: [{ key: "(tokens)", reason: "tokens 객체가 필요하다" }] };
  for (const [rawKey, value] of Object.entries(tokens)) {
    const key = canonicalKey(rawKey, byKey);
    const entry = byKey.get(key);
    if (!entry) {
      refused.push({ key: rawKey, reason: "src/design/ds 에 없는 키다" });
      continue;
    }
    if (entry.kind !== "literal" && entry.kind !== "typeScale") {
      refused.push({ key: rawKey, reason: REASONS[entry.kind](entry) });
      continue;
    }
    const next = literalText(entry, value);
    if (next.error) {
      refused.push({ key: rawKey, reason: next.error });
      continue;
    }
    if (entry.value === value) continue;
    changes.push({
      key,
      file: entry.file,
      start: entry.start,
      end: entry.end,
      before: entry.value,
      after: value,
      text: next.text,
    });
  }
  return { changes, refused };
}

export function applyChangesToText(text, changes) {
  let next = text;
  for (const change of [...changes].sort((a, b) => b.start - a.start))
    next = next.slice(0, change.start) + change.text + next.slice(change.end);
  return next;
}

/** 줄 수가 같은(한 줄 안의 치환) 두 본문의 통합 diff. 문맥 3줄 */
export function unifiedDiff(fileName, before, after, context = 3) {
  const a = before.split("\n");
  const b = after.split("\n");
  if (a.length !== b.length) throw new Error(`${fileName}: 줄 수가 바뀌는 치환은 지원하지 않는다`);
  const changed = a.map((line, i) => line !== b[i]).flatMap((diff, i) => (diff ? [i] : []));
  if (!changed.length) return "";
  const hunks = [];
  for (const index of changed) {
    const last = hunks[hunks.length - 1];
    if (last && index - last.end <= context * 2) last.end = index;
    else hunks.push({ start: index, end: index });
  }
  const out = [`--- a/src/design/ds/${fileName}`, `+++ b/src/design/ds/${fileName}`];
  for (const hunk of hunks) {
    const from = Math.max(0, hunk.start - context);
    const to = Math.min(a.length - 1, hunk.end + context);
    const length = to - from + 1;
    out.push(`@@ -${from + 1},${length} +${from + 1},${length} @@`);
    for (let i = from; i <= to; i++) {
      if (a[i] === b[i]) out.push(` ${a[i]}`);
      else out.push(`-${a[i]}`, `+${b[i]}`);
    }
  }
  return `${out.join("\n")}\n`;
}

/** 내보낸 시안 → tokens. v2(`tokens`+`studio`)만 토큰을 가진다 */
export function tokensFromExport(exported) {
  if (typeof exported !== "object" || exported === null) throw new Error("JSON 객체가 필요하다");
  if (exported.version === 1) return { name: exported.name, tokens: {}, studioCount: 0 };
  if (exported.version !== 2 || typeof exported.name !== "string")
    throw new Error("지원하지 않는 시안 파일이다(version 2 가 필요하다)");
  return {
    name: exported.name,
    tokens: exported.tokens ?? {},
    studioCount: Object.keys(exported.studio ?? {}).length,
  };
}

async function main(argv) {
  const [first, option] = argv;
  const { files, texts, byKey } = await readTokenSources();
  if (first === "--source-map" || first === "--check-source-map") {
    const next = formatSourceMap(buildSourceMap(byKey));
    if (first === "--source-map") {
      await writeFile(sourceMapPath, next);
      process.stdout.write(
        `${path.relative(root, sourceMapPath)} 를 다시 만들었다 (${files.length}개 파일)\n`,
      );
      return;
    }
    const current = await readFile(sourceMapPath, "utf8").catch(() => "");
    if (current.replace(/\r\n/g, "\n") !== next) {
      process.stderr.write(
        "토큰 소스 지도가 낡았다 — node expo-lab/scripts/apply-tokens.mjs --source-map\n",
      );
      process.exitCode = 1;
    } else process.stdout.write("토큰 소스 지도가 최신이다\n");
    return;
  }
  if (!first || (option && option !== "--write"))
    throw new Error(
      "사용법: node expo-lab/scripts/apply-tokens.mjs <내보낸 시안.json> [--write] | --source-map | --check-source-map",
    );
  const exported = JSON.parse((await readFile(path.resolve(first), "utf8")).replace(/^﻿/, ""));
  const { name, tokens, studioCount } = tokensFromExport(exported);
  const { changes, refused } = planTokenChanges(tokens, byKey);
  if (refused.length) {
    for (const item of refused) process.stderr.write(`거부 ${item.key}: ${item.reason}\n`);
    throw new Error(`반영할 수 없는 키 ${refused.length}개 — 아무 파일도 쓰지 않았다`);
  }
  const byFile = new Map();
  for (const change of changes)
    byFile.set(change.file, [...(byFile.get(change.file) ?? []), change]);
  const writes = [];
  for (const [file, fileChanges] of byFile) {
    const before = texts.get(file);
    const after = applyChangesToText(before, fileChanges);
    process.stdout.write(unifiedDiff(file, before, after));
    writes.push([file, after]);
  }
  process.stdout.write(
    `시안 「${name}」 — 토큰 ${changes.length}개 변경 · 파일 ${writes.length}개\n`,
  );
  if (studioCount)
    process.stdout.write(
      `Studio 속성 ${studioCount}개는 이 스크립트가 다루지 않는다 — node expo-lab/scripts/apply-design.mjs 로 반영한다\n`,
    );
  if (option === "--write") {
    for (const [file, after] of writes) await writeFile(path.join(dsDir, file), after);
    process.stdout.write("썼다. git diff 를 검토하고 npm run test(대비 검사 포함)를 돌린다.\n");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
