import { fireEvent, render, waitFor } from "@testing-library/react-native";

import Notify from "../../../../app/(onboarding)/notify";
import My from "../../../../app/(tabs)/my";

import { track } from "@/features/analytics";
import { useSettings } from "@/features/my/model/settings";
import { useDraft } from "@/features/onboarding/model/draft";
import { seedDiaries, seedProfile } from "@/testing/fixtures";

/**
 * 알림 권한을 물은 결과 — 온보딩 알림 화면과 마이 `M2` 두 곳에서 묻는다(2026-09-28 · 10-25).
 *
 * 화면의 규칙(물을 때와 묻지 않을 때)은 각 화면 테스트가 본다. 여기서는 **물었을 때
 * 결과가 어디서 왔는지와 함께 남는지**만 본다. 설정 시각·예약은 여전히 보내지 않는다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

const notifications = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};

const permissionResults = () =>
  jest.mocked(track).mock.calls.filter(([name]) => name === "notify_permission_result");

beforeEach(() => {
  jest.clearAllMocks();
  useDraft.getState().reset();
  useSettings.getState().reset();
  seedDiaries();
  seedProfile();
  notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });
});

it("온보딩 [알림 켜기] 가 물은 결과를 남긴다", async () => {
  const { getByText } = await render(<Notify />);

  await fireEvent.press(getByText("알림 켜기"));

  await waitFor(() =>
    expect(permissionResults()).toEqual([
      ["notify_permission_result", { source: "onboarding", granted: false }],
    ]),
  );
});

it("온보딩 [나중에] 는 묻지 않으므로 남길 결과도 없다", async () => {
  const { getByText } = await render(<Notify />);

  await fireEvent.press(getByText("나중에"));

  expect(permissionResults()).toEqual([]);
});

it("마이에서 꺼진 알림을 켜려고 물은 결과를 남긴다", async () => {
  useSettings.getState().toggle("retro");
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  const r = await render(<My />);

  await fireEvent.press(r.getAllByText("알림 설정")[0]!);
  await fireEvent.press(r.getByText("완료"));

  await waitFor(() =>
    expect(permissionResults()).toEqual([
      ["notify_permission_result", { source: "my", granted: true }],
    ]),
  );
});
