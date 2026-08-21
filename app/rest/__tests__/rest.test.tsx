import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import Rest from "../../(tabs)/rest";
import RestCards from "../cards/index";
import RestCardTrail from "../cards/[date]";

import { useDiary } from "@/features/diary/model/diary";
import { datedCards } from "@/features/rest/model/cards";
import { useToast } from "@/lib/toast";
import { seedDiaries } from "@/testing/fixtures";

/**
 * 쉼터는 **세 화면**이 됐다(`Rest.dc.html` · 2026-08-20):
 * `R1` 진입(항목 하나) → `R2` 날짜별 카드 + 캘린더 → `R3` 누적 기록.
 *
 * 옛 구조는 탭이 곧 카드 화면이었다 — 그 시절 단언(카드 탭 가로채기 · 상세 이동)은
 * 화면이 갈리면서 자리가 바뀌었고, **규칙 단언**으로 옮겨 적었다.
 */
let mockParams: { date: string } = { date: "2026-07-27" };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => mockParams,
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

beforeEach(() => {
  mockParams = { date: "2026-07-27" };
  seedDiaries();
  useToast.setState({ current: null });
  jest.clearAllMocks();
});

/**
 * 삭제만 보는 테스트가 쓰는 **한 장짜리 시드** — 샘플 데이터에 기대지 않는다.
 * 지우는 일은 「카드가 하나 있다」면 충분한데, 시드 목록에 기대면 시드가 바뀔 때
 * 관계없는 테스트가 함께 깨진다.
 */
const seedOneCard = () => {
  const card = {
    id: "ac-1",
    diaryId: "d-1",
    situation: "회의가 길어져 지쳤다",
    targetAction: "10분 걷기",
    done: false,
    doneAt: null,
    reflection: null,
    createdAt: "2026-07-27",
  };
  useDiary.setState({ actionCards: [card] });
  return card;
};

/** 화면과 **같은 기준**으로 고른다 — 최신 날짜의 카드다 (store 순서가 아니다) */
const latest = () => {
  const { actionCards } = useDiary.getState();
  const first = datedCards(actionCards)[0];
  if (first == null) throw new Error("샘플에 행동 카드가 있어야 한다");
  return first.card;
};

describe("R1 · 쉼터 진입 — 있다는 사실만 말한다", () => {
  it("룸 3종을 두지 않는다 — 구현하지 않은 자리를 그리지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    for (const room of ["대나무 숲", "감각 연못", "걱정 상자"]) {
      expect(queryByText(room)).toBeNull();
    }
  });

  it("항목은 행동카드 하나이고 카드 전체가 진입점이다", async () => {
    const { getByText, getByLabelText } = await render(<Rest />);

    expect(getByText("행동카드")).toBeTruthy();

    await fireEvent.press(getByLabelText("행동카드 보기"));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/cards");
  });

  it("여기서는 캘린더·수행 기록을 설명하지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText("지난 행동카드")).toBeNull();
    expect(queryByText(/했어요|수행했어요|아직 하지 않았어요/)).toBeNull();
    expect(queryByText("상황")).toBeNull();
  });

  it("수행률·연속 일수를 세지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/연속/)).toBeNull();
    expect(queryByText(/회 실행/)).toBeNull();
  });

  it("카드가 하나도 없으면 누를 수 없다 — 갈 곳 없는 자리를 만들지 않는다", async () => {
    useDiary.setState({ diaries: [], actionCards: [] });
    const { getByLabelText, getByText } = await render(<Rest />);

    expect(getByText("회고를 마치면 그날의 행동카드가 여기 남아요")).toBeTruthy();
    await fireEvent.press(getByLabelText("행동카드 보기"));
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();
  });
});

describe("R2 · 날짜별 카드 — 상태와 행동을 나눈다", () => {
  it("가장 최근 카드의 상황·행동을 바로 보인다", async () => {
    const card = latest();
    const { getByText } = await render(<RestCards />);

    expect(getByText("상황")).toBeTruthy();
    expect(getByText("제안된 행동")).toBeTruthy();
    expect(getByText(card.situation)).toBeTruthy();
  });

  it("왼쪽은 상태, 오른쪽은 행동 버튼이다 — 체크박스를 두지 않는다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({ ...c, done: false })),
    });
    const { getByText, queryByLabelText } = await render(<RestCards />);

    expect(getByText("아직 하지 않았어요")).toBeTruthy();
    expect(getByText("했어요")).toBeTruthy();
    // 옛 화면의 체크박스가 하던 두 일(보여주기·바꾸기)이 나뉘었다
    expect(queryByLabelText("수행")).toBeNull();
  });

  it("[했어요] 를 누르면 상태가 바뀌고 느낀 점 입력창이 카드 안에서 열린다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: false,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    expect(r.queryByLabelText("느낀 점")).toBeNull();
    await fireEvent.press(r.getByText("했어요"));

    expect(latest().done).toBe(true);
    expect(r.getByLabelText("느낀 점")).toBeTruthy();
    expect(r.getByText("남기지 않아도 괜찮아요.")).toBeTruthy();
    // 화면을 옮기지 않는다 — 카드 안에서 끝난다
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();
  });

  it("느낀 점은 선택이다 — 비어 있으면 저장을 누를 수 없다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    expect(r.getByLabelText("느낀 점 저장").props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(r.getByLabelText("느낀 점"), "생각보다 개운했다");
    await fireEvent.press(r.getByLabelText("느낀 점 저장"));

    expect(latest().reflection).toBe("생각보다 개운했다");
  });

  it("저장하면 읽기 블록 + [고치기] 가 된다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: "생각보다 개운했다",
      })),
    });
    const r = await render(<RestCards />);

    expect(r.getByText("생각보다 개운했다")).toBeTruthy();
    expect(r.queryByLabelText("느낀 점")).toBeNull();

    await fireEvent.press(r.getByText("고치기"));
    expect(r.getByLabelText("느낀 점")).toBeTruthy();
  });

  it("[수행 취소] 로 되돌리면 입력도 초기화된다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    await fireEvent.changeText(r.getByLabelText("느낀 점"), "적다 말았다");
    await fireEvent.press(r.getByText("수행 취소"));

    expect(latest().done).toBe(false);
    // 적던 것이 다음 수행의 초안으로 남지 않는다
    expect(r.queryByLabelText("느낀 점")).toBeNull();
  });

  it("⋮ → [삭제하기] → 확인해야 지워지고, 결과를 한 줄로 알린다", async () => {
    const target = seedOneCard();
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));

    // 되돌릴 수 없는 행동이라 **먼저 묻는다** — 아직 지우지 않았다
    expect(r.getByText("이 행동카드를 삭제할까요?")).toBeTruthy();
    expect(useDiary.getState().actionCards.find((c) => c.id === target.id)).toBeTruthy();

    await fireEvent.press(r.getByText("삭제"));

    expect(useDiary.getState().actionCards.find((c) => c.id === target.id)).toBeUndefined();
    // 알림은 **기기에 묘비를 남긴 뒤**에 온다 — 남기지 못하면 실패 한 줄이다
    // (규칙 전체는 `features/diary/model/__tests__/deletedCards.test.ts`)
    await waitFor(() =>
      expect(useToast.getState().current).toMatchObject({
        message: "행동카드를 삭제했어요.",
        variant: "positive",
      }),
    );
  });

  it("[그대로 두기] 를 고르면 아무 일도 없다", async () => {
    seedOneCard();
    const before = useDiary.getState().actionCards.length;
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));
    await fireEvent.press(r.getByText("그대로 두기"));

    expect(useDiary.getState().actionCards).toHaveLength(before);
    expect(useToast.getState().current).toBeNull();
  });

  it("[자세히 보기] 가 누적 기록으로 간다", async () => {
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByText("자세히 보기"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: "/rest/cards/[date]" }),
    );
  });
});

describe("R3 · 누적 기록 — 행동 자체가 제목이다", () => {
  it("제안된 행동이 제목이고 상황이 그 아래 붙는다", async () => {
    const card = latest();
    const { getByText } = await render(<RestCardTrail />);

    expect(getByText(card.targetAction)).toBeTruthy();
    expect(getByText("이 카드가 만들어진 상황")).toBeTruthy();
    expect(getByText(card.situation)).toBeTruthy();
  });

  it("지난 기록을 세지 않고 나열한다", async () => {
    const { getByText, queryByText } = await render(<RestCardTrail />);

    expect(getByText("지난 기록")).toBeTruthy();
    expect(queryByText(/\d+개 중/)).toBeNull();
  });

  it("여기서는 수행을 바꾸지 않는다 — 읽는 화면이다", async () => {
    const { queryByText, queryByLabelText } = await render(<RestCardTrail />);

    expect(queryByText("했어요")).toBeNull();
    expect(queryByText("수행 취소")).toBeNull();
    expect(queryByLabelText("느낀 점")).toBeNull();
  });

  it("없는 날짜는 조용히 빈 상태다 — 오류 화면을 만들지 않는다", async () => {
    mockParams = { date: "1999-01-01" };
    const { getByText } = await render(<RestCardTrail />);

    expect(getByText("이 날의 행동카드가 없어요.")).toBeTruthy();
  });
});
