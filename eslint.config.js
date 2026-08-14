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
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "android/**",
      "ios/**",
      "expo-env.d.ts",
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
    // 화면·공용 컴포넌트는 mock 을 직접 읽지 않는다 — feature 의 store·repository 를
    // 지난다(`CLAUDE.md` 「BE 는 마지막에 붙인다」). 규칙은 사람이 아니라 린터가 지킨다.
    // feature 의 model/data 와 테스트는 예외다 — 거기가 mock 이 들어오는 경계다.
    files: ["app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    ignores: ["**/__tests__/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/mocks/sample",
              message:
                "화면은 mock 을 직접 읽지 않는다 — src/features/<도메인>/ 의 store·repository 를 지난다.",
            },
          ],
        },
      ],
    },
  },
];
