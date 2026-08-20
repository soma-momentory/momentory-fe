import { render, fireEvent, act } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import DiaryDetail from "../[id]/index";

import { actionCardOf, useDiary } from "@/features/diary/model/diary";

/** 7월 27일 일기 — 바바의 면·근거·행동 카드가 다 붙어 있는 한 장 */
const ID = "d-sample-27";
let mockParams: { id: string } = { id: ID };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
  useLocalSearchParams: () => mockParams,
}));

const cardId = () => actionCardOf(useDiary.getState().actionCards, ID)?.id ?? "";

beforeEach(() => {
  mockParams = { id: ID };
  useDiary.getState().reset();
  jest.clearAllMocks();
});

describe("A3 · 내가 남긴 오늘 + 행동 카드", () => {
  it("두 면을 세그먼트로 나눈다 — 한 화면에 섞지 않는다", async () => {
    const r = await render(<DiaryDetail />);

    expect(r.getByText("내가 남긴 오늘")).toBeTruthy();
    expect(r.getByText("바바가 함께 본 오늘")).toBeTruthy();
    // 내 면에서는 바바의 주의 줄이 보이지 않는다
    expect(r.queryByText(/회고를 마친 당시의 대화를 바탕으로/)).toBeNull();
  });

  it("행동 카드가 일기 아래에 붙는다 — 따로 목록을 만들지 않는다", async () => {
    const { getByText } = await render(<DiaryDetail />);

    expect(getByText("이 일기의 행동 카드")).toBeTruthy();
    expect(getByText("면접 연습을 시작할 때")).toBeTruthy();
    expect(getByText("예상 질문 하나를 골라 핵심 세 문장으로 답해보기")).toBeTruthy();
  });

  it("[해봤어요] 는 토글이 아니라 버튼이다", async () => {
    const r = await render(<DiaryDetail />);
    const button = r.getByText("해봤어요");

    // 스위치가 아니다 — role 이 switch 인 요소가 없다
    expect(r.queryByRole("switch")).toBeNull();
    expect(button).toBeTruthy();
  });

  it("완료 전에는 느낀 점 자리를 열어두지 않는다", async () => {
    // 쓰지 않은 칸이 먼저 보이면 안 한 일이 된다 (A3-c.md)
    const r = await render(<DiaryDetail />);

    expect(r.queryByLabelText("느낀 점")).toBeNull();
    expect(r.getByText(/해본 뒤에 한 줄 남길 수 있어요/)).toBeTruthy();
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

  it("두 면 어디서도 메뉴는 삭제 하나다", async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    await fireEvent.press(r.getByLabelText("더보기"));

    // 지워지는 것은 면이 아니라 한 벌이다
    expect(r.getByText("삭제하기")).toBeTruthy();
  });

  it("⋮ 삭제는 무엇이 사라지는지 먼저 말한다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));

    expect(r.getByText("이 회고를 삭제할까요?")).toBeTruthy();
    expect(r.getByText("내 문장, 바바의 문장, 행동 카드가 함께 삭제돼요.")).toBeTruthy();
  });

  it("확인하면 일기와 행동 카드가 함께 사라지고 보관함으로 돌아간다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));
    await fireEvent.press(r.getByText("회고 삭제"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)).toBeUndefined();
    expect(actionCardOf(useDiary.getState().actionCards, ID)).toBeNull();
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/archive");
    // 지운 한 벌은 되돌릴 수 있게 잠시 남는다
    expect(useDiary.getState().recentlyDeleted?.diary.id).toBe(ID);
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

describe("A3-c · 행동을 해본 뒤", () => {
  const markDone = async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByText("해봤어요"));
    return r;
  };

  it("누르면 채워진 상태 + 해본 날짜가 된다", async () => {
    const r = await markDone();

    expect(r.getByText(/해봤어요 · /)).toBeTruthy();
    const card = actionCardOf(useDiary.getState().actionCards, ID);
    expect(card?.done).toBe(true);
    expect(card?.doneAt).not.toBeNull();
  });

  it("완료한 뒤에야 느낀 점 자리가 열린다", async () => {
    const r = await markDone();

    expect(r.getByLabelText("느낀 점")).toBeTruthy();
  });

  it("느낀 점은 선택이다 — 비워 둬도 완료다", async () => {
    await markDone();

    const card = actionCardOf(useDiary.getState().actionCards, ID);
    expect(card?.done).toBe(true);
    expect(card?.reflection).toBeNull();
  });

  it("느낀 점 한 줄을 남길 수 있다", async () => {
    const r = await markDone();

    await fireEvent.changeText(
      r.getByLabelText("느낀 점"),
      "세 문장으로 줄이니 오히려 말이 덜 막혔다.",
    );

    expect(actionCardOf(useDiary.getState().actionCards, ID)?.reflection).toBe(
      "세 문장으로 줄이니 오히려 말이 덜 막혔다.",
    );
  });

  it("되돌릴 때만 확인을 묻는다 — 완료할 때는 묻지 않는다", async () => {
    const r = await markDone();
    // 완료는 바로 됐다
    expect(r.queryByText("해본 기록을 지울까요?")).toBeNull();

    await fireEvent.press(r.getByLabelText("해봤어요 되돌리기"));
    expect(r.getByText("해본 기록을 지울까요?")).toBeTruthy();
    expect(r.getByText("해본 날짜와 느낀 점이 함께 지워져요.")).toBeTruthy();
  });

  it("되돌리면 완료 기록과 느낀 점이 함께 사라진다", async () => {
    const r = await markDone();
    // 화면이 떠 있는 채로 store 를 바꾸므로 act 로 감싼다
    await act(async () => {
      useDiary.getState().setReflection(cardId(), "한 줄 남김");
    });

    await fireEvent.press(r.getByLabelText("해봤어요 되돌리기"));
    await fireEvent.press(r.getByText("지우기"));

    const card = actionCardOf(useDiary.getState().actionCards, ID);
    expect(card).toMatchObject({ done: false, doneAt: null, reflection: null });
  });

  it("확인에서 그대로 두면 아무 일도 없다", async () => {
    const r = await markDone();

    await fireEvent.press(r.getByLabelText("해봤어요 되돌리기"));
    await fireEvent.press(r.getByText("그대로 두기"));

    expect(actionCardOf(useDiary.getState().actionCards, ID)?.done).toBe(true);
  });
});

describe("A3-b · 바바가 함께 본 오늘", () => {
  const openBaba = async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    return r;
  };

  it("고정 스냅샷임을 화면이 먼저 말한다", async () => {
    const r = await openBaba();

    expect(
      r.getByText(
        "회고를 마친 당시의 대화를 바탕으로 작성됐어요. 이후 수정한 내 문장과 내용이 다를 수 있어요.",
      ),
    ).toBeTruthy();
  });

  it("다시 만들기 버튼을 두지 않는다", async () => {
    // 스냅샷이 다시 생성되면 「그때 바바가 뭐라고 했더라」가 사라진다 (A3-b.md)
    const r = await openBaba();

    expect(r.queryByText(/다시 만들|다시 생성|새로 만들/)).toBeNull();
  });

  it("근거는 사용자가 실제로 쓴 말을 인용한다", async () => {
    const r = await openBaba();

    expect(r.getByText("이 문장을 쓴 근거")).toBeTruthy();
    expect(r.getByText(/아예 포기하지는 않았어요/)).toBeTruthy();
  });

  it("그날의 기록은 감정을 두 줄로 나눈다", async () => {
    // 한 줄로 합치면 어느 시점의 감정인지 알 수 없다. 「회고 전 감정」은 폐기된 라벨
    const r = await openBaba();

    expect(r.getByText("이야기 속 감정")).toBeTruthy();
    expect(r.getByText("회고 시작 감정")).toBeTruthy();
    expect(r.queryByText("회고 전 감정")).toBeNull();
  });

  it("날씨는 읽기 전용 표시다", async () => {
    const r = await openBaba();

    expect(r.getByText("맑음 · 27℃")).toBeTruthy();
    expect(r.queryByLabelText("날씨")).toBeNull(); // 누를 수 있는 요소가 아니다
  });
});
