import { clearGuideMemory, markGuideSeen, readGuideSeen } from "../data/guideMemory";

/**
 * 쉼터 설명 카드의 기기 기억 (2026-10-12) — 쉼터마다 「봤음」을 따로 남기고, 로그아웃 때 지운다.
 * 화면 쪽(저절로 뜨기 · 「?」 원 · 감각연못 소개 시계)은 `app/rest/__tests__/sensePond.test.tsx` 「설명 카드」.
 */
describe("쉼터 설명 카드의 기억", () => {
  it("쉼터마다 따로 남고, 지우면 처음으로 돌아간다", async () => {
    await clearGuideMemory();
    await expect(readGuideSeen("worry_box")).resolves.toBe(false);

    await markGuideSeen("worry_box");
    await markGuideSeen("worry_box");
    await expect(readGuideSeen("worry_box")).resolves.toBe(true);
    await expect(readGuideSeen("sense_pond")).resolves.toBe(false);

    await clearGuideMemory();
    await expect(readGuideSeen("worry_box")).resolves.toBe(false);
  });

  it("AsyncStorage 가 없는 옛 빌드에서도 던지지 않는다 — 못 읽으면 띄우지 않는 쪽으로 닫힌다", async () => {
    // 앞 테스트가 이미 불러 둔 저장소를 비운다 — 쓸 때 부르는 `require` 가 아래의 없는 모듈을 만나게
    jest.resetModules();
    jest.doMock("@react-native-async-storage/async-storage", () => {
      throw new Error("[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.");
    });
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const memory = require("../data/guideMemory") as typeof import("../data/guideMemory");

    await expect(memory.readGuideSeen("sense_pond")).resolves.toBeNull();
    await expect(memory.markGuideSeen("sense_pond")).resolves.toBeUndefined();
    await expect(memory.clearGuideMemory()).resolves.toBeUndefined();
  });
});
