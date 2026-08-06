import { AccessibilityInfo, Animated } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import theme from "@/design/theme";

import { AnswerBubble } from "../AnswerBubble";
import { BabaBubble } from "../BabaBubble";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

// 값은 MVP 정본 `momentory.css` 를 그대로 적는다 — 토큰을 참조하면 토큰이 틀렸을 때
// 같이 틀린 채 통과한다.
//
//   .bub  {border:1px solid rgba(36,31,25,.1);border-radius:20px 20px 20px 6px;padding:14px 17px}
//   .bubme{background:#241F19;border-radius:20px 20px 6px 20px;padding:12px 16px}
describe("BabaBubble", () => {
  it("꼬리가 왼쪽 아래다 — 말하는 쪽을 가리킨다", async () => {
    const { getByText } = await render(<BabaBubble>어떻게 불러드리면 좋을까요?</BabaBubble>);
    const s = flatten(getByText("어떻게 불러드리면 좋을까요?").parent?.props.style);

    expect(s.borderTopLeftRadius).toBe(20);
    expect(s.borderTopRightRadius).toBe(20);
    expect(s.borderBottomRightRadius).toBe(20);
    expect(s.borderBottomLeftRadius).toBe(6);
  });

  it("테두리가 있다 — COMPONENTS.md 의 '테두리 없음' 은 원본이다", async () => {
    const { getByText } = await render(<BabaBubble>안녕</BabaBubble>);
    const s = flatten(getByText("안녕").parent?.props.style);

    expect(s.borderWidth).toBe(1);
    expect(s.borderColor).toBe(`${theme.colors.semantic.textPrimary}1A`); // ink 10%
    expect(s.backgroundColor).toBe(theme.colors.semantic.surface);
  });

  it("왼쪽에 붙고 290 을 넘지 않는다", async () => {
    const { getByText } = await render(<BabaBubble>안녕</BabaBubble>);
    const s = flatten(getByText("안녕").parent?.props.style);

    expect(s.alignSelf).toBe("flex-start");
    expect(s.maxWidth).toBe(290);
    expect(s.paddingVertical).toBe(14);
    expect(s.paddingHorizontal).toBe(17);
  });

  it("연속 등장은 index 만큼 90ms 씩 밀린다", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(false);
    const timing = jest.spyOn(Animated, "timing");

    await render(<BabaBubble index={2}>세 번째</BabaBubble>);
    await waitFor(() => expect(timing).toHaveBeenCalled());

    expect(timing.mock.calls[0]?.[1]).toMatchObject({
      duration: theme.motion.spec.bubble.duration, // 220
      delay: 2 * theme.motion.spec.bubble.stagger, // 180
    });
    timing.mockRestore();
  });

  it("Reduce Motion 이면 이동 없이 나타난다", async () => {
    // 이동·스케일을 끄고 opacity 만 120ms (theme.motion.reduceMotion)
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const timing = jest.spyOn(Animated, "timing");

    const { getByText } = await render(<BabaBubble index={3}>안녕</BabaBubble>);
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled());

    await waitFor(() =>
      expect(timing).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ duration: theme.motion.reduceMotion.duration, delay: 0 }),
      ),
    );
    // 스태거도 없앤다 — 기다림 자체가 움직임처럼 읽힌다
    expect(flatten(getByText("안녕").parent?.props.style).transform).toEqual([]);
    timing.mockRestore();
  });
});

describe("AnswerBubble", () => {
  it("꼬리가 오른쪽 아래다 — 바바 풍선과 마주 본다", async () => {
    const { getByText } = await render(<AnswerBubble>지현</AnswerBubble>);
    const s = flatten(getByText("지현").parent?.props.style);

    expect(s.borderTopLeftRadius).toBe(20);
    expect(s.borderBottomRightRadius).toBe(6);
    expect(s.borderBottomLeftRadius).toBe(20);
    expect(s.alignSelf).toBe("flex-end");
  });

  it("면은 잉크색이고 글자는 onDark 다", async () => {
    const { getByText } = await render(<AnswerBubble>지현</AnswerBubble>);
    const bubble = flatten(getByText("지현").parent?.props.style);

    expect(bubble.backgroundColor).toBe(theme.colors.semantic.textPrimary); // #241F19
    expect(flatten(getByText("지현").props.style).color).toBe(theme.colors.semantic.textOnDark);
  });

  it("답하지 않은 것도 버블로 남는다", async () => {
    // RULES — "알려주고 싶지 않아요" 도 하나의 답이다. 빈 상태를 위한 변형을 두지 않는다.
    const { getByText } = await render(<AnswerBubble>알려주고 싶지 않아요</AnswerBubble>);

    expect(getByText("알려주고 싶지 않아요")).toBeTruthy();
  });
});
