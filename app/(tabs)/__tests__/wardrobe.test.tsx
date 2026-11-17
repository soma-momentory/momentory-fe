import { fireEvent, render } from "@testing-library/react-native";

import Wardrobe from "../wardrobe";

import { NO_OUTFIT, type WardrobeItem } from "@/features/wardrobe/model/types";
import { useWardrobe } from "@/features/wardrobe/model/wardrobe";

jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return {
    router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
    // 탭 화면은 보일 때마다 옷장을 다시 받는다 — 테스트에서는 그려질 때 한 번
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});
const mockApi = {
  // 화면이 열릴 때 부르는 조회는 아무것도 바꾸지 않는다 — 상태는 테스트가 넣는다
  fetchWardrobe: jest.fn(() => new Promise(() => {})),
  wearOutfit: jest.fn(async (outfit: unknown) => ({ ok: true, data: outfit })),
  claimWelcome: jest.fn(async () => ({
    ok: true,
    data: { tangerines: 200, rewards: [{ reason: "WELCOME", amount: 100 }], quiet: false },
  })),
};
jest.mock("@/features/wardrobe/data/wardrobeApi", () => mockApi);

const items: WardrobeItem[] = [
  { id: "hat-purple-beanie", slot: "hat", tier: "FREE", price: 0, owned: true },
  { id: "hat-bucket", slot: "hat", tier: "TANGERINE", price: 250, owned: false },
];

const open = (outfit = NO_OUTFIT, tangerines = 100) => {
  useWardrobe.setState({
    loaded: true,
    failed: false,
    tangerines,
    outfit,
    items,
    todayRewards: [],
    attendanceDay: 1,
    attendanceRewards: [10, 10, 20, 20, 30, 40, 50],
  });
  return render(<Wardrobe />);
};

beforeEach(() => mockApi.wearOutfit.mockClear());
afterEach(() => useWardrobe.getState().reset());

it("가진 모자는 누르면 바로 입고, 다시 누르면 벗는다", async () => {
  const r = await open();
  await fireEvent.press(r.getByTestId("wardrobe-item-hat-purple-beanie"));
  expect(useWardrobe.getState().outfit.hat).toBe("hat-purple-beanie");
  expect(r.getByLabelText("보라 털모자, 착용 중")).toBeTruthy();

  await fireEvent.press(r.getByTestId("wardrobe-item-hat-purple-beanie"));
  expect(useWardrobe.getState().outfit.hat).toBeNull();
});

it("안 가진 모자는 입히지 않고 사기 팝업을 띄운다 — 닫으면 입던 그대로다", async () => {
  const r = await open({ ...NO_OUTFIT, hat: "hat-purple-beanie" }, 300);
  await fireEvent.press(r.getByTestId("wardrobe-item-hat-bucket"));
  expect(r.getByTestId("purchase-popup")).toBeTruthy();
  expect(r.getByLabelText("잠금 해제, 귤 250개").props.accessibilityState?.disabled).toBe(false);
  expect(useWardrobe.getState().outfit.hat).toBe("hat-purple-beanie");
  expect(mockApi.wearOutfit).not.toHaveBeenCalled();
});

it("귤이 모자라면 잠금 해제를 끄고 귤 모으는 곳을 안내한다", async () => {
  const r = await open(NO_OUTFIT, 100);
  await fireEvent.press(r.getByTestId("wardrobe-item-hat-bucket"));
  expect(r.getByLabelText("잠금 해제, 귤 250개").props.accessibilityState?.disabled).toBe(true);
  expect(r.getByText("귤이 모자라요")).toBeTruthy();

  await fireEvent.press(r.getByRole("button", { name: "귤 모으러 가기" }));
  expect(r.queryByTestId("purchase-popup")).toBeNull();
  expect(r.getByTestId("tangerine-missions")).toBeTruthy();
});

it("첫 선물을 안 받았으면 옷장을 열자마자 선물 팝업이 뜨고, 받으면 귤이 오른다", async () => {
  useWardrobe.setState({ welcomed: false });
  const r = await open();
  expect(r.getByTestId("welcome-popup")).toBeTruthy();
  await fireEvent.press(r.getByRole("button", { name: "받기" }));
  expect(r.queryByTestId("welcome-popup")).toBeNull();
  expect(useWardrobe.getState()).toMatchObject({ tangerines: 200, welcomed: true });
});

it("받은 사람에게는 선물 팝업이 뜨지 않는다", async () => {
  const r = await open();
  expect(r.queryByTestId("welcome-popup")).toBeNull();
});

it("칸 셋과 틈 둘이 목록 폭을 꼭 채운다 — 왼쪽으로 쏠리지 않는다", async () => {
  const r = await open();
  await fireEvent(r.getByTestId("wardrobe-list"), "layout", {
    nativeEvent: { layout: { width: 344, height: 600 } },
  });
  const width = (cellStyle: unknown) =>
    ([cellStyle].flat(3) as { width?: number }[]).reduce<number | undefined>(
      (w, s) => s?.width ?? w,
      undefined,
    );
  expect(width(r.getByTestId("wardrobe-item-hat-bucket").props.style)).toBe((344 - 8 * 2) / 3);
});

it("옷장을 받기 전에는 귤 수를 보이지 않고, 못 받으면 한 줄로 알린다", async () => {
  useWardrobe.setState({ loaded: false, failed: true });
  const r = await render(<Wardrobe />);
  expect(r.queryByTestId("tangerine-chip")).toBeNull();
  expect(r.getByText("옷장을 불러오지 못했어요")).toBeTruthy();
});
