import { WORRY_MAX_LENGTH, canHandOver } from "../model/worryBox";

describe("걱정상자 — 맡길 수 있는 걱정", () => {
  it("한 글자라도 적으면 맡길 수 있다", () => {
    expect(canHandOver("내일 발표")).toBe(true);
  });

  it("비었거나 공백뿐이면 맡길 걱정이 없다", () => {
    expect(canHandOver("")).toBe(false);
    expect(canHandOver("   ")).toBe(false);
  });

  it("100자까지 쓴다", () => {
    expect(WORRY_MAX_LENGTH).toBe(100);
  });
});
