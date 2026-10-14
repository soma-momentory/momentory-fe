import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";

import { CurrentHomeMockPreview } from "../MockPreview";
import { claudeHomeScenarios } from "../../claude-home/scenarios";

describe("Expo Lab current home mock", () => {
  it.each(claudeHomeScenarios)("renders mock scenario $id", async (scenario) => {
    const screen = await render(
      <CurrentHomeMockPreview scenarioId={scenario.id} onMessage={() => {}} />,
    );
    expect(screen.getByText("오늘 하루는 어땠어요?")).toBeTruthy();
    if (scenario.tasks.length === 0) {
      expect(screen.getByText("오늘 하루를 차곡차곡 담아볼까요?")).toBeTruthy();
    } else {
      expect(screen.getByText(scenario.tasks[0]!.title)).toBeTruthy();
    }
  });

  it("renders the app home UI with the empty scenario", async () => {
    const screen = await render(<CurrentHomeMockPreview scenarioId="5a" onMessage={() => {}} />);
    expect(screen.getByText("오늘 하루는 어땠어요?")).toBeTruthy();
    expect(screen.getByText("오늘 하루를 차곡차곡 담아볼까요?")).toBeTruthy();
    expect(screen.getByText("이번 주 감정")).toBeTruthy();
  });

  it("toggles a schedule without using the service store", async () => {
    const screen = await render(<CurrentHomeMockPreview scenarioId="5b" onMessage={() => {}} />);
    const checkbox = screen.getByRole("checkbox", { name: "프젝 회의 마침" });
    expect(checkbox.props.accessibilityState.checked).toBe(false);
    await fireEvent.press(checkbox);
    expect(
      screen.getByRole("checkbox", { name: "프젝 회의 마침" }).props.accessibilityState.checked,
    ).toBe(true);
    expect(screen.getByText("오늘 일정을 모두 마쳤어요.")).toBeTruthy();
  });

  it("adds a mock schedule locally", async () => {
    const screen = await render(<CurrentHomeMockPreview scenarioId="5a" onMessage={() => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "＋ 추가" }));
    await fireEvent.changeText(screen.getByLabelText("일정 제목"), "Lab 산책");
    await fireEvent.press(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByRole("checkbox", { name: "Lab 산책 마침" })).toBeTruthy();
  });

  it("keeps reflection and notification actions inside the Lab", async () => {
    const onMessage = jest.fn();
    const screen = await render(<CurrentHomeMockPreview scenarioId="5a" onMessage={onMessage} />);
    await fireEvent.press(screen.getByRole("button", { name: "지금 하루 돌아보기" }));
    await fireEvent.press(screen.getByLabelText("알림 설정"));
    expect(onMessage).toHaveBeenNthCalledWith(1, "회고 진입은 Lab Mock 액션입니다.");
    expect(onMessage).toHaveBeenNthCalledWith(2, "알림 설정은 Lab에 연결하지 않았습니다.");
  });
});
