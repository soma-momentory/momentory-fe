import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import WorryBoxScreen from "../worry-box";

import { track } from "@/features/analytics";

import { worryBoxFinish as F, worryBoxMotion as M } from "@/design/ds";
import { addRestRecord } from "@/features/rest/data/restRecordApi";
import { keepWorry } from "@/features/rest/data/worryApi";

/**
 * 걱정상자 — 걱정 한 줄을 적어 카피바라에게 건네고, 상자에 넣고, 맡겨두거나 흘려보낸다.
 *
 * 여기서 고정하는 것: 적기 전에는 「상자에 맡기기」가 꺼져 있다(공백만으로는 안 켜진다) ·
 * 맡기면 쓴 걱정이 종이 카드가 되어 건네지고 상자가 닫힌 뒤에야 선택지가 온다 ·
 * 두 끝 다 연출이 끝난 뒤에야 「쉼터로 돌아가기」가 붙는다 · 맡겨둔 걱정만 서버로 간다.
 */
jest.mock("@/features/rest/data/worryApi", () => ({
  keepWorry: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchWorries: jest.fn(),
}));

jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchRestRecords: jest.fn(),
}));

// 처음 들어온 쉼터의 설명 카드는 감각연못 테스트 「설명 카드」에서 본다 — 여기서는 이미 본 쉼터로 둔다
jest.mock("@/features/rest/data/guideMemory", () => ({
  readGuideSeen: jest.fn(() => Promise.resolve(true)),
  markGuideSeen: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

// 계측은 켜 두고 전송만 가로챈다 — 화면이 언제 무엇을 보내는지 본다
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  isAnalyticsEnabled: true,
  track: jest.fn(),
}));

/** 장면은 낭독기에서 숨긴다 — 카드 · 쪽지 · 포즈를 보려면 숨긴 것까지 봐야 한다 */
const HIDDEN = { includeHiddenElements: true } as const;

const WORRY = "내일 발표가 잘 안될까 봐 걱정돼요";
const HANDING = M.fly + M.hold + M.put + M.close + M.settle;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// 조금씩 나눠 흘린다 — 문구 갈아 끼우기 타이머가 제때 걸리게(몸에 힘 빼기와 같은 이유)
const pass = async (ms: number) => {
  for (let t = 0; t < ms; t += 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, ms - t));
    });
  }
};

type Q = Awaited<ReturnType<typeof render>>;

const handOver = async (r: Q) => {
  await fireEvent.changeText(r.getByPlaceholderText("내일 발표가 잘 안될까 봐 걱정돼요"), WORRY);
  await fireEvent.press(r.getByRole("button", { name: "상자에 맡기기" }));
};

describe("걱정상자", () => {
  it("건네는 말과 함께 시작하고, 적기 전에는 맡길 수 없다 · 100자까지 쓴다", async () => {
    const r = await render(<WorryBoxScreen />);

    expect(r.getByText("걱정상자")).toBeTruthy();
    expect(r.getByText("무거운 걱정을 카피바라에게 잠시 맡겨보세요")).toBeTruthy();
    // 절차를 화살표로 늘어놓지 않고 건네는 말로 알려 준다
    expect(r.getByText(/걱정을 적어 건네주세요/)).toBeTruthy();
    expect(r.queryByText(/→/)).toBeNull();

    const cta = () => r.getByRole("button", { name: "상자에 맡기기" });
    expect(cta().props.accessibilityState.disabled).toBe(true);

    // 공백만으로는 켜지지 않는다
    await fireEvent.changeText(r.getByPlaceholderText("내일 발표가 잘 안될까 봐 걱정돼요"), "   ");
    expect(cta().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(r.getByPlaceholderText("내일 발표가 잘 안될까 봐 걱정돼요"), WORRY);
    expect(cta().props.accessibilityState.disabled).toBe(false);
    expect(r.getByPlaceholderText("내일 발표가 잘 안될까 봐 걱정돼요").props.maxLength).toBe(100);
  });

  it("맡기면 쓴 걱정이 종이 카드로 건네지고, 상자에 들어간 뒤에야 선택지가 온다", async () => {
    const r = await render(<WorryBoxScreen />);
    await handOver(r);

    // 입력창은 사라지고 쓴 걱정이 종이 카드에 그대로 적힌다
    expect(r.queryByPlaceholderText("내일 발표가 잘 안될까 봐 걱정돼요")).toBeNull();
    expect(r.getByTestId("worry-box-card", HIDDEN)).toBeTruthy();
    expect(r.getByText(WORRY, HIDDEN)).toBeTruthy();
    expect(r.getByTestId("worry-box-pose-sit", HIDDEN)).toBeTruthy();

    // 카피바라가 받아 들고 읽는다 — 머리 위에 생각 말풍선이 뜬다
    await pass(M.fly + 50);
    expect(r.queryByTestId("worry-box-card", HIDDEN)).toBeNull();
    expect(r.getByTestId("worry-box-pose-hold", HIDDEN)).toBeTruthy();
    expect(r.getByTestId("worry-box-thought", HIDDEN)).toBeTruthy();

    // 상자에 넣는다 — 쪽지가 상자 안으로 내려가고 말풍선은 걷힌다
    await pass(M.hold);
    expect(r.getByTestId("worry-box-pose-put", HIDDEN)).toBeTruthy();
    expect(r.getByTestId("worry-box-note", HIDDEN)).toBeTruthy();
    expect(r.queryByTestId("worry-box-thought", HIDDEN)).toBeNull();
    expect(r.queryByText("잠시 맡겨둘게요")).toBeNull();

    // 위 문구는 옅어졌다 새 문구로 돌아온다(`StepHeading`) — 그만큼 더 기다린다
    await pass(HANDING - M.fly - M.hold + 400);
    expect(r.getByText("걱정을 상자에 고이 담았어요")).toBeTruthy();
    expect(r.getByText("이 걱정을 어떻게 할까요?")).toBeTruthy();
    expect(r.getByText("잠시 맡겨둘게요")).toBeTruthy();
    expect(r.getByText("흘려보낼게요")).toBeTruthy();
  });

  it("「잠시 맡겨둘게요」 — 상자가 곁에 놓이고, 다 놓인 뒤 쉼터로 돌아간다", async () => {
    const r = await render(<WorryBoxScreen />);
    await handOver(r);
    await pass(HANDING + 100);

    await fireEvent.press(r.getByRole("button", { name: /잠시 맡겨둘게요/ }));
    await pass(400);
    expect(r.getByText("제가 잠시 맡아둘게요")).toBeTruthy();
    expect(r.getByText("지금은 마음 놓고 쉬어도 괜찮아요")).toBeTruthy();
    expect(r.getByTestId("worry-box-pose-rest", HIDDEN)).toBeTruthy();
    expect(r.queryByText("쉼터로 돌아가기")).toBeNull();

    // 곁에 앉은 뒤 — 상자에서 빛이 번지고 알갱이가 떠오르고, 그게 끝나야 돌아가는 길
    await pass(M.keepSlide);
    expect(r.getByTestId("worry-box-glow", HIDDEN)).toBeTruthy();
    expect(r.getByTestId("worry-box-motes", HIDDEN)).toBeTruthy();
    expect(r.queryByText("쉼터로 돌아가기")).toBeNull();

    await pass(F.glow.duration);
    // 누르면 장면 위에 기분 쪽지가 뜬다 — 고르기 전에는 나가는 길이 없다
    await fireEvent.press(r.getByText("쉼터로 돌아가기"));
    expect(r.getByTestId("rest-mood-exit")).toBeTruthy();
    // 아래 장면은 쪽지 뒤로 물러난다(낭독기에도) — 나가는 길은 아직 없다
    expect(r.queryAllByRole("button", { name: "쉼터로 돌아가기" })).toHaveLength(0);
    await fireEvent.press(r.getByRole("button", { name: "그대로예요" }));
    await fireEvent.press(r.getByRole("button", { name: "나아졌어요" }));
    // 다시 고를 수 있고, 보내기는 떠날 때 한 번이다
    expect(addRestRecord).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    await fireEvent.press(r.getByRole("button", { name: "쉼터로 돌아가기" }));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest");
    // 맡겨둔 걱정은 쓴 그대로 서버에 남는다
    expect(keepWorry).toHaveBeenCalledTimes(1);
    expect(keepWorry).toHaveBeenCalledWith(WORRY);
  });

  it("맡겨두기 저장이 실패해도 연출은 끝까지 가고, 끝에서 한 줄로 알린다", async () => {
    jest.mocked(keepWorry).mockResolvedValueOnce({ ok: false, code: "network" });
    const r = await render(<WorryBoxScreen />);
    await handOver(r);
    await pass(HANDING + 100);

    await fireEvent.press(r.getByRole("button", { name: /잠시 맡겨둘게요/ }));
    await pass(400 + M.keepSlide + F.glow.duration);
    expect(r.getByText("걱정을 맡아두지 못했어요. 잠시 뒤에 다시 맡겨주세요.")).toBeTruthy();
    expect(r.getByText("쉼터로 돌아가기")).toBeTruthy();
  });

  it("오른쪽 위 원 — 맡겨둔 걱정과 이용 기록으로 각각 간다", async () => {
    const r = await render(<WorryBoxScreen />);
    await fireEvent.press(r.getByRole("button", { name: "맡겨둔 걱정" }));
    expect(router.push).toHaveBeenCalledWith("/rest/worries");
    await fireEvent.press(r.getByRole("button", { name: "지난 기록 보기" }));
    expect(router.push).toHaveBeenCalledWith("/rest/records?content=worry_box");
  });

  it("「흘려보낼게요」 — 카피바라가 상자를 이고 걸어가 멀어진 뒤에야 돌아가는 길이 붙는다", async () => {
    const r = await render(<WorryBoxScreen />);
    await handOver(r);
    await pass(HANDING + 100);

    await fireEvent.press(r.getByRole("button", { name: /흘려보낼게요/ }));
    await pass(400);
    // 걷는 동안은 「멀어지고 있어요」
    expect(r.getByText("걱정이 멀어지고 있어요")).toBeTruthy();
    // 걸음을 번갈아 딛는다
    expect(r.queryByTestId(/worry-box-pose-walk/, HIDDEN)).toBeTruthy();
    expect(r.queryByText("쉼터로 돌아가기")).toBeNull();

    expect(r.queryByText(/이제 잊어도 괜찮아요/)).toBeNull();

    // 사라진 빈자리 — 길 끝에서 알갱이가 떠오르고, 위 말이 바뀌고, 쪽지가 알갱이와 함께 내려앉는다
    await pass(M.pickUp + M.walk + 400);
    expect(r.getByTestId("worry-box-motes", HIDDEN)).toBeTruthy();
    expect(r.getByText("이제 걱정에서 잠시 멀어졌어요")).toBeTruthy();
    expect(r.queryByText("걱정이 멀어지고 있어요")).toBeNull();
    expect(r.getByText(/방금 했던 고민은\s*이제 잊어도 괜찮아요/)).toBeTruthy();
    expect(r.getByTestId("worry-box-card-motes", HIDDEN)).toBeTruthy();
    // 카피바라가 남기고 간 쪽지다 — 서명이 붙는다
    expect(r.getByText("-카피바라-")).toBeTruthy();

    // 돌아가는 길은 쪽지가 다 내려앉은 **뒤**에 붙는다
    expect(r.queryByText("쉼터로 돌아가기")).toBeNull();
    await pass(F.message.delay + F.message.duration);
    expect(r.getByText("쉼터로 돌아가기")).toBeTruthy();
    // 흘려보낸 걱정은 어디로도 가지 않는다
    expect(keepWorry).not.toHaveBeenCalled();
  });

  describe("계측", () => {
    const sent = () => jest.mocked(track).mock.calls.map(([name, props]) => [name, props]);

    it("맡기고 고르면 글자 수 · 고른 끝 · 끝까지를 보내고, 쓴 걱정은 어디에도 싣지 않는다", async () => {
      const r = await render(<WorryBoxScreen />);
      await handOver(r);
      await pass(HANDING + 100);
      await fireEvent.press(r.getByRole("button", { name: /흘려보낼게요/ }));
      await act(async () => {
        r.unmount();
      });

      expect(sent()).toEqual([
        ["rest_content_opened", { content: "worry_box", entry: "direct", diary_today: false }],
        ["worry_box_handed", { chars: WORRY.length }],
        ["worry_box_choice_selected", { choice: "release" }],
        ["rest_content_completed", { content: "worry_box", duration_ms: expect.any(Number) }],
      ]);
      expect(JSON.stringify(sent())).not.toContain("발표");
    });

    it("고르기 전에 떠나면 나간 자리를 보낸다", async () => {
      const r = await render(<WorryBoxScreen />);
      await handOver(r);
      await pass(HANDING + 100);
      await act(async () => {
        r.unmount();
      });

      expect(sent()).toContainEqual([
        "rest_content_exited",
        { content: "worry_box", stage: "boxed", duration_ms: expect.any(Number) },
      ]);
    });

    it("쓰다가 떠나면 write 에서 나간 것이다", async () => {
      const r = await render(<WorryBoxScreen />);
      await act(async () => {
        r.unmount();
      });

      expect(sent()).toContainEqual([
        "rest_content_exited",
        { content: "worry_box", stage: "write", duration_ms: expect.any(Number) },
      ]);
    });
  });
});
