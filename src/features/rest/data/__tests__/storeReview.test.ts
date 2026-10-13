import AsyncStorage from "@react-native-async-storage/async-storage";

import { useDiary } from "@/features/diary/model/diary";
import { seedDiaries } from "@/testing/fixtures";

import { maybeRequestStoreReview, postponeStoreReview, reviewDue } from "../storeReview";

const mockReview = { isAvailableAsync: jest.fn(), requestReview: jest.fn() };
jest.mock("expo-store-review", () => mockReview);

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockReview.isAvailableAsync.mockResolvedValue(true);
  mockReview.requestReview.mockResolvedValue(undefined);
  seedDiaries();
});

afterEach(() => jest.useRealTimers());

const ask = async (now = NOW) => {
  const p = maybeRequestStoreReview(now);
  await jest.runAllTimersAsync();
  await p;
};

describe("스토어 별점 요청", () => {
  it("처음이면 묻고, 120일 안에는 다시 묻지 않는다", async () => {
    await ask();
    await ask(NOW + 119 * DAY);
    expect(mockReview.requestReview).toHaveBeenCalledTimes(1);

    await ask(NOW + 120 * DAY);
    expect(mockReview.requestReview).toHaveBeenCalledTimes(2);
  });

  it("일기가 하나도 없으면 묻지 않는다 — 회고를 한 번 이상 마친 사람만", async () => {
    useDiary.setState({ diaries: [] });
    await ask();
    expect(mockReview.requestReview).not.toHaveBeenCalled();
  });

  it("위기 안내가 나온 날은 미뤄 두어 묻지 않는다", async () => {
    await postponeStoreReview(NOW);
    await ask(NOW + DAY);
    expect(mockReview.requestReview).not.toHaveBeenCalled();
  });

  it("스토어 창을 쓸 수 없는 기기면 묻지도 기록하지도 않는다", async () => {
    mockReview.isAvailableAsync.mockResolvedValue(false);
    await ask();
    expect(mockReview.requestReview).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem("momentory.store-review")).toBeNull();
  });

  it("읽을 수 없는 기록이면 묻지 않는다", () => {
    expect(reviewDue("garbage", NOW)).toBe(false);
    expect(reviewDue(null, NOW)).toBe(true);
  });
});
