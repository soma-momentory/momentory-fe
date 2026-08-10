import { render, fireEvent, act } from "@testing-library/react-native";
import { router } from "expo-router";

import RetroDone from "../done";
import RetroDraft from "../draft";

import { useDiary } from "@/features/diary/model/diary";
import type { ReplyActionCard, ReplyDiary } from "@/features/retro/data/retroApi";
import { useRetro } from "@/features/retro/model/retro";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));

/** 서버가 완료 응답에 담아 준 값 — store 가 draft 로 넘긴다 */
const SEED_DIARY: ReplyDiary = {
  diary: "오늘 모의 면접에서 답이 막혔지만 끝까지 답했다.",
  reframedDiary: "그 한 번이 면접을 못한다는 뜻은 아니다.",
};
const SEED_ACTION: ReplyActionCard = {
  situation: "면접 연습을 시작할 때",
  action: "예상 질문 하나를 골라 핵심 세 문장으로 답해보기",
  detail: null,
  createdDate: null,
};

/** 완료된 회고 한 벌을 store 에 심는다 — 대화가 끝나야 draft 로 온다 */
const seedCompleted = (diary: ReplyDiary | null, actionCard: ReplyActionCard | null) => {
  useRetro.getState().reset();
  useRetro.setState({ startEmotion: 2, diary, actionCard }); // 우울함
};

beforeEach(() => {
  // 저장 자체를 보는 테스트라 보관함 샘플 12편은 치운다
  useDiary.setState({ diaries: [], actionCards: [] });
  seedCompleted(SEED_DIARY, SEED_ACTION);
  jest.clearAllMocks();
});

describe("C6 · 일기 초안 — 첫 면은 사용자의 것이다", () => {
  it("두 면을 세그먼트로 나눈다 — 한 화면에 섞지 않는다", async () => {
    const { getByText } = await render(<RetroDraft />);

    expect(getByText("내가 남긴 오늘")).toBeTruthy();
    expect(getByText("바바가 함께 본 오늘")).toBeTruthy();
    expect(getByText("7월 27일 월요일 · 오늘의 회고")).toBeTruthy();
  });

  it("서버 초안을 고칠 수 있고 카운터가 센다", async () => {
    const r = await render(<RetroDraft />);
    const input = r.getByLabelText("일기 본문");

    expect(input.props.value).toBe(SEED_DIARY.diary);
    expect(input.props.maxLength).toBe(500);

    const edited = "오늘은 긴장했지만 끝까지 답했다.";
    await fireEvent.changeText(input, edited);

    expect(r.getByText(`${edited.length} / 500`)).toBeTruthy();
  });

  it("최소 글자 수를 요구하지 않는다 — 비워도 다음으로 간다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "");

    const style = [r.getByText("다음").parent?.props.style].flat(Infinity).filter(Boolean);
    expect(Object.assign({}, ...style).opacity).toBeUndefined();
  });

  it("시작 감정 알약을 보이고 [+] 더하기를 두지 않는다", async () => {
    const { getByText, queryByText } = await render(<RetroDraft />);

    expect(getByText("우울함")).toBeTruthy();
    expect(queryByText("+")).toBeNull();
  });

  it("바바 면에 관점과 행동 카드가 있다", async () => {
    const r = await render(<RetroDraft />);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));

    expect(r.getByText(SEED_DIARY.reframedDiary!)).toBeTruthy();
    expect(r.getByText("오늘 만든 행동 카드")).toBeTruthy();
    expect(r.getByText(SEED_ACTION.situation)).toBeTruthy();
    expect(r.getByText(SEED_ACTION.action)).toBeTruthy();
  });
});

describe("C6-b · 저장 — 일기 한 장과 (있으면) 행동 카드", () => {
  const save = async (body?: string) => {
    const r = await render(<RetroDraft />);
    if (body !== undefined) await fireEvent.changeText(r.getByLabelText("일기 본문"), body);
    await fireEvent.press(r.getByText("바바가 함께 본 오늘"));
    await act(async () => {
      await fireEvent.press(r.getByText("오늘 일기 저장하기"));
    });
    return r;
  };

  it("서버 값을 그대로 옮겨 일기와 행동 카드를 남긴다", async () => {
    await save();

    const d = useDiary.getState().diaries[0];
    expect(d?.body).toBe(SEED_DIARY.diary);
    expect(d?.babaView).toBe(SEED_DIARY.reframedDiary);
    expect(d?.startEmotion).toBe(2);
    expect(d?.emotions).toEqual([2]);

    const card = useDiary.getState().actionCards[0];
    expect(card?.situation).toBe(SEED_ACTION.situation);
    expect(card?.targetAction).toBe(SEED_ACTION.action);
  });

  it("서버 회고 세션 id 를 일기에 남긴다 — 나중에 서버 저장분을 되불러오는 열쇠다", async () => {
    useRetro.setState({ sessionId: 42 });
    await save();

    expect(useDiary.getState().diaries[0]?.retrospectId).toBe("42");
  });

  it("세션 id 가 없으면(로컬만) retrospectId 는 없다", async () => {
    await save();

    expect(useDiary.getState().diaries[0]?.retrospectId).toBeNull();
  });

  it("고치면 사용자의 것이 된다", async () => {
    await save("내가 다시 쓴 오늘.");

    const d = useDiary.getState().diaries[0];
    expect(d?.body).toBe("내가 다시 쓴 오늘.");
    expect(d?.authoredBy).toBe("user");
  });

  it("저장하면 회고 한 벌을 비우고 완료로 간다", async () => {
    await save();

    expect(useRetro.getState().startEmotion).toBeNull();
    expect(useRetro.getState().diary).toBeNull();
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/retro/done");
  });

  it("이미 쌓인 일기 뒤에 이어 붙는다 — 13번째 장", async () => {
    useDiary.getState().reset(); // 데모 시작값(12편)
    await save();

    const { diaries } = useDiary.getState();
    expect(diaries).toHaveLength(13);
    expect(diaries.at(-1)?.ordinal).toBe(13);
  });

  it("두 번 눌러도 일기가 두 장 생기지 않는다", async () => {
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
});

describe("짧은 기록형 — 리프레이밍도 행동 카드도 없다", () => {
  beforeEach(() => {
    useDiary.setState({ diaries: [], actionCards: [] });
    // reframedDiary·actionCard 없이 일기 한 장만
    seedCompleted({ diary: "오늘 있었던 일을 짧게 남겼다.", reframedDiary: null }, null);
  });

  it("한 면만 그린다 — 세그먼트를 두지 않는다", async () => {
    const r = await render(<RetroDraft />);

    // 세그먼트 라벨이 없다 — 면이 하나뿐이라 오갈 데가 없다
    expect(r.queryByText("내가 남긴 오늘")).toBeNull();
    expect(r.queryByText("바바가 함께 본 오늘")).toBeNull();
    // 내 문장 편집기와 바로 저장 버튼만 있다
    expect(r.getByLabelText("일기 본문")).toBeTruthy();
    expect(r.getByText("오늘 일기 저장하기")).toBeTruthy();
  });

  it("일기만 남기고 행동 카드는 만들지 않는다", async () => {
    const r = await render(<RetroDraft />);
    await act(async () => {
      await fireEvent.press(r.getByText("오늘 일기 저장하기"));
    });

    expect(useDiary.getState().diaries).toHaveLength(1);
    expect(useDiary.getState().diaries[0]?.babaView).toBeNull();
    expect(useDiary.getState().actionCards).toHaveLength(0);
  });
});

describe("C7 · 완료 — 허브로 만들지 않는다", () => {
  it("체크 하나, 두 줄, 버튼 하나다", async () => {
    const { getByText } = await render(<RetroDone />);

    expect(getByText("오늘도 잘 담아냈어요")).toBeTruthy();
    expect(getByText("오늘의 일기와 내일 해볼 행동을 함께 남겼어요.")).toBeTruthy();
    expect(getByText("홈으로 돌아가기")).toBeTruthy();
  });

  it("다음 행동 제안을 두지 않는다", async () => {
    const { queryByText } = await render(<RetroDone />);
    expect(queryByText(/쉼터|행동 카드 보러|바로 해보기|다시 회고/)).toBeNull();
  });

  it("홈으로 돌아간다", async () => {
    const { getByText } = await render(<RetroDone />);
    await fireEvent.press(getByText("홈으로 돌아가기"));
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });
});
