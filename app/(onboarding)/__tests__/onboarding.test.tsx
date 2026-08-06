import { render, fireEvent } from "@testing-library/react-native";

import Interests from "../interests";
import Nickname from "../nickname";
import Profile from "../profile";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe("04 · 닉네임", () => {
  const button = (r: Awaited<ReturnType<typeof render>>) => r.getByText("이렇게 불러주세요").parent;

  it("입력 전에도 버튼이 사라지지 않는다 — 비활성으로 남는다", async () => {
    // 다음에 무엇이 오는지 보여야 한다 (04.md)
    const r = await render(<Nickname />);

    expect(r.getByText("이렇게 불러주세요")).toBeTruthy();
    expect(flatten(button(r)?.props.style).opacity).toBe(0.36);
  });

  it("이름을 적으면 열린다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("실명도, 별명도 괜찮아요"), "지현");

    expect(flatten(button(r)?.props.style).opacity).toBeUndefined();
  });

  it("공백만 적은 것은 이름이 아니다", async () => {
    const r = await render(<Nickname />);
    await fireEvent.changeText(r.getByPlaceholderText("실명도, 별명도 괜찮아요"), "   ");

    expect(flatten(button(r)?.props.style).opacity).toBe(0.36);
  });

  it("무엇을·왜 묻는지를 두 줄로 나눠 말한다", async () => {
    const { getByText } = await render(<Nickname />);

    expect(getByText("어떻게 불러드리면 좋을까요?")).toBeTruthy();
    expect(
      getByText("당신의 이야기를 편안하게 나눌 수 있도록, 좋아하는 이름을 알려주세요."),
    ).toBeTruthy();
  });
});

describe("05-b · 나이 · 성별", () => {
  it("선택 질문이라 비워도 [다음] 이 열린다", async () => {
    // 나이·성별은 말 거는 방식에만 쓰인다 (05-b.md)
    const { getByText } = await render(<Profile />);

    expect(flatten(getByText("다음").parent?.props.style).opacity).toBeUndefined();
  });

  it("선택 질문임을 라벨 옆 태그로 밝힌다", async () => {
    const { getAllByText } = await render(<Profile />);

    expect(getAllByText("선택")).toHaveLength(2); // 나이 · 성별
  });

  it("비워둔 것과 「선택 안 함」을 구별한다", async () => {
    // 둘 다 답이지만 뜻이 다르다 — 앞은 묻지 않기를 고른 것, 뒤는 해당 없음을 고른 것.
    const { getByText } = await render(<Profile />);
    const noneChip = () => getByText("선택 안 함").parent;

    expect(noneChip()?.props.accessibilityState.selected).toBe(false); // 비어 있음
    await fireEvent.press(getByText("선택 안 함"));
    expect(noneChip()?.props.accessibilityState.selected).toBe(true); //  고른 것
  });

  it("성별은 하나만 고른다 — 다른 것을 누르면 옮겨간다", async () => {
    const { getByText } = await render(<Profile />);

    await fireEvent.press(getByText("여성"));
    await fireEvent.press(getByText("남성"));

    expect(getByText("남성").parent?.props.accessibilityState.selected).toBe(true);
    expect(getByText("여성").parent?.props.accessibilityState.selected).toBe(false);
  });

  it("같은 것을 다시 누르면 미선택으로 돌아간다", async () => {
    // 고른 뒤 무를 길이 있어야 한다 — 선택 질문이므로.
    const { getByText } = await render(<Profile />);

    await fireEvent.press(getByText("여성"));
    await fireEvent.press(getByText("여성"));

    expect(getByText("여성").parent?.props.accessibilityState.selected).toBe(false);
  });
});

describe("06 · 관심 분야", () => {
  const pick = async (r: Awaited<ReturnType<typeof render>>, ...labels: string[]) => {
    for (const l of labels) await fireEvent.press(r.getByText(l));
  };

  it("칩 8개를 한 화면에 다 보인다", async () => {
    // 스크롤로 감추면 뒤쪽은 선택되지 않는다 (06.md)
    const { getByText } = await render(<Interests />);

    for (const label of ["학업", "취업·진로", "일·직장생활", "인간관계", "가족", "나 자신", "건강", "기타"]) {
      expect(getByText(label)).toBeTruthy();
    }
  });

  it("하나도 안 고르면 버튼이 열리지 않는다 — 필수 질문이다", async () => {
    const r = await render(<Interests />);

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBe(0.36);
    expect(r.getByText("하나 이상 골라주세요")).toBeTruthy();
  });

  it("고르면 열리고 개수를 한 줄이 말한다", async () => {
    const r = await render(<Interests />);
    await pick(r, "가족", "건강");

    expect(flatten(r.getByText("다음").parent?.props.style).opacity).toBeUndefined();
    expect(r.getByText("최대 3개 · 2개 선택")).toBeTruthy();
  });

  it("상한을 넘기면 새 선택이 들어가지 않는다 — 고른 것을 밀어내지 않는다", async () => {
    // 무엇이 빠졌는지 모른 채 목록이 바뀌면 되돌릴 수가 없다.
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계");

    expect(r.getByText("인간관계").parent?.props.accessibilityState.selected).toBe(false);
    for (const kept of ["학업", "가족", "건강"]) {
      expect(r.getByText(kept).parent?.props.accessibilityState.selected).toBe(true);
    }
  });

  it("거부를 한 줄로 흡수한다 — 모달을 띄우지 않는다", async () => {
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계");

    expect(r.getByText("최대 3개까지 고를 수 있어요")).toBeTruthy();
  });

  it("하나 빼면 안내가 원래대로 돌아온다", async () => {
    const r = await render(<Interests />);
    await pick(r, "학업", "가족", "건강", "인간관계"); // 거부됨
    await pick(r, "학업"); //                            취소

    expect(r.getByText("최대 3개 · 2개 선택")).toBeTruthy();
  });
});
