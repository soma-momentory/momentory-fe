import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const approvedPath = path.join(root, "src/design/studioApproved.json");
const ranges = {
  "home.hero.borderRadius": [0, 40],
  "home.bubble.borderRadius": [0, 40],
  "home.bubble.paddingHorizontal": [8, 32],
  "rest.wishPaper.paddingLeft": [8, 28],
  "archive.titleWrap.paddingHorizontal": [8, 32],
  "archive.title.fontSize": [24, 44],
  "my.profileCard.borderRadius": [0, 32],
  "my.profileCard.paddingHorizontal": [8, 32],
  "my.profileCard.shadowOpacity": [0, 0.4],
  "report.weekTitlePaper.paddingHorizontal": [8, 32],
  "report.weekTitle.fontSize": [24, 40],
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
  const changes = Object.keys(approved).filter((key) => approved[key] !== next[key]);
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
