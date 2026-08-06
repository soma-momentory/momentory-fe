import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";

import theme from "@/design/theme";

import { AppText } from "../AppText";
import { Card } from "../Card";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const styleOf = async (node: React.ReactElement) => {
  const { getByTestId } = await render(node);
  return flatten(getByTestId("card").props.style);
};

describe("Card", () => {
  it("면·둥글기가 토큰 값 그대로다", async () => {
    // 상류 lib.mjs card() — fill card · r14. 값을 손으로 옮겨 적지 않는다.
    const s = await styleOf(<Card testID="card" />);

    expect(s.backgroundColor).toBe(theme.colors.semantic.surface);
    expect(s.borderRadius).toBe(theme.radius.control);
  });

  it("테두리는 primary 30% 1px 이다", async () => {
    const s = await styleOf(<Card testID="card" />);

    expect(s.borderWidth).toBe(1);
    // primary 는 장식 전용이라 테두리에만 쓴다 (RULES 2)
    expect(s.borderColor).toBe(`${theme.colors.semantic.accent}4D`);
  });

  it("plain 은 테두리 없이 면만 둔다 — 상류 textCard", async () => {
    const s = await styleOf(<Card testID="card" variant="plain" />);

    expect(s.borderWidth).toBeUndefined();
    expect(s.backgroundColor).toBe(theme.colors.semantic.surface);
  });

  it("안쪽 여백은 상류가 자식을 놓는 자리와 같다", async () => {
    // lib.mjs 는 카드 자식을 x:16 y:14 에 놓는다.
    const s = await styleOf(<Card testID="card" />);

    expect(s.paddingHorizontal).toBe(16);
    expect(s.paddingVertical).toBe(14);
  });

  it("자식을 그대로 그린다", async () => {
    const { getByText } = await render(
      <Card>
        <AppText>일정 제목만 참고해요</AppText>
      </Card>,
    );

    expect(getByText("일정 제목만 참고해요")).toBeTruthy();
  });

  it("style 로 덮을 수 있다 — 기본값을 지우지 않는다", async () => {
    const s = await styleOf(<Card testID="card" style={{ paddingVertical: 20 }} />);

    expect(s.paddingVertical).toBe(20);
    expect(s.backgroundColor).toBe(theme.colors.semantic.surface);
  });

  // style 을 ViewStyle 로 좁히면 View 는 받는 값을 우리만 거부한다.
  // 아래 둘은 컴파일이 곧 검증이다 — 타입이 좁아지면 typecheck 에서 먼저 깨진다.
  it("배열·조건부 스타일을 받는다", async () => {
    const selected = false;
    const s = await styleOf(
      <Card
        testID="card"
        style={[sheet.wide, selected && sheet.tall, null, [sheet.nested]]}
      />,
    );

    expect(s.paddingHorizontal).toBe(24);
    expect(s.marginTop).toBe(4);
    expect(s.paddingVertical).toBe(14); // 조건이 거짓이라 기본값이 남는다
  });

  it("등록된 스타일(StyleSheet.create)을 그대로 받는다", async () => {
    const s = await styleOf(<Card testID="card" style={sheet.tall} />);

    expect(s.paddingVertical).toBe(32);
  });
});

const sheet = StyleSheet.create({
  wide: { paddingHorizontal: 24 },
  tall: { paddingVertical: 32 },
  nested: { marginTop: 4 },
});
