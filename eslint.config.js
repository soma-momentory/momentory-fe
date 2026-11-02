// @ts-check
const expoConfig = require("eslint-config-expo/flat");
const prettierConfig = require("eslint-config-prettier");

/**
 * 색·크기·시간은 토큰에서만 온다.
 * `09_MVP/docs/RULES.md` 「접근성」 — "글자색은 semantic 6토큰만 쓴다. Raw hex 금지."
 * 규칙은 사람이 아니라 린터가 지킨다.
 */
const NO_RAW_HEX = {
  selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
  message:
    "색을 리터럴로 쓰지 않는다. theme(src/design/theme.ts) 또는 tokens.mvp.ts 의 토큰을 쓴다.",
};

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      // 에이전트 작업 폴더(저장소 사본) — 사본을 다시 검사하지 않는다
      ".claude/worktrees/**",
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "expo-lab/dist/**",
      "expo-lab/dist-*/**",
      "android/**",
      "ios/**",
      "expo-env.d.ts",
      // Claude Design 다운로드 원본 — 생성된 런타임·디자인 스냅샷은 수정/린트하지 않는다.
      "design-imports/**",
      // 새 디자인 반입 스냅샷 — 직접 수정 금지 대상이라 린트하지 않는다 (docs/design/IMPORT.md)
      "docs/design/prototype/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", NO_RAW_HEX],

      // `import theme from "@/design/theme"` 는 의도한 패턴이다.
      // 상류 theme.ts 가 조각(colors·layout·motion…)과 묶음(default)을 함께 내보내고,
      // 화면 코드는 묶음 하나만 들고 다니는 편이 낫다. 거의 모든 파일이 이 패턴을 쓰므로
      // 켜두면 lint 출력이 경고로 덮여 진짜 문제를 못 본다.
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
    },
  },
  {
    // 토큰이 사는 곳 — 여기서만 hex 리터럴이 정상이다.
    // theme.ts 는 상류 생성물이고, tokens.mvp.ts 는 상류 반영 전까지의 오버라이드다.
    files: ["src/design/**", "app.config.ts"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // `src/mocks/sample.ts` 는 없앴다 (2026-08-21) — 화면이 보는 값은 전부 서버에서
    // 온다. 남은 고정값은 **테스트 재료**뿐이고(`src/testing/fixtures.ts`) 그것이
    // 앱 코드로 새어 들어가면 샘플 데이터가 조용히 되살아난다.
    // 규칙은 사람이 아니라 린터가 지킨다 — 테스트만 예외다.
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**", "src/testing/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/testing/fixtures",
              message:
                "테스트 전용 고정값이다 — 앱 코드는 서버(features/<도메인>/data)에서 받은 값만 그린다.",
            },
          ],
          // Expo Lab 은 앱 코드를 빌려 쓰지만 그 반대는 없다 — Lab 의 시안 번역 · Mock 이
          // 운영 번들에 섞이지 않게 한다(계획 HOME_V2_ROLLOUT_PLAN.md §0.1)
          patterns: [
            {
              group: ["**/expo-lab/**"],
              message: "Expo Lab 은 앱이 import 하지 않는다 — 값은 src/design/ds 로 옮겨 쓴다.",
            },
          ],
        },
      ],
    },
  },
];
