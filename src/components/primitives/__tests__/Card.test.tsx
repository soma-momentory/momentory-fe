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

// 값은 **MVP 정본 `momentory.css` `.card` 를 그대로 적는다** — 토큰을 참조하면
// 토큰이 틀렸을 때 같이 틀린 채 통과한다. 여기가 시안과 코드가 만나는 자리다.
//
//   .card{background:#FBF6EC;border:1px solid rgba(36,31,25,.1);
//         border-radius:18px;padding:15px 17px;gap:8px}
//
// ⚠ COMPONENTS.md 의 P0 표(r14 · primary 30%)는 **원본**이다. 그걸로 만들었다가 고쳤다(R-42).
describe("Card", () => {
  it("면·둥글기가 MVP css 와 같다", async () => {
    const s = await styleOf(<Card testID="card" />);

    expect(s.backgroundColor).toBe(theme.colors.semantic.surface); // #FBF6EC
    expect(s.borderRadius).toBe(18);
  });

  it("테두리는 ink 10% 1px 이다 — primary 가 아니다", async () => {
    const s = await styleOf(<Card testID="card" />);

    expect(s.borderWidth).toBe(1);
    // rgba(36,31,25,.1) — #241F19 의 10%. 0.1 × 255 = 25.5 → 1A
    expect(s.borderColor).toBe(`${theme.colors.semantic.textPrimary}1A`);
  });

  it("plain 은 테두리 없이 면만 둔다 — card2 의 stroke: null", async () => {
    const s = await styleOf(<Card testID="card" variant="plain" />);

    expect(s.borderWidth).toBeUndefined();
    expect(s.backgroundColor).toBe(theme.colors.semantic.surface);
  });

  it("여백과 간격이 MVP css 와 같다", async () => {
    // padding:15px 17px · gap:8px
    const s = await styleOf(<Card testID="card" />);

    expect(s.paddingVertical).toBe(15);
    expect(s.paddingHorizontal).toBe(17);
    expect(s.gap).toBe(8);
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
    expect(s.paddingVertical).toBe(15); // 조건이 거짓이라 기본값이 남는다
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
