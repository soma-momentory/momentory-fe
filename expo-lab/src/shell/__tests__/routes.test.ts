import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { generatedRoutes } from "../routes.generated";
import { routeSections } from "../routeMeta";
import {
  findRoute,
  isOnScreenOf,
  matchPathname,
  resolveHref,
  restartPath,
  shellRoutes,
  shellSections,
} from "../routes";

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
      .flatMap((section) => section.routes.map((r) => r.screenOf ?? r.path))
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

describe("쉼 추천 시트 — 라우트가 아니라 쉼터 위의 시트", () => {
  const SHEET = "/rest?afterDiary=1";

  it("「쉼터 콘텐츠」 맨 앞의 줄이고, 앱 파일과 달리 시트 부품을 가리킨다", () => {
    const rest = shellSections.find((section) => section.id === "rest")!;
    expect(rest.routes[0]).toMatchObject({
      path: SHEET,
      screenOf: "/rest",
      title: "쉼 추천 시트",
      file: "src/components/rest/RestRecommendSheet.tsx",
      group: "(tabs)",
    });
  });

  it("일기 완료 표시로 열고, 오늘 쓴 일기를 프리셋으로 건다", () => {
    const sheet = findRoute(SHEET)!;
    expect(resolveHref(sheet, {}, null, 0)).toBe(SHEET);
    expect(sheet.preset).toEqual({ signedIn: true, dataset: null, todayDiary: true });
    expect(sheet.openVia).toBeUndefined();
  });

  it("프레임이 알리는 /rest 는 여전히 쉼터 라우트다 — 시트 줄은 그동안만 지금 화면으로 둔다", () => {
    expect(matchPathname("/rest")?.path).toBe("/rest");
    expect(matchPathname(SHEET)?.path).toBe("/rest");
    expect(isOnScreenOf(SHEET, "/rest")).toBe(true);
    expect(isOnScreenOf(SHEET, "/rest/cards")).toBe(false);
    expect(isOnScreenOf("/rest", "/rest")).toBe(false);
  });

  it("다시 띄우면 시트 줄은 시트가 뜨는 주소에서, 다른 화면은 서 있던 주소에서 시작한다", () => {
    const sheet = findRoute(SHEET)!;
    expect(restartPath(sheet, SHEET, "/rest")).toBe(SHEET);
    expect(restartPath(sheet, SHEET, "/rest/sense-pond")).toBe("/rest/sense-pond");
    expect(restartPath(sheet, SHEET, null)).toBeNull();
    expect(restartPath(findRoute("/rest")!, "/rest", "/rest/cards")).toBe("/rest/cards");
  });
});

describe("프리셋", () => {
  const preset = (p: string) => shellRoutes.find((route) => route.path === p)!.preset;

  it("로그인 전 화면은 세션 없이 new-user 로 연다", () => {
    for (const p of ["/login", "/intro/start", "/intro/report"]) {
      expect(preset(p)).toEqual({ signedIn: false, dataset: "new-user" });
    }
  });

  it("스플래시는 /users/me 를 실패시켜 붙잡아 둔다(바로 넘어가지 않게)", () => {
    expect(preset("/")).toEqual({
      signedIn: true,
      dataset: "new-user",
      failPaths: ["/api/v1/users/me"],
    });
  });

  it("차갑게 열면 다른 곳으로 가는 화면은 경유 화면을 먼저 연다", () => {
    const via = (p: string) => shellRoutes.find((route) => route.path === p)!.openVia?.path;
    expect(via("/diary/[id]")).toBe("/archive");
    expect(via("/home/schedule/[id]")).toBe("/home");
    expect(via("/home")).toBeUndefined();
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
