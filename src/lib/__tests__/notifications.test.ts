import {
  applyReminders,
  getNotificationPermission,
  requestNotificationPermission,
  SUNDAY,
  type Reminder,
} from "@/lib/notifications";

/**
 * OS 알림 경계 — 여기서 고정하는 것은 **네이티브에 무엇을 시키는가**다.
 *
 * 알림은 눈으로 확인하기까지 하루를 기다려야 하고, 틀려도 아무 증상이 없다
 * (안 오는 것과 안 켠 것이 같아 보인다). 그래서 예약의 모양을 테스트가 든다.
 */
const native = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
};

const reminder = (over: Partial<Reminder> = {}): Reminder => ({
  key: "retro",
  time: "21:30",
  title: "돌아보는 시간이에요",
  body: "오늘 하루, 저와 잠깐 이야기해요.",
  ...over,
});

const allowed = { granted: true, canAskAgain: true };

beforeEach(() => {
  jest.clearAllMocks();
  native.getPermissionsAsync.mockResolvedValue(allowed);
  native.requestPermissionsAsync.mockResolvedValue(allowed);
  native.scheduleNotificationAsync.mockResolvedValue("id");
  native.cancelScheduledNotificationAsync.mockResolvedValue(undefined);
});

describe("권한 — 묻는 것과 띄우는 것을 가른다", () => {
  it("조회는 다이얼로그를 띄우지 않는다", async () => {
    await getNotificationPermission();

    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("이미 허용돼 있으면 다시 묻지 않는다", async () => {
    const result = await requestNotificationPermission();

    expect(result).toEqual({ granted: true, canAskAgain: true });
    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("이미 거부된 뒤에는 묻지 않는다 — 다이얼로그 없이 조용히 거부로 돌아온다", async () => {
    // 그 침묵이 화면에는 「스위치가 그냥 안 켜짐」으로만 보인다.
    // 여기서 걸러야 M3 가 「기기 설정에서」라고 말할 수 있다.
    native.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    const result = await requestNotificationPermission();

    expect(result).toEqual({ granted: false, canAskAgain: false });
    expect(native.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("아직 묻지 않았으면 그때 다이얼로그를 띄운다", async () => {
    native.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    native.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });

    await expect(requestNotificationPermission()).resolves.toEqual({
      granted: true,
      canAskAgain: false,
    });
  });

  it("판단이 안 서면 꺼짐이다 — 네이티브가 던져도 알림이 온다고 말하지 않는다", async () => {
    native.getPermissionsAsync.mockRejectedValue(new Error("no native module"));

    await expect(getNotificationPermission()).resolves.toEqual({
      granted: false,
      canAskAgain: false,
    });
    await expect(requestNotificationPermission()).resolves.toEqual({
      granted: false,
      canAskAgain: false,
    });
  });
});

describe("예약 — 목록과 같은 상태로 만든다", () => {
  it("예약하기 전에 우리 것을 전부 지운다 — 시각을 고칠 때마다 쌓이지 않게", async () => {
    await applyReminders([reminder({ time: "22:00" })]);

    expect(native.cancelScheduledNotificationAsync.mock.calls.map(([id]) => id)).toEqual([
      "momentory.reminder.retro",
      "momentory.reminder.daily",
      "momentory.reminder.weekly",
    ]);
    expect(native.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it("빈 목록은 전부 취소한다 — 남은 예약이 없다", async () => {
    await applyReminders([]);

    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("요일이 없으면 매일이다", async () => {
    await applyReminders([reminder({ time: "21:30" })]);

    expect(native.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "momentory.reminder.retro",
        trigger: expect.objectContaining({ type: "daily", hour: 21, minute: 30 }),
      }),
    );
  });

  it("요일이 있으면 그 요일에만 — 주간은 일요일이다", async () => {
    await applyReminders([reminder({ key: "weekly", time: "21:00", weekday: SUNDAY })]);

    expect(native.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ type: "weekly", weekday: 1, hour: 21, minute: 0 }),
      }),
    );
  });

  it("읽지 못한 시각은 건너뛴다 — 자정에 울리지 않는다", async () => {
    await applyReminders([reminder({ time: "" }), reminder({ key: "daily", time: "14:00" })]);

    expect(native.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    expect(native.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: "momentory.reminder.daily" }),
    );
  });

  it("한 건이 실패해도 던지지 않고 나머지를 예약한다", async () => {
    // 알림은 곁가지다 — 여기서 난 오류가 화면을 멈추게 하면 안 된다
    native.scheduleNotificationAsync
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce("id");

    await expect(
      applyReminders([reminder(), reminder({ key: "daily", time: "14:00" })]),
    ).resolves.toBeUndefined();

    expect(native.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });
});
