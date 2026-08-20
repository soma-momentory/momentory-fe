import { AccessibilityInfo, Animated, Text } from "react-native";
import { render, waitFor } from "@testing-library/react-native";

import { paperChat } from "@/design/paper";

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

  it("paper 변형은 6px 점 셋에 바바 면을 쓴다 — 기본값은 그대로다", async () => {
    // 회고만 켠다(PLAN.md D2). 온보딩은 위의 62×35 기본값을 계속 본다
    const { getByRole, getAllByTestId } = await render(<TypingDots variant="paper" />);
    const s = flatten(getByRole("progressbar").props.style);
    const dot = flatten(getAllByTestId("typing-dot")[0]?.props.style);

    expect(s.width).toBeUndefined(); // 점 셋만큼만 넓다
    expect(s.backgroundColor).toBe(paperChat.baba.background);
    expect(s.borderBottomLeftRadius).toBe(4);
    expect(dot.width).toBe(6);
    expect(dot.backgroundColor).toBe(paperChat.dot);
  });
});

describe("ChatLayout — paper 변형", () => {
  it("말풍선 사이가 9 로 좁아지고 상단 정렬은 그대로다", async () => {
    const { getByTestId } = await render(
      <ChatLayout testID="conv" variant="paper">
        <Text>안녕</Text>
      </ChatLayout>,
    );
    const content = flatten(getByTestId("conv").props.contentContainerStyle);

    expect(content.gap).toBe(9);
    expect(content.justifyContent).toBe("flex-start");
  });
});
