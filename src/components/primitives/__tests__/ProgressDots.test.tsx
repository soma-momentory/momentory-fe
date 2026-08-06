import { render } from "@testing-library/react-native";

import theme from "@/design/theme";

import { ProgressDots } from "../ProgressDots";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe("ProgressDots", () => {
  it("점은 언제나 6개다", async () => {
    const { getAllByTestId } = await render(<ProgressDots activeIndex={2} />);

    expect(getAllByTestId(/^dot/).length).toBe(6);
  });

  it("활성만 6→18px 로 늘어난다", async () => {
    const { getByTestId, getAllByTestId } = await render(<ProgressDots activeIndex={2} />);

    expect(flatten(getByTestId("dot-active").props.style).width).toBe(18);
    for (const dot of getAllByTestId("dot")) {
      expect(flatten(dot.props.style).width).toBe(6);
    }
  });

  it("활성은 primary, 나머지는 ink 16% 다", async () => {
    const { getByTestId, getAllByTestId } = await render(<ProgressDots activeIndex={0} />);

    // primary 는 장식 전용 — 점·바·테두리가 그 자리다 (RULES 2)
    expect(flatten(getByTestId("dot-active").props.style).backgroundColor).toBe(
      theme.colors.semantic.accent,
    );
    expect(flatten(getAllByTestId("dot")[0]?.props.style).backgroundColor).toBe(
      `${theme.colors.semantic.textPrimary}29`,
    );
  });

  it("숫자를 그리지 않는다", async () => {
    // RULES 4 — 진행률·연속 일수·점수 금지. "4/6" 도 퍼센트도 쓰지 않는다.
    const { queryByText } = await render(<ProgressDots activeIndex={3} />);

    expect(queryByText(/\d/)).toBeNull();
  });

  it("activeIndex 가 null 이면 아무것도 그리지 않는다", async () => {
    const { queryAllByTestId } = await render(<ProgressDots activeIndex={null} />);

    expect(queryAllByTestId(/^dot/)).toHaveLength(0);
  });

  it("진행 상태는 컨테이너 하나가 말한다", async () => {
    // 점 6개를 따로 읽으면 보조기술에는 의미 없는 소음이 된다.
    const { getByRole } = await render(<ProgressDots activeIndex={1} />);

    expect(getByRole("progressbar").props.accessibilityValue).toMatchObject({
      min: 1,
      max: 6,
      now: 2,
    });
  });
});
