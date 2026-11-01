import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { primary } from "../../../../src/design/ds/color";
import { DesignEditorPanel, DRAFT_CHANGE_DEBOUNCE_MS, workflowStep } from "../DesignEditorPanel";

function Harness({ onDraftChanged }: { onDraftChanged: (id: string) => void }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <DesignEditorPanel
      activeDraftId={active}
      onActiveDraftChange={setActive}
      onDraftChanged={onDraftChanged}
      frames={[]}
      currentRoute="/(tabs)/home"
    />
  );
}

const openAllTokens = async () => {
  await fireEvent.press(screen.getByRole("button", { name: "모든 값 목록 보기" }));
  await fireEvent.press(screen.getByRole("button", { name: "모든 공통 값 (모든 화면)" }));
};

describe("DesignEditorPanel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("시안을 만들고 공통 값을 고치면 모아서 한 번 알린다 · 실행 취소 · 바꾼 목록", async () => {
    const onDraftChanged = jest.fn<(id: string) => void>();
    await render(<Harness onDraftChanged={onDraftChanged} />);
    expect(screen.getByText(/시안 없음\(A와 같음\)/)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "새 시안 만들기" }));
    expect(screen.getByTestId("design-editor-summary")).toHaveTextContent(/B = 시안 「시안」/);

    await openAllTokens();
    await fireEvent.changeText(screen.getByLabelText("공통 값 검색"), "primary.heavy");
    const input = screen.getByLabelText("브랜드 초록 · 진하게");
    expect(input.props.value).toBe(primary.heavy);
    await fireEvent.changeText(input, "rgb(51,85,68)");
    await fireEvent.changeText(input, "rgb(51,85,69)");
    expect(onDraftChanged).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_CHANGE_DEBOUNCE_MS + 10);
    });
    expect(onDraftChanged).toHaveBeenCalledTimes(1);
    // 바꾼 값은 A → B 로 보인다
    expect(screen.getAllByText("rgb(51,85,69)").length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole("button", { name: "바꾼 값 1" }));
    expect(screen.getByText("primary.heavy")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "실행 취소 (Ctrl+Z)" }));
    expect(screen.getByRole("button", { name: "바꾼 값 0" })).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_CHANGE_DEBOUNCE_MS + 10);
    });
    expect(onDraftChanged).toHaveBeenCalledTimes(2);
  });

  it("시안이 없으면 편집 탭 대신 시안 안내 카드를 보인다", async () => {
    await render(<Harness onDraftChanged={() => undefined} />);
    expect(screen.getByTestId("design-editor-empty")).toBeTruthy();
    expect(screen.getByText(/지금 앱\(A\)을 건드리지 않고 고쳐 보는 사본/)).toBeTruthy();
    expect(screen.getByLabelText("시안 이름")).toBeTruthy();
    expect(screen.queryByLabelText("공통 값 검색")).toBeNull();
    expect(screen.queryByRole("button", { name: "바꾼 값 0" })).toBeNull();
    expect(screen.getByTestId("design-editor-step-current")).toHaveTextContent(/시안 만들기/);
  });

  it("버튼마다 하는 일을 말하고, 꺼진 버튼은 이유를 함께 말한다", async () => {
    await render(<Harness onDraftChanged={() => undefined} />);
    expect(screen.getByRole("button", { name: "새 시안 만들기" }).props.accessibilityHint).toMatch(
      /B 화면에 걸어요/,
    );
    await fireEvent.press(screen.getByRole("button", { name: "새 시안 만들기" }));
    const undoButton = screen.getByRole("button", { name: "실행 취소 (Ctrl+Z)" });
    expect(undoButton.props.accessibilityHint).toMatch(/지금은 못 써요 — 되돌릴 편집이 없어요/);
    expect(
      screen.getByRole("button", { name: "바꾼 값 모두 되돌리기" }).props.accessibilityHint,
    ).toMatch(/바꾼 값이 없어요/);
    expect(screen.getByTestId("design-editor-step-current")).toHaveTextContent(/값 고치기/);
  });

  it("코드 반영 탭의 주 버튼은 AI에게 넘기기이고, 메모가 시안마다 남는다", async () => {
    await render(<Harness onDraftChanged={() => undefined} />);
    await fireEvent.press(screen.getByRole("button", { name: "새 시안 만들기" }));
    await fireEvent.press(screen.getByRole("button", { name: "코드 반영 · AI에게 넘기기" }));
    const handoff = screen.getByRole("button", { name: "AI에게 넘기기" });
    expect(handoff.props.accessibilityState.disabled).toBe(true);
    await fireEvent.changeText(screen.getByLabelText("AI에게 남길 메모"), "말풍선을 더 둥글게");
    expect(
      screen.getByRole("button", { name: "AI에게 넘기기" }).props.accessibilityState.disabled,
    ).toBe(false);
    expect(screen.getByTestId("design-editor-handoff-summary")).toHaveTextContent(/\/home/);
    expect(screen.queryByRole("button", { name: "시안 파일 저장" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "파일로 직접 옮기기 (고급)" }));
    expect(screen.getByRole("button", { name: "시안 파일 저장" })).toBeTruthy();
    expect(screen.getByTestId("design-editor-step-current")).toHaveTextContent(/값 고치기/);
  });
});

describe("workflowStep", () => {
  it("시안 없음 → 1 · 바꾼 값 없음 → 2 · 바꾼 값 있음 → 3 · 코드 반영 탭 → 4", () => {
    expect(workflowStep(false, 0, "screen")).toBe(1);
    expect(workflowStep(true, 0, "screen")).toBe(2);
    expect(workflowStep(true, 2, "screen")).toBe(3);
    expect(workflowStep(true, 2, "file")).toBe(4);
  });
});
