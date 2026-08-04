import type { TestInstance } from "test-renderer";
import { render } from "@testing-library/react-native";

import theme from "@/design/theme";
import { text as textColor } from "@/design/tokens.mvp";

import { AppText, type TextVariant } from "../AppText";

const styleOf = (el: TestInstance) =>
  Object.assign({}, ...[el.props.style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const VARIANTS = Object.keys(theme.typography.styles) as TextVariant[];

describe("AppText", () => {
  // 값을 손으로 옮겨 적으면 상류가 바뀔 때 컴포넌트만 옛 값으로 남는다.
  it.each(VARIANTS)("%s 프리셋이 theme.typography 값을 그대로 쓴다", async (variant) => {
    const spec = theme.typography.styles[variant];
    const { getByText } = await render(<AppText variant={variant}>{variant}</AppText>);
    const s = styleOf(getByText(variant));

    expect(s.fontSize).toBe(spec.fontSize);
    expect(s.lineHeight).toBe(spec.lineHeight);
  });

  it("굵기를 fontWeight 가 아니라 fontFamily 로 지정한다", async () => {
    // Android 는 fontWeight 로 OTF 굵기를 골라주지 않는다 — 400 과 700 이 같게 렌더된다.
    const { getByText } = await render(<AppText variant="title">제목</AppText>);
    const s = styleOf(getByText("제목"));

    expect(s.fontFamily).toBe("Pretendard-Bold"); // title 은 700
    expect(s.fontWeight).toBeUndefined();
  });

  it("색은 semantic 토큰에서만 온다", async () => {
    const { getByText } = await render(<AppText tone="legal">약관</AppText>);
    expect(styleOf(getByText("약관")).color).toBe(textColor.legal);
  });
});
