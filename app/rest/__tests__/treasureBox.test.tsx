import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import TreasureBoxScreen from "../treasure-box";
import TreasuresScreen from "../treasures";

import { track } from "@/features/analytics";
import { addTreasure, fetchTreasures, type Treasure } from "@/features/rest/data/treasureApi";

import { treasureBoxFinish as F, treasureBoxMotion as M } from "@/design/ds";

/**
 * 오늘의 보물함 — 오늘의 소중한 순간 한 줄을 보물 카드로 만들어 카피바라가 보물함에 넣는다.
 *
 * 여기서 고정하는 것: 적기 전에는 담을 수 없다 · 담으면 쓴 문장 그대로 서버에 보내고 계측에는
 * 길이만 간다 · 연출이 끝나야 끝맺음 판이 서고 「오늘의 보물」에 방금 것이 떠오른다 · 저장이
 * 실패하면 한 줄로 알린다 · 지난 보물은 하루씩 묶여 세지 않고 다시 보여 준다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  isAnalyticsEnabled: true,
  track: jest.fn(),
}));

jest.mock("@/features/rest/data/treasureApi", () => ({
  addTreasure: jest.fn(),
  fetchTreasures: jest.fn(),
}));

const HIDDEN = { includeHiddenElements: true } as const;
const TEXT = "친구에게 먼저 연락했어요.";
const TUCKING = M.fly + M.hop + M.open + M.put + M.close + M.settle;

const treasure = (id: string, content: string, date = "2026-07-27"): Treasure => ({
  id,
  date,
  content,
  createdAt: `${date}T06:00:00Z`,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.mocked(fetchTreasures).mockResolvedValue({ ok: true, data: [] });
  jest.mocked(addTreasure).mockResolvedValue({ ok: true, data: treasure("9", TEXT) });
});

afterEach(() => {
  jest.useRealTimers();
});

const pass = async (ms: number) => {
  for (let t = 0; t < ms; t += 100) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(100, ms - t));
    });
  }
};

type Q = Awaited<ReturnType<typeof render>>;
const cta = (r: Q) => r.getByRole("button", { name: "보물함에 담기" });
const write = (r: Q, text: string) =>
  fireEvent.changeText(r.getByPlaceholderText("혼자서도 용기 내서 해냈어요"), text);

describe("오늘의 보물함", () => {
  it("보물함 소개와 함께 시작하고, 적기 전에는 담을 수 없다 · 100자까지 쓴다", async () => {
    const r = await render(<TreasureBoxScreen />);

    expect(r.getByText("오늘의 보물함")).toBeTruthy();
    expect(r.getByText(/오늘의 소중한 순간과 잘한 일을/)).toBeTruthy();
    expect(r.getByText("오늘의 소중한 순간을 적어보세요")).toBeTruthy();
    expect(cta(r).props.accessibilityState.disabled).toBe(true);

    await write(r, "   ");
    expect(cta(r).props.accessibilityState.disabled).toBe(true);
    await write(r, TEXT);
    expect(cta(r).props.accessibilityState.disabled).toBe(false);
    expect(r.getByPlaceholderText("혼자서도 용기 내서 해냈어요").props.maxLength).toBe(100);
  });

  it("담으면 쓴 문장 그대로 서버에 보내고, 계측에는 길이만 간다 · 카드가 되어 날아간다", async () => {
    const r = await render(<TreasureBoxScreen />);
    await write(r, `  ${TEXT}  `);
    await fireEvent.press(cta(r));

    expect(addTreasure).toHaveBeenCalledWith(TEXT);
    expect(track).toHaveBeenCalledWith("treasure_box_tucked", { chars: TEXT.length });
    expect(JSON.stringify(jest.mocked(track).mock.calls)).not.toContain(TEXT);
    expect(r.getByTestId("treasure-box-card", HIDDEN)).toBeTruthy();
    // 위 안내는 같은 자리에서 옅어졌다 돌아오며 갈아 끼워진다
    await pass(1000);
    expect(r.getByText("보물함에 담고 있어요")).toBeTruthy();
  });

  it("보물함이 열리고 닫힌 뒤에야 끝맺음 판이 서고, 방금 보물이 오늘의 보물에 떠오른다", async () => {
    jest
      .mocked(fetchTreasures)
      .mockResolvedValue({ ok: true, data: [treasure("1", "산책을 다녀왔어요")] });
    const r = await render(<TreasureBoxScreen />);
    await write(r, TEXT);
    await fireEvent.press(cta(r));

    await pass(M.fly + M.hop + 100);
    expect(r.getByTestId("treasure-box-glow", HIDDEN)).toBeTruthy();
    await pass(M.open + M.put);
    expect(r.getByTestId("treasure-box-sparkles", HIDDEN)).toBeTruthy();
    expect(r.queryByText("오늘의 보물")).toBeNull();

    await pass(M.close + M.settle + 400);
    expect(r.getByText(/오늘의 작은 순간 하나를/)).toBeTruthy();
    expect(r.getByText("작은 순간도 소중한 보물이 될 수 있어요")).toBeTruthy();
    expect(r.getByText("오늘의 보물")).toBeTruthy();
    expect(r.getByText("산책을 다녀왔어요")).toBeTruthy();
    expect(r.getByTestId("treasure-fresh-row")).toBeTruthy();
    expect(r.getByText(TEXT)).toBeTruthy();
    expect(r.getByTestId("treasure-box-motes", HIDDEN)).toBeTruthy();

    // 돌아가는 길은 새 줄이 떠오른 뒤에 붙는다
    expect(r.queryByRole("button", { name: "쉼터로 돌아가기" })).toBeNull();
    await pass(F.cta);
    await fireEvent.press(r.getByRole("button", { name: "쉼터로 돌아가기" }));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest");
  });

  it("저장에 실패하면 한 줄로 알리고 방금 것을 목록에 올리지 않는다", async () => {
    jest.mocked(addTreasure).mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<TreasureBoxScreen />);
    await write(r, TEXT);
    await fireEvent.press(cta(r));
    await pass(TUCKING);

    expect(r.getByText("보물을 담지 못했어요. 잠시 뒤에 다시 담아주세요.")).toBeTruthy();
    expect(r.queryByTestId("treasure-fresh-row")).toBeNull();
  });

  it("오른쪽 위 원이 지난 보물로 간다", async () => {
    const r = await render(<TreasureBoxScreen />);
    await fireEvent.press(r.getByRole("button", { name: "지난 보물 모두 보기" }));
    expect(router.push).toHaveBeenCalledWith("/rest/treasures");
  });
});

describe("지난 보물", () => {
  it("하루씩 묶어 최신 날부터 쓴 그대로 보여 준다 — 개수를 세지 않는다", async () => {
    jest.mocked(fetchTreasures).mockResolvedValue({
      ok: true,
      data: [
        treasure("3", "작은 용기를 냈어요", "2026-10-05"),
        treasure("1", "산책을 다녀왔어요", "2026-10-03"),
      ],
    });
    const r = await render(<TreasuresScreen />);
    await act(async () => {});

    expect(fetchTreasures).toHaveBeenCalledWith();
    expect(r.getByText("지난 보물")).toBeTruthy();
    // 화면에 그려진 순서 — 최신 날의 머리와 그 보물이 먼저 온다
    const tree = JSON.stringify(r.toJSON());
    const at = ["10월 5일", "작은 용기를 냈어요", "10월 3일", "산책을 다녀왔어요"].map((o) =>
      tree.indexOf(o),
    );
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(r.queryByText(/개/)).toBeNull();
  });

  it("못 받아 오거나 비었으면 비어 있다고만 말한다", async () => {
    jest.mocked(fetchTreasures).mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<TreasuresScreen />);
    await act(async () => {});
    expect(r.getByText("아직 담은 보물이 없어요")).toBeTruthy();
  });
});
