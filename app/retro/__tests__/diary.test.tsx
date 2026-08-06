import { render, fireEvent, act } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import RetroDone from "../done";
import RetroDraft from "../draft";

import { useDiary } from "@/features/diary/model/diary";
import { DRAFT_DEMO, useRetro } from "@/features/retro/model/retro";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));

beforeEach(() => {
  useRetro.getState().reset();
  // 저장 자체를 보는 테스트라 보관함 샘플 12편은 치운다
  // (`reset()` 은 데모 시작값으로 되돌린다 — 아래 「이어 붙는다」 테스트가 그걸 본다)
  useDiary.setState({ diaries: [], actionCards: [] });
  useRetro.getState().setStartEmotion(2); // 우울함
  useRetro.getState().setNextAction("예상 질문 세 문장 연습하기");
  jest.clearAllMocks();
});

describe("C6 · 일기 초안 — 첫 면은 사용자의 것이다", () => {
  it("두 면을 세그먼트로 나눈다 — 한 화면에 섞지 않는다", async () => {
    const { getByText } = await render(<RetroDraft />);

    expect(getByText("내가 남긴 오늘")).toBeTruthy();
    expect(getByText("바바가 함께 본 오늘")).toBeTruthy();
    // 처음 보이는 것은 내 면이다
    expect(getByText("7월 27일 월요일 · 오늘의 회고")).toBeTruthy();
  });

  it("초안을 고칠 수 있고 카운터가 센다", async () => {
    const r = await render(<RetroDraft />);
    const input = r.getByLabelText("일기 본문");

    expect(input.props.value).toBe(DRAFT_DEMO.body);
    expect(input.props.maxLength).toBe(500);

    const edited = "오늘은 긴장했지만 끝까지 답했다.";
    await fireEvent.changeText(input, edited);

    expect(r.getByText(`${edited.length} / 500`)).toBeTruthy();
  });

  it("최소 글자 수를 요구하지 않는다 — 비워도 다음으로 간다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "");

    // [다음] 이 잠기지 않는다
    const style = [r.getByText("다음").parent?.props.style].flat(Infinity).filter(Boolean);
    expect(Object.assign({}, ...style).opacity).toBeUndefined();
  });

  it("감정 알약 둘을 보이고 [+] 더하기를 두지 않는다", async () => {
    // 감정은 C3 시작 감정과 일정별 감정에서만 정해진다 (C6.md)
    const { getByText, queryByText, queryByLabelText } = await render(<RetroDraft />);

    expect(getByText("불안함")).toBeTruthy(); // 이야기 속 감정
    expect(getByText("우울함")).toBeTruthy(); // 회고 시작 감정
    expect(queryByText("+")).toBeNull();
    expect(queryByLabelText(/감정 추가/)).toBeNull();
  });

  it("한 문장 요약을 만들지 않는다", async () => {
    const { queryByText } = await render(<RetroDraft />);

    expect(queryByText(/한 줄 요약|요약/)).toBeNull();
  });

  it("첫 면에서는 저장하지 않는다 — 저장은 둘째 면 한 번뿐이다", async () => {
    const { getByText, queryByText } = await render(<RetroDraft />);

    expect(getByText("다음")).toBeTruthy();
    expect(queryByText("오늘 일기 저장하기")).toBeNull();
  });

  it("감정 없이 들어오면 C3 으로 되돌린다", async () => {
    useRetro.getState().reset();
    await render(<RetroDraft />);

    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/retro/emotion" }),
      undefined,
    );
  });
});

describe("C6-b · 바바가 함께 본 오늘 + 행동 카드", () => {
  const openBabaFace = async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    return r;
  };

  it("바바의 관점이 사용자의 문장을 부정하지 않는다", async () => {
    const r = await openBabaFace();

    expect(r.getByText("바바의 관점은 제안일 뿐이에요 · 내 문장이 우선이에요")).toBeTruthy();
  });

  it("행동 카드는 한 장뿐이고 상황·목표 행동 두 줄이다", async () => {
    const r = await openBabaFace();

    expect(r.getByText("오늘 만든 행동 카드")).toBeTruthy();
    expect(r.getByText("상황")).toBeTruthy();
    expect(r.getByText("목표 행동")).toBeTruthy();
    expect(r.getByText("저장하면 이 일기 아래에 함께 남아요")).toBeTruthy();
  });

  it("행동은 사용자가 말한 것을 옮긴다 — 바바가 새로 만들지 않는다", async () => {
    // C4-e 에서 담은 nextAction 이 그대로 온다 (C6-b.md)
    const r = await openBabaFace();

    expect(r.getByText("예상 질문 세 문장 연습하기")).toBeTruthy();
  });

  it("세그먼트는 면을 바꿀 뿐 저장하지 않는다", async () => {
    const r = await openBabaFace();
    await fireEvent.press(r.getByText("내가 남긴 오늘"));

    expect(useDiary.getState().diaries).toHaveLength(0);
  });

  it("두 면을 오갈 수 있고 한 번에 한 면만 보인다", async () => {
    // 두 면을 한 화면에 섞지 않는다 (RULES.md 「보관함」)
    const r = await render(<RetroDraft />);

    // 첫 면 — 본문은 편집칸이고 바바의 각주는 없다
    expect(r.getByLabelText("일기 본문")).toBeTruthy();
    expect(r.queryByText("바바의 관점은 제안일 뿐이에요 · 내 문장이 우선이에요")).toBeNull();

    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    expect(r.queryByLabelText("일기 본문")).toBeNull();
    expect(r.getByText("바바의 관점은 제안일 뿐이에요 · 내 문장이 우선이에요")).toBeTruthy();

    // 되돌아오면 내가 고치던 자리가 그대로다
    await fireEvent.press(r.getByText("내가 남긴 오늘"));
    expect(r.getByLabelText("일기 본문")).toBeTruthy();
    expect(r.queryByText("오늘 만든 행동 카드")).toBeNull();
  });

  it("면을 오가도 고치던 본문이 남는다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "내가 다시 쓴 오늘.");

    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    await fireEvent.press(r.getByText("내가 남긴 오늘"));

    expect(r.getByLabelText("일기 본문").props.value).toBe("내가 다시 쓴 오늘.");
  });

  it("점수·배지·연속 기록을 두지 않는다", async () => {
    const r = await openBabaFace();

    expect(r.queryByText(/\d+일째|연속|점수|배지|축하/)).toBeNull();
  });
});

describe("저장 — 일기 한 장 + 행동 카드 한 장", () => {
  const save = async (edit?: string) => {
    const r = await render(<RetroDraft />);
    if (edit != null) await fireEvent.changeText(r.getByLabelText("일기 본문"), edit);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    await act(async () => {
      await fireEvent.press(r.getByText("오늘 일기 저장하기"));
    });
    return r;
  };

  it("일기와 행동 카드가 하나씩 남고 서로 이어진다", async () => {
    await save();

    const { diaries, actionCards } = useDiary.getState();
    expect(diaries).toHaveLength(1);
    expect(actionCards).toHaveLength(1);
    expect(actionCards[0]?.diaryId).toBe(diaries[0]?.id);
    expect(actionCards[0]?.targetAction).toBe("예상 질문 세 문장 연습하기");
  });

  it("고치지 않으면 초안은 바바의 것이다", async () => {
    await save();

    expect(useDiary.getState().diaries[0]).toMatchObject({ authoredBy: "baba", editedAt: null });
  });

  it("고치면 사용자의 것이 된다", async () => {
    await save("내가 다시 쓴 오늘.");

    const d = useDiary.getState().diaries[0];
    expect(d?.body).toBe("내가 다시 쓴 오늘.");
    expect(d?.authoredBy).toBe("user");
    expect(d?.editedAt).not.toBeNull();
  });

  it("일기의 감정 태그는 이야기 속 감정 + 시작 감정이다", async () => {
    await save();

    expect(useDiary.getState().diaries[0]?.emotions).toEqual([1, 2]);
  });

  it("몇 번째 장인지만 센다 — 연속 일수가 아니다", async () => {
    await save();
    expect(useDiary.getState().diaries[0]?.ordinal).toBe(1);
  });

  it("이미 쌓인 일기 뒤에 이어 붙는다 — 13번째 장이 된다", async () => {
    // 보관함이 보는 샘플 12편 위에 오늘 회고가 한 장 더 남는다
    useDiary.getState().reset(); // 데모 시작값(12편)
    await save();

    const { diaries } = useDiary.getState();
    expect(diaries).toHaveLength(13);
    expect(diaries.at(-1)?.ordinal).toBe(13);
  });

  it("행동 카드는 아직 해보지 않은 상태로 시작한다", async () => {
    await save();

    expect(useDiary.getState().actionCards[0]).toMatchObject({
      done: false,
      doneAt: null,
      reflection: null, // 완료 전에는 자리를 열어두지 않는다
    });
  });

  it("저장하면 회고 한 벌을 비우고 완료로 간다", async () => {
    await save();

    expect(useRetro.getState().startEmotion).toBeNull();
    expect(useRetro.getState().nextAction).toBeNull();
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/retro/done");
  });

  it("두 번 눌러도 일기가 두 장 생기지 않는다", async () => {
    // 회고 한 번에 일기 한 장 — 빠른 연타로 조용히 깨지면 안 된다
    const r = await render(<RetroDraft />);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    const button = r.getByText("오늘 일기 저장하기");

    await act(async () => {
      await fireEvent.press(button);
      await fireEvent.press(button);
      await fireEvent.press(button);
    });

    expect(useDiary.getState().diaries).toHaveLength(1);
    expect(useDiary.getState().actionCards).toHaveLength(1);
  });

  it("바바의 관점과 행동 카드는 저장 시점의 값으로 굳는다", async () => {
    // 저장 이후에는 다시 만들지 않는다 — 사용자가 일기를 고쳐도 그대로다 (C6-b.md)
    await save("내가 다시 쓴 오늘.");

    const d = useDiary.getState().diaries[0];
    expect(d?.body).toBe("내가 다시 쓴 오늘."); //          내 면은 내가 고친 값
    expect(d?.babaView).toBe(DRAFT_DEMO.babaView); //       바바 면은 그대로
    expect(useDiary.getState().actionCards[0]?.situation).toBe(DRAFT_DEMO.situation);
  });
});

describe("C7 · 완료 — 허브로 만들지 않는다", () => {
  it("체크 하나, 두 줄, 버튼 하나다", async () => {
    const { getByText } = await render(<RetroDone />);

    expect(getByText("오늘도 잘 담아냈어요")).toBeTruthy();
    expect(getByText("오늘의 일기와 내일 해볼 행동을 함께 남겼어요.")).toBeTruthy();
    expect(getByText("홈으로 돌아가기")).toBeTruthy();
  });

  it("다음 행동 제안을 두지 않는다 — 회고 뒤에 할 일을 만들지 않는다", async () => {
    const { queryByText } = await render(<RetroDone />);

    expect(queryByText(/쉼터|행동 카드 보러|바로 해보기|다시 회고/)).toBeNull();
  });

  it("점수·연속 일수·배지·축하 연출을 쓰지 않는다", async () => {
    const { queryByText } = await render(<RetroDone />);

    expect(queryByText(/\d+일째|연속|점수|배지|축하/)).toBeNull();
  });

  it("돌아가는 곳은 홈이다", async () => {
    const { getByText } = await render(<RetroDone />);

    await fireEvent.press(getByText("홈으로 돌아가기"));

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });

  it("되돌아갈 회고가 없다 — 상단에 뒤로도 [잠시 쉬기] 도 없다", async () => {
    const { queryByText, queryByLabelText } = await render(<RetroDone />);

    expect(queryByLabelText("뒤로")).toBeNull();
    expect(queryByText("잠시 쉬기")).toBeNull();
  });
});
