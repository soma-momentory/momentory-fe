import { describe, expect, it } from "@jest/globals";

import { isRoutePattern, matchRoute, normalizeRoute } from "../routeMatch";

describe("matchRoute", () => {
  it("같은 주소 · 그룹 · 끝 index · 쿼리 · 끝 / 를 같은 화면으로 본다", () => {
    expect(matchRoute("/home", "/home")).toBe(true);
    expect(matchRoute("/(tabs)/home", "/home")).toBe(true);
    expect(matchRoute("/home", "/(tabs)/home/")).toBe(true);
    expect(matchRoute("/home", "/home?tab=1#x")).toBe(true);
    expect(matchRoute("/diary/[id]/index", "/diary/7")).toBe(true);
    expect(matchRoute("/", "/")).toBe(true);
    expect(matchRoute("/", "/(tabs)")).toBe(true);
  });

  it("[id] 는 조각 하나에 맞고, 패턴 그대로의 주소에도 맞는다", () => {
    expect(matchRoute("/diary/[id]", "/diary/123")).toBe(true);
    expect(matchRoute("/diary/[id]", "/diary/[id]")).toBe(true);
    expect(matchRoute("/diary/[id]", "/diary")).toBe(false);
    expect(matchRoute("/diary/[id]", "/diary/1/edit")).toBe(false);
    expect(matchRoute("/home/schedule/[id]", "/home/schedule/new")).toBe(true);
    expect(matchRoute("/letter/[date]", "/letter/2026-11-02")).toBe(true);
  });

  it("실제 주소로 저장한 시안은 그 주소에만 맞는다", () => {
    expect(matchRoute("/diary/123", "/diary/123")).toBe(true);
    expect(matchRoute("/diary/123", "/diary/124")).toBe(false);
    expect(matchRoute("/diary/123", "/diary/[id]")).toBe(false);
  });

  it("다른 화면 · 앞부분만 같은 화면은 맞지 않는다", () => {
    expect(matchRoute("/home", "/my")).toBe(false);
    expect(matchRoute("/home", "/home/schedule/1")).toBe(false);
    expect(matchRoute("/rest/cards", "/rest")).toBe(false);
  });

  it("[...rest] 는 하나 이상, [[...rest]] 는 0개 이상", () => {
    expect(matchRoute("/docs/[...slug]", "/docs/a/b")).toBe(true);
    expect(matchRoute("/docs/[...slug]", "/docs")).toBe(false);
    expect(matchRoute("/docs/[[...slug]]", "/docs")).toBe(true);
    expect(matchRoute("/docs/[[...slug]]", "/docs/a/b/c")).toBe(true);
  });

  it("정규형 · 패턴 판별", () => {
    expect(normalizeRoute("/(tabs)/home/")).toBe("/home");
    expect(normalizeRoute("/diary/[id]/index")).toBe("/diary/[id]");
    expect(normalizeRoute("")).toBe("/");
    expect(isRoutePattern("/diary/[id]")).toBe(true);
    expect(isRoutePattern("/home")).toBe(false);
  });
});
