import { render, fireEvent, act } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import DiaryEdit from "../[id]/edit";
import DiaryDetail from "../[id]/index";

import { text as textColor } from "@/design/tokens.mvp";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";

/** 7월 27일 일기 — 바바의 면·근거·행동 카드가 다 붙어 있는 한 장 */
const ID = "d-sample-27";
let mockParams: { id: string } = { id: ID };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
  useLocalSearchParams: () => mockParams,
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

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

  it("[수정하기] 는 실제 화면으로 이어진다 — 갈 곳 없는 줄을 두지 않는다", async () => {
    const r = await render(<DiaryDetail />);

    await fireEvent.press(r.getByText("수정하기"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith(`/diary/${ID}/edit`);
  });

  it("바바의 면에서는 수정으로 가지 않는다 — 고칠 수 있는 것은 내 면뿐이다", async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));

    expect(r.queryByText("수정하기")).toBeNull();
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

describe("A4 · 일기 수정", () => {
  it("제목이 「이 일기의 감정 태그」다 — 「이날의 감정」이 아니다", async () => {
    // 원본 감정을 고치는 것처럼 보이면 안 된다 (A4.md)
    const r = await render(<DiaryEdit />);

    expect(r.getByText("이 일기의 감정 태그")).toBeTruthy();
    expect(r.queryByText("이날의 감정")).toBeNull();
  });

  it("무엇이 안 바뀌는지를 먼저 말한다", async () => {
    const r = await render(<DiaryEdit />);

    expect(
      r.getByText(
        "수정한 내용은 '내가 남긴 오늘'에만 반영돼요. 바바의 문장과 행동 카드는 회고를 마친 당시 내용 그대로 남아요.",
      ),
    ).toBeTruthy();
  });

  it("본문과 감정 태그를 고쳐 저장한다", async () => {
    const r = await render(<DiaryEdit />);

    await fireEvent.changeText(r.getByLabelText("일기 내용"), "다시 쓴 오늘.");
    await fireEvent.press(r.getByLabelText("평온함"));
    await fireEvent.press(r.getByText("저장"));

    const d = useDiary.getState().diaries.find((x) => x.id === ID);
    expect(d?.body).toBe("다시 쓴 오늘.");
    expect(d?.emotions).toContain(9);
    expect(d?.authoredBy).toBe("user");
    expect(d?.editedAt).not.toBeNull();
  });

  it("고쳐도 바바의 문장·행동 카드·그날의 기록은 그대로다", async () => {
    const before = useDiary.getState().diaries.find((x) => x.id === ID);
    const r = await render(<DiaryEdit />);

    await fireEvent.changeText(r.getByLabelText("일기 내용"), "다시 쓴 오늘.");
    await fireEvent.press(r.getByText("저장"));

    const after = useDiary.getState().diaries.find((x) => x.id === ID);
    expect(after?.babaView).toBe(before?.babaView);
    expect(after?.storyEmotion).toBe(before?.storyEmotion);
    expect(after?.startEmotion).toBe(before?.startEmotion);
    expect(actionCardOf(useDiary.getState().actionCards, ID)).not.toBeNull();
  });

  it("취소하면 아무것도 바뀌지 않는다", async () => {
    const before = useDiary.getState().diaries.find((x) => x.id === ID)?.body;
    const r = await render(<DiaryEdit />);

    await fireEvent.changeText(r.getByLabelText("일기 내용"), "고치다 만 문장");
    await fireEvent.press(r.getByText("취소"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)?.body).toBe(before);
  });

  it("라벨이 「이 회고 삭제」다 — 지워지는 것이 회고 한 벌이기 때문", async () => {
    const r = await render(<DiaryEdit />);

    expect(r.getByText("이 회고 삭제")).toBeTruthy();
    expect(r.queryByText("이 일기 삭제")).toBeNull();
  });

  it("삭제는 무엇이 사라지는지 먼저 말한다", async () => {
    const r = await render(<DiaryEdit />);

    await fireEvent.press(r.getByText("이 회고 삭제"));

    expect(r.getByText("이 회고를 삭제할까요?")).toBeTruthy();
    expect(r.getByText("내 문장, 바바의 문장, 행동 카드가 함께 삭제돼요.")).toBeTruthy();
  });

  it("확인하면 일기와 행동 카드가 함께 사라진다", async () => {
    const r = await render(<DiaryEdit />);

    await fireEvent.press(r.getByText("이 회고 삭제"));
    await fireEvent.press(r.getByText("회고 삭제"));

    expect(useDiary.getState().diaries.find((x) => x.id === ID)).toBeUndefined();
    expect(actionCardOf(useDiary.getState().actionCards, ID)).toBeNull();
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/archive");
  });

  it("지운 한 벌은 되돌릴 수 있게 잠시 남는다", async () => {
    const r = await render(<DiaryEdit />);

    await fireEvent.press(r.getByText("이 회고 삭제"));
    await fireEvent.press(r.getByText("회고 삭제"));

    const kept = useDiary.getState().recentlyDeleted;
    expect(kept?.diary.id).toBe(ID);
    expect(kept?.card).not.toBeNull(); // 행동 카드도 함께 들고 있는다
  });

  it("되돌리면 일기와 행동 카드가 원래 순서로 돌아온다", async () => {
    const before = useDiary.getState().diaries.map((d) => d.id);
    const r = await render(<DiaryEdit />);
    await fireEvent.press(r.getByText("이 회고 삭제"));
    await fireEvent.press(r.getByText("회고 삭제"));

    await act(async () => {
      useDiary.getState().undoRemove();
    });

    // 맨 뒤가 아니라 원래 자리다 — 끝에 가면 되돌린 게 아니라 새로 쓴 것처럼 보인다
    expect(useDiary.getState().diaries.map((d) => d.id)).toEqual(before);
    expect(actionCardOf(useDiary.getState().actionCards, ID)).not.toBeNull();
    expect(useDiary.getState().recentlyDeleted).toBeNull();
  });

  it("고친 뒤에는 언제 고쳤는지까지 말한다", async () => {
    // 「수정함」은 언제인지를 말하지 못한다 (A4.md)
    const r = await render(<DiaryEdit />);
    await fireEvent.changeText(r.getByLabelText("일기 내용"), "다시 쓴 오늘.");
    await fireEvent.press(r.getByText("저장"));

    const detail = await render(<DiaryDetail />);
    const edited = useDiary.getState().diaries.find((x) => x.id === ID)?.editedAt ?? "";
    const [, m = "", d = ""] = edited.slice(0, 10).split("-");

    expect(
      detail.getByText(`회고 대화에서 작성 · ${Number(m)}월 ${Number(d)}일 수정`),
    ).toBeTruthy();
  });

  it("고치기 전에는 「회고 대화에서」다", async () => {
    const detail = await render(<DiaryDetail />);

    expect(detail.getByText("회고 대화에서")).toBeTruthy();
  });

  it("dangerInk 는 글자에만 얹는다 — 면도 테두리도 채우지 않는다 (R-40)", async () => {
    const r = await render(<DiaryEdit />);
    const label = r.getByText("이 회고 삭제");

    expect(flatten(label.props.style).color).toBe(textColor.danger);
    const button = label.parent;
    expect(flatten(button?.props.style).backgroundColor).toBeUndefined();
    expect(flatten(button?.props.style).borderWidth).toBeUndefined();
  });
});
