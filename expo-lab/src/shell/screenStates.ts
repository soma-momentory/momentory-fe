/**
 * 「상태별로 보기」 · 한 화면 「상태: 보통 ▾」 — 같은 화면을 데이터 양 · 불러오는 중 · 불러오기 실패로.
 *
 * - 데이터 상태(빈 계정 · 보통 · 많음 · 긴 문구)는 가짜 서버 데이터 세트 하나씩이다. 로그인 전 ·
 *   온보딩 화면은 데이터 세트가 「신규 사용자」로 묶여 있어 그 하나만 보인다.
 * - 불러오는 중 = 보통 + 서버가 1분 늦게 답한다(`LOADING_LATENCY_MS`) — 그동안 로딩이 머문다.
 * - 불러오기 실패 = 보통 + **이 화면이 실제로 부른 서버 주소**를 실패시킨다. 주소는 셸이 프레임의
 *   `lab:request` 를 받을 때 그 프레임이 서 있던 화면 몫으로 모은다(`frameBus.pathsFor`) —
 *   `/api/v1/diaries/12?x=1` 은 `/api/v1/diaries` 처럼 id · 날짜 · 검색 조건을 뗀 접두사로 줄인다.
 *   앱이 켜질 때 부르는 `/api/v1/users/me` 도 그대로 둔다 — 차갑게 연 칸이 실제로 부른 것이고,
 *   실패해도 앱 진입은 막히지 않는다(홈은 그대로 그려지고 마이는 닉네임이 빈다 · 2026-11-02 확인).
 *
 * 순수 함수만 둔다 — `__tests__/screenStates.test.ts` 가 고정한다.
 */
import type { DatasetId } from "../lab-contract";
import type { ShellState } from "./hashState";
import type { ShellRoute } from "./routes";

export type ScreenStateId =
  "new-user" | "empty" | "normal" | "many" | "long-copy" | "loading" | "failure";

export type ScreenStateDef = {
  id: ScreenStateId;
  label: string;
  /** 풍선 도움말 한 문장 */
  help: string;
};

/** 불러오는 중을 붙잡아 두는 서버 지연 — 해시가 읽는 상한(60초)과 같다 */
export const LOADING_LATENCY_MS = 60_000;

const STATES: Record<ScreenStateId, ScreenStateDef> = {
  "new-user": {
    id: "new-user",
    label: "신규 사용자",
    help: "처음 설치한 사람처럼 기록이 하나도 없는 상태예요",
  },
  empty: { id: "empty", label: "빈 계정", help: "온보딩은 마쳤지만 기록이 하나도 없는 상태예요" },
  normal: { id: "normal", label: "보통", help: "2주쯤 꾸준히 쓴 사람의 기록이에요" },
  many: {
    id: "many",
    label: "많음",
    help: "3개월치 기록 · 하루 일정 10개 이상으로 꽉 찬 상태예요",
  },
  "long-copy": {
    id: "long-copy",
    label: "긴 문구",
    help: "닉네임 · 제목 · 본문이 아주 긴 기록으로 줄바꿈과 말줄임을 봐요",
  },
  loading: {
    id: "loading",
    label: "불러오는 중",
    help: "서버가 1분 늦게 답하게 해서 불러오는 동안의 화면을 붙잡아 둬요",
  },
  failure: {
    id: "failure",
    label: "불러오기 실패",
    help: "이 화면이 부르는 서버 요청을 모두 실패시켜 오류 안내를 봐요",
  },
};

const DATA_STATES: readonly ScreenStateId[] = ["empty", "normal", "many", "long-copy"];

/** 데이터 세트가 「신규 사용자」로 묶인 화면(로그인 전 · 온보딩)인가 */
export const isNewUserRoute = (route: Pick<ShellRoute, "preset">) =>
  route.preset.dataset === "new-user";

/** 이 화면에서 고를 수 있는 상태 — 앞은 데이터, 뒤는 불러오는 중 · 실패 */
export function statesFor(route: Pick<ShellRoute, "preset">): ScreenStateDef[] {
  const data = isNewUserRoute(route) ? (["new-user"] as const) : DATA_STATES;
  return [...data, "loading", "failure"].map((id) => STATES[id as ScreenStateId]);
}

export const stateDef = (id: ScreenStateId) => STATES[id];

/** 그 상태의 바탕 데이터 세트 */
export function datasetOf(route: Pick<ShellRoute, "preset">, id: ScreenStateId): DatasetId {
  if (id === "loading" || id === "failure") return route.preset.dataset ?? "normal";
  return id === "new-user" ? "new-user" : id;
}

export type StateFrameConfig = {
  dataset: DatasetId;
  latencyMs: number;
  failPaths: string[];
};

/**
 * 상태 하나 → 프레임 설정 조각. 화면이 붙잡으려고 건 실패 주소(스플래시)는 늘 둔다.
 * @param detected 이 화면이 부른 주소 접두사 — 실패 칸만 쓴다
 */
export function stateConfig(
  route: Pick<ShellRoute, "preset">,
  id: ScreenStateId,
  detected: readonly string[],
): StateFrameConfig {
  const pinned = route.preset.failPaths ?? [];
  const failPaths = id === "failure" ? unique([...pinned, ...detected]) : [...pinned];
  return {
    dataset: datasetOf(route, id),
    latencyMs: id === "loading" ? LOADING_LATENCY_MS : 0,
    failPaths,
  };
}

const unique = (items: readonly string[]) => [...new Set(items)];

/**
 * 셸 상태가 지금 어느 상태인가 — 고른 상태의 설정과 같을 때만. 아니면 null(조건 패널에서 직접 바꾼 것).
 * 실패는 화면이 나중에 부른 주소가 늘어도 그대로 「불러오기 실패」로 읽는다(실패시킨 것이 모은 것 안에 있으면)
 */
export function currentStateOf(
  state: Pick<ShellState, "dataset" | "latencyMs" | "failPaths">,
  route: Pick<ShellRoute, "preset">,
  detected: readonly string[],
): ScreenStateId | null {
  const pinned = route.preset.failPaths ?? [];
  const extra = state.failPaths.filter((path) => !pinned.includes(path));
  const pinnedKept = pinned.every((path) => state.failPaths.includes(path));
  for (const def of statesFor(route)) {
    const config = stateConfig(route, def.id, detected);
    if (config.dataset !== state.dataset || config.latencyMs !== state.latencyMs || !pinnedKept) {
      continue;
    }
    if (def.id === "failure") {
      if (extra.length > 0 && extra.every((path) => detected.includes(path))) return def.id;
    } else if (extra.length === 0) {
      return def.id;
    }
  }
  return null;
}

/** 주소 조각이 id · 날짜 같은 값인가 — 거기서 접두사를 끊는다 */
const isValueSegment = (segment: string) =>
  /^\d+$/.test(segment) ||
  /^\d{4}-\d{2}(-\d{2})?$/.test(segment) ||
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(segment);

/**
 * 서버 요청 주소 → 실패시킬 접두사. `/api/` 로 시작하지 않으면 null.
 *   /api/v1/diaries/12?x=1        → /api/v1/diaries
 *   /api/v1/letters/2026-11-01    → /api/v1/letters
 *   /api/v1/reports/weekly?from=… → /api/v1/reports/weekly
 */
export function apiPrefix(path: string): string | null {
  const clean = path.split(/[?#]/)[0]!.replace(/\/+$/, "");
  if (!clean.startsWith("/api/")) return null;
  const segments = clean.split("/");
  const cut = segments.findIndex((segment, index) => index > 2 && isValueSegment(segment));
  return (cut === -1 ? segments : segments.slice(0, cut)).join("/") || null;
}

/** 모은 접두사에서 실패 칸에 쓸 것 — 중복을 빼고, 짧은 접두사가 덮는 것은 하나로 */
export function failurePathsFrom(prefixes: Iterable<string>): string[] {
  const all = [...new Set(prefixes)];
  return all
    .filter((prefix) => !all.some((other) => other !== prefix && prefix.startsWith(`${other}/`)))
    .sort();
}
