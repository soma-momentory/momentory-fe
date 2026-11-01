import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { generatedRoutes } from "../routes.generated";
import { routeSections } from "../routeMeta";
import { matchPathname, resolveHref, shellRoutes, shellSections } from "../routes";

const root = path.resolve(__dirname, "../../../..");

describe("라우트 목록은 app/ 과 맞물린다", () => {
  it("routes.generated.ts 가 app/ 의 지금 모습과 같다 (어긋나면 npm run lab:routes)", () => {
    expect(() =>
      execFileSync(process.execPath, ["expo-lab/scripts/gen-routes.mjs", "--check"], {
        cwd: root,
        stdio: "pipe",
      }),
    ).not.toThrow();
  });

  it("모든 라우트에 손으로 적은 제목이 있다 — 새 라우트는 routeMeta.ts 에 더한다", () => {
    const titled = new Set(routeSections.flatMap((section) => section.routes.map((r) => r.path)));
    const missing = generatedRoutes.filter((route) => !titled.has(route.path)).map((r) => r.path);
    expect(missing).toEqual([]);
  });

  it("routeMeta.ts 에 app/ 에 없는 라우트가 남아 있지 않다", () => {
    const generated = new Set(generatedRoutes.map((route) => route.path));
    const stale = routeSections
      .flatMap((section) => section.routes.map((r) => r.path))
      .filter((p) => !generated.has(p));
    expect(stale).toEqual([]);
  });

  it("같은 라우트를 두 번 적지 않는다", () => {
    const paths = routeSections.flatMap((section) => section.routes.map((r) => r.path));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("묶음은 앱에서 만나는 순서다", () => {
    expect(shellSections.map((section) => section.id)).toEqual([
      "entry",
      "intro",
      "onboarding",
      "tabs",
      "home-sheets",
      "retro",
      "letter",
      "diary",
      "rest",
      "my",
    ]);
  });
});

describe("프리셋", () => {
  const preset = (p: string) => shellRoutes.find((route) => route.path === p)!.preset;

  it("로그인 전 화면은 세션 없이 new-user 로 연다", () => {
    for (const p of ["/", "/login", "/intro/start", "/intro/report"]) {
      expect(preset(p)).toEqual({ signedIn: false, dataset: "new-user" });
    }
  });

  it("온보딩은 로그인한 new-user 로 연다", () => {
    for (const p of ["/mood", "/name", "/now"]) {
      expect(preset(p)).toEqual({ signedIn: true, dataset: "new-user" });
    }
  });

  it("나머지는 로그인한 채 사용자가 고른 데이터 세트를 쓴다", () => {
    for (const p of ["/home", "/retro/talk", "/my/profile", "/diary/[id]"]) {
      expect(preset(p)).toEqual({ signedIn: true, dataset: null });
    }
  });
});

describe("주소", () => {
  const route = (p: string) => shellRoutes.find((item) => item.path === p)!;
  const now = "2026-11-03T21:30:00+09:00";

  it("동적 조각은 가짜 서버가 준 id 를 쓴다", () => {
    expect(resolveHref(route("/diary/[id]"), { diaryId: 37 }, now, 0)).toBe("/diary/37");
    expect(resolveHref(route("/home/schedule/[id]"), { scheduleId: 5 }, now, 0)).toBe(
      "/home/schedule/5",
    );
    expect(resolveHref(route("/letter/[date]"), { letterDate: "2026-11-01" }, now, 0)).toBe(
      "/letter/2026-11-01",
    );
  });

  it("가짜 서버가 아무것도 안 주면 자리표시 값 · 편지는 가상 오늘", () => {
    expect(resolveHref(route("/diary/[id]"), {}, now, 0)).toBe("/diary/1");
    expect(resolveHref(route("/letter/[date]"), {}, now, 0)).toBe("/letter/2026-11-03");
  });

  it("검색 조건이 필요한 화면은 붙여서 연다", () => {
    expect(resolveHref(route("/rest/records"), {}, null, 0)).toBe(
      "/rest/records?content=sense_pond",
    );
  });

  it("프레임이 알려 준 실제 주소를 라우트로 되돌린다", () => {
    expect(matchPathname("/diary/37")?.path).toBe("/diary/[id]");
    expect(matchPathname("/home/schedule/new")?.path).toBe("/home/schedule/new");
    expect(matchPathname("/home/schedule/9")?.path).toBe("/home/schedule/[id]");
    expect(matchPathname("/rest/records?content=worry_box")?.path).toBe("/rest/records");
    expect(matchPathname("/")?.path).toBe("/");
    expect(matchPathname("/nowhere")).toBeUndefined();
  });
});
