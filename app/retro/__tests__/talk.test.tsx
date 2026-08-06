import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import { Redirect } from "expo-router";

import RetroTalk from "../talk";

import { useRetro } from "@/features/retro/model/retro";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const MIRROR =
  "답이 막힌 순간이 계속 마음에 남았군요. 다른 사람들과 비교하면서 자신감도 많이 내려간 것 같아요.";

beforeEach(() => {
  jest.useFakeTimers();
  useRetro.getState().reset();
  useRetro.getState().setStartEmotion(2); // 우울함
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/** 답변을 보내고 바바의 되짚기까지 흘려보낸다 */
const answerAndWait = async (r: Awaited<ReturnType<typeof render>>, text: string) => {
  await fireEvent.changeText(r.getByLabelText("답변"), text);
  await fireEvent.press(r.getByLabelText("보내기"));
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
};

describe("C4 · 대화 · 첫 질문", () => {
  it("바바가 일정을 먼저 지목하지 않는다", async () => {
    // "면접 스터디는 어땠어요?"로 열면 오늘의 화제를 바바가 정하는 것이 된다 (C4.md)
    const { getByText, queryByText } = await render(<RetroTalk />);

    expect(
      getByText("오늘은 어떤 이야기를 나누고 싶어요? 일정에 없던 일이나 지금 떠오른 생각도 괜찮아요."),
    ).toBeTruthy();
    expect(queryByText(/면접 스터디/)).toBeNull();
    expect(queryByText(/팀 회의/)).toBeNull();
  });

  it("감정을 단정하지 않고 확인한다", async () => {
    const { getByText } = await render(<RetroTalk />);

    expect(getByText("지현님, 지금은 우울한 마음이 가장 가까이 있군요.")).toBeTruthy();
  });

  it("고른 감정에 따라 첫 문장이 바뀐다", async () => {
    useRetro.getState().setStartEmotion(9); // 평온함
    const { getByText } = await render(<RetroTalk />);

    expect(getByText("지현님, 지금은 평온한 마음이 가장 가까이 있군요.")).toBeTruthy();
  });

  it("빠른 답변 칩·예시 placeholder 를 두지 않는다", async () => {
    // 보기를 주면 사용자는 자기 말 대신 보기 중 하나를 고른다 (C4.md)
    const { getByLabelText } = await render(<RetroTalk />);

    expect(getByLabelText("답변").props.placeholder).toBe("편하게 이야기해주세요");
  });

  it("빈 답변은 보낼 수 없다 — 빈 버블을 만들지 않는다", async () => {
    const r = await render(<RetroTalk />);

    expect(flatten(r.getByLabelText("보내기").props.style).opacity).toBe(0.36);
    await fireEvent.changeText(r.getByLabelText("답변"), "   ");
    expect(flatten(r.getByLabelText("보내기").props.style).opacity).toBe(0.36);
  });

  it("감정 없이 들어오면 C3 으로 되돌린다 — 감정 선택은 필수다", async () => {
    useRetro.getState().reset();
    await render(<RetroTalk />);

    expect(jest.mocked(Redirect)).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/retro/emotion" }),
      undefined,
    );
  });

  it("시작 감정이 상단에 남는다 — 무엇을 안고 시작했는지 잊지 않게", async () => {
    const { getAllByText } = await render(<RetroTalk />);

    // 상단 알약 하나 (첫 말풍선의 「우울한」은 다른 문자열이다)
    expect(getAllByText("우울함")).toHaveLength(1);
  });
});

describe("C4-b · 첫 이야기와 되짚기", () => {
  it("답하면 내 버블이 남고 바바가 되짚는다", async () => {
    const r = await render(<RetroTalk />);
    await answerAndWait(r, "준비했던 말이 잘 떠오르지 않았어요.");

    expect(r.getByText("준비했던 말이 잘 떠오르지 않았어요.")).toBeTruthy();
    expect(r.getByText(MIRROR)).toBeTruthy();
  });

  it("되짚기까지만 하고 다음 질문을 붙이지 않는다", async () => {
    // 다음 질문은 방향을 정한 뒤다 (C4-b.md)
    const r = await render(<RetroTalk />);
    await answerAndWait(r, "오늘 발표가 잘 안 됐어요.");

    for (const q of [
      "그때 스스로에게 가장 먼저 어떤 말을 했나요?",
      "그 순간 가장 크게 느껴진 마음은 무엇이었나요?",
      "다음에는 무엇이 조금 달라졌으면 좋겠나요?",
    ]) {
      expect(r.queryByText(q)).toBeNull();
    }
  });

  it("지난 버블을 삭제하지 않는다 — 첫 질문이 그대로 남는다", async () => {
    const r = await render(<RetroTalk />);
    await answerAndWait(r, "오늘 발표가 잘 안 됐어요.");

    expect(r.getByText(/오늘은 어떤 이야기를 나누고 싶어요\?/)).toBeTruthy();
    expect(r.getByText("지현님, 지금은 우울한 마음이 가장 가까이 있군요.")).toBeTruthy();
    expect(useRetro.getState().turns).toHaveLength(2);
  });

  it("바바가 답을 쓰는 동안 입력이 잠긴다", async () => {
    const r = await render(<RetroTalk />);
    await fireEvent.changeText(r.getByLabelText("답변"), "오늘 발표가 잘 안 됐어요.");
    await fireEvent.press(r.getByLabelText("보내기"));

    expect(r.getByLabelText("답변").props.editable).toBe(false);
  });
});

describe("C4-c · 방향 고르기 — 추천하지 않는다", () => {
  const openSheet = async () => {
    const r = await render(<RetroTalk />);
    await answerAndWait(r, "오늘 발표가 잘 안 됐어요.");
    return r;
  };

  it("되짚기 다음에 방향 시트가 열린다", async () => {
    const r = await openSheet();

    expect(r.getByText("지금은 어떻게 이야기를 이어가고 싶어요?")).toBeTruthy();
    expect(r.getByText("고르는 대로 다음 질문이 달라져요 · 대화 중에 바꿔도 괜찮아요")).toBeTruthy();
  });

  it("네 줄을 사용자의 말로 쓰고 내부 유형명을 노출하지 않는다", async () => {
    const r = await openSheet();

    for (const t of [
      "마음을 조금 더 이야기하며 정리하고 싶어요",
      "지금 상황을 다른 관점에서 바라보고 싶어요",
      "지금 할 수 있는 방법을 찾아보고 싶어요",
      "오늘 있었던 일을 짧게 기록하고 싶어요",
    ]) {
      expect(r.getByText(t)).toBeTruthy();
    }
    for (const internal of ["인지 재구성", "문제 해결", "감정 정리형", "짧은 기록형", "reframe"]) {
      expect(r.queryByText(internal)).toBeNull();
    }
  });

  it("추천 배지와 [바바에게 맡길게요] 를 두지 않는다", async () => {
    const r = await openSheet();

    expect(r.queryByText(/추천/)).toBeNull();
    expect(r.queryByText(/바바에게 맡길게요/)).toBeNull();
  });

  it("아무것도 골라져 있지 않고 CTA 가 잠겨 있다", async () => {
    const r = await openSheet();

    expect(
      r.getByText("지금 상황을 다른 관점에서 바라보고 싶어요").parent?.parent?.props
        .accessibilityState.selected,
    ).toBe(false);
    expect(flatten(r.getByText("이 방향으로 이어가기").parent?.props.style).opacity).toBe(0.36);
  });
});

describe("C4-c2 · 하나를 누른 뒤", () => {
  const openAndPick = async (label: string) => {
    const r = await render(<RetroTalk />);
    await answerAndWait(r, "오늘 발표가 잘 안 됐어요.");
    await fireEvent.press(r.getByText(label));
    return r;
  };

  it("누른 줄만 켜지고 CTA 가 열린다", async () => {
    const r = await openAndPick("지금 상황을 다른 관점에서 바라보고 싶어요");

    expect(flatten(r.getByText("이 방향으로 이어가기").parent?.props.style).opacity).toBeUndefined();
  });

  it("다른 줄을 누르면 앞의 선택이 풀린다 — 방향은 하나다", async () => {
    const r = await openAndPick("지금 상황을 다른 관점에서 바라보고 싶어요");
    const optionOf = (label: string) => r.getByText(label).parent?.parent;

    expect(optionOf("지금 상황을 다른 관점에서 바라보고 싶어요")?.props.accessibilityState.selected).toBe(true);

    await fireEvent.press(r.getByText("지금 할 수 있는 방법을 찾아보고 싶어요"));

    expect(optionOf("지금 상황을 다른 관점에서 바라보고 싶어요")?.props.accessibilityState.selected).toBe(false);
    expect(optionOf("지금 할 수 있는 방법을 찾아보고 싶어요")?.props.accessibilityState.selected).toBe(true);
  });

  it("누른 순간에는 저장되지 않는다 — CTA 를 눌러야 확정된다", async () => {
    const r = await openAndPick("지금 상황을 다른 관점에서 바라보고 싶어요");

    expect(useRetro.getState().direction).toBeNull();

    await fireEvent.press(r.getByText("이 방향으로 이어가기"));

    expect(useRetro.getState().direction).toBe("reframe");
  });

  it("시트를 닫으면 아무것도 저장되지 않고, 다시 열 수 있다", async () => {
    const r = await openAndPick("지금 상황을 다른 관점에서 바라보고 싶어요");

    await fireEvent.press(r.getByLabelText("닫기"));
    expect(useRetro.getState().direction).toBeNull();

    // 닫은 뒤에도 갇히지 않는다
    await fireEvent.press(r.getByText("이야기 방향 고르기"));
    await waitFor(() => expect(r.getByText("지금은 어떻게 이야기를 이어가고 싶어요?")).toBeTruthy());

    // 다시 열면 앞의 선택은 남아 있지 않다
    expect(flatten(r.getByText("이 방향으로 이어가기").parent?.props.style).opacity).toBe(0.36);
  });
});

/** 첫 이야기 → 방향 확정까지. 이후 테스트의 공통 출발점이다 */
const startWithDirection = async (label = "지금 상황을 다른 관점에서 바라보고 싶어요") => {
  const r = await render(<RetroTalk />);
  await answerAndWait(r, "오늘 발표가 잘 안 됐어요.");
  await fireEvent.press(r.getByText(label));
  await fireEvent.press(r.getByText("이 방향으로 이어가기"));
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  return r;
};

describe("C4-d · 방향을 고른 직후", () => {
  it("대화가 그 자리에서 이어진다 — 칩 한 줄과 그 방향의 첫 질문", async () => {
    const r = await startWithDirection();

    expect(r.getByText("다른 관점에서 바라보기")).toBeTruthy();
    expect(r.getByText("좋아요. 그때 스스로에게 가장 먼저 어떤 말을 했나요?")).toBeTruthy();
  });

  it("칩에 쓰는 말은 사용자의 말이다 — 내부 분기명을 쓰지 않는다", async () => {
    const r = await startWithDirection();

    expect(r.queryByText(/reframe/)).toBeNull();
    // 저장은 내부값으로 한다
    expect(useRetro.getState().direction).toBe("reframe");
  });

  // 네 방향 전부 — 고른 줄과 이어지는 질문이 짝이 맞아야 한다 (C4-c.md 표)
  it.each([
    ["마음을 조금 더 이야기하며 정리하고 싶어요", "feelings", "그 순간 가장 크게 느껴진 마음은 무엇이었나요?", "마음 이야기하며 정리하기"],
    ["지금 상황을 다른 관점에서 바라보고 싶어요", "reframe", "그때 스스로에게 가장 먼저 어떤 말을 했나요?", "다른 관점에서 바라보기"],
    ["지금 할 수 있는 방법을 찾아보고 싶어요", "solve", "다음에는 무엇이 조금 달라졌으면 좋겠나요?", "지금 할 수 있는 방법 찾기"],
    ["오늘 있었던 일을 짧게 기록하고 싶어요", "brief", "오늘 있었던 일과 그때의 마음을 한 문장으로 남겨볼까요?", "짧게 기록하기"],
  ])("«%s» 를 고르면 그 방향의 칩과 첫 질문이 온다", async (option, id, question, chip) => {
    const r = await startWithDirection(option);

    expect(useRetro.getState().direction).toBe(id);
    expect(r.getByText(chip)).toBeTruthy();
    expect(r.getByText(`좋아요. ${question}`)).toBeTruthy();
  });

  it("되짚기 다음 답에는 관점 확인과 균형 근거 질문이 온다", async () => {
    const r = await startWithDirection();
    await answerAndWait(r, "역시 나는 면접을 못하나 봐 하는 생각이 들었어요.");

    expect(r.getByText("한 번 답이 막힌 일이 '나는 면접을 못한다'는 결론까지 커졌군요.")).toBeTruthy();
    // 사용자가 말하지 않은 성공을 만들지 않는다 — 질문이지 단정이 아니다
    expect(
      r.getByText("오늘 완벽하지는 않았어도, 중간에 포기하지 않고 해낸 부분도 있었나요?"),
    ).toBeTruthy();
  });

  it("[변경] 을 누르면 시트가 다시 열리고 대화가 지워지지 않는다", async () => {
    const r = await startWithDirection();
    const before = useRetro.getState().turns.length;

    await fireEvent.press(r.getByText("변경"));

    expect(r.getByText("지금은 어떻게 이야기를 이어가고 싶어요?")).toBeTruthy();
    expect(useRetro.getState().turns).toHaveLength(before);
    expect(r.getByText("오늘 발표가 잘 안 됐어요.")).toBeTruthy();
  });

  it("방향을 바꾸면 새 칩과 새 질문이 이어 붙는다", async () => {
    const r = await startWithDirection();
    await fireEvent.press(r.getByText("변경"));
    await fireEvent.press(r.getByText("오늘 있었던 일을 짧게 기록하고 싶어요"));
    await fireEvent.press(r.getByText("이 방향으로 이어가기"));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(r.getByText("짧게 기록하기")).toBeTruthy();
    expect(r.getByText("다른 관점에서 바라보기")).toBeTruthy(); // 앞 칩도 남는다
    expect(useRetro.getState().direction).toBe("brief");
  });

  it("단계 이름과 진행률을 화면에 쓰지 않는다", async () => {
    const r = await startWithDirection();

    for (const internal of ["감정 확인", "관점 전환", "균형 근거", "작은 행동", "단계"]) {
      expect(r.queryByText(new RegExp(internal))).toBeNull();
    }
  });
});

describe("C4-e · 내 문장과 다음 한 가지", () => {
  /** 방향 확정 후 네 번 더 답해 대화를 끝까지 민다 */
  const runToEnd = async () => {
    const r = await startWithDirection();
    await answerAndWait(r, "역시 나는 면접을 못하나 봐 하는 생각이 들었어요.");
    await answerAndWait(r, "말이 막히긴 했지만 아예 포기하지는 않았어요.");
    await answerAndWait(r, "오늘은 긴장해서 답이 막혔지만, 끝까지 답했어요.");
    await answerAndWait(r, "예상 질문 하나를 골라 세 문장으로 말해보는 연습을 하고 싶어요.");
    return r;
  };

  it("균형 문장과 다음 한 가지가 사용자의 말에서 나온다", async () => {
    // 이 둘이 없으면 C6 일기와 C6-b 행동 카드를 만들 재료가 없다 (C4-e.md)
    await runToEnd();

    expect(useRetro.getState().balanceSentence).toBe(
      "오늘은 긴장해서 답이 막혔지만, 끝까지 답했어요.",
    );
    expect(useRetro.getState().nextAction).toBe(
      "예상 질문 하나를 골라 세 문장으로 말해보는 연습을 하고 싶어요.",
    );
  });

  it("요약을 대화에 다시 쓰지 않는다 — 정리하겠다고만 말한다", async () => {
    const r = await runToEnd();

    expect(r.getByText("좋아요. 오늘의 이야기와 내일 해볼 행동을 함께 정리해볼게요.")).toBeTruthy();
  });

  it("입력칸을 내리고 [일기 보러 가기] 하나만 둔다", async () => {
    // 대화가 끝났다는 것을 자리로 알린다 (C4-e.md)
    const r = await runToEnd();

    expect(r.getByText("일기 보러 가기")).toBeTruthy();
    expect(r.queryByLabelText("답변")).toBeNull();
    expect(r.queryByLabelText("보내기")).toBeNull();
  });

  it("앞 대화는 지우지 않는다 — 전부 남아 있다", async () => {
    const r = await runToEnd();

    expect(r.getByText("오늘 발표가 잘 안 됐어요.")).toBeTruthy();
    expect(r.getByText("다른 관점에서 바라보기")).toBeTruthy();
    expect(r.getByText(MIRROR)).toBeTruthy();
  });

  it("기본 3~5회 답변 안에 마무리한다", async () => {
    const r = await runToEnd();

    const answers = useRetro.getState().turns.filter((t) => t.who === "me");
    expect(answers).toHaveLength(5);
    expect(r.getByText("일기 보러 가기")).toBeTruthy();
  });
});

describe("C6 · C6-b 의 재료 — 저장 시점과 출처", () => {
  it("그 순서의 답을 하기 전에는 비어 있다", async () => {
    const r = await startWithDirection();
    expect(useRetro.getState().balanceSentence).toBeNull();
    expect(useRetro.getState().nextAction).toBeNull();

    await answerAndWait(r, "역시 나는 면접을 못하나 봐 하는 생각이 들었어요.");
    await answerAndWait(r, "말이 막히긴 했지만 아예 포기하지는 않았어요.");

    // 아직 균형 문장을 말하지 않았다
    expect(useRetro.getState().balanceSentence).toBeNull();
    expect(useRetro.getState().nextAction).toBeNull();
  });

  it("세 번째 답이 균형 문장, 네 번째가 다음 한 가지다", async () => {
    const r = await startWithDirection();
    await answerAndWait(r, "역시 나는 면접을 못하나 봐 하는 생각이 들었어요.");
    await answerAndWait(r, "말이 막히긴 했지만 아예 포기하지는 않았어요.");

    await answerAndWait(r, "오늘은 긴장했지만 끝까지 답했어요.");
    expect(useRetro.getState().balanceSentence).toBe("오늘은 긴장했지만 끝까지 답했어요.");
    expect(useRetro.getState().nextAction).toBeNull(); // 아직이다

    await answerAndWait(r, "예상 질문 세 문장 연습을 하고 싶어요.");
    expect(useRetro.getState().nextAction).toBe("예상 질문 세 문장 연습을 하고 싶어요.");
    // 앞서 담은 값은 덮이지 않는다
    expect(useRetro.getState().balanceSentence).toBe("오늘은 긴장했지만 끝까지 답했어요.");
  });

  it("바바가 만든 문장은 두 값에 들어가지 않는다", async () => {
    // 행동은 반드시 사용자가 말한 내용에서 나온다 (C4-e.md)
    const r = await startWithDirection();
    await answerAndWait(r, "역시 나는 면접을 못하나 봐 하는 생각이 들었어요.");
    await answerAndWait(r, "말이 막히긴 했지만 아예 포기하지는 않았어요.");
    await answerAndWait(r, "오늘은 긴장했지만 끝까지 답했어요.");
    await answerAndWait(r, "예상 질문 세 문장 연습을 하고 싶어요.");

    const babaLines = useRetro
      .getState()
      .turns.filter((t) => t.who === "baba")
      .map((t) => t.text);
    const { balanceSentence, nextAction } = useRetro.getState();

    expect(babaLines).not.toContain(balanceSentence);
    expect(babaLines).not.toContain(nextAction);
    // 둘 다 사용자가 한 말이다
    const myLines = useRetro.getState().turns.filter((t) => t.who === "me").map((t) => t.text);
    expect(myLines).toContain(balanceSentence);
    expect(myLines).toContain(nextAction);
  });

  it("reset 은 회고 한 벌을 통째로 비운다 — 다음 회고에 앞 답이 섞이지 않게", async () => {
    const r = await startWithDirection();
    await answerAndWait(r, "역시 나는 면접을 못하나 봐 하는 생각이 들었어요.");
    await answerAndWait(r, "말이 막히긴 했지만 아예 포기하지는 않았어요.");
    await answerAndWait(r, "오늘은 긴장했지만 끝까지 답했어요.");
    await answerAndWait(r, "예상 질문 세 문장 연습을 하고 싶어요.");

    // 화면이 떠 있는 채로 store 를 비우므로 act 로 감싼다 — 안 그러면 리렌더가 밖에서 돈다
    await act(async () => {
      useRetro.getState().reset();
    });

    expect(useRetro.getState()).toMatchObject({
      startEmotion: null,
      turns: [],
      direction: null,
      balanceSentence: null,
      nextAction: null,
    });
  });
});
