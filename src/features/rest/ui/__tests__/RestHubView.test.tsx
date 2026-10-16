import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { REST_CONTENTS } from "@/features/rest/model/contents";
import { RestHubView } from "@/features/rest/ui/RestHubView";

describe("RestHubView", () => {
  it("운영 쉼터의 제목·요약·콘텐츠와 접근성 이름을 표시한다", async () => {
    const screen = await render(
      <RestHubView
        summary="오늘의 바람카드가 있어요"
        contents={REST_CONTENTS}
        onOpenCards={() => {}}
        onOpenContent={() => {}}
      />,
    );

    expect(screen.getByText("쉼터")).toBeTruthy();
    expect(screen.getByText("오늘의 바람카드가 있어요")).toBeTruthy();
    expect(screen.getByText("지금 나에게 맞는 쉼을 골라보세요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "바람카드 보기" })).toBeTruthy();
    for (const item of REST_CONTENTS) {
      expect(screen.getByRole("button", { name: `${item.title} 열기` })).toBeTruthy();
    }
  });

  it("카드의 기존 누름 효과 뒤에 호출자가 준 콜백을 호출한다", async () => {
    const onOpenCards = jest.fn();
    const onOpenContent = jest.fn();
    const screen = await render(
      <RestHubView
        summary="회고를 마치면 그날의 바람카드가 여기 남아요"
        contents={REST_CONTENTS}
        onOpenCards={onOpenCards}
        onOpenContent={onOpenContent}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "바람카드 보기" }));
    await waitFor(() => expect(onOpenCards).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByRole("button", { name: "감각연못 열기" }));
    await waitFor(() => expect(onOpenContent).toHaveBeenCalledWith(REST_CONTENTS[0]));
  });

  it("긴 요약과 추천 표시를 전달받은 그대로 렌더링한다", async () => {
    const summary = "화면이 좁거나 글씨가 커져도 안내 문구를 끝까지 읽을 수 있어야 해요.";
    const contents = REST_CONTENTS.map((item) =>
      item.id === "sensePond" ? { ...item, note: "오늘 추천" } : item,
    );
    const screen = await render(
      <RestHubView
        summary={summary}
        contents={contents}
        onOpenCards={() => {}}
        onOpenContent={() => {}}
      />,
    );

    expect(screen.getByText(summary)).toBeTruthy();
    expect(screen.getByText("오늘 추천")).toBeTruthy();
  });
});
