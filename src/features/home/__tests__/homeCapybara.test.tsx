import { act, fireEvent, render, type RenderResult } from "@testing-library/react-native";

import { HomeCapybara } from "../ui/HomeCapybara";

/**
 * 카피바라는 **낭독기에서 숨겨져 있다** — 눌러도 얻는 것이 없어서다. 그래서 기본
 * 조회로는 잡히지 않고 `includeHiddenElements` 로 찾는다(감각연못과 같은 관례).
 */
const at = (r: RenderResult, id: string) => r.getByTestId(id, { includeHiddenElements: true });

/** 그 장에 걸린 스타일 — 두 장 다 붙어 있고 `opacity` 만 오간다 */
const styleOf = (r: RenderResult, id: string) =>
  (at(r, id).props.style as ({ opacity?: number; width?: number; height?: number } | undefined)[])
    .flat()
    .filter((s) => s != null);

/** 그 장이 지금 보이나 */
const shown = (r: RenderResult, id: string) =>
  styleOf(r, id).find((s) => s.opacity != null)?.opacity === 1;

/**
 * ⚠ **누르기와 시계 넘기기는 서로 다른 `act` 여야 한다.** 효과는 `act` 가 끝날 때
 * 흐르므로, 같은 블록 안에서 시계를 넘기면 **타이머가 아직 걸리지도 않았다.**
 */
const press = async (r: RenderResult) => {
  await act(async () => {
    fireEvent.press(at(r, "home-capybara"));
  });
};

const tick = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

/**
 * 홈 카드의 카피바라. **손 흔들기 말고는 아무 일도 하지 않는다**는 것이 이 컴포넌트의
 * 전부라, 지킬 것도 그만큼 좁다.
 *
 * 1. **두 장 다 처음부터 붙어 있다.** 누를 때 붙이면 아직 안 그려 본 그림이라
 *    **첫 손짓이 한 번 깜빡인다**(2026-09-10 · 실기기에서 드러났다).
 * 2. **누르면 장이 갈린다.** 두 장을 오가는 것이 손짓의 **전부다** — 코드가 보태는
 *    움직임이 없으므로 여기서 보는 것이 화면에서 보는 것과 같다.
 * 3. **한 번 갈렸다가 돌아오고 끝난다.** 오르내리기를 되풀이하지 않는다 — 끝을
 *    **타이머**가 말하므로 여기서 잴 수 있다(`SurfaceRipple` 과 같은 구조).
 * 4. **찌그러지지 않는다.** 폭만 받고 높이는 그림의 비율이 정한다.
 */
describe("HomeCapybara", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("두 장 다 처음부터 붙어 있다 — 첫 손짓이 깜빡이지 않게", async () => {
    const r = await render(<HomeCapybara />);

    // 누르기 전인데도 손 흔드는 장이 트리에 있다 — 보이지만 않을 뿐이다
    expect(at(r, "home-capybara-wave")).toBeTruthy();
    expect(shown(r, "home-capybara-idle")).toBe(true);
    expect(shown(r, "home-capybara-wave")).toBe(false);
  });

  it("누르면 팔을 든 장으로 갈린다", async () => {
    const r = await render(<HomeCapybara />);

    await press(r);
    await tick(1);

    expect(shown(r, "home-capybara-wave")).toBe(true);
    expect(shown(r, "home-capybara-idle")).toBe(false);
  });

  it("한 번 갈렸다가 팔을 내린 장으로 돌아오고 끝난다", async () => {
    const r = await render(<HomeCapybara />);

    await press(r);
    await tick(1);
    expect(shown(r, "home-capybara-wave")).toBe(true);

    // 팔을 든 채로 420ms · 넉넉히 지나 보낸다
    await tick(2000);
    expect(shown(r, "home-capybara-idle")).toBe(true);

    // ⚠ **다시 올라오지 않는다** — 되풀이하면 인사보다 부산스럽게 보인다
    await tick(2000);
    expect(shown(r, "home-capybara-idle")).toBe(true);
  });

  it("폭만 받고 높이는 그림의 비율이 정한다 — 늘어나지 않는다", async () => {
    const r = await render(<HomeCapybara width={112} />);

    const box = styleOf(r, "home-capybara-idle").find((s) => s.width != null);

    expect(box?.width).toBe(112);
    // 두 장이 같은 상자에서 잘려 384 × 389 다(발밑 그림자를 품은 상자)
    expect(box?.height).toBeCloseTo(112 / (384 / 389), 3);
  });
});
