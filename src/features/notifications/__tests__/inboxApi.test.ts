import type { Href } from "expo-router";

import { authedRequest } from "@/lib/http";

import {
  fetchNotifications,
  fetchUnread,
  markNotificationRead,
  markNotificationsRead,
  toInboxPage,
} from "../data/inboxApi";
import { INBOX_LINKS, toAllowedLink, type InboxLink } from "../model/links";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

const raw = (overrides: Record<string, unknown> = {}) => ({
  id: "101",
  type: "NOTICE",
  title: "새 쉼터가 열렸어요",
  body: "몸에 힘 빼기를 써 보세요.",
  createdAt: "2026-10-15T03:00:00Z",
  readAt: null,
  link: "/(tabs)/rest",
  ...overrides,
});

// 허용 목록은 라우터에 그대로 넘긴다 — 캐스팅 없이 `Href` 여야 한다(타입 검사가 이 줄을 본다)
const asHref: Href = INBOX_LINKS[0] satisfies InboxLink;

/** BE `dev` d77d023의 Controller · DTO를 대조한 경계. 운영 배포는 미확인이다. */
describe("알림함 API — BE dev 계약", () => {
  beforeEach(() => mockedRequest.mockReset());

  describe("허용 목록 link", () => {
    it("넷만 정확히 일치할 때 통과한다", () => {
      expect(asHref).toBe("/(tabs)/rest");
      for (const link of INBOX_LINKS) expect(toAllowedLink(link)).toBe(link);
    });

    it("외부 URL · 그룹 없는 맨 경로 · 쿼리 · 공백 · 문자열 아닌 값은 null", () => {
      for (const bad of [
        "https://evil.example/(tabs)/rest",
        "momentory://(tabs)/rest",
        "//evil.example",
        "/rest",
        "(tabs)/rest",
        "/(tabs)/rest?x=1",
        "/(tabs)/rest#top",
        " /(tabs)/rest",
        "/(tabs)/rest/",
        "/retro/talk",
        "",
        null,
        42,
        { pathname: "/(tabs)/rest" },
      ]) {
        expect(toAllowedLink(bad)).toBeNull();
      }
    });
  });

  describe("목록", () => {
    it("허용 목록 밖 link(외부 URL · /rest · 쿼리)는 버리고 항목은 남긴다", () => {
      const page = toInboxPage({
        items: [
          raw({ id: "1", link: "https://example.com" }),
          raw({ id: "2", link: "/rest" }),
          raw({ id: "3", link: "/(tabs)/report?tab=1" }),
          raw({ id: "4", link: "/my/profile" }),
        ],
        nextCursor: null,
      });
      expect(page?.items.map((item) => [item.id, item.link])).toEqual([
        ["1", null],
        ["2", null],
        ["3", null],
        ["4", "/my/profile"],
      ]);
    });

    it("모르는 type 도 항목으로 남긴다 — 이름표만 없다", () => {
      const page = toInboxPage({ items: [raw({ type: "REPORT_READY" })], nextCursor: null });
      expect(page?.items[0]).toMatchObject({ type: "REPORT_READY", kind: "other" });
    });

    it("CRITICAL_NOTICE 에 이름표 · readAt 이 있으면 읽음(가입 전 발행분은 서버가 가입 시각을 준다)", () => {
      const page = toInboxPage({
        items: [
          raw({ id: "9", type: "CRITICAL_NOTICE", readAt: "2026-10-01T00:00:00Z" }),
          raw({ id: "8", type: "NEWS" }),
        ],
        nextCursor: "c2",
      });
      expect(page?.items[0]).toMatchObject({ kind: "critical", readAt: "2026-10-01T00:00:00Z" });
      expect(page?.items[1]).toMatchObject({ kind: "news", readAt: null });
      expect(page?.nextCursor).toBe("c2");
    });

    it("body 없음 · null 은 빈 문자열", () => {
      const page = toInboxPage({
        items: [raw({ id: "1", body: undefined }), raw({ id: "2", body: null })],
        nextCursor: null,
      });
      expect(page?.items.map((item) => [item.id, item.body])).toEqual([
        ["1", ""],
        ["2", ""],
      ]);
      expect(page?.nextCursor).toBeNull();
    });

    it("readAt 이 빠진 항목은 버린다 — 미확인으로 읽어 읽음 요청에 싣지 않는다", () => {
      const { readAt: _drop, ...noReadAt } = raw({ id: "1" });
      const page = toInboxPage({ items: [noReadAt, raw({ id: "2" })], nextCursor: null });
      expect(page?.items.map((item) => item.id)).toEqual(["2"]);
    });

    it("id 는 int64 문자열만 — 숫자 아닌 문자열 · 앞자리 0 · 음수 · 범위 밖은 버린다", () => {
      const page = toInboxPage({
        items: [
          raw({ id: "abc" }),
          raw({ id: "12a" }),
          raw({ id: "007" }),
          raw({ id: "-1" }),
          raw({ id: "1.5" }),
          raw({ id: " 1" }),
          raw({ id: "" }),
          raw({ id: "9223372036854775808" }), // int64 최댓값 + 1
          raw({ id: "10000000000000000000" }), // 20자리
          raw({ id: "9223372036854775807" }),
          raw({ id: "0" }),
        ],
        nextCursor: null,
      });
      expect(page?.items.map((item) => item.id)).toEqual(["9223372036854775807", "0"]);
    });

    it("깨진 항목 하나만 버린다", () => {
      const page = toInboxPage({
        items: [
          raw({ id: 5 }), // 숫자 id — 계약은 int64 문자열
          raw({ id: "6", title: 7 }),
          raw({ id: "7", createdAt: "어제" }),
          raw({ id: "8", readAt: "읽음" }),
          raw({ id: "9", body: 3 }),
          raw({ id: "10", type: null }),
          "문자열",
          raw({ id: "11" }),
        ],
        nextCursor: null,
      });
      expect(page?.items.map((item) => item.id)).toEqual(["11"]);
    });

    it("틀이 깨지면 malformed", async () => {
      for (const data of [
        null,
        [],
        { items: "x" },
        { items: [], nextCursor: 3 },
        { items: [] }, // nextCursor 누락 — 끝인지 잘렸는지 모른다
        { items: [], nextCursor: undefined },
      ]) {
        mockedRequest.mockResolvedValueOnce({ ok: true, data });
        await expect(fetchNotifications(7)).resolves.toEqual({ ok: false, code: "malformed" });
      }
    });

    it("size 는 기본 20 · 50 을 넘지 않는다 · cursor 는 인코딩한다", async () => {
      mockedRequest.mockResolvedValue({ ok: true, data: { items: [], nextCursor: null } });
      await fetchNotifications(7);
      await fetchNotifications(7, { size: 500, cursor: "a b&c" });
      await fetchNotifications(7, { size: 0 });
      expect(mockedRequest.mock.calls.map((call) => [call[0], call[1]])).toEqual([
        ["GET", "/api/v1/notifications?size=20"],
        ["GET", "/api/v1/notifications?size=50&cursor=a%20b%26c"],
        ["GET", "/api/v1/notifications?size=1"],
      ]);
    });
  });

  describe("미확인", () => {
    it("hasUnread 는 불리언이다 — 숫자를 받지 않는다", async () => {
      mockedRequest.mockResolvedValueOnce({ ok: true, data: { hasUnread: true } });
      await expect(fetchUnread(7)).resolves.toEqual({ ok: true, data: true });
      mockedRequest.mockResolvedValueOnce({ ok: true, data: { hasUnread: false } });
      await expect(fetchUnread(7)).resolves.toEqual({ ok: true, data: false });

      for (const data of [{ hasUnread: 3 }, { hasUnread: "true" }, {}, { unreadCount: 2 }, null]) {
        mockedRequest.mockResolvedValueOnce({ ok: true, data });
        await expect(fetchUnread(7)).resolves.toEqual({ ok: false, code: "malformed" });
      }
      expect(mockedRequest.mock.calls[0]?.[1]).toBe("/api/v1/notifications/unread");
    });
  });

  describe("읽음", () => {
    it("POST /read 는 적힌 ID 만 보낸다 · 빈 배열이면 요청하지 않는다", async () => {
      await expect(markNotificationsRead([], 7)).resolves.toEqual({ ok: true, data: null });
      expect(mockedRequest).not.toHaveBeenCalled();

      mockedRequest.mockResolvedValueOnce({ ok: true, data: null });
      await expect(markNotificationsRead(["3", "1"], 7)).resolves.toEqual({ ok: true, data: null });
      expect(mockedRequest).toHaveBeenCalledWith(
        "POST",
        "/api/v1/notifications/read",
        {
          ids: ["3", "1"],
        },
        { expectedUserId: 7 },
      );
    });

    it("50개를 넘으면 보내지 않는다 — 나누는 것은 store 몫", async () => {
      const ids = Array.from({ length: 51 }, (_, i) => String(i));
      await expect(markNotificationsRead(ids, 7)).resolves.toEqual({
        ok: false,
        code: "malformed",
      });
      expect(mockedRequest).not.toHaveBeenCalled();
    });

    it("PATCH 는 2xx 면 성공이다(본문은 보지 않는다)", async () => {
      mockedRequest.mockResolvedValueOnce({ ok: true, data: { anything: 1 } });
      await expect(markNotificationRead("42", 7)).resolves.toEqual({ ok: true, data: null });
      expect(mockedRequest).toHaveBeenCalledWith(
        "PATCH",
        "/api/v1/notifications/42/read",
        undefined,
        { expectedUserId: 7 },
      );
    });
  });

  it("실패는 코드로 닫는다 — 던지지 않는다", async () => {
    mockedRequest.mockResolvedValueOnce({ ok: false, error: { code: "network" } });
    await expect(fetchNotifications(7)).resolves.toEqual({ ok: false, code: "network" });
    mockedRequest.mockResolvedValueOnce({ ok: false, error: { code: "unauthenticated" } });
    await expect(fetchUnread(7)).resolves.toEqual({ ok: false, code: "unauthenticated" });
    mockedRequest.mockResolvedValueOnce({
      ok: false,
      error: { code: "http", status: 401, body: null },
    });
    await expect(markNotificationRead("1", 7)).resolves.toEqual({
      ok: false,
      code: "unauthenticated",
    });
    mockedRequest.mockResolvedValueOnce({
      ok: false,
      error: { code: "http", status: 404, body: { code: "NOTIFICATION_NOT_FOUND" } },
    });
    await expect(markNotificationsRead(["1"], 7)).resolves.toEqual({ ok: false, code: "server" });
    mockedRequest.mockResolvedValueOnce({ ok: false, error: { code: "malformed" } });
    await expect(fetchUnread(7)).resolves.toEqual({ ok: false, code: "malformed" });
  });
});
