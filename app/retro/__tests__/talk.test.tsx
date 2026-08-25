import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import RetroTalk from "../talk";

import type { Reply, ReplyOption } from "@/features/retro/data/retroApi";
import { startRetro, sendTurn } from "@/features/retro/data/retroApi";
import { useRetro } from "@/features/retro/model/retro";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));

// 서버 왕복만 가짜로 — 화면은 응답 형태대로 그린다
jest.mock("@/features/retro/data/retroApi", () => ({
  ...jest.requireActual("@/features/retro/data/retroApi"),
  startRetro: jest.fn(),
  sendTurn: jest.fn(),
}));

const mockStart = jest.mocked(startRetro);
const mockTurn = jest.mocked(sendTurn);

/** 응답 하나를 만든다 — 필요한 필드만 덮어쓴다 */
const reply = (over: Partial<Reply> = {}): Reply => ({
  text: null,
  phase: "script",
  options: null,
  ui: null,
  measures: null,
  actionCard: null,
  diary: null,
  done: false,
  safetyLevel: "none",
  ...over,
});

/** 선택지 하나 — 필요한 필드만 덮어쓴다 */
const option = (over: Partial<ReplyOption> & { id: string; label: string }): ReplyOption => ({
  description: null,
  hint: null,
  input: false,
  ...over,
});

beforeEach(() => {
  useRetro.getState().reset();
  useRetro.getState().setStartEmotion(2); // 우울함 → currentEmotion "depressed"
  jest.clearAllMocks();
  mockStart.mockResolvedValue({
    ok: true,
    data: {
      sessionId: 7,
      reply: reply({ text: "오늘은 어떤 이야기를 나누고 싶어요?", phase: "intro" }),
    },
  });
});

describe("시작 — 서버가 첫 응답을 준다", () => {
  it("마운트하면 시작 요청을 보내고 감정을 키로 옮긴다", async () => {
    await render(<RetroTalk />);

    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({ currentEmotion: "depressed" }),
    );
  });

  it("서버의 첫 질문을 버블로 보여준다", async () => {
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(r.getByText("오늘은 어떤 이야기를 나누고 싶어요?")).toBeTruthy());
  });

  it("감정 없이 들어오면 감정 화면으로 돌려보낸다", async () => {
    useRetro.getState().reset(); // startEmotion 없음
    const { Redirect } = jest.requireMock("expo-router");
    await render(<RetroTalk />);
    expect(Redirect).toHaveBeenCalled();
  });

  it("시작이 실패하면 한 줄 안내와 [다시 시도] 를 둔다", async () => {
    mockStart.mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("다시 시도")).toBeTruthy());
    expect(r.getByText(/연결이 불안정/)).toBeTruthy();
  });

  it("하루 한 번(already_today) 실패는 다시 시도 대신 [홈으로 돌아가기] 를 둔다", async () => {
    // 재시도해도 같은 답이라 다시 시도를 주지 않는다 — 재시도 시 입력창이 순간
    // 떴다 사라지며 「뒤에 다른 화면이 뜨는」 깜빡임을 없앤다
    mockStart.mockResolvedValue({ ok: false, code: "already_today" });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("홈으로 돌아가기")).toBeTruthy());
    expect(r.queryByText("다시 시도")).toBeNull();
    expect(r.getByText(/이미 회고를 마쳤어요/)).toBeTruthy();
  });

  it("세션이 서기 전에는 채팅 입력창을 띄우지 않는다 — 시작 중엔 잠근 버튼만", async () => {
    // 세션이 없는 동안 입력창(ChatDock)이 잠깐 떴다 사라지지 않게 한다
    let arrive!: (v: Awaited<ReturnType<typeof startRetro>>) => void;
    mockStart.mockReturnValue(new Promise((res) => (arrive = res)));
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(r.queryByLabelText("답변")).toBeNull();
    expect(r.getByText("시작하는 중")).toBeTruthy();

    await act(async () => {
      arrive({
        ok: true,
        data: { sessionId: 7, reply: reply({ text: "오늘은 어떤 이야기?", phase: "intro" }) },
      });
    });
    await waitFor(() => expect(r.getByLabelText("답변")).toBeTruthy());
  });
});

describe("텍스트 턴 — 자유 입력", () => {
  it("답을 보내면 content 로 턴을 보내고 내 버블이 남는다", async () => {
    mockTurn.mockResolvedValue({ ok: true, data: reply({ text: "그랬군요.", phase: "intro" }) });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    await fireEvent.changeText(r.getByLabelText("답변"), "답이 막혔어요.");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { content: "답이 막혔어요." });
    expect(r.getByText("답이 막혔어요.")).toBeTruthy();
  });
});

describe("기다리는 동안 — 다음 말이 앉을 자리", () => {
  it("답을 기다리는 동안 말풍선이 서고, 답이 오면 그 자리가 글자로 바뀐다", async () => {
    // 회전하는 원이 아니라 말풍선이다 — 기다리는 것이 화면이 아니라 상대의 말이라서
    let arrive!: (v: Awaited<ReturnType<typeof sendTurn>>) => void;
    mockTurn.mockReturnValue(new Promise((res) => (arrive = res)));

    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());
    expect(r.queryByLabelText("답장을 쓰는 중")).toBeNull();

    await fireEvent.changeText(r.getByLabelText("답변"), "답이 막혔어요.");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(r.getByLabelText("답장을 쓰는 중")).toBeTruthy();
    // 서버 응답을 기다리지 않고 보낸 즉시 입력창이 비워진다(반응 지연 없이)
    expect(r.getByLabelText("답변").props.value).toBe("");

    await act(async () => {
      arrive({ ok: true, data: reply({ text: "그랬군요.", phase: "intro" }) });
    });

    await waitFor(() => expect(r.queryByLabelText("답장을 쓰는 중")).toBeNull());
    expect(r.getByText("그랬군요.")).toBeTruthy();
  });
});

describe("선택지 턴 — 대화 안의 칩", () => {
  const withOptions = () =>
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "어떻게 이어갈까요?",
          phase: "await_direction",
          options: [
            option({ id: "1", label: "마음 이야기하기", description: "감정 정리형" }),
            option({ id: "4", label: "짧게 기록하기", description: "짧은 기록형" }),
          ],
        }),
      },
    });

  it("선택지가 대화에 붙고, 고르면 optionId 로 보낸다", async () => {
    withOptions();
    mockTurn.mockResolvedValue({
      ok: true,
      data: reply({ text: "좋아요.", ui: "measure", measures: [] }),
    });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("짧게 기록하기")).toBeTruthy());
    await fireEvent.press(r.getByText("짧게 기록하기"));
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { optionId: "4" });
  });

  it("방향 선택은 경계 칩으로 남는다", async () => {
    withOptions();
    mockTurn.mockResolvedValue({ ok: true, data: reply({ text: "좋아요.", phase: "script" }) });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("마음 이야기하기")).toBeTruthy());
    await fireEvent.press(r.getByText("마음 이야기하기"));
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    // 칩 라벨이 대화에 남는다 (경계선)
    await waitFor(() => expect(useRetro.getState().turns.some((t) => t.who === "chip")).toBe(true));
  });
});

describe("행동 추천 — 이전 카드 배지 + 직접 입력", () => {
  // 설명을 들고 온 선택지는 칩이 아니라 **줄**로 편다 — 배지가 고르기 전에 보여야 한다
  const withActionOptions = () =>
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "어떤 행동을 해볼까요?",
          phase: "script",
          options: [
            option({
              id: "1",
              label: "예상 질문 하나 답해보기",
              hint: "지난 비슷한 상황에서 정한 행동이에요",
            }),
            option({ id: "2", label: "답변 핵심 세 줄 만들기", description: "결론부터" }),
            option({ id: "3", label: "내가 직접 정할래요", input: true }),
          ],
        }),
      },
    });

  it("이전 카드 옵션의 hint 배지를 보여준다", async () => {
    withActionOptions();
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("지난 비슷한 상황에서 정한 행동이에요")).toBeTruthy());
  });

  it("직접 입력을 고르기 전에는 텍스트 필드가 없다", async () => {
    withActionOptions();
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("내가 직접 정할래요")).toBeTruthy());
    expect(r.queryByLabelText("직접 입력한 행동")).toBeNull();
  });

  it("직접 입력을 고르면 필드가 열리고, 적은 행동을 content 로 보낸다", async () => {
    withActionOptions();
    mockTurn.mockResolvedValue({
      ok: true,
      data: reply({ text: "좋아요.", ui: "measure", measures: [] }),
    });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("내가 직접 정할래요")).toBeTruthy());
    await fireEvent.press(r.getByText("내가 직접 정할래요"));

    // 「직접 쓸게요」를 고르면 칩이 접히고 **입력창으로 전환된다**(`DESIGN.md` 「일기」 3)
    const input = r.getByLabelText("직접 입력한 행동");
    await fireEvent.changeText(input, "자기 전에 오늘 답변 한 줄 적어보기");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { content: "자기 전에 오늘 답변 한 줄 적어보기" });
    // 직접 적은 행동이 내 버블로 남는다
    expect(r.getByText("자기 전에 오늘 답변 한 줄 적어보기")).toBeTruthy();
  });
});

describe("측정 턴 — 0~10 눈금", () => {
  it("슬라이더를 정하면 measures 로 보낸다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "지금 감정은 얼마나 강한가요?",
          ui: "measure",
          measures: [{ id: "current_emotion", label: "지금 감정", min: 0, max: 10 }],
        }),
      },
    });
    mockTurn.mockResolvedValue({ ok: true, data: reply({ text: "고마워요.", phase: "script" }) });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByLabelText("지금 감정")).toBeTruthy());
    // 끌기 대신 낭독기 증감으로 올린다 — 둘이 같은 `onChange` 를 지난다
    for (let i = 0; i < 6; i++) {
      await fireEvent(r.getByLabelText("지금 감정"), "accessibilityAction", {
        nativeEvent: { actionName: "increment" },
      });
    }
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    expect(mockTurn).toHaveBeenCalledWith(7, { measures: { current_emotion: 6 } });
  });

  it("건드리지 않아도 중앙값(0~10 이면 5)이 실린다 — 슬라이더가 처음부터 5", async () => {
    // 대화 중(turn)에 측정이 온다 — 실제 흐름
    mockTurn.mockResolvedValueOnce({
      ok: true,
      data: reply({
        text: "지금 감정은 얼마나 강한가요?",
        ui: "measure",
        measures: [{ id: "current_emotion", label: "지금 감정", min: 0, max: 10 }],
      }),
    });
    mockTurn.mockResolvedValueOnce({
      ok: true,
      data: reply({ text: "고마워요.", phase: "script" }),
    });
    const r = await render(<RetroTalk />);
    await waitFor(() => expect(mockStart).toHaveBeenCalled());

    // 텍스트 답을 보내 측정 턴을 받는다
    await fireEvent.changeText(r.getByLabelText("답변"), "괜찮아요.");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });
    await waitFor(() => expect(r.getByLabelText("지금 감정")).toBeTruthy());

    // 슬라이더를 건드리지 않고 바로 보낸다
    await act(async () => {
      await fireEvent.press(r.getByText("보내기"));
    });

    expect(mockTurn).toHaveBeenLastCalledWith(7, { measures: { current_emotion: 5 } });
  });
});

describe("종료", () => {
  it("일기가 오면 [일기 보러 가기] 로 draft 로 간다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({
          text: "정리했어요.",
          phase: "complete",
          done: true,
          diary: { diaryId: null, diary: "오늘의 일기.", reframedDiary: null },
        }),
      },
    });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("일기로 정리하기")).toBeTruthy());
    await fireEvent.press(r.getByText("일기로 정리하기"));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/draft");
    // store 에 일기가 담겨 draft 가 읽는다
    expect(useRetro.getState().diary?.diary).toBe("오늘의 일기.");
  });

  it("어뷰징 종료면 홈으로 나가는 길만 둔다", async () => {
    mockStart.mockResolvedValue({
      ok: true,
      data: {
        sessionId: 7,
        reply: reply({ text: "여기까지 할게요.", phase: "ended", done: true }),
      },
    });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("홈으로 돌아가기")).toBeTruthy());
    await fireEvent.press(r.getByText("홈으로 돌아가기"));
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });
});

describe("위기 안내 후 이어가기", () => {
  const holdReply = () =>
    reply({
      text: "지금 많이 힘드시죠. 잠시 멈추고 아래 도움을 받아보실 수 있어요.",
      phase: "safety_hold",
      done: false,
      safetyLevel: "imminent",
    });

  it("안내 뒤엔 [홈으로 돌아가기] 와 [이어서 얘기하기] 를 함께 둔다 — 입력창은 아직 없다", async () => {
    mockStart.mockResolvedValue({ ok: true, data: { sessionId: 7, reply: holdReply() } });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("홈으로 돌아가기")).toBeTruthy());
    expect(r.getByText("이어서 얘기하기")).toBeTruthy();
    // 아직 이어가기를 고르지 않았으니 입력창은 뜨지 않는다
    expect(r.queryByLabelText("답변")).toBeNull();
  });

  it("[이어서 얘기하기] 를 고르면 입력창이 열리고, 보낸 발화가 다음 턴으로 이어진다", async () => {
    mockStart.mockResolvedValue({ ok: true, data: { sessionId: 7, reply: holdReply() } });
    mockTurn.mockResolvedValue({
      ok: true,
      data: reply({ text: "그 마음을 더 들려줄래요?", phase: "intro" }),
    });
    const r = await render(<RetroTalk />);

    await waitFor(() => expect(r.getByText("이어서 얘기하기")).toBeTruthy());
    await fireEvent.press(r.getByText("이어서 얘기하기"));

    // 입력창이 열린다 — 나가기·이어가기 버튼은 사라진다
    await waitFor(() => expect(r.getByLabelText("답변")).toBeTruthy());
    expect(r.queryByText("이어서 얘기하기")).toBeNull();

    await fireEvent.changeText(r.getByLabelText("답변"), "사실 오늘 발표를 망쳤어요.");
    await act(async () => {
      await fireEvent.press(r.getByLabelText("보내기"));
    });

    // 이어간 발화가 그대로 다음 턴으로 간다(서버가 멈추기 전 phase 에서 처리한다)
    expect(mockTurn).toHaveBeenCalledWith(7, { content: "사실 오늘 발표를 망쳤어요." });
    await waitFor(() => expect(r.getByText("그 마음을 더 들려줄래요?")).toBeTruthy());
  });
});
