import { useAuth } from "@/features/auth/model/auth";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { markDayChanged, useDay } from "@/features/home/model/day";
import { startDayRollover } from "@/features/home/model/dayRollover";
import { onDayChange } from "@/lib/dayChange";

jest.mock("@/features/auth/model/auth", () => ({ useAuth: { getState: jest.fn() } }));
jest.mock("@/features/calendar/model/foregroundSync", () => ({ syncDeviceCalendar: jest.fn() }));
jest.mock("@/features/home/model/day", () => ({
  markDayChanged: jest.fn(),
  useDay: { getState: jest.fn() },
}));
jest.mock("@/lib/dayChange", () => ({ onDayChange: jest.fn(() => jest.fn()) }));

const sync = jest.mocked(syncDeviceCalendar);
const redraw = jest.mocked(markDayChanged);
const watch = jest.mocked(onDayChange);
const reload = jest.fn();

/** 새벽 4:00 — 구독이 걸어 둔 손을 그대로 부르고 대기열을 비운다 */
const crossBoundary = async () => {
  watch.mock.calls[0]?.[0]("2026-08-15");
  await new Promise(setImmediate);
};

const signedIn = (status: string) =>
  jest.mocked(useAuth.getState).mockReturnValue({ status } as never);

beforeEach(() => {
  jest.clearAllMocks();
  signedIn("authenticated");
  reload.mockResolvedValue(undefined);
  sync.mockResolvedValue({ kind: "synced", created: 0, updated: 1, deleted: 0 });
  jest.mocked(useDay.getState).mockReturnValue({ reload } as never);
  startDayRollover();
});

describe("startDayRollover", () => {
  it("날짜를 든 화면부터 다시 그린다", async () => {
    await crossBoundary();

    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it("화해를 먼저 하고 — 창이 달을 넘어갔을 수 있다", async () => {
    await crossBoundary();

    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("화해가 바뀐 것을 올렸으면 조회를 또 하지 않는다 — 그쪽이 이미 받았다", async () => {
    await crossBoundary();

    expect(reload).not.toHaveBeenCalled();
  });

  it("바뀐 게 없어도 새 하루의 일정은 받는다 — 어제 목록이 남으면 안 된다", async () => {
    sync.mockResolvedValue({ kind: "unchanged" });

    await crossBoundary();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("캘린더를 못 읽어도 새 하루의 일정은 받는다", async () => {
    sync.mockResolvedValue({ kind: "denied" });

    await crossBoundary();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("로그인 전이면 화면만 다시 그린다 — 새벽에 실패할 요청을 던지지 않는다", async () => {
    signedIn("anonymous");

    await crossBoundary();

    expect(redraw).toHaveBeenCalledTimes(1);
    expect(sync).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
