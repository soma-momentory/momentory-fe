import { beatAt } from "../model/bodyRelease";

describe("몸에 힘 빼기 — 박자", () => {
  it("힘주기 5초는 5 → 1 로 센다", () => {
    expect(beatAt(0)).toEqual({ done: false, part: 0, phase: "tense", secondsLeft: 5 });
    expect(beatAt(4_999)).toEqual({ done: false, part: 0, phase: "tense", secondsLeft: 1 });
  });

  it("5초가 지나면 같은 부위의 풀기 10초다", () => {
    expect(beatAt(5_000)).toEqual({ done: false, part: 0, phase: "release", secondsLeft: 10 });
    expect(beatAt(14_999)).toEqual({ done: false, part: 0, phase: "release", secondsLeft: 1 });
  });

  it("15초마다 다음 부위로 넘어가고, 네 부위가 끝나면 완료다", () => {
    expect(beatAt(15_000)).toEqual({ done: false, part: 1, phase: "tense", secondsLeft: 5 });
    expect(beatAt(59_999)).toMatchObject({ done: false, part: 3, phase: "release" });
    expect(beatAt(60_000)).toEqual({ done: true });
  });

  it("시작 전 시각이 들어와도 첫 박자에 선다", () => {
    expect(beatAt(-300)).toEqual({ done: false, part: 0, phase: "tense", secondsLeft: 5 });
  });
});
