/**
 * jest-expo 프리셋이 RN·Expo 모듈 변환과 네이티브 목킹을 담당한다.
 * 직접 transformIgnorePatterns 를 쓰지 않는다 — SDK 가 올라갈 때마다 어긋난다.
 */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // .claude/worktrees = 에이전트가 따로 만든 작업 폴더(저장소 사본) — 같은 테스트가 두 번 돈다
  testPathIgnorePatterns: ["/expo-lab/e2e/", "/\.claude/worktrees/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/worktrees/"],
  testTimeout: 15000,
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "app/**/*.{ts,tsx}",
    // 생성물은 우리 코드가 아니다
    "!src/design/theme.ts",
  ],
};
