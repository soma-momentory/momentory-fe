import { render, fireEvent } from "@testing-library/react-native";

import theme from "@/design/theme";

import { BackChevron } from "../BackChevron";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe("BackChevron", () => {
  it("탭하면 호출자 핸들러가 돈다", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<BackChevron onPress={onPress} />);

    await fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("작은 글리프는 hitSlop 으로 44pt 를 확보한다", async () => {
    // 시각 크기를 키우지 않는다 — RULES 「터치·접근성」
    const { getByRole } = await render(<BackChevron />);
    const box = flatten(getByRole("button").props.style);
    const slop = getByRole("button").props.hitSlop;

    expect(slop).toEqual(theme.touch.hitSlopForSmallGlyph);
    expect(Number(box.width) + slop.left + slop.right).toBeGreaterThanOrEqual(
      theme.touch.minTarget,
    );
    expect(Number(box.height) + slop.top + slop.bottom).toBeGreaterThanOrEqual(
      theme.touch.minTarget,
    );
  });

  it("hidden 이면 자리를 남기고 그리지 않는다", async () => {
    // 자리를 비우면 진행점 y 가 흔들린다 (TASKS.md M1-3)
    const shown = await render(<BackChevron />);
    const hiddenView = await render(<BackChevron hidden />);

    expect(hiddenView.queryByRole("button")).toBeNull();
    expect(hiddenView.queryByText("‹")).toBeNull();

    const size = (r: typeof shown) => {
      const s = flatten(r.toJSON()?.props?.style);
      return [s.width, s.height];
    };
    expect(size(hiddenView)).toEqual(size(shown));
  });

  it("보조기술에 '뒤로' 로 읽힌다 — 글리프가 아니라", async () => {
    const { getByRole } = await render(<BackChevron />);

    expect(getByRole("button").props.accessibilityLabel).toBe("뒤로");
  });
});
