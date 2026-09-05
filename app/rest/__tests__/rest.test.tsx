import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import Rest from "../../(tabs)/rest";
import RestCards from "../cards/index";

import { useDiary } from "@/features/diary/model/diary";
import { datedCards } from "@/features/rest/model/cards";
import { useToast } from "@/lib/toast";
import { seedDiaries } from "@/testing/fixtures";

/**
 * 쉼터는 **두 화면**이다: `R1` 진입(항목 하나) → `R2` 날짜별 카드 + 캘린더.
 *
 * `Rest.dc.html`(2026-08-20)은 셋이었고 `R3` 누적 기록이 있었는데 **2026-09-06 에
 * 지웠다**(`docs/PRODUCT.md` 「상류와 차이」 #35) — 그 화면 테스트도 함께 걷었다.
 *
 * 그보다 더 옛 구조는 탭이 곧 카드 화면이었다 — 그 시절 단언(카드 탭 가로채기 ·
 * 상세 이동)은 화면이 갈리면서 자리가 바뀌었고, **규칙 단언**으로 옮겨 적었다.
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
    emotions: [],
    needs: [],
    desiredState: null,
    sentiment: "uncomfortable" as const,
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
  it("바람카드 아래에 쉼 콘텐츠 넷이 2×2 로 있다 — 안내 한 줄과 함께", async () => {
    const { getByText } = await render(<Rest />);

    expect(getByText("지금 나에게 맞는 쉼을 골라보세요")).toBeTruthy();
    for (const title of ["감각연못", "걱정상자", "오늘의 보물함", "몸에 힘 빼기"]) {
      expect(getByText(title)).toBeTruthy();
    }
  });

  it("화면이 있는 콘텐츠만 눌린다 — 갈 곳이 없는 줄을 누르게 두지 않는다", async () => {
    const { getAllByRole } = await render(<Rest />);

    // 누를 수 있는 것은 바람카드 진입점과 감각연못뿐이다 — 나머지 셋은 화면이 아직 없다
    const labels = getAllByRole("button").map((b) => b.props.accessibilityLabel);
    expect(labels).toEqual(["바람카드 보기", "감각연못 열기"]);
  });

  it("감각연못 카드는 통째로 진입점이다", async () => {
    const { getByLabelText } = await render(<Rest />);

    await fireEvent.press(getByLabelText("감각연못 열기"));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/sense-pond");
  });

  it("바람카드가 첫 항목이고 카드 전체가 진입점이다", async () => {
    const { getByText, getByLabelText } = await render(<Rest />);

    expect(getByText("바람카드")).toBeTruthy();

    await fireEvent.press(getByLabelText("바람카드 보기"));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/cards");
  });

  it("여기서는 캘린더·수행 기록을 설명하지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText("지난 바람카드")).toBeNull();
    expect(queryByText(/했어요|수행했어요|아직 하지 않았어요/)).toBeNull();
    expect(queryByText("상황")).toBeNull();
  });

  it("수행률·연속 일수를 세지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/연속/)).toBeNull();
    expect(queryByText(/회 실행/)).toBeNull();
  });

  it("카드가 하나도 없어도 들어갈 수 있다 — 안에서 날짜로 둘러본다", async () => {
    useDiary.setState({ diaries: [], actionCards: [] });
    const { getByLabelText, getByText } = await render(<Rest />);

    // 요약 줄은 회고가 먼저라는 사실만 말하되, 진입은 막지 않는다
    expect(getByText("회고를 마치면 그날의 바람카드가 여기 남아요")).toBeTruthy();
    await fireEvent.press(getByLabelText("바람카드 보기"));
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/cards");
  });
});

describe("R2 · 날짜별 카드 — 상태와 행동을 나눈다", () => {
  it("가장 최근 카드의 상황·행동을 바로 보인다", async () => {
    const card = latest();
    const { getByText } = await render(<RestCards />);

    expect(getByText("상황")).toBeTruthy();
    expect(getByText("작은 행동")).toBeTruthy();
    expect(getByText(card.situation)).toBeTruthy();
  });

  it("카드 없는 날도 고를 수 있고, 그 자리에 「바람카드가 없어요」를 보여준다", async () => {
    seedOneCard(); // 2026-07-27 에 카드 한 장
    const r = await render(<RestCards />);

    // 처음엔 최신 카드(27일)를 보여준다
    expect(r.getByText("10분 걷기")).toBeTruthy();

    // 카드가 없는 15일을 골라도 잠기지 않고, 카드 자리에 없다는 문구가 뜬다
    await fireEvent.press(r.getByLabelText("15일"));
    expect(r.getByText("7월 15일에 만들어진 바람카드가 없어요.")).toBeTruthy();
  });

  it("카드가 하나도 없어도 캘린더로 날짜를 둘러볼 수 있다", async () => {
    useDiary.setState({ diaries: [], actionCards: [] });
    const r = await render(<RestCards />);

    // 아직 아무 날도 안 골랐으면 회고가 먼저라는 것을, 날을 고르면 그 날 카드가 없다는 것을
    expect(r.getByText("회고를 마치면 그날의 바람카드가 여기 남아요.")).toBeTruthy();
    await fireEvent.press(r.getByLabelText("15일"));
    expect(r.getByText(/15일에 만들어진 바람카드가 없어요\./)).toBeTruthy();
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

  /**
   * 2026-09-06 개정 — 예전에는 「했어요」가 **입력창까지 열었다.**
   *
   * 대부분은 적지 않고 넘어가는데 카드가 늘 입력창을 물고 있어서 닫을 길이 없었다.
   * 지금은 **체크와 「느낀 점 적기」**만 서고, 적겠다고 누른 사람에게만 자리를 연다.
   */
  it("[했어요] 를 누르면 체크와 [느낀 점 적기] 가 서고, 입력창은 아직 열리지 않는다", async () => {
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
    // 「수행했어요」라는 글자는 두지 않는다 — 그 자리를 「느낀 점 적기」가 쓴다
    // (체크와 오른쪽 「수행 취소」가 이미 수행을 말한다 · 2026-09-06)
    expect(r.queryByText("수행했어요")).toBeNull();
    expect(r.getByText("느낀 점 적기")).toBeTruthy();
    expect(r.queryByLabelText("느낀 점")).toBeNull();
    // 화면을 옮기지 않는다 — 카드 안에서 끝난다
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();

    // 누르면 그때 자리가 열린다
    await fireEvent.press(r.getByText("느낀 점 적기"));
    expect(r.getByLabelText("느낀 점")).toBeTruthy();
    /**
     * ⚠ 적는 동안에는 **아래 줄이 비어 있다**(2026-09-06). 예전에는 「남기지 않아도
     * 괜찮아요.」가 있었는데, 그 줄이 자리를 차지하는 바람에 입력창이 위로 밀려
     * 올라갔다 — 지금은 그 자리가 입력창이 아래로 자랄 자리다. 남겨도 된다는 말은
     * **빈 채로 눌리는 보내기 버튼**이 대신한다.
     */
    expect(r.queryByText("남기지 않아도 괜찮아요.")).toBeNull();
    expect(r.getByLabelText("느낀 점 없이 넘어가기")).toBeTruthy();
  });

  it("느낀 점은 선택이다 — 적어서 보내면 그대로 남는다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByText("느낀 점 적기"));
    await fireEvent.changeText(r.getByLabelText("느낀 점"), "생각보다 개운했다");
    await fireEvent.press(r.getByLabelText("느낀 점 저장"));

    expect(latest().reflection).toBe("생각보다 개운했다");
  });

  /**
   * 열어 놓고 마음이 바뀌면 **빈 채로 보내 닫는다** — 보내기는 비어 있어도 눌린다.
   * 서버로 가는 것은 없고 자리만 처음으로 돌아간다.
   */
  it("열었다가 빈 채로 보내면 아무것도 남기지 않고 닫힌다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByText("느낀 점 적기"));
    await fireEvent.press(r.getByLabelText("느낀 점 없이 넘어가기"));

    expect(r.queryByLabelText("느낀 점")).toBeNull();
    expect(latest().reflection).toBeNull();
    // 자리는 처음으로 — 다시 적으러 들어갈 수 있다
    expect(r.getByText("느낀 점 적기")).toBeTruthy();
  });

  /**
   * 2026-09-06 개정 — 「고치기」 버튼을 없애고 **적어 둔 글 자체를 누르게** 했다.
   *
   * 버튼을 아래 줄에 두면 그 줄만큼 하단이 커지고, 같은 줄에 두면 느낀 점이 쓸 폭이
   * 반으로 줄어(495 → 278px) 상한이 24 → 14 자가 됐다. 글을 누르게 하면 자리도 폭도
   * 그대로다.
   */
  it("저장한 느낀 점을 누르면 다시 고칠 수 있다", async () => {
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
    // 버튼은 없다 — 글이 곧 버튼이다
    expect(r.queryByText("고치기")).toBeNull();

    await fireEvent.press(r.getByLabelText("느낀 점 고치기"));
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

    await fireEvent.press(r.getByText("느낀 점 적기"));
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
    expect(r.getByText("이 바람카드를 삭제할까요?")).toBeTruthy();
    expect(useDiary.getState().actionCards.find((c) => c.id === target.id)).toBeTruthy();

    await fireEvent.press(r.getByText("삭제"));

    expect(useDiary.getState().actionCards.find((c) => c.id === target.id)).toBeUndefined();
    // 알림은 **기기에 묘비를 남긴 뒤**에 온다 — 남기지 못하면 실패 한 줄이다
    // (규칙 전체는 `features/diary/model/__tests__/deletedCards.test.ts`)
    await waitFor(() =>
      expect(useToast.getState().current).toMatchObject({
        message: "바람카드를 삭제했어요.",
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
});
