import { act, fireEvent, render, within } from "@testing-library/react-native";
import { useDiary } from "@/features/diary/model/diary";
import { toDiary } from "@/features/diary/data/diaryApi";
import { useRetro } from "@/features/retro/model/retro";
import { useLetters } from "@/features/letter/model/letter";
import { authedRequest } from "@/lib/http";
import DiaryDetail from "../[id]/index";
import RetroDraft from "../../retro/draft";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
  useLocalSearchParams: () => ({ id: "81" }),
}));
jest.mock("@/features/diary/model/useDiaryWeather", () => ({
  useDiaryWeather: () => ({ weather: null, status: null }),
}));
jest.mock("@/features/letter/data/letterApi", () => ({
  fetchLetters: jest.fn(async () => ({ ok: true, data: [] })),
  fetchLetter: jest.fn(async () => ({ ok: false })),
}));
jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const original = {
  id: 81,
  retrospectId: 10,
  original: "친구와 저녁을 먹었다.",
  createdAt: "2026-07-27T12:00:00Z",
  primaryEmotion: "joy",
  emotions: ["joy"],
  events: [
    { eventId: 1, label: "친구와 만남", summary: "친구와 저녁을 먹었다", emotions: ["joy"] },
  ],
  unlinkedEmotions: [],
  emotionClassificationChanged: false,
};
const corrected = {
  ...original,
  primaryEmotion: "calm",
  emotions: ["calm", "sad"],
  events: [{ ...original.events[0], emotions: ["calm"] }],
  unlinkedEmotions: ["sad"],
  emotionClassificationChanged: true,
};

beforeEach(() => {
  useDiary.getState().reset();
  useRetro.getState().reset();
  useLetters.setState({ userId: 7, summaries: [], letters: {} });
  jest.mocked(authedRequest).mockReset();
  jest.mocked(authedRequest).mockImplementation(async (method) => ({
    ok: true,
    data: method === "PUT" ? corrected : original,
  }));
});

it.each(["chat", "archive"])(
  "%s 상세에서 사건별 감정과 사건 없는 감정을 함께 수정한다",
  async (route) => {
    if (route === "chat") {
      useRetro.setState({
        sessionId: 10,
        diary: { diaryId: "81", diary: original.original, reframedDiary: null, emotions: ["joy"] },
        wishCard: null,
      });
    } else useDiary.setState({ diaries: [toDiary(original)!] });
    const r = await render(route === "chat" ? <RetroDraft /> : <DiaryDetail />);
    await act(async () => {});
    await fireEvent.press(r.getByLabelText("기쁨 감정 스티커"));
    expect(r.getByTestId("diary-emotion-caption")).toHaveTextContent("친구와 만남 - 기쁨");
    expect(r.queryByText("감정 수정하기")).toBeNull();
    if (route === "archive") await fireEvent.press(r.getByLabelText("일기 수정"));
    else await fireEvent.press(r.getByText("직접 고치기"));
    await fireEvent.press(r.getByText("감정 수정하기"));
    await fireEvent.press(r.getByText("기쁨"));
    await fireEvent.press(r.getByText("평온"));
    await fireEvent.press(r.getByText("사건 없이 느낀 감정"));
    await fireEvent.press(r.getByText("슬픔"));
    await fireEvent.press(r.getByText("감정 저장하기"));
    expect(authedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/diaries/81/emotions",
      {
        events: [{ eventId: 1, emotions: ["calm"] }],
        unlinkedEmotions: ["sad"],
      },
      expect.anything(),
    );
    expect(r.queryByText("감정 저장하기")).toBeNull();
    expect(r.queryByText("직접 수정한 감정이에요")).toBeNull();
    await fireEvent.press(r.getByLabelText("슬픔 감정 스티커"));
    expect(r.getByTestId("diary-emotion-caption")).toHaveTextContent("사건 없이 느낀 감정 - 슬픔");
    await fireEvent.press(r.getByText("감정 수정하기"));
    await fireEvent.press(r.getByRole("button", { name: "사건 없이 느낀 감정 - 슬픔" }));
    expect(r.getByRole("button", { name: "슬픔", selected: true })).toBeTruthy();
    await fireEvent.press(within(r.getByTestId("ds-bottom-sheet")).getByText("취소"));
    if (route === "chat") {
      await fireEvent.press(r.getByText("수정 완료"));
      expect(r.queryByText("감정 수정하기")).toBeNull();
      await fireEvent.press(r.getByText("일기 저장하기"));
    }
    const saved = useDiary.getState().diaries.find((diary) => diary.id === "81");
    expect(saved?.emotions).toEqual([2, 5]);
    expect(saved?.emotionClassificationChanged).toBe(true);
    expect(saved?.body).toBe(original.original);
  },
);

it("서버 저장 실패 시 기존 일기 감정은 유지하고 선택한 초안으로 다시 저장할 수 있다", async () => {
  useDiary.setState({ diaries: [toDiary(original)!] });
  const r = await render(<DiaryDetail />);
  await act(async () => {});
  await fireEvent.press(r.getByLabelText("일기 수정"));
  await fireEvent.press(r.getByText("감정 수정하기"));
  await fireEvent.press(r.getByText("평온"));
  jest.mocked(authedRequest).mockResolvedValueOnce({ ok: false, error: { code: "network" } });
  await fireEvent.press(r.getByText("감정 저장하기"));
  expect(r.getByText("감정을 저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.")).toBeTruthy();
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([1]);
  expect(r.getByRole("button", { name: "평온", selected: true })).toBeTruthy();
  await fireEvent.press(within(r.getByTestId("ds-bottom-sheet")).getByText("취소"));
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([1]);
});

it("직접 작성 본문을 바꾸면 같은 상세 화면의 감정 편집에도 새 사건이 나타난다", async () => {
  const before = { ...corrected, retrospectId: null, emotionClassificationChanged: false };
  const after = {
    ...before,
    original: "회의에 참석했다.",
    events: [{ eventId: 1, label: "직장 회의", summary: "회의에 참석했다", emotions: [] }],
    unlinkedEmotions: ["calm", "sad"],
  };
  useDiary.setState({ diaries: [toDiary(before)!] });
  jest
    .mocked(authedRequest)
    .mockImplementation(async (method) => ({ ok: true, data: method === "PUT" ? after : before }));
  const r = await render(<DiaryDetail />);
  await act(async () => {});
  await fireEvent.press(r.getByLabelText("일기 수정"));
  await fireEvent.changeText(r.getByLabelText("일기 본문"), after.original);
  await fireEvent.press(r.getByText("수정 저장하기"));
  expect(r.queryByText("감정 수정하기")).toBeNull();
  await fireEvent.press(r.getByLabelText("일기 수정"));
  await fireEvent.press(r.getByText("감정 수정하기"));
  expect(r.getByText("직장 회의 - 선택한 감정 없음")).toBeTruthy();
  expect(r.queryByText(/친구와 만남 -/)).toBeNull();
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([2, 5]);
});
