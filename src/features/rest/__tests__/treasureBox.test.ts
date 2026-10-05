import type { Treasure } from "../data/treasureApi";
import { TREASURE_MAX_LENGTH, canTuck, groupByDay, markAt } from "../model/treasureBox";

const t = (id: string, date: string, createdAt: string): Treasure => ({
  id,
  date,
  content: `보물 ${id}`,
  createdAt,
});

describe("오늘의 보물함 — 규칙", () => {
  it("한 글자라도 적으면 담을 수 있고, 공백뿐이면 담을 것이 없다 · 100자까지", () => {
    expect(canTuck("산책을 다녀왔어요")).toBe(true);
    expect(canTuck("   ")).toBe(false);
    expect(TREASURE_MAX_LENGTH).toBe(100);
  });

  it("표식은 별 · 하트 · 새싹 순서로 돈다", () => {
    expect([0, 1, 2, 3, 4].map(markAt)).toEqual(["star", "heart", "sprout", "star", "heart"]);
  });

  it("모든 보물을 하루씩 묶는다 — 최신 날 먼저, 하루 안은 담은 순서", () => {
    const all = [
      t("3", "2026-10-05", "2026-10-05T10:00:00Z"),
      t("2", "2026-10-05", "2026-10-05T09:00:00Z"),
      t("1", "2026-10-03", "2026-10-03T09:00:00Z"),
    ];
    expect(groupByDay(all).map((d) => [d.date, d.treasures.map((x) => x.id)])).toEqual([
      ["2026-10-05", ["2", "3"]],
      ["2026-10-03", ["1"]],
    ]);
  });
});
