import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { Linking } from "react-native";

import { useEffect as mockUseEffect } from "react";

import LetterScreen from "../[date]";
import LetterBox from "../index";
import LetterTime from "../time";

import { track } from "@/features/analytics";
import type { Diary } from "@/features/diary/model/diary";
import { useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import {
  chooseLetterAction,
  fetchLetter,
  fetchLetters,
  markLetterOpened,
  saveLetterTime,
  type Letter,
} from "@/features/letter/data/letterApi";
import { keepWords, useLetters } from "@/features/letter/model/letter";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { fixedClock, SampleClock, setClock } from "@/lib/clock";

let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]),
}));
jest.mock("@/features/letter/data/letterApi", () => ({
  fetchLetters: jest.fn(),
  fetchLetter: jest.fn(),
  markLetterOpened: jest.fn(async () => true),
  chooseLetterAction: jest.fn(),
  saveLetterTime: jest.fn(async () => true),
}));
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

const native = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
};

const LETTER: Letter = {
  id: "12",
  date: "2026-10-26",
  status: "READY",
  quote: "발표 전에 손이 계속 떨렸어요",
  insight: "떨렸던 건 그만큼 잘하고 싶었기 때문이었을지도 몰라요.",
  tonightQuestion: "오늘 밤엔 발표 뒤 마음부터 물어볼게요.",
  actions: [
    {
      position: 0,
      title: "5분 동안 숨 고르기",
      source: "CATALOG",
      chosen: false,
      whenLabel: null,
      scheduleId: null,
      remindAt: null,
    },
    {
      position: 1,
      title: "점심 뒤 한 바퀴 걷기",
      source: "CATALOG",
      chosen: false,
      whenLabel: null,
      scheduleId: null,
      remindAt: null,
    },
  ],
  helplines: [],
  isNew: true,
  openedAt: null,
};

/** 서버가 고른 결과를 그대로 돌려준다 */
const choose = (position: number | null, whenLabel: string | null, remindAt: string | null) => ({
  ...LETTER,
  openedAt: "2026-10-27T00:00:00Z",
  actions: LETTER.actions.map((a) =>
    a.position === position ? { ...a, chosen: true, whenLabel, remindAt } : a,
  ),
});

beforeEach(() => {
  jest.clearAllMocks();
  setClock(fixedClock("2026-10-27T09:00:00"));
  mockParams = { date: "2026-10-26", source: "notification" };
  native.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  useProfile.setState({ nickname: "하늘" });
  useDay.setState({ schedules: [] });
  useLetters.setState({ userId: 7, summaries: null, letters: {} });
  jest.mocked(fetchLetters).mockResolvedValue({
    ok: true,
    data: [
      { id: "12", date: "2026-10-26", isNew: true, openedAt: null },
      { id: "11", date: "2026-10-25", isNew: false, openedAt: "2026-10-26T00:00:00Z" },
    ],
  });
  jest.mocked(fetchLetter).mockResolvedValue({ ok: true, data: LETTER });
});

afterEach(() => setClock(SampleClock));

describe("편지 전체 화면", () => {
  it("읽는 부분을 그리고 · 열람을 남기고 · 연 경로를 센다", async () => {
    const r = await render(<LetterScreen />);

    await waitFor(() =>
      expect(r.getByText(new RegExp(`^${keepWords("하늘님에게,")}`))).toBeTruthy(),
    );
    expect(r.getByText(keepWords("「발표 전에 손이 계속 떨렸어요」"))).toBeTruthy();
    // 인용은 누구의 말인지 문장으로 감싼다 — 「어제 「…」라고 남겼죠.」
    expect(
      r.getByText(
        new RegExp(`${keepWords("어제")} ${keepWords("「발표")}.*${keepWords("라고 남겼죠.")}`),
      ),
    ).toBeTruthy();
    expect(r.getByText("10월 27일 아침")).toBeTruthy();
    expect(r.getByText(keepWords("오늘 해 볼 작은 일 하나 고를래요?"))).toBeTruthy();
    expect(r.getByText(keepWords("오늘 밤엔 발표 뒤 마음부터 물어볼게요."))).toBeTruthy();
    expect(markLetterOpened).toHaveBeenCalledWith("12");
    expect(useLetters.getState().summaries?.[0]?.openedAt).not.toBeNull();
    expect(track).toHaveBeenCalledWith(
      "letter_opened",
      expect.objectContaining({ source: "notification", status: "ready", days_after: "0" }),
    );
  });

  it("편지지 밑줄은 손글씨가 그려진 줄마다 하나씩 — 글자 크기가 바뀌어도 줄을 따라간다", async () => {
    const r = await render(<LetterScreen />);
    await waitFor(() => expect(r.getByTestId("letter-body")).toBeTruthy());

    await act(async () => {
      await fireEvent(r.getByTestId("letter-body"), "textLayout", {
        nativeEvent: { lines: [0, 1, 2].map((i) => ({ y: i * 34, height: 34 })) },
      });
    });

    const rules = r.getAllByTestId("letter-rule");
    expect(rules).toHaveLength(3);
    expect(rules[2]!.props.style).toEqual(expect.arrayContaining([{ top: 34 * 3 - 1 }]));
  });

  it("인용이 「어제」로 시작하면 앞의 「어제」를 붙이지 않는다", async () => {
    jest.mocked(fetchLetter).mockResolvedValue({
      ok: true,
      data: { ...LETTER, quote: "어제 새벽 네 시까지 잠이 안 왔어요" },
    });
    const r = await render(<LetterScreen />);
    await r.findByTestId("letter-body");

    expect(r.getByText(keepWords("「어제 새벽 네 시까지 잠이 안 왔어요」"))).toBeTruthy();
    expect(r.queryByText(new RegExp(`${keepWords("어제")} ${keepWords("「어제")}`))).toBeNull();
  });

  it("아래 ‹ 지난 편지 버튼으로 넘긴다 — 끝에서는 그쪽 버튼이 없다", async () => {
    jest.mocked(fetchLetter).mockImplementation(async (day: string) => ({
      ok: true,
      data: { ...LETTER, id: day === "2026-10-25" ? "11" : "12", date: day, openedAt: null },
    }));
    const r = await render(<LetterScreen />);
    await waitFor(() => expect(r.getByRole("button", { name: "지난 편지" })).toBeTruthy());
    expect(r.queryByRole("button", { name: "다음 편지" })).toBeNull();

    await act(async () => {
      await fireEvent.press(r.getByRole("button", { name: "지난 편지" }));
    });

    await waitFor(() => expect(markLetterOpened).toHaveBeenCalledWith("11"));
    expect(r.getByRole("button", { name: "다음 편지" })).toBeTruthy();
    expect(r.queryByRole("button", { name: "지난 편지" })).toBeNull();
  });

  it("옆 칸은 미리 불러 두지만 열람으로 치지 않는다", async () => {
    const r = await render(<LetterScreen />);
    await waitFor(() =>
      expect(r.getByText(new RegExp(`^${keepWords("하늘님에게,")}`))).toBeTruthy(),
    );

    expect(fetchLetter).toHaveBeenCalledWith("2026-10-25");
    expect(markLetterOpened).toHaveBeenCalledTimes(1);
  });

  it("한 번 받은 편지는 다시 열 때 기다리지 않고 바로 그린다", async () => {
    useLetters.setState({ letters: { "2026-10-26": LETTER } });
    jest.mocked(fetchLetter).mockReturnValue(new Promise(() => {}));
    const r = await render(<LetterScreen />);

    await waitFor(() =>
      expect(r.getByText(new RegExp(`^${keepWords("하늘님에게,")}`))).toBeTruthy(),
    );
    expect(r.queryByText("바바가 편지를 마무리하고 있어요")).toBeNull();
  });

  it("작은 일을 고르면 「언제」가 열리고, 시각 칩을 고르면 그 시각에 한 번 알린다", async () => {
    jest
      .mocked(chooseLetterAction)
      .mockResolvedValueOnce({ ok: true, data: choose(1, null, null) })
      // 서버가 돌려준 알림 시각도 고정 시계와 같은 기준(기기 시간대 12:30)이어야 한다 —
      // UTC 고정값으로 두면 CI(UTC)에서는 9시보다 앞선 지난 시각이 되어 예약하지 않는다
      .mockResolvedValueOnce({
        ok: true,
        data: choose(1, "점심 뒤", new Date(2026, 9, 27, 12, 30).toISOString()),
      });
    const r = await render(<LetterScreen />);
    await waitFor(() => expect(r.getByText(keepWords("점심 뒤 한 바퀴 걷기"))).toBeTruthy());

    await act(async () => {
      await fireEvent.press(r.getByText(keepWords("점심 뒤 한 바퀴 걷기")));
    });
    expect(chooseLetterAction).toHaveBeenLastCalledWith("12", {
      position: 1,
      whenLabel: null,
      scheduleId: null,
      remindAt: null,
    });
    expect(r.getByText(keepWords("언제 할 거예요?"))).toBeTruthy();
    expect(
      r.getByText(keepWords("오늘 밤엔 「점심 뒤 한 바퀴 걷기」 해 봤는지부터 물어볼게요.")),
    ).toBeTruthy();

    await act(async () => {
      await fireEvent.press(r.getByText("점심 뒤"));
    });
    expect(chooseLetterAction).toHaveBeenLastCalledWith("12", {
      position: 1,
      whenLabel: "점심 뒤",
      scheduleId: null,
      remindAt: new Date(2026, 9, 27, 12, 30).toISOString(),
    });
    expect(r.getByText("점심 뒤에 한 번 알려 드릴게요")).toBeTruthy();
    expect(native.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "momentory.once.letter-action.12",
        // 잠금 화면에 고른 제목(일기 사건이 들어갈 수 있다)을 싣지 않는다 — 고정 문구다
        content: expect.objectContaining({ body: "오늘 해 보기로 한 일이 있어요." }),
      }),
    );
    expect(JSON.stringify(jest.mocked(native.scheduleNotificationAsync).mock.calls)).not.toContain(
      "점심 뒤 한 바퀴 걷기",
    );
    expect(track).toHaveBeenCalledWith(
      "letter_action_chosen",
      expect.objectContaining({ position: 1, when: "lunch", changed: false }),
    );
  });

  it("골랐던 것을 다시 누르면 선택이 풀린다", async () => {
    jest.mocked(fetchLetter).mockResolvedValue({ ok: true, data: choose(0, "자기 전", null) });
    jest.mocked(chooseLetterAction).mockResolvedValueOnce({ ok: true, data: LETTER });
    const r = await render(<LetterScreen />);
    await waitFor(() => expect(r.getByText(keepWords("5분 동안 숨 고르기"))).toBeTruthy());

    await act(async () => {
      await fireEvent.press(r.getByText(keepWords("5분 동안 숨 고르기")));
    });

    expect(chooseLetterAction).toHaveBeenLastCalledWith(
      "12",
      expect.objectContaining({ position: null }),
    );
    expect(r.queryByText(keepWords("언제 할 거예요?"))).toBeNull();
  });

  it("조용한 편지는 도움받을 곳만 — 작은 일 · 첫 질문 예고가 없다", async () => {
    jest.mocked(fetchLetter).mockResolvedValue({
      ok: true,
      data: {
        ...LETTER,
        status: "QUIET",
        quote: null,
        tonightQuestion: null,
        actions: [],
        insight: "하늘님, 어제는 많이 힘든 하루였죠.",
        helplines: ["자살예방 상담전화 109 (24시간)"],
      },
    });
    const r = await render(<LetterScreen />);

    await waitFor(() => expect(r.getByText("자살예방 상담전화 109 (24시간)")).toBeTruthy());
    expect(r.queryByText(keepWords("오늘 해 볼 작은 일 하나 고를래요?"))).toBeNull();

    // 번호만 눌러서 바로 건다 — 「24시간」은 번호가 아니다
    const call = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const numbers = r.getAllByTestId("letter-helpline-tel");
    expect(numbers.map((n) => n.props.children)).toEqual(["109"]);
    await fireEvent.press(numbers[0]!);
    expect(call).toHaveBeenCalledWith("tel:109");
    call.mockRestore();
  });

  it("못 불러오면 한 줄만", async () => {
    jest.mocked(fetchLetter).mockResolvedValue({ ok: false });
    const r = await render(<LetterScreen />);

    await waitFor(() => expect(r.getByText("편지를 불러오지 못했어요")).toBeTruthy());
  });
});

describe("편지 시각 고르기(4-8)", () => {
  beforeEach(() => {
    useSettings.getState().reset();
    useSettings.setState({ letterChosen: false });
  });

  it("기본 8:30 으로 받고 — 서버에 남긴 뒤 다음 화면으로", async () => {
    mockParams = { next: "done" };
    const r = await render(<LetterTime />);

    await act(async () => {
      await fireEvent.press(r.getByText("이 시각에 받을게요"));
    });

    expect(saveLetterTime).toHaveBeenCalledWith("08:30", true);
    expect(useSettings.getState()).toMatchObject({
      letterChosen: true,
      notify: expect.objectContaining({ letter: { enabled: true, time: "08:30" } }),
    });
    expect(track).toHaveBeenCalledWith("letter_time_chosen", { time: "8:30", notify: true });
    expect(router.replace).toHaveBeenCalledWith("/retro/done");
  });

  it("「알림 없이 볼게요」는 시각만 남기고 알림은 끈다", async () => {
    mockParams = { next: "rest" };
    const r = await render(<LetterTime />);

    await fireEvent.press(r.getByText("출근 전 7:30"));
    await act(async () => {
      await fireEvent.press(r.getByText("알림 없이 볼게요"));
    });

    expect(saveLetterTime).toHaveBeenCalledWith("07:30", false);
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest?afterDiary=1");
  });
});

describe("편지함 목록(홈 편지 아이콘)", () => {
  beforeEach(() => {
    useDiary.setState({
      diaries: [
        { id: "d26", date: "2026-10-26", body: "발표 전에 손이 떨렸다. 끝나니 괜찮았다." },
        { id: "d25", date: "2026-10-25", body: "자료가 막혔다." },
      ] as Diary[],
    });
  });

  it("최신순으로 한 줄씩 — 받은 날 · 그날 일기 첫 문장 · 안 연 편지만 빨간 점", async () => {
    const r = await render(<LetterBox />);
    await waitFor(() => expect(r.getByText("10월 27일 아침에 온 편지")).toBeTruthy());

    const titles = r.getAllByText(/아침에 온 편지$/).map((t) => t.props.children);
    expect(titles).toEqual(["10월 27일 아침에 온 편지", "10월 26일 아침에 온 편지"]);
    expect(r.getByText(keepWords("발표 전에 손이 떨렸다."))).toBeTruthy();
    expect(r.getByTestId("letter-unread-2026-10-26")).toBeTruthy();
    expect(r.queryByTestId("letter-unread-2026-10-25")).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "10월 27일 아침에 온 편지, 안 읽음" }));
    expect(router.push).toHaveBeenCalledWith("/letter/2026-10-26?source=home_icon");
  });

  it("홈 아이콘이 새 편지와 함께 열면 목록 위에 그 편지를 한 번 펼친다", async () => {
    mockParams = { open: "2026-10-26" };
    await render(<LetterBox />);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/letter/2026-10-26?source=home_icon");
    expect(router.setParams).toHaveBeenCalledWith({ open: "" });
  });

  it("편지가 한 통도 없으면 한 줄만", async () => {
    jest.mocked(fetchLetters).mockResolvedValue({ ok: true, data: [] });
    const r = await render(<LetterBox />);

    await waitFor(() =>
      expect(r.getByText("일기를 쓰면 다음 날 아침 바바가 편지를 보내요")).toBeTruthy(),
    );
  });
});
