import { render, fireEvent } from "@testing-library/react-native";

import theme from "@/design/theme";

import { ChipFlow } from "../ChipFlow";

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const ITEMS = [
  { id: "rest", label: "쉬는 시간" },
  { id: "work", label: "일" },
  { id: "family", label: "가족" },
] as const;

const setup = async (selected: string[] = []) => {
  const onToggle = jest.fn();
  // RNTL 14 부터 render 가 Promise 를 반환한다 — await 하지 않으면 쿼리가 undefined 다.
  const view = await render(<ChipFlow items={ITEMS} selected={selected} onToggle={onToggle} />);
  return { onToggle, ...view };
};

// .chip{min-height:44px;padding:0 16px;border:1px solid rgba(36,31,25,.14);border-radius:999px}
// .chipOn{border-color:#C2703D;border-width:2px;background:#F1E7D6;font-weight:600}
describe("ChipFlow", () => {
  it("칩 높이는 44 다 — 52 는 .opt 선택지 행이다", async () => {
    const { getByText } = await setup();
    const s = flatten(getByText("일").parent?.props.style);

    expect(s.minHeight).toBe(44);
    expect(s.minHeight).toBeGreaterThanOrEqual(theme.touch.minTarget);
    expect(s.borderRadius).toBe(theme.radius.pill);
  });

  it("선택을 색만으로 표시하지 않는다 — 테두리 굵기와 글자 굵기가 함께 바뀐다", async () => {
    // RULES 「선택 상태」 — 색각 이상에서도 굵기로 읽혀야 한다.
    const off = await setup([]);
    const on = await setup(["work"]);

    const offChip = flatten(off.getByText("일").parent?.props.style);
    const onChip = flatten(on.getByText("일").parent?.props.style);

    expect(offChip.borderWidth).toBe(1);
    expect(onChip.borderWidth).toBe(2); // 굵기
    expect(onChip.borderColor).toBe(theme.colors.semantic.accent); // 색
    expect(onChip.backgroundColor).toBe(theme.colors.semantic.surfaceTone); // 면

    // 글자 굵기 — fontFamily 로 지정한다(Android 는 fontWeight 가 안 먹는다)
    expect(flatten(off.getByText("일").props.style).fontFamily).toBe("Pretendard-Medium");
    expect(flatten(on.getByText("일").props.style).fontFamily).toBe("Pretendard-SemiBold");
  });

  it("테두리가 굵어져도 칩 크기가 그대로다", async () => {
    // 고르는 순간 목록이 다시 배치되면 어디를 골랐는지 놓친다.
    const off = await setup([]);
    const on = await setup(["work"]);

    const offChip = flatten(off.getByText("일").parent?.props.style);
    const onChip = flatten(on.getByText("일").parent?.props.style);

    const outer = (s: Record<string, unknown>) =>
      Number(s.paddingHorizontal) + Number(s.borderWidth);
    expect(outer(onChip)).toBe(outer(offChip));
  });

  it("보조기술에 선택 상태가 전해진다", async () => {
    const { getByText } = await setup(["work"]);

    expect(getByText("일").parent?.props.accessibilityState).toMatchObject({ selected: true });
    expect(getByText("가족").parent?.props.accessibilityState).toMatchObject({ selected: false });
  });

  it("누르면 그 id 로 알린다 — 다시 눌러도 같다(취소는 호출자 몫)", async () => {
    const { getByText, onToggle } = await setup(["work"]);

    await fireEvent.press(getByText("일"));
    expect(onToggle).toHaveBeenCalledWith("work");
  });

  it("줄바꿈 플로우이고 간격은 8 이다", async () => {
    const { getByText } = await setup();
    const flow = flatten(getByText("일").parent?.parent?.props.style);

    expect(flow.flexWrap).toBe("wrap");
    expect(flow.gap).toBe(8);
  });
});
