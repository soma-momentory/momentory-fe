import { act, fireEvent, render } from "@testing-library/react-native";
import { PixelRatio } from "react-native";

import { text } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";
import { ROW_PITCH, rowPitchFor, ScheduleList } from "@/features/home/ui/ScheduleList";

/**
 * 일정 목록의 **행 기하** — 한 칸(`pitch`)은 잰 값 하나다
 * (계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §2.3 · §7.1 P2 · 결정 DN-3).
 *
 * 운영 홈도 같은 목록을 쓴다 — 배율 1 에서는 예전과 같은 44 여야 하고(운영 홈 테스트가 그대로
 * 통과한다), 줄이 커지면 줄 위치 · 목록 높이 · 빈 슬롯 · 끌기 칸 수 · 비켜서는 거리가 함께 커진다.
 */

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const schedules: Schedule[] = Array.from({ length: 6 }, (_, i) => ({
  id: `s${i}`,
  date: "2026-10-15",
  title: `일정 ${i + 1}`,
  time: null,
  source: "manual",
  externalId: null,
  done: false,
  doneAt: null,
  emotions: [],
  hidden: false,
}));

const setup = async (extra: Partial<Parameters<typeof ScheduleList>[0]> = {}) => {
  const props = {
    schedules,
    onToggleDone: jest.fn(),
    onMore: jest.fn(),
    onMove: jest.fn(),
    onReorder: jest.fn(),
    onRowPitch: jest.fn(),
    ...extra,
  };
  const r = await render(<ScheduleList {...props} />);
  const top = (i: number) => flatten(r.getByTestId(`schedule-row-s${i}`).props.style).top;
  const translate = (i: number) =>
    (
      flatten(r.getByTestId(`schedule-row-s${i}`).props.style).transform as { translateY: number }[]
    )[0]?.translateY;
  const listHeight = () => flatten(r.getByTestId("schedule-list").props.style).height;
  const measureFirst = async (height: number) =>
    fireEvent(r.getByTestId("schedule-row-measure"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 300, height } },
    });
  const title = (i: number) => r.getByLabelText(`일정 ${i + 1}`);
  /** 꾹 눌러(220ms) 끌기를 시작한다 */
  const grab = async (i: number) => {
    await fireEvent(title(i), "responderGrant", { nativeEvent: { pageY: 0 } });
    await act(async () => {
      jest.advanceTimersByTime(220);
    });
  };
  const moveTo = async (i: number, dy: number) =>
    fireEvent(title(i), "responderMove", { nativeEvent: { pageY: dy } });
  const release = async (i: number) => fireEvent(title(i), "responderRelease", {});
  return { r, props, top, translate, listHeight, measureFirst, grab, moveTo, release };
};

beforeEach(() => {
  jest.useFakeTimers();
  // 배율 1 의 기기 — 재기 전의 어림도 배율 1 이다
  jest.spyOn(PixelRatio, "getFontScale").mockReturnValue(1);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("ScheduleList 행 기하 — 한 칸은 잰 값 하나", () => {
  it("배율 1 에서는 예전과 같은 44 다 — 운영 홈의 배치가 그대로다", async () => {
    const { top, listHeight, measureFirst, props } = await setup();
    expect(ROW_PITCH).toBe(44);
    expect(top(1)).toBe(44);

    // 배율 1 의 줄 내용(행간)을 재도 한 칸은 그대로다
    await measureFirst(text.body1.lineHeight);
    expect(top(1)).toBe(44);
    expect(listHeight()).toBe(6 * 44);
    expect(props.onRowPitch).toHaveBeenLastCalledWith(44);
  });

  it("첫 줄 높이가 커지면(글꼴 배율 2.0 흉내 · onLayout 48) 줄 top · 목록 높이 · 빈 슬롯 위치가 모두 새 pitch 를 쓴다 — 줄이 겹치지 않는다", async () => {
    const { r, top, listHeight, measureFirst, grab, moveTo } = await setup();
    await measureFirst(48);

    const pitch = rowPitchFor("ds", 48);
    expect(pitch).toBe(ROW_PITCH + (48 - text.body1.lineHeight));
    // 두 줄 사이가 줄 높이(48)보다 넓다 — 겹치지 않는다
    expect(pitch).toBeGreaterThan(48);
    expect(top(1)).toBe(pitch);
    expect(top(5)).toBe(5 * pitch);
    expect(listHeight()).toBe(6 * pitch);

    await grab(0);
    await moveTo(0, pitch);
    const slot = flatten(r.getByTestId("schedule-drop-slot").props.style);
    const slotHeight = slot.height as number;
    expect(slot.top).toBe(pitch + (pitch - slotHeight) / 2);
  });

  it("같은 pitch 로 끌기 칸 수를 센다 — dy = 2.4 × pitch 면 두 칸 옮긴다 · 44 기준이면 세 칸이 되던 경우를 막는다", async () => {
    const { props, measureFirst, grab, moveTo, release } = await setup();
    await measureFirst(48);
    const pitch = rowPitchFor("ds", 48);
    const dy = 2.4 * pitch;
    // 고정 44 였다면 몇 칸이었나 — 셋 이상으로 어긋난다
    expect(Math.round(dy / ROW_PITCH)).toBeGreaterThanOrEqual(3);

    await grab(0);
    await moveTo(0, dy);
    await release(0);

    expect(props.onReorder).toHaveBeenCalledWith("s0", 2);
  });

  it("비켜서는 거리 = pitch", async () => {
    const { translate, measureFirst, grab, moveTo } = await setup();
    await measureFirst(48);
    const pitch = rowPitchFor("ds", 48);

    await grab(0);
    await moveTo(0, 2 * pitch);

    expect(translate(1)).toBe(-pitch);
    expect(translate(2)).toBe(-pitch);
    expect(translate(3)).toBe(0);
  });

  it("끄는 도중 pitch 가 바뀌어도 이번 끌기는 시작 때 값으로 끝난다", async () => {
    const { props, top, measureFirst, grab, moveTo, release } = await setup();
    const before = ROW_PITCH;

    await grab(0);
    // 끄는 사이 글꼴이 커졌다 — 새 값은 아직 쓰지 않는다
    await measureFirst(60);
    expect(top(1)).toBe(before);

    await moveTo(0, 2.4 * before);
    await release(0);
    expect(props.onReorder).toHaveBeenCalledWith("s0", 2);

    // 끌기가 끝난 뒤에는 새 값이다
    const after = rowPitchFor("ds", 60);
    expect(top(1)).toBe(after);
    expect(props.onRowPitch).toHaveBeenLastCalledWith(after);
  });

  it("onRowPitch 로 올린 값과 줄 배치에 쓴 값이 같다 — LY-1 이 쓰는 1행 높이와 목록 기하의 일치", async () => {
    const { props, top, measureFirst } = await setup();
    await measureFirst(52);
    const last = (props.onRowPitch as jest.Mock).mock.calls.at(-1)?.[0];
    expect(last).toBe(top(1));
  });

  it("종이 목록(paper)도 같은 계산을 지난다 — 배율 1 의 한 칸은 v2 줄 높이 48", async () => {
    const { top, measureFirst, props } = await setup({ appearance: "paper" });
    expect(top(1)).toBe(48);
    await measureFirst(50);
    expect(top(1)).toBe(rowPitchFor("paper", 50));
    expect(props.onRowPitch).toHaveBeenLastCalledWith(rowPitchFor("paper", 50));
  });

  it("접근성 「위로/아래로 이동」은 pitch 와 무관하게 한 칸씩", async () => {
    const { r, props, measureFirst } = await setup();
    await measureFirst(48);

    await fireEvent(r.getByLabelText("일정 3"), "accessibilityAction", {
      nativeEvent: { actionName: "moveDown" },
    });
    await fireEvent(r.getByLabelText("일정 3"), "accessibilityAction", {
      nativeEvent: { actionName: "moveUp" },
    });

    expect(props.onMove).toHaveBeenNthCalledWith(1, "s2", "down");
    expect(props.onMove).toHaveBeenNthCalledWith(2, "s2", "up");
    expect(props.onReorder).not.toHaveBeenCalled();
  });

  it("끄는 동안 바깥 스크롤을 멈추라고 알린다", async () => {
    const onDragStateChange = jest.fn();
    const { grab, release } = await setup({ onDragStateChange });
    await grab(1);
    expect(onDragStateChange).toHaveBeenLastCalledWith(true);
    await release(1);
    expect(onDragStateChange).toHaveBeenLastCalledWith(false);
  });
});
