import { render, fireEvent } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import DiaryDetail from "../[id]/index";

import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import { seedDiaries } from "@/testing/fixtures";

/** 7월 27일 일기 — 바바의 면·근거·행동 카드가 다 붙어 있는 한 장 */
const ID = "d-fixture-27";
let mockParams: { id: string } = { id: ID };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => {
  mockParams = { id: ID };
  seedDiaries();
  jest.clearAllMocks();
});

describe("A3 · 내가 남긴 오늘 + 행동 카드", () => {
  it("「내가 남긴 오늘」 한 면만 둔다 — 바바 면은 상세에서 뺐다(2026-08-20)", async () => {
    const r = await render(<DiaryDetail />);

    // 내가 쓴 본문은 보이고, 바바 면(칩·주의 줄)은 아예 없다
    expect(r.queryByText("바바가 함께 본 오늘")).toBeNull();
    expect(r.queryByText(/회고를 마친 당시의 대화를 바탕으로/)).toBeNull();
  });

  it("감정이 여럿이면 전부 보여준다 — 회고 직후 화면과 같은 줄이다", async () => {
    // 「우울했는데 라면 먹고 기분 좋아졌어」 — 앞의 감정만 세우면 뒤가 없던 일이 된다.
    useDiary.setState((st) => ({
      diaries: st.diaries.map((d) => (d.id === ID ? { ...d, emotions: [8, 1] } : d)),
    }));

    const r = await render(<DiaryDetail />);

    expect(r.getByText("우울함")).toBeTruthy();
    expect(r.getByText("행복함")).toBeTruthy();
  });

  it("행동 카드가 일기 아래에 붙는다 — 따로 목록을 만들지 않는다", async () => {
    const { getByText } = await render(<DiaryDetail />);

    expect(getByText("이 일기의 바람 카드")).toBeTruthy();
    expect(getByText("면접 연습을 시작할 때")).toBeTruthy();
    expect(getByText("예상 질문 하나를 골라 핵심 세 문장으로 답해보기")).toBeTruthy();
  });

  it("행동 카드는 읽기 전용이다 — 해봤어요·되돌리기·느낀점 편집이 없다", async () => {
    // 관리(수행·취소·느낀점)는 쉼터에서 한다(2026-08-20 · PRODUCT.md 상류와 차이).
    // 일기 상세는 그날의 기록을 **읽는** 곳이라 조작을 두지 않는다.
    const r = await render(<DiaryDetail />);

    expect(r.queryByText("해봤어요")).toBeNull();
    expect(r.queryByLabelText("해봤어요 되돌리기")).toBeNull();
    expect(r.queryByLabelText("느낀 점")).toBeNull();
  });

  it("실행 횟수·연속 일수를 세지 않는다", async () => {
    const r = await render(<DiaryDetail />);

    expect(r.queryByText(/\d+회 실행|연속|일째/)).toBeNull();
  });

  it("상단 오른쪽은 쓰레기통 하나다 — ⋮ 메뉴도 수정하기도 없다", async () => {
    // ⚠ `A4`(일기 수정)는 **기능이 아니다**(2026-08-20). 상세에서 할 일은 삭제뿐이라
    // ⋮ 메뉴를 없애고 쓰레기통 아이콘 하나로 줄였다.
    const r = await render(<DiaryDetail />);

    expect(r.getByLabelText("일기 삭제")).toBeTruthy();
    expect(r.queryByLabelText("더보기")).toBeNull();
    expect(r.queryByText("수정하기")).toBeNull();
  });

  it("쓰레기통을 누르면 곧바로 삭제 확인이 뜬다 — 무엇이 사라지는지 먼저 말한다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("일기 삭제"));

    expect(r.getByText("이 일기를 삭제할까요?")).toBeTruthy();
    // 카드가 있는 날이므로 함께 지워진다는 사실을 먼저 알린다
    expect(r.getByText("이 일기가 삭제돼요. 함께 만든 행동 카드도 같이 삭제돼요.")).toBeTruthy();
  });

  it("확인하면 일기와 그 일기의 행동 카드가 함께 사라진다 — 보관함으로 돌아간다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("일기 삭제"));
    await fireEvent.press(r.getByText("일기 삭제"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)).toBeUndefined();
    // 일기를 지우면 그 일기의 행동 카드도 함께 지운다
    expect(actionCardOf(useDiary.getState().actionCards, ID)).toBeNull();
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/archive");
  });

  it("확인에서 그대로 두면 지워지지 않는다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("일기 삭제"));
    await fireEvent.press(r.getByText("그대로 두기"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)).toBeTruthy();
  });

  it("해본 날이 있으면 기록으로 보여준다 — 「날짜 - 느낀 점」 한 줄(조작 요소는 없다)", async () => {
    // 상세는 **읽는 곳**이라 「해봤어요」 버튼·느낀 점 입력칸을 두지 않는다 —
    // 목표 행동 아래에 해본 날짜와 느낀 점을 한 줄 기록으로 보여준다.
    useDiary.setState(() => ({
      actionCards: [
        {
          id: "c-27",
          diaryId: ID,
          situation: "면접 연습을 시작할 때",
          emotions: [],
          needs: [],
          desiredState: null,
          sentiment: "uncomfortable" as const,
          targetAction: "예상 질문 하나를 골라 핵심 세 문장으로 답해보기",
          done: true,
          doneAt: "2026-07-28T09:00:00",
          reflection: "생각보다 덜 떨렸다",
          createdAt: "2026-07-27T21:00:00",
        },
      ],
    }));
    const r = await render(<DiaryDetail />);

    expect(r.getByText("기록")).toBeTruthy();
    // 「날짜 - 느낀 점」 한 줄
    expect(r.getByText("7월 28일 - 생각보다 덜 떨렸다")).toBeTruthy();
    // 읽는 곳이라 조작 요소는 없다
    expect(r.queryByLabelText("해봤어요 되돌리기")).toBeNull();
    expect(r.queryByLabelText("느낀 점")).toBeNull();
  });

  it("해봤지만 느낀 점이 없으면 날짜만 보여준다", async () => {
    useDiary.setState(() => ({
      actionCards: [
        {
          id: "c-27",
          diaryId: ID,
          situation: "면접 연습을 시작할 때",
          emotions: [],
          needs: [],
          desiredState: null,
          sentiment: "uncomfortable" as const,
          targetAction: "예상 질문 하나를 골라 핵심 세 문장으로 답해보기",
          done: true,
          doneAt: "2026-07-28T09:00:00",
          reflection: null,
          createdAt: "2026-07-27T21:00:00",
        },
      ],
    }));
    const r = await render(<DiaryDetail />);

    expect(r.getByText("기록")).toBeTruthy();
    expect(r.getByText("7월 28일")).toBeTruthy();
  });

  it("지워진 일기를 열면 보관함으로 되돌린다", async () => {
    useDiary.getState().remove(ID);
    await render(<DiaryDetail />);

    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/archive" }),
      undefined,
    );
  });
});

// (A3-c 「해본 뒤」의 조작 — 해봤어요·되돌리기·느낀점 — 은 상세에서 제거됨(2026-08-20 ·
//  읽기 전용). 그 동작은 쉼터(R2) 테스트와 store 테스트(diaryWrite.test)에 남아 있다.
//  A3-b 「바바가 함께 본 오늘」 면도 상세에서 뺐고 컴포넌트째 지웠다.)
