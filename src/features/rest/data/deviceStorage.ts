/**
 * 쉼터가 **기기에** 남기는 작은 기억의 통로 — AsyncStorage (2026-10-12).
 *
 * 쉼 추천(`recommendMemory.ts`)과 쉼터 설명 카드(`guideMemory.ts`), 홈 배경음악(`features/music/data/musicMemory.ts`)이 쓴다. 토큰이 아니라서
 * SecureStore 에 두지 않는다(SecureStore 에는 모멘토리 토큰만 — `NAV.md` 「3. 도메인」 auth).
 */
export type Storage = typeof import("@react-native-async-storage/async-storage").default;

/**
 * 네이티브 모듈은 **쓸 때 불러온다** — AsyncStorage 가 없는 옛 개발 빌드(2026-09-05 전)에서는 import 하는
 * 순간 던진다. 맨 위에서 불러오면 이 파일을 거치는 `auth.ts` 까지 함께 멈춰 앱이 켜지지 않았다
 * (2026-10-12 · 8월 시뮬레이터 빌드). 부르는 자리가 전부 `try` 안이라 없으면 「못 읽음」으로 닫힌다.
 * Amplitude 를 불러오는 방식과 같다(`features/analytics/amplitude.ts`).
 */
export const storage = (): Storage => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require("@react-native-async-storage/async-storage") as { default?: Storage } & Storage;
  return m.default ?? m;
};
