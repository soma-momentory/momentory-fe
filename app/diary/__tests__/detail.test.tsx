import { render, fireEvent, act } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import DiaryDetail from "../[id]/index";

import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import { authedRequest } from "@/lib/http";
import { fetchLetter } from "@/features/letter/data/letterApi";
import { keepWords, useLetters } from "@/features/letter/model/letter";
import { clock } from "@/lib/clock";
import { getLocationPermission, locateRounded, requestLocationPermission } from "@/lib/location";
import { seedDiaries } from "@/testing/fixtures";

/** 7월 27일 일기 — 바바의 면·근거·행동 카드가 다 붙어 있는 한 장 */
const ID = "d-fixture-27";
let mockParams: { id: string } = { id: ID };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
  useLocalSearchParams: () => mockParams,
}));

jest.mock("@/features/letter/data/letterApi", () => ({
  fetchLetters: jest.fn(async () => ({ ok: true, data: [] })),
  fetchLetter: jest.fn(async () => ({ ok: false })),
}));
jest.mock("@/features/auth/model/auth", () => ({
  ...jest.requireActual("@/features/auth/model/auth"),
  currentUserId: jest.fn(async () => 7),
}));
jest.mock("@/lib/location", () => ({
  getLocationPermission: jest.fn(async () => "granted"),
  requestLocationPermission: jest.fn(async () => "granted"),
  locateRounded: jest.fn(async () => ({ kind: "located", latitude: 37.5, longitude: 127 })),
}));
jest.mock("@/lib/http", () => ({
  authedRequest: jest.fn(async () => ({ ok: true, data: null })),
}));

beforeEach(() => {
  mockParams = { id: ID };
  useLetters.setState({ userId: 7, summaries: [], letters: {} });
  seedDiaries();
  jest.clearAllMocks();
  jest.mocked(authedRequest).mockReset();
  jest.mocked(authedRequest).mockResolvedValue({ ok: true, data: null });
});

describe("A3 · 내가 남긴 오늘 + 행동 카드", () => {
  it("오늘 날씨가 없는 서버 일기를 열어도 위치를 묻거나 날씨를 기록하지 않는다(2026-11-11)", async () => {
    mockParams = { id: "123" };
    useDiary.setState((st) => ({
      diaries: st.diaries.map((d) =>
        d.id === ID ? { ...d, id: "123", date: clock.today(), weather: null } : d,
      ),
    }));

    const r = await render(<DiaryDetail />);
    await act(async () => {});

    expect(requestLocationPermission).not.toHaveBeenCalled();
    expect(getLocationPermission).not.toHaveBeenCalled();
    expect(locateRounded).not.toHaveBeenCalled();
    expect(authedRequest).not.toHaveBeenCalledWith(
      "PUT",
      expect.stringContaining("/weather"),
      expect.anything(),
      expect.anything(),
    );
    expect(r.queryByLabelText(/날씨/)).toBeNull();
  });

  it("「내가 남긴 오늘」 한 면만 둔다 — 바바 면은 상세에서 뺐다(2026-08-20)", async () => {
    const r = await render(<DiaryDetail />);

    // 내가 쓴 본문은 보이고, 바바 면(칩·주의 줄)은 아예 없다
    expect(r.queryByText("바바가 함께 본 오늘")).toBeNull();
    expect(r.queryByText(/회고를 마친 당시의 대화를 바탕으로/)).toBeNull();
  });

  it("저장된 일기의 문장 줄바꿈과 맥락 사이 빈 줄을 그대로 표시한다", async () => {
    const body = "회의가 길었다.\n집중하느라 피곤했다.\n\n저녁에는 산책을 했다.\n기분이 나아졌다.";
    useDiary.setState((st) => ({
      diaries: st.diaries.map((d) => (d.id === ID ? { ...d, body } : d)),
    }));

    const r = await render(<DiaryDetail />);

    expect(r.getByText(body, { exact: true })).toBeTruthy();
  });

  it("감정이 여럿이면 전부 보여준다 — 회고 직후 화면과 같은 줄이다", async () => {
    // 「우울했는데 라면 먹고 기분 좋아졌어」 — 앞의 감정만 세우면 뒤가 없던 일이 된다.
    useDiary.setState((st) => ({
      diaries: st.diaries.map((d) => (d.id === ID ? { ...d, emotions: [5, 1] } : d)),
    }));

    const r = await render(<DiaryDetail />);

    expect(r.getByRole("button", { name: "슬픔 감정 스티커" })).toBeTruthy();
    expect(r.getByRole("button", { name: "기쁨 감정 스티커" })).toBeTruthy();
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

  it("상단에서 본문 수정과 삭제를 바로 연다", async () => {
    const r = await render(<DiaryDetail />);

    expect(r.getByLabelText("일기 삭제")).toBeTruthy();
    expect(r.queryByLabelText("더보기")).toBeNull();
    expect(r.getByRole("button", { name: "일기 수정" })).toBeTruthy();
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

  it("오늘 일기의 카드는 비어 있는 작은 행동을 다음 날 편지로 예고한다", async () => {
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
          targetAction: null,
          done: false,
          doneAt: null,
          reflection: null,
          createdAt: "2026-07-27T21:00:00",
        },
      ],
    }));
    const r = await render(<DiaryDetail />);

    expect(r.getByText("내일 아침 바바가 골라 올게요")).toBeTruthy();
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

describe("보관함 일기 본문 수정", () => {
  const original = () => useDiary.getState().diaries.find((d) => d.id === ID)!;
  beforeEach(() => {
    useDiary.setState((s) => ({
      diaries: s.diaries.map((d) => (d.id === ID ? { ...d, retrospectId: "10" } : d)),
    }));
  });

  it("줄바꿈을 유지해 저장하고 감정·날짜·바람 카드는 그대로 둔다", async () => {
    const before = original();
    const cards = useDiary.getState().actionCards;
    const body = "오늘 일을 마쳤다.\n뿌듯했다.\n\n저녁에는 산책했다.";
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    expect(r.getByLabelText("일기 본문").props.value).toBe(before.body);
    await fireEvent.changeText(r.getByLabelText("일기 본문"), body);
    await fireEvent.press(r.getByText("수정 저장하기"));
    expect(authedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/diaries/by-retrospect/10",
      { original: body },
      expect.any(Object),
    );
    expect(original()).toMatchObject({
      body,
      emotions: before.emotions,
      date: before.date,
      authoredBy: "user",
    });
    expect(useDiary.getState().actionCards).toEqual(cards);
    expect(r.queryByLabelText("일기 본문")).toBeNull();
    expect(r.getByText(body, { exact: true })).toBeTruthy();
  });

  it("취소하면 저장 요청 없이 원래 본문으로 돌아간다", async () => {
    const before = original().body;
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "취소할 글");
    await fireEvent.press(r.getByText("취소"));
    expect(original().body).toBe(before);
    expect(authedRequest).not.toHaveBeenCalled();
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    expect(r.getByLabelText("일기 본문").props.value).toBe(before);
  });

  it("편집 중 뒤로가기는 저장 없이 읽기로 돌아간다", async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "버릴 글");
    await fireEvent.press(r.getByLabelText("뒤로"));
    expect(r.queryByLabelText("일기 본문")).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
    expect(authedRequest).not.toHaveBeenCalled();
  });

  it("공백뿐인 본문은 저장할 수 없고 입력 상한은 500자다", async () => {
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    expect(r.getByLabelText("일기 본문").props.maxLength).toBe(500);
    await fireEvent.changeText(r.getByLabelText("일기 본문"), " \n ");
    await fireEvent.press(r.getByText("수정 저장하기"));
    expect(authedRequest).not.toHaveBeenCalled();
  });

  it("실패하면 입력과 기존 본문을 보존하고 다시 저장할 수 있다", async () => {
    const before = original().body;
    jest.mocked(authedRequest).mockResolvedValueOnce({ ok: false, error: { code: "network" } });
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "다시 저장할 글");
    await fireEvent.press(r.getByText("수정 저장하기"));
    expect(r.getByRole("alert")).toBeTruthy();
    expect(r.getByLabelText("일기 본문").props.value).toBe("다시 저장할 글");
    expect(original().body).toBe(before);
    await fireEvent.press(r.getByText("수정 저장하기"));
    expect(original().body).toBe("다시 저장할 글");
    expect(r.queryByRole("alert")).toBeNull();
  });

  it("저장을 기다릴 때 입력·취소·중복 저장을 막는다", async () => {
    let resolve!: (r: { ok: true; data: null }) => void;
    jest.mocked(authedRequest).mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const r = await render(<DiaryDetail />);
    await fireEvent.press(r.getByRole("button", { name: "일기 수정" }));
    await fireEvent.changeText(r.getByLabelText("일기 본문"), "저장할 글");
    await fireEvent.press(r.getByText("수정 저장하기"));
    expect(r.getByLabelText("일기 본문").props.editable).toBe(false);
    await fireEvent.press(r.getByText("저장 중…"));
    await fireEvent.press(r.getByText("취소"));
    expect(authedRequest).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ ok: true, data: null }));
    expect(r.queryByLabelText("일기 본문")).toBeNull();
  });
});

describe("A3 · 바바의 편지 칸(2026-10-27)", () => {
  const date = () => useDiary.getState().diaries.find((d) => d.id === ID)!.date;

  it("그 날짜 편지가 없으면 칸도 없다", async () => {
    const r = await render(<DiaryDetail />);

    expect(r.queryByText("바바의 편지")).toBeNull();
  });

  it("편지가 있으면 테이프로 붙인 「바바의 편지」 쪽지 — 인용 미리보기 · 접힌 귀 · 누르면 편지", async () => {
    useLetters.setState({
      summaries: [{ id: "12", date: date(), isNew: true, openedAt: null }],
    });
    jest.mocked(fetchLetter).mockResolvedValueOnce({
      ok: true,
      data: {
        id: "12",
        date: date(),
        status: "READY",
        quote: "생각보다 괜찮았어",
        insight: "준비한 만큼 말이 나온 날이었을지도 몰라요.",
        tonightQuestion: null,
        actions: [],
        helplines: [],
        isNew: true,
        openedAt: null,
      },
    });
    const r = await render(<DiaryDetail />);

    expect(r.getByText("바바의 편지")).toBeTruthy(); // 테이프 글씨
    expect(await r.findByText(keepWords("「생각보다 괜찮았어」"))).toBeTruthy();
    expect(r.getByTestId("letter-entry-dogear")).toBeTruthy();
    await fireEvent.press(r.getByRole("button", { name: /^바바의 편지 열기/ }));
    expect(router.push).toHaveBeenCalledWith(`/letter/${date()}?source=diary_detail`);
  });

  it("편지 내용을 못 받아도 칸은 남는다 — 날짜와 서명만", async () => {
    useLetters.setState({
      summaries: [{ id: "12", date: date(), isNew: false, openedAt: "2026-07-28T00:00:00Z" }],
    });
    const r = await render(<DiaryDetail />);

    expect(r.getByText("바바가")).toBeTruthy();
    expect(r.queryByTestId("letter-entry-dogear")).toBeNull();
  });
});
