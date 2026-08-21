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

  it("행동 카드가 일기 아래에 붙는다 — 따로 목록을 만들지 않는다", async () => {
    const { getByText } = await render(<DiaryDetail />);

    expect(getByText("이 일기의 행동 카드")).toBeTruthy();
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

  it("[수정하기] 를 두지 않는다 — 저장한 일기는 그날의 기록이다", async () => {
    // ⚠ `A4`(일기 수정)는 **기능이 아니다**(2026-08-20). 고칠 기회는 저장 전
    // (`C6` 의 `직접 고치기`) 하나이고, 메뉴에 남은 것은 삭제뿐이다
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));

    expect(r.queryByText("수정하기")).toBeNull();
    expect(r.getByText("삭제하기")).toBeTruthy();
  });

  it("⋮ 는 열고 닫는다 — 바깥을 탭해도 닫힌다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));
    expect(r.getByText("삭제하기")).toBeTruthy();

    await fireEvent.press(r.getByLabelText("메뉴 닫기"));
    expect(r.queryByText("삭제하기")).toBeNull();
  });

  it("메뉴는 삭제 하나다", async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByLabelText("더보기"));

    expect(r.getByText("삭제하기")).toBeTruthy();
  });

  it("⋮ 삭제는 무엇이 사라지는지 먼저 말한다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));

    expect(r.getByText("이 일기를 삭제할까요?")).toBeTruthy();
    expect(r.getByText("이 일기가 삭제돼요. 행동 카드는 보관함에 남아요.")).toBeTruthy();
  });

  it("확인하면 일기만 사라지고 행동 카드는 남는다 — 보관함으로 돌아간다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));
    await fireEvent.press(r.getByText("일기 삭제"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)).toBeUndefined();
    // 행동 카드는 자기 보관함(쉼터)에 남는다 — 함께 지우지 않는다(PRODUCT.md 상류와 차이)
    expect(actionCardOf(useDiary.getState().actionCards, ID)).toBeTruthy();
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/archive");
  });

  it("확인에서 그대로 두면 지워지지 않는다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));
    await fireEvent.press(r.getByText("그대로 두기"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)).toBeTruthy();
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
