import { asOneParagraph } from "../body";

describe("asOneParagraph — 일기는 한 덩어리로 읽는다", () => {
  it("문단 사이 빈 줄을 공백 하나로 접는다", () => {
    expect(asOneParagraph("회의가 길었다.\n\n저녁엔 라면을 먹었다.")).toBe(
      "회의가 길었다. 저녁엔 라면을 먹었다.",
    );
  });

  it("줄 끝·줄 앞의 공백이 겹치지 않는다", () => {
    expect(asOneParagraph("  하나.  \n  둘.\n")).toBe("하나. 둘.");
  });

  it("줄바꿈이 없으면 그대로다", () => {
    expect(asOneParagraph("오늘은 조용했다.")).toBe("오늘은 조용했다.");
  });
});
