import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import Rest from "../../(tabs)/rest";
import RestCardDetail from "../cards/[date]";

import { useDiary } from "@/features/diary/model/diary";
import { datedCards } from "@/features/rest/model/cards";

let mockParams: { date: string } = { date: "2026-07-27" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

beforeEach(() => {
  mockParams = { date: "2026-07-27" };
  useDiary.getState().reset();
  jest.clearAllMocks();
});

/** 화면과 **같은 기준**으로 고른다 — 최신 날짜의 카드다 (store 순서가 아니다) */
const latest = () => {
  const { diaries, actionCards } = useDiary.getState();
  const first = datedCards(diaries, actionCards)[0];
  if (first == null) throw new Error("샘플에 행동 카드가 있어야 한다");
  return first.card;
};

describe("쉼터 — 행동 카드만 있다 (PLAN.md D1)", () => {
  it("룸 3종을 두지 않는다 — 구현하지 않은 자리를 그리지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    for (const room of ["대나무 숲", "감각 연못", "걱정 상자"]) {
      expect(queryByText(room)).toBeNull();
    }
  });

  it("가장 최근 카드의 상황·행동을 바로 보인다 — 자세히 보기가 필요 없다", async () => {
    const card = latest();
    const { getByText } = await render(<Rest />);

    expect(getByText("상황")).toBeTruthy();
    expect(getByText("제안된 행동")).toBeTruthy();
    expect(getByText(card.situation)).toBeTruthy();
  });

  it("수행 체크는 카드 탭을 가로챈다 — 상세로 넘어가지 않는다", async () => {
    const before = latest().done;
    const { getByLabelText } = await render(<Rest />);

    await fireEvent.press(getByLabelText("수행"));

    expect(latest().done).toBe(!before);
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();
  });

  it("카드를 누르면 상세로 간다", async () => {
    const { getByLabelText } = await render(<Rest />);

    await fireEvent.press(getByLabelText("행동 카드 자세히 보기"));

    expect(jest.mocked(router.push)).toHaveBeenCalled();
  });

  it("수행률·연속 일수를 세지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/연속/)).toBeNull();
    expect(queryByText(/회 실행/)).toBeNull();
  });
});

describe("행동 카드 상세", () => {
  it("지난 기록을 세지 않고 나열한다", async () => {
    const { getByText, queryByText } = await render(<RestCardDetail />);

    expect(getByText("지난 기록")).toBeTruthy();
    expect(queryByText(/\d+개 중/)).toBeNull();
  });

  it("없는 날짜는 조용히 빈 상태다 — 오류 화면을 만들지 않는다", async () => {
    mockParams = { date: "1999-01-01" };
    const { getByText } = await render(<RestCardDetail />);

    expect(getByText("이 날의 행동 카드가 없어요.")).toBeTruthy();
  });
});
