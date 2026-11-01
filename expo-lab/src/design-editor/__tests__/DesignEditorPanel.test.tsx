import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { primary } from "../../../../src/design/ds/color";
import { DesignEditorPanel, DRAFT_CHANGE_DEBOUNCE_MS } from "../DesignEditorPanel";

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

describe("DesignEditorPanel", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("시안을 만들고 토큰을 고치면 모아서 한 번 알린다 · 되돌리기 · 바뀐 것 목록", async () => {
    const onDraftChanged = jest.fn<(id: string) => void>();
    await render(<Harness onDraftChanged={onDraftChanged} />);
    expect(screen.getByText(/시안 없음\(승인본\)/)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "새 시안" }));
    expect(screen.getByText(/시안 「시안」/)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("토큰 검색"), "primary.heavy");
    const input = screen.getByLabelText("브랜드 초록 · 진하게");
    expect(input.props.value).toBe(primary.heavy);
    await fireEvent.changeText(input, "rgb(51,85,68)");
    await fireEvent.changeText(input, "rgb(51,85,69)");
    expect(onDraftChanged).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_CHANGE_DEBOUNCE_MS + 10);
    });
    expect(onDraftChanged).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/승인값/)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "바뀐 것 1" }));
    expect(screen.getByText(/primary\.heavy: .* → rgb\(51,85,69\)/)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "되돌리기 (Ctrl+Z)" }));
    expect(screen.getByRole("button", { name: "바뀐 것 0" })).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_CHANGE_DEBOUNCE_MS + 10);
    });
    expect(onDraftChanged).toHaveBeenCalledTimes(2);
  });

  it("시안이 없으면 편집 칸을 열지 않는다", async () => {
    await render(<Harness onDraftChanged={() => undefined} />);
    await fireEvent.changeText(screen.getByLabelText("토큰 검색"), "primary.heavy");
    expect(screen.queryByLabelText("브랜드 초록 · 진하게")).toBeNull();
    expect(screen.getByText(/시안을 고르거나 만들면/)).toBeTruthy();
  });
});
