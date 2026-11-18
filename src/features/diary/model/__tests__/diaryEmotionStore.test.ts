import { useDiary } from "../diary";
import { authedRequest } from "@/lib/http";
import { toDiary } from "@/features/diary/data/diaryApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));
const raw = {
  id: 81,
  original: "일기 본문",
  createdAt: "2026-07-27T12:00:00Z",
  emotions: ["joy"],
  events: [],
  unlinkedEmotions: ["joy"],
  emotionClassificationChanged: false,
};

beforeEach(() => {
  useDiary.getState().reset();
  jest.mocked(authedRequest).mockReset();
});

it.each(["load", "save"])(
  "%s 응답을 기다리다 로그아웃하면 새 세션에 이전 감정을 반영하지 않는다",
  async (mode) => {
    useDiary.setState({ diaries: [toDiary(raw)!] });
    let resolve!: (value: { ok: true; data: typeof raw }) => void;
    jest.mocked(authedRequest).mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending =
      mode === "load"
        ? useDiary.getState().loadEmotions("81")
        : useDiary.getState().saveEmotions("81", { events: [], unlinkedEmotions: [1] });
    useDiary.getState().reset();
    useDiary.setState({ diaries: [{ ...toDiary(raw)!, body: "다른 세션의 일기", emotions: [5] }] });
    resolve({ ok: true, data: raw });
    expect(await pending).toBeNull();
    expect(useDiary.getState().diaries[0]?.emotions).toEqual([5]);
    expect(useDiary.getState().diaries[0]?.body).toBe("다른 세션의 일기");
  },
);

it("감정 저장 응답은 동시에 고친 본문을 덮지 않는다", async () => {
  useDiary.setState({ diaries: [{ ...toDiary(raw)!, body: "편집한 본문" }] });
  jest.mocked(authedRequest).mockResolvedValue({
    ok: true,
    data: { ...raw, emotions: ["calm"], unlinkedEmotions: ["calm"] },
  });
  await useDiary.getState().saveEmotions("81", { events: [], unlinkedEmotions: [2] });
  expect(useDiary.getState().diaries[0]?.body).toBe("편집한 본문");
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([2]);
});

it("최초 감정을 복원한 저장 응답의 false를 반영한다", async () => {
  useDiary.setState({
    diaries: [
      toDiary({
        ...raw,
        emotions: ["calm"],
        unlinkedEmotions: ["calm"],
        emotionClassificationChanged: true,
      })!,
    ],
  });
  jest.mocked(authedRequest).mockResolvedValueOnce({ ok: true, data: raw });
  await useDiary.getState().saveEmotions("81", { events: [], unlinkedEmotions: [1] });
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([1]);
  expect(useDiary.getState().diaries[0]?.emotionClassificationChanged).toBe(false);
});
