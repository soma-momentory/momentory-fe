/**
 * Create 540px-wide gallery previews from the checked-in 1080px captures.
 * The originals are never edited. This maintenance script uses macOS sips;
 * generated PNGs are committed so CI and other platforms do not run it.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(labRoot, "assets/current-app");
const targetDir = path.join(labRoot, "assets/current-app-thumbnails");

await mkdir(targetDir, { recursive: true });
const files = (await readdir(sourceDir)).filter((name) => name.endsWith(".png")).sort();
if (files.length !== 38) throw new Error(`Expected 38 captures, found ${files.length}`);

for (const file of files) {
  execFileSync(
    "sips",
    [
      "-s",
      "format",
      "png",
      "--resampleWidth",
      "540",
      path.join(sourceDir, file),
      "--out",
      path.join(targetDir, file),
    ],
    { stdio: "ignore" },
  );
}

process.stdout.write(`Generated ${files.length} gallery thumbnails at 540px width.\n`);
