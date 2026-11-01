/**
 * 프레임의 네트워크 경계 — **Lab 은 로컬 전용이다.** 앱이 밖으로 내보내는 요청은 여기서 멈춘다.
 *
 * `window.fetch` 를 두 겹으로 감싼다. 가짜 서버(`installFakeServer`)는 그 사이에 들어간다:
 *
 * ```
 * 앱 → [reporter] → [가짜 서버] → [guard] → 진짜 fetch
 * ```
 *
 * - **guard**(가장 안쪽 · 가짜 서버보다 먼저 깐다) — 같은 출처(번들·폰트·자산)만 진짜 네트워크로
 *   보낸다. Amplitude 는 200 `{}` 로 닫고, 그 밖의 다른 출처는 503 으로 닫는다. 가짜 서버가
 *   처리하지 않고 흘려보낸 `LAB_API_BASE_URL` 요청도 여기서 503 이 된다 — 앱은 그것을
 *   「서버에 닿지 못했다」로 읽는다(실제 오프라인과 같은 길).
 * - **reporter**(가장 바깥 · 가짜 서버 다음에 깐다) — `LAB_API_BASE_URL` 로 간 요청마다
 *   응답 상태를 셸에 알린다(`lab:request`). 가짜 서버가 훅을 주지 않아도 된다.
 */
import { LAB_API_BASE_URL } from "../lab-contract";

type Fetch = typeof fetch;

/** Amplitude 가 쓰는 호스트(HTTP API · EU · 배치) — 앱 키가 비면 SDK 를 불러오지도 않지만 한 겹 더 막는다 */
const AMPLITUDE_HOST = /(^|\.)amplitude\.com$/i;

const urlOf = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
};

const methodOf = (input: RequestInfo | URL, init?: RequestInit): string =>
  (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET"))
    .toString()
    .toUpperCase();

const parse = (url: string, origin: string): URL | null => {
  try {
    return new URL(url, origin);
  } catch {
    return null;
  }
};

export type RequestClass = "same-origin" | "amplitude" | "lab-api" | "external";

export function classifyRequest(url: string, origin: string): RequestClass {
  const parsed = parse(url, origin);
  if (parsed == null) return "external";
  if (parsed.origin === origin) return "same-origin";
  if (AMPLITUDE_HOST.test(parsed.hostname)) return "amplitude";
  if (url.startsWith(LAB_API_BASE_URL)) return "lab-api";
  return "external";
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** 가장 안쪽 겹. 막은 요청은 콘솔에 한 줄 남긴다(Amplitude 는 조용히) */
export function createGuardedFetch(real: Fetch, origin: string, log = console.warn): Fetch {
  return (input, init) => {
    const url = urlOf(input);
    switch (classifyRequest(url, origin)) {
      case "same-origin":
        return real(input, init);
      case "amplitude":
        return Promise.resolve(json(200, {}));
      case "lab-api":
        log(`[lab-frame] 가짜 서버가 처리하지 않은 요청: ${methodOf(input, init)} ${url}`);
        return Promise.resolve(json(503, { message: "lab: fake server did not handle" }));
      default:
        log(`[lab-frame] 바깥 요청을 막았다: ${methodOf(input, init)} ${url}`);
        return Promise.resolve(json(503, { message: "lab: external request blocked" }));
    }
  };
}

export type RequestReport = { method: string; path: string; status: number };

/** 가장 바깥 겹. 응답을 바꾸지 않고 상태만 알린다. 실패(throw)는 상태 0 으로 알린다 */
export function createReportingFetch(inner: Fetch, report: (r: RequestReport) => void): Fetch {
  return async (input, init) => {
    const url = urlOf(input);
    if (!url.startsWith(LAB_API_BASE_URL)) return inner(input, init);
    const method = methodOf(input, init);
    const path = url.slice(LAB_API_BASE_URL.length) || "/";
    try {
      const response = await inner(input, init);
      report({ method, path, status: response.status });
      return response;
    } catch (error) {
      report({ method, path, status: 0 });
      throw error;
    }
  };
}

/** `navigator.sendBeacon` — Amplitude 웹 SDK 가 창을 닫을 때 쓴다. 같은 출처만 보낸다 */
export function guardBeacon(origin: string): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  const real = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) =>
    classifyRequest(String(url), origin) === "same-origin" ? real(url, data) : true;
}
