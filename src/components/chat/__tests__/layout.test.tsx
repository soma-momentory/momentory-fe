import { AccessibilityInfo, Animated, Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import theme from "@/design/theme";

import { Avatar } from "../Avatar";
import { ChatLayout } from "../ChatLayout";
import { TypingDots } from "../TypingDots";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

// .conv{flex:1;gap:11px} + .convTop{justify-content:flex-start;padding-top:8px;overflow-y:auto}
describe("ChatLayout", () => {
  it("상단 정렬 스택이고 넘치면 대화 영역만 스크롤된다", async () => {
    // v2 가 하단 고정을 뒤집었다 — 아래로 몰면 키보드가 바바의 말을 가린다 (04.md)
    const { getByTestId } = await render(
      <ChatLayout testID="conv">
        <Text>안녕</Text>
      </ChatLayout>,
    );
    const conv = getByTestId("conv");
    const content = flatten(conv.props.contentContainerStyle);

    expect(content.justifyContent).toBe("flex-start"); // 위에서부터 쌓는다
    expect(content.gap).toBe(11);
    expect(content.paddingTop).toBe(8);
    expect(flatten(conv.props.style).flex).toBe(1);
  });

  it("자식을 그대로 쌓는다", async () => {
    const { getByText } = await render(
      <ChatLayout>
        <Text>첫 질문</Text>
        <Text>두 번째</Text>
      </ChatLayout>,
    );

    expect(getByText("첫 질문")).toBeTruthy();
    expect(getByText("두 번째")).toBeTruthy();
  });
});

// typing() — 62×35, 7px 점 셋. 바바 풍선과 같은 모서리.
describe("TypingDots", () => {
  it("점은 셋이고 바바 풍선과 같은 꼬리를 갖는다", async () => {
    const { getByRole, getAllByTestId } = await render(<TypingDots />);
    const s = flatten(getByRole("progressbar").props.style);

    expect(getAllByTestId("typing-dot")).toHaveLength(3);
    expect(s.width).toBe(62);
    expect(s.height).toBe(35);
    expect(s.borderBottomLeftRadius).toBe(6); // 곧 여기에 말이 들어온다
  });

  it("보조기술에 무엇을 기다리는지 말한다", async () => {
    const { getByRole } = await render(<TypingDots />);

    expect(getByRole("progressbar").props.accessibilityLabel).toBe("답장을 쓰는 중");
  });

  it("Reduce Motion 이면 루프가 멈춘다", async () => {
    // ⚠ 「돌지 않는다」가 아니라 「멈춘다」로 적는다. isReduceMotionEnabled 가 비동기라
    // 첫 렌더에서는 아직 false 이고, 값이 도착하면 effect 가 다시 돌며 루프를 stop 한다.
    // 한 프레임 남짓 도는 셈인데, 그걸 없애려면 값을 알기 전까지 렌더를 미뤄야 하고
    // 그건 대화 화면 전체를 지연시킨다. AppButton 의 진행점도 같은 구조다.
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    const stop = jest.fn();
    const loop = jest
      .spyOn(Animated, "loop")
      .mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() } as never);

    await render(<TypingDots />);

    await waitFor(() => expect(stop).toHaveBeenCalled());
    loop.mockRestore();
  });
});

// .ba{width:52px;border-radius:50%;box-shadow:0 0 0 10px rgba(251,246,236,.5), ...}
describe("Avatar", () => {
  // 아바타는 통째로 접근성 트리에서 숨긴 요소라 기본 쿼리로는 찾히지 않는다.
  const hidden = { includeHiddenElements: true } as const;

  it("lg 는 52, sm 은 34 이고 원이다", async () => {
    const lg = await render(<Avatar />);
    const sm = await render(<Avatar size="sm" />);

    const faceOf = (r: typeof lg) => flatten(r.getByTestId("avatar-face", hidden).props.style);
    expect(faceOf(lg).width).toBe(52);
    expect(faceOf(lg).borderRadius).toBe(26);
    expect(faceOf(sm).width).toBe(34);
    expect(faceOf(sm).borderRadius).toBe(17);
  });

  it("바깥 링은 그림자가 아니라 10px 테두리 고리다", async () => {
    // box-shadow 의 첫 값은 흐림 0 · 확산 10px — RN 은 spread 를 못 그려 padding 으로 만든다.
    const { getByTestId } = await render(<Avatar testID="a" />);
    const s = flatten(getByTestId("a", hidden).props.style);

    expect(s.padding).toBe(10);
    expect(s.backgroundColor).toBe(`${theme.colors.semantic.textOnDark}80`); // 50%
  });

  it("ring 을 끄면 고리가 사라진다", async () => {
    const { getByTestId } = await render(<Avatar testID="a" ring={false} />);
    const s = flatten(getByTestId("a", hidden).props.style);

    expect(s.padding).toBeUndefined();
  });

  it("얼굴은 장식이라 보조기술이 읽지 않는다", async () => {
    const { getByTestId, queryByTestId } = await render(<Avatar testID="a" />);

    expect(getByTestId("a", hidden).props.accessibilityElementsHidden).toBe(true);
    // 숨김을 포함하지 않으면 아예 잡히지 않는다 = 낭독기가 지나친다
    expect(queryByTestId("a")).toBeNull();
  });
});
