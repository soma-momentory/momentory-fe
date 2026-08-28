import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import RetroConfirm from "../confirm";

import { useDay } from "@/features/home/model/day";
import { useRetro } from "@/features/retro/model/retro";
import { testSchedules } from "@/testing/fixtures";

/**
 * `C2`(오늘 일정 확인)의 규칙을 고정한다.
 *
 * ⚠ **v2 에서 `C3`(시작 감정 고르기)가 사라졌다** — 감정을 시작 시 고르지 않고 일기 작성부터
 * 시작한다. `C2` 의 `다음` 은 이제 감정 화면이 아니라 대화(`talk`)로 바로 간다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

beforeEach(() => {
  useDay.setState({ schedules: testSchedules() });
  useRetro.getState().reset();
  jest.clearAllMocks();
});

describe("C2 · 오늘 일정 확인 — 읽기 전용이다", () => {
  it("오늘 일정을 그대로 보여준다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    expect(getByText("오늘 있었던 일을 잠깐 떠올려봐요.")).toBeTruthy();
    expect(getByText("팀 회의")).toBeTruthy();
    expect(getByText("운동 가기")).toBeTruthy();
  });

  it("여기서 일정을 고치거나 더하지 못한다 — 고치는 자리는 홈 하나다", async () => {
    const { queryByText, queryByLabelText } = await render(<RetroConfirm />);

    expect(queryByText("＋ 일정 추가하기")).toBeNull();
    expect(queryByLabelText("면접 스터디 마침")).toBeNull();
    expect(queryByLabelText("운동 가기 감정 추가")).toBeNull();
  });

  it("완료만 초록 체크로 말한다 — 안 한 일에 표식을 붙이지 않는다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    expect(flatten(getByText("팀 회의").props.style).textDecorationLine).toBe("line-through");
    expect(flatten(getByText("운동 가기").props.style).textDecorationLine).toBeUndefined();
  });

  it("숨긴 일정은 여기서도 빠진다", async () => {
    useDay.getState().hide("s3");
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("면접 스터디")).toBeNull();
  });

  it("오늘 일정이 없으면 빈 화면 대신 한 마디 건넨다", async () => {
    useDay.setState({ schedules: [] });
    const { getByText } = await render(<RetroConfirm />);

    expect(getByText(/일정이 없네요/)).toBeTruthy();
  });

  it("숫자로 압박하지 않는다 — 마침 개수도 단계 번호도 없다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText(/\d\/\d 마침/)).toBeNull();
    expect(queryByText(/\d\/\d단계/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
  });

  it("[다음] 이 바로 대화로 간다 — v2 는 감정을 먼저 고르지 않는다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    await fireEvent.press(getByText("다음"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/talk");
  });

  it("나가는 길은 닫기 하나다 — 회고는 한 줄이다", async () => {
    const { getByLabelText } = await render(<RetroConfirm />);

    await fireEvent.press(getByLabelText("닫기"));

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });
});

// 옛 화면에만 있던 라벨 — 시안이 그 기능을 없앴다는 사실을 여기서 고정한다
describe("시안이 걷어낸 것들", () => {
  it("저장을 약속하는 문구를 두지 않는다 — 아직 기기에 남기지 않는다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText(/저장/)).toBeNull();
    expect(queryByText(/이어서 하기|이어가기/)).toBeNull();
  });

  it("C2 에 순간·날씨·감정 요약 카드를 두지 않는다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("오늘의 순간")).toBeNull();
    expect(queryByText("오늘 날씨")).toBeNull();
    expect(queryByText("오늘 기록한 감정")).toBeNull();
  });

  it("[잠시 쉬기] 가 사라졌다 — 나가는 길은 닫기 하나다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("잠시 쉬기")).toBeNull();
  });
});
