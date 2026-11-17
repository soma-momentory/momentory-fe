import { NO_OUTFIT } from "../model/types";
import { useWardrobe, wearToggled } from "../model/wardrobe";

const mockApi = {
  fetchWardrobe: jest.fn(),
  checkIn: jest.fn(),
  claimWelcome: jest.fn(),
};
jest.mock("@/features/wardrobe/data/wardrobeApi", () => mockApi);

const wardrobe = (tangerines: number) => ({
  ok: true,
  data: {
    tangerines,
    outfit: NO_OUTFIT,
    items: [],
    todayRewards: [],
    attendanceDay: 1,
    attendanceRewards: [],
    welcomed: false,
  },
});

afterEach(() => {
  useWardrobe.getState().reset();
  jest.resetAllMocks();
});

it("가진 아이템은 눌러 입고, 입은 것을 다시 누르면 벗는다", () => {
  const worn = { ...NO_OUTFIT, hat: "hat-a" };
  expect(wearToggled(worn, "hat", "hat-b").hat).toBe("hat-b");
  expect(wearToggled(worn, "hat", "hat-a").hat).toBeNull();
  expect(wearToggled(worn, "eyes", "eyes-a")).toEqual({ ...worn, eyes: "eyes-a" });
});

it("첫 선물을 받으면 귤이 늘고 선물 단추가 사라진다 — 이미 받았으면 0", async () => {
  useWardrobe.setState({ welcomed: false, tangerines: 10 });
  mockApi.claimWelcome.mockResolvedValueOnce({
    ok: true,
    data: { tangerines: 110, rewards: [{ reason: "WELCOME", amount: 100 }], quiet: false },
  });
  expect(await useWardrobe.getState().welcome()).toBe(100);
  expect(useWardrobe.getState()).toMatchObject({ tangerines: 110, welcomed: true });

  mockApi.claimWelcome.mockResolvedValueOnce({
    ok: true,
    data: { tangerines: 110, rewards: [], quiet: false },
  });
  expect(await useWardrobe.getState().welcome()).toBe(0);
  mockApi.claimWelcome.mockResolvedValueOnce({ ok: false, code: "network" });
  expect(await useWardrobe.getState().welcome()).toBeNull();
});

it("홈 새로고침은 정산을 끝낸 뒤 옷장을 받는다 — 정산 전 잔액이 덮지 않는다", async () => {
  const order: string[] = [];
  mockApi.checkIn.mockImplementation(async () => {
    order.push("checkIn");
    return { ok: true, data: { tangerines: 60, rewards: [], quiet: false } };
  });
  mockApi.fetchWardrobe.mockImplementation(async () => {
    order.push("load");
    return wardrobe(60);
  });
  await useWardrobe.getState().refresh();
  expect(order).toEqual(["checkIn", "load"]);
  expect(useWardrobe.getState().tangerines).toBe(60);
});

it("일기 · 일정 · 편지 · 쉼터 귤은 같은 귤 카드로 알린다", async () => {
  mockApi.fetchWardrobe.mockResolvedValue(wardrobe(40));
  mockApi.checkIn.mockResolvedValueOnce({
    ok: true,
    data: { tangerines: 40, rewards: [{ reason: "LETTER", amount: 10 }], quiet: false },
  });
  await useWardrobe.getState().settle();
  expect(useWardrobe.getState().celebration).toMatchObject({
    amount: 10,
    title: "바바의 편지를 읽었어요",
  });
  useWardrobe.getState().endCelebration();

  mockApi.checkIn.mockResolvedValueOnce({
    ok: true,
    data: { tangerines: 50, rewards: [{ reason: "REST", amount: 10 }], quiet: false },
  });
  await useWardrobe.getState().settle();
  expect(useWardrobe.getState().celebration?.title).toBe("쉼터에 다녀왔어요");
  expect(mockApi.fetchWardrobe).toHaveBeenCalledTimes(2);
  useWardrobe.getState().endCelebration();

  mockApi.checkIn.mockResolvedValueOnce({
    ok: true,
    data: { tangerines: 70, rewards: [{ reason: "DIARY", amount: 30 }], quiet: false },
  });
  await useWardrobe.getState().settle();
  expect(useWardrobe.getState().celebration).toMatchObject({
    amount: 30,
    title: "오늘 일기를 다 썼어요",
  });
});

it("로그아웃 전에 출발한 응답은 버린다", async () => {
  let answer: (v: unknown) => void = () => {};
  mockApi.fetchWardrobe.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const pending = useWardrobe.getState().load();
  useWardrobe.getState().reset();
  answer(wardrobe(999));
  await pending;
  expect(useWardrobe.getState().loaded).toBe(false);
  expect(useWardrobe.getState().tangerines).toBe(0);
});
