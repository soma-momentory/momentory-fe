import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import type { Schedule } from "@/features/home/model/types";
import { HomeView, type HomeViewActions, type HomeViewModel } from "../HomeView";

const schedules: Schedule[] = Array.from({ length: 7 }, (_, index) => ({
  id: `s${index}`,
  date: "2026-10-14",
  title: `일정 ${index + 1}`,
  time: null,
  source: index === 1 ? "calendar" : "manual",
  externalId: index === 1 ? "mock-calendar" : null,
  done: index === 0,
  doneAt: index === 0 ? "2026-10-14T09:00:00.000Z" : null,
  emotions: [],
  hidden: index === 6,
}));

const model: HomeViewModel = {
  today: "2026-10-14",
  schedules,
  week: [],
  retroReminderTime: null,
};

const actions = (): HomeViewActions => ({
  onToggleDone: jest.fn(),
  onMove: jest.fn(),
  onReorder: jest.fn(),
  onHideCalendarSchedule: jest.fn(),
  onDeleteManualSchedule: jest.fn(),
  onEditManualSchedule: jest.fn(),
  onAddSchedule: jest.fn(),
  onStartReflection: jest.fn(),
  onOpenNotificationSettings: jest.fn(),
});

const appFrame = (body: ReactNode, overlay: ReactNode) => (
  <View testID="app-frame">
    <View testID="home-body">{body}</View>
    {overlay}
  </View>
);
const labFrame = (body: ReactNode, overlay: ReactNode) => (
  <View testID="lab-phone">
    <View testID="home-body">{body}</View>
    {overlay}
  </View>
);

describe("shared HomeView", () => {
  beforeEach(() => {
    jest.spyOn(View.prototype, "measureInWindow").mockImplementation((callback) => {
      callback(0, 280, 44, 44);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the same content for app and Lab frames with identical Props", async () => {
    const app = await render(
      <HomeView
        model={model}
        actions={actions()}
        renderFrame={appFrame}
        menuTopFromPageY={(y) => y}
      />,
    );
    const lab = await render(
      <HomeView
        model={model}
        actions={actions()}
        renderFrame={labFrame}
        menuTopFromPageY={(y) => y}
      />,
    );

    expect(JSON.stringify(app.toJSON()).replace('"app-frame"', '"frame"')).toEqual(
      JSON.stringify(lab.toJSON()).replace('"lab-phone"', '"frame"'),
    );
    expect(app.getAllByRole("checkbox").map((item) => item.props.accessibilityLabel)).toEqual(
      lab.getAllByRole("checkbox").map((item) => item.props.accessibilityLabel),
    );
    expect(app.getByText("오늘 하루는 어땠어요?")).toBeTruthy();
    expect(lab.getByText("오늘 하루는 어땠어요?")).toBeTruthy();
    expect(app.getByText("5개 남음")).toBeTruthy();
    expect(lab.getByText("5개 남음")).toBeTruthy();
    expect(app.queryByText("일정 7")).toBeNull();
    expect(lab.queryByText("일정 7")).toBeNull();
  });

  it("folds after five visible schedules and reveals the remainder", async () => {
    const screen = await render(
      <HomeView
        model={model}
        actions={actions()}
        renderFrame={appFrame}
        menuTopFromPageY={(y) => y}
      />,
    );
    expect(screen.queryByText("일정 6")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "1개 더 보기" }));
    expect(screen.getByText("일정 6")).toBeTruthy();
    expect(screen.queryByText("일정 7")).toBeNull();
  });

  it("delegates actions without performing service effects", async () => {
    const handlers = actions();
    const screen = await render(
      <HomeView
        model={model}
        actions={handlers}
        renderFrame={appFrame}
        menuTopFromPageY={(y) => y - 20}
      />,
    );
    await fireEvent.press(screen.getByRole("button", { name: "지금 하루 돌아보기" }));
    await fireEvent.press(screen.getByRole("button", { name: "＋ 추가" }));
    await fireEvent.press(screen.getByLabelText("알림 설정"));
    await fireEvent.press(screen.getByLabelText("일정 3 마침"));
    expect(handlers.onStartReflection).toHaveBeenCalledTimes(1);
    expect(handlers.onAddSchedule).toHaveBeenCalledTimes(1);
    expect(handlers.onOpenNotificationSettings).toHaveBeenCalledTimes(1);
    expect(handlers.onToggleDone).toHaveBeenCalledWith("s2");

    await fireEvent.press(screen.getByLabelText("일정 2 더보기"), {
      nativeEvent: { pageY: 300 },
    });
    await fireEvent.press(screen.getByText("삭제하기"));
    expect(handlers.onHideCalendarSchedule).toHaveBeenCalledWith("s1");
  });

  it("accepts an async frame coordinate conversion for the Lab menu", async () => {
    const handlers = actions();
    const menuTopFromPageY = jest.fn(async (pageY: number) => pageY - 35);
    const screen = await render(
      <HomeView
        model={model}
        actions={handlers}
        renderFrame={labFrame}
        menuTopFromPageY={menuTopFromPageY}
      />,
    );
    await fireEvent.press(screen.getByLabelText("일정 3 더보기"), {
      nativeEvent: { pageY: 300 },
    });
    expect(menuTopFromPageY).toHaveBeenCalledWith(280);
    expect(menuTopFromPageY).toHaveBeenCalledWith(324);
    await screen.findByText("수정하기");
    await fireEvent.press(screen.getByText("수정하기"));
    expect(handlers.onEditManualSchedule).toHaveBeenCalledWith("s2");
  });
});
