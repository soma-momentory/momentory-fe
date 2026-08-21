import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import ScheduleEdit from "../schedule/[id]";
import NewSchedule from "../schedule/new";

import { useDay } from "@/features/home/model/day";
import { testSchedules } from "@/testing/fixtures";

// 어떤 일정을 열었는지는 라우트 파라미터가 정한다 — 테스트마다 바꾼다
let mockParams: { id: string } = { id: "s3" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

/**
 * 비활성은 **면 색이 아니라 동작**으로 단언한다 — 디자인이 바뀌어도 규칙은 같다
 * (온보딩 테스트와 같은 방식 · `PLAN.md` A-9).
 */
const disabled = (node: { props?: { accessibilityState?: { disabled?: boolean } } }) =>
  node.props?.accessibilityState?.disabled === true;

beforeEach(() => {
  mockParams = { id: "s3" }; // 면접 스터디 — 캘린더에서 온 미완료 일정
  useDay.setState({ schedules: testSchedules() });
  jest.clearAllMocks();
});

describe("12-c · ⋮ 「수정하기」가 여는 입력 바 (Schedule.dc.html 4-3)", () => {
  it("직접 추가한 일정은 제목을 고칠 수 있다", async () => {
    mockParams = { id: "s4" }; // 운동 가기 — source: manual
    const { getByLabelText, getByRole } = await render(<ScheduleEdit />);

    const input = getByLabelText("일정 제목");
    expect(input.props.value).toBe("운동 가기");
    expect(input.props.editable).toBe(true);

    await fireEvent.changeText(input, "저녁 산책");
    await fireEvent.press(getByRole("button", { name: "저장" }));

    expect(useDay.getState().schedules.find((s) => s.id === "s4")?.title).toBe("저녁 산책");
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("수정임을 캡션이 말한다 — 링 하나로만 구분하지 않는다", async () => {
    mockParams = { id: "s4" };
    const { getByText } = await render(<ScheduleEdit />);

    expect(getByText("일정 수정")).toBeTruthy();
  });

  it("가져온 일정은 제목을 고칠 수 없다 — 캘린더 원본이다", async () => {
    const { getByLabelText, getByText } = await render(<ScheduleEdit />);

    expect(getByLabelText("일정 제목").props.editable).toBe(false);
    expect(getByText("캘린더에서 가져온 일정이라 제목을 고칠 수 없어요")).toBeTruthy();
  });

  it("제목이 비면 저장이 잠긴다", async () => {
    mockParams = { id: "s4" };
    const { getByLabelText, getByRole } = await render(<ScheduleEdit />);

    await fireEvent.changeText(getByLabelText("일정 제목"), "   ");
    expect(disabled(getByRole("button", { name: "저장" }))).toBe(true);
  });

  it("지우는 길은 여기 없다 — ⋮ 메뉴로 옮겼다 (design.md 「일정」)", async () => {
    mockParams = { id: "s4" };
    const { queryByText } = await render(<ScheduleEdit />);

    expect(queryByText("삭제")).toBeNull();
    expect(queryByText("이 일정 삭제")).toBeNull();
    expect(queryByText("홈에서 숨기기")).toBeNull();
  });

  it("되돌릴 길이 있다 — 값이 있으면 지우기가 붙는다", async () => {
    mockParams = { id: "s4" };
    const { getByLabelText, queryByLabelText } = await render(<ScheduleEdit />);

    expect(getByLabelText("제목 지우기")).toBeTruthy();

    await fireEvent.press(getByLabelText("제목 지우기"));
    expect(getByLabelText("일정 제목").props.value).toBe("");
    // 비면 지울 것도 없다
    expect(queryByLabelText("제목 지우기")).toBeNull();
  });
});

describe("12-e · 일정 직접 추가", () => {
  it("제목 하나만 받는다 — 시간·장소·반복이 없다", async () => {
    const { getByLabelText, queryByText } = await render(<NewSchedule />);

    expect(getByLabelText("일정 제목")).toBeTruthy();
    expect(queryByText(/시간/)).toBeNull();
    expect(queryByText(/장소/)).toBeNull();
    expect(queryByText(/반복/)).toBeNull();
  });

  it("빈 값이면 ＋ 가 잠긴다 — 확정하는 길은 둘 다 같은 조건이다", async () => {
    const r = await render(<NewSchedule />);

    expect(disabled(r.getByLabelText("일정 추가"))).toBe(true);

    await fireEvent.changeText(r.getByLabelText("일정 제목"), "운동 가기");
    expect(disabled(r.getByLabelText("일정 추가"))).toBe(false);
  });

  it("추가 모드에는 취소/저장 줄이 없다 — ＋ 하나로 끝난다", async () => {
    const { queryByText } = await render(<NewSchedule />);

    expect(queryByText("저장")).toBeNull();
    expect(queryByText("취소")).toBeNull();
  });

  it("저장하면 manual 일정이 되고 time 은 null 이다", async () => {
    const r = await render(<NewSchedule />);
    await fireEvent.changeText(r.getByLabelText("일정 제목"), "운동 가기");
    await fireEvent.press(r.getByLabelText("일정 추가"));

    const added = useDay.getState().schedules.at(-1);
    expect(added).toMatchObject({ title: "운동 가기", source: "manual", time: null, done: false });
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("키보드의 확인도 같은 일을 한다", async () => {
    const r = await render(<NewSchedule />);
    await fireEvent.changeText(r.getByLabelText("일정 제목"), "장보기");
    await fireEvent(r.getByLabelText("일정 제목"), "submitEditing");

    expect(useDay.getState().schedules.at(-1)?.title).toBe("장보기");
  });

  it("안내가 양방향을 다 말한다", async () => {
    const { getByText } = await render(<NewSchedule />);

    expect(getByText("모멘토리에만 저장돼요 · 캘린더에는 추가되지 않아요")).toBeTruthy();
  });
});
