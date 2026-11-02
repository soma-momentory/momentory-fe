import { describe, expect, it } from "@jest/globals";

import { retargetScheduleEdit } from "../liveTarget";

const row = (id: string, patch: { hidden?: boolean; source?: string } = {}) => ({
  id,
  source: "manual",
  ...patch,
});

describe("retargetScheduleEdit — 일정 수정 id 를 프레임의 오늘 목록에 맞춘다", () => {
  it("일정 수정이 아니거나 「new」면 그대로", () => {
    expect(retargetScheduleEdit("/home", [])).toBe("/home");
    expect(retargetScheduleEdit("/home/schedule/new", [])).toBe("/home/schedule/new");
    expect(retargetScheduleEdit("/diary/3", [])).toBe("/diary/3");
  });

  it("오늘 목록에 있는 id 면 그대로", () => {
    expect(retargetScheduleEdit("/home/schedule/7", [row("7")])).toBe("/home/schedule/7");
  });

  it("없는 id 면 오늘 목록의 일정으로 — 손으로 넣은 것을 먼저", () => {
    const list = [row("1", { source: "calendar" }), row("2", { hidden: true }), row("3")];
    expect(retargetScheduleEdit("/home/schedule/86", list)).toBe("/home/schedule/3");
    expect(retargetScheduleEdit("/home/schedule/86", [row("9", { source: "calendar" })])).toBe(
      "/home/schedule/9",
    );
  });

  it("오늘 일정이 없으면 옮기지 않는다(null)", () => {
    expect(retargetScheduleEdit("/home/schedule/1", [])).toBeNull();
  });
});
