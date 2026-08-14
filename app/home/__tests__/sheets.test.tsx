import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import ScheduleEmotion from "../emotion/[id]";
import ScheduleDetail from "../schedule/[id]";
import NewSchedule from "../schedule/new";

import { paperColors } from "@/design/paper";
import { useDay } from "@/features/home/model/day";
import { SAMPLE_MOMENTS, SAMPLE_SCHEDULES } from "@/mocks/sample";

// 어떤 일정을 열었는지는 라우트 파라미터가 정한다 — 테스트마다 바꾼다
let mockParams: { id: string } = { id: "s3" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

beforeEach(() => {
  mockParams = { id: "s3" }; // 면접 스터디 — 캘린더에서 온 미완료 일정
  useDay.setState({
    schedules: SAMPLE_SCHEDULES.map((s) => ({ ...s, emotions: [...s.emotions] })),
    moments: [...SAMPLE_MOMENTS],
  });
  jest.clearAllMocks();
});

describe("12-c · 제목을 누르면 입력 바가 열린다 (PLAN.md D11)", () => {
  it("직접 추가한 일정은 제목을 고칠 수 있다", async () => {
    mockParams = { id: "s4" }; // 운동 가기 — source: manual
    const { getByLabelText, getByText } = await render(<ScheduleDetail />);

    const input = getByLabelText("일정 제목");
    expect(input.props.value).toBe("운동 가기");
    expect(input.props.editable).toBe(true);

    await fireEvent.changeText(input, "저녁 산책");
    await fireEvent.press(getByText("완료"));

    expect(useDay.getState().schedules.find((s) => s.id === "s4")?.title).toBe("저녁 산책");
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("가져온 일정은 제목을 고칠 수 없다 — 캘린더 원본이다", async () => {
    const { getByLabelText, getByText } = await render(<ScheduleDetail />);

    expect(getByLabelText("일정 제목").props.editable).toBe(false);
    expect(
      getByText("캘린더에서 가져온 일정이라 제목을 고칠 수 없어요 · 홈에서만 숨길 수 있어요"),
    ).toBeTruthy();
  });

  it("가져온 일정은 삭제가 아니라 숨기기다 — 묻지 않는다", async () => {
    const { getByLabelText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("홈에서 숨기기"));

    expect(useDay.getState().schedules.find((s) => s.id === "s3")?.hidden).toBe(true);
    expect(useDay.getState().schedules).toHaveLength(4);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("직접 추가한 일정의 삭제는 한 번 묻는다 — 되돌릴 수 없다", async () => {
    mockParams = { id: "s4" };
    const { getByLabelText, getByText, queryByText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("이 일정 삭제"));
    // 아직 지워지지 않았다 — 확인이 먼저다
    expect(getByText("이 일정을 지울까요?")).toBeTruthy();
    expect(useDay.getState().schedules).toHaveLength(4);

    await fireEvent.press(getByText("그대로 둘게요"));
    expect(queryByText("이 일정을 지울까요?")).toBeNull();
    expect(useDay.getState().schedules).toHaveLength(4);
  });

  it("확인하면 실제로 지워진다", async () => {
    mockParams = { id: "s4" };
    const { getByLabelText, getByText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("이 일정 삭제"));
    // 모달의 실행 버튼 — 라벨이 무엇이 일어나는지 말한다
    await fireEvent.press(getByText("이 일정 삭제"));

    expect(useDay.getState().schedules).toHaveLength(3);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("제목이 비면 완료가 잠긴다", async () => {
    mockParams = { id: "s4" };
    const { getByLabelText, getByText } = await render(<ScheduleDetail />);

    await fireEvent.changeText(getByLabelText("일정 제목"), "   ");
    expect(flatten(getByText("완료").parent?.props.style).opacity).toBe(0.36);
  });
});

describe("완료 감정 시트 — 마침 원을 누르면 뜬다", () => {
  const emptyRow = () => {
    mockParams = { id: "s4" }; // 마침도 감정도 없는 줄
  };

  it("무엇을 마쳤는지 시트가 말한다", async () => {
    emptyRow();
    const { getByText } = await render(<ScheduleEmotion />);

    expect(getByText("마쳤어요! 어땠나요?")).toBeTruthy();
    expect(getByText("운동 가기")).toBeTruthy();
  });

  it("건너뛸 수 있다 — 「감정 없이 완료」", async () => {
    emptyRow();
    const { getByText } = await render(<ScheduleEmotion />);

    await fireEvent.press(getByText("감정 없이 완료"));

    expect(useDay.getState().schedules.find((x) => x.id === "s4")?.emotions).toEqual([]);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("감정 9종을 다 보인다 — 접지 않는다", async () => {
    const { getByLabelText } = await render(<ScheduleEmotion />);

    for (const name of [
      "불안함",
      "우울함",
      "화남/답답",
      "행복함",
      "막막함",
      "무기력",
      "피곤함",
      "뿌듯함",
      "평온함",
    ]) {
      expect(getByLabelText(name)).toBeTruthy();
    }
  });

  // ⚠ 시안(`12-c.md`)은 「마침과 감정은 서로를 요구하지 않는다」인데, 서버는
  // 마침 없는 감정을 거부한다(`Schedule.changeCompletion`). `PRODUCT.md` 「상류와 차이」
  it("감정을 고르면 마침도 함께 켜진다 — 서버가 마침 없는 감정을 받지 않는다", async () => {
    emptyRow();
    const { getByLabelText } = await render(<ScheduleEmotion />);

    await fireEvent.press(getByLabelText("불안함"));

    const s = useDay.getState().schedules.find((x) => x.id === "s4");
    expect(s?.emotions).toEqual([1]);
    expect(s?.done).toBe(true);
  });

  it("감정은 다시 누르면 취소된다 — 확인 모달이 없다", async () => {
    emptyRow();
    const { getByLabelText } = await render(<ScheduleEmotion />);

    await fireEvent.press(getByLabelText("불안함"));
    await fireEvent.press(getByLabelText("불안함"));

    expect(useDay.getState().schedules.find((x) => x.id === "s4")?.emotions).toEqual([]);
  });

  it("감정은 하나만 남는다 — 다른 것을 누르면 갈아치운다", async () => {
    // 시안은 0~2개 권장·상한 없음인데 서버 `emotion` 이 단수다
    emptyRow();
    const { getByLabelText } = await render(<ScheduleEmotion />);

    await fireEvent.press(getByLabelText("불안함"));
    await fireEvent.press(getByLabelText("평온함"));

    expect(useDay.getState().schedules.find((x) => x.id === "s4")?.emotions).toEqual([9]);
  });

  it("선택을 색만으로 표시하지 않는다 — 잉크 테두리 + 굵기 700", async () => {
    emptyRow();
    const { getByLabelText, getByText } = await render(<ScheduleEmotion />);

    // 테두리 자리는 늘 2 이고 **색이 잉크로 켜진다** (비워 두면 켤 때 글자가 밀린다)
    expect(flatten(getByLabelText("불안함").props.style).borderColor).toBe("transparent");
    await fireEvent.press(getByLabelText("불안함"));

    expect(flatten(getByLabelText("불안함").props.style).borderColor).toBe(paperColors.line.ink);
    expect(flatten(getByText("불안함").props.style).fontFamily).toBe("Pretendard-Bold");
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

  it("제목이 비면 완료가 잠긴다", async () => {
    const r = await render(<NewSchedule />);

    expect(flatten(r.getByText("완료").parent?.props.style).opacity).toBe(0.36);

    await fireEvent.changeText(r.getByLabelText("일정 제목"), "운동 가기");
    expect(flatten(r.getByText("완료").parent?.props.style).opacity).toBeUndefined();
  });

  it("추가 모드에는 지우기가 없다", async () => {
    const { queryByLabelText } = await render(<NewSchedule />);

    expect(queryByLabelText("삭제")).toBeNull();
  });

  it("저장하면 manual 일정이 되고 time 은 null 이다", async () => {
    const r = await render(<NewSchedule />);
    await fireEvent.changeText(r.getByLabelText("일정 제목"), "운동 가기");
    await fireEvent.press(r.getByText("완료"));

    const added = useDay.getState().schedules.at(-1);
    expect(added).toMatchObject({ title: "운동 가기", source: "manual", time: null, done: false });
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("안내가 양방향을 다 말한다", async () => {
    const { getByText } = await render(<NewSchedule />);

    expect(getByText("모멘토리에만 저장돼요 · 캘린더에는 추가되지 않아요")).toBeTruthy();
  });
});
