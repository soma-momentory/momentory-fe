/**
 * 셸이 쓰는 라우트 목록 = 자동 목록(`routes.generated.ts`) + 손 메타(`routeMeta.ts`) + 프리셋.
 *
 * 프리셋 = 그 화면을 「의미 있게」 보려면 프레임이 어떤 상태여야 하나:
 * - 로그인 전(스플래시 · 소개 · 로그인) — 세션 없음 · `new-user`
 * - 온보딩 — 세션 있음 · `new-user`(서버가 「온보딩 필요」라고 답한다)
 * - 나머지 — 세션 있음 · 사용자가 고른 데이터 세트(처음엔 `normal`)
 *
 * 가드가 다른 화면으로 넘기는 경우(예: 오늘 일기가 있으면 /retro/confirm → /retro/talk)는
 * 메타의 `hint` 에 적고 셸이 프레임 위에 보여 준다.
 */
import type { DatasetId, SampleParams } from "../lab-contract";
import { generatedRoutes, type GeneratedRoute } from "./routes.generated";
import { routeSections, type RouteMeta, type RouteSectionId } from "./routeMeta";
import { kstDateString, kstParts, virtualMs } from "./time";

export type RoutePreset = {
  signedIn: boolean;
  /** 고정 데이터 세트. null 이면 사용자가 고른 것을 쓴다 */
  dataset: DatasetId | null;
};

export type ShellRoute = GeneratedRoute &
  RouteMeta & {
    section: RouteSectionId | "untitled";
    sectionTitle: string;
    preset: RoutePreset;
  };

const PRE_LOGIN: RoutePreset = { signedIn: false, dataset: "new-user" };
const ONBOARDING: RoutePreset = { signedIn: true, dataset: "new-user" };
const SIGNED_IN: RoutePreset = { signedIn: true, dataset: null };

export function presetForSection(section: ShellRoute["section"]): RoutePreset {
  if (section === "entry" || section === "intro") return PRE_LOGIN;
  if (section === "onboarding") return ONBOARDING;
  return SIGNED_IN;
}

const generatedByPath = new Map(generatedRoutes.map((route) => [route.path, route]));

const titled: ShellRoute[] = routeSections.flatMap((section) =>
  section.routes.flatMap((meta) => {
    const generated = generatedByPath.get(meta.path);
    if (!generated) return [];
    return [
      {
        ...generated,
        ...meta,
        section: section.id,
        sectionTitle: section.title,
        preset: presetForSection(section.id),
      },
    ];
  }),
);

const titledPaths = new Set(titled.map((route) => route.path));

/** `app/` 에 생겼는데 메타가 없는 라우트 — 테스트가 막지만, 셸에서도 「제목 없음」으로 보인다 */
const untitled: ShellRoute[] = generatedRoutes
  .filter((route) => !titledPaths.has(route.path))
  .map((route) => ({
    ...route,
    title: route.path,
    section: "untitled",
    sectionTitle: "제목 없음 (routeMeta.ts 에 더한다)",
    preset: SIGNED_IN,
  }));

export const shellRoutes: readonly ShellRoute[] = [...titled, ...untitled];

export type ShellSection = { id: ShellRoute["section"]; title: string; routes: ShellRoute[] };

export const shellSections: readonly ShellSection[] = shellRoutes.reduce<ShellSection[]>(
  (sections, route) => {
    const last = sections.at(-1);
    if (last && last.id === route.section) last.routes.push(route);
    else sections.push({ id: route.section, title: route.sectionTitle, routes: [route] });
    return sections;
  },
  [],
);

export const findRoute = (path: string | null | undefined): ShellRoute | undefined =>
  shellRoutes.find((route) => route.path === path);

export const DEFAULT_ROUTE_PATH = "/home";

/** 프레임이 알려 준 실제 주소(`/diary/12?x=1`)를 라우트 패턴(`/diary/[id]`)으로 */
export function matchPathname(pathname: string): ShellRoute | undefined {
  const clean = pathname.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  const exact = findRoute(clean);
  if (exact) return exact;
  const parts = clean.split("/");
  return shellRoutes.find((route) => {
    const pattern = route.path.split("/");
    return (
      pattern.length === parts.length &&
      pattern.every((seg, i) => (/^\[.+\]$/.test(seg) ? parts[i] !== "" : seg === parts[i]))
    );
  });
}

/** 실제로 열 주소 — 동적 조각은 가짜 서버가 알려 준 id, 없으면 자리표시 값 */
export function resolveHref(
  route: Pick<ShellRoute, "path" | "query">,
  sample: SampleParams,
  now: string | null,
  realMs: number,
): string {
  const today = kstDateString(kstParts(virtualMs(now, realMs)));
  const values: Record<string, string> = {
    id: String(
      route.path.startsWith("/home/schedule") ? (sample.scheduleId ?? 1) : (sample.diaryId ?? 1),
    ),
    date: sample.letterDate ?? today,
  };
  const path = route.path.replace(/\[([^\]]+)\]/g, (_, name: string) =>
    encodeURIComponent(values[name] ?? "1"),
  );
  const query = route.query ? `?${new URLSearchParams(route.query).toString()}` : "";
  return `${path}${query}`;
}

/** 회고를 처음부터 — 「일기 쓰기 다시 시작」 단축 버튼이 연다 */
export const RETRO_START_PATH = "/retro/confirm";
export const RETRO_WRITE_PATH = "/retro/write";
