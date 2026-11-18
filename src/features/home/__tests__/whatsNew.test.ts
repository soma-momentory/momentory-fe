import { act, renderHook, waitFor } from "@testing-library/react-native";
import Constants from "expo-constants";

import { currentUserId, useAuth } from "@/features/auth/model/auth";
import { markWhatsNewSeen, readWhatsNewSeen } from "@/features/home/data/whatsNewMemory";
import { markWhatsNewSeenAtSignup, useWhatsNew } from "@/features/home/model/useWhatsNew";
import { shouldShowWhatsNew, WHATS_NEW } from "@/features/home/model/whatsNew";
import { storage } from "@/features/rest/data/deviceStorage";

/** 버전을 적지 않고 소식 번호에서 만든다 — 다음 출시 때 소식만 고쳐도 이 테스트는 그대로 돈다 */
const OLDER = "0.0.1";
const NEWER = "999.0.0";

jest.mock("expo-constants", () => {
  const actual = jest.requireActual("expo-constants");
  const constants = Object.create(actual.default);
  Object.defineProperty(constants, "expoConfig", { value: { version: "" } });
  return { __esModule: true, ...actual, default: constants };
});
jest.mock("@/features/auth/model/auth", () => ({
  ...jest.requireActual("@/features/auth/model/auth"),
  currentUserId: jest.fn(),
}));

const A = 101;
const B = 202;
const setAppVersion = (version: string) => {
  Constants.expoConfig!.version = version;
};
const signIn = (userId: number) => {
  jest.mocked(currentUserId).mockResolvedValue(userId);
  useAuth.setState({ status: "authenticated" });
};
const settledStatus = async () => {
  const hook = await renderHook(() => useWhatsNew());
  await waitFor(() => expect(hook.result.current.status).not.toBe("checking"));
  return hook;
};

beforeEach(async () => {
  jest.restoreAllMocks();
  await storage().clear();
  setAppVersion(WHATS_NEW.version);
  signIn(A);
});

describe("shouldShowWhatsNew", () => {
  it.each([
    ["기록이 없는 기존 사용자", WHATS_NEW.version, null, true],
    ["소식보다 높은 버전으로 건너뛰어 업데이트한 사용자", NEWER, null, true],
    ["소식 전 버전을 본 기록만 있는 사용자", WHATS_NEW.version, OLDER, true],
    ["이미 본 사용자", WHATS_NEW.version, WHATS_NEW.version, false],
    ["소식 버전보다 낮은 앱", OLDER, null, false],
    ["앱 버전을 못 읽음", undefined, null, false],
    ["기록을 못 읽음", WHATS_NEW.version, undefined, false],
    ["기록의 형태가 틀림", WHATS_NEW.version, "abc", false],
  ])("%s", (_name, app, seen, expected) => {
    expect(shouldShowWhatsNew(app, seen)).toBe(expected);
  });
});

describe("useWhatsNew", () => {
  it("기존 사용자에게 한 번 보여 주고, 닫으면 다시 뜨지 않는다", async () => {
    const first = await settledStatus();
    expect(first.result.current.status).toBe("open");

    await act(async () => first.result.current.dismiss());
    expect(first.result.current.status).toBe("none");
    await first.unmount();

    const second = await settledStatus();
    expect(second.result.current.status).toBe("none");
  });

  it("새 가입자는 온보딩을 마칠 때 남긴 기록 때문에 뜨지 않는다", async () => {
    await markWhatsNewSeenAtSignup();

    const { result } = await settledStatus();
    expect(result.current.status).toBe("none");
  });

  it("옛 버전에서 가입한 사용자는 소식이 있는 버전으로 올린 뒤 받는다", async () => {
    setAppVersion(OLDER);
    await markWhatsNewSeenAtSignup();
    setAppVersion(WHATS_NEW.version);

    const { result } = await settledStatus();
    expect(result.current.status).toBe("open");
  });

  it("같은 기기의 다른 사용자는 따로 받는다", async () => {
    await markWhatsNewSeen(A, WHATS_NEW.version);
    signIn(B);

    const { result } = await settledStatus();
    expect(result.current.status).toBe("open");
  });

  it("기록을 못 읽으면 띄우지 않는다", async () => {
    jest.spyOn(storage(), "getItem").mockRejectedValue(new Error("disk"));
    await expect(readWhatsNewSeen(A)).resolves.toBeUndefined();

    const { result } = await settledStatus();
    expect(result.current.status).toBe("none");
  });
});
