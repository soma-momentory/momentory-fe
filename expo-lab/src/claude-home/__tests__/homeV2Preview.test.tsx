import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react-native";
import { readFileSync } from "fs";
import { join } from "path";
import { View } from "react-native";

import { HomeV2Preview } from "../HomeV2Preview";
import { claudeHomeScenarios } from "../scenarios";
import { homeVariants } from "../variants";

describe("Expo Lab — claude-home 운영판 v2 변형", () => {
  it("시안 원본과 운영판 v2 가 나란히 등록돼 있다 — 원본은 비교용으로 남는다", () => {
    expect(homeVariants.map((variant) => [variant.id, variant.kind])).toEqual([
      ["claude-v2", "design"],
      ["app-v2", "app"],
    ]);
  });

  it.each(claudeHomeScenarios)(
    "claude-home 변형이 공유 뷰를 Mock 으로 렌더한다 — 시나리오 $id",
    async (scenario) => {
      const screen = await render(<HomeV2Preview scenarioId={scenario.id} onMessage={() => {}} />);
      expect(screen.getByRole("button", { name: "하루 돌아보기" })).toBeTruthy();
      expect(screen.getByText("밤 9:30엔 제가\n먼저 말 걸어요")).toBeTruthy();
      // 도크는 시나리오와 상관없이 늘 일곱 칸이다(WK-1)
      expect(screen.getAllByRole("button", { name: /요일 · / })).toHaveLength(7);
      if (scenario.tasks.length === 0) {
        expect(screen.getByText("오늘은 일정이 없어요")).toBeTruthy();
      } else {
        expect(screen.getByText(scenario.tasks[0]!.title)).toBeTruthy();
      }
      // 기본 시나리오 — 날씨 데이터와 읽지 않은 알림은 없다
      expect(screen.queryByLabelText(/날씨/)).toBeNull();
      expect(screen.getByRole("button", { name: "알림" })).toBeTruthy();
    },
  );

  it("감정 고정 시나리오는 세 가지 날을 함께 보인다 — 감정 · 일기만 · 기록 없음(DN-1)", async () => {
    const screen = await render(<HomeV2Preview scenarioId="5d" onMessage={() => {}} />);
    expect(screen.getByRole("button", { name: "월요일 · 불안함, 우울함" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "화요일 · 기록 있음, 감정 없음" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "금요일 · 기록 없음" })).toBeTruthy();
  });

  it("일정을 Lab 안에서만 바꾼다 — 체크 · 행동은 Mock 메시지로 닫힌다", async () => {
    const onMessage = jest.fn();
    const screen = await render(<HomeV2Preview scenarioId="5b" onMessage={onMessage} />);
    const checkbox = screen.getByRole("checkbox", { name: "프젝 회의 마침" });
    await fireEvent.press(checkbox);
    expect(
      screen.getByRole("checkbox", { name: "프젝 회의 마침" }).props.accessibilityState.checked,
    ).toBe(true);
    expect(screen.getByText("오늘 일정을 모두 마쳤어요.")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "하루 돌아보기" }));
    const measure = jest.spyOn(View.prototype, "measureInWindow").mockImplementation((callback) => {
      callback(0, 24, 44, 44);
    });
    await fireEvent.press(screen.getByRole("button", { name: "알림" }));
    measure.mockRestore();
    expect(onMessage).toHaveBeenNthCalledWith(1, "회고 진입은 Lab Mock 액션입니다.");
    expect(screen.getByTestId("inbox-popover-ready")).toBeTruthy();
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it("운영 모듈(store · API · 라우터 · 계측)을 import 하지 않는다", () => {
    const src = readFileSync(join(__dirname, "..", "HomeV2Preview.tsx"), "utf8");
    const imports = src.match(/from "[^"]+"/g) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    for (const line of imports) {
      expect(line).not.toMatch(/expo-router/);
      expect(line).not.toMatch(/features\/analytics/);
      expect(line).not.toMatch(/features\/[a-z]+\/data\//);
      expect(line).not.toMatch(/model\/(day|diary|settings)"/);
      expect(line).not.toMatch(/lib\/http/);
      expect(line).not.toMatch(/testing\/fixtures/);
    }
  });
});
