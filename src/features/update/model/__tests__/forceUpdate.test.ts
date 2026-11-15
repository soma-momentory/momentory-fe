import { describe, expect, it } from "@jest/globals";

import { isOlder, mustUpdate, parseVersion } from "../forceUpdate";

describe("강제 업데이트 판정", () => {
  it("버전 문자열을 숫자로 읽고, 모양이 틀리면 null", () => {
    expect(parseVersion("1.4.2")).toEqual([1, 4, 2]);
    expect(parseVersion(" 1.5 ")).toEqual([1, 5]);
    expect(parseVersion("1.4.2-beta")).toBeNull();
    expect(parseVersion(142)).toBeNull();
  });

  it("자리별로 숫자 크기를 비교한다(문자열 비교가 아니다)", () => {
    expect(isOlder([1, 4, 2], [1, 10, 0])).toBe(true);
    expect(isOlder([1, 10, 0], [1, 4, 2])).toBe(false);
    expect(isOlder([1, 5], [1, 5, 0])).toBe(false);
    expect(isOlder([1, 4, 9], [1, 5])).toBe(true);
  });

  it("현재 플랫폼의 최소 버전보다 낮을 때만 막는다", () => {
    const policy = { ios: "1.5.0", android: "1.4.0" };
    expect(mustUpdate(policy, "ios", "1.4.2")).toBe(true);
    expect(mustUpdate(policy, "android", "1.4.2")).toBe(false);
    expect(mustUpdate(policy, "ios", "1.5.0")).toBe(false);
  });

  it("읽을 수 없으면 막지 않는다", () => {
    expect(mustUpdate(null, "ios", "1.0.0")).toBe(false);
    expect(mustUpdate({ android: "9.0.0" }, "ios", "1.0.0")).toBe(false);
    expect(mustUpdate({ ios: "oops" }, "ios", "1.0.0")).toBe(false);
    expect(mustUpdate({ ios: "9.0.0" }, "ios", undefined)).toBe(false);
    expect(mustUpdate({ web: "9.0.0" }, "web", "1.0.0")).toBe(false);
  });
});
