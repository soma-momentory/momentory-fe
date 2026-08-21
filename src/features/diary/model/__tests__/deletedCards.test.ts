import { SESSION_KEY } from "@/features/auth/model/auth";
import { loadArchive } from "@/features/diary/data/diaryApi";
import { useDiary } from "@/features/diary/model/diary";
import type { ActionCard } from "@/features/diary/model/types";
import { useToast } from "@/lib/toast";

/**
 * 행동카드 삭제 — **기기 삭제**의 규칙.
 *
 * 서버 계약에 `DELETE /api/v1/action-cards/{id}` 가 없어(`docs/api/openapi.json`)
 * 지운 id 를 기기에 남기고 `load()` 가 걸러낸다(`data/deletedCardStore.ts` ·
 * `docs/PRODUCT.md` 「상류와 차이」 25). 여기서 지키는 것은 셋이다:
 *
 * 1. **다시 조회해도 되살아나지 않는다** — 남기지 않으면 「삭제했어요」가 거짓말이 된다
 * 2. **남긴 뒤에야 성공이라고 말한다** — 못 남기면 되돌리고 실패 한 줄
 * 3. **묘비는 사용자별이다** — 카드 id 는 서버의 전역 번호다
 */
jest.mock("@/features/diary/data/diaryApi", () => ({
  ...jest.requireActual("@/features/diary/data/diaryApi"),
  loadArchive: jest.fn(),
  deleteDiary: jest.fn(() => Promise.resolve({ ok: true })),
  putActionCardCompletion: jest.fn(() => Promise.resolve({ ok: true })),
}));

const mockedLoad = loadArchive as jest.MockedFunction<typeof loadArchive>;

type SecureMock = {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const USER_ID = 7;
const TOMBSTONE_KEY = `momentory.diary.deletedCards.${USER_ID}`;

const card = (id: string): ActionCard => ({
  id,
  diaryId: "d-1",
  situation: "상황",
  targetAction: "행동",
  done: false,
  doneAt: null,
  reflection: null,
  createdAt: "2026-08-14",
});

const flush = () => new Promise((r) => setTimeout(r, 0));
const toast = () => useToast.getState().current;

beforeEach(() => {
  secure.__store.clear();
  jest.clearAllMocks();
  // 묘비는 사용자별 키에 눕는다 — 세션이 있어야 그 키가 정해진다
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "t",
      refreshToken: "r",
      expiresAt: Date.now() + 60_000,
      userId: USER_ID,
    }),
  );
  useDiary.setState({ diaries: [], actionCards: [], loaded: false });
  useToast.setState({ current: null });
});

describe("지우면 기기에 묘비가 남는다", () => {
  it("목록에서 빠지고, 남긴 뒤 성공 한 줄", async () => {
    useDiary.setState({ actionCards: [card("7"), card("8")] });

    useDiary.getState().removeActionCard("7");
    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["8"]);
    await flush();

    expect(toast()).toMatchObject({ message: "행동카드를 삭제했어요.", variant: "positive" });
    expect(secure.__store.get(TOMBSTONE_KEY)).toBe("7");
  });

  it("남기지 못하면 되돌리고 실패 한 줄 — 지웠다고 말해 놓고 되살아나지 않게", async () => {
    secure.setItemAsync.mockRejectedValueOnce(new Error("boom"));
    useDiary.setState({ actionCards: [card("7")] });

    useDiary.getState().removeActionCard("7");
    expect(useDiary.getState().actionCards).toHaveLength(0); // 먼저 화면에서 뺀다
    await flush();

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["7"]);
    expect(toast()).toMatchObject({
      message: "행동카드를 삭제하지 못했어요.",
      variant: "negative",
    });
  });

  it("없는 카드는 실패 한 줄 — 지운 척하지 않는다", () => {
    useDiary.setState({ actionCards: [card("7")] });
    useDiary.getState().removeActionCard("없음");

    expect(useDiary.getState().actionCards).toHaveLength(1);
    expect(toast()).toMatchObject({ message: "행동카드를 삭제하지 못했어요." });
    expect(secure.__store.has(TOMBSTONE_KEY)).toBe(false);
  });

  it("연달아 지워도 앞의 묘비가 덮이지 않는다 — 읽고-고쳐-쓰기라 줄을 세운다", async () => {
    // 둘이 겹치면 같은 목록을 읽고 각자 자기 id 만 붙여 써서 **나중 것이 앞의 것을
    // 덮는다** — 첫 번째 카드가 다음 조회에 되살아난다
    useDiary.setState({ actionCards: [card("7"), card("8")] });

    useDiary.getState().removeActionCard("7");
    useDiary.getState().removeActionCard("8");
    await flush();

    expect(secure.__store.get(TOMBSTONE_KEY)).toBe("7,8");
  });

  it("같은 카드를 두 번 지워도 묘비는 한 줄이다", async () => {
    useDiary.setState({ actionCards: [card("7")] });
    useDiary.getState().removeActionCard("7");
    await flush();

    useDiary.setState({ actionCards: [card("7")] });
    useDiary.getState().removeActionCard("7");
    await flush();

    expect(secure.__store.get(TOMBSTONE_KEY)).toBe("7");
  });
});

describe("상한은 개수가 아니라 바이트다", () => {
  /** 서버 id 를 흉내낸 5자리 번호들 — 오래된 것이 앞이다 */
  const many = (count: number) => Array.from({ length: count }, (_, i) => String(10_000 + i));

  const remember = async (id: string) => {
    useDiary.setState({ actionCards: [card(id)] });
    useDiary.getState().removeActionCard(id);
    await flush();
    return secure.__store.get(TOMBSTONE_KEY) ?? "";
  };

  it("옛 상한(200건)보다 훨씬 많이 담는다 — 조회 창이 12개월이라 365건까지 생긴다", async () => {
    secure.__store.set(TOMBSTONE_KEY, many(250).join(","));

    const stored = await remember("99999");

    expect(stored.split(",")).toHaveLength(251);
    // 옛 코드였다면 맨 앞 50건이 이미 떨어져 나가 되살아났을 자리다
    expect(stored.startsWith("10000,")).toBe(true);
  });

  it("예산을 넘기면 **가장 오래된 것부터** 떨어진다 — 최근 삭제를 지킨다", async () => {
    secure.__store.set(TOMBSTONE_KEY, many(400).join(","));

    const stored = await remember("99999");
    const ids = stored.split(",");

    expect(stored.length).toBeLessThanOrEqual(1800);
    expect(ids.at(-1)).toBe("99999"); // 방금 지운 것은 반드시 남는다
    expect(ids).not.toContain("10000"); // 가장 오래된 것이 떨어졌다
  });

  it("앞 버전이 남긴 JSON 배열도 읽는다 — 업데이트만으로 삭제가 되살아나지 않게", async () => {
    secure.__store.set(TOMBSTONE_KEY, JSON.stringify(["7", "8"]));

    const stored = await remember("9");

    expect(stored).toBe("7,8,9");
  });
});

describe("다시 조회해도 되살아나지 않는다", () => {
  it("서버가 지운 카드를 그대로 다시 줘도 걸러낸다", async () => {
    useDiary.setState({ actionCards: [card("7")] });
    useDiary.getState().removeActionCard("7");
    await flush();

    // 서버에는 삭제 계약이 없다 — 지운 카드가 그대로 다시 실려 온다
    mockedLoad.mockResolvedValue({
      ok: true,
      data: { diaries: [], actionCards: [card("7"), card("8")] },
    });
    useDiary.setState({ actionCards: [], loaded: false });
    await useDiary.getState().load();

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["8"]);
  });

  it("앱을 다시 켠 것과 같다 — 메모리를 비워도 묘비가 남아 있으면 걸러낸다", async () => {
    // 앞선 실행이 남긴 묘비만 있고 store 는 비어 있는 상태
    secure.__store.set(TOMBSTONE_KEY, "7");
    mockedLoad.mockResolvedValue({
      ok: true,
      data: { diaries: [], actionCards: [card("7"), card("8")] },
    });

    await useDiary.getState().load();

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["8"]);
  });

  it("다른 사용자의 묘비는 보지 않는다 — 카드 id 는 서버의 전역 번호다", async () => {
    secure.__store.set("momentory.diary.deletedCards.999", "7");
    mockedLoad.mockResolvedValue({
      ok: true,
      data: { diaries: [], actionCards: [card("7"), card("8")] },
    });

    await useDiary.getState().load();

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["7", "8"]);
  });

  it("묘비를 읽지 못하면 아무것도 거르지 않는다 — 없는 카드를 지우지는 않는다", async () => {
    secure.getItemAsync.mockRejectedValue(new Error("boom"));
    mockedLoad.mockResolvedValue({
      ok: true,
      data: { diaries: [], actionCards: [card("7")] },
    });

    await useDiary.getState().load();

    expect(useDiary.getState().actionCards.map((c) => c.id)).toEqual(["7"]);
  });
});
