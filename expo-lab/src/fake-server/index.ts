/**
 * 가짜 서버 — 프레임(실제 앱을 웹으로 띄운 것)의 `fetch` 를 가로채 `LAB_API_BASE_URL` 요청에
 * 메모리 DB 로 답한다. 이름과 모양은 `../lab-contract.ts` 를 따른다.
 *
 * ## 내보내는 것
 *
 * | 이름 | 무엇 |
 * | --- | --- |
 * | `datasets` | 데이터 세트 목록(셸의 고르기 칸) |
 * | `installFakeServer(config)` | `globalThis.fetch` 를 감싼다. **다시 불러도 된다** — 설정만 바꿔 끼우고 DB 를 다시 읽는다 |
 * | `resetFakeData(config)` | 이 프레임 · 데이터 세트의 저장본을 지운다. 설치돼 있으면 메모리 DB 도 새로 심는다 |
 * | `sampleParams(datasetId, now?)` | 동적 라우트에 넣을 실제 id(가장 최근 일기 · 편지 날짜 · 오늘 일정) |
 * | `onFakeRequest(listener)` | 응답할 때마다 `{ frameId, method, path, status, durationMs }` 를 알린다 — 프레임이 셸에 `lab:request` 로 넘긴다. 해제 함수를 돌려준다 |
 * | `createFakeServer(config, options?)` | 설치하지 않은 서버 한 벌 — `fetch(input, init)` · `db()` · `reset()` · `setConfig()`. 테스트·도구용 |
 * | `uninstallFakeServer()` | 원래 `fetch` 로 되돌린다(테스트용) |
 *
 * ## 시각 — 요청 시점의 프레임 시계
 *
 * 「오늘」이 필요한 판단(하루 한 번 · 새 기록의 date/createdAt · 회고 세션 날짜 · 편지 「새것」 ·
 * 리포트 기본 주)은 **요청마다** `config.now ?? 실제 시각` 을 04:00 KST 경계로 접어 계산한다.
 * 시드는 저장본이 없을 때(처음 설치 · 초기화 뒤) 한 번만 만들고, 저장 키는 시각과 무관하다
 * (`${FAKE_DB_STORAGE_PREFIX}${frameId}:${datasetId}`). 그래서 셸이 `now` 를 하루씩 옮겨 다시
 * 불러오면(「하루 넘기기」) 쌓은 기록이 그대로 남은 채 다음 날이 된다 — 전날 일기의 편지도 그때 온다.
 *
 * ## 오늘 다시 쓰기 — `config.repeatToday`(기본 켜짐)
 *
 * 켜져 있으면 회고 시작 · 직접 쓰기가 409 를 주지 않고, 새 일기가 오늘 일기를 **대체**한다
 * (그 회고의 바람카드 · 오늘 편지도 함께 지운다 — 하루에 일기는 하나다). `false` 면 실제 서버처럼
 * 일기 409(`DIARY_ALREADY_WRITTEN`) · 회고 409(`ALREADY_RETROSPECTED_TODAY`).
 *
 * ## 대본 트리거(회고)
 *
 * 「위험」·「죽고 싶」·「사라지고 싶」·「#위험」 → `safety_hold` · 「#종료」 → `ended`. 자세한 흐름은 `retro.ts`.
 */
import {
  FAKE_DB_STORAGE_PREFIX,
  LAB_API_BASE_URL,
  type DatasetId,
  type DatasetInfo,
  type LabFrameConfig,
  type SampleParams,
} from "../lab-contract";
import { DB_SCHEMA, type FakeDb } from "./db";
import { handleRequest, type Ctx, type FakeResponse } from "./routes";
import { ensureTodayDiary, seedDataset } from "./seed";
import { dayOf, dayOfIso } from "./time";

export const datasets: readonly (DatasetInfo & { id: DatasetId })[] = [
  { id: "new-user", label: "신규 사용자", description: "온보딩 전 · 기록 없음" },
  { id: "empty", label: "기록 없음", description: "온보딩 끝 · 기록 0" },
  { id: "normal", label: "기록 보통", description: "2주치 일기·일정·바람카드·편지·쉼 기록" },
  { id: "many", label: "기록 많음", description: "3개월치 · 하루 일정 10개 이상 · 감정 12종" },
  { id: "long-copy", label: "긴 글", description: "긴 닉네임·제목·본문·편지" },
];

// ── 저장소 ─────────────────────────────────────────────────────────────

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const memory = new Map<string, string>();
const memoryStorage: StorageLike = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => void memory.set(k, v),
  removeItem: (k) => void memory.delete(k),
};

/** 브라우저면 localStorage, 아니면(테스트 · 사생활 보호 모드) 메모리 */
const defaultStorage = (): StorageLike => {
  try {
    const ls = (globalThis as { localStorage?: StorageLike }).localStorage;
    if (ls != null) return ls;
  } catch {
    // 접근이 막힌 환경 — 메모리로 간다
  }
  return memoryStorage;
};

export const storageKey = (config: Pick<LabFrameConfig, "frameId" | "datasetId" | "todayDiary">) =>
  `${FAKE_DB_STORAGE_PREFIX}${config.frameId}:${config.datasetId}${config.todayDiary ? ":today-diary" : ""}`;

// ── 요청 로그 ──────────────────────────────────────────────────────────

export type FakeRequestEvent = {
  frameId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
};
type Listener = (event: FakeRequestEvent) => void;
const listeners = new Set<Listener>();

export function onFakeRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── 서버 한 벌 ─────────────────────────────────────────────────────────

const nowOf = (config: LabFrameConfig): number => {
  const fixed = config.now == null ? NaN : Date.parse(config.now);
  return Number.isNaN(fixed) ? Date.now() : fixed;
};

const abortError = () => {
  try {
    return new DOMException("The operation was aborted.", "AbortError");
  } catch {
    const e = new Error("The operation was aborted.");
    e.name = "AbortError";
    return e;
  }
};

const readHeader = (headers: HeadersInit | undefined, name: string): string | null => {
  if (headers == null) return null;
  if (typeof Headers !== "undefined" && headers instanceof Headers) return headers.get(name);
  const entries = Array.isArray(headers) ? headers : Object.entries(headers);
  const hit = entries.find(([k]) => k.toLowerCase() === name.toLowerCase());
  return hit?.[1] ?? null;
};

const toResponse = ({ status, body }: FakeResponse): Response => {
  const noBody = status === 204 || body === undefined;
  return new Response(noBody ? null : JSON.stringify(body), {
    status,
    headers: noBody ? {} : { "Content-Type": "application/json" },
  });
};

export type FakeServer = {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** 지금 DB(읽기 전용으로 쓴다) */
  db: () => FakeDb;
  /** 저장본을 지우고 새로 심는다 */
  reset: () => void;
  /** 설정을 바꿔 끼운다 — 저장본을 다시 읽는다(다른 창이 초기화했을 수 있다) */
  setConfig: (config: LabFrameConfig) => void;
  config: () => LabFrameConfig;
};

export function createFakeServer(
  initial: LabFrameConfig,
  options?: { storage?: StorageLike },
): FakeServer {
  const storage = options?.storage ?? defaultStorage();
  let config = initial;
  let db: FakeDb | null = null;
  let lastStamp = 0;

  const withTodayDiary = (value: FakeDb): FakeDb => {
    if (config.todayDiary && ensureTodayDiary(value, nowOf(config))) persist(value);
    return value;
  };

  const load = (): FakeDb => {
    const key = storageKey(config);
    try {
      const raw = storage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw) as FakeDb;
        if (parsed?.schema === DB_SCHEMA && parsed.datasetId === config.datasetId) {
          return withTodayDiary(parsed);
        }
      }
    } catch {
      // 깨진 저장본 — 새로 심는다
    }
    const fresh = seedDataset(config.datasetId, nowOf(config));
    persist(fresh);
    return withTodayDiary(fresh);
  };

  const persist = (value: FakeDb) => {
    try {
      storage.setItem(storageKey(config), JSON.stringify(value));
    } catch {
      // 가득 찼거나 막혔다 — 메모리 DB 로 계속 간다
    }
  };

  const current = () => (db ??= load());

  const respond = (method: string, url: URL, bodyText: string | null, auth: string | null) => {
    const path = url.pathname;
    if ((config.failPaths ?? []).some((prefix) => prefix.length > 0 && path.startsWith(prefix))) {
      return {
        status: 500,
        body: { code: "INTERNAL_SERVER_ERROR", message: "실험실에서 실패시킨 요청이에요" },
      };
    }
    let body: unknown = undefined;
    if (bodyText != null && bodyText.length > 0) {
      try {
        body = JSON.parse(bodyText);
      } catch {
        return { status: 400, body: { code: "INVALID_REQUEST", message: "JSON 이 아니에요" } };
      }
    }
    const nowMs = nowOf(config);
    const ctx: Ctx = {
      db: current(),
      nowMs,
      today: dayOf(nowMs),
      repeatToday: config.repeatToday !== false,
      stamp: () => {
        // 같은 고정 시각에서도 순서가 서게 1ms 씩 민다 — 단, 하루를 넘기지는 않는다
        const base = Math.max(nowMs, lastStamp + 1);
        lastStamp = dayOfIso(new Date(base).toISOString()) === dayOf(nowMs) ? base : nowMs;
        return new Date(lastStamp).toISOString();
      },
      wrote: false,
    };
    const result = handleRequest(ctx, {
      method,
      path,
      query: url.searchParams,
      body,
      authorized: auth != null && /^Bearer\s+\S+/i.test(auth),
    });
    if (ctx.wrote) persist(ctx.db);
    return result;
  };

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const started = Date.now();
    const request = typeof Request !== "undefined" && input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input));
    const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
    const signal = init?.signal ?? request?.signal ?? null;
    const auth =
      readHeader(init?.headers, "Authorization") ?? request?.headers.get("Authorization") ?? null;
    let bodyText: string | null = null;
    if (typeof init?.body === "string") bodyText = init.body;
    else if (request && init?.body == null) bodyText = await request.text().catch(() => null);

    if (signal?.aborted) throw abortError();
    const latency = Math.max(0, config.latencyMs ?? 0);
    if (latency > 0) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          signal?.removeEventListener("abort", onAbort);
          resolve();
        }, latency);
        const onAbort = () => {
          clearTimeout(timer);
          reject(abortError());
        };
        signal?.addEventListener("abort", onAbort);
      });
    }

    const result = respond(method, url, bodyText, auth);
    const event: FakeRequestEvent = {
      frameId: config.frameId,
      method,
      path: `${url.pathname}${url.search}`,
      status: result.status,
      durationMs: Date.now() - started,
    };
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // 듣는 쪽의 실패가 앱 요청을 깨지 않게 한다
      }
    }
    return toResponse(result);
  };

  return {
    fetch: fakeFetch,
    db: current,
    reset: () => {
      storage.removeItem(storageKey(config));
      db = null;
      lastStamp = 0;
    },
    setConfig: (next) => {
      config = next;
      db = null;
    },
    config: () => config,
  };
}

// ── 설치 ───────────────────────────────────────────────────────────────

let installed: { server: FakeServer; original: typeof fetch } | null = null;

const isLabUrl = (input: RequestInfo | URL): boolean => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : typeof Request !== "undefined" && input instanceof Request
          ? input.url
          : String(input);
  return url.startsWith(LAB_API_BASE_URL);
};

/** 프레임 부트스트랩이 앱보다 먼저 부른다 — `window.fetch` 를 감싸 LAB_API_BASE_URL 요청에 응답한다 */
export function installFakeServer(config: LabFrameConfig): void {
  if (installed != null) {
    installed.server.setConfig(config);
    return;
  }
  const original = globalThis.fetch.bind(globalThis);
  const server = createFakeServer(config);
  installed = { server, original };
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    isLabUrl(input) ? server.fetch(input, init) : original(input, init)) as typeof fetch;
}

/** 원래 `fetch` 로 되돌린다 — 테스트용 */
export function uninstallFakeServer(): void {
  if (installed == null) return;
  globalThis.fetch = installed.original;
  installed = null;
}

/** 설치된 서버(없으면 `null`) — 프레임 도구가 DB 를 들여다볼 때 */
export const installedFakeServer = (): FakeServer | null => installed?.server ?? null;

/** 이 프레임의 가짜 DB 를 데이터 세트 초기값으로 되돌린다(localStorage 비움) */
export function resetFakeData(config: LabFrameConfig): void {
  const server = installed?.server;
  if (server != null && storageKey(server.config()) === storageKey(config)) {
    server.reset();
    return;
  }
  defaultStorage().removeItem(storageKey(config));
}

/**
 * 동적 라우트(`/diary/[id]` 등)에 넣을 실제 id. 시드는 결정적이라 id 는 저장본과 같다 —
 * 날짜(`letterDate`)는 `now` 기준으로 심은 시드의 것이다(저장본을 다른 날 심었으면 그날 기준이 다를 수 있다).
 */
export function sampleParams(datasetId: string, now?: string | null): SampleParams {
  const fixed = now == null ? NaN : Date.parse(now);
  const nowMs = Number.isNaN(fixed) ? Date.now() : fixed;
  const db = seedDataset(datasetId, nowMs);
  const today = dayOf(nowMs);
  const diary = [...db.diaries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const letter = [...db.letters].sort((a, b) => b.date.localeCompare(a.date))[0];
  // 오늘 것만 — 일정 수정은 홈이 받은 **오늘** 목록에서 찾는다(다른 날 id 면 바로 닫힌다).
  // 손으로 넣은 것(제목을 고칠 수 있는 것)을 먼저
  const todays = db.schedules.filter((s) => s.date === today && !s.hidden);
  const schedule = todays.find((s) => s.source === "MANUAL") ?? todays[0];
  return {
    ...(diary ? { diaryId: diary.id } : {}),
    ...(letter ? { letterDate: letter.date } : {}),
    ...(schedule ? { scheduleId: schedule.id } : {}),
  };
}
