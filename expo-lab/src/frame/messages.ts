/**
 * 셸 ↔ 프레임 메시지(`lab-contract.ts`)의 프레임 쪽 끝.
 *
 * 받는 쪽은 **부모 창이 보낸 것만** 듣는다 — 다른 프레임이나 확장 프로그램이 보낸 메시지로
 * 앱이 움직이지 않게. 모양이 맞지 않는 메시지는 버린다.
 */
import type { FrameToShellMessage, ShellToFrameMessage } from "../lab-contract";

/** 셸로 보낸다. 부모가 없으면(직접 연 창) 자기 창에 보낸다 — 테스트 스크립트가 들을 수 있게 */
export function postToShell(message: FrameToShellMessage): void {
  if (typeof window === "undefined") return;
  try {
    (window.parent ?? window).postMessage(message, window.location.origin);
  } catch {
    // 부모가 닫혔다 — 알릴 곳이 없을 뿐이다
  }
}

export function parseShellMessage(data: unknown): ShellToFrameMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, pathname, mode } = data as { type?: unknown; pathname?: unknown; mode?: unknown };
  switch (type) {
    case "lab:navigate":
      if (typeof pathname !== "string" || !pathname.startsWith("/")) return null;
      return mode === "push" ? { type, pathname, mode } : { type, pathname };
    case "lab:reload":
    case "lab:resetData":
      return { type };
    default:
      return null;
  }
}

export type ShellMessageHandlers = {
  navigate: (pathname: string, mode: "replace" | "push") => void;
  reload: () => void;
  resetData: () => void;
};

export function dispatchShellMessage(
  message: ShellToFrameMessage,
  handlers: ShellMessageHandlers,
): void {
  switch (message.type) {
    case "lab:navigate":
      handlers.navigate(message.pathname, message.mode ?? "replace");
      return;
    case "lab:reload":
      handlers.reload();
      return;
    case "lab:resetData":
      handlers.resetData();
      return;
  }
}

/** 부모 창의 메시지를 듣는다. 끊는 함수를 돌려준다 */
export function listenToShell(handlers: ShellMessageHandlers): () => void {
  if (typeof window === "undefined") return () => {};
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== window.parent && event.source !== window) return;
    const message = parseShellMessage(event.data);
    if (message) dispatchShellMessage(message, handlers);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
