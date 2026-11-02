/**
 * 프레임의 네트워크 경계 — **Lab 은 로컬 전용이다.** 앱이 밖으로 내보내는 요청은 여기서 멈춘다.
 *
 * `window.fetch` 의 가장 안쪽 겹이다 — 가짜 서버(`installFakeServer`)가 이 위를 감싼다:
 *
 * ```
 * 앱 → [가짜 서버] → [guard] → 진짜 fetch
 * ```
 *
 * 같은 출처(번들·폰트·자산)만 진짜 네트워크로 보낸다. Amplitude 는 200 `{}` 로 닫고, 그 밖의
 * 다른 출처는 503 으로 닫는다. 가짜 서버가 처리하지 않고 흘려보낸 `LAB_API_BASE_URL` 요청도
 * 여기서 503 이 된다 — 앱은 그것을 「서버에 닿지 못했다」로 읽는다(실제 오프라인과 같은 길).
 * 셸에 알리는 `lab:request` 는 가짜 서버의 `onFakeRequest` 가 준다(`bootstrap.ts`).
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

/** `navigator.sendBeacon` — Amplitude 웹 SDK 가 창을 닫을 때 쓴다. 같은 출처만 보낸다 */
export function guardBeacon(origin: string): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;
  const real = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = (url, data) =>
    classifyRequest(String(url), origin) === "same-origin" ? real(url, data) : true;
}
