/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * `src/design/ds/*` 토큰 모듈을 **부를 때 꺼낸다** — 정적 import 가 아니다.
 *
 * 프레임 부트스트랩은 `Platform.OS` 를 기기 값으로 맞춘 **뒤에** `applyDesignDraft` 를 부른다.
 * `typography.ts` 는 모듈이 올라오는 순간 `Platform.OS` · 창 폭으로 `typeScale` 을 한 번 재므로,
 * 이 파일이 정적으로 import 하면 부트스트랩의 import 가 끌어올려지면서 그 전에 재 버린다.
 * Metro 는 문자열 그대로의 `require` 만 묶으므로 경로를 하나씩 적는다.
 *
 * 앱이 `@/design/ds/...` 로 부르는 것과 **같은 파일**이라 같은 모듈 인스턴스다 — 여기서 바꾼 객체를
 * 앱 화면이 그대로 읽는다. 새 ds 파일이 생기면 여기 한 줄을 더한다
 * (`apply-tokens.test.mjs` 가 빠진 파일을 잡는다).
 */

export type TokenModule = Readonly<Record<string, unknown>>;
/** 파일 이름(확장자 없이) → 그 모듈의 export */
export type TokenModules = Readonly<Record<string, TokenModule>>;

export function loadTokenModules(): TokenModules {
  return {
    color: require("../../../src/design/ds/color"),
    typography: require("../../../src/design/ds/typography"),
    metrics: require("../../../src/design/ds/metrics"),
    bodyRelease: require("../../../src/design/ds/bodyRelease"),
    diaryMemo: require("../../../src/design/ds/diaryMemo"),
    diaryPaper: require("../../../src/design/ds/diaryPaper"),
    homeV2: require("../../../src/design/ds/homeV2"),
    letterPaper: require("../../../src/design/ds/letterPaper"),
    myPaper: require("../../../src/design/ds/myPaper"),
    notebook: require("../../../src/design/ds/notebook"),
    pond: require("../../../src/design/ds/pond"),
    reportPaper: require("../../../src/design/ds/reportPaper"),
    restScene: require("../../../src/design/ds/restScene"),
    retroBubbleComparison: require("../../../src/design/ds/retroBubbleComparison"),
    retroDiary: require("../../../src/design/ds/retroDiary"),
    treasureBox: require("../../../src/design/ds/treasureBox"),
    worryBox: require("../../../src/design/ds/worryBox"),
  };
}

/** Studio 승인값 객체 — 홈·쉼터·보관함·마이·리포트 다섯 View 가 기본 prop 으로 읽는다 */
export function loadStudioApproved(): Record<string, string | number> {
  return require("../../../src/design/studioDesign").approvedDesign;
}
