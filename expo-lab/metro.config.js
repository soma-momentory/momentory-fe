// @ts-check
/**
 * Expo Lab 의 Metro 설정 — 기본값 위에 **웹 번들에서만** 네이티브 모듈을 Lab 심으로 돌린다.
 *
 * 프레임(iframe 안의 실제 앱)이 웹에서 끝까지 돌게 하는 자리다. 앱 코드(`../app` · `../src`)는
 * 한 줄도 바꾸지 않는다 — 앱이 부르는 모듈 이름은 그대로이고, 무엇이 불려 오는지만 여기서 바뀐다.
 * 이름표는 `src/frame/metroShims.js`, 심마다의 이유는 `src/frame/shims/` 각 파일 머리말에 있다.
 */
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

const upstream = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    const shim = labShimFor(context.originModulePath, moduleName);
    if (shim) return { type: "sourceFile", filePath: shim };
  }
  return (upstream ?? context.resolveRequest)(context, moduleName, platform);
};

// 「AI에게 맡기기」 — 개발 서버에 로컬 전용 `/__lab/agent/*` 를 단다(`server/index.js` 머리말).
// 미리보기 서버(작업 공간마다 하나)는 MOMENTORY_LAB_AGENT=off 로 떠서 여기를 건너뛴다.
const { withLabAgent } = require("./server");

module.exports = withLabAgent(config);
