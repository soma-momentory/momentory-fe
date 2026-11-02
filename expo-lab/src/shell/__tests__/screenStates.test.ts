import { describe, expect, it } from "@jest/globals";
import { FrameBus } from "../frameBus";
import { describeFailPaths, stateLabel } from "../ScreenStatePicker";
import { findRoute, matchPathname } from "../routes";
import {
  apiPrefix,
  bStatesFor,
  currentStateOf,
  failurePathsFrom,
  LOADING_LATENCY_MS,
  stateConfig,
  statesFor,
} from "../screenStates";
import { fitRow, fitScale } from "../stageFit";

const route = (path: string) => findRoute(path)!;

describe("화면 상태 — 고를 수 있는 것", () => {
  it("로그인한 화면은 신규 사용자 · 기록 없음 · 기록 보통 · 기록 많음 · 긴 글 · 불러오는 중 · 불러오기 실패", () => {
    expect(statesFor(route("/home")).map((s) => s.label)).toEqual([
      "신규 사용자",
      "기록 없음",
      "기록 보통",
      "기록 많음",
      "긴 글",
      "불러오는 중",
      "불러오기 실패",
    ]);
  });

  it("로그인 전 · 온보딩 화면은 신규 사용자 하나와 불러오는 중 · 실패", () => {
    for (const path of ["/login", "/intro/start", "/mood"]) {
      expect(statesFor(route(path)).map((s) => s.id)).toEqual(["new-user", "loading", "failure"]);
      expect(bStatesFor(route(path)).map((s) => s.id)).toEqual(["new-user", "loading", "failure"]);
    }
  });

  it("B 화면 상태는 일반 화면에서 신규 사용자를 뺀다 — 앱이 B 를 온보딩으로 보내면 A 까지 끌려간다", () => {
    expect(bStatesFor(route("/home")).map((s) => s.id)).toEqual([
      "empty",
      "normal",
      "many",
      "long-copy",
      "loading",
      "failure",
    ]);
  });

  it("불러오는 중은 기록 보통 + 1분 지연, 실패는 기록 보통 + 이 화면이 부른 주소", () => {
    const home = route("/home");
    expect(stateConfig(home, "loading", ["/api/v1/schedules"])).toEqual({
      dataset: "normal",
      latencyMs: LOADING_LATENCY_MS,
      failPaths: [],
    });
    expect(stateConfig(home, "failure", ["/api/v1/schedules"])).toEqual({
      dataset: "normal",
      latencyMs: 0,
      failPaths: ["/api/v1/schedules"],
    });
    expect(stateConfig(home, "many", ["/api/v1/schedules"]).failPaths).toEqual([]);
  });

  it("화면이 붙잡으려고 건 실패 주소(스플래시)는 어느 상태에서도 둔다", () => {
    const splash = route("/");
    expect(stateConfig(splash, "new-user", []).failPaths).toEqual(["/api/v1/users/me"]);
    expect(stateConfig(splash, "failure", ["/api/v1/users/me", "/api/v1/x"]).failPaths).toEqual([
      "/api/v1/users/me",
      "/api/v1/x",
    ]);
  });

  it("지금 셸 상태를 상태 이름으로 읽는다 — 직접 바꾼 조건이면 null", () => {
    const home = route("/home");
    const detected = ["/api/v1/diaries", "/api/v1/schedules"];
    const base = { dataset: "normal" as const, latencyMs: 0, failPaths: [] as string[] };
    expect(currentStateOf(base, home, detected)).toBe("normal");
    expect(currentStateOf({ ...base, dataset: "many" }, home, detected)).toBe("many");
    expect(currentStateOf({ ...base, latencyMs: LOADING_LATENCY_MS }, home, detected)).toBe(
      "loading",
    );
    expect(currentStateOf({ ...base, failPaths: ["/api/v1/schedules"] }, home, detected)).toBe(
      "failure",
    );
    expect(currentStateOf({ ...base, latencyMs: 1000 }, home, detected)).toBeNull();
    expect(currentStateOf({ ...base, failPaths: ["/api/v1/reports"] }, home, detected)).toBeNull();
    // 머리 · 도구줄에 쓰는 이름
    expect(stateLabel({ ...base, dataset: "many" }, home, detected)).toBe("기록 많음");
    expect(stateLabel({ ...base, latencyMs: 1000 }, home, detected)).toBe("직접 고른 조건");
  });
});

describe("화면 상태 — 실패시킬 주소", () => {
  it("요청 주소에서 id · 날짜 · 검색 조건을 뗀 접두사", () => {
    expect(apiPrefix("/api/v1/diaries/12?x=1")).toBe("/api/v1/diaries");
    expect(apiPrefix("/api/v1/letters/2026-11-01")).toBe("/api/v1/letters");
    expect(apiPrefix("/api/v1/reports/weekly?from=2026-10-27")).toBe("/api/v1/reports/weekly");
    expect(apiPrefix("/api/v1/schedules?date=2026-11-02")).toBe("/api/v1/schedules");
    expect(apiPrefix("/api/v1/users/me")).toBe("/api/v1/users/me");
    expect(apiPrefix("/assets/font.ttf")).toBeNull();
  });

  it("짧은 접두사가 덮는 것은 하나로 · 중복 없이 · 정렬", () => {
    expect(
      failurePathsFrom([
        "/api/v1/schedules/sync",
        "/api/v1/schedules",
        "/api/v1/diaries",
        "/api/v1/diaries",
      ]),
    ).toEqual(["/api/v1/diaries", "/api/v1/schedules"]);
  });

  it("셸은 프레임이 서 있던 화면 몫으로 모은다 — 두 단계 열기의 경유 화면 요청은 빼고", () => {
    const bus = new FrameBus();
    bus.setPathname("solo", "/home");
    bus.handle({ type: "lab:ready", frameId: "solo", pathname: "/home" });
    bus.handle({
      type: "lab:request",
      frameId: "solo",
      method: "GET",
      path: "/api/v1/schedules?date=2026-11-02",
      status: 200,
    });
    bus.setPathname("other", "/diary/3");
    bus.queueNavigate("other", { target: "/diary/3", afterRequest: "/x", fallbackMs: 99_999 });
    bus.handle({
      type: "lab:request",
      frameId: "other",
      method: "GET",
      path: "/api/v1/diaries?year=2026",
      status: 200,
    });
    bus.cancelNavigate("other");
    const forRoute = (path: string) =>
      bus.pathsFor((pathname) => matchPathname(pathname)?.path === path);
    expect(forRoute("/home")).toEqual(["/api/v1/schedules"]);
    expect(forRoute("/diary/[id]")).toEqual([]);
  });
});

describe("화면 상태 — 안내 · 배율", () => {
  it("실패시킨 주소는 /api/v1 을 떼고 보여 준다", () => {
    expect(describeFailPaths(["/api/v1/reports/weekly", "/api/v1/users/me"])).toBe(
      "실패시킨 요청: /reports/weekly · /users/me",
    );
    expect(describeFailPaths([])).toBe("실패시킬 요청이 없어요");
  });

  it("A/B 는 두 대를 한 줄에 — fitRow 와 같다", () => {
    const phone = { width: 420, height: 880 };
    const area = { width: 1100, height: 900 };
    const two = fitRow(area, 12, [phone, phone]);
    expect(two).toBeCloseTo(fitScale("ab", area, 12, [phone, phone]));
    expect(fitRow(area, 12, [phone, phone, phone])).toBeLessThan(two);
  });
});
