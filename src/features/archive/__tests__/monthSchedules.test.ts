import { monthRange, useMonthSchedules } from "@/features/archive/model/monthSchedules";
import * as scheduleApi from "@/features/home/data/scheduleApi";
import type { Schedule } from "@/features/home/model/types";

const schedule = (id: string, date: string): Schedule => ({
  id,
  date,
  title: `일정 ${id}`,
  time: null,
  source: "manual",
  externalId: null,
  done: false,
  doneAt: null,
  emotions: [],
  hidden: false,
});

/** 원하는 시점에 풀 수 있는 약속 — 응답 순서를 뒤집어 동시성 가드를 시험한다 */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  useMonthSchedules.getState().reset();
  jest.restoreAllMocks();
});

describe("monthRange — 그달 1일~말일", () => {
  it("31일 달·30일 달·2월을 말일까지 잡는다", () => {
    expect(monthRange("2026-08")).toEqual({ from: "2026-08-01", to: "2026-08-31" });
    expect(monthRange("2026-04")).toEqual({ from: "2026-04-01", to: "2026-04-30" });
    // 2026 년 2월은 28일 (윤달 아님)
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    // 윤달 2월은 29일
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });
});

describe("loadMonth", () => {
  it("받은 일정을 그달 것으로 담는다", async () => {
    jest
      .spyOn(scheduleApi, "fetchSchedulesInPeriod")
      .mockResolvedValue({ ok: true, data: [schedule("s1", "2026-08-03")] });

    await useMonthSchedules.getState().loadMonth("2026-08");

    const s = useMonthSchedules.getState();
    expect(s.month).toBe("2026-08");
    expect(s.schedules.map((x) => x.id)).toEqual(["s1"]);
    expect(s.loaded).toBe(true);
  });

  it("그달 1일~말일로 조회한다", async () => {
    const spy = jest
      .spyOn(scheduleApi, "fetchSchedulesInPeriod")
      .mockResolvedValue({ ok: true, data: [] });

    await useMonthSchedules.getState().loadMonth("2026-08");

    expect(spy).toHaveBeenCalledWith("2026-08-01", "2026-08-31");
  });

  it("실패하면 조용히 비운다 — 「일정 없는 날」과 같은 얼굴이다", async () => {
    useMonthSchedules.setState({ schedules: [schedule("old", "2026-07-01")] });
    jest
      .spyOn(scheduleApi, "fetchSchedulesInPeriod")
      .mockResolvedValue({ ok: false, code: "network" });

    await useMonthSchedules.getState().loadMonth("2026-08");

    expect(useMonthSchedules.getState().schedules).toEqual([]);
    expect(useMonthSchedules.getState().loaded).toBe(true);
  });

  it("달을 빠르게 넘기면 마지막 요청만 반영한다 — 늦게 온 옛 달이 덮지 않는다", async () => {
    const first = deferred<scheduleApi.ScheduleResult<Schedule[]>>();
    const second = deferred<scheduleApi.ScheduleResult<Schedule[]>>();
    jest
      .spyOn(scheduleApi, "fetchSchedulesInPeriod")
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const p1 = useMonthSchedules.getState().loadMonth("2026-07");
    const p2 = useMonthSchedules.getState().loadMonth("2026-08");

    // 새 달(8월)이 먼저 도착하고, 옛 달(7월)이 뒤늦게 도착한다
    second.resolve({ ok: true, data: [schedule("aug", "2026-08-10")] });
    first.resolve({ ok: true, data: [schedule("jul", "2026-07-10")] });
    await Promise.all([p1, p2]);

    const s = useMonthSchedules.getState();
    expect(s.month).toBe("2026-08");
    expect(s.schedules.map((x) => x.id)).toEqual(["aug"]);
  });
});
