// @ts-check
/**
 * Expo Lab 의 Metro 설정 — 기본값 위에 **웹 번들에서만** 네이티브 모듈을 Lab 심으로 돌린다.
 *
 * 프레임(iframe 안의 실제 앱)이 웹에서 끝까지 돌게 하는 자리다. 앱 코드(`../app` · `../src`)는
 * 한 줄도 바꾸지 않는다 — 앱이 부르는 모듈 이름은 그대로이고, 무엇이 불려 오는지만 여기서 바뀐다.
 * 이름표는 `src/frame/metroShims.js`, 심마다의 이유는 `src/frame/shims/` 각 파일 머리말에 있다.
 */
const { getDefaultConfig } = require("expo/metro-config");

const { labShimFor } = require("./src/frame/metroShims");

const config = getDefaultConfig(__dirname);

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
