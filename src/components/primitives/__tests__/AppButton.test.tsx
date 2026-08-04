import { AccessibilityInfo, Animated } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import theme from "@/design/theme";
import { fill } from "@/design/tokens.mvp";

import { AppButton, type ButtonVariant } from "../AppButton";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe("AppButton", () => {
  it("탭 대상이 44pt 이상이다", async () => {
    // RULES.md 「접근성」 — 탭 대상 44pt 이상. 주 버튼은 54.
    const { getByRole } = await render(<AppButton label="시작하기" />);

    expect(flatten(getByRole("button").props.style).height).toBe(theme.touch.buttonHeight);
    expect(theme.touch.buttonHeight).toBeGreaterThanOrEqual(theme.touch.minTarget);
  });

  it("누르면 색이 바뀐다 — 스케일이 없어도 피드백이 남는다", async () => {
    const { getByRole } = await render(<AppButton label="시작하기" />);
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(fill.primaryDeep);

    await fireEvent(getByRole("button"), "pressIn");
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(fill.primaryDeepPress);
  });

  it("Reduce Motion 이면 스케일을 쓰지 않는다", async () => {
    // theme.motion.reduceMotion — 이동·스케일·루프를 끄고 색·opacity 만 남긴다.
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const timing = jest.spyOn(Animated, "timing");

    const { getByRole } = await render(<AppButton label="시작하기" />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await fireEvent(getByRole("button"), "pressIn");

    expect(timing).not.toHaveBeenCalled();
    // 색은 여전히 바뀌어야 한다 — 피드백이 통째로 사라지면 안 된다
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(fill.primaryDeepPress);

    timing.mockRestore();
  });

  it("동작 줄이기가 꺼져 있으면 스케일을 쓴다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const timing = jest.spyOn(Animated, "timing");

    const { getByRole } = await render(<AppButton label="시작하기" />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await fireEvent(getByRole("button"), "pressIn");

    expect(timing).toHaveBeenCalled();
    expect(timing.mock.calls[0]?.[1]).toMatchObject({
      toValue: theme.motion.spec.press.scale,
      duration: theme.motion.spec.press.duration,
    });

    timing.mockRestore();
  });

  it("비활성은 흐리게만 한다 — 경고색을 쓰지 않는다", async () => {
    // RULES 4 — 오류·거부는 한 줄 안내로 흡수. 모달·경고 아이콘·경고색 금지.
    const { getByRole } = await render(<AppButton label="다음" disabled />);
    const btn = getByRole("button");

    expect(flatten(btn.props.style).opacity).toBe(0.75);
    expect(btn.props.accessibilityState.disabled).toBe(true);
  });

  // S1.md — 카카오 #FEE500 · Apple #1A1A1A · Google card+테두리.
  // 브랜드 색은 고정이라 팔레트 규칙의 예외다.
  const brands: [ButtonVariant, string][] = [
    ["kakao", theme.colors.semantic.kakao],
    ["apple", theme.colors.semantic.apple],
    ["google", theme.colors.semantic.surface],
  ];

  it.each(brands)("%s 는 브랜드 색을 쓴다", async (variant, expected) => {
    const { getByRole } = await render(<AppButton label={variant} variant={variant} />);
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(expected);
  });

  it("google 만 테두리를 갖는다 — 세 버튼의 무게를 맞추기 위해", async () => {
    const { getByRole } = await render(<AppButton label="구글로 시작하기" variant="google" />);
    expect(flatten(getByRole("button").props.style).borderWidth).toBe(1.5);
  });
});
