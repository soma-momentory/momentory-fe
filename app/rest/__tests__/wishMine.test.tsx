import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { fetchMyWishes } from "@/features/rest/data/wishApi";

import WishMineScreen from "../wish-mine";

jest.mock("@/features/rest/data/wishApi", () => ({
  fetchMyWishes: jest.fn(),
  deleteWish: jest.fn(),
  answerWish: jest.fn(),
}));
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const open = async (data: Awaited<ReturnType<typeof fetchMyWishes>>) => {
  jest.mocked(fetchMyWishes).mockResolvedValue(data);
  const r = await render(<WishMineScreen />);
  await act(async () => {
    await Promise.resolve();
  });
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe("내 소원", () => {
  it("현재 떠 있는 소원을 보여 주고, 같이 빈 사람이 없으면 남은 날만 말한다", async () => {
    const r = await open({
      ok: true,
      data: {
        postedToday: true,
        floating: [{ id: 1, content: "일찍 자고 싶어요", daysLeft: 7, joinedByOthers: false }],
        past: [],
      },
    });
    expect(r.getByText("현재 떠 있는 소원")).toBeTruthy();
    expect(r.getByText("7일 남음")).toBeTruthy();
    expect(r.queryByText(/바바가/)).toBeNull();
  });

  it("같이 빈 사람이 있으면 함께 말한다", async () => {
    const r = await open({
      ok: true,
      data: {
        postedToday: true,
        floating: [{ id: 1, content: "일찍 자고 싶어요", daysLeft: 3, joinedByOthers: true }],
        past: [],
      },
    });
    expect(r.getByText("누군가 같이 빌었어요 · 3일 남음")).toBeTruthy();
  });

  it("오늘 몫을 썼으면 비어 있어도 쓰기 버튼이 꺼진다", async () => {
    const r = await open({ ok: true, data: { postedToday: true, floating: [], past: [] } });
    await fireEvent.press(
      r.getByRole("button", { name: "소원 연꽃은 하루에 한 번만 띄울 수 있어요" }),
    );
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
  });

  it("오늘 몫이 남았으면 연못으로 돌아가 쓰기를 연다", async () => {
    const r = await open({ ok: true, data: { postedToday: false, floating: [], past: [] } });
    await fireEvent.press(r.getByRole("button", { name: "내 소원 빌기" }));
    expect(jest.mocked(router.back)).toHaveBeenCalledTimes(1);
  });
});
