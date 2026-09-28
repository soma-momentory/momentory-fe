import { createScreenObserver, createForegroundObserver, describeRoute } from "../observation";
import { createAnalytics, type AnalyticsEnvelope } from "../client";

it("온보딩 rest와 쉼터를 구분하며 동적 경로 원문을 화면명으로 보내지 않는다", () => {
  expect(describeRoute("(onboarding)/rest")).toEqual({ screen: "onboarding", step: "rest" });
  expect(describeRoute("(tabs)/rest")).toEqual({ screen: "rest" });
  expect(describeRoute("rest/sense-pond")).toEqual({ screen: "sense_pond" });
  expect(describeRoute("diary/[id]/index")).toEqual({ screen: "diary_detail" });
  expect(describeRoute("private/임의 내용")).toBeNull();
});

/** 받은 이벤트를 모은다 — 체류 시간을 정확히 보려고 관찰자의 시계를 손으로 돌린다 */
function setup() {
  const received: AnalyticsEnvelope[] = [];
  const client = createAnalytics({
    enabled: true,
    now: () => 1,
    uuid: () => "uuid",
    load: async () => ({
      identify: () => {},
      send: (e) => {
        received.push(e);
      },
      flush: () => {},
    }),
  });
  client.identify(7);
  let time = 0;
  const observer = createScreenObserver(client.track, () => time);
  const pass = (ms: number) => {
    time += ms;
  };
  const events = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
    return received.map((e) => [e.name, e.properties]);
  };
  return { observer, pass, events };
}

it("화면 재렌더는 한 번, 다른 화면을 거친 재진입은 다시 센다 — 떠날 때 머문 시간을 닫는다", async () => {
  const { observer, pass, events } = setup();
  observer.route("(tabs)/home");
  pass(4_000);
  observer.route("(tabs)/home");
  pass(1_000);
  observer.route("(onboarding)/nickname");
  pass(12_000);
  observer.route("(onboarding)/nickname");
  observer.route("(tabs)/home");

  expect(await events()).toEqual([
    ["screen_viewed", { screen: "home" }],
    ["screen_left", { screen: "home", duration_ms: 5_000, exit: "navigate" }],
    ["screen_viewed", { screen: "onboarding" }],
    ["onboarding_step_viewed", { step: "nickname" }],
    // 온보딩은 화면명이 하나라 단계로 닫는다
    ["onboarding_step_left", { step: "nickname", duration_ms: 12_000, exit: "navigate" }],
    ["screen_viewed", { screen: "home" }],
  ]);
});

it("백그라운드에 있던 시간은 세지 않는다 — 그때까지를 닫고, 돌아오면 다시 잰다", async () => {
  const { observer, pass, events } = setup();
  observer.route("(tabs)/rest");
  pass(3_000);
  observer.appState("inactive");
  observer.appState("background");
  pass(8 * 60 * 60 * 1000);
  observer.appState("active");
  pass(2_000);
  observer.route("(tabs)/home");

  expect(await events()).toEqual([
    ["screen_viewed", { screen: "rest" }],
    ["screen_left", { screen: "rest", duration_ms: 3_000, exit: "background" }],
    ["screen_left", { screen: "rest", duration_ms: 2_000, exit: "navigate" }],
    ["screen_viewed", { screen: "home" }],
  ]);
});

it("알림 센터처럼 inactive 에만 머문 시간은 끊지 않는다", async () => {
  const { observer, pass, events } = setup();
  observer.route("(tabs)/home");
  observer.appState("inactive");
  pass(2_000);
  observer.appState("active");
  observer.route("(tabs)/my");

  expect(await events()).toContainEqual([
    "screen_left",
    { screen: "home", duration_ms: 2_000, exit: "navigate" },
  ]);
});

it("모르는 라우트로 가도 떠난 화면의 시간은 닫는다 — 모르는 화면은 재지 않는다", async () => {
  const { observer, pass, events } = setup();
  observer.route("(tabs)/home");
  pass(1_000);
  observer.route("private/임의 내용");
  pass(9_000);
  observer.route("(tabs)/my");

  expect(await events()).toEqual([
    ["screen_viewed", { screen: "home" }],
    ["screen_left", { screen: "home", duration_ms: 1_000, exit: "navigate" }],
    ["screen_viewed", { screen: "my" }],
  ]);
});

it("알림센터 같은 inactive 복귀를 재방문으로 세지 않는다", () => {
  const onForeground = jest.fn();
  const observe = createForegroundObserver(onForeground);
  for (const state of ["active", "inactive", "active"]) observe(state);
  expect(onForeground).not.toHaveBeenCalled();
  for (const state of ["background", "inactive", "active", "active"]) observe(state);
  expect(onForeground).toHaveBeenCalledTimes(1);
});
