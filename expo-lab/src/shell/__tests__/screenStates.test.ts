import { describe, expect, it } from "@jest/globals";
import { FrameBus } from "../frameBus";
import { framesFor, stateSpecs, withFailPaths } from "../frameSpecs";
import { DEFAULT_STATE, parseHash, serializeHash, type ShellState } from "../hashState";
import { findRoute, matchPathname } from "../routes";
import {
  apiPrefix,
  currentStateOf,
  failurePathsFrom,
  LOADING_LATENCY_MS,
  stateConfig,
  statesFor,
} from "../screenStates";
import { fitRow, fitScale } from "../stageFit";

const REAL = Date.parse("2026-11-02T14:05:00+09:00");
const noSample = () => ({});
const route = (path: string) => findRoute(path)!;

describe("상태별로 보기 — 상태 목록", () => {
  it("로그인한 화면은 빈 계정 · 보통 · 많음 · 긴 문구 · 불러오는 중 · 불러오기 실패", () => {
    expect(statesFor(route("/home")).map((s) => s.label)).toEqual([
      "빈 계정",
      "보통",
      "많음",
      "긴 문구",
      "불러오는 중",
      "불러오기 실패",
    ]);
  });

  it("로그인 전 · 온보딩 화면은 신규 사용자 하나와 불러오는 중 · 실패", () => {
    for (const path of ["/login", "/intro/start", "/mood"]) {
      expect(statesFor(route(path)).map((s) => s.id)).toEqual(["new-user", "loading", "failure"]);
    }
  });

  it("불러오는 중은 보통 + 1분 지연, 실패는 보통 + 이 화면이 부른 주소", () => {
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
  });
});

describe("상태별로 보기 — 실패시킬 주소", () => {
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
    bus.setPathname("s-normal", "/home");
    bus.handle({ type: "lab:ready", frameId: "s-normal", pathname: "/home" });
    bus.handle({
      type: "lab:request",
      frameId: "s-normal",
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

describe("상태별로 보기 — 프레임", () => {
  const state: ShellState = { ...DEFAULT_STATE, route: "/report", layout: "states" };

  it("상태마다 칸 하나 — 칸마다 따로인 프레임 id · 데이터 · 지연", () => {
    const specs = framesFor(state, noSample, REAL);
    expect(specs.map((spec) => spec.frameId)).toEqual([
      "s-empty",
      "s-normal",
      "s-many",
      "s-long-copy",
      "s-loading",
      "s-failure",
    ]);
    expect(specs.map((spec) => spec.config.datasetId)).toEqual([
      "empty",
      "normal",
      "many",
      "long-copy",
      "normal",
      "normal",
    ]);
    expect(specs.find((spec) => spec.frameId === "s-loading")!.config.latencyMs).toBe(
      LOADING_LATENCY_MS,
    );
    // 실패 칸의 주소는 셸이 모은 뒤 채운다
    const failure = specs.find((spec) => spec.frameId === "s-failure")!;
    expect(failure.config.failPaths).toEqual([]);
    expect(withFailPaths(failure, ["/api/v1/reports"]).config.failPaths).toEqual([
      "/api/v1/reports",
    ]);
  });

  it("로그인 전 화면은 세션 없이 신규 사용자로", () => {
    const specs = stateSpecs(state, route("/login"), noSample, REAL);
    expect(
      specs.map((spec) => [spec.frameId, spec.config.signedIn, spec.config.datasetId]),
    ).toEqual([
      ["s-new-user", false, "new-user"],
      ["s-loading", false, "new-user"],
      ["s-failure", false, "new-user"],
    ]);
  });

  it("해시에 layout=states 가 남는다", () => {
    expect(serializeHash(state)).toContain("layout=states");
    expect(parseHash(serializeHash(state)).layout).toBe("states");
    expect(parseHash(serializeHash({ ...state, panel: "reference" })).panel).toBe("reference");
  });

  it("맞춤 배율 — 상태 칸은 줄을 바꿔 가며 크게, 나란히 놓기는 한 줄에", () => {
    const phone = { width: 420, height: 880 };
    const area = { width: 1100, height: 900 };
    const six = fitScale("states", area, 12, Array(6).fill(phone));
    expect(six).toBeGreaterThan(0.2);
    expect(six).toBeLessThan(1);
    const two = fitRow(area, 12, [phone, phone]);
    expect(two).toBeCloseTo(fitScale("ab", area, 12, [phone, phone]));
    expect(fitRow(area, 12, [phone, phone, phone])).toBeLessThan(two);
  });
});
