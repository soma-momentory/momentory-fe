import { onForeground } from "@/lib/appState";
import { fixedClock, msUntilNextDay, SampleClock, setClock } from "@/lib/clock";
import { onDayChange } from "@/lib/dayChange";

jest.mock("@/lib/appState", () => ({ onForeground: jest.fn(() => jest.fn()) }));

const foreground = jest.mocked(onForeground);

/** 포그라운드 복귀 — 구독이 걸어 둔 검사를 그대로 부른다 */
const comeBack = () => foreground.mock.calls[0]?.[0]();

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  foreground.mockReturnValue(jest.fn());
});

afterEach(() => {
  jest.useRealTimers();
  setClock(SampleClock);
});

describe("msUntilNextDay — 경계는 새벽 4:00 이다", () => {
  it("경계 전이면 그날 4:00 까지다", () => {
    expect(msUntilNextDay(new Date("2026-08-14T03:00:00"))).toBe(HOUR);
  });

  it("경계를 지났으면 다음 날 4:00 까지다", () => {
    expect(msUntilNextDay(new Date("2026-08-14T05:00:00"))).toBe(23 * HOUR);
  });

  it("정확히 4:00 이면 방금 넘은 것이다 — 24시간을 기다린다", () => {
    expect(msUntilNextDay(new Date("2026-08-14T04:00:00"))).toBe(24 * HOUR);
  });

  it("자정은 경계가 아니다 — 0시는 아직 어제이고 4시간이 남았다", () => {
    expect(msUntilNextDay(new Date("2026-08-14T00:00:00"))).toBe(4 * HOUR);
  });
});

describe("onDayChange", () => {
  it("앱을 켠 채로 4:00 을 넘기면 부른다", () => {
    setClock(fixedClock("2026-08-14T03:59:00"));
    const changed = jest.fn();
    onDayChange(changed);

    // 경계를 넘은 시각으로 시계를 옮기고 타이머를 깨운다
    setClock(fixedClock("2026-08-14T04:00:30"));
    jest.advanceTimersByTime(2 * 60 * 1000);

    expect(changed).toHaveBeenCalledWith("2026-08-14");
  });

  it("백그라운드에 있는 동안 넘어갔으면 복귀가 잡는다 — 타이머는 못 깬다", () => {
    setClock(fixedClock("2026-08-14T03:00:00"));
    const changed = jest.fn();
    onDayChange(changed);

    setClock(fixedClock("2026-08-14T09:00:00"));
    comeBack();

    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("날이 그대로면 부르지 않는다 — 복귀할 때마다 새로 고치지 않는다", () => {
    setClock(fixedClock("2026-08-14T09:00:00"));
    const changed = jest.fn();
    onDayChange(changed);

    setClock(fixedClock("2026-08-14T23:00:00"));
    comeBack();

    expect(changed).not.toHaveBeenCalled();
  });

  it("같은 하루로 두 번 부르지 않는다 — 복귀가 겹쳐도 한 번이다", () => {
    setClock(fixedClock("2026-08-14T03:00:00"));
    const changed = jest.fn();
    onDayChange(changed);

    setClock(fixedClock("2026-08-14T09:00:00"));
    comeBack();
    comeBack();
    jest.advanceTimersByTime(HOUR);

    expect(changed).toHaveBeenCalledTimes(1);
  });

  it("다음 경계로 타이머를 다시 건다 — 이틀째도 잡는다", () => {
    setClock(fixedClock("2026-08-14T03:59:00"));
    const changed = jest.fn();
    onDayChange(changed);

    setClock(fixedClock("2026-08-14T04:00:30"));
    jest.advanceTimersByTime(2 * 60 * 1000);

    setClock(fixedClock("2026-08-15T04:00:30"));
    jest.advanceTimersByTime(24 * HOUR);

    expect(changed).toHaveBeenNthCalledWith(2, "2026-08-15");
  });

  it("해제하면 타이머도 복귀 구독도 걷는다", () => {
    const stopForeground = jest.fn();
    foreground.mockReturnValue(stopForeground);
    setClock(fixedClock("2026-08-14T03:59:00"));
    const changed = jest.fn();

    const stop = onDayChange(changed);
    stop();

    setClock(fixedClock("2026-08-14T04:00:30"));
    jest.advanceTimersByTime(2 * 60 * 1000);

    expect(changed).not.toHaveBeenCalled();
    expect(stopForeground).toHaveBeenCalledTimes(1);
  });
});
