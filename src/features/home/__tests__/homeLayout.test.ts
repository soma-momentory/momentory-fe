import { homeLayoutMode } from "@/features/home/model/homeLayout";

describe("홈 v2 작은 화면 배치", () => {
  it("실제 행 간격 두 칸을 확보할 수 있으면 일정 목록만 스크롤한다", () => {
    expect(homeLayoutMode({ availableHeight: 106, rowPitch: 48 })).toBe("listOnly");
  });

  it("같은 화면에서도 큰 글씨로 행이 커지면 날짜부터 함께 스크롤한다", () => {
    expect(homeLayoutMode({ availableHeight: 105, rowPitch: 48 })).toBe("wholeBody");
    expect(homeLayoutMode({ availableHeight: 106, rowPitch: 64 })).toBe("wholeBody");
  });

  it("경계에서 반 행의 여유가 생길 때까지 원래 배치를 유지한다", () => {
    expect(homeLayoutMode({ availableHeight: 106, rowPitch: 48, previous: "wholeBody" })).toBe(
      "wholeBody",
    );
    expect(homeLayoutMode({ availableHeight: 130, rowPitch: 48, previous: "wholeBody" })).toBe(
      "listOnly",
    );
  });

  it("일정이 없으면 실제 빈 카드 높이도 확보한다", () => {
    expect(homeLayoutMode({ availableHeight: 120, rowPitch: 48, emptyHeight: 118 })).toBe(
      "wholeBody",
    );
  });
});
