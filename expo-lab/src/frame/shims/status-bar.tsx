/**
 * `expo-status-bar` 심 — 웹에서는 아무것도 그리지 않는다(진짜 웹 구현도 그렇다). 대신 앱이 정한
 * 글자색을 셸에 알린다(`lab:statusBar`) — 셸이 그리는 기기 상태바가 그것을 따른다.
 *
 * 진짜 모듈처럼 **나중에 마운트된 `<StatusBar>` 가 이긴다**(스택). 앱은 지금 하나만 둔다
 * (`src/components/RouteStatusBar.tsx`). 셸(프레임 설정 없음)에서는 알리지 않는다.
 *
 * 글자색 대응: `light`·`dark` 는 그대로, `auto` 는 `dark`(앱은 밝은 면뿐 · 다크 모드 없음 —
 * DESIGN.md 결정 N1), `inverted` 는 `light`.
 */
import { useEffect, useRef } from "react";

import { postToShell } from "../messages";
import { getFrameConfig } from "../runtime";

export type StatusBarStyle = "auto" | "inverted" | "light" | "dark";
type Resolved = "light" | "dark";

export function resolveStatusBarStyle(style: StatusBarStyle | undefined): Resolved {
  return style === "light" || style === "inverted" ? "light" : "dark";
}

const stack: { id: number; style: Resolved }[] = [];
let imperative: Resolved | null = null;
let lastSent: Resolved | null = null;
let nextId = 1;

const current = (): Resolved => imperative ?? stack[stack.length - 1]?.style ?? "dark";

function publish(): void {
  const config = getFrameConfig();
  if (config == null) return;
  const style = current();
  if (style === lastSent) return;
  lastSent = style;
  postToShell({ type: "lab:statusBar", frameId: config.frameId, style });
}

export function StatusBar({ style }: { style?: StatusBarStyle; [prop: string]: unknown }) {
  const id = useRef(0);
  useEffect(() => {
    id.current = nextId++;
    stack.push({ id: id.current, style: "dark" });
    return () => {
      const at = stack.findIndex((entry) => entry.id === id.current);
      if (at >= 0) stack.splice(at, 1);
      publish();
    };
  }, []);
  useEffect(() => {
    const entry = stack.find((e) => e.id === id.current);
    if (entry) entry.style = resolveStatusBarStyle(style);
    // 컴포넌트가 다시 정하면 명령형으로 정한 값은 물러난다 — 진짜 모듈과 같다
    imperative = null;
    publish();
  }, [style]);
  return null;
}

export function setStatusBarStyle(style: StatusBarStyle): void {
  imperative = resolveStatusBarStyle(style);
  publish();
}

export function setStatusBarHidden(_hidden: boolean): void {}
export function setStatusBarBackgroundColor(_color: string): void {}
export function setStatusBarTranslucent(_translucent: boolean): void {}
export function setStatusBarNetworkActivityIndicatorVisible(_visible: boolean): void {}

StatusBar.setStyle = setStatusBarStyle;
StatusBar.setHidden = setStatusBarHidden;
