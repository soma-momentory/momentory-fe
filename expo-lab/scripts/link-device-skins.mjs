/**
 * Android 에뮬레이터 스킨(기기 외형 이미지)을 로컬 Android SDK 에서 Lab 으로 복사한다.
 *
 *   node expo-lab/scripts/link-device-skins.mjs
 *   ANDROID_HOME=D:/Android/Sdk node expo-lab/scripts/link-device-skins.mjs
 *
 * SDK 파일은 저장소에 담지 않는다 — `expo-lab/public/device-skins/` 는 gitignore 다
 * (`expo-lab/.gitignore`). Expo 웹 개발 서버가 `public/` 을 그대로 내주므로 셸이
 * `/device-skins/<스킨>/back.webp` 로 읽는다. 없으면 셸은 SVG 외형으로 그린다.
 *
 * 어떤 스킨을 복사할지는 `src/lab-devices.ts` 의 `skin.name` 이 정한다.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(labRoot, "public/device-skins");

const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android/Sdk"),
  path.join(os.homedir(), "Library/Android/sdk"),
  path.join(os.homedir(), "Android/Sdk"),
].filter(Boolean);
const sdk = candidates.find((dir) => existsSync(path.join(dir, "skins")));
if (!sdk) {
  console.error("Android SDK 의 skins/ 를 찾지 못했다 — ANDROID_HOME 을 지정한다.");
  process.exit(1);
}

const devicesSource = readFileSync(path.join(labRoot, "src/lab-devices.ts"), "utf8");
const skinNames = [...devicesSource.matchAll(/skin:\s*\{\s*name:\s*"([^"]+)"/g)].map((m) => m[1]);

let copied = 0;
for (const name of skinNames) {
  const from = path.join(sdk, "skins", name);
  if (!existsSync(from)) {
    console.warn(`건너뜀: ${from} 이 없다`);
    continue;
  }
  mkdirSync(path.join(target, name), { recursive: true });
  for (const file of ["back.webp", "mask.webp", "layout"]) {
    copyFileSync(path.join(from, file), path.join(target, name, file));
  }
  copied += 1;
  console.log(`${name} ← ${from}`);
}
console.log(`스킨 ${copied}개를 ${path.relative(process.cwd(), target)} 에 복사했다`);
