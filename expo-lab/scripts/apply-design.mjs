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
const fontFamilies = new Set(["Gaegu-Regular", "Gaegu-Bold", "KyoboHandwriting2025lyb"]);
const alignments = new Set(["left", "center", "right"]);
function validateHeroStructure(value) {
  if (!Array.isArray(value) || value.length > 8) throw new Error("Invalid home.hero.structure");
  const ids = new Set();let count = 0;
  const visit = (blocks, depth) => blocks.map((block) => {
    if (!block || typeof block !== "object" || Array.isArray(block) ||
      typeof block.id !== "string" || !/^[a-z][a-z0-9-]{0,39}$/.test(block.id) || ids.has(block.id) || ++count > 12)
      throw new Error("Invalid hero block");
    ids.add(block.id);
    if (block.kind === "text" && Object.keys(block).length === 3 && typeof block.text === "string" && block.text.trim() && block.text.length <= 80)
      return { id:block.id, kind:"text", text:block.text };
    if (block.kind === "group" && Object.keys(block).length === 3 && depth === 0 && Array.isArray(block.children) && block.children.length <= 6)
      return { id:block.id, kind:"group", children:visit(block.children,1) };
    throw new Error("Unsupported hero block");
  });
  return visit(value,0);
}
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
    if (key === "home.hero.structure") {
      validateHeroStructure(value);
    } else if (ranges[key]) {
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

async function main() {
  const [, , inputPath, option] = process.argv;
  if (!inputPath || (option && option !== "--write"))
    throw new Error("Usage: node expo-lab/scripts/apply-design.mjs <exported.json> [--write]");
  const approved = JSON.parse(await readFile(approvedPath, "utf8"));
  const exported = JSON.parse(
    (await readFile(path.resolve(inputPath), "utf8")).replace(/^\uFEFF/, ""),
  );
  if (exported.version !== 1 || typeof exported.name !== "string")
    throw new Error("Unsupported Studio export");
  const next = validateDesign(exported.design, approved);
  const changes = Object.keys(approved).filter((key) => JSON.stringify(approved[key]) !== JSON.stringify(next[key]));
  for (const key of changes) process.stdout.write(`${key}: ${approved[key]} -> ${next[key]}\n`);
  process.stdout.write(`${changes.length} change(s)\n`);
  if (option === "--write") {
    await writeFile(approvedPath, `${JSON.stringify(next, null, 2)}\n`);
    process.stdout.write(
      `Updated ${path.relative(root, approvedPath)}. Review git diff and run validation before a PR.\n`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
