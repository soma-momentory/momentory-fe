import { describe, expect, it } from "@jest/globals";

import { emulateFontScale } from "../fontScale";

type Metrics = { fontScale: number; width: number; height: number; scale: number };
type Handler = (dims: { window?: Metrics; screen?: Metrics }) => void;

const fakeDimensions = () => {
  const window: Metrics = { fontScale: 1, width: 393, height: 852, scale: 2 };
  const handlers: Handler[] = [];
  return {
    handlers,
    get: (_dimension: "window" | "screen") => window,
    addEventListener: (_type: "change", handler: Handler) => {
      handlers.push(handler);
    },
  };
};

describe("emulateFontScale", () => {
  it("작은 배율도 OS 배율처럼 get 과 change 이벤트에 싣는다", () => {
    const dims = fakeDimensions();
    emulateFontScale(dims, 0.85);
    expect(dims.get("window").fontScale).toBe(0.85);
    expect(dims.get("window").width).toBe(393);

    let seen: number | undefined;
    dims.addEventListener("change", ({ window }) => {
      seen = window?.fontScale;
    });
    dims.handlers[0]?.({ window: { fontScale: 1, width: 393, height: 852, scale: 2 } });
    expect(seen).toBe(0.85);
  });

  it("1 이거나 값이 없으면 건드리지 않는다", () => {
    const one = fakeDimensions();
    const originalGet = one.get;
    emulateFontScale(one, 1);
    expect(one.get).toBe(originalGet);

    const none = fakeDimensions();
    emulateFontScale(none, undefined);
    expect(none.get("window").fontScale).toBe(1);
  });

  it("두 번 불러도 한 번만 감싼다", () => {
    const dims = fakeDimensions();
    emulateFontScale(dims, 1.3);
    const wrapped = dims.get;
    emulateFontScale(dims, 1.3);
    expect(dims.get).toBe(wrapped);
  });
});
