import {
  clearWeatherIntroMemory,
  markWeatherIntroSeen,
  readWeatherIntroSeen,
} from "@/features/home/data/weatherIntroMemory";
import { storage } from "@/features/rest/data/deviceStorage";

/**
 * 홈 날씨 첫 안내(HW-3)의 기기 기억 — 사용자별 격리(`UX_STRUCTURE.md` A-11 · V-10 · 계획 MF-4).
 * 「userId 를 모르면 읽지도 쓰지도 않는다」는 훅의 일이라 `useHomeWeather.test.tsx` 가 본다.
 */
const A = 101;
const B = 202;

beforeEach(async () => {
  jest.restoreAllMocks();
  await storage().clear();
});

it("키에 userId 가 들어간다", async () => {
  await markWeatherIntroSeen(A);
  expect(await storage().getItem(`home.weatherIntro.v1.${A}`)).not.toBeNull();
  expect(await storage().getItem(`home.weatherIntro.v1.${B}`)).toBeNull();
});

it("A 가 본 뒤 같은 기기의 B 는 첫 안내를 받는다 · A 는 다시 들어와도 되풀이되지 않는다", async () => {
  await expect(readWeatherIntroSeen(A)).resolves.toBe(false);
  await markWeatherIntroSeen(A);
  await expect(readWeatherIntroSeen(B)).resolves.toBe(false);
  // 로그아웃은 지우지 않는다 — 이 모듈에 로그아웃 경로가 없다
  await expect(readWeatherIntroSeen(A)).resolves.toBe(true);
});

it("A 의 기록을 지우면 A 만 처음으로 — B 의 기록은 남는다", async () => {
  await markWeatherIntroSeen(A);
  await markWeatherIntroSeen(B);
  await clearWeatherIntroMemory(A);
  await expect(readWeatherIntroSeen(A)).resolves.toBe(false);
  await expect(readWeatherIntroSeen(B)).resolves.toBe(true);
});

it("못 읽으면 「봤다」로 닫는다 · 쓰기 · 지우기가 실패해도 던지지 않는다", async () => {
  const s = storage();
  jest.spyOn(s, "getItem").mockRejectedValue(new Error("disk"));
  jest.spyOn(s, "setItem").mockRejectedValue(new Error("disk"));
  jest.spyOn(s, "removeItem").mockRejectedValue(new Error("disk"));
  await expect(readWeatherIntroSeen(A)).resolves.toBe(true);
  await expect(markWeatherIntroSeen(A)).resolves.toBeUndefined();
  await expect(clearWeatherIntroMemory(A)).resolves.toBeUndefined();
});

it("AsyncStorage 가 없는 옛 빌드에서도 던지지 않는다 — 못 읽으면 「봤다」", async () => {
  jest.resetModules();
  jest.doMock("@react-native-async-storage/async-storage", () => {
    throw new Error("[@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.");
  });
  type Memory = typeof import("../data/weatherIntroMemory");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const memory = require("../data/weatherIntroMemory") as Memory;
  await expect(memory.readWeatherIntroSeen(A)).resolves.toBe(true);
  await expect(memory.markWeatherIntroSeen(A)).resolves.toBeUndefined();
  await expect(memory.clearWeatherIntroMemory(A)).resolves.toBeUndefined();
  jest.dontMock("@react-native-async-storage/async-storage");
});
