import { createAnalytics, type AnalyticsEnvelope } from "../client";
import { startRetro, sendTurn } from "@/features/retro/data/retroApi";
import { createSchedule, putCompletion } from "@/features/home/data/scheduleApi";
import { useAuth, SESSION_KEY, getAccessToken } from "@/features/auth/model/auth";
import { deleteAccount } from "@/features/auth/data/withdrawApi";

const mockEvents: AnalyticsEnvelope[] = [];
let mockSequence = 0;
const mockAnalytics = createAnalytics({
  enabled: true,
  now: () => 1000,
  uuid: () => String(++mockSequence),
  load: async () => ({
    identify: () => {},
    send: (e) => {
      mockEvents.push(e);
    },
    flush: () => {},
  }),
});
jest.mock("@/features/analytics", () => ({
  track: (...args: Parameters<typeof mockAnalytics.track>) => mockAnalytics.track(...args),
  captureAnalytics: () => mockAnalytics.capture(),
  identifyAnalytics: (id: number | null) => mockAnalytics.identify(id),
  resetAnalytics: () => mockAnalytics.identify(null),
  flushAnalytics: () => {},
}));
jest.mock("@/lib/config", () => ({
  getApiBaseUrl: () => "http://api.test",
  getGoogleIosClientId: () => "ios.apps.googleusercontent.com",
  getGoogleWebClientId: () => "web.apps.googleusercontent.com",
}));
jest.mock("@/features/auth/data/withdrawApi", () => ({ deleteAccount: jest.fn() }));
jest.mock("@/features/auth/data/meApi", () => ({
  fetchMe: async () => ({ ok: false, code: "network" }),
}));

const secure = jest.requireMock("expo-secure-store").__store as Map<string, string>;
const respond = (body: unknown, status = 200) => {
  globalThis.fetch = jest.fn(async () => ({
    ok: status < 300,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  })) as unknown as typeof fetch;
};
const settle = async () => {
  for (let i = 0; i < 15; i++) await Promise.resolve();
};
const reply = (phase: string, done: boolean) => ({
  text: "민감한 AI 원문",
  phase,
  done,
});

beforeEach(async () => {
  secure.set(
    SESSION_KEY,
    JSON.stringify({
      userId: 7,
      accessToken: "secret",
      refreshToken: "refresh",
      expiresAt: Date.now() + 60000,
    }),
  );
  useAuth.setState({ status: "hydrating", withdrawing: false });
  mockAnalytics.identify(null);
  await useAuth.getState().hydrate();
  await settle();
  mockEvents.length = 0;
});

it("복원된 서비스 ID로 일정 성공만 기록하며 제목/감정은 보내지 않는다", async () => {
  respond({
    id: 12,
    title: "비밀",
    date: "2026-09-05",
    source: "MANUAL",
    hidden: false,
    completed: false,
    emotion: "DEPRESSED",
  });
  expect((await createSchedule("2026-09-05", "비밀")).ok).toBe(true);
  respond({}, 500);
  expect((await createSchedule("2026-09-05", "다른 비밀")).ok).toBe(false);
  await settle();
  expect(mockEvents).toEqual([
    expect.objectContaining({
      name: "schedule_created",
      userId: "7",
      properties: { schedule_id: "12", source: "manual" },
    }),
  ]);
});

it("일정 완료에는 어디서 온 일정인지 싣는다 — 캘린더 일정이 실제로 쓰이는지 본다", async () => {
  respond({ completed: true, emotion: null });
  expect((await putCompletion("12", true, null, "calendar")).ok).toBe(true);
  await settle();
  expect(mockEvents).toEqual([
    expect.objectContaining({
      name: "schedule_completion_changed",
      properties: { schedule_id: "12", completed: true, source: "calendar" },
    }),
  ]);
});

it("회고 done인 비정상 종료를 완료로 세지 않고 실제 complete만 기록한다", async () => {
  respond({ sessionId: 31, reply: reply("diary_chat", false) });
  expect((await startRetro({ schedules: [{ name: "비밀 일정" }] })).ok).toBe(true);
  respond(reply("ended", true));
  expect((await sendTurn(31, { content: "비밀 대화" })).ok).toBe(true);
  respond(reply("complete", true));
  expect((await sendTurn(31, { optionIds: ["2"] })).ok).toBe(true);
  await settle();
  expect(mockEvents.map((e) => [e.name, e.properties])).toEqual([
    ["retrospect_started", { retrospect_id: "31" }],
    ["retrospect_turn_succeeded", { retrospect_id: "31", input_kind: "text" }],
    ["retrospect_turn_succeeded", { retrospect_id: "31", input_kind: "selection" }],
    ["retrospect_completed", { retrospect_id: "31" }],
  ]);
});

it("탈퇴 실패는 완료로 세지 않고 성공을 신원 초기화 전에 기록한다", async () => {
  jest.mocked(deleteAccount).mockResolvedValueOnce({ ok: false, code: "server" });
  expect(await useAuth.getState().withdraw()).toBe(false);
  expect(useAuth.getState().status).toBe("authenticated");
  jest.mocked(deleteAccount).mockResolvedValueOnce({ ok: true });
  expect(await useAuth.getState().withdraw()).toBe(true);
  await settle();
  expect(mockEvents.map((e) => [e.name, e.userId])).toEqual([
    ["withdrawal_submitted", "7"],
    ["withdrawal_failed", "7"],
    ["withdrawal_submitted", "7"],
    ["withdrawal_completed", "7"],
  ]);
  expect(useAuth.getState().status).toBe("anonymous");
});

it("로컬 로그아웃 완료는 이전 사용자로 한 번 남긴다", async () => {
  await useAuth.getState().signOut();
  await settle();
  expect(useAuth.getState().status).toBe("anonymous");
  expect(mockEvents.map((e) => [e.name, e.userId])).toEqual([["logout_completed", "7"]]);
});

it("로그인 성공은 인증 저장 뒤 내부 ID로 기록하고 응답의 토큰을 제외한다", async () => {
  await useAuth.getState().signOut();
  await settle();
  mockEvents.length = 0;
  respond({
    userId: 42,
    accessToken: "access-secret",
    refreshToken: "refresh-secret",
    tokenType: "Bearer",
    accessTokenExpiresIn: 3600,
    onboardingRequired: true,
  });
  expect(await useAuth.getState().signInWithGoogle()).toEqual({
    kind: "signed-in",
    onboardingRequired: true,
  });
  await settle();
  expect(mockEvents.map((e) => [e.name, e.userId, e.properties])).toEqual([
    ["login_started", null, { provider: "google" }],
    ["login_succeeded", "42", { provider: "google", onboarding_required: true }],
  ]);
});

it("반복 완료 응답은 카드를 한 번만 생성으로 세고 카드 원문은 버린다", async () => {
  respond({
    ...reply("complete", true),
    wishCard: {
      wishCardId: 63,
      situation: "비밀 상황",
      emotions: ["depressed"],
      needs: [{ word: "비밀 욕구", meaning: "비밀 뜻" }],
      desiredState: "비밀 상태",
      smallAction: "비밀 행동",
      sentiment: "uncomfortable",
    },
  });
  await sendTurn(81, { optionIds: ["1"] });
  await sendTurn(81, { optionIds: ["1"] });
  await settle();
  expect(mockEvents.filter((e) => e.name === "wish_card_created")).toEqual([
    expect.objectContaining({ properties: { wish_card_id: "63", retrospect_id: "81" } }),
  ]);
  expect(mockEvents.filter((e) => e.name === "retrospect_completed")).toHaveLength(1);
  expect(JSON.stringify(mockEvents)).not.toContain("비밀");
});

it("일반 API 중 갱신 토큰이 폐기되면 다음 로그인 화면은 익명으로 기록한다", async () => {
  const oldRequest = mockAnalytics.capture();
  secure.set(
    SESSION_KEY,
    JSON.stringify({
      userId: 7,
      accessToken: "expired",
      refreshToken: "revoked",
      expiresAt: 1,
    }),
  );
  respond({ code: "REFRESH_TOKEN_REVOKED" }, 401);
  expect(await getAccessToken()).toBeNull();
  expect(useAuth.getState().status).toBe("anonymous");
  mockAnalytics.track("screen_viewed", { screen: "login" });
  oldRequest("schedule_deleted", { schedule_id: "12" });
  await settle();
  expect(mockEvents.map((e) => [e.name, e.userId])).toEqual([["screen_viewed", null]]);
});
