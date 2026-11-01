/**
 * 셸 ↔ 프레임 메시지의 단일 통로. 프레임이 보낸 `lab:*` 를 받아 프레임마다 지금 주소 · 준비 여부 ·
 * 상태바 글자색을 들고, 요청 기록을 쌓는다. 셸은 여기로만 프레임에 말한다(`post`).
 *
 * 화면은 `useFrameBus()` 로 구독한다 — 값이 바뀔 때마다 판(version)이 올라간다.
 */
import { useSyncExternalStore } from "react";

import type { FrameToShellMessage, ShellToFrameMessage } from "../lab-contract";

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

export class FrameBus {
  private frames = new Map<string, FrameRuntime>();
  private listeners = new Set<() => void>();
  private routeListeners = new Set<RouteListener>();
  private seq = 0;
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

  clearRequests() {
    this.requests = [];
    this.emit();
  }

  handle(message: FrameToShellMessage) {
    switch (message.type) {
      case "lab:ready":
        this.patch(message.frameId, { ready: true, pathname: message.pathname });
        this.routeListeners.forEach((listener) => listener(message.frameId, message.pathname));
        return;
      case "lab:route":
        this.patch(message.frameId, { ready: true, pathname: message.pathname });
        this.routeListeners.forEach((listener) => listener(message.frameId, message.pathname));
        return;
      case "lab:statusBar":
        this.patch(message.frameId, { statusBar: message.style });
        return;
      case "lab:request":
        this.seq += 1;
        this.requests = [
          { ...message, id: this.seq, at: Date.now() },
          ...this.requests.slice(0, MAX_REQUESTS - 1),
        ];
        this.emit();
        return;
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
