import { revokeRefreshToken } from "@/features/auth/data/logoutApi";
import { fetchMe } from "@/features/auth/data/meApi";
import { reissueAccessToken } from "@/features/auth/data/reissueApi";
import { deleteAccount } from "@/features/auth/data/withdrawApi";
import { getAccessToken, SESSION_KEY, useAuth } from "@/features/auth/model/auth";

import {
  fetchNotifications,
  fetchUnread,
  markNotificationRead,
  markNotificationsRead,
  type InboxNotification,
  type InboxPage,
  type InboxResult,
} from "../data/inboxApi";
import { useInbox } from "../model/inbox";

/**
 * 알림함 store — 계획 §5.4 상태 전이표 · MF-1A · MF-1B · MF-N1 · §7.1 P5.
 * 계약 자체는 `inboxApi.test.ts` 가 본다 — 여기선 store 가 응답으로 무엇을 하는지만.
 */
jest.mock("../data/inboxApi", () => ({
  ...jest.requireActual("../data/inboxApi"),
  fetchNotifications: jest.fn(),
  fetchUnread: jest.fn(),
  markNotificationRead: jest.fn(),
  markNotificationsRead: jest.fn(),
}));
const list = jest.mocked(fetchNotifications);
const unread = jest.mocked(fetchUnread);
const patchRead = jest.mocked(markNotificationRead);
const postRead = jest.mocked(markNotificationsRead);

// 계정 격리 — `auth` 의 정리 자리를 실제로 지난다. 목은 `auth.test.ts` 와 같은 방식이다
jest.mock("@/features/auth/data/reissueApi", () => ({ reissueAccessToken: jest.fn() }));
jest.mock("@/features/auth/data/logoutApi", () => ({
  revokeRefreshToken: jest.fn(async () => ({ ok: true })),
}));
jest.mock("@/features/auth/data/withdrawApi", () => ({
  deleteAccount: jest.fn(async () => ({ ok: true })),
}));
jest.mock("@/features/auth/data/meApi", () => ({
  fetchMe: jest.fn(async () => ({ ok: false, code: "network" })),
}));

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const seedSession = (userId: number, expiresAt = Date.now() + 60_000) =>
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({ accessToken: "t", refreshToken: "r", expiresAt, userId }),
  );

// ── 재료 ──────────────────────────────────────────────────────────────

const item = (id: string, readAt: string | null = null): InboxNotification => ({
  id,
  type: "NOTICE",
  kind: "notice",
  title: `공지 ${id}`,
  body: "",
  createdAt: "2026-10-15T03:00:00Z",
  readAt,
  link: null,
});

const page = (items: InboxNotification[], nextCursor: string | null = null) =>
  ({ ok: true, data: { items, nextCursor } }) as const;

const FAIL = { ok: false, code: "network" } as const;
const OK = { ok: true, data: null } as const;

/** 손으로 푸는 응답 — 도착 순서를 테스트가 정한다 */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

const flush = () => new Promise((r) => setTimeout(r, 0));

const inbox = () => useInbox.getState();

beforeEach(() => {
  jest.clearAllMocks();
  secure.__store.clear();
  list.mockResolvedValue(page([]));
  unread.mockResolvedValue(FAIL);
  patchRead.mockResolvedValue(OK);
  postRead.mockResolvedValue(OK);
  inbox().reset();
  inbox().bindUser(1);
});

/** 목록을 열어 `ready` 로 만들고 `ids` 를 본 것으로 표시한다 */
const openWith = async (items: InboxNotification[], seen: string[] = []) => {
  list.mockResolvedValueOnce(page(items));
  await inbox().open();
  inbox().markSeen(seen);
};

// ── 상태 전이 (MF-1) ──────────────────────────────────────────────────

describe("점 — 서버가 마지막으로 확인한 값만", () => {
  it("열어도 서버가 답하기 전에는 점이 그대로", async () => {
    useInbox.setState({ hasUnread: false });
    const pending = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(pending.promise);

    const opened = inbox().open();
    expect(inbox()).toMatchObject({ isOpen: true, status: "loading", hasUnread: false });

    pending.resolve(page([item("1")]));
    await opened;
    expect(inbox().hasUnread).toBe(true);
  });

  it("목록에 미확인이 있으면 true · 없으면 그대로", async () => {
    useInbox.setState({ hasUnread: false });
    await openWith([item("1", "2026-10-15T04:00:00Z")]);
    expect(inbox()).toMatchObject({ status: "ready", hasUnread: false });

    useInbox.setState({ hasUnread: null });
    await openWith([item("2", "2026-10-15T04:00:00Z")]);
    expect(inbox().hasUnread).toBeNull();

    await openWith([item("3")]);
    expect(inbox().hasUnread).toBe(true);
  });

  it("한 번도 확인 못 한 null 은 점 없음 — 실패가 이어져도 null", async () => {
    await inbox().refreshUnread();
    await inbox().markRead("1");
    expect(inbox().hasUnread).toBeNull();
  });

  it("GET /unread 실패 → 마지막 확인 값 유지(true · false 둘 다)", async () => {
    for (const last of [true, false]) {
      unread.mockResolvedValueOnce({ ok: true, data: last });
      await inbox().refreshUnread();
      unread.mockResolvedValueOnce(FAIL);
      await inbox().refreshUnread();
      expect(inbox().hasUnread).toBe(last);
    }
  });

  it("연속 실패: true → unread 실패 → 목록 성공 → read 실패 → 재조회 실패 → 켜진 채", async () => {
    unread.mockResolvedValueOnce({ ok: true, data: true });
    await inbox().refreshUnread();
    unread.mockResolvedValueOnce(FAIL);
    await inbox().refreshUnread();

    await openWith([item("1"), item("2")], ["1", "2"]);
    postRead.mockResolvedValueOnce(FAIL);
    unread.mockResolvedValueOnce(FAIL);
    await inbox().close();

    expect(inbox().hasUnread).toBe(true);

    // 복구: 다음 GET /unread 가 false 면 꺼진다
    unread.mockResolvedValueOnce({ ok: true, data: false });
    await inbox().refreshUnread();
    expect(inbox().hasUnread).toBe(false);
  });
});

describe("읽음 — 보인 항목만 (MF-1A)", () => {
  it("보인 항목 중 미확인이던 것만 POST /read — 읽은 것 · 목록 밖 ID 는 빠진다", async () => {
    await openWith([item("1"), item("2", "2026-10-14T00:00:00Z"), item("3")], ["1", "2", "99"]);
    await inbox().close();

    expect(postRead).toHaveBeenCalledTimes(1);
    expect(postRead).toHaveBeenCalledWith(["1"], 1);
  });

  it("50개를 넘으면 나눠서 보낸다", async () => {
    const many = Array.from({ length: 60 }, (_, i) => item(String(i)));
    await openWith(
      many,
      many.map((n) => n.id),
    );
    await inbox().close();

    expect(postRead.mock.calls.map(([ids]) => ids.length)).toEqual([50, 10]);
    expect(postRead.mock.calls.flatMap(([ids]) => ids)).toEqual(many.map((n) => n.id));
  });

  it("보지 않고 닫은 항목은 다음에 열어도 읽지 않음", async () => {
    await openWith([item("1"), item("2")], ["1"]);
    await inbox().close();
    expect(postRead).toHaveBeenCalledWith(["1"], 1);

    // 서버는 2 를 여전히 미확인으로 준다 — 이번에도 「읽지 않음」으로 그린다
    await openWith([item("1", "2026-10-15T05:00:00Z"), item("2")]);
    expect(inbox().unreadAtOpen).toEqual(["2"]);
  });

  it("열려 있지 않거나 목록이 오기 전에 본 것은 모으지 않는다", async () => {
    inbox().markSeen(["1"]);
    expect(inbox().seenIds).toEqual([]);

    const pending = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(pending.promise);
    const opened = inbox().open();
    inbox().markSeen(["1"]);
    pending.resolve(page([item("1")]));
    await opened;
    expect(inbox().seenIds).toEqual([]);
  });

  it("본 게 없으면 POST 없이 바로 재조회", async () => {
    await openWith([item("1")]);
    await inbox().close();
    expect(postRead).not.toHaveBeenCalled();
    expect(unread).toHaveBeenCalledTimes(1);
  });

  it("POST /read 성공 뒤 GET /unread 값으로", async () => {
    unread.mockResolvedValueOnce({ ok: true, data: true });
    await inbox().refreshUnread();

    await openWith([item("1")], ["1"]);
    unread.mockResolvedValueOnce({ ok: true, data: false });
    await inbox().close();

    expect(postRead.mock.invocationCallOrder[0]!).toBeLessThan(
      unread.mock.invocationCallOrder.at(-1)!,
    );
    expect(inbox().hasUnread).toBe(false);
  });

  it("POST /read 실패 → 다시 보내지 않고 재조회는 한 번", async () => {
    await openWith([item("1")], ["1"]);
    postRead.mockResolvedValueOnce(FAIL);
    await inbox().close();
    await inbox().close(); // 이미 닫혔다 — 아무것도 하지 않는다

    expect(postRead).toHaveBeenCalledTimes(1);
    expect(unread).toHaveBeenCalledTimes(1);
  });

  it("목록 실패 → 읽음 안 보냄 · 점 그대로", async () => {
    useInbox.setState({ hasUnread: true });
    list.mockResolvedValueOnce(FAIL);
    await inbox().open();
    inbox().markSeen(["1"]);
    expect(inbox().status).toBe("failed");

    await inbox().close();
    expect(postRead).not.toHaveBeenCalled();
    expect(inbox().hasUnread).toBe(true);
  });

  it("PATCH 성공 → GET /unread 값으로 · 실패면 재조회 없이 그대로", async () => {
    useInbox.setState({ hasUnread: true });
    unread.mockResolvedValueOnce({ ok: true, data: false });
    await inbox().markRead("1");
    expect(patchRead).toHaveBeenCalledWith("1", 1);
    expect(inbox().hasUnread).toBe(false);

    useInbox.setState({ hasUnread: true });
    patchRead.mockResolvedValueOnce(FAIL);
    await inbox().markRead("2");
    expect(unread).toHaveBeenCalledTimes(1);
    expect(inbox().hasUnread).toBe(true);
  });
});

describe("다음 쪽", () => {
  it("이어 붙이고(겹친 ID 는 한 번) 미확인을 더한다 · 진행 중 중복 호출은 무시", async () => {
    list.mockResolvedValueOnce(page([item("1", "2026-10-15T00:00:00Z")], "c1"));
    await inbox().open();
    expect(inbox().hasUnread).toBeNull();

    const pending = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(pending.promise);
    const more = inbox().loadMore();
    await inbox().loadMore();
    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenLastCalledWith(1, { cursor: "c1" });

    pending.resolve(page([item("1", "2026-10-15T00:00:00Z"), item("2")], null));
    await more;
    expect(inbox().items.map((n) => n.id)).toEqual(["1", "2"]);
    expect(inbox().unreadAtOpen).toEqual(["2"]);
    expect(inbox().hasUnread).toBe(true);

    await inbox().loadMore(); // 다음이 없다
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("닫은 뒤 도착한 목록은 반영하지 않는다(열림 세대)", async () => {
    const pending = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(pending.promise);
    const opened = inbox().open();
    await inbox().close();

    pending.resolve(page([item("1")]));
    await opened;
    expect(inbox()).toMatchObject({ isOpen: false, items: [], hasUnread: null });
  });
});

describe("순서 — 늦게 온 응답이 이기지 않는다", () => {
  it("늦게 온 앞선 unread(true)가 뒤의 false 를 덮지 않는다", async () => {
    const early = deferred<InboxResult<boolean>>();
    unread.mockReturnValueOnce(early.promise);
    const first = inbox().refreshUnread();

    unread.mockResolvedValueOnce({ ok: true, data: false });
    await inbox().refreshUnread();
    expect(inbox().hasUnread).toBe(false);

    early.resolve({ ok: true, data: true });
    await first;
    expect(inbox().hasUnread).toBe(false);
  });

  it("읽음 앞에 출발한 unread(true)가 읽음 뒤에 와도 점을 되살리지 않는다", async () => {
    const early = deferred<InboxResult<boolean>>();
    unread.mockReturnValueOnce(early.promise);
    const first = inbox().refreshUnread();

    const pendingRead = deferred<InboxResult<null>>();
    patchRead.mockReturnValueOnce(pendingRead.promise);
    const reading = inbox().markRead("1");
    pendingRead.resolve(OK);
    // 읽음은 성공했고 재조회는 아직 오지 않았다 — 그사이 앞선 조회가 도착한다
    const later = deferred<InboxResult<boolean>>();
    unread.mockReturnValueOnce(later.promise);
    await flush();
    early.resolve({ ok: true, data: true });
    await first;
    expect(inbox().hasUnread).toBeNull();

    later.resolve({ ok: true, data: false });
    await reading;
    expect(inbox().hasUnread).toBe(false);
  });

  it("앞선 목록(미확인 있음)이 뒤의 unread(false)를 덮지 않는다", async () => {
    const pending = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(pending.promise);
    const opened = inbox().open();

    unread.mockResolvedValueOnce({ ok: true, data: false });
    await inbox().refreshUnread();

    pending.resolve(page([item("1")]));
    await opened;
    expect(inbox().hasUnread).toBe(false);
    // 목록은 그대로 그린다 — 점만 앞선 응답에 지지 않는다
    expect(inbox().unreadAtOpen).toEqual(["1"]);
  });
});

// ── 세션 격리 (MF-N1) ──────────────────────────────────────────────────

describe("세션 — reset 전에 출발한 응답은 버린다 (MF-N1)", () => {
  it("A 의 unread 진행 중 reset() → 늦게 와도 null", async () => {
    const pending = deferred<InboxResult<boolean>>();
    unread.mockReturnValueOnce(pending.promise);
    const refreshing = inbox().refreshUnread();

    inbox().reset();
    pending.resolve({ ok: true, data: true });
    await refreshing;
    expect(inbox().hasUnread).toBeNull();
  });

  it("A 의 목록 진행 중 reset() → B 의 store 에 A 항목이 끼지 않는다", async () => {
    const forA = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(forA.promise);
    const openedA = inbox().open();

    inbox().reset();
    inbox().bindUser(2);
    const forB = deferred<InboxResult<InboxPage>>();
    list.mockReturnValueOnce(forB.promise);
    const openedB = inbox().open();

    forA.resolve(page([item("a1")]));
    await openedA;
    expect(inbox()).toMatchObject({ userId: 2, status: "loading", items: [], hasUnread: null });

    forB.resolve(page([item("b1", "2026-10-15T00:00:00Z")]));
    await openedB;
    expect(inbox().items.map((n) => n.id)).toEqual(["b1"]);
    expect(inbox().hasUnread).toBeNull();
  });

  it("A 의 POST /read 진행 중 reset() → 이어지는 재조회를 부르지 않는다", async () => {
    await openWith([item("1")], ["1"]);
    const pending = deferred<InboxResult<null>>();
    postRead.mockReturnValueOnce(pending.promise);
    const closing = inbox().close();

    inbox().reset();
    pending.resolve(OK);
    await closing;
    expect(unread).not.toHaveBeenCalled();
  });

  it("A unread 시작 → reset() → B unread 성공 true → A 늦은 응답(false) → B 의 true 유지", async () => {
    const forA = deferred<InboxResult<boolean>>();
    unread.mockReturnValueOnce(forA.promise);
    const refreshingA = inbox().refreshUnread();

    inbox().reset();
    inbox().bindUser(2);
    unread.mockResolvedValueOnce({ ok: true, data: true });
    await inbox().refreshUnread();

    forA.resolve({ ok: true, data: false });
    await refreshingA;
    expect(inbox().hasUnread).toBe(true);
  });

  it("reset() 뒤 시작한 B 요청은 정상 반영", async () => {
    inbox().reset();
    inbox().bindUser(2);
    unread.mockResolvedValueOnce({ ok: true, data: true });
    await inbox().refreshUnread();
    expect(inbox().hasUnread).toBe(true);

    await openWith([item("b1")], ["b1"]);
    await inbox().close();
    expect(postRead).toHaveBeenCalledWith(["b1"], 2);
  });

  it("열린 채 reset() → 닫히고 읽음을 보내지 않는다", async () => {
    await openWith([item("1")], ["1"]);
    inbox().reset();
    expect(inbox()).toMatchObject({ isOpen: false, items: [], seenIds: [], hasUnread: null });

    await inbox().close();
    expect(postRead).not.toHaveBeenCalled();
  });

  it("같은 사용자를 다시 묶으면 아무것도 비우지 않는다(포그라운드 복귀의 hydrate)", async () => {
    unread.mockResolvedValueOnce({ ok: true, data: true });
    await inbox().refreshUnread();
    const gen = inbox().sessionGen;

    inbox().bindUser(1);
    expect(inbox()).toMatchObject({ sessionGen: gen, hasUnread: true });

    inbox().bindUser(2);
    expect(inbox()).toMatchObject({ sessionGen: gen + 1, hasUnread: null, userId: 2 });
  });

  it("주인이 없으면 아무 요청도 보내지 않는다", async () => {
    inbox().reset();
    await inbox().refreshUnread();
    await inbox().markRead("1");
    await inbox().open();
    expect(unread).not.toHaveBeenCalled();
    expect(patchRead).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
    expect(inbox().status).toBe("failed");
  });
});

// ── 계정 격리 — auth 의 정리 자리 ─────────────────────────────────────

describe("계정 격리 — auth 가 inbox 를 비운다", () => {
  const dirty = async () => {
    unread.mockResolvedValueOnce({ ok: true, data: true });
    await inbox().refreshUnread();
    await openWith([item("1")], ["1"]);
    return inbox().sessionGen;
  };

  beforeEach(() => {
    useAuth.setState({ status: "authenticated", withdrawing: false, withdrawError: null });
  });

  it("hydrate 가 세션의 주인을 묶는다", async () => {
    inbox().reset();
    seedSession(7);
    await useAuth.getState().hydrate();
    expect(inbox().userId).toBe(7);
  });

  it("signOut → null · 비었음 · 세대가 오른다 · 읽음을 보내지 않는다", async () => {
    seedSession(1);
    const gen = await dirty();

    await useAuth.getState().signOut();

    expect(inbox()).toMatchObject({
      userId: null,
      hasUnread: null,
      items: [],
      seenIds: [],
      isOpen: false,
    });
    expect(inbox().sessionGen).toBeGreaterThan(gen);
    expect(postRead).not.toHaveBeenCalled();
    expect(revokeRefreshToken).toHaveBeenCalled();
  });

  it("withdraw 성공 → null · 비었음 · 세대가 오른다", async () => {
    seedSession(1);
    const gen = await dirty();

    await expect(useAuth.getState().withdraw()).resolves.toBe(true);

    expect(deleteAccount).toHaveBeenCalled();
    expect(inbox()).toMatchObject({ userId: null, hasUnread: null, items: [] });
    expect(inbox().sessionGen).toBeGreaterThan(gen);
  });

  it("withdraw 실패 → 그대로 둔다", async () => {
    seedSession(1);
    const gen = await dirty();
    jest.mocked(deleteAccount).mockResolvedValueOnce({ ok: false, code: "server" });

    await expect(useAuth.getState().withdraw()).resolves.toBe(false);
    expect(inbox()).toMatchObject({ userId: 1, hasUnread: true, sessionGen: gen });
  });

  it("/users/me 401 → 비운다", async () => {
    seedSession(1);
    const gen = await dirty();
    jest.mocked(fetchMe).mockResolvedValueOnce({ ok: false, code: "unauthorized" });

    await useAuth.getState().syncMe();
    expect(inbox()).toMatchObject({ userId: null, hasUnread: null });
    expect(inbox().sessionGen).toBeGreaterThan(gen);
  });

  it("갱신이 evicted 로 끝나면 비운다(결정 D1)", async () => {
    seedSession(1, Date.now() - 1);
    const gen = await dirty();
    jest.mocked(reissueAccessToken).mockResolvedValueOnce({ ok: false, code: "refresh_revoked" });

    await expect(getAccessToken()).resolves.toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
    expect(inbox()).toMatchObject({ userId: null, hasUnread: null });
    expect(inbox().sessionGen).toBeGreaterThan(gen);
  });
});
