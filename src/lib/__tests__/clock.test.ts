import {
  SAMPLE_TODAY,
  SampleClock,
  SystemClock,
  clock,
  dayFrom,
  fixedClock,
  setClock,
} from "../clock";

// 모듈 전역 시계라 테스트 사이에 샌다 — 매번 기본값(SampleClock)으로 되돌린다
afterEach(() => setClock(SampleClock));

describe("하루의 경계 — 자정이 아니라 새벽 4:00 이다 (RULES.md)", () => {
  it("새벽 3:59 는 아직 어제다", () => {
    expect(dayFrom(new Date("2026-07-28T03:59:00"))).toBe("2026-07-27");
  });

  it("새벽 4:00 부터 오늘이다", () => {
    expect(dayFrom(new Date("2026-07-28T04:00:00"))).toBe("2026-07-28");
  });

  it("낮 시간은 그날 그대로다", () => {
    expect(dayFrom(new Date("2026-07-27T15:12:00"))).toBe("2026-07-27");
  });

  it("달의 첫날 새벽은 지난달로 넘어간다", () => {
    // 경계 계산이 문자열이 아니라 달력을 지나는지 본다
    expect(dayFrom(new Date("2026-08-01T02:00:00"))).toBe("2026-07-31");
  });
});

describe("시계 공급자", () => {
  it("Jest 기본값은 SampleClock — 테스트의 고정 하루다", () => {
    expect(clock.today()).toBe(SAMPLE_TODAY);
  });

  it("SampleClock 의 now() 도 샘플 하루에 속한다 — date 와 createdAt 이 어긋나지 않는다", () => {
    // 달력 날짜가 아니라 04:00 경계를 지난 「하루」로 검증한다
    expect(dayFrom(SampleClock.now())).toBe(SAMPLE_TODAY);
  });

  it("오전 0~3시의 now() 는 달력 날짜가 다음 날이어야 샘플 하루에 속한다", () => {
    jest.useFakeTimers({ now: new Date("2026-08-08T03:00:00") });
    try {
      const at = SampleClock.now();

      expect(dayFrom(at)).toBe(SAMPLE_TODAY);
      expect(at.getDate()).toBe(28); // 7/28 03:00 — 04:00 경계로는 7/27 이다
    } finally {
      jest.useRealTimers();
    }
  });

  it("fixedClock 은 테스트 고정 시각이고 4:00 경계를 지킨다", () => {
    setClock(fixedClock("2026-07-28T03:00:00"));

    expect(clock.today()).toBe("2026-07-27");
    expect(clock.now().toISOString()).toBe(new Date("2026-07-28T03:00:00").toISOString());
  });

  it("clock 은 import 시점이 아니라 호출 시점의 시계를 쓴다", () => {
    const before = clock.today();
    setClock(fixedClock("2026-01-02T12:00:00"));

    expect(before).toBe(SAMPLE_TODAY);
    expect(clock.today()).toBe("2026-01-02");
  });

  it("SystemClock 의 오늘도 경계 계산을 지난다", () => {
    expect(SystemClock.today()).toBe(dayFrom(new Date()));
  });
});
