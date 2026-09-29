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
jest.mock(
  "react-native-safe-area-context",
  () =>
    // jest.mock 팩토리는 호이스팅되어 import 보다 먼저 실행된다 — require 여야 한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("react-native-safe-area-context/jest/mock").default,
);

// 알림도 네이티브다. **기본은 「허용됨」** — 대부분의 테스트는 알림을 신경 쓰지
// 않는데, 기본이 거부면 `08` 의 [다음] 이 알림을 끄는 것으로 읽혀 관계없는
// 테스트가 함께 깨진다. 권한을 검사하는 테스트가 각자 이 목을 바꿔 쓴다.
jest.mock("expo-notifications", () => ({
  __esModule: true,
  AndroidImportance: { DEFAULT: 5 },
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly" },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve("id")),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  DEFAULT_ACTION_IDENTIFIER: "expo.modules.notifications.actions.DEFAULT",
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// SecureStore(M2-0 세션)도 네이티브다. 인메모리 Map 으로 대신하고, 인증 테스트가
// `jest.requireMock("expo-secure-store").__store` 로 직접 만료 토큰·오류를 심는다.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    __store: store,
    getItemAsync: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
    setItemAsync: jest.fn((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((k: string) => {
      store.delete(k);
      return Promise.resolve();
    }),
  };
});

// 구글 로그인 SDK 도 네이티브다 — **다른 것들과 달리 import 하는 순간 터진다.**
// `TurboModuleRegistry.getEnforcing` 을 모듈 최상단에서 부르기 때문에, 목이 없으면
// `auth.ts` 를 스치기만 해도 그 파일을 import 한 스위트 전부가 「suite failed to
// run」이 된다(카카오는 그 시점에 네이티브를 만지지 않아 테스트 파일에서 목을 둔다).
//
// 그래서 여기서 **패키지 전체**를 대신한다. 라이브러리가 주는 목
// (`google-signin/jest/build/jest/setup.js`)을 쓰지 않는 것은, 그것이 라이브러리
// 안쪽 상대 경로를 mock 해서 **버전이 오르면 조용히 빗나가기** 때문이다.
//
// 기본값은 **성공**이다 — 대부분의 테스트는 구글을 신경 쓰지 않는데, 기본이
// 실패면 관계없는 테스트가 함께 깨진다(expo-notifications 와 같은 판단).
// 구글을 검사하는 테스트가 각자 이 목을 바꿔 쓴다.
jest.mock("@react-native-google-signin/google-signin", () => {
  const statusCodes = {
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
    NULL_PRESENTER: "NULL_PRESENTER",
  };
  return {
    __esModule: true,
    statusCodes,
    // 라이브러리의 것과 같은 판정이다 — `code` 를 든 객체인가
    isErrorWithCode: (error: unknown) =>
      typeof error === "object" && error !== null && "code" in error,
    GoogleSignin: {
      configure: jest.fn(),
      hasPlayServices: jest.fn(() => Promise.resolve(true)),
      signIn: jest.fn(() =>
        Promise.resolve({ type: "success", data: { idToken: "google-id-token" } }),
      ),
      signOut: jest.fn(() => Promise.resolve(null)),
      revokeAccess: jest.fn(() => Promise.resolve(null)),
    },
  };
});

// 음성 인식(회고 입력의 마이크)도 네이티브다. 기본은 「허용됨」이고 이벤트는 오지 않는다 —
// 음성 흐름을 검사하는 테스트가 각자 이 목을 바꿔 쓴다.
jest.mock("expo-speech-recognition", () => ({
  __esModule: true,
  ExpoSpeechRecognitionModule: {
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));
