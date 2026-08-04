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
