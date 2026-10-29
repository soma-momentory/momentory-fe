import { describe, expect, it } from "@jest/globals";
import { render } from "@testing-library/react-native";

import { BubbleComparisonPreview } from "../BubbleComparisonPreview";

describe("말풍선 4종 비교", () => {
  it("현재 버전과 첨부된 세 시안을 같은 질문·답변으로 함께 보여준다", async () => {
    const screen = await render(<BubbleComparisonPreview scenarioId="default" />);
    expect(screen.getAllByLabelText("질문: 오늘 가장 기억에 남는 순간은요?")).toHaveLength(4);
    expect(screen.getAllByLabelText("내 답변: 친구랑 웃으며 이야기했어요.")).toHaveLength(4);
    for (const id of ["current", "outline", "cutout", "stitched"]) {
      expect(screen.getByTestId(`bubble-comparison-${id}`)).toBeTruthy();
    }
  });

  it("긴 대화도 네 버전에서 같은 본문을 유지한다", async () => {
    const screen = await render(<BubbleComparisonPreview scenarioId="long" />);
    expect(
      screen.getAllByLabelText(
        "질문: 지은님, 오늘 다연 생파 일정도 있었네요. 하루 중 가장 기억에 남는 일은 뭐였어요? 그때 어떤 마음이 들었는지도 천천히 이야기해 주세요.",
      ),
    ).toHaveLength(4);
  });
});
