import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import ScheduleDetail from "../schedule/[id]";
import NewSchedule from "../schedule/new";
import NewMoment from "../moment/new";

import { text as textColor } from "@/design/tokens.mvp";
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

describe("12-c · 일정 상세 — 가져온 일정은 읽기 전용", () => {
  it("출처를 밝히고 제목은 고칠 수 없다", async () => {
    const { getByText, queryByLabelText } = await render(<ScheduleDetail />);

    expect(getByText("캘린더에서 가져온 일정")).toBeTruthy();
    expect(getByText("면접 스터디")).toBeTruthy();
    // 제목 [수정] 을 두지 않는다 — 캘린더 원본을 고치는 것처럼 읽힌다
    expect(queryByLabelText("일정 제목")).toBeNull();
  });

  it("삭제 대신 「홈에서 숨기기」다 — 캘린더 원본은 그대로", async () => {
    const { getByText, queryByText } = await render(<ScheduleDetail />);

    expect(getByText("홈에서 숨기기")).toBeTruthy();
    expect(queryByText(/삭제/)).toBeNull();
    expect(getByText("홈에서만 보이지 않게 돼요 · 캘린더 원본은 그대로 있어요")).toBeTruthy();
  });

  it("숨기면 목록에서만 빠지고 배열에는 남는다", async () => {
    const { getByText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByText("홈에서 숨기기"));

    expect(useDay.getState().schedules.find((s) => s.id === "s3")?.hidden).toBe(true);
    expect(useDay.getState().schedules).toHaveLength(4);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("dangerInk 는 글자에만 얹는다 — 면도 테두리도 채우지 않는다 (R-40)", async () => {
    const { getByText } = await render(<ScheduleDetail />);
    const label = getByText("홈에서 숨기기");
    const button = label.parent;

    expect(flatten(label.props.style).color).toBe(textColor.danger);
    expect(flatten(button?.props.style).backgroundColor).toBeUndefined();
    expect(flatten(button?.props.style).borderWidth).toBeUndefined();
  });

  it("직접 추가한 일정에만 삭제가 붙는다", async () => {
    mockParams = { id: "s4" }; // 운동 가기 — source: manual
    const { getByText } = await render(<ScheduleDetail />);

    expect(getByText("직접 추가한 일정")).toBeTruthy();
    expect(getByText("이 일정 삭제")).toBeTruthy();
    expect(getByText("모멘토리에만 있던 일정이라 완전히 지워져요")).toBeTruthy();
  });
});

describe("12-c · 마침과 감정 — 서버 계약이 시안을 좁힌 자리", () => {
  // 샘플의 「운동 가기」가 마침도 감정도 없는 줄이다 (「면접 스터디」는 감정만 있다)
  const emptyRow = () => {
    mockParams = { id: "s4" };
  };

  it("샘플이 이미 그것을 보인다 — 감정만 있고 마침은 없는 줄", async () => {
    // 스키마 샘플 「면접 스터디 · 불안함」 — 마침 표시가 없다
    const s = useDay.getState().schedules.find((x) => x.id === "s3");
    expect(s?.emotions).toEqual([1]);
    expect(s?.done).toBe(false);
  });

  // ⚠ 시안(`12-c.md`)은 「마침과 감정은 서로를 요구하지 않는다」인데, 서버는
  // 마침 없는 감정을 거부한다(`Schedule.changeCompletion`). 아래 둘이 그 차이를
  // 고정한다 — 계약이 바뀌면 이 두 개가 먼저 깨진다. `PRODUCT.md` 「상류와 차이」
  it("감정을 고르면 마침도 함께 켜진다 — 서버가 마침 없는 감정을 받지 않는다", async () => {
    emptyRow();
    const { getByLabelText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("불안함"));

    const s = useDay.getState().schedules.find((x) => x.id === "s4");
    expect(s?.emotions).toEqual([1]);
    expect(s?.done).toBe(true);
  });

  it("마침을 끄면 감정도 사라진다 — 서버가 그렇게 지운다", async () => {
    mockParams = { id: "s3" }; // 감정만 있는 줄
    const { getByLabelText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("마침으로 표시")); // 켜기 — 감정 유지
    expect(useDay.getState().schedules.find((x) => x.id === "s3")?.emotions).toEqual([1]);

    await fireEvent.press(getByLabelText("마침으로 표시")); // 끄기 — 감정도 함께
    const s = useDay.getState().schedules.find((x) => x.id === "s3");
    expect(s?.done).toBe(false);
    expect(s?.emotions).toEqual([]);
  });

  it("마침만 켤 수 있다 — 감정을 고르지 않아도", async () => {
    emptyRow();
    const { getByLabelText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("마침으로 표시"));

    const s = useDay.getState().schedules.find((x) => x.id === "s4");
    expect(s?.done).toBe(true);
    expect(s?.emotions).toEqual([]);
  });

  it("감정은 다시 누르면 취소된다 — 확인 모달이 없다", async () => {
    emptyRow();
    const { getByLabelText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("불안함"));
    await fireEvent.press(getByLabelText("불안함"));

    expect(useDay.getState().schedules.find((x) => x.id === "s4")?.emotions).toEqual([]);
  });

  it("감정은 하나만 남는다 — 다른 것을 누르면 갈아치운다", async () => {
    // 시안은 0~2개 권장·상한 없음인데 서버 `emotion` 이 단수다
    emptyRow();
    const { getByLabelText } = await render(<ScheduleDetail />);

    await fireEvent.press(getByLabelText("불안함"));
    await fireEvent.press(getByLabelText("평온함"));

    expect(useDay.getState().schedules.find((x) => x.id === "s4")?.emotions).toEqual([9]);
  });

  it("감정 9종을 다 보인다 — 접지 않는다", async () => {
    const { getByLabelText } = await render(<ScheduleDetail />);

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

  it("선택을 색만으로 표시하지 않는다 — 테두리 2px + 굵기 600", async () => {
    emptyRow();
    const { getByLabelText, getByText } = await render(<ScheduleDetail />);

    expect(flatten(getByLabelText("불안함").props.style).borderWidth).toBe(1);
    await fireEvent.press(getByLabelText("불안함"));

    expect(flatten(getByLabelText("불안함").props.style).borderWidth).toBe(2);
    expect(flatten(getByText("불안함").props.style).fontFamily).toBe("Pretendard-SemiBold");
  });
});

describe("12-d · 순간 입력", () => {
  it("시각을 함께 보여준다 — 밤에 되읽을 때의 절반이다", async () => {
    const { getByText } = await render(<NewMoment />);

    // 오전/오후·새벽·낮·밤 중 하나 + 시:분
    expect(getByText(/(새벽|아침|낮|밤) \d{1,2}:\d{2}/)).toBeTruthy();
  });

  it("감정을 함께 묻지 않는다 — 순간은 감정 기록이 아니다", async () => {
    const { queryByLabelText } = await render(<NewMoment />);

    for (const name of ["불안함", "행복함", "평온함"]) {
      expect(queryByLabelText(name)).toBeNull();
    }
  });

  it("저장은 상단 우측 한 곳이고 비면 잠긴다", async () => {
    const r = await render(<NewMoment />);

    expect(r.getByText("취소")).toBeTruthy();
    expect(flatten(r.getByText("저장").props.style).opacity).toBe(0.36);

    await fireEvent.changeText(r.getByLabelText("순간"), "회의가 생각보다 잘 끝났다");
    expect(flatten(r.getByText("저장").props.style).opacity).toBeUndefined();
  });

  it("저장하면 순간이 남고 「올리는 중」으로 시작한다", async () => {
    const r = await render(<NewMoment />);
    await fireEvent.changeText(r.getByLabelText("순간"), "회의가 생각보다 잘 끝났다");
    await fireEvent.press(r.getByText("저장"));

    const saved = useDay.getState().moments.at(-1);
    expect(saved?.text).toBe("회의가 생각보다 잘 끝났다");
    // 실패로 표시하지 않는다 — local 로 시작해 연결되면 올린다
    expect(saved?.syncState).toBe("local");
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("각주가 한 줄이면 충분하다고 말한다", async () => {
    const { getByText } = await render(<NewMoment />);

    expect(getByText("정리하지 않아도 괜찮아요 · 한 줄이면 충분해요")).toBeTruthy();
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

  it("제목이 비면 저장이 잠긴다", async () => {
    const r = await render(<NewSchedule />);

    expect(flatten(r.getByText("저장").props.style).opacity).toBe(0.36);

    await fireEvent.changeText(r.getByLabelText("일정 제목"), "운동 가기");
    expect(flatten(r.getByText("저장").props.style).opacity).toBeUndefined();
  });

  it("저장하면 manual 일정이 되고 time 은 null 이다", async () => {
    const r = await render(<NewSchedule />);
    await fireEvent.changeText(r.getByLabelText("일정 제목"), "운동 가기");
    await fireEvent.press(r.getByText("저장"));

    const added = useDay.getState().schedules.at(-1);
    expect(added).toMatchObject({ title: "운동 가기", source: "manual", time: null, done: false });
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("안내가 양방향을 다 말한다", async () => {
    const { getByText } = await render(<NewSchedule />);

    expect(getByText(/모멘토리에만/)).toBeTruthy();
    expect(getByText(/캘린더에는 추가되지 않아요/)).toBeTruthy();
    expect(getByText("한 단어여도 괜찮아요 · 제목만 적어도 저장돼요")).toBeTruthy();
  });
});
