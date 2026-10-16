import { create } from "zustand";

import type { InboxNotification } from "@/features/notifications/data/inboxApi";

/**
 * 알림 API 는 **요청하는 순간에** `require` 로 읽는다(MF-3 · `import()` 는 Jest 가 못 돌린다). `inboxApi.ts` 가 `@/lib/http` 를 거쳐 `auth.ts` 로
 * 닿으므로, 여기서 정적으로 들면 `auth.ts → inbox.ts → inboxApi.ts → http.ts → auth.ts` 순환이 된다.
 * `reset` · `bindUser` 는 API 를 쓰지 않으니 동기 그대로다
 */
type InboxApi = typeof import("@/features/notifications/data/inboxApi");
const inboxApi = (): InboxApi =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/features/notifications/data/inboxApi");

/**
 * 알림함 — 종의 점 하나와 알림 팝오버가 보는 것(계획 §5.3 · §5.4 · BE `dev` 계약 · `inboxApi.ts`).
 *
 * ## 점은 서버가 마지막으로 확인한 값만 따른다 (MF-1B)
 *
 * `hasUnread` 는 `boolean | null` 이다 — `null` 은 「이번 로그인에서 아직 한 번도 확인 못 함」이고
 * 점을 그리지 않는다. 이 값을 바꾸는 것은 **성공한 서버 응답 둘뿐**이다:
 *
 * 1. `GET /unread` 의 값(참 · 거짓 모두)
 * 2. 목록 응답에 `readAt == null` 이 하나라도 있으면 `true` — 없다고 `false` 로 쓰지 않는다
 *    (첫 쪽에 없다고 전체에 없다는 뜻이 아니다)
 *
 * 열기 · 닫기 같은 화면 동작과 **모든 실패**는 점을 바꾸지 않는다 — 옵티미스틱이 없다.
 * 「실패하면 끈다」를 쓰면 읽음 처리가 실패해 서버에 미확인이 남았는데 점만 꺼진다.
 *
 * ## 무엇을 「본」 것으로 치나 (MF-1A)
 *
 * 팝오버가 **실제로 화면에 나타난** 항목 ID 만 `markSeen` 으로 넘긴다. 닫을 때 그중 이번 목록에서
 * 미확인이던 것만 `POST /read` 로 보낸다(50개씩). 받기만 하고 스크롤하지 않은 항목은 남는다.
 *
 * ## 늦게 온 응답은 두 겹으로 버린다
 *
 * 1. **세션** (MF-N1) — 요청은 출발 때의 `sessionGen` · `userId` 를 든다. 도착 때 하나라도 다르면
 *    성공이어도 버리고 **이어지는 호출도 하지 않는다.** `reset()` · 다른 사용자의 `bindUser` 가
 *    세대를 올린다. 앞 사람의 항목이 다음 사람의 팝오버에 끼거나 앞 사람의 `true` 가 다음 사람의
 *    점을 켜지 않게 한다.
 *    API 어댑터에도 출발 사용자 ID를 넘겨 토큰 조회 중 계정이 바뀌면 요청 자체를 보내지 않는다.
 * 2. **세션 안 순서** — 네 요청이 하나의 요청 번호(`requestSeq`)를 나눠 쓴다. `hasUnread` 는
 *    **마지막으로 반영한 응답보다 나중에 출발한** 요청의 성공만 바꾼다. 읽음 성공도 「반영」으로
 *    친다 — 읽음 앞에 출발한 `GET /unread`(true)가 늦게 와 점을 되살리지 않게.
 *    목록은 여기에 더해 **열림 세대**(`openGen`)를 본다 — 다시 열거나 닫은 뒤 온 목록은 버린다.
 *
 * ## 신원은 `auth` 가 밀어 넣는다
 *
 * 이 모듈(과 `inboxApi.ts` · `links.ts`)은 **`@/features/auth/**` 를 import 하지 않는다.** `auth.ts`
 * 가 정리 자리에서 이 store 를 부르므로, 반대 방향을 더하면 순환 import 가 된다
 * (`auth.ts` `currentUserId` 주석). `http.ts` 를 지나는 `inboxApi.ts` 도 같은 까닭으로 요청 때만 읽는다. 로그인 · 복원 때 `bindUser`, 로그아웃 · 탈퇴 · 세션 폐기 때 `reset`.
 *
 * 폴링하지 않는다. 언제 `refreshUnread()` 를 부를지(홈 포커스 · 포그라운드 복귀)는 홈 연결이 정한다.
 */
export type InboxStatus = "idle" | "loading" | "ready" | "failed";

type InboxState = {
  /** 지금 이 store 의 주인. `null` 이면 아무 요청도 보내지 않는다 */
  userId: number | null;
  /** 세션 세대 — `reset` · 사용자 변경 때 오른다. 그전에 출발한 응답은 버린다 */
  sessionGen: number;
  /** 서버가 마지막으로 확인한 값. `null` = 아직 모른다(점 없음) */
  hasUnread: boolean | null;
  items: InboxNotification[];
  nextCursor: string | null;
  status: InboxStatus;
  loadingMore: boolean;
  isOpen: boolean;
  /** 이번에 열린 동안 **실제로 화면에 보인** ID */
  seenIds: string[];
  /** 이번 목록 응답에서 `readAt == null` 이던 ID — 열려 있는 동안 「읽지 않음」 표시를 지킨다 */
  unreadAtOpen: string[];
};

type InboxActions = {
  /** 로그인 · 복원 — 다른 사용자면 `reset` 과 같은 효과 뒤에 주인을 바꾼다. 같으면 아무것도 안 한다 */
  bindUser: (userId: number) => void;
  /** 로그아웃 · 탈퇴 · 세션 폐기. **열려 있어도 읽음을 보내지 않는다** */
  reset: () => void;
  refreshUnread: () => Promise<void>;
  /** 첫 쪽을 묻는다 — 점은 응답이 올 때까지 그대로다 */
  open: () => Promise<void>;
  /** 다음 쪽이 있고 진행 중이 아닐 때만 */
  loadMore: () => Promise<void>;
  /** 팝오버가 실제로 보인 항목을 알린다 — 열려 있고 목록이 있을 때 · 목록에 있는 ID 만 */
  markSeen: (ids: readonly string[]) => void;
  /** 본 것 중 미확인이던 것만 읽음으로 보내고(한 번 · 실패해도 다시 안 보냄) 점을 다시 묻는다 */
  close: () => Promise<void>;
  /** 항목을 눌렀다(이동 · 펼침) — `PATCH` 가 성공하면 점을 다시 묻는다 */
  markRead: (id: string) => Promise<void>;
};

const EMPTY_SESSION = {
  userId: null,
  hasUnread: null,
  items: [],
  nextCursor: null,
  status: "idle",
  loadingMore: false,
  isOpen: false,
  seenIds: [],
  unreadAtOpen: [],
} satisfies Omit<InboxState, "sessionGen">;

/** 네 요청이 나눠 쓰는 출발 번호 — 세션을 넘어 계속 오른다(세션 구분은 `sessionGen` 몫) */
let requestSeq = 0;
/** `hasUnread` 에 마지막으로 반영한(또는 읽음 성공으로 낡게 만든) 요청 번호 */
let lastAppliedSeq = 0;
/** 열림 세대 — `open` · `close` · `reset` 때 오른다. 목록 응답이 이것을 본다 */
let openGen = 0;

type Ticket = { sessionGen: number; userId: number; seq: number };

const unreadIdsOf = (items: readonly InboxNotification[]) =>
  items.filter((item) => item.readAt == null).map((item) => item.id);

const chunk = <T>(list: readonly T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export const useInbox = create<InboxState & InboxActions>((set, get) => {
  /** 출발 표. 주인이 없으면 `null` — 아무것도 보내지 않는다 */
  const issue = (): Ticket | null => {
    const { userId, sessionGen } = get();
    if (userId == null) return null;
    requestSeq += 1;
    return { sessionGen, userId, seq: requestSeq };
  };

  /** 출발한 세션이 아직 지금 세션인가 — 아니면 응답은 성공이어도 버린다 */
  const isCurrent = (ticket: Ticket) => {
    const { sessionGen, userId } = get();
    return ticket.sessionGen === sessionGen && ticket.userId === userId;
  };

  /** 마지막으로 반영한 것보다 나중에 출발한 응답만 점을 바꾼다 */
  const applyUnread = (ticket: Ticket, value: boolean) => {
    if (ticket.seq <= lastAppliedSeq) return;
    lastAppliedSeq = ticket.seq;
    set({ hasUnread: value });
  };

  /** 읽음 성공 — 점은 바꾸지 않되, 그 앞에 출발한 조회가 늦게 와 덮지 못하게 한다 */
  const supersede = (ticket: Ticket) => {
    lastAppliedSeq = Math.max(lastAppliedSeq, ticket.seq);
  };

  const refreshUnread = async () => {
    const ticket = issue();
    if (ticket == null) return;
    const { fetchUnread } = inboxApi();
    const result = await fetchUnread(ticket.userId);
    if (!isCurrent(ticket) || !result.ok) return;
    applyUnread(ticket, result.data);
  };

  return {
    ...EMPTY_SESSION,
    sessionGen: 0,

    bindUser: (userId) => {
      if (get().userId === userId) return;
      openGen += 1;
      set({ ...EMPTY_SESSION, sessionGen: get().sessionGen + 1, userId });
    },

    reset: () => {
      openGen += 1;
      set({ ...EMPTY_SESSION, sessionGen: get().sessionGen + 1 });
    },

    refreshUnread,

    open: async () => {
      openGen += 1;
      const opened = openGen;
      set({
        isOpen: true,
        status: "loading",
        items: [],
        nextCursor: null,
        loadingMore: false,
        seenIds: [],
        unreadAtOpen: [],
      });

      const ticket = issue();
      if (ticket == null) {
        set({ status: "failed" });
        return;
      }
      const { fetchNotifications } = inboxApi();
      const result = await fetchNotifications(ticket.userId);
      if (!isCurrent(ticket) || opened !== openGen) return;

      if (!result.ok) {
        // 실패 한 줄 · 점은 그대로 · 본 것이 없으니 닫아도 읽음을 보내지 않는다
        set({ status: "failed" });
        return;
      }
      const unread = unreadIdsOf(result.data.items);
      set({
        status: "ready",
        items: result.data.items,
        nextCursor: result.data.nextCursor,
        unreadAtOpen: unread,
      });
      if (unread.length > 0) applyUnread(ticket, true);
    },

    loadMore: async () => {
      const { isOpen, status, loadingMore, nextCursor } = get();
      if (!isOpen || status !== "ready" || loadingMore || nextCursor == null) return;

      const ticket = issue();
      if (ticket == null) return;
      const opened = openGen;
      set({ loadingMore: true });

      const { fetchNotifications } = inboxApi();
      const result = await fetchNotifications(ticket.userId, { cursor: nextCursor });
      if (!isCurrent(ticket) || opened !== openGen) return;

      if (!result.ok) {
        // 받은 쪽은 그대로 둔다 — 끝에 다시 닿으면 다시 묻는다. 한 줄도 띄우지 않는다
        set({ loadingMore: false });
        return;
      }
      // 같은 시각에 새 공지가 끼면 커서 경계에서 겹칠 수 있다 — 이미 있는 ID 는 다시 넣지 않는다
      const known = new Set(get().items.map((item) => item.id));
      const fresh = result.data.items.filter((item) => !known.has(item.id));
      const unread = unreadIdsOf(fresh);
      set({
        loadingMore: false,
        items: [...get().items, ...fresh],
        nextCursor: result.data.nextCursor,
        unreadAtOpen: [...get().unreadAtOpen, ...unread],
      });
      if (unread.length > 0) applyUnread(ticket, true);
    },

    markSeen: (ids) => {
      const { isOpen, status, items, seenIds } = get();
      if (!isOpen || status !== "ready") return;
      const listed = new Set(items.map((item) => item.id));
      const already = new Set(seenIds);
      const next = ids.filter((id) => listed.has(id) && !already.has(id));
      if (next.length === 0) return;
      set({ seenIds: [...seenIds, ...new Set(next)] });
    },

    close: async () => {
      const { isOpen, status, seenIds, unreadAtOpen } = get();
      if (!isOpen) return;

      // 목록이 없었으면(실패 · 로딩 중) 본 것도 없다
      const unread = new Set(unreadAtOpen);
      const toRead = status === "ready" ? seenIds.filter((id) => unread.has(id)) : [];

      openGen += 1;
      set({
        isOpen: false,
        status: "idle",
        items: [],
        nextCursor: null,
        loadingMore: false,
        seenIds: [],
        unreadAtOpen: [],
      });

      // 나눠 보내되 **조각마다 한 번뿐이다** — 실패해도 다시 보내지 않는다(규칙 4 · 조용히)
      const { INBOX_MAX_BATCH, markNotificationsRead } = inboxApi();
      for (const ids of chunk(toRead, INBOX_MAX_BATCH)) {
        const ticket = issue();
        if (ticket == null) return;
        const result = await markNotificationsRead(ids, ticket.userId);
        // 그사이 세션이 갈렸다 — 남은 조각도 재조회도 보내지 않는다(MF-N1)
        if (!isCurrent(ticket)) return;
        if (result.ok) supersede(ticket);
      }
      await refreshUnread();
    },

    markRead: async (id) => {
      const ticket = issue();
      if (ticket == null) return;
      const { markNotificationRead } = inboxApi();
      const result = await markNotificationRead(id, ticket.userId);
      if (!isCurrent(ticket) || !result.ok) return;
      supersede(ticket);
      await refreshUnread();
    },
  };
});
