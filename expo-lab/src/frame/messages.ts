/**
 * 셸 ↔ 프레임 메시지(`lab-contract.ts`)의 프레임 쪽 끝.
 *
 * 받는 쪽은 **부모 창(셸)이 보낸 것만** 듣는다 — 다른 프레임이나 확장 프로그램이 보낸 메시지로
 * 앱이 움직이지 않게. 모양이 맞지 않는 메시지는 버린다.
 *
 * 출처: 프레임은 보통 셸과 같은 서버에서 뜬다. 「AI 수정 결과」 미리보기는 작업 공간의 다른 서버
 * (다른 포트 = 다른 출처)에서 뜨므로, 셸이 설정에 자기 출처(`shellOrigin`)를 싣는다. 프레임은
 * 그 출처로만 보내고 그 출처에서 온 부모 메시지만 믿는다. 설정에 없으면 자기 출처(같은 서버)다.
 */
import type { FrameToShellMessage, LabKeyboardMessage, ShellToFrameMessage } from "../lab-contract";
import { getFrameConfig } from "./runtime";

export type { LabKeyboardMessage, LabKeyboardStateMessage } from "../lab-contract";

/** 셸의 출처 — 설정의 `shellOrigin`, 없으면 이 창의 출처 */
export function shellOrigin(): string {
  return getFrameConfig()?.shellOrigin || window.location.origin;
}

/** 셸로 보낸다. 부모가 없으면(직접 연 창) 자기 창에 보낸다 — 테스트 스크립트가 들을 수 있게 */
export function postToShell(message: FrameToShellMessage): void {
  if (typeof window === "undefined") return;
  try {
    const parent = window.parent;
    if (parent && parent !== window) parent.postMessage(message, shellOrigin());
    else window.postMessage(message, window.location.origin);
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
    default:
      // lab:keyboard 는 `listenToKeyboardMessages` 가 따로 듣는다
      return;
  }
}

/**
 * 셸이 보낸 메시지인가 — 부모 창이 셸 출처에서 보냈거나, 부모가 없는 창(직접 연 프레임)에 자기
 * 출처에서 보냈거나. 순수 함수라 출처 규칙을 테스트로 고정한다(`__tests__/messages.test.ts`)
 */
export function isFromShell(
  event: { source: unknown; origin: string },
  win: { parent: unknown; location: { origin: string } },
  expectedShellOrigin: string,
): boolean {
  if (event.source === win && event.origin === win.location.origin) return true;
  return event.source === win.parent && win.parent !== win && event.origin === expectedShellOrigin;
}

const fromShell = (event: MessageEvent) => isFromShell(event, window, shellOrigin());

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
