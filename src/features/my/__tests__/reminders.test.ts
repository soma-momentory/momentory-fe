import { useAuth } from "@/features/auth/model/auth";
import { plannedReminders, startReminderSync, syncReminders } from "@/features/my/model/reminders";
import { useSettings } from "@/features/my/model/settings";

/**
 * 설정과 실제 예약이 어긋나지 않는가 — **이 파일이 그 계약이다.**
 *
 * 어긋나도 화면에는 아무 표시가 없다. 스위치는 켜져 있는데 알림만 안 오는 상태를
 * 사용자가 알아차릴 방법이 없어서, 여기서 규칙을 못으로 박는다.
 */
const native = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
};

const scheduledKeys = () =>
  native.scheduleNotificationAsync.mock.calls.map(
    ([request]: [{ identifier: string }]) => request.identifier,
  );

beforeEach(() => {
  jest.clearAllMocks();
  native.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  useSettings.getState().reset();
  useAuth.setState({ status: "authenticated" });
});

afterEach(() => {
  useAuth.setState({ status: "hydrating" });
});

describe("무엇이 예약돼야 하는가", () => {
  it("켜진 줄만, 그 시각으로", async () => {
    // 샘플 시작값 — 회고(켜짐 21:30) · 낮(꺼짐) · 주간(켜짐 21:00) · 소식(꺼짐)
    expect(plannedReminders()).toEqual([
      expect.objectContaining({ key: "retro", time: "21:30" }),
      expect.objectContaining({ key: "weekly", time: "21:00", weekday: 1 }),
    ]);
  });

  it("주간만 요일에 매인다 — 나머지는 매일이다", async () => {
    expect(plannedReminders().find((r) => r.key === "retro")?.weekday).toBeUndefined();
  });

  it("「새로운 소식」은 예약하지 않는다 — 서버 푸시가 필요한 설정이다", async () => {
    useSettings.setState((s) => ({
      notify: { ...s.notify, news: { enabled: true, time: null } },
    }));

    expect(plannedReminders().map((r) => r.key)).not.toContain("news");
  });

  it("끄면 목록에서 빠진다 — 시각은 남아 있어도", async () => {
    useSettings.getState().toggle("retro");

    expect(plannedReminders().map((r) => r.key)).toEqual(["weekly"]);
    // 껐다는 이유로 값을 지우지 않는다 (M3.md)
    expect(useSettings.getState().notify.retro.time).toBe("21:30");
  });

  it("로그인하지 않았으면 아무것도 예약하지 않는다", async () => {
    // 로그아웃은 설정을 샘플 기본값으로 되돌린다 — 회고 알림이 다시 켜진 상태다.
    // 인증을 보지 않으면 로그아웃한 기기가 밤마다 「돌아볼까요」 하고 부른다.
    useAuth.setState({ status: "anonymous" });

    expect(plannedReminders()).toEqual([]);
  });
});

describe("화해 — OS 예약을 설정과 같게 만든다", () => {
  it("권한이 있으면 켜진 것만 예약한다", async () => {
    await syncReminders();

    expect(scheduledKeys()).toEqual(["momentory.reminder.retro", "momentory.reminder.weekly"]);
  });

  it("권한이 없으면 아무것도 예약하지 않고 남은 것을 지운다", async () => {
    native.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    await syncReminders();

    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it("예약할 것이 없으면 권한을 묻지 않는다 — 지우는 데는 권한이 필요 없다", async () => {
    useAuth.setState({ status: "anonymous" });

    await syncReminders();

    expect(native.getPermissionsAsync).not.toHaveBeenCalled();
    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it("잇따라 불러도 마지막 설정이 남는다 — 취소와 예약이 섞이지 않는다", async () => {
    const first = syncReminders();
    useSettings.getState().toggle("weekly");
    const second = syncReminders();

    await Promise.all([first, second]);

    // 마지막 화해가 끝난 뒤 예약된 것은 회고 하나뿐이다
    expect(scheduledKeys().slice(-1)).toEqual(["momentory.reminder.retro"]);
  });
});

describe("구독 — 설정이 바뀌면 스스로 맞춘다", () => {
  it("스위치를 끄면 화면이 부르지 않아도 예약이 사라진다", async () => {
    const stop = startReminderSync();
    await syncReminders(); // 시작 시 화해가 끝나기를 기다린다
    jest.clearAllMocks();

    useSettings.getState().toggle("retro");
    // 구독이 이미 한 번 돌았다 — 이 기다림은 그것이 끝나기를 기다리는 것이다
    await syncReminders();

    expect(scheduledKeys()).not.toContain("momentory.reminder.retro");
    expect(scheduledKeys()).toContain("momentory.reminder.weekly");
    stop();
  });

  it("로그아웃하면 예약이 사라진다", async () => {
    const stop = startReminderSync();
    await syncReminders();
    jest.clearAllMocks();

    useAuth.setState({ status: "anonymous" });
    await syncReminders();

    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
    stop();
  });

  it("풀면 더 이상 따라가지 않는다", async () => {
    const stop = startReminderSync();
    await syncReminders();
    stop();
    jest.clearAllMocks();

    useSettings.getState().toggle("retro");
    await Promise.resolve();

    expect(native.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
