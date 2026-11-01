import { realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const approvedPath = path.join(root, "src/design/studioApproved.json");
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

async function main() {
  const [, , inputPath, option] = process.argv;
  if (!inputPath || (option && option !== "--write"))
    throw new Error("Usage: node expo-lab/scripts/apply-design.mjs <exported.json> [--write]");
  const approved = JSON.parse(await readFile(approvedPath, "utf8"));
  const exported = JSON.parse(
    (await readFile(path.resolve(inputPath), "utf8")).replace(/^\uFEFF/, ""),
  );
  const next = validateDesign(designFromExport(exported, approved), approved);
  const changes = Object.keys(approved).filter((key) => approved[key] !== next[key]);
  for (const key of changes) process.stdout.write(`${key}: ${approved[key]} -> ${next[key]}\n`);
  process.stdout.write(`${changes.length} change(s)\n`);
  const tokenCount = Object.keys(exported.tokens ?? {}).length;
  if (tokenCount)
    process.stdout.write(
      `DS 토큰 ${tokenCount}개는 이 스크립트가 다루지 않는다 — node expo-lab/scripts/apply-tokens.mjs 로 반영한다\n`,
    );
  if (option === "--write") {
    await writeFile(approvedPath, `${JSON.stringify(next, null, 2)}\n`);
    process.stdout.write(
      `Updated ${path.relative(root, approvedPath)}. Review git diff and run validation before a PR.\n`,
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
