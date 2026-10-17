import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { track } from "../../../../src/features/analytics";
import { useAuth } from "../../../../src/features/auth/model/auth";
import { useDiary } from "../../../../src/features/diary/model/diary";
import { useProfile, useSettings } from "../../../../src/features/my/model/settings";
import { getCalendarAccess } from "../../../../src/lib/calendar";
import { getNotificationPermission } from "../../../../src/lib/notifications";
import { MyMainPreview, myMainScenarios } from "../MyMainPreview";

jest.mock("expo-router", () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
jest.mock("../../../../src/features/analytics", () => ({ track: jest.fn() }));
jest.mock("../../../../src/features/auth/model/auth", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../src/features/diary/model/diary", () => ({ useDiary: jest.fn() }));
jest.mock("../../../../src/features/my/model/settings", () => ({
  useProfile: jest.fn(),
  useSettings: jest.fn(),
}));
jest.mock("../../../../src/lib/calendar", () => ({ getCalendarAccess: jest.fn() }));
jest.mock("../../../../src/lib/notifications", () => ({ getNotificationPermission: jest.fn() }));

const preview = (scenarioId: string, onMessage = jest.fn()) =>
  render(<MyMainPreview scenarioId={scenarioId} onMessage={onMessage} fontScale={1.5} />);

describe("Expo Lab 마이 Mock", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("마이 본문 상태를 선택할 수 있다", () => {
    expect(myMainScenarios.map((item) => item.id)).toEqual([
      "default",
      "no-diaries",
      "long-nickname",
      "notification-off",
      "notification-blocked",
      "calendar-unlinked",
      "settings-error",
      "withdraw-error",
    ]);
  });

  it.each([
    ["default", "일기 12일 기록"],
    ["no-diaries", "일기 0일 기록"],
    ["notification-off", "꺼짐"],
    ["notification-blocked", "기기 설정에서 알림을 켜면 이 시간에 찾아갈게요."],
    ["calendar-unlinked", "연결 안 함"],
    ["settings-error", "설정을 저장하지 못했어요. 다시 시도해 주세요."],
    ["withdraw-error", "탈퇴하지 못했어요. 다시 시도해 주세요."],
  ])("%s 상태를 공유 UI에 표시한다", async (scenario, text) => {
    const screen = await preview(scenario);
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("긴 닉네임과 1.5배 글씨 설정을 공유 UI에 전달한다", async () => {
    const screen = await preview("long-nickname");
    expect(screen.getByText("길고긴닉네임으로마이화면의줄임표와기록일수를확인해요")).toBeTruthy();
  });

  it("행 선택은 Lab 메시지만 보내고 운영 Store·권한·라우터·계측을 사용하지 않는다", async () => {
    const onMessage = jest.fn();
    const screen = await preview("calendar-unlinked", onMessage);
    await fireEvent.press(screen.getByText("캘린더 연동"));
    await fireEvent.press(screen.getByText("로그아웃"));
    await fireEvent.press(screen.getByText("회원 탈퇴"));

    expect(onMessage).toHaveBeenCalledWith("캘린더 연동은 Lab Mock입니다.");
    expect(onMessage).toHaveBeenCalledWith("로그아웃은 Lab Mock입니다.");
    expect(onMessage).toHaveBeenCalledWith("회원 탈퇴 확인은 Lab Mock입니다.");
    expect(useAuth).not.toHaveBeenCalled();
    expect(useDiary).not.toHaveBeenCalled();
    expect(useProfile).not.toHaveBeenCalled();
    expect(useSettings).not.toHaveBeenCalled();
    expect(getCalendarAccess).not.toHaveBeenCalled();
    expect(getNotificationPermission).not.toHaveBeenCalled();
    expect(track).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });
});
