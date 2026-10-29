import { describe, expect, it } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { RetroDiaryPreview } from "../RetroDiaryPreview";

describe("회고 미리보기의 키보드", () => {
  it("스티커 두 개를 선택하고 해제한 뒤 보낼 수 있다", async () => {
    const screen = await render(
      <RetroDiaryPreview screen="talk" scenarioId="choices" onMessage={() => {}} />,
    );
    const option = (name: string) => screen.getByRole("button", { name });
    await fireEvent.press(option("반가움"));
    await fireEvent.press(option("행복함"));
    await fireEvent.press(option("아쉬움"));
    expect(option("아쉬움").props.accessibilityState.selected).toBe(false);
    await fireEvent.press(option("반가움"));
    expect(option("반가움").props.accessibilityState.selected).toBe(false);
    await fireEvent.press(option("보내기"));
    expect(screen.getByLabelText("내 답변: 행복함")).toBeTruthy();
    expect(option("행복함").props.accessibilityState.selected).toBe(false);
  });

  it("바람 설명은 선택 전후로 유지되고 직접 적기는 키보드를 연다", async () => {
    const screen = await render(
      <RetroDiaryPreview screen="talk" scenarioId="wishes" onMessage={() => {}} />,
    );
    expect(screen.getByText("마음을 나누고 함께하고 싶은 바람")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "연결" }));
    expect(screen.getByText("마음을 나누고 함께하고 싶은 바람")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "직접 적기" }));
    expect(screen.getByTestId("retro-preview-keyboard")).toBeTruthy();
    expect(screen.getByLabelText("답변")).toBeTruthy();
  });

  it("입력창에서 열고 내리기 버튼으로 닫아도 작성 중인 답변을 유지한다", async () => {
    const screen = await render(
      <RetroDiaryPreview screen="talk" scenarioId="default" onMessage={() => {}} />,
    );
    expect(screen.queryByTestId("retro-preview-keyboard")).toBeNull();

    await fireEvent(screen.getByLabelText("답변"), "focus");
    expect(screen.getByTestId("retro-preview-keyboard")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("답변"), "오늘 친구를 만났어요.");

    await fireEvent.press(screen.getByRole("button", { name: "키보드 내리기" }));
    expect(screen.queryByTestId("retro-preview-keyboard")).toBeNull();
    expect(screen.getByDisplayValue("오늘 친구를 만났어요.")).toBeTruthy();

    await fireEvent(screen.getByLabelText("답변"), "focus");
    expect(screen.getByTestId("retro-preview-keyboard")).toBeTruthy();
    expect(screen.getByDisplayValue("오늘 친구를 만났어요.")).toBeTruthy();
  });

  it("열린 배치에서도 대화 영역을 누르면 닫고 다시 입력하면 열린다", async () => {
    const screen = await render(
      <RetroDiaryPreview screen="talk" scenarioId="typing" onMessage={() => {}} />,
    );
    expect(screen.getByTestId("retro-preview-keyboard")).toBeTruthy();

    await fireEvent(screen.getByTestId("ds-chat-scroll"), "pointerDown");
    expect(screen.queryByTestId("retro-preview-keyboard")).toBeNull();

    await fireEvent(screen.getByLabelText("답변"), "focus");
    expect(screen.getByTestId("retro-preview-keyboard")).toBeTruthy();
  });
});
