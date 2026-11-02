/**
 * 디자인 시안의 **화면별 값(Studio)** 과 **탭 배경**을 코드에 옮긴다 — 브라우저 편집기는 파일을 바꾸지 않는다.
 *
 *   node expo-lab/scripts/apply-design.mjs <시안.json | momentory-handoff-….json>           # 바뀔 것만 출력
 *   node expo-lab/scripts/apply-design.mjs <시안.json | momentory-handoff-….json> --write   # 실제로 쓴다
 *
 * - `studio` 의 등록표 키 → `src/design/studioApproved.json`
 * - `studio` 의 `tabBackground.<탭>` 키(「탭 배경 바꿔 보기」) → `src/design/tabBackgrounds.ts` 의
 *   `tabBackgroundByTab` 리터럴. 값은 같은 파일 `tabBackgroundAssets` 에 **이미 있는 배경 id** 만 받는다 —
 *   새 배경 이미지는 그림을 넣고 `tabBackgroundAssets` 에 먼저 더한 뒤에 고른다
 *
 * 받는 파일: 편집기 내보내기(version 1 · 2)와 「AI에게 넘기기」 파일(`momentory-lab-handoff@1`).
 * 틀린 키 · 값이 **하나라도 있으면 아무 파일도 쓰지 않는다.** DS 토큰은 `apply-tokens.mjs` 몫이다.
 */
import { realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const approvedPath = path.join(root, "src/design/studioApproved.json");
const tabBackgroundsPath = path.join(root, "src/design/tabBackgrounds.ts");
export const TAB_BACKGROUND_PREFIX = "tabBackground.";
export const HANDOFF_FORMAT = "momentory-lab-handoff@1";
const assetIds = new Set([
  "rest-baba-sleep",
  "home-baba-idle",
  "home-baba-wave",
  "rest-records",
  "rest-treasures",
]);
const fontFamilies = new Set(["KyoboHandwriting2025lyb"]);
const alignments = new Set(["left", "center", "right"]);
const ranges = {
  "home.hero.borderRadius": [0, 40],
  "home.bubble.borderRadius": [0, 40],
  "home.bubble.paddingHorizontal": [8, 32],
  "home.bubbleText.fontSize": [18, 34],
  "home.bubbleText.letterSpacing": [-1, 4],
  "home.cta.paddingHorizontal": [12, 36],
  "rest.heading.fontSize": [22, 40],
  "rest.wishPaper.paddingLeft": [8, 28],
  "rest.wishSummary.fontSize": [16, 30],
  "rest.wishSummary.letterSpacing": [-1, 4],
  "rest.babaImage.opacity": [0.2, 1],
  "rest.wishPhoto.width": [80, 130],
  "rest.wishPhoto.rotation": [-15, 15],
  "archive.titleWrap.paddingHorizontal": [8, 32],
  "archive.title.fontSize": [24, 44],
  "archive.calendar.borderRadius": [0, 32],
  "my.profileCard.borderRadius": [0, 32],
  "my.profileCard.paddingHorizontal": [8, 32],
  "my.profileCard.shadowOpacity": [0, 0.4],
  "report.weekTitlePaper.paddingHorizontal": [8, 32],
  "report.weekTitlePaper.borderRadius": [0, 24],
  "report.weekTitle.fontSize": [24, 40],
  "report.weekTitle.letterSpacing": [-1, 4],
  "report.summary.minHeight": [100, 200],
};

export function validateDesign(design, approved) {
  if (typeof design !== "object" || design === null || Array.isArray(design))
    throw new Error("design must be an object");
  const expected = Object.keys(approved);
  if (
    Object.keys(design).length !== expected.length ||
    Object.keys(design).some((key) => !expected.includes(key))
  )
    throw new Error("Unknown or missing design keys");
  for (const key of expected) {
    const value = design[key];
    if (ranges[key]) {
      const [min, max] = ranges[key];
      if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
        throw new Error(`Invalid ${key}`);
    } else if (key.endsWith(".fontFamily")) {
      if (!fontFamilies.has(value)) throw new Error(`Invalid ${key}`);
    } else if (key.endsWith(".textAlign")) {
      if (!alignments.has(value)) throw new Error(`Invalid ${key}`);
    } else if (key === "rest.babaImage.assetId") {
      if (!assetIds.has(value)) throw new Error(`Invalid ${key}`);
    } else if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
      throw new Error(`Invalid ${key}`);
  }
  return Object.fromEntries(expected.map((key) => [key, design[key]]));
}

/**
 * 내보낸 파일 → 전체 Studio 디자인.
 * - version 1(옛 Design Studio): `design` 이 47개 키 전부다
 * - version 2(디자인 편집기): `studio` 는 승인본과 **다른 키만** 든다 — 승인본 위에 얹는다.
 *   같은 파일의 `tokens` 는 `apply-tokens.mjs` 몫이다
 */
export function designFromExport(exported, approved) {
  if (typeof exported !== "object" || exported === null || typeof exported.name !== "string")
    throw new Error("Unsupported Studio export");
  if (exported.version === 1) return exported.design;
  if (exported.version !== 2) throw new Error("Unsupported Studio export");
  const studio = exported.studio ?? {};
  if (typeof studio !== "object" || studio === null || Array.isArray(studio))
    throw new Error("studio must be an object");
  return { ...approved, ...studio };
}

/** 「AI에게 넘기기」 파일 → 편집기 내보내기(version 2) 모양. 다른 파일은 그대로 */
export function normalizeExport(exported) {
  if (typeof exported !== "object" || exported === null || exported.format !== HANDOFF_FORMAT)
    return exported;
  const toMap = (list, field) => {
    if (!Array.isArray(list)) throw new Error(`handoff ${field} must be an array`);
    return Object.fromEntries(
      list.map((item) => {
        if (typeof item !== "object" || item === null || typeof item.key !== "string")
          throw new Error(`handoff ${field} entry needs key/after`);
        return [item.key, item.after];
      }),
    );
  };
  return {
    version: 2,
    name: typeof exported.draft?.name === "string" ? exported.draft.name : "handoff",
    tokens: toMap(exported.tokens ?? [], "tokens"),
    studio: toMap(exported.studio ?? [], "studio"),
  };
}

/** `studio` 를 등록표 키와 탭 배경(`tabBackground.<탭>` → { 탭: 배경 id })으로 가른다 */
export function splitStudio(studio) {
  const rest = {};
  const tabBackgrounds = {};
  for (const [key, value] of Object.entries(studio ?? {})) {
    if (key.startsWith(TAB_BACKGROUND_PREFIX))
      tabBackgrounds[key.slice(TAB_BACKGROUND_PREFIX.length)] = value;
    else rest[key] = value;
  }
  return { studio: rest, tabBackgrounds };
}

/** `export const <name> = {` 의 중괄호 안쪽 { start, end } — 문자열 안의 괄호는 세지 않는다 */
function objectBody(text, name) {
  const head = new RegExp(`export const ${name}\\s*=\\s*\\{`).exec(text);
  if (!head) return null;
  const start = head.index + head[0].length;
  let depth = 1;
  let quote = null;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return { start, end: i };
  }
  return null;
}

/**
 * `src/design/tabBackgrounds.ts` 를 읽는다 — 배경 id 목록과, 탭마다 값 리터럴의 자리.
 * 모양이 예상과 다르면(블록이 없다 · 값이 리터럴이 아니다) 던진다 — 그때는 손으로 고친다.
 */
export function readTabBackgroundSource(text) {
  const assetsBody = objectBody(text, "tabBackgroundAssets");
  const byTabBody = objectBody(text, "tabBackgroundByTab");
  if (!assetsBody || !byTabBody)
    throw new Error(
      "src/design/tabBackgrounds.ts 에서 tabBackgroundAssets · tabBackgroundByTab 을 찾지 못했다 — 손으로 고친다",
    );
  const assets = [];
  const assetsText = text.slice(assetsBody.start, assetsBody.end);
  for (const match of assetsText.matchAll(/^\s*(["']?)([A-Za-z0-9_-]+)\1\s*:\s*\{/gm))
    assets.push(match[2]);
  const byTab = new Map();
  const byTabText = text.slice(byTabBody.start, byTabBody.end);
  for (const match of byTabText.matchAll(/^\s*(["']?)([^\s"':,]+)\1\s*:\s*(["'])([^"'\n]*)\3/gm)) {
    const valueStart =
      byTabBody.start + match.index + match[0].lastIndexOf(match[3] + match[4]) + 1;
    byTab.set(match[2], { value: match[4], start: valueStart, end: valueStart + match[4].length });
  }
  if (!assets.length || !byTab.size)
    throw new Error("src/design/tabBackgrounds.ts 의 모양이 예상과 다르다 — 손으로 고친다");
  return { assets, byTab };
}

/** 탭 배경 — 바꿀 것 · 거부할 것 · 바뀐 본문 */
export function planTabBackgrounds(wanted, text) {
  const source = readTabBackgroundSource(text);
  const changes = [];
  const refused = [];
  for (const [tab, id] of Object.entries(wanted)) {
    const current = source.byTab.get(tab);
    if (!current)
      refused.push({ tab, reason: `모르는 탭이다(${[...source.byTab.keys()].join(", ")})` });
    else if (typeof id !== "string" || !source.assets.includes(id))
      refused.push({
        tab,
        reason: `없는 배경 이미지다 — 고를 수 있는 것: ${source.assets.join(", ")} (새 그림은 tabBackgroundAssets 에 먼저 더한다)`,
      });
    else if (current.value !== id)
      changes.push({
        tab,
        before: current.value,
        after: id,
        start: current.start,
        end: current.end,
      });
  }
  let next = text;
  for (const change of [...changes].sort((a, b) => b.start - a.start))
    next = next.slice(0, change.start) + change.after + next.slice(change.end);
  return { changes, refused, next };
}

/** 줄 단위 전후 — 한 줄 안의 치환만 하므로 바뀐 줄만 보인다 */
function lineDiff(file, before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  const out = [`--- a/${file}`, `+++ b/${file}`];
  a.forEach((line, i) => {
    if (line !== b[i]) out.push(`@@ -${i + 1} +${i + 1} @@`, `-${line}`, `+${b[i]}`);
  });
  return `${out.join("\n")}\n`;
}

async function main() {
  const [, , inputPath, option] = process.argv;
  if (!inputPath || (option && option !== "--write"))
    throw new Error(
      "Usage: node expo-lab/scripts/apply-design.mjs <exported.json | momentory-handoff-*.json> [--write]",
    );
  const approved = JSON.parse(await readFile(approvedPath, "utf8"));
  const exported = normalizeExport(
    JSON.parse((await readFile(path.resolve(inputPath), "utf8")).replace(/^\uFEFF/, "")),
  );
  const v2 = exported?.version === 2;
  const { studio, tabBackgrounds } = splitStudio(v2 ? exported.studio : {});
  const next = validateDesign(
    designFromExport(v2 ? { ...exported, studio } : exported, approved),
    approved,
  );
  const changes = Object.keys(approved).filter((key) => approved[key] !== next[key]);
  // \uD0ED \uBC30\uACBD \u2014 \uD558\uB098\uB77C\uB3C4 \uAC70\uBD80\uB418\uBA74 studioApproved.json \uB3C4 \uC4F0\uC9C0 \uC54A\uB294\uB2E4
  let tabPlan = null;
  let tabText = "";
  if (Object.keys(tabBackgrounds).length) {
    tabText = await readFile(tabBackgroundsPath, "utf8");
    tabPlan = planTabBackgrounds(tabBackgrounds, tabText);
    if (tabPlan.refused.length) {
      for (const item of tabPlan.refused)
        process.stderr.write(`\uAC70\uBD80 ${TAB_BACKGROUND_PREFIX}${item.tab}: ${item.reason}\n`);
      throw new Error(
        `\uBC18\uC601\uD560 \uC218 \uC5C6\uB294 \uD0ED \uBC30\uACBD ${tabPlan.refused.length}\uAC1C \u2014 \uC544\uBB34 \uD30C\uC77C\uB3C4 \uC4F0\uC9C0 \uC54A\uC558\uB2E4`,
      );
    }
  }
  const tabChanges = tabPlan?.changes ?? [];
  for (const key of changes) process.stdout.write(`${key}: ${approved[key]} -> ${next[key]}\n`);
  for (const change of tabChanges)
    process.stdout.write(
      `${TAB_BACKGROUND_PREFIX}${change.tab}: ${change.before} -> ${change.after}\n`,
    );
  if (tabChanges.length)
    process.stdout.write(lineDiff("src/design/tabBackgrounds.ts", tabText, tabPlan.next));
  process.stdout.write(`${changes.length + tabChanges.length} change(s)\n`);
  const tokenCount = Object.keys(exported.tokens ?? {}).length;
  if (tokenCount)
    process.stdout.write(
      `DS 토큰 ${tokenCount}개는 이 스크립트가 다루지 않는다 — node expo-lab/scripts/apply-tokens.mjs 로 반영한다\n`,
    );
  if (option === "--write") {
    await writeFile(approvedPath, `${JSON.stringify(next, null, 2)}\n`);
    if (tabChanges.length) await writeFile(tabBackgroundsPath, tabPlan.next);
    const written = [approvedPath, ...(tabChanges.length ? [tabBackgroundsPath] : [])];
    process.stdout.write(
      `Updated ${written.map((file) => path.relative(root, file)).join(" · ")}. Review git diff and run validation before a PR.\n`,
    );
  }
}

// Node resolves module URLs through symlinks (including macOS's /var → /private/var).
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
