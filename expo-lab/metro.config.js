// @ts-check
/**
 * Expo Lab 의 Metro 설정 — 기본값 위에 **웹 번들에서만** 네이티브 모듈을 Lab 심으로 돌린다.
 *
 * 프레임(iframe 안의 실제 앱)이 웹에서 끝까지 돌게 하는 자리다. 앱 코드(`../app` · `../src`)는
 * 한 줄도 바꾸지 않는다 — 앱이 부르는 모듈 이름은 그대로이고, 무엇이 불려 오는지만 여기서 바뀐다.
 * 이름표는 `src/frame/metroShims.js`, 심마다의 이유는 `src/frame/shims/` 각 파일 머리말에 있다.
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const { labShimFor } = require("./src/frame/metroShims");

const config = getDefaultConfig(__dirname);

// 공용 앱 화면 · 디자인 값 · 자산을 고쳐도 Lab 이 바로 다시 묶는다(2026-11-02 #217).
// ⚠ 저장소 루트 전체를 넣지 않는다 — 작업 공간(git worktree)은 node_modules 를 원본에 링크(junction)로
// 잇는데, 루트를 통째로 지켜보면 Metro 가 그 링크를 다시 훑다가 패키지를 못 찾는다(`@expo/metro-runtime` 해석 실패).
// 앱 쪽에서 Lab 이 실제로 읽는 세 폴더만 더한다.
const appRoot = path.resolve(__dirname, "..");
config.watchFolders = [
  ...new Set([
    ...config.watchFolders,
    ...["app", "src", "assets"].map((dir) => path.join(appRoot, dir)),
  ]),
];

// `app.config.ts` 는 Babel 이 `expo-constants` 안에 문자열로 박아 넣는데(`process.env.APP_MANIFEST`), Metro 의
// 변환 캐시 키는 그 파일의 내용만 본다 — 설정이 바뀌어도, 옛 설정의 작업 공간이 같은 캐시를 채워도 옛 설정이 그대로
// 나온다. 그러면 `extra.apiBaseUrl` 이 비어 앱이 가짜 서버에 요청을 보내지 않고, 화면 상태를 바꿔도 전부 빈 화면이 된다
// (2026-11-03 실측). 설정 내용을 캐시 키에 넣는다.
const appConfigHash = crypto
  .createHash("sha256")
  .update(fs.readFileSync(path.join(__dirname, "app.config.ts")))
  .digest("hex")
  .slice(0, 12);
config.cacheVersion = `${config.cacheVersion ?? ""}lab-config-${appConfigHash}`;

const upstream = config.resolver.resolveRequest;

/**
 * 작업 공간의 node_modules 는 원본으로 잇는 링크(junction)라, 같은 패키지가 링크 경로와 실제 경로 두 군데로 풀린다.
 * 그대로 두면 react-native-web 이 두 벌 묶여 스타일 규칙 순서가 꼬이고, 여백 · 테두리가 사라진 채 그려진다
 * (2026-11-03 실측 — 시안 미리보기의 일정 행 폭 324 → 393 · 체크 테두리 1 → 0). 늘 실제 경로 하나로 모은다.
 * @type {Map<string, string>}
 */
const realPaths = new Map();
const realFile = (/** @type {string} */ file) => {
  let real = realPaths.get(file);
  if (real === undefined) {
    try {
      real = fs.realpathSync(file);
    } catch {
      real = file;
    }
    realPaths.set(file, real);
  }
  return real;
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    const shim = labShimFor(context.originModulePath, moduleName);
    if (shim) return { type: "sourceFile", filePath: shim };
  }
  const resolved = (upstream ?? context.resolveRequest)(context, moduleName, platform);
  return resolved.type === "sourceFile"
    ? { ...resolved, filePath: realFile(resolved.filePath) }
    : resolved;
};

// 「AI에게 맡기기」 — 개발 서버에 로컬 전용 `/__lab/agent/*` 를 단다(`server/index.js` 머리말).
// 미리보기 서버(작업 공간마다 하나)는 MOMENTORY_LAB_AGENT=off 로 떠서 여기를 건너뛴다.
const { withLabAgent } = require("./server");

module.exports = withLabAgent(config);
