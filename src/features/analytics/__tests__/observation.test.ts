import { createScreenObserver, createForegroundObserver, describeRoute } from "../observation";
import { createAnalytics, type AnalyticsEnvelope } from "../client";

it("온보딩 rest와 쉼터를 구분하며 동적 경로 원문을 화면명으로 보내지 않는다", () => {
  expect(describeRoute("(onboarding)/rest")).toEqual({ screen: "onboarding", step: "rest" });
  expect(describeRoute("(tabs)/rest")).toEqual({ screen: "rest" });
  expect(describeRoute("rest/sense-pond")).toEqual({ screen: "sense_pond" });
  expect(describeRoute("diary/[id]/index")).toEqual({ screen: "diary_detail" });
  expect(describeRoute("private/임의 내용")).toBeNull();
});

it("화면 재렌더는 한 번, 다른 화면을 거친 재진입은 다시 센다", async () => {
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
  const observer = createScreenObserver(client.track);
  observer("(tabs)/home");
  observer("(tabs)/home");
  observer("(onboarding)/nickname");
  observer("(onboarding)/nickname");
  observer("(tabs)/home");
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(received.map((e) => [e.name, e.properties])).toEqual([
    ["screen_viewed", { screen: "home" }],
    ["screen_viewed", { screen: "onboarding" }],
    ["onboarding_step_viewed", { step: "nickname" }],
    ["screen_viewed", { screen: "home" }],
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
