import { render, fireEvent, act, waitFor, within } from "@testing-library/react-native";

import RetroTalk from "../talk";

import { SILENCE_MS } from "@/components/ds/voiceInput";

import type { Reply, ReplyOption } from "@/features/retro/data/retroApi";
import { startRetro, sendTurn } from "@/features/retro/data/retroApi";
import { useDiary } from "@/features/diary/model/diary";
import { testDiaryData } from "@/testing/fixtures";
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

// 계측은 전송만 가로챈다 — 응답 뒤에 남기는 것(captureAnalytics)도 같은 목으로 모은다
jest.mock("@/features/analytics", () => {
  const track = jest.fn();
  return { ...jest.requireActual("@/features/analytics"), track, captureAnalytics: () => track };
});
const { track: mockTrack } = jest.requireMock("@/features/analytics") as { track: jest.Mock };
const sent = (name: string) =>
  mockTrack.mock.calls.filter(([n]) => n === name).map(([, props]) => props);

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

  it("바바가 왼쪽 아래에 앉아 있다 — 대화와 함께 늘 보인다", async () => {
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(r.getByTestId("ds-chat-companion")).toBeTruthy());
    // 낭독기에는 숨긴 그림이라 숨은 요소까지 찾는다
    expect(r.getByTestId("retro-baba", { includeHiddenElements: true })).toBeTruthy();
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

  it("오늘 일기를 이미 썼으면 서버에 묻지 않고 처음부터 [홈으로 돌아가기] 를 둔다", async () => {
    const [diary] = testDiaryData().diaries;
    useDiary.setState({ diaries: [{ ...diary!, date: "2026-07-27" }] });
    try {
      const r = await render(<RetroTalk />);

      expect(r.getByText(/이미 회고를 마쳤어요/)).toBeTruthy();
      expect(r.getByText("홈으로 돌아가기")).toBeTruthy();
      expect(mockStart).not.toHaveBeenCalled();
    } finally {
      useDiary.setState({ diaries: [] });
    }
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
    // 선택지는 대화가 아니라 **아래 독**에 앉는다 — 바바를 덮는 자리다
    expect(within(r.getByTestId("ds-chat-dock")).getByText("감정을 더 알아볼래요")).toBeTruthy();
    expect(within(r.getByTestId("ds-chat-scroll")).queryByText("감정을 더 알아볼래요")).toBeNull();
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

describe("계측 — 어느 질문에서 오래 걸렸는가", () => {
  let now = 0;
  beforeEach(() => {
    now = 1_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
  });
  afterEach(() => jest.mocked(Date.now).mockRestore());

  it("생각한 시간 · 쓴 시간 · 기다린 시간을 갈라 보낸다 — 내용은 길이만 보낸다", async () => {
    mockTurn.mockImplementation(async () => {
      now += 2_000; // 서버가 답하는 동안
      return { ok: true, data: reply({ text: "그랬군요." }) };
    });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    now += 5_000; // 질문을 읽고 고민한다
    await fireEvent.changeText(r.getByLabelText("답변"), "발표에서 말이 막혔어요.");
    now += 3_000; // 쓴다
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(sent("retrospect_turn_timed")).toEqual([
      {
        retrospect_id: "7",
        phase: "diary_chat",
        turn_no: 1,
        input_kind: "text",
        think_ms: 5_000,
        compose_ms: 3_000,
        wait_ms: 2_000,
        input_chars: "발표에서 말이 막혔어요.".length,
        voice_used: false,
      },
    ]);
  });

  it("말로 답하면 입력창에 채우기만 하고, 보낸 턴에 음성 사용을 남긴다", async () => {
    const speech = jest.requireMock("expo-speech-recognition");
    /** 가장 최근 렌더가 등록한 음성 이벤트 핸들러 */
    const emit = (name: string, payload: unknown = null) =>
      act(() => {
        const calls = jest.mocked(speech.useSpeechRecognitionEvent).mock.calls;
        const handler = calls.filter(([n]: [string]) => n === name).at(-1)![1];
        handler(payload);
      });
    mockTurn.mockResolvedValue({ ok: true, data: reply({ text: "그랬군요." }) });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await fireEvent.changeText(r.getByLabelText("답변"), "오늘은");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("음성으로 입력"));
    });
    expect(speech.ExpoSpeechRecognitionModule.start).toHaveBeenCalledWith(
      expect.objectContaining({ lang: "ko-KR" }),
    );
    await emit("start");
    await emit("result", { isFinal: false, results: [{ transcript: "발표가" }] });
    await emit("result", { isFinal: true, results: [{ transcript: "발표가 떨렸어요" }] });
    // 연속 모드 — 확정된 구간 뒤에 다음 구간이 이어진다(iOS 18 은 앞에 공백을 붙여 보낸다)
    await emit("result", { isFinal: false, results: [{ transcript: " 그래도 잘했어요" }] });

    // 적어 둔 글 뒤에 이어 붙고, 보내지는 않는다
    expect(r.getByLabelText("답변").props.value).toBe("오늘은 발표가 떨렸어요 그래도 잘했어요");
    expect(mockTurn).not.toHaveBeenCalled();
    expect(sent("voice_input_started")).toEqual([{ retrospect_id: "7" }]);

    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });
    // 보내면 듣기를 끊는다 — 늦게 온 결과가 비운 입력창을 다시 채우지 않는다
    expect(speech.ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
    await emit("result", { isFinal: true, results: [{ transcript: "늦은 결과" }] });
    expect(sent("retrospect_turn_timed")[0]).toMatchObject({ voice_used: true });
  });

  it("마지막으로 알아들은 뒤 조용한 시간이 차야 듣기를 멈춘다", async () => {
    const speech = jest.requireMock("expo-speech-recognition");
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    await act(async () => {
      await fireEvent.press(r.getByLabelText("음성으로 입력"));
    });
    const handler = (name: string) =>
      jest
        .mocked(speech.useSpeechRecognitionEvent)
        .mock.calls.filter(([n]: [string]) => n === name)
        .at(-1)![1];

    // 침묵 타이머만 가로채 바로 불러 본다 — 5초를 실제로 기다리지 않는다
    const timers = jest.spyOn(global, "setTimeout");
    try {
      await act(() => handler("result")({ isFinal: true, results: [{ transcript: "음" }] }));
      const silence = timers.mock.calls.filter(([, ms]) => ms === SILENCE_MS);
      expect(silence).toHaveLength(1);
      expect(speech.ExpoSpeechRecognitionModule.stop).not.toHaveBeenCalled();
      await act(() => (silence[0]![0] as () => void)());
      expect(speech.ExpoSpeechRecognitionModule.stop).toHaveBeenCalledTimes(1);
    } finally {
      timers.mockRestore();
    }
  });

  it("권한 팝업에서 거부하면 결과를 남기고 한 줄로 알린다", async () => {
    const { ExpoSpeechRecognitionModule } = jest.requireMock("expo-speech-recognition");
    ExpoSpeechRecognitionModule.getPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
    });
    ExpoSpeechRecognitionModule.requestPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
    });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await act(async () => {
      await fireEvent.press(r.getByLabelText("음성으로 입력"));
    });

    expect(sent("voice_permission_result")).toEqual([{ granted: false }]);
    expect(r.getByText("마이크를 허용하면 말로 적을 수 있어요.")).toBeTruthy();
    expect(ExpoSpeechRecognitionModule.start).not.toHaveBeenCalled();
  });

  it("선택지를 누른 순간이 첫 입력이다 — 고른 것은 보내지 않는다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          phase: "await_branch",
          options: [
            option({ id: "1", label: "더 알아볼래요" }),
            option({ id: "2", label: "일기 쓸래요" }),
          ],
        }),
      },
    });
    mockTurn.mockResolvedValue({ ok: true, data: reply({ text: "좋아요." }) });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(r.getByText("일기 쓸래요")).toBeTruthy());

    now += 4_000;
    await fireEvent.press(r.getByText("일기 쓸래요"));
    now += 1_000;
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    expect(sent("retrospect_turn_timed")[0]).toMatchObject({
      phase: "await_branch",
      input_kind: "selection",
      think_ms: 4_000,
      compose_ms: 1_000,
      input_chars: 0,
    });
  });

  it("끝나기 전에 닫으면 그 단계와 몇 번째 턴이었는지 남긴다", async () => {
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await fireEvent.press(r.getByLabelText("닫기"));

    expect(sent("retrospect_exited")).toEqual([
      { retrospect_id: "7", phase: "diary_chat", turn_no: 0 },
    ]);
  });

  it("위기 안내 중이었다는 사실은 이름으로 보내지 않는다 — other 에 섞는다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: { sessionId: 7, reply: reply({ phase: "safety_hold", safetyLevel: "high" }) },
    });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await fireEvent.press(r.getByLabelText("닫기"));

    expect(sent("retrospect_exited")).toEqual([{ retrospect_id: "7", phase: "other", turn_no: 0 }]);
    expect(JSON.stringify(mockTrack.mock.calls)).not.toContain("safety");
  });

  it("다 끝난 뒤 닫는 것은 이탈이 아니다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({ phase: "complete", done: true, text: "정리해뒀어요." }),
      },
    });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(r.getByText("정리해뒀어요.")).toBeTruthy());

    await fireEvent.press(r.getByLabelText("닫기"));

    expect(sent("retrospect_exited")).toEqual([]);
  });
});
