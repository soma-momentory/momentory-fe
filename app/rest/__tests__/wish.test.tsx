import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { track } from "@/features/analytics";
import {
  agreeWishRules,
  fetchPond,
  joinWish,
  postWish,
  reportWish,
  reviewWish,
  type PondWish,
  type WishPond,
} from "@/features/rest/data/wishApi";
import { addRestRecord } from "@/features/rest/data/restRecordApi";
import { pondSceneMotion } from "@/design/ds";

import WishScreen from "../wish";

jest.mock("@/features/rest/data/wishApi", () => ({
  fetchPond: jest.fn(),
  agreeWishRules: jest.fn(() => Promise.resolve({ ok: true, data: true })),
  reviewWish: jest.fn(),
  postWish: jest.fn(),
  joinWish: jest.fn(() => Promise.resolve({ ok: true, data: true })),
  reportWish: jest.fn(() => Promise.resolve({ ok: true, data: true })),
  undoReportWish: jest.fn(() => Promise.resolve({ ok: true, data: true })),
}));
jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true })),
  fetchRestRecords: jest.fn(),
}));
jest.mock("@/features/rest/data/guideMemory", () => ({
  readGuideSeen: jest.fn(() => Promise.resolve(true)),
  markGuideSeen: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
    useFocusEffect: (run: () => void) => useEffect(run, [run]),
  };
});
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  isAnalyticsEnabled: true,
  track: jest.fn(),
}));

const wish = (id: number, over: Partial<PondWish> = {}): PondWish => ({
  id,
  content: `소원 ${id}`,
  daysLeft: 6,
  light: true,
  joined: false,
  author: "user",
  ...over,
});

const pond = (over: Partial<WishPond> = {}): WishPond => ({
  rulesAgreed: true,
  postedToday: false,
  hasFloatingWish: false,
  floatingCount: 2,
  wishes: [wish(1), wish(2)],
  ...over,
});

const open = async (data = pond()) => {
  jest.mocked(fetchPond).mockResolvedValue({ ok: true, data });
  const r = await render(<WishScreen />);
  await wait();
  return r;
};

const sent = () => jest.mocked(track).mock.calls.map(([name, props]) => [name, props]);

const wait = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("소원 빌기", () => {
  it("연못에 익명의 쪽지와 쓰기 버튼이 있고, 귤은 없다", async () => {
    const r = await open();
    expect(r.getByText("소원 1")).toBeTruthy();
    expect(r.getByText("익명의 누군가")).toBeTruthy();
    expect(r.queryByText(/귤|🍊/)).toBeNull();
    expect(sent()).toContainEqual([
      "rest_content_opened",
      { content: "wish", entry: "direct", diary_today: false },
    ]);
  });

  it("연꽃을 누르면 그 꽃의 소원이 쪽지에 뜨고, 소원 한 장으로 넘어가지 않는다", async () => {
    const r = await open();
    expect(r.getByText("소원 1")).toBeTruthy();
    await fireEvent.press(r.getAllByLabelText("소원 보기")[1]!);
    await wait(1000);

    expect(r.getByText("소원 2")).toBeTruthy();
    expect(r.queryByText("소원 1")).toBeNull();
    expect(r.queryByRole("button", { name: "꾸욱 눌러 같이 빌기" })).toBeNull();
  });

  it("쪽지는 가벼운 소원만 차례로 돌고, 무거운 소원은 건너뛴다", async () => {
    const r = await open(pond({ wishes: [wish(1), wish(2, { light: false }), wish(3)] }));
    await wait(10_500);
    expect(r.getByText("소원 3")).toBeTruthy();
    await wait(10_500);
    expect(r.getByText("소원 1")).toBeTruthy();
  });

  it("바바의 소원은 바바의 소원이라고 적는다", async () => {
    const r = await open(
      pond({ wishes: [wish(-1, { author: "baba", content: "귤이 달면 좋겠어요" })] }),
    );
    expect(r.getByText("바바의 소원")).toBeTruthy();
  });

  it("오늘 이미 띄웠으면 버튼이 꺼진다", async () => {
    jest.mocked(fetchPond).mockResolvedValue({
      ok: true,
      data: pond({ postedToday: true, hasFloatingWish: true }),
    });
    const r = await render(<WishScreen />);
    await wait();
    expect(r.getByText("오늘 소원은 띄웠어요")).toBeTruthy();
    expect(r.getByText("내 소원")).toBeTruthy();
    await fireEvent.press(r.getByRole("button", { name: "오늘 소원은 띄웠어요" }));
    expect(r.queryByText("어떤 소원을 띄울까요?")).toBeNull();
  });

  it("못 불러오면 한 줄로 말한다", async () => {
    jest.mocked(fetchPond).mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<WishScreen />);
    await wait();
    expect(r.getByText("연못을 불러오지 못했어요")).toBeTruthy();
  });

  it("처음이면 이용 규칙에 동의해야 쓰기가 열린다", async () => {
    const r = await open(pond({ rulesAgreed: false }));
    await fireEvent.press(r.getByRole("button", { name: "내 소원 빌기" }));
    expect(r.getByText("소원 연못 이용 규칙")).toBeTruthy();
    expect(r.queryByText("어떤 소원을 띄울까요?")).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "동의하고 쓰기" }));

    expect(r.getByText("어떤 소원을 띄울까요?")).toBeTruthy();
    expect(jest.mocked(agreeWishRules)).toHaveBeenCalledTimes(1);
    expect(sent()).toContainEqual(["wish_rules_agreed", {}]);
  });

  const write = async (r: Awaited<ReturnType<typeof open>>, text: string) => {
    await fireEvent.press(r.getByRole("button", { name: "내 소원 빌기" }));
    await fireEvent.changeText(r.getByLabelText("소원 쓰기"), text);
    await fireEvent.press(r.getByRole("button", { name: "다 썼어요" }));
    await wait();
  };

  it("심사가 고친 글을 보여 주고, 띄우면 연못에 내 꽃이 뜬다", async () => {
    jest.mocked(reviewWish).mockResolvedValue({
      ok: true,
      data: { result: "edited", content: "그 사람이 답장해 주면 좋겠어요", reviewToken: "표" },
    });
    jest.mocked(postWish).mockResolvedValue({
      ok: true,
      data: {
        id: 9,
        content: "그 사람이 답장해 주면 좋겠어요",
        daysLeft: 7,
        joinedByOthers: false,
      },
    });
    const r = await open();
    await write(r, "김지훈이 답장해 주면 좋겠어요");

    expect(r.getByText("이렇게 띄울까요?")).toBeTruthy();
    expect(r.getByText("그 사람이 답장해 주면 좋겠어요")).toBeTruthy();
    expect(r.getByText("이름과 연락처는 빼고 띄워요")).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "띄우기" }));
    await wait();

    expect(r.getByText(/연못에 띄웠어요/)).toBeTruthy();
    expect(r.getByText("오늘 소원은 띄웠어요")).toBeTruthy();
    expect(jest.mocked(postWish)).toHaveBeenCalledWith("그 사람이 답장해 주면 좋겠어요", "표");
    expect(sent()).toEqual(
      expect.arrayContaining([
        ["wish_submitted", { chars: 16 }],
        ["wish_review_result", { result: "edited" }],
        ["wish_posted", { chars: 17 }],
        ["rest_content_completed", { content: "wish", duration_ms: expect.any(Number) }],
      ]),
    );
    // 글은 어떤 이벤트에도 실리지 않는다
    expect(JSON.stringify(sent())).not.toContain("답장");
  });

  it("거절되면 한 줄로 알리고 글을 고칠 때까지 못 보낸다", async () => {
    jest.mocked(reviewWish).mockResolvedValue({
      ok: true,
      data: { result: "rejected", message: "누군가 잘못되길 바라는 말은 띄울 수 없어요" },
    });
    const r = await open();
    await write(r, "그 사람이 잘리면 좋겠어요");

    expect(r.getByText("누군가 잘못되길 바라는 말은 띄울 수 없어요")).toBeTruthy();
    await fireEvent.changeText(r.getByLabelText("소원 쓰기"), "다른 소원이에요");
    expect(r.queryByText("누군가 잘못되길 바라는 말은 띄울 수 없어요")).toBeNull();
  });

  it("위기면 띄우지 않고 도움받을 곳을 보여 준다", async () => {
    jest.mocked(reviewWish).mockResolvedValue({ ok: true, data: { result: "crisis" } });
    const r = await open();
    await write(r, "눈 뜨지 않았으면 좋겠어요");

    expect(r.getByText("잠깐 여기서 함께 멈춰볼게요")).toBeTruthy();
    expect(r.getByText("109")).toBeTruthy();
    expect(jest.mocked(postWish)).not.toHaveBeenCalled();
    await fireEvent.press(r.getByRole("button", { name: "쉼터로 돌아가기" }));
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/(tabs)/rest");
  });

  it("심사가 실패하면 쓴 글을 그대로 두고 한 줄로 말한다", async () => {
    jest.mocked(reviewWish).mockResolvedValue({ ok: false, code: "unavailable" });
    const r = await open();
    await write(r, "내 소원이에요");

    expect(r.getByText("지금은 띄우지 못했어요. 쓴 글은 그대로예요.")).toBeTruthy();
    expect(r.getByLabelText("소원 쓰기").props.value).toBe("내 소원이에요");
    expect(sent()).toContainEqual(["wish_review_result", { result: "failed" }]);
  });

  describe("소원 한 장", () => {
    const toCard = async (data = pond()) => {
      jest.mocked(fetchPond).mockResolvedValue({ ok: true, data });
      const r = await render(<WishScreen />);
      await wait();
      await fireEvent.press(r.getByRole("button", { name: /같이 빌기$/ }));
      await wait();
      return r;
    };

    it("꾸욱 다 누르면 같이 빈다", async () => {
      const r = await toCard();
      await fireEvent(r.getByRole("button", { name: "꾸욱 눌러 같이 빌기" }), "pressIn");
      await wait(pondSceneMotion.hold);

      expect(r.getByText("같이 빌어준 소원이에요")).toBeTruthy();
      expect(jest.mocked(joinWish)).toHaveBeenCalledWith(1);
      expect(sent()).toContainEqual(["wish_joined", { position: 0, author: "user" }]);
    });

    it("일찍 떼면 다시 눌러 달라고 한다", async () => {
      const r = await toCard();
      const pill = r.getByRole("button", { name: "꾸욱 눌러 같이 빌기" });
      await fireEvent(pill, "pressIn");
      await wait(pondSceneMotion.hold / 2);
      await fireEvent(pill, "pressOut");

      expect(r.getByRole("button", { name: "꾹 눌러 주세요" })).toBeTruthy();
      expect(jest.mocked(joinWish)).not.toHaveBeenCalled();
      expect(sent()).toContainEqual(["wish_join_cancelled", {}]);
    });

    it("끝까지 넘기면 연못으로 돌아와 새로 받는다", async () => {
      const r = await toCard();
      const calls = jest.mocked(fetchPond).mock.calls.length;
      await fireEvent.press(r.getByRole("button", { name: "다음 소원" }));
      await fireEvent.press(r.getByRole("button", { name: "다음 소원" }));
      await wait();

      expect(r.getByRole("button", { name: "내 소원 빌기" })).toBeTruthy();
      expect(jest.mocked(fetchPond).mock.calls.length).toBe(calls + 1);
      expect(sent()).toContainEqual(["wish_batch_finished", { joined: 0 }]);
    });

    it("신고하면 그 장이 빠지고 되돌리기가 뜬다 · 바바의 소원에는 메뉴가 없다", async () => {
      const r = await toCard(pond({ wishes: [wish(1), wish(-1, { author: "baba" })] }));
      await fireEvent.press(r.getByRole("button", { name: "더 보기" }));
      await wait(500);
      await fireEvent.press(r.getByRole("button", { name: "이 소원 신고하기" }));
      await wait(500);

      expect(jest.mocked(reportWish)).toHaveBeenCalledWith(1);
      expect(r.getByText("신고했어요. 이 사람 소원은 이제 안 보여요.")).toBeTruthy();
      expect(r.getByText("바바의 소원")).toBeTruthy();
      expect(r.queryByRole("button", { name: "더 보기" })).toBeNull();
    });
  });

  it("같이 빌었으면 나갈 때 기분을 묻고, 고르지 않고 떠나면 중간에 나간 기록을 남긴다", async () => {
    const r = await open();
    await fireEvent.press(r.getByRole("button", { name: /같이 빌기$/ }));
    await wait();
    await fireEvent(r.getByRole("button", { name: "꾸욱 눌러 같이 빌기" }), "pressIn");
    await wait(pondSceneMotion.hold);
    await fireEvent.press(r.getByRole("button", { name: "뒤로" }));
    await wait();
    await fireEvent.press(r.getByRole("button", { name: "뒤로" }));
    await wait(1000);
    expect(r.getByText("기분이 나아졌나요?")).toBeTruthy();

    await r.unmount();
    await wait();
    expect(jest.mocked(addRestRecord)).toHaveBeenCalledWith("wish", { completed: false });
  });

  it("아무것도 안 하고 나가면 기분을 묻지 않는다", async () => {
    const r = await open();
    await fireEvent.press(r.getByRole("button", { name: "뒤로" }));
    expect(jest.mocked(router.back)).toHaveBeenCalled();
    expect(r.queryByText("기분이 나아졌나요?")).toBeNull();
  });
});
