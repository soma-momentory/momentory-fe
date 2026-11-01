/**
 * 셸 ↔ 프레임 메시지의 단일 통로. 프레임이 보낸 `lab:*` 를 받아 프레임마다 지금 주소 · 준비 여부 ·
 * 상태바 글자색을 들고, 요청 기록을 쌓는다. 셸은 여기로만 프레임에 말한다(`post`).
 *
 * 화면은 `useFrameBus()` 로 구독한다 — 값이 바뀔 때마다 판(version)이 올라간다.
 */
import { useSyncExternalStore } from "react";

import type { FrameToShellMessage, ShellToFrameMessage } from "../lab-contract";
import { apiPrefix } from "./screenStates";

export type FrameRuntime = {
  element: HTMLIFrameElement | null;
  ready: boolean;
  pathname: string | null;
  statusBar: "light" | "dark";
};

export type RequestEntry = {
  id: number;
  at: number;
  frameId: string;
  method: string;
  path: string;
  status: number;
};

const MAX_REQUESTS = 300;

type RouteListener = (frameId: string, pathname: string) => void;

/** 두 단계 열기에서 기다리는 이동 — 경유 화면이 `afterRequest` 응답을 받으면 목적지로 */
type PendingNavigation = {
  target: string;
  afterRequest: string;
  /** 그 응답이 끝내 안 오면(실패 주소 등) 준비 뒤 이만큼 기다렸다 옮긴다 */
  fallbackMs: number;
  timer?: ReturnType<typeof setTimeout>;
};

/** 응답이 스토어에 들어갈 틈 */
const SETTLE_MS = 150;

export class FrameBus {
  private frames = new Map<string, FrameRuntime>();
  private listeners = new Set<() => void>();
  private routeListeners = new Set<RouteListener>();
  private pending = new Map<string, PendingNavigation>();
  private seq = 0;
  /**
   * 화면(주소 · 검색 조건 뺌)마다 그 화면에 서 있는 동안 부른 서버 주소 접두사 — 「불러오기 실패」가
   * 실패시킬 주소를 고른다(`screenStates.ts`). 요청 기록(`requests`)과 달리 잘라 내지 않는다
   */
  private paths = new Map<string, Set<string>>();
  requests: RequestEntry[] = [];
  version = 0;

  private emit() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  onRoute(listener: RouteListener) {
    this.routeListeners.add(listener);
    return () => {
      this.routeListeners.delete(listener);
    };
  }

  get(frameId: string): FrameRuntime {
    return (
      this.frames.get(frameId) ?? { element: null, ready: false, pathname: null, statusBar: "dark" }
    );
  }

  private patch(frameId: string, patch: Partial<FrameRuntime>) {
    this.frames.set(frameId, { ...this.get(frameId), ...patch });
    this.emit();
  }

  /** iframe 가 새로 붙었다(처음 · 다시 불러오기) — 준비 전으로 돌린다 */
  attach(frameId: string, element: HTMLIFrameElement | null) {
    if (element === this.get(frameId).element) return;
    this.patch(frameId, element ? { element, ready: false } : { element: null, ready: false });
  }

  /** 셸이 프레임을 다른 주소로 보냈다 — 다시 불러올 때 이 주소에서 시작한다 */
  setPathname(frameId: string, pathname: string) {
    this.patch(frameId, { pathname });
  }

  /** 프레임이 경유 화면에서 준비되면 `target` 으로 옮긴다(두 단계 열기) */
  queueNavigate(frameId: string, pending: PendingNavigation) {
    this.cancelNavigate(frameId);
    this.pending.set(frameId, pending);
  }

  cancelNavigate(frameId: string) {
    const current = this.pending.get(frameId);
    if (current?.timer) clearTimeout(current.timer);
    this.pending.delete(frameId);
  }

  private flushNavigate(frameId: string, delayMs: number) {
    const current = this.pending.get(frameId);
    if (!current) return;
    if (current.timer) clearTimeout(current.timer);
    current.timer = setTimeout(() => {
      if (this.pending.get(frameId) !== current) return;
      this.pending.delete(frameId);
      // 경유 화면 위에 얹는다 — replace 면 뒤 화면(홈 등)이 사라져 시트 뒤가 비어 보인다
      this.post(frameId, { type: "lab:navigate", pathname: current.target, mode: "push" });
    }, delayMs);
  }

  post(frameId: string, message: ShellToFrameMessage): boolean {
    const runtime = this.get(frameId);
    const target = runtime.element?.contentWindow;
    if (!target || !runtime.ready) return false;
    target.postMessage(message, window.location.origin);
    return true;
  }

  frameIdsOn(pathnameMatches: (pathname: string) => boolean): string[] {
    return [...this.frames.entries()]
      .filter(([, runtime]) => runtime.element && runtime.pathname != null)
      .filter(([, runtime]) => pathnameMatches(runtime.pathname!))
      .map(([frameId]) => frameId);
  }

  /** 주소가 `matches` 에 맞는 화면들에서 부른 서버 주소 접두사(중복 없음) */
  pathsFor(matches: (pathname: string) => boolean): string[] {
    const found = new Set<string>();
    for (const [pathname, prefixes] of this.paths) {
      if (matches(pathname)) prefixes.forEach((prefix) => found.add(prefix));
    }
    return [...found];
  }

  private notePath(frameId: string, path: string) {
    // 두 단계 열기의 경유 화면이 부른 것은 목적지 몫이 아니다
    if (this.pending.has(frameId)) return;
    const pathname = this.get(frameId).pathname?.split(/[?#]/)[0];
    const prefix = apiPrefix(path);
    if (!pathname || !prefix) return;
    const set = this.paths.get(pathname) ?? new Set<string>();
    set.add(prefix);
    this.paths.set(pathname, set);
  }

  clearRequests() {
    this.requests = [];
    this.emit();
  }

  handle(message: FrameToShellMessage) {
    switch (message.type) {
      case "lab:ready":
      case "lab:route": {
        const pending = this.pending.get(message.frameId);
        if (pending && message.pathname !== pending.target.split("?")[0]) {
          // 경유 중 — 셸이 아는 주소는 목적지 그대로 둔다(목록 · 같이 움직이기가 흔들리지 않게)
          this.patch(message.frameId, { ready: true });
          if (message.type === "lab:ready") this.flushNavigate(message.frameId, pending.fallbackMs);
          return;
        }
        this.patch(message.frameId, { ready: true, pathname: message.pathname });
        this.routeListeners.forEach((listener) => listener(message.frameId, message.pathname));
        return;
      }
      case "lab:statusBar":
        this.patch(message.frameId, { statusBar: message.style });
        return;
      case "lab:request": {
        const pending = this.pending.get(message.frameId);
        if (
          pending &&
          this.get(message.frameId).ready &&
          message.path.startsWith(pending.afterRequest)
        ) {
          this.flushNavigate(message.frameId, SETTLE_MS);
        }
        this.notePath(message.frameId, message.path);
        this.seq += 1;
        this.requests = [
          { ...message, id: this.seq, at: Date.now() },
          ...this.requests.slice(0, MAX_REQUESTS - 1),
        ];
        this.emit();
        return;
      }
    }
  }

  /** window 의 message 를 듣는다. 같은 출처 · `lab:` 메시지만 받는다 */
  listen(win: Window): () => void {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== win.location.origin) return;
      const data = event.data as Partial<FrameToShellMessage> | null;
      if (!data || typeof data.type !== "string" || !data.type.startsWith("lab:")) return;
      if (typeof data.frameId !== "string") return;
      this.handle(data as FrameToShellMessage);
    };
    win.addEventListener("message", onMessage);
    return () => win.removeEventListener("message", onMessage);
  }
}

export const frameBus = new FrameBus();

export function useFrameBus(bus: FrameBus = frameBus): number {
  return useSyncExternalStore(
    bus.subscribe,
    () => bus.version,
    () => bus.version,
  );
}
