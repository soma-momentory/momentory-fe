import { useDiary } from "@/features/diary/model/diary";
import type { ActionCard, Diary } from "@/features/diary/model/types";
import { authedRequest } from "@/lib/http";
import { useToast } from "@/lib/toast";

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
  useToast.setState({ current: null });
});

const toast = () => useToast.getState().current;

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

  it("로컬 전용 일기는 서버로 보내지 않는다 — 지운 순간 이미 끝났다", () => {
    useDiary.setState({ diaries: [diary("d-local-3")] });
    useDiary.getState().remove("d-local-3");
    useDiary.getState().clearRecentlyDeleted();
    expect(calls("DELETE")).toHaveLength(0);
    expect(toast()).toMatchObject({ message: "일기를 삭제했어요.", variant: "positive" });
  });
});

describe("삭제 결과 한 줄", () => {
  it("서버가 지웠으면 성공 한 줄", async () => {
    useDiary.setState({ diaries: [diary("42")] });
    useDiary.getState().remove("42");
    useDiary.getState().clearRecentlyDeleted();
    await flush();

    expect(toast()).toMatchObject({ message: "일기를 삭제했어요.", variant: "positive" });
    expect(useDiary.getState().diaries).toHaveLength(0);
  });

  it("실패하면 일기를 **원래 순서로 되돌리고** 실패 한 줄 — 서버에 살아 있는 것을 감추지 않는다", async () => {
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "network" } });
    useDiary.setState({
      diaries: [
        { ...diary("41"), ordinal: 1 },
        { ...diary("42"), ordinal: 2 },
      ],
    });

    useDiary.getState().remove("41");
    useDiary.getState().clearRecentlyDeleted();
    await flush();

    expect(useDiary.getState().diaries.map((d) => d.id)).toEqual(["41", "42"]);
    expect(toast()).toMatchObject({ message: "일기를 삭제하지 못했어요.", variant: "negative" });
  });

  it("되돌리면 아무것도 알리지 않는다 — 지운 일이 없다", () => {
    useDiary.setState({ diaries: [diary("42")] });
    useDiary.getState().remove("42");
    useDiary.getState().undoRemove();
    useDiary.getState().clearRecentlyDeleted();

    expect(toast()).toBeNull();
  });
});

/**
 * 행동카드 삭제는 **기기 삭제**라 서버로 나가는 것이 없다 — 규칙 전체는
 * `deletedCards.test.ts` 가 본다. 여기서는 「이 경로가 서버를 부르지 않는다」만 지킨다.
 */
describe("행동카드 삭제는 서버를 부르지 않는다", () => {
  it("계약에 `DELETE /action-cards/{id}` 가 없다 (`PRODUCT.md` 「상류와 차이」 25)", async () => {
    useDiary.setState({ diaries: [diary("42")], actionCards: [card("7", "42")] });

    useDiary.getState().removeActionCard("7");
    await flush();

    expect(calls("DELETE")).toHaveLength(0);
    // 카드와 일기는 서로의 삭제를 부르지 않는다
    expect(useDiary.getState().diaries).toHaveLength(1);
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
