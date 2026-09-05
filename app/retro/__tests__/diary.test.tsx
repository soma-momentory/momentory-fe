import { render, fireEvent, act } from "@testing-library/react-native";
import { router } from "expo-router";

import RetroDone from "../done";
import RetroDraft from "../draft";

import { useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import type { ReplyDiary, ReplyWishCard } from "@/features/retro/data/retroApi";
import { useRetro } from "@/features/retro/model/retro";
import { authedRequest } from "@/lib/http";
import { seedDiaries, testSchedules } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));

// 본문 수정이 서버로 나가는지 보려고 http 만 가짜로 둔다 — store 의 로컬 저장엔 영향 없다
jest.mock("@/lib/http", () => ({
  authedRequest: jest.fn(() => Promise.resolve({ ok: true, data: null })),
}));
const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

/** 서버가 완료 응답에 담아 준 값 — store 가 draft 로 넘긴다 */
const SEED_DIARY: ReplyDiary = {
  diaryId: "77",
  diary: "오늘 모의 면접에서 답이 막혔지만 끝까지 답했다.",
  reframedDiary: "그 한 번이 면접을 못한다는 뜻은 아니다.",
  emotions: ["depressed"], // 일기에서 드러난 감정 태그(= id 8, 우울함)
};
/** 감정 탐색을 거친 바람 카드(v2) — depressed 감정(=id 8, 우울함) */
const SEED_WISH: ReplyWishCard = {
  wishCardId: "88",
  situation: "면접 연습을 시작할 때",
  emotions: ["depressed"],
  needs: [{ word: "존중", meaning: "내 의견이 가볍게 다뤄지지 않길 바라는 마음" }],
  desiredState: null,
  smallAction: "예상 질문 하나를 골라 핵심 세 문장으로 답해보기",
  sentiment: "uncomfortable",
};

/** 완료된 회고 한 벌을 store 에 심는다 — 대화가 끝나야 draft 로 온다 */
const seedCompleted = (diary: ReplyDiary | null, wishCard: ReplyWishCard | null) => {
  useRetro.getState().reset();
  useRetro.setState({ diary, wishCard });
};

beforeEach(() => {
  useDiary.setState({ diaries: [], actionCards: [] });
  seedCompleted(SEED_DIARY, SEED_WISH);
  jest.clearAllMocks();
});

describe("일기 확인 — 기본은 읽기다", () => {
  it("제목 없이 날짜 + 감정 + 본문을 보여준다", async () => {
    const { getByText } = await render(<RetroDraft />);

    expect(getByText("7월 27일의 일기")).toBeTruthy();
    expect(getByText("우울함")).toBeTruthy();
    expect(getByText(SEED_DIARY.diary)).toBeTruthy();
  });

  it("본문 아래 그날 일정을 함께 기록한다", async () => {
    useDay.setState({ schedules: testSchedules() });
    const { getByText } = await render(<RetroDraft />);

    expect(getByText("오늘 일정")).toBeTruthy();
    expect(getByText("팀 회의")).toBeTruthy();
  });

  it("대화 원문을 다시 보여주지 않는다 — 대화는 과정, 일기는 결과", async () => {
    useRetro.getState().addMyTurn("대화에서 내가 한 말");
    const { queryByText } = await render(<RetroDraft />);

    expect(queryByText("대화에서 내가 한 말")).toBeNull();
  });

  it("고치기 전에는 입력창이 없다 — 읽기가 기본이다", async () => {
    const r = await render(<RetroDraft />);

    expect(r.queryByLabelText("일기 본문")).toBeNull();
    expect(r.getByText("직접 고치기")).toBeTruthy();
  });

  it("[직접 고치기] 로 본문을 고칠 수 있고 카운터가 센다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.press(r.getByText("직접 고치기"));

    const input = r.getByLabelText("일기 본문");
    expect(input.props.value).toBe(SEED_DIARY.diary);
    expect(input.props.maxLength).toBe(500);

    const edited = "오늘은 긴장했지만 끝까지 답했다.";
    await fireEvent.changeText(input, edited);

    expect(r.getByText(`${edited.length} / 500`)).toBeTruthy();
  });

  it("고치는 중에는 [수정 완료]가 나오고, 눌러야 읽기로 돌아가 저장 버튼이 보인다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.press(r.getByText("직접 고치기"));

    expect(r.queryByText("일기 저장하기")).toBeNull();
    expect(r.getByText("수정 완료")).toBeTruthy();

    await fireEvent.press(r.getByText("수정 완료"));
    expect(r.queryByLabelText("일기 본문")).toBeNull();
    expect(r.getByText("일기 저장하기")).toBeTruthy();
  });

  it("최소 글자 수를 요구하지 않는다 — 비워도 저장할 수 있다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.press(r.getByText("직접 고치기"));
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "");
    await fireEvent.press(r.getByText("수정 완료"));

    const cta = r.getByRole("button", { name: "일기 저장하기" });
    expect(cta.props.accessibilityState.disabled).toBe(false);
  });

  it("감정이 여럿이면 전부 보여준다 — 하나만 세우면 마음이 바뀐 흐름이 사라진다", async () => {
    // 「우울했는데 라면 먹고 기분 좋아졌어」 — 앞의 감정만 보이면 뒤가 없던 일이 된다.
    seedCompleted({ ...SEED_DIARY, emotions: ["depressed", "happy"] }, SEED_WISH);

    const { getByText } = await render(<RetroDraft />);

    expect(getByText("우울함")).toBeTruthy();
    expect(getByText("행복함")).toBeTruthy();
  });

  it("감정을 보이고 [+] 더하기를 두지 않는다", async () => {
    const { getByText, queryByText } = await render(<RetroDraft />);

    expect(getByText("우울함")).toBeTruthy();
    expect(queryByText("+")).toBeNull();
  });
});

describe("저장 — 일기 한 장과 (있으면) 바람 카드", () => {
  const save = async (body?: string) => {
    const r = await render(<RetroDraft />);
    if (body !== undefined) {
      await fireEvent.press(r.getByText("직접 고치기"));
      await fireEvent.changeText(r.getByLabelText("일기 본문"), body);
      await fireEvent.press(r.getByText("수정 완료"));
    }
    await act(async () => {
      await fireEvent.press(r.getByText("일기 저장하기"));
    });
    return r;
  };

  it("서버 값을 그대로 옮겨 일기와 바람 카드를 남긴다", async () => {
    await save();

    const d = useDiary.getState().diaries[0];
    expect(d?.id).toBe(SEED_DIARY.diaryId);
    expect(d?.body).toBe(SEED_DIARY.diary);
    expect(d?.babaView).toBe(SEED_DIARY.reframedDiary);
    // v2: 시작 감정이 없다 — 감정은 바람 카드에서 온다(depressed = id 8)
    expect(d?.startEmotion).toBeNull();
    expect(d?.emotions).toEqual([8]);

    const card = useDiary.getState().actionCards[0];
    expect(card?.id).toBe(SEED_WISH.wishCardId);
    expect(card?.situation).toBe(SEED_WISH.situation);
    expect(card?.targetAction).toBe(SEED_WISH.smallAction);
  });

  it("서버 회고 세션 id 를 일기에 남긴다", async () => {
    useRetro.setState({ sessionId: 42 });
    await save();

    expect(useDiary.getState().diaries[0]?.retrospectId).toBe("42");
  });

  it("세션 id 가 없으면(로컬만) retrospectId 는 없다", async () => {
    await save();

    expect(useDiary.getState().diaries[0]?.retrospectId).toBeNull();
  });

  it("본문을 고쳐 저장하면 그 회고의 일기 본문을 서버로 보낸다", async () => {
    useRetro.setState({ sessionId: 42 });
    await save("내가 다시 쓴 오늘.");

    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/diaries/by-retrospect/42",
      { original: "내가 다시 쓴 오늘." },
      expect.any(Object),
    );
  });

  it("안 고치면 서버로 본문을 보내지 않는다", async () => {
    useRetro.setState({ sessionId: 42 });
    await save();

    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it("고치면 사용자의 것이 된다", async () => {
    await save("내가 다시 쓴 오늘.");

    const d = useDiary.getState().diaries[0];
    expect(d?.body).toBe("내가 다시 쓴 오늘.");
    expect(d?.authoredBy).toBe("user");
  });

  it("저장하면 완료로 가고, 회고 한 벌은 아직 남아 있다", async () => {
    await save();

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/retro/done");
    expect(useRetro.getState().wishCard).not.toBeNull();
  });

  it("이미 쌓인 일기 뒤에 이어 붙는다 — 13번째 장", async () => {
    seedDiaries();
    await save();

    const { diaries } = useDiary.getState();
    expect(diaries).toHaveLength(13);
    expect(diaries.at(-1)?.ordinal).toBe(13);
  });

  it("두 번 눌러도 일기가 두 장 생기지 않는다", async () => {
    const r = await render(<RetroDraft />);
    const button = r.getByText("일기 저장하기");

    await act(async () => {
      await fireEvent.press(button);
      await fireEvent.press(button);
      await fireEvent.press(button);
    });

    expect(useDiary.getState().diaries).toHaveLength(1);
    expect(useDiary.getState().actionCards).toHaveLength(1);
  });
});

describe("감정 탐색 없이 — 바람 카드도 없다", () => {
  beforeEach(() => {
    useDiary.setState({ diaries: [], actionCards: [] });
    seedCompleted(
      { diaryId: null, diary: "오늘 있었던 일을 짧게 남겼다.", reframedDiary: null, emotions: [] },
      null,
    );
  });

  it("바람 카드가 없어도 화면은 같다 — 읽고, 고치고, 저장한다", async () => {
    const r = await render(<RetroDraft />);

    expect(r.getByText("오늘 있었던 일을 짧게 남겼다.")).toBeTruthy();
    expect(r.getByText("직접 고치기")).toBeTruthy();
    expect(r.getByText("일기 저장하기")).toBeTruthy();
  });

  it("일기만 남기고 바람 카드는 만들지 않는다", async () => {
    const r = await render(<RetroDraft />);
    await act(async () => {
      await fireEvent.press(r.getByText("일기 저장하기"));
    });

    expect(useDiary.getState().diaries).toHaveLength(1);
    expect(useDiary.getState().actionCards).toHaveLength(0);
  });
});

describe("완료 — 허브로 만들지 않는다", () => {
  it("바람 카드가 있으면 체크 · 두 줄 · 카드 · 버튼 둘이다", async () => {
    const { getByText } = await render(<RetroDone />);

    expect(getByText("오늘의 일기를 저장했어요.")).toBeTruthy();
    expect(getByText("오늘 이야기에서 마음을 하나 챙겨봤어요.")).toBeTruthy();
    expect(getByText("7월 27일 카드")).toBeTruthy();
    expect(getByText(SEED_WISH.situation)).toBeTruthy();
    expect(getByText(SEED_WISH.smallAction as string)).toBeTruthy();
    expect(getByText("홈으로 돌아가기")).toBeTruthy();
    expect(getByText("쉼터에서 보기")).toBeTruthy();
  });

  it("카드가 없으면 아무 설명도 하지 않는다 — 「오늘은 카드가 없어요」 금지", async () => {
    seedCompleted(SEED_DIARY, null);
    const { getByText, queryByText } = await render(<RetroDone />);

    expect(getByText("오늘의 일기를 저장했어요.")).toBeTruthy();
    expect(queryByText(/카드가 없|카드는 없/)).toBeNull();
    expect(queryByText("오늘 이야기에서 마음을 하나 챙겨봤어요.")).toBeNull();
    expect(queryByText("쉼터에서 보기")).toBeNull();
  });

  it("점수·연속 일수·배지·축하 연출을 쓰지 않는다", async () => {
    const { queryByText } = await render(<RetroDone />);

    expect(queryByText(/점|연속|일째|축하|달성/)).toBeNull();
  });

  it("나가면 회고 한 벌이 비워진다 — 다음 회고에 앞 대화가 섞이지 않게", async () => {
    const { getByText } = await render(<RetroDone />);

    await fireEvent.press(getByText("홈으로 돌아가기"));

    expect(useRetro.getState().wishCard).toBeNull();
    expect(useRetro.getState().diary).toBeNull();
  });

  it("홈으로 돌아간다", async () => {
    const { getByText } = await render(<RetroDone />);
    await fireEvent.press(getByText("홈으로 돌아가기"));
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });

  it("[쉼터에서 보기] 는 쉼터 바람카드(R2)로 간다", async () => {
    const { getByText } = await render(<RetroDone />);
    await fireEvent.press(getByText("쉼터에서 보기"));
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/rest/cards");
  });
});
