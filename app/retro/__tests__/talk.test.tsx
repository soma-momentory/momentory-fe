import { render, fireEvent, act, waitFor } from "@testing-library/react-native";

import RetroTalk from "../talk";

import type { Reply, ReplyOption } from "@/features/retro/data/retroApi";
import { startRetro, sendTurn } from "@/features/retro/data/retroApi";
import { useRetro } from "@/features/retro/model/retro";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

// 서버 왕복만 가짜로 — 화면은 응답 형태대로 그린다
jest.mock("@/features/retro/data/retroApi", () => ({
  ...jest.requireActual("@/features/retro/data/retroApi"),
  startRetro: jest.fn(),
  sendTurn: jest.fn(),
}));

const mockStart = jest.mocked(startRetro);
const mockTurn = jest.mocked(sendTurn);

/** 응답 하나 — 필요한 필드만 덮어쓴다 (v2: 슬라이더 없음, 바람카드→바람카드) */
const reply = (over: Partial<Reply> = {}): Reply => ({
  text: null,
  phase: "diary_chat",
  options: null,
  wishCard: null,
  diary: null,
  done: false,
  safetyLevel: "none",
  ...over,
});

const option = (over: Partial<ReplyOption> & { id: string; label: string }): ReplyOption => ({
  description: null,
  hint: null,
  input: false,
  ...over,
});

beforeEach(() => {
  useRetro.getState().reset();
  jest.clearAllMocks();
  mockStart.mockResolvedValue({
    ok: true,
    data: {
      sessionId: 7,
      reply: reply({ text: "오늘 하루 중에서 가장 기억에 남는 일은 뭐였어요?" }),
    },
  });
});

describe("시작 — 감정 없이 마운트하면 서버가 첫 질문을 준다", () => {
  it("마운트하면 시작 요청을 보낸다 — v2 는 감정을 싣지 않는다", async () => {
    await render(<RetroTalk />);

    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    const arg = mockStart.mock.calls[0]![0];
    expect(arg).toHaveProperty("schedules");
    expect(arg).not.toHaveProperty("currentEmotion");
  });

  it("서버의 첫 질문을 버블로 보여준다", async () => {
    const r = await render(<RetroTalk />);
    await waitFor(() =>
      expect(r.getByText("오늘 하루 중에서 가장 기억에 남는 일은 뭐였어요?")).toBeTruthy(),
    );
  });

  it("시작이 실패하면 한 줄 안내와 [다시 시도] 를 둔다", async () => {
    mockStart.mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("다시 시도")).toBeTruthy());
    expect(r.getByText(/연결이 불안정/)).toBeTruthy();
  });

  it("하루 한 번(already_today) 실패는 다시 시도 대신 [홈으로 돌아가기] 를 둔다", async () => {
    mockStart.mockResolvedValue({ ok: false, code: "already_today" });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("홈으로 돌아가기")).toBeTruthy());
    expect(r.queryByText("다시 시도")).toBeNull();
    expect(r.getByText(/이미 회고를 마쳤어요/)).toBeTruthy();
  });

  it("세션이 서기 전에는 채팅 입력창을 띄우지 않는다 — 시작 중엔 잠근 버튼만", async () => {
    let arrive!: (v: Awaited<ReturnType<typeof startRetro>>) => void;
    mockStart.mockReturnValue(new Promise((res) => (arrive = res)));
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(r.queryByLabelText("답변")).toBeNull();
    expect(r.getByText("시작하는 중")).toBeTruthy();

    await act(async () => {
      arrive({ ok: true, data: { sessionId: 7, reply: reply({ text: "오늘 하루는 어땠어요?" }) } });
    });
    await waitFor(() => expect(r.getByLabelText("답변")).toBeTruthy());
  });
});

describe("일기 작성 턴 — 자유 입력", () => {
  it("답을 보내면 content 로 턴을 보내고 내 버블이 남는다", async () => {
    mockTurn.mockResolvedValue({ ok: true, data: reply({ text: "그랬군요." }) });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await fireEvent.changeText(r.getByLabelText("답변"), "발표에서 말이 막혔어요.");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { content: "발표에서 말이 막혔어요." });
    expect(r.getByText("발표에서 말이 막혔어요.")).toBeTruthy();
  });

  it("답을 기다리는 동안 말풍선이 서고, 답이 오면 그 자리가 글자로 바뀐다", async () => {
    let arrive!: (v: Awaited<ReturnType<typeof sendTurn>>) => void;
    mockTurn.mockReturnValue(new Promise((res) => (arrive = res)));

    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await fireEvent.changeText(r.getByLabelText("답변"), "속상했어요.");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(r.getByLabelText("답장을 쓰는 중")).toBeTruthy();
    expect(r.getByLabelText("답변").props.value).toBe("");

    await act(async () => {
      arrive({ ok: true, data: reply({ text: "그랬군요." }) });
    });

    await waitFor(() => expect(r.queryByLabelText("답장을 쓰는 중")).toBeNull());
    expect(r.getByText("그랬군요.")).toBeTruthy();
  });
});

describe("분기점 — 감정을 더 알아볼까(단일 선택)", () => {
  const withBranch = () =>
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "지금 느낀 감정을 조금 더 알아볼까요?",
          phase: "await_branch",
          options: [
            option({ id: "1", label: "감정을 더 알아볼래요" }),
            option({ id: "2", label: "일기 확인하러 갈래요" }),
          ],
        }),
      },
    });

  it("하나를 고르면 optionIds 로 보낸다", async () => {
    withBranch();
    mockTurn.mockResolvedValue({ ok: true, data: reply({ phase: "emotion_exploration" }) });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("감정을 더 알아볼래요")).toBeTruthy());
    await fireEvent.press(r.getByText("감정을 더 알아볼래요"));
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { optionIds: ["1"] });
  });
});

describe("감정 탐색 — 최대 2개 선택 + 직접 적기", () => {
  const withNeeds = () =>
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "그때 내 마음이 바랐던 것은 무엇에 가까웠을까요?",
          phase: "emotion_exploration",
          options: [
            option({
              id: "1",
              label: "존중",
              description: "내 의견이 가볍게 다뤄지지 않길 바라는 마음",
            }),
            option({ id: "2", label: "소통", description: "마음이 서로 잘 통하길 바라는 마음" }),
            option({ id: "3", label: "인정", description: "내 노력을 알아봐 주길 바라는 마음" }),
            option({ id: "4", label: "직접 적기", input: true }),
          ],
        }),
      },
    });

  it("최대 2개까지 골라 optionIds 로 함께 보낸다", async () => {
    withNeeds();
    mockTurn.mockResolvedValue({ ok: true, data: reply({ phase: "emotion_exploration" }) });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("존중")).toBeTruthy());
    await fireEvent.press(r.getByText("존중"));
    await fireEvent.press(r.getByText("소통"));
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { optionIds: ["1", "2"] });
  });

  it("직접 적기를 고르면 입력창이 열리고 content 로 보낸다", async () => {
    withNeeds();
    mockTurn.mockResolvedValue({ ok: true, data: reply({ phase: "emotion_exploration" }) });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("직접 적기")).toBeTruthy());
    expect(r.queryByLabelText("직접 적기")).toBeNull();
    await fireEvent.press(r.getByText("직접 적기"));

    const input = r.getByLabelText("직접 적기");
    await fireEvent.changeText(input, "끝까지 들어주길 바랐어요");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { content: "끝까지 들어주길 바랐어요" });
  });
});

describe("종료 — 일기 확인하러 가기", () => {
  it("완료 응답이면 일기 확인 버튼이 draft 로 간다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "오늘 이야기를 정리해뒀어요.",
          phase: "complete",
          done: true,
          diary: { diaryId: "10", diary: "오늘의 일기.", reframedDiary: null, emotions: [] },
        }),
      },
    });
    const { router } = jest.requireMock("expo-router");
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("일기 확인하러 가기")).toBeTruthy());
    await fireEvent.press(r.getByText("일기 확인하러 가기"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/draft");
  });
});
