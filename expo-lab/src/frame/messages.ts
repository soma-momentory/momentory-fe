/**
 * 셸 ↔ 프레임 메시지(`lab-contract.ts`)의 프레임 쪽 끝.
 *
 * 받는 쪽은 **부모 창이 보낸 것만** 듣는다 — 다른 프레임이나 확장 프로그램이 보낸 메시지로
 * 앱이 움직이지 않게. 모양이 맞지 않는 메시지는 버린다.
 */
import type { FrameToShellMessage, ShellToFrameMessage } from "../lab-contract";

/**
 * ⚠ **계약(`lab-contract.ts`) 밖에 덧붙인 키보드 메시지 둘** — 프레임 갈래가 먼저 만들었다.
 * 셸 토글을 붙일 때 계약 파일로 옮긴다(모양은 그대로).
 *
 * - 셸 → 프레임 `{ type: "lab:keyboard", open }` — 입력칸을 누르지 않고 키보드를 연다(`true`) ·
 *   닫는다(`false`). 셸이 연 키보드는 포커스가 빠져도 닫히지 않는다 — `false` 나 앱의
 *   `Keyboard.dismiss()` 로 닫힌다.
 * - 프레임 → 셸 `{ type: "lab:keyboardState", frameId, open, height }` — 열고 닫힐 때마다
 *   (애니메이션이 **시작하는** 순간). `height` 는 화면 바닥에서 키보드 윗변까지(pt/dp) · 닫히면 0.
 */
export type LabKeyboardMessage = { type: "lab:keyboard"; open: boolean };
export type LabKeyboardStateMessage = {
  type: "lab:keyboardState";
  frameId: string;
  open: boolean;
  height: number;
};

/** 셸로 보낸다. 부모가 없으면(직접 연 창) 자기 창에 보낸다 — 테스트 스크립트가 들을 수 있게 */
export function postToShell(message: FrameToShellMessage | LabKeyboardStateMessage): void {
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

/** 부모 창(또는 자기 창)이 같은 출처에서 보낸 것만 */
const fromShell = (event: MessageEvent) =>
  event.origin === window.location.origin &&
  (event.source === window.parent || event.source === window);

/** 부모 창의 메시지를 듣는다. 끊는 함수를 돌려준다 */
export function listenToShell(handlers: ShellMessageHandlers): () => void {
  if (typeof window === "undefined") return () => {};
  const onMessage = (event: MessageEvent) => {
    if (!fromShell(event)) return;
    const message = parseShellMessage(event.data);
    if (message) dispatchShellMessage(message, handlers);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

export function parseKeyboardMessage(data: unknown): LabKeyboardMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const { type, open } = data as { type?: unknown; open?: unknown };
  if (type !== "lab:keyboard" || typeof open !== "boolean") return null;
  return { type, open };
}

/** 셸의 `lab:keyboard` 를 듣는다(`listenToShell` 과 따로 — 라우터가 뜨기 전에도 받게). 끊는 함수를 돌려준다 */
export function listenToKeyboardMessages(onKeyboard: (open: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onMessage = (event: MessageEvent) => {
    if (!fromShell(event)) return;
    const message = parseKeyboardMessage(event.data);
    if (message) onKeyboard(message.open);
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
