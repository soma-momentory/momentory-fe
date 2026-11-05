import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearThreeDayHint, takeThreeDayHint } from "@/features/report/data/hintMemory";

describe("3일 안내 기억", () => {
  beforeEach(() => AsyncStorage.clear());

  it("처음 두 주만 보이고, 본 주는 다시 열어도 보인다", async () => {
    await expect(takeThreeDayHint("2026-10-11")).resolves.toBe(true);
    await expect(takeThreeDayHint("2026-10-18")).resolves.toBe(true);
    await expect(takeThreeDayHint("2026-10-25")).resolves.toBe(false);
    await expect(takeThreeDayHint("2026-10-11")).resolves.toBe(true);
  });

  it("로그아웃하면 다시 처음부터다", async () => {
    await takeThreeDayHint("2026-10-11");
    await takeThreeDayHint("2026-10-18");
    await clearThreeDayHint();
    await expect(takeThreeDayHint("2026-10-25")).resolves.toBe(true);
  });

  it("저장소가 깨져 있으면 보여 주지 않는다", async () => {
    await AsyncStorage.setItem("momentory.report.threeDayHintWeeks", "{깨짐");
    await expect(takeThreeDayHint("2026-10-25")).resolves.toBe(false);
  });
});
