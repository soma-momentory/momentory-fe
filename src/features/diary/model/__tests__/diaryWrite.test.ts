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
  emotions: [],
  needs: [],
  desiredState: null,
  sentiment: "uncomfortable",
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
  useDiary.setState({ diaries: [], actionCards: [] });
  useToast.setState({ current: null });
});

const toast = () => useToast.getState().current;

describe("보관함 본문 저장", () => {
  it("서버 저장이 성공한 뒤 본문만 바꾸며 줄바꿈을 보존한다", async () => {
    const before = diary("42");
    useDiary.setState({ diaries: [before], actionCards: [card("7", "42")] });
    const body = "일을 마쳤다.\n뿌듯했다.\n\n산책했다.";
    expect(await useDiary.getState().saveBody("42", body)).toBe("saved");
    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/diaries/by-retrospect/10",
      { original: body },
      expect.any(Object),
    );
    expect(useDiary.getState().diaries[0]).toMatchObject({
      ...before,
      body,
      authoredBy: "user",
      editedAt: expect.any(String),
    });
    expect(useDiary.getState().actionCards).toEqual([card("7", "42")]);
  });

  it.each(["network", "unauthenticated"] as const)(
    "%s 실패 시 기존 본문을 유지한다",
    async (code) => {
      const before = diary("42");
      useDiary.setState({ diaries: [before] });
      mockedRequest.mockResolvedValue({ ok: false, error: { code } });
      expect(await useDiary.getState().saveBody("42", "고친 글")).toBe("failed");
      expect(useDiary.getState().diaries[0]).toEqual(before);
    },
  );

  it.each([" \n ", "가".repeat(501)])(
    "비어 있거나 상한을 넘긴 본문은 보내지 않는다",
    async (body) => {
      useDiary.setState({ diaries: [diary("42")] });
      expect(await useDiary.getState().saveBody("42", body)).toBe("failed");
      expect(mockedRequest).not.toHaveBeenCalled();
    },
  );

  it("로그아웃 뒤 같은 id의 새 일기를 이전 저장 응답으로 덮지 않는다", async () => {
    let resolve!: (r: { ok: true; data: null }) => void;
    mockedRequest.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    useDiary.setState({ diaries: [diary("42")] });
    const saving = useDiary.getState().saveBody("42", "이전 사용자의 글");
    useDiary.getState().reset();
    useDiary.setState({ diaries: [{ ...diary("42"), body: "새 사용자의 글" }] });
    resolve({ ok: true, data: null });
    expect(await saving).toBe("stale");
    expect(useDiary.getState().diaries[0]!.body).toBe("새 사용자의 글");
  });

  it("저장 중 삭제된 일기를 되살리지 않는다", async () => {
    let resolve!: (r: { ok: true; data: null }) => void;
    mockedRequest.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    useDiary.setState({ diaries: [diary("42")] });
    const saving = useDiary.getState().saveBody("42", "고친 글");
    useDiary.setState({ diaries: [] });
    resolve({ ok: true, data: null });
    expect(await saving).toBe("stale");
    expect(useDiary.getState().diaries).toEqual([]);
  });

  it("서버에 없는 로컬 일기는 로컬에서 수정한다", async () => {
    useDiary.setState({ diaries: [{ ...diary("d-local-1"), retrospectId: null }] });
    expect(await useDiary.getState().saveBody("d-local-1", "고친 글")).toBe("saved");
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(useDiary.getState().diaries[0]!.body).toBe("고친 글");
  });
});

/**
 * ⚠ **되돌리기가 없다**(2026-08-21). 예전에는 6초 창 동안 서버 삭제를 미뤘는데,
 * 앞에 확인 모달이 있어 같은 것을 두 번 묻는 셈이었다. 지금은 **그 자리에서 보낸다**.
 */
describe("삭제는 그 자리에서 보낸다", () => {
  it("화면에서 빼고 곧바로 서버로 — 일기와 그 일기의 행동 카드를 함께 지운다", async () => {
    useDiary.setState({ diaries: [diary("42")], actionCards: [card("7", "42")] });

    useDiary.getState().remove("42");
    await flush();

    expect(useDiary.getState().diaries).toHaveLength(0);
    expect(useDiary.getState().actionCards).toHaveLength(0); // 카드도 함께 지운다
    // 일기·카드 둘 다 서버에서 지운다
    expect(calls("DELETE")).toContain("/api/v1/diaries/42");
    expect(calls("DELETE")).toContain("/api/v1/action-cards/7");
    // 토스트는 「일기」 하나만 — 곁딸린 카드 삭제로 두 줄 뜨지 않는다
    expect(toast()).toMatchObject({ message: "일기를 삭제했어요.", variant: "positive" });
  });

  it("다른 일기의 카드는 건드리지 않는다 — diaryId 로만 잇는다", () => {
    useDiary.setState({
      diaries: [diary("42")],
      actionCards: [card("7", "99")], // 다른 일기(99)의 카드
    });

    useDiary.getState().remove("42");

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["7"]);
    expect(calls("DELETE")).toEqual(["/api/v1/diaries/42"]);
  });

  it("카드 삭제가 서버에 못 닿으면 카드만 조용히 되살린다 — 일기 삭제는 그대로", async () => {
    // 일기 삭제는 성공, 카드 삭제만 실패하게 한다
    mockedRequest.mockImplementation((_method, path) =>
      Promise.resolve(
        String(path).includes("/action-cards/")
          ? { ok: false, error: { code: "network" } }
          : { ok: true, data: null },
      ),
    );
    useDiary.setState({ diaries: [diary("42")], actionCards: [card("7", "42")] });

    useDiary.getState().remove("42");
    await flush();

    // 일기는 지워진 채로 두고, 서버에 살아 있는 카드만 되살린다
    expect(useDiary.getState().diaries).toHaveLength(0);
    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["7"]);
    // 실패 토스트로 사용자를 놀래지 않는다 — 곁딸린 카드 삭제는 조용히 처리한다
    expect(toast()).toMatchObject({ message: "일기를 삭제했어요.", variant: "positive" });
  });

  it("없는 일기는 아무 일도 하지 않는다 — 지운 척하지 않는다", () => {
    useDiary.setState({ diaries: [diary("42")] });

    useDiary.getState().remove("없음");

    expect(useDiary.getState().diaries).toHaveLength(1);
    expect(calls("DELETE")).toHaveLength(0);
    expect(toast()).toBeNull();
  });

  it("로컬 전용 일기는 서버로 보내지 않는다 — 지운 순간 이미 끝났다", () => {
    useDiary.setState({ diaries: [diary("d-local-3")] });
    useDiary.getState().remove("d-local-3");
    expect(calls("DELETE")).toHaveLength(0);
    expect(toast()).toMatchObject({ message: "일기를 삭제했어요.", variant: "positive" });
  });

  it("완료 응답이 준 서버 id 로 저장하면 그 일기도 곧바로 서버에서 지워진다", () => {
    // 방금 회고를 끝낸 일기 — save({ id }) 로 서버 id 를 받아 저장한다(로컬 임시 id 가 아니다)
    useDiary.getState().save({
      id: "55",
      date: "2026-08-14",
      body: "본문",
      babaView: null,
      emotions: [1],
      retrospectId: "10",
      edited: false,
    });
    expect(useDiary.getState().diaries[0]?.id).toBe("55");

    useDiary.getState().remove("55");
    expect(calls("DELETE")).toEqual(["/api/v1/diaries/55"]);
  });
});

describe("삭제 결과 한 줄", () => {
  it("서버가 지웠으면 성공 한 줄", async () => {
    useDiary.setState({ diaries: [diary("42")] });
    useDiary.getState().remove("42");
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
    await flush();

    expect(useDiary.getState().diaries.map((d) => d.id)).toEqual(["41", "42"]);
    expect(toast()).toMatchObject({ message: "일기를 삭제하지 못했어요.", variant: "negative" });
  });
});

/**
 * 바람카드 삭제 — 서버가 준 카드는 서버에서 지운다(`DELETE /action-cards/{id}`).
 * 로컬 전용 카드만 기기 묘비로 처리한다(`deletedCards.test.ts` 가 그 경로를 본다).
 */
describe("바람카드 삭제", () => {
  it("서버 카드는 그 id 로 서버에서 지운다 — 일기는 건드리지 않는다", async () => {
    useDiary.setState({ diaries: [diary("42")], actionCards: [card("7", "42")] });

    useDiary.getState().removeActionCard("7");
    await flush();

    expect(calls("DELETE")).toEqual(["/api/v1/action-cards/7"]);
    expect(useDiary.getState().actionCards).toHaveLength(0);
    // 카드와 일기는 서로의 삭제를 부르지 않는다
    expect(useDiary.getState().diaries).toHaveLength(1);
    expect(toast()).toMatchObject({ message: "바람카드를 삭제했어요.", variant: "positive" });
  });

  it("서버가 받지 못하면 카드를 되살리고 실패 한 줄 — 서버에 살아 있는 것을 감추지 않는다", async () => {
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "network" } });
    useDiary.setState({ actionCards: [card("7", "42")] });

    useDiary.getState().removeActionCard("7");
    await flush();

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["7"]);
    expect(toast()).toMatchObject({
      message: "바람카드를 삭제하지 못했어요.",
      variant: "negative",
    });
  });
  // 로컬 전용 카드(서버 id 없음)의 기기 묘비 경로는 `deletedCards.test.ts` 가 본다.
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
