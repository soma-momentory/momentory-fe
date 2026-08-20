import { useDiary } from "@/features/diary/model/diary";
import type { ActionCard, Diary } from "@/features/diary/model/types";
import { authedRequest } from "@/lib/http";

/**
 * 쓰기 경로의 store 규칙 — **지연 삭제**와 **옵티미스틱 완료**. `@/lib/http` 만 목으로
 * 두어 실제 어댑터(`diaryApi`)가 그대로 도는 채로 서버로 나가는 요청을 본다.
 */
jest.mock("@/lib/http", () => ({
  authedRequest: jest.fn(() => Promise.resolve({ ok: true, data: null })),
}));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

const diary = (id: string): Diary => ({
  id,
  date: "2026-08-14",
  body: "본문",
  babaView: null,
  babaViewBasis: null,
  emotions: [1],
  authoredBy: "baba",
  editedAt: null,
  ordinal: 1,
  retrospectId: "10",
  storyEmotion: null,
  startEmotion: 1,
  weather: null,
});

const card = (id: string, diaryId: string): ActionCard => ({
  id,
  diaryId,
  situation: "상황",
  targetAction: "행동",
  done: false,
  doneAt: null,
  reflection: null,
  createdAt: "2026-08-14",
});

const flush = () => new Promise((r) => setTimeout(r, 0));

const calls = (method: string) =>
  mockedRequest.mock.calls.filter((c) => c[0] === method).map((c) => c[1]);

beforeEach(() => {
  mockedRequest.mockReset();
  mockedRequest.mockResolvedValue({ ok: true, data: null });
  useDiary.setState({ diaries: [], actionCards: [], recentlyDeleted: null });
});

describe("지연 삭제", () => {
  it("remove 는 서버로 보내지 않고 카드도 남긴다 · clearRecentlyDeleted 가 커밋한다", () => {
    useDiary.setState({ diaries: [diary("42")], actionCards: [card("7", "42")] });

    useDiary.getState().remove("42");
    expect(useDiary.getState().diaries).toHaveLength(0);
    expect(useDiary.getState().actionCards).toHaveLength(1); // 카드는 남는다
    expect(calls("DELETE")).toHaveLength(0); // 아직 안 보냈다

    useDiary.getState().clearRecentlyDeleted();
    expect(calls("DELETE")).toEqual(["/api/v1/diaries/42"]);
  });

  it("undoRemove 는 서버 삭제를 취소한다", () => {
    useDiary.setState({ diaries: [diary("42")] });
    useDiary.getState().remove("42");
    useDiary.getState().undoRemove();
    expect(useDiary.getState().diaries.find((d) => d.id === "42")).toBeTruthy();

    useDiary.getState().clearRecentlyDeleted();
    expect(calls("DELETE")).toHaveLength(0);
  });

  it("로컬 전용 일기는 서버로 보내지 않는다", () => {
    useDiary.setState({ diaries: [diary("d-local-3")] });
    useDiary.getState().remove("d-local-3");
    useDiary.getState().clearRecentlyDeleted();
    expect(calls("DELETE")).toHaveLength(0);
  });
});

describe("옵티미스틱 완료", () => {
  it("markActionDone 은 먼저 바꾸고 서버로 보낸다", () => {
    useDiary.setState({ actionCards: [card("7", "42")] });
    useDiary.getState().markActionDone("7");
    expect(useDiary.getState().actionCards[0]?.done).toBe(true);
    expect(calls("PUT")).toEqual(["/api/v1/action-cards/7/completion"]);
  });

  it("서버가 거부하면 되돌린다", async () => {
    mockedRequest.mockResolvedValue({
      ok: false,
      error: { code: "http", status: 500, body: null },
    });
    useDiary.setState({ actionCards: [card("7", "42")] });

    useDiary.getState().markActionDone("7");
    expect(useDiary.getState().actionCards[0]?.done).toBe(true); // 낙관적
    await flush();
    expect(useDiary.getState().actionCards[0]?.done).toBe(false); // 거부 → 되돌림
  });

  it("네트워크 실패는 그대로 둔다 — 요청이 못 나간 것", async () => {
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "network" } });
    useDiary.setState({ actionCards: [card("7", "42")] });

    useDiary.getState().markActionDone("7");
    await flush();
    expect(useDiary.getState().actionCards[0]?.done).toBe(true); // 유지
  });

  it("로컬 카드는 서버로 보내지 않는다", () => {
    useDiary.setState({ actionCards: [card("ac-local-1", "d-local-1")] });
    useDiary.getState().markActionDone("ac-local-1");
    expect(useDiary.getState().actionCards[0]?.done).toBe(true);
    expect(calls("PUT")).toHaveLength(0);
  });

  it("saveReflection 은 완료 상태의 서버 카드에만 보낸다", () => {
    useDiary.setState({ actionCards: [{ ...card("7", "42"), done: true, reflection: "한 줄" }] });
    useDiary.getState().saveReflection("7");
    expect(calls("PUT")).toEqual(["/api/v1/action-cards/7/completion"]);

    mockedRequest.mockClear();
    useDiary.setState({ actionCards: [card("8", "42")] }); // 미완료
    useDiary.getState().saveReflection("8");
    expect(calls("PUT")).toHaveLength(0);
  });
});
