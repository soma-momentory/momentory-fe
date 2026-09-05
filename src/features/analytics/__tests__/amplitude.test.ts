import * as sdk from "@amplitude/analytics-react-native";
import { analyticsEnabled, loadAmplitude } from "../amplitude";

jest.mock("@amplitude/analytics-react-native", () => ({
  init: jest.fn(() => ({ promise: Promise.resolve() })),
  track: jest.fn(() => ({ promise: Promise.resolve({ code: 200 }) })),
  flush: jest.fn(() => ({ promise: Promise.resolve() })),
  getUserId: jest.fn(),
  getDeviceId: () => "device-before-reset",
  getSessionId: () => 1000,
  reset: jest.fn(),
  setUserId: jest.fn(),
}));

beforeEach(() => jest.clearAllMocks());

it("개발 수집은 명시적으로 켜야 하고 키 없는 배포도 비활성이다", () => {
  expect(analyticsEnabled("", false, "true")).toBe(false);
  expect(analyticsEnabled("key", true, undefined)).toBe(false);
  expect(analyticsEnabled("key", true, "true")).toBe(true);
  expect(analyticsEnabled("key", false, "false")).toBe(true);
});

it("자동 수집과 원격 자동수집 설정을 끄고 내부 단자리 ID를 허용한다", async () => {
  await loadAmplitude("project-key");
  expect(sdk.init).toHaveBeenCalledWith(
    "project-key",
    undefined,
    expect.objectContaining({
      minIdLength: 1,
      autocapture: false,
      trackingSessionEvents: false,
      remoteConfig: { fetchRemoteConfig: false },
      attribution: { disabled: true },
      trackingOptions: expect.objectContaining({
        adid: false,
        idfv: false,
        appSetId: false,
        ipAddress: false,
      }),
    }),
  );
});

it("익명 로그인은 이어 붙이고 이전 계정 로그아웃은 기기 ID를 바꾼다", async () => {
  const transport = await loadAmplitude("key");
  jest.mocked(sdk.getUserId).mockReturnValue(undefined);
  transport.identify("7");
  expect(sdk.reset).not.toHaveBeenCalled();
  jest.mocked(sdk.getUserId).mockReturnValue("7");
  transport.identify(null);
  expect(sdk.reset).toHaveBeenCalledTimes(1);
  expect(sdk.setUserId).toHaveBeenLastCalledWith(undefined);
});

it("SDK 비동기 처리 전에 발생 시각·사용자·기기·insert_id를 고정한다", async () => {
  const transport = await loadAmplitude("key");
  jest.mocked(sdk.track).mockReturnValueOnce({ promise: Promise.reject(Error("offline")) });
  transport.send({
    name: "logout_completed",
    properties: {},
    userId: "7",
    time: 1234,
    insertId: "unique",
  });
  transport.identify(null);
  await Promise.resolve();
  expect(sdk.track).toHaveBeenCalledWith(
    "logout_completed",
    {},
    {
      user_id: "7",
      device_id: "device-before-reset",
      session_id: 1000,
      time: 1234,
      insert_id: "unique",
      ip: "0.0.0.0",
    },
  );
});
