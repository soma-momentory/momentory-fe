#!/usr/bin/env node
// iOS 출시 빌드의 Info.plist 권한 검사 — `npm run check:ios-release`
//
// 무엇을 보는가:
//   1. `expo config --type introspect` 를 **운영 설정**(MOMENTORY_BUILD_ENV=production)으로 돌려
//      플러그인 체인이 만들 Info.plist 를 받는다 — prebuild 없이 결과를 본다
//   2. 생성된 `ios/app/Info.plist` 가 있으면 그것도 같은 잣대로 본다(prebuild 뒤 최종 확인)
//
// 잣대:
//   - 개발 도구 · 미사용 권한이 **없어야** 한다 — Expo Dev Launcher 의 로컬 네트워크 · `_expo._tcp` ·
//     위치 Always · Motion · Reminders · Face ID
//   - 쓰는 권한은 **있어야** 한다 — 위치 「사용 중」 · 마이크 · 음성 인식 · 캘린더 · 사진
//   - 그 밖의 `*UsageDescription` 은 허용 목록 밖이면 실패다(새 문구가 조용히 들어오는 길을 막는다)
//   - 번들 ID `kr.momentory.app` · 운영 API 호스트. 버전 · 빌드 번호는 **찍기만** 한다(정본은 app.config.ts)
//
// 왜 따로 두는가:
//   플러그인 단위 테스트는 「지우는 함수가 맞게 지우나」만 본다. 1.4.0 Build 8 prebuild 에서 그 테스트가
//   통과하는데도 키가 남았다 — config-plugins 가 mod 를 등록 역순으로 돌려 정리가 dev-client 보다
//   먼저 돌았기 때문이다. 그래서 **실제 체인의 결과**를 본다(`plugins/withoutDevLauncherNetwork.ts`).
//
// 전제: `.env` 가 운영 주소(`EXPO_PUBLIC_API_BASE_URL=https://api.momentory.co.kr`)여야 한다 —
//   아니면 `app.config.ts` 의 운영 검증이 먼저 막는다(출시 절차와 같다 · docs/SETUP.md).
//   `.env` 값은 어디에도 찍지 않는다 — API 호스트 이름만 보인다.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const GENERATED_PLIST = join(REPO, "ios", "app", "Info.plist");

const BUNDLE_ID = "kr.momentory.app";
const PRODUCTION_API_HOST = "api.momentory.co.kr";
const EXPO_BONJOUR_SERVICE = "_expo._tcp";

/** 출시본에 있으면 안 되는 키 — 개발 도구 몫이거나 앱이 쓰지 않는 자원 */
const FORBIDDEN_KEYS = [
  "NSLocalNetworkUsageDescription", // expo-dev-launcher
  "NSLocationAlwaysUsageDescription", // expo-location 기본값 — 백그라운드 위치를 쓰지 않는다
  "NSLocationAlwaysAndWhenInUseUsageDescription",
  "NSMotionUsageDescription", // expo-location 기본값 — 움직임 감지를 쓰지 않는다
  "NSRemindersUsageDescription", // expo-calendar 기본값 — 2026-08 반려 원인
  "NSRemindersFullAccessUsageDescription",
  "NSFaceIDUsageDescription", // expo-secure-store 기본값 — Face ID 를 요청하지 않는다
];

/** 출시본에 **반드시** 있어야 하는 키 — 실제로 쓰는 권한(문구는 app.config.ts 가 정한다) */
const REQUIRED_KEYS = [
  "NSLocationWhenInUseUsageDescription", // 홈 · 일기 날씨
  "NSMicrophoneUsageDescription", // 회고 음성 입력
  "NSSpeechRecognitionUsageDescription",
  "NSCalendarsUsageDescription", // 일정 읽기
  "NSCalendarsFullAccessUsageDescription",
  "NSPhotoLibraryUsageDescription",
];

/** `*UsageDescription` 중 있어도 되는 것 전부 — 여기 없는 문구가 보이면 실패다 */
const ALLOWED_USAGE_KEYS = new Set(REQUIRED_KEYS);

/** 기본 문구의 흔적 — 플러그인이 넣는 영문 기본값은 전부 이 꼴이다 */
const DEFAULT_TEXT = /\$\(PRODUCT_NAME\)|Allow .* to |Expo Dev Launcher/;

/**
 * Info.plist 한 벌을 검사해 문제 목록을 돌려준다(비어 있으면 통과).
 * introspect 결과와 생성 파일 둘 다 같은 함수를 지난다.
 */
export function auditInfoPlist(plist) {
  const problems = [];

  for (const key of FORBIDDEN_KEYS) {
    if (key in plist) problems.push(`${key} 가 남아 있다 → ${JSON.stringify(plist[key])}`);
  }

  for (const key of REQUIRED_KEYS) {
    if (typeof plist[key] !== "string" || plist[key].trim() === "") {
      problems.push(`${key} 가 없다(쓰는 권한이다)`);
    }
  }

  for (const [key, value] of Object.entries(plist)) {
    if (!/UsageDescription$/.test(key)) continue;
    if (FORBIDDEN_KEYS.includes(key)) continue; // 위에서 이미 적었다
    if (!ALLOWED_USAGE_KEYS.has(key)) {
      problems.push(`허용 목록 밖의 권한 문구 ${key} → ${JSON.stringify(value)}`);
    } else if (typeof value === "string" && DEFAULT_TEXT.test(value)) {
      problems.push(`${key} 가 플러그인 기본 문구다 → ${JSON.stringify(value)}`);
    }
  }

  const services = plist.NSBonjourServices;
  if (Array.isArray(services) && services.includes(EXPO_BONJOUR_SERVICE)) {
    problems.push(`NSBonjourServices 에 ${EXPO_BONJOUR_SERVICE} 가 남아 있다`);
  }

  const ats = plist.NSAppTransportSecurity;
  if (ats && typeof ats === "object") {
    if (ats.NSAllowsLocalNetworking === true)
      problems.push("ATS NSAllowsLocalNetworking 이 켜져 있다");
    if (ats.NSAllowsArbitraryLoads === true)
      problems.push("ATS NSAllowsArbitraryLoads 가 켜져 있다");
  }

  const modes = plist.UIBackgroundModes;
  if (Array.isArray(modes) && modes.includes("location")) {
    problems.push("UIBackgroundModes 에 location 이 있다(백그라운드 위치를 쓰지 않는다)");
  }

  return problems;
}

function runIntrospect() {
  const env = {
    ...process.env,
    MOMENTORY_BUILD_ENV: "production",
    MOMENTORY_RELEASE_BUILD: "1",
    // 색 코드 · 대화형 출력이 JSON 에 섞이지 않게
    CI: "1",
    FORCE_COLOR: "0",
  };
  let stdout;
  try {
    stdout = execFileSync("npx", ["expo", "config", "--type", "introspect", "--json"], {
      cwd: REPO,
      env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    const stderr = String(error.stderr ?? "").trim();
    const summary = stderr
      .split("\n")
      .filter((line) => /\[production config\]|Error|error/.test(line))
      .slice(0, 5)
      .join("\n");
    throw new Error(`expo config --type introspect 가 실패했다.\n${summary || stderr.slice(-800)}`);
  }
  const start = stdout.indexOf("{");
  if (start < 0) throw new Error("introspect 출력에서 JSON 을 찾지 못했다");
  return JSON.parse(stdout.slice(start));
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return "(URL 아님)";
  }
}

function report(title, problems) {
  if (problems.length === 0) {
    console.log(`✅ ${title} — 통과`);
    return true;
  }
  console.log(`❌ ${title}`);
  for (const problem of problems) console.log(`   - ${problem}`);
  return false;
}

function main() {
  let ok = true;

  // 1. 운영 introspect
  const config = runIntrospect();
  const introspected = config._internal?.modResults?.ios?.infoPlist;
  if (!introspected) throw new Error("introspect 결과에 ios.infoPlist 가 없다");

  const identity = [];
  if (config.ios?.bundleIdentifier !== BUNDLE_ID) {
    identity.push(`bundleIdentifier 가 ${config.ios?.bundleIdentifier} 다(${BUNDLE_ID} 여야 한다)`);
  }
  const apiHost = hostOf(config.extra?.apiBaseUrl ?? "");
  if (apiHost !== PRODUCTION_API_HOST) {
    identity.push(`API 호스트가 ${apiHost} 다(${PRODUCTION_API_HOST} 여야 한다)`);
  }
  const pluginNames = (config.plugins ?? []).map((p) => (Array.isArray(p) ? p[0] : p));
  if (!pluginNames.includes("./plugins/withoutDevLauncherNetwork")) {
    identity.push("운영 정리 플러그인(withoutDevLauncherNetwork)이 목록에 없다");
  }

  console.log(
    `introspect(production) · ${config.ios?.bundleIdentifier} · version ${config.version} · build ${config.ios?.buildNumber} · API ${apiHost}`,
  );
  ok = report("운영 introspect — 식별자 · 서버", identity) && ok;
  ok = report("운영 introspect — Info.plist 권한", auditInfoPlist(introspected)) && ok;

  // 2. 생성된 ios/app/Info.plist (있을 때만)
  if (existsSync(GENERATED_PLIST)) {
    const plist = require("@expo/plist").default.parse(readFileSync(GENERATED_PLIST, "utf8"));
    console.log(
      `ios/app/Info.plist · version ${plist.CFBundleShortVersionString} · build ${plist.CFBundleVersion}`,
    );
    const problems = auditInfoPlist(plist);
    if (plist.CFBundleShortVersionString !== config.version) {
      problems.push(
        `CFBundleShortVersionString ${plist.CFBundleShortVersionString} ≠ app.config version ${config.version} — prebuild 를 다시 한다`,
      );
    }
    if (plist.CFBundleVersion !== config.ios?.buildNumber) {
      problems.push(
        `CFBundleVersion ${plist.CFBundleVersion} ≠ app.config buildNumber ${config.ios?.buildNumber} — prebuild 를 다시 한다`,
      );
    }
    ok = report("생성된 ios/app/Info.plist", problems) && ok;
  } else {
    console.log("ℹ️  ios/app/Info.plist 가 없다 — prebuild 뒤 다시 돌리면 최종 파일도 본다");
  }

  if (!ok) {
    console.error("\n출시 빌드를 만들기 전에 위 항목을 고친다.");
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    main();
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
