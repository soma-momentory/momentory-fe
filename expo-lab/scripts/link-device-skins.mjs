/**
 * 에뮬레이터 스킨(기기 외형 이미지)을 Lab 으로 복사한다.
 *
 *   node expo-lab/scripts/link-device-skins.mjs
 *   ANDROID_HOME=D:/Android/Sdk LAB_SKINS_DIR=D:/galaxy-skins node expo-lab/scripts/link-device-skins.mjs
 *
 * 어떤 스킨을 복사할지는 `src/lab-devices.ts` 의 `skin` 이 정한다. 스킨은 두 곳에서 온다.
 *
 * - `origin` 이 없거나 `android-sdk` — 로컬 Android SDK 의 `skins/<name>/`
 *   (`ANDROID_HOME` · `ANDROID_SDK_ROOT` · 기본 설치 경로 순으로 찾는다) → `back.webp` · `mask.webp`.
 * - `origin: "samsung"` — Samsung Developers 「Galaxy Emulator Skin」
 *   (https://developer.samsung.com/galaxy-emulator-skin — **삼성 계정 로그인 뒤** 내려받는다).
 *   압축을 `LAB_SKINS_DIR`(기본 `expo-lab/.device-skins-src/` · gitignore)에 풀어 둔다 —
 *   `<LAB_SKINS_DIR>/<name>/layout` 이 있어야 한다(이름은 대소문자 · `_` `-` 공백을 가리지 않고
 *   두 단계 아래까지 찾는다). `layout` 이 가리키는 배경 · 전경 그림을 `back.png` · `mask.png` 로 복사한다.
 *
 * 복사하기 전에 스킨 `layout` 의 수치(외형 크기 · 화면 자리 · 화면 크기)가 표와 같은지 본다 —
 * 다르면 화면이 엉뚱한 자리에 앉으므로 복사하지 않는다.
 *
 * 스킨 파일은 저장소에 담지 않는다 — `expo-lab/public/device-skins/` 와 `.device-skins-src/` 는
 * gitignore 다(`expo-lab/.gitignore`). 특히 삼성 스킨은 삼성의 그림이라 커밋하지 않는다.
 * Expo 웹 개발 서버가 `public/` 을 그대로 내주므로 셸이 `/device-skins/<스킨>/…` 로 읽는다.
 * 없으면 셸은 SVG 외형으로 그린다.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GEOMETRY_KEYS = [
  "frameWidth",
  "frameHeight",
  "displayX",
  "displayY",
  "displayWidth",
  "displayHeight",
];

/** `lab-devices.ts` 원문에서 `skin: { … }` 덩어리를 읽는다(중괄호 짝을 맞춰 안쪽 객체는 건너뛴다) */
export function readSkinTable(source) {
  const skins = [];
  const opener = /\bskin:\s*\{/g;
  let match;
  while ((match = opener.exec(source))) {
    let depth = 1;
    let i = match.index + match[0].length;
    let top = "";
    for (; i < source.length && depth > 0; i += 1) {
      const ch = source[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      else if (depth === 1) top += ch;
    }
    const name = /\bname:\s*"([^"]+)"/.exec(top)?.[1];
    if (!name) continue;
    const origin = /\borigin:\s*"([^"]+)"/.exec(top)?.[1] ?? "android-sdk";
    const skin = { name, origin };
    for (const key of GEOMETRY_KEYS) {
      const value = new RegExp(`\\b${key}:\\s*(\\d+)`).exec(top)?.[1];
      if (value !== undefined) skin[key] = Number(value);
    }
    skins.push(skin);
  }
  return skins;
}

/** 에뮬레이터 스킨 `layout` 에서 그림 이름과 화면 자리를 읽는다(SDK · 삼성 스킨 같은 형식) */
export function parseSkinLayout(text) {
  const background = /background\s*\{\s*image\s+(\S+)/.exec(text)?.[1];
  const mask = /foreground\s*\{[^}]*?\bmask\s+(\S+)/.exec(text)?.[1];
  const display = /display\s*\{([^}]*)\}/.exec(text)?.[1] ?? "";
  const layouts = text.slice(Math.max(0, text.search(/\blayouts\s*\{/)));
  const frame = /portrait\s*\{\s*width\s+(\d+)\s+height\s+(\d+)/.exec(layouts);
  const device = /\{\s*name\s+device\s+x\s+(\d+)\s+y\s+(\d+)/.exec(layouts);
  const num = (re) => {
    const value = re.exec(display)?.[1];
    return value === undefined ? undefined : Number(value);
  };
  return {
    background,
    mask,
    displayWidth: num(/\bwidth\s+(\d+)/),
    displayHeight: num(/\bheight\s+(\d+)/),
    frameWidth: frame ? Number(frame[1]) : undefined,
    frameHeight: frame ? Number(frame[2]) : undefined,
    displayX: device ? Number(device[1]) : undefined,
    displayY: device ? Number(device[2]) : undefined,
  };
}

/** 표와 `layout` 이 다른 수치 — 비어 있으면 같다 */
export function geometryMismatches(skin, layout) {
  return GEOMETRY_KEYS.filter((key) => skin[key] !== layout[key]).map(
    (key) => `${key} 표 ${skin[key]} · layout ${layout[key]}`,
  );
}

const loose = (name) => name.toLowerCase().replace(/[\s_-]+/g, "");

/** `<root>/<name>/layout` 을 찾는다 — 이름은 느슨하게, 두 단계 아래까지 */
export function findSkinDir(root, name) {
  if (!root || !existsSync(root)) return null;
  const exact = path.join(root, name);
  if (existsSync(path.join(exact, "layout"))) return exact;
  const queue = [{ dir: root, depth: 0 }];
  while (queue.length) {
    const { dir, depth } = queue.shift();
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (loose(entry) === loose(name) && existsSync(path.join(full, "layout"))) return full;
      if (depth < 1) queue.push({ dir: full, depth: depth + 1 });
    }
  }
  return null;
}

function main() {
  const labRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const target = path.join(labRoot, "public/device-skins");
  const sdk = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Android/Sdk"),
    path.join(os.homedir(), "Library/Android/sdk"),
    path.join(os.homedir(), "Android/Sdk"),
  ]
    .filter(Boolean)
    .find((dir) => existsSync(path.join(dir, "skins")));
  const samsungRoot = process.env.LAB_SKINS_DIR || path.join(labRoot, ".device-skins-src");

  const skins = readSkinTable(readFileSync(path.join(labRoot, "src/lab-devices.ts"), "utf8"));
  let copied = 0;
  for (const skin of skins) {
    const samsung = skin.origin === "samsung";
    const from = samsung
      ? findSkinDir(samsungRoot, skin.name)
      : sdk && path.join(sdk, "skins", skin.name);
    if (!from || !existsSync(path.join(from, "layout"))) {
      console.warn(
        samsung
          ? `건너뜀: ${skin.name} — 삼성 스킨이 없다. https://developer.samsung.com/galaxy-emulator-skin 에서` +
              ` 내려받아(삼성 계정 로그인) ${path.join(samsungRoot, skin.name)}/ 에 풀어 둔다(그 안에 layout).`
          : `건너뜀: ${skin.name} — Android SDK 의 skins/${skin.name} 가 없다(ANDROID_HOME 을 지정한다).`,
      );
      continue;
    }
    const layout = parseSkinLayout(readFileSync(path.join(from, "layout"), "utf8"));
    const mismatches = geometryMismatches(skin, layout);
    if (!layout.background || !layout.mask || mismatches.length) {
      console.warn(
        `건너뜀: ${skin.name} — ${from}/layout 이 표와 다르다: ` +
          (mismatches.join(" / ") || "배경 · 전경 그림 이름을 읽지 못했다"),
      );
      continue;
    }
    const ext = samsung ? "png" : "webp";
    const files = [
      [layout.background, `back.${ext}`],
      [layout.mask, `mask.${ext}`],
      ["layout", "layout"],
    ];
    const missing = files.find(([src]) => !existsSync(path.join(from, src)));
    const wrongType = files.find(([src, dest]) => path.extname(src) !== path.extname(dest));
    if (missing || wrongType) {
      console.warn(
        `건너뜀: ${skin.name} — ` +
          (missing ? `${missing[0]} 가 없다` : `${wrongType[0]} 는 ${ext} 가 아니다`),
      );
      continue;
    }
    mkdirSync(path.join(target, skin.name), { recursive: true });
    for (const [src, dest] of files) {
      copyFileSync(path.join(from, src), path.join(target, skin.name, dest));
    }
    copied += 1;
    console.log(`${skin.name} ← ${from}`);
  }
  console.log(
    `스킨 ${copied}/${skins.length}개를 ${path.relative(process.cwd(), target)} 에 복사했다`,
  );
  if (skins.length > 0 && copied === 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
