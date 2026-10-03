import { act, render, type RenderResult } from "@testing-library/react-native";
import { AccessibilityInfo } from "react-native";

import { babaBlink } from "@/design/ds";

import { RetroBabaPeek } from "../ui/RetroBabaPeek";

/** 바바는 낭독기에서 숨겨져 있다 — 기본 조회로는 잡히지 않는다(`homeCapybara.test` 와 같은 관례) */
const blinkLayer = (r: RenderResult) =>
  r.getByTestId("retro-baba-peek-blink", { includeHiddenElements: true });

/** 감은 장이 지금 보이나 — 두 장이 다 붙어 있고 `opacity` 만 오간다 */
const eyesClosed = (r: RenderResult) =>
  (blinkLayer(r).props.style as ({ opacity?: number } | undefined)[])
    .flat()
    .find((s) => s?.opacity != null)?.opacity === 1;

const tick = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

/**
 * 입력창 위로 고개 내민 바바의 **깜빡임** — 몇 초에 한 번 잠깐 감았다 뜨고, 동작 줄이기를 켠
 * 기기에서는 깜빡이지 않는다.
 */
describe("RetroBabaPeek", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // 흔들림 0 · 두 번 깜빡임 없음 — 간격이 `interval` 그대로다
    jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("몇 초에 한 번 잠깐 눈을 감았다 뜬다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const r = await render(<RetroBabaPeek />);

    expect(eyesClosed(r)).toBe(false);

    await tick(babaBlink.interval);
    expect(eyesClosed(r)).toBe(true);

    await tick(babaBlink.closed);
    expect(eyesClosed(r)).toBe(false);

    // 다음 깜빡임도 온다 — 한 번으로 끝나지 않는다
    await tick(babaBlink.interval);
    expect(eyesClosed(r)).toBe(true);
  });

  it("동작 줄이기를 켰으면 깜빡이지 않는다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const r = await render(<RetroBabaPeek />);

    await tick(babaBlink.interval * 3);
    expect(eyesClosed(r)).toBe(false);
  });
});
