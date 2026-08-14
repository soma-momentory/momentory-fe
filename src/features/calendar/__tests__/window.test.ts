import { sameRange, syncWindow } from "@/features/calendar/model/window";

describe("동기화 창 — 이전 달 1일 ~ 다음 달 말일", () => {
  it("8월이면 7/1 ~ 9/30 이다", () => {
    expect(syncWindow("2026-08-14")).toEqual({ from: "2026-07-01", to: "2026-09-30" });
  });

  it("그 달 어느 날이든 같은 창이다", () => {
    expect(syncWindow("2026-08-01")).toEqual(syncWindow("2026-08-31"));
  });

  it("달이 바뀌면 창이 밀린다 — 9월이면 8/1 ~ 10/31", () => {
    expect(syncWindow("2026-09-01")).toEqual({ from: "2026-08-01", to: "2026-10-31" });
  });

  it("연초·연말에 해를 넘는다", () => {
    expect(syncWindow("2026-01-15")).toEqual({ from: "2025-12-01", to: "2026-02-28" });
    expect(syncWindow("2026-12-15")).toEqual({ from: "2026-11-01", to: "2027-01-31" });
  });

  it("윤년 2월 말일을 직접 세지 않는다", () => {
    // 2028 은 윤년 — 다음 달의 「0일」로 잡으므로 29일이 나온다
    expect(syncWindow("2028-01-10").to).toBe("2028-02-29");
  });

  it("`from` 은 항상 1일이고 `to` 는 항상 말일이다", () => {
    for (const month of ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]) {
      const { from, to } = syncWindow(`2026-${month}-15`);
      expect(from.endsWith("-01")).toBe(true);
      // 말일 + 1 은 다음 달 1일이다
      const next = new Date(`${to}T12:00:00`);
      next.setDate(next.getDate() + 1);
      expect(next.getDate()).toBe(1);
    }
  });
});

describe("범위 비교 — 해시와 한 몸이다", () => {
  it("같으면 같다", () => {
    expect(sameRange(syncWindow("2026-08-01"), syncWindow("2026-08-31"))).toBe(true);
  });

  it("달이 바뀌면 다르다 — 내용이 같아도 다시 화해해야 한다", () => {
    expect(sameRange(syncWindow("2026-08-31"), syncWindow("2026-09-01"))).toBe(false);
  });
});
