import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import SensePondScreen from "../sense-pond";

import { track } from "@/features/analytics";

import { pondSceneMotion } from "@/design/ds";
import { markGuideSeen, readGuideSeen } from "@/features/rest/data/guideMemory";
import { addRestRecord } from "@/features/rest/data/restRecordApi";
import { REST_GUIDES } from "@/features/rest/model/restGuide";

/**
 * 감각연못 — 시작 → 보이는 것 3 → 들리는 소리 2 → 몸에 닿는 느낌 1 → 끝. 여기서 고정하는 것: 손짓이
 * 어떻게 세어지는지, 이용 기록과 계측이 어떤 값으로 언제 나가는지, 설명 카드. 눈에 보이는 모양은
 * 고정하지 않는다. ⚠ 이용 기록의 값(`sense_pond`)은 서버에 쌓이는 값이라 바꾸지 않는다.
 */
jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchRestRecords: jest.fn(),
}));

// 설명 카드는 아래 「설명 카드」에서 본다 — 여기서는 이미 본 쉼터로 둔다
jest.mock("@/features/rest/data/guideMemory", () => ({
  readGuideSeen: jest.fn(() => Promise.resolve(true)),
  markGuideSeen: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  isAnalyticsEnabled: true,
  track: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

type Q = Awaited<ReturnType<typeof render>>;

const wait = async (ms: number) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

const open = async () => {
  const r = await render(<SensePondScreen />);
  await wait(0);
  return r;
};

const press = async (r: Q, label: string) => {
  await fireEvent.press(r.getByLabelText(label));
  await wait(pondSceneMotion.landing);
};

const HOLD_LABEL = "꾸욱 누르면서 느끼기";

/** 잠시 누르기는 누르고 있어야 세어진다 */
const hold = async (r: Q, ms: number) => {
  const pill = r.getByLabelText(HOLD_LABEL);
  await fireEvent(pill, "pressIn");
  await wait(ms);
  return pill;
};

const toFeel = async (r: Q) => {
  await press(r, "시작하기");
  for (let i = 0; i < 3; i += 1) await press(r, "찾았어요");
  for (let i = 0; i < 2; i += 1) await press(r, "들었어요");
};

const toTheEnd = async (r: Q) => {
  await toFeel(r);
  await hold(r, pondSceneMotion.hold);
  await wait(pondSceneMotion.landing);
};

const leave = async (r: Q) => {
  await r.unmount();
  await wait(0);
};

describe("감각연못 · 찾아 가기", () => {
  it("시작 화면에는 할 일 한 줄과 시작 버튼이 있고, 뒤로는 한 단계 돌아간다", async () => {
    const r = await open();
    expect(r.getByText("감각연못")).toBeTruthy();
    expect(r.getByLabelText("시작하기")).toBeTruthy();

    await fireEvent.press(r.getByLabelText("뒤로"));
    expect(jest.mocked(router.back)).toHaveBeenCalledTimes(1);
  });

  it("찾을 때마다 셈이 오르고, 다 찾으면 다음 감각으로 넘어간다", async () => {
    const r = await open();
    await press(r, "시작하기");
    expect(r.getByLabelText("보이는 것 · 0 / 3")).toBeTruthy();
    await press(r, "찾았어요");
    expect(r.getByLabelText("보이는 것 · 1 / 3")).toBeTruthy();
    await press(r, "찾았어요");
    await press(r, "찾았어요");
    expect(r.getByLabelText("들리는 소리 · 0 / 2")).toBeTruthy();
    expect(r.getByLabelText("들었어요")).toBeTruthy();
  });

  it("바바가 건너가는 동안의 손짓은 세지 않는다 — 버튼이 꺼져 보이지도 않는다", async () => {
    const r = await open();
    await press(r, "시작하기");
    await fireEvent.press(r.getByLabelText("찾았어요"));
    await fireEvent.press(r.getByLabelText("찾았어요"));
    await wait(pondSceneMotion.landing);

    expect(r.getByLabelText("보이는 것 · 1 / 3")).toBeTruthy();
    expect(r.getByLabelText("찾았어요").props.accessibilityState?.disabled).toBeFalsy();
  });

  it("꾸욱은 일찍 떼면 세지 않고, 끝까지 누르면 끝 화면이 뜬다", async () => {
    const r = await open();
    await toFeel(r);

    const pill = await hold(r, pondSceneMotion.hold / 2);
    await fireEvent(pill, "pressOut");
    await wait(pondSceneMotion.landing);
    expect(r.queryByText("잘 찾았어요")).toBeNull();

    await hold(r, pondSceneMotion.hold);
    await wait(pondSceneMotion.landing);
    expect(r.getByText("잘 찾았어요")).toBeTruthy();
  });

  it("낭독기의 활성화 하나가 꾸욱을 대신한다", async () => {
    const r = await open();
    await toFeel(r);
    await fireEvent(r.getByLabelText(HOLD_LABEL), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
    await wait(pondSceneMotion.landing);
    expect(r.getByText("잘 찾았어요")).toBeTruthy();
  });
});

describe("감각연못 · 이용 기록", () => {
  it("시작만 하고 나가면 남기지 않는다", async () => {
    const r = await open();
    await fireEvent.press(r.getByLabelText("시작하기"));
    await leave(r);
    expect(addRestRecord).not.toHaveBeenCalled();
  });

  it("하나라도 찾고 나가면 「중간에 나감」을 남긴다", async () => {
    const r = await open();
    await press(r, "시작하기");
    await press(r, "찾았어요");
    await leave(r);
    expect(addRestRecord).toHaveBeenCalledWith("sense_pond", { completed: false });
  });

  it("끝까지 가서 기분을 고르면 그 값으로 남기고 쉼터 탭으로 돌아간다", async () => {
    const r = await open();
    await toTheEnd(r);
    await fireEvent.press(r.getByLabelText("쉼터로 돌아가기"));
    await wait(1000);
    await fireEvent.press(r.getByLabelText("그대로예요"));
    await wait(1000);
    const leaves = r.getAllByLabelText("쉼터로 돌아가기");
    await fireEvent.press(leaves[leaves.length - 1]!);
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/(tabs)/rest");

    await leave(r);
    expect(addRestRecord).toHaveBeenCalledTimes(1);
    expect(addRestRecord).toHaveBeenCalledWith("sense_pond", { completed: true, mood: "same" });
  });

  it("지난 기록 보기는 감각연못의 기록으로 간다", async () => {
    const r = await open();
    await fireEvent.press(r.getByLabelText("지난 기록 보기"));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/records?content=sense_pond");
  });
});

describe("감각연못 · 계측", () => {
  const calls = () => jest.mocked(track).mock.calls.map(([name, props]) => [name, props]);
  const pondSent = () => calls().filter(([name]) => String(name).startsWith("sense_pond"));
  const restSent = () => calls().filter(([name]) => String(name).startsWith("rest_content"));

  it("세 단계를 마치면 단계마다 한 번씩, 그리고 완료를 한 번 보낸다", async () => {
    const r = await open();
    await toTheEnd(r);
    await leave(r);

    expect(pondSent()).toEqual([
      ["sense_pond_step_completed", expect.objectContaining({ step: "see", hold_cancels: 0 })],
      ["sense_pond_step_completed", expect.objectContaining({ step: "hear", hold_cancels: 0 })],
      ["sense_pond_step_completed", expect.objectContaining({ step: "feel", hold_cancels: 0 })],
      ["sense_pond_finished", { duration_ms: expect.any(Number) }],
    ]);
    expect(restSent()).toEqual([
      ["rest_content_opened", { content: "sense_pond", entry: "direct", diary_today: false }],
      ["rest_content_completed", { content: "sense_pond", duration_ms: expect.any(Number) }],
    ]);
  });

  it("꾸욱을 일찍 떼면 단계 완료에 그 횟수가 실린다", async () => {
    const r = await open();
    await toFeel(r);
    const pill = await hold(r, pondSceneMotion.hold / 2);
    await fireEvent(pill, "pressOut");
    await hold(r, pondSceneMotion.hold);

    expect(pondSent()).toContainEqual([
      "sense_pond_step_completed",
      expect.objectContaining({ step: "feel", hold_cancels: 1 }),
    ]);
  });

  it("중간에 떠나면 그 단계와 찾은 개수 · 나간 자리를 보낸다", async () => {
    const r = await open();
    await press(r, "시작하기");
    await press(r, "찾았어요");
    await leave(r);

    expect(pondSent()).toEqual([
      [
        "sense_pond_exited",
        { step: "see", found: 1, hold_cancels: 0, duration_ms: expect.any(Number) },
      ],
    ]);
    expect(restSent()).toContainEqual([
      "rest_content_exited",
      { content: "sense_pond", stage: "see", duration_ms: expect.any(Number) },
    ]);
  });

  it("시작 화면에서 나가면 나간 자리를 남기지 않는다 — 연 수에서 끝낸 수와 나간 수를 뺀 나머지다", async () => {
    const r = await open();
    await leave(r);
    expect(restSent().map(([name]) => name)).toEqual(["rest_content_opened"]);
  });

  it("시작 화면에 머문 시간은 첫 단계 시간에 들어가지 않는다", async () => {
    const r = await open();
    await wait(60_000);
    await toTheEnd(r);

    const see = pondSent().find(([, props]) => (props as { step?: string })?.step === "see");
    expect((see![1] as { duration_ms: number }).duration_ms).toBeLessThan(60_000);
  });
});

/** 처음 들어간 쉼터의 설명 카드 — 네 쉼터가 같은 `useRestGuide` · `GuideCard` 를 쓴다(2026-10-12) */
describe("감각연못 · 설명 카드", () => {
  const firstVisit = () => jest.mocked(readGuideSeen).mockResolvedValueOnce(false);
  const card = (r: Q) => r.queryByTestId("rest-guide-card");
  const guide = REST_GUIDES.sense_pond;
  const firstAct = guide.pages[0].example!.steps![0]!.act;

  it("처음 들어오면 카드가 저절로 뜨고 「봤음」을 남긴다 — 세 장을 한 장씩 넘긴다", async () => {
    firstVisit();
    const r = await open();

    expect(card(r)).toBeTruthy();
    expect(jest.mocked(markGuideSeen)).toHaveBeenCalledWith("sense_pond");
    // 감각연못은 1장에만 예시 칸이 붙는다
    expect(r.getByText(guide.pages[0].text)).toBeTruthy();
    expect(r.getByText(firstAct)).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    expect(r.getByText(guide.pages[1].text)).toBeTruthy();
    expect(r.queryByText(firstAct)).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    expect(r.getByText(guide.pages[2].text)).toBeTruthy();

    // 처음 뜬 카드는 마지막 장의 「시작할게요」로 닫고, 저절로 뜬 것은 계측하지 않는다
    await fireEvent.press(r.getByRole("button", { name: "시작할게요" }));
    expect(card(r)).toBeNull();
    expect(jest.mocked(track).mock.calls.map(([name]) => name)).not.toContain("rest_guide_opened");
  });

  it("이미 본 쉼터에서는 뜨지 않고, 「?」 원이 같은 카드를 다시 연다 — 그 누름 하나만 보낸다", async () => {
    const r = await open();
    expect(card(r)).toBeNull();
    expect(jest.mocked(markGuideSeen)).not.toHaveBeenCalled();

    await fireEvent.press(r.getByLabelText("설명 보기"));
    expect(card(r)).toBeTruthy();
    expect(jest.mocked(track)).toHaveBeenCalledWith("rest_guide_opened", { content: "sense_pond" });

    expect(r.getByText(guide.pages[0].text)).toBeTruthy();
    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "알겠어요" }));
    expect(card(r)).toBeNull();
  });
});
