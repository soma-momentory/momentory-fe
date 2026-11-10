import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import RetroConfirm from "../confirm";

import { useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import { fetchCurrentRetro } from "@/features/retro/data/retroApi";
import { useRetro } from "@/features/retro/model/retro";
import { testDiaryData, testSchedules } from "@/testing/fixtures";

/**
 * `C2`(오늘 일정 확인)의 규칙을 고정한다.
 *
 * ⚠ **v2 에서 `C3`(시작 감정 고르기)가 사라졌다** — 감정을 시작 시 고르지 않고 일기 작성부터
 * 시작한다. `C2` 의 `다음` 은 이제 감정 화면이 아니라 대화(`talk`)로 바로 간다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));
jest.mock("@/features/retro/data/retroApi", () => ({
  ...jest.requireActual("@/features/retro/data/retroApi"),
  fetchCurrentRetro: jest.fn(),
}));
const mockCurrent = jest.mocked(fetchCurrentRetro);

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

beforeEach(() => {
  useDay.setState({ schedules: testSchedules() });
  useRetro.getState().reset();
  useDiary.setState({ diaries: [] });
  jest.clearAllMocks();
  mockCurrent.mockResolvedValue({ ok: true, data: null });
});

describe("C2 · 오늘 하던 회고가 있으면", () => {
  const lastRedirect = () => jest.mocked(Redirect).mock.calls.at(-1)?.[0];

  it("작성 방식을 다시 묻지 않고 서버가 준 대화를 이어 대화로 넘긴다", async () => {
    mockCurrent.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 42,
        messages: [{ role: "assistant", text: "오늘 어땠어요?" }],
        reply: {
          text: "오늘 어땠어요?",
          phase: "diary_chat",
          options: null,
          wishCard: null,
          diary: null,
          done: false,
          safetyLevel: "none",
        },
      },
    });
    const { queryByRole } = await render(<RetroConfirm />);

    expect(queryByRole("button", { name: "직접 일기 쓰기" })).toBeNull();
    await waitFor(() => expect(lastRedirect()).toEqual({ href: "/retro/talk" }));
    expect(useRetro.getState().sessionId).toBe(42);
    expect(useRetro.getState().turns).toHaveLength(1);
  });

  it("앱이 세션을 이미 들고 있으면 서버에 묻지 않고 대화로 돌아간다", async () => {
    useRetro.getState().beginSession(7, {
      text: "첫 질문",
      phase: "diary_chat",
      options: null,
      wishCard: null,
      diary: null,
      done: false,
      safetyLevel: "none",
    });
    await render(<RetroConfirm />);

    expect(lastRedirect()).toEqual({ href: "/retro/talk" });
    expect(mockCurrent).not.toHaveBeenCalled();
  });

  it("하던 회고가 없거나 묻지 못하면 두 작성 방식을 띄운다", async () => {
    mockCurrent.mockResolvedValue({ ok: false, code: "network" });
    const { findByRole } = await render(<RetroConfirm />);

    expect(await findByRole("button", { name: "직접 일기 쓰기" })).toBeTruthy();
    expect(Redirect).not.toHaveBeenCalled();
  });
});

describe("C2 · 오늘 일기를 이미 썼으면", () => {
  it("일정을 보여 주지 않고 대화(「이미 마쳤어요」)로 바로 넘긴다", async () => {
    const [diary] = testDiaryData().diaries;
    useDiary.setState({ diaries: [{ ...diary!, date: "2026-07-27" }] });
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("오늘 있었던 일을 잠깐 떠올려봐요.")).toBeNull();
    expect(jest.mocked(Redirect).mock.calls[0]?.[0]).toEqual({ href: "/retro/talk" });
  });
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

  it("AI와 대화하기를 고르면 기존 대화로 간다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    await fireEvent.press(getByText("AI와 대화하기"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/talk");
  });

  it("직접 일기 쓰기를 고르면 빈 일기장을 연다", async () => {
    const { getByRole } = await render(<RetroConfirm />);
    await fireEvent.press(getByRole("button", { name: "직접 일기 쓰기" }));
    expect(router.push).toHaveBeenCalledWith("/retro/write");
    expect(router.push).not.toHaveBeenCalledWith("/retro/talk");
  });

  it("일정이 없어도 두 작성 방식을 모두 고를 수 있다", async () => {
    useDay.setState({ schedules: [] });
    const { getByRole } = await render(<RetroConfirm />);
    expect(getByRole("button", { name: "AI와 대화하기" })).toBeTruthy();
    expect(getByRole("button", { name: "직접 일기 쓰기" })).toBeTruthy();
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
