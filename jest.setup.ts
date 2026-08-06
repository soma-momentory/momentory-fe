// 테스트 전역 설정.
//
// 여기에 목을 계속 쌓지 않는다 — 목이 많아진다는 것은 컴포넌트가 환경에
// 너무 붙어 있다는 신호다. 먼저 컴포넌트를 순수하게 만들 수 있는지 본다.

// 기본값은 "동작 줄이기 꺼짐". Reduce Motion 을 검사하는 테스트가
// 각자 이 값을 바꿔 쓴다 (theme.motion.reduceMotion 규칙).
jest.mock("react-native/Libraries/Utilities/Appearance", () => ({
  getColorScheme: () => "light",
  addChangeListener: () => ({ remove: () => {} }),
}));

// SafeAreaProvider 는 인셋을 **실제로 재기 전까지 자식을 그리지 않는다** — 네이티브가
// 없는 테스트에서는 영원히 빈 화면이다. 라이브러리가 주는 공식 목이 320×640 · 인셋 0
// 으로 즉시 그리게 한다. 여기 없으면 화면 테스트가 전부 "요소를 못 찾음" 으로 깨진다.
jest.mock("react-native-safe-area-context", () =>
  // jest.mock 팩토리는 호이스팅되어 import 보다 먼저 실행된다 — require 여야 한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("react-native-safe-area-context/jest/mock").default,
);
