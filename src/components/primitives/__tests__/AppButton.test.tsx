import { AccessibilityInfo, Animated, StyleSheet } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import theme from "@/design/theme";
import { fill } from "@/design/tokens.mvp";

import { AppButton, type ButtonVariant } from "../AppButton";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const sheet = StyleSheet.create({
  gap: { marginTop: 12 },
  wide: { paddingHorizontal: 40 },
});

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
    // theme.motion.reduceMotion — 이동·스케일·루프를 끄고 opacity 만 남긴다.
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const timing = jest.spyOn(Animated, "timing");

    const { getByRole } = await render(<AppButton label="시작하기" />);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());
    await fireEvent(getByRole("button"), "pressIn");

    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 0.88,
        duration: theme.motion.reduceMotion.duration,
      }),
    );
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(fill.primaryDeep);

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

  it("loading은 버튼을 잠그고 진행점을 표시한다", async () => {
    const { getByRole, getByText, getByTestId } = await render(<AppButton label="로그인 중" loading />);

    expect(getByRole("button").props.accessibilityState).toMatchObject({
      disabled: true,
      busy: true,
    });
    expect(getByText("로그인 중")).toBeTruthy();
    expect(getByTestId("button-progress", { includeHiddenElements: true }).children).toHaveLength(3);
  });

  // 호출자 props 를 rest 로 마지막에 펼치면 accessibilityState 가 통째로 교체된다.
  // 아래 둘이 그걸 잡는다 — 유실되는 것은 `busy` 와 호출자 자신의 상태다.
  it("호출자 accessibilityState 를 살리면서 loading 잠금은 지킨다", async () => {
    const { getByRole } = await render(
      <AppButton label="불러오는 중" loading accessibilityState={{ expanded: false }} />,
    );

    expect(getByRole("button").props.accessibilityState).toMatchObject({
      expanded: false,
      disabled: true,
      busy: true,
    });
  });

  // 이건 병합 순서와 무관하게 Pressable 이 disabled prop 으로 다시 덮어써서 지켜진다.
  // 그래도 남겨 둔다 — 우리가 의존하는 RN 동작이라 바뀌면 여기서 알아야 한다.
  it("호출자가 disabled 를 뒤집어도 잠금이 풀리지 않는다", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <AppButton label="다음" disabled accessibilityState={{ disabled: false }} onPress={onPress} />,
    );
    const btn = getByRole("button");

    expect(btn.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(btn);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("잠기지 않은 버튼은 호출자 상태를 그대로 통과시킨다", async () => {
    const { getByRole } = await render(
      <AppButton label="펼치기" accessibilityState={{ expanded: true }} />,
    );

    expect(getByRole("button").props.accessibilityState).toMatchObject({
      expanded: true,
      disabled: false,
      busy: false,
    });
  });

  it("호출자가 준 press 콜백과 내부 피드백을 함께 실행한다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const timing = jest.spyOn(Animated, "timing");
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    const { getByRole } = await render(
      <AppButton label="시작하기" onPressIn={onPressIn} onPressOut={onPressOut} />,
    );
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());

    await fireEvent(getByRole("button"), "pressIn");
    await fireEvent(getByRole("button"), "pressOut");

    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(onPressOut).toHaveBeenCalledTimes(1);
    expect(timing).toHaveBeenCalledTimes(2);
    timing.mockRestore();
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

  // style 을 ViewStyle 로 좁히면 Pressable 이 받는 값을 우리만 거부한다.
  // 컴파일이 곧 검증이다 — 타입이 좁아지면 typecheck 에서 먼저 깨진다.
  it("배열·조건부 스타일을 받는다", async () => {
    const wide = false;
    const { getByRole } = await render(
      <AppButton label="시작하기" style={[sheet.gap, wide && sheet.wide, null]} />,
    );

    const s = flatten(getByRole("button").props.style);
    expect(s.marginTop).toBe(12); //           배열 안의 값이 닿는다
    expect(s.paddingHorizontal).toBe(16); //   조건이 거짓이라 기본값이 남는다
    expect(s.height).toBe(theme.touch.buttonHeight);
  });

  it("google 만 테두리를 갖는다 — 세 버튼의 무게를 맞추기 위해", async () => {
    const { getByRole } = await render(<AppButton label="구글로 시작하기" variant="google" />);
    expect(flatten(getByRole("button").props.style).borderWidth).toBe(1.5);
  });
});
