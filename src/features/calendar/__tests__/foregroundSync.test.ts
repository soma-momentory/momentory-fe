import { currentUserId } from "@/features/auth/model/auth";
import { useCalendarSync } from "@/features/calendar/model/calendarSync";
import {
  startCalendarForegroundSync,
  syncDeviceCalendar,
} from "@/features/calendar/model/foregroundSync";
import { useDay } from "@/features/home/model/day";
import { onForeground } from "@/lib/appState";

jest.mock("@/features/auth/model/auth", () => ({ currentUserId: jest.fn() }));
jest.mock("@/features/calendar/model/calendarSync", () => ({
  useCalendarSync: { getState: jest.fn() },
}));
jest.mock("@/features/home/model/day", () => ({ useDay: { getState: jest.fn() } }));
jest.mock("@/lib/appState", () => ({ onForeground: jest.fn() }));

const userId = jest.mocked(currentUserId);
const foreground = jest.mocked(onForeground);
const sync = jest.fn();
const reload = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  userId.mockResolvedValue(7);
  sync.mockResolvedValue({ kind: "synced", created: 1, updated: 0, deleted: 0 });
  reload.mockResolvedValue(undefined);
  jest.mocked(useCalendarSync.getState).mockReturnValue({ sync } as never);
  jest.mocked(useDay.getState).mockReturnValue({ reload } as never);
});

describe("syncDeviceCalendar", () => {
  it("세션의 사용자로 화해한다", async () => {
    await syncDeviceCalendar();

    expect(sync).toHaveBeenCalledWith(7);
  });

  it("서버가 실제로 바뀌었으면 오늘 일정을 다시 받는다", async () => {
    await syncDeviceCalendar();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("바뀐 게 없으면 조회를 한 번 더 하지 않는다", async () => {
    sync.mockResolvedValue({ kind: "unchanged" });

    await syncDeviceCalendar();

    expect(reload).not.toHaveBeenCalled();
  });

  it("권한이 없어도 조용히 끝난다 — 화면을 멈추지 않는다", async () => {
    sync.mockResolvedValue({ kind: "denied" });

    await expect(syncDeviceCalendar()).resolves.toEqual({ kind: "denied" });
    expect(reload).not.toHaveBeenCalled();
  });

  it("세션이 없으면 아무것도 하지 않는다 — 로그인 전에도 구독은 살아 있다", async () => {
    userId.mockResolvedValue(null);

    // `null` 은 「화해하지 않았다」다 — 부르는 쪽(`dayRollover`)이 조회를 맡는다
    await expect(syncDeviceCalendar()).resolves.toBeNull();
    expect(sync).not.toHaveBeenCalled();
  });
});

describe("startCalendarForegroundSync", () => {
  it("포그라운드로 돌아올 때마다 화해한다 — 앱을 껐다 켜지 않아도 된다", async () => {
    const stop = jest.fn();
    foreground.mockReturnValue(stop);

    expect(startCalendarForegroundSync()).toBe(stop);

    // 캘린더 앱에서 일정을 고치고 돌아온 순간. 구독은 **기다리지 않으므로**
    // (`void`) 테스트가 대신 대기열을 비운다
    foreground.mock.calls[0]?.[0]();
    await new Promise(setImmediate);

    expect(sync).toHaveBeenCalledWith(7);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
