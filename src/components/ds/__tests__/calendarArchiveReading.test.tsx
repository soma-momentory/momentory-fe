import { render } from "@testing-library/react-native";

import { Calendar } from "../Calendar";
import { DesignViewportContext } from "../DesignViewport";

import { archiveType, interaction, label as labelColor, text } from "@/design/ds";

/** 기기 글씨 배율을 고른다 — 기본값은 큰 글씨가 아닌 1 이다 */
const mockWindow = jest.fn(() => ({ fontScale: 1, width: 393, height: 852, scale: 3 }));
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow(),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const calendar = (archive: boolean) => (
  <Calendar
    month="2026-07"
    selectedDate="2026-07-13"
    onSelect={jest.fn()}
    onMonthStep={jest.fn()}
    dateSticker={archive}
    compactDateSticker={archive}
  />
);

const renderCalendar = (archive: boolean) => render(calendar(archive));

/** 요일 글자를 담은 머리글 칸의 높이 */
const headHeight = (r: Awaited<ReturnType<typeof renderCalendar>>) =>
  flatten(r.getByText("월").parent?.props.style).height;

beforeEach(() => {
  mockWindow.mockReturnValue({ fontScale: 1, width: 393, height: 852, scale: 3 });
});

describe("보관함 달력의 읽기 값", () => {
  it("날짜가 가장 크고 요일이 그다음이며, 둘 다 읽히는 색이다", async () => {
    const r = await renderCalendar(true);

    const weekday = flatten(r.getByText("월").props.style);
    expect(weekday.fontSize).toBe(archiveType.weekday.fontSize);
    expect(weekday.color).toBe(labelColor.neutral);

    const date = flatten(r.getByText("22").props.style);
    expect(date.fontSize).toBe(archiveType.date.fontSize);
    expect(date.color).toBe(labelColor.normal);
    expect(r.getByText("22").props.numberOfLines).toBe(1);
  });

  it("칸은 날짜 줄 20 + 점 6 + 얼굴 22 라 숫자가 점 · 얼굴과 겹치지 않는다", async () => {
    const r = await renderCalendar(true);

    expect(flatten(r.getByLabelText("22일").props.style).height).toBe(48);
    expect(headHeight(r)).toBe(24);
  });

  it("글씨가 1.3 배면 날짜 줄과 머리글이 함께 자라 점과 얼굴을 누르지 않는다", async () => {
    mockWindow.mockReturnValue({ fontScale: 1.3, width: 393, height: 852, scale: 3 });
    // 보관함은 비례 화면(`TabScreen`) 안에 있다 — 그 안의 배율 천장으로 잰다
    const r = await render(
      <DesignViewportContext.Provider value={{ scale: 1, active: true }}>
        {calendar(true)}
      </DesignViewportContext.Provider>,
    );

    expect(flatten(r.getByLabelText("22일").props.style).height).toBe(54);
    expect(headHeight(r)).toBe(32);
  });
});

describe("쉼터 달력은 그대로다", () => {
  it.each([1, 1.3])("글씨 %s 배에서 글자 단·색·칸 높이가 바뀌지 않는다", async (fontScale) => {
    mockWindow.mockReturnValue({ fontScale, width: 393, height: 852, scale: 3 });
    const r = await renderCalendar(false);

    const weekday = flatten(r.getByText("월").props.style);
    expect(weekday.fontSize).toBe(text.caption2.fontSize);
    expect(weekday.color).toBe(labelColor.assistive);

    const date = flatten(r.getByText("22").props.style);
    expect(date.fontSize).toBe(text.caption2.fontSize);
    expect(date.color).toBe(interaction.inactive);

    expect(flatten(r.getByLabelText("22일").props.style).height).toBe(38);
    expect(headHeight(r)).toBe(24);
  });
});
