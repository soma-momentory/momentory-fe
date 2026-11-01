/**
 * 시안의 라우트 패턴이 지금 화면에 맞는가 — expo-router 규칙을 따른다.
 *
 * - 그룹 `(tabs)` 은 주소에 없다 → 양쪽에서 뺀다(`/(tabs)/home` = `/home`)
 * - 끝의 `index` 는 부모다(`/diary/[id]/index` = `/diary/[id]`)
 * - `[id]` 는 빈 조각이 아닌 아무 조각 하나 · `[...rest]` 는 하나 이상 · `[[...rest]]` 는 0개 이상
 * - 쿼리 · 해시 · 끝 `/` 는 무시한다
 * - 지금 화면이 **패턴 그대로**(`/diary/[id]`)여도 맞는다 — 셸 상태는 패턴을 들고 있다
 */

const isGroup = (segment: string) => /^\(.+\)$/.test(segment);

/** 주소나 패턴을 조각 목록으로 — 그룹 · 끝 index · 쿼리를 걷어 낸다 */
export function routeSegments(path: string): string[] {
  const clean = path.split(/[?#]/)[0] ?? "";
  const segments = clean.split("/").filter((segment) => segment !== "" && !isGroup(segment));
  if (segments[segments.length - 1] === "index") segments.pop();
  return segments;
}

/** 비교용 정규형 — `/(tabs)/home/` → `/home` */
export const normalizeRoute = (path: string): string => `/${routeSegments(path).join("/")}`;

const isDynamic = (segment: string) => /^\[[^[\].]+\]$/.test(segment);
const isCatchAll = (segment: string) => /^\[\.\.\.[^[\]]+\]$/.test(segment);
const isOptionalCatchAll = (segment: string) => /^\[\[\.\.\.[^[\]]+\]\]$/.test(segment);

export function matchRoute(pattern: string, pathname: string): boolean {
  const want = routeSegments(pattern);
  const have = routeSegments(pathname);
  for (let i = 0; i < want.length; i += 1) {
    const segment = want[i]!;
    if (isOptionalCatchAll(segment)) return true;
    if (isCatchAll(segment)) return have.length > i;
    const actual = have[i];
    if (actual === undefined) return false;
    if (actual === segment) continue;
    if (isDynamic(segment)) continue;
    return false;
  }
  return have.length === want.length;
}

/** 동적 조각이 있는 패턴인가 — 패널이 「모든 id」라고 알려 줄 때 */
export const isRoutePattern = (pattern: string): boolean =>
  routeSegments(pattern).some(
    (segment) => isDynamic(segment) || isCatchAll(segment) || isOptionalCatchAll(segment),
  );
