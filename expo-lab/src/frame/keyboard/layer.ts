/**
 * 프레임 문서의 **화면 키보드** — 입력칸을 누르면 올라오고, 포커스가 빠지면 내려간다(폰처럼).
 *
 * - 열고 닫기: 문서의 `focusin` · `focusout` 을 듣는다. 글을 쓰는 칸(`input` 글자 종류 · `textarea` ·
 *   `contenteditable`)만 연다 — `readOnly`(RN `editable={false}`) · `inputmode="none"`
 *   (RN `showSoftInputOnFocus={false}`)은 열지 않는다. 바깥을 누르면 브라우저가 포커스를 빼므로 닫힌다.
 *   포커스를 쥔 칸이 화면째 사라지면 `focusout` 이 오지 않을 수 있어 열린 동안 가끔 확인한다.
 * - 셸 수동 조작: `{ type: "lab:keyboard", open }`(`../messages.ts`) — 셸이 연 키보드는 포커스가
 *   빠져도 남는다. 열고 닫을 때마다 셸에 `lab:keyboardState` 를 보낸다.
 * - 그림: 문서 바닥에 붙은 고정 층(높이 = 기기 키보드 높이 `heights.ts`). 기기 외형과 함께 줄고
 *   늘며, 앱 위에 놓인다. **키보드 위에서만** 탭을 받는다 — 키를 눌러도 입력칸의 포커스가 빠지지
 *   않고, 글자 키는 커서 자리에 낱자를 넣는다(두벌식 조합 `hangul.ts` · Lab 근사).
 *   return 은 Enter 를 보내 RN `onSubmitEditing` · `blurOnSubmit` 이 네이티브처럼 돈다
 *   (여러 줄 칸이면 줄을 바꾼다).
 *
 * 안전 영역: iOS 의 아래 inset(34)은 키보드가 떠도 **그대로**다 — react-native-safe-area-context 는
 * 창의 안전 영역을 주고 키보드는 거기 들지 않는다. 키보드는 그 홈 인디케이터 자리까지 덮는다
 * (`heights.ts` 의 `bottomArea`). Android 도 내비 inset 은 그대로이고 키보드가 그 뒤까지 깔린다.
 * 홈 인디케이터 · 제스처 손잡이는 셸이 iframe 위에 그리므로 여기서 그리지 않는다.
 */
import { postToShell, listenToKeyboardMessages } from "../messages";
import { getFrameConfig } from "../runtime";

import type { KeyboardController, KeyboardVisualState } from "./controller";
import { IOS_KEYBOARD_CSS_EASING, ANDROID_KEYBOARD_CSS_EASING, type KeyboardSpec } from "./heights";
import { typeJamo } from "./hangul";
import { layoutKeyboard, type KeyKind, type KeyRect } from "./layout";
import { GBOARD_COLORS, IOS_KEYBOARD_COLORS } from "./palette";

const LAYER_ID = "momentory-lab-keyboard";
const TEXT_INPUT_TYPES = new Set([
  "",
  "text",
  "search",
  "email",
  "url",
  "tel",
  "password",
  "number",
]);
/** 포커스를 쥔 칸이 사라졌는지 확인하는 간격(열린 동안만) */
const FOCUS_CHECK_MS = 400;

export function isTextField(node: unknown): node is HTMLElement {
  if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) return false;
  if (node instanceof HTMLTextAreaElement) {
    return !node.readOnly && !node.disabled && node.inputMode !== "none";
  }
  if (node instanceof HTMLInputElement) {
    return (
      TEXT_INPUT_TYPES.has(node.type) &&
      !node.readOnly &&
      !node.disabled &&
      node.inputMode !== "none"
    );
  }
  return node.isContentEditable;
}

type Editable = HTMLInputElement | HTMLTextAreaElement;

const isEditable = (node: Element | null): node is Editable =>
  node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement;

/** 커서 앞뒤를 바꿔 React 가 알아듣는 `input` 이벤트로 넣는다 */
function editValue(el: Editable, edit: (before: string, after: string) => string | null): void {
  const value = el.value;
  let start: number | null = null;
  let end: number | null = null;
  try {
    start = el.selectionStart;
    end = el.selectionEnd;
  } catch {
    // email · number 는 커서를 주지 않는다 — 끝에 붙인다
  }
  const from = start ?? value.length;
  const to = end ?? from;
  const after = value.slice(to);
  const nextBefore = edit(value.slice(0, from), after);
  if (nextBefore == null) return;
  const next = nextBefore + after;
  if (el.maxLength > 0 && next.length > el.maxLength && next.length > value.length) return;
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, next);
  try {
    el.setSelectionRange(nextBefore.length, nextBefore.length);
  } catch {
    // 커서를 못 두는 칸
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

const isJamo = (text: string) => /^[ㄱ-ㅣ]$/.test(text);

function typeText(el: Editable, text: string, selectionEmpty: boolean): void {
  editValue(el, (before) =>
    isJamo(text) && selectionEmpty ? typeJamo(before, text) : before + text,
  );
}

function deleteBackward(el: Editable): void {
  const hasSelection = el.selectionStart != null && el.selectionStart !== el.selectionEnd;
  editValue(el, (before) => (hasSelection ? before : Array.from(before).slice(0, -1).join("")));
}

function pressEnter(el: Editable): void {
  const event = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true,
  } as KeyboardEventInit);
  const notPrevented = el.dispatchEvent(event);
  if (notPrevented && el instanceof HTMLTextAreaElement) typeText(el, "\n", true);
}

// ── 그림 ────────────────────────────────────────────────────────────────────────

const SVG_NS = "http://www.w3.org/2000/svg";

function svgIcon(doc: Document, paths: string[], color: string, size: number, fill = false) {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.style.pointerEvents = "none";
  for (const d of paths) {
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", fill ? color : "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.6");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("stroke-linecap", "round");
    svg.appendChild(path);
  }
  return svg;
}

const ICONS: Partial<Record<KeyKind, string[]>> = {
  shift: ["M12 4 L3.5 12.5 H8 V19.5 H16 V12.5 H20.5 Z"],
  delete: [
    "M8.5 5.5 H20 a1.5 1.5 0 0 1 1.5 1.5 V17 a1.5 1.5 0 0 1 -1.5 1.5 H8.5 L2.5 12 Z",
    "M11.5 9 L17.5 15 M17.5 9 L11.5 15",
  ],
  globe: [
    "M12 3 a9 9 0 1 0 0.01 0 Z",
    "M12 3 C7.5 7 7.5 17 12 21 C16.5 17 16.5 7 12 3 Z",
    "M3 12 H21 M4.6 7.5 H19.4 M4.6 16.5 H19.4",
  ],
  mic: [
    "M12 3 a3 3 0 0 1 3 3 V11 a3 3 0 0 1 -6 0 V6 a3 3 0 0 1 3 -3 Z",
    "M5.5 11 a6.5 6.5 0 0 0 13 0 M12 17.5 V21",
  ],
  emoji: ["M12 3 a9 9 0 1 0 0.01 0 Z", "M8 14 a4.5 4.5 0 0 0 8 0", "M9 9.5 v0.5 M15 9.5 v0.5"],
  hide: ["M6 9 L12 15 L18 9"],
};

/** Gboard 도구 줄 — 앱 서랍 · 스티커 · GIF · 설정 · 테마 · 마이크(근사 아이콘) */
const GBOARD_TOOLBAR: string[][] = [
  ["M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z"],
  ICONS.emoji!,
  ["M3 6 H21 V18 H3 Z M7 10 v4 M11 10 v4 M15 10 v4"],
  [
    "M12 8.5 a3.5 3.5 0 1 0 0.01 0 Z",
    "M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.3 5.3 L7 7 M17 17 L18.7 18.7 M5.3 18.7 L7 17 M17 7 L18.7 5.3",
  ],
  [
    "M12 3 a9 9 0 1 0 0 18 c1.2 0 1.6 -1 1 -2 c-0.7 -1.1 0 -2.5 1.4 -2.5 H17 a4 4 0 0 0 4 -4 C21 6.6 17 3 12 3 Z",
  ],
  ICONS.mic!,
];

const FONT_IOS =
  '-apple-system, "SF Pro Text", "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif';
const FONT_ANDROID = 'Roboto, "Noto Sans KR", "Pretendard", "Malgun Gothic", sans-serif';

type RenderInput = {
  doc: Document;
  spec: KeyboardSpec;
  width: number;
  shift: boolean;
  enterKeyHint: string | null;
};

function renderKeyboard({ doc, spec, width, shift, enterKeyHint }: RenderInput): HTMLElement {
  const ios = spec.style === "ios";
  const colors = ios ? IOS_KEYBOARD_COLORS : GBOARD_COLORS;
  const layout = layoutKeyboard(spec, width, { shift, enterKeyHint });
  const board = doc.createElement("div");
  Object.assign(board.style, {
    position: "absolute",
    inset: "0",
    background: colors.board,
    fontFamily: ios ? FONT_IOS : FONT_ANDROID,
    color: colors.label,
    userSelect: "none",
    webkitUserSelect: "none",
    touchAction: "none",
  } satisfies Partial<CSSStyleDeclaration>);

  if (ios) {
    // 예측 막대 — 세 칸 · 사이에 짧은 세로줄
    layout.suggestions.forEach((cell, i) => {
      const text = doc.createElement("div");
      text.textContent = cell.label;
      Object.assign(text.style, {
        position: "absolute",
        left: `${cell.x}px`,
        top: "0",
        width: `${cell.width}px`,
        height: `${spec.suggestionBar}px`,
        lineHeight: `${spec.suggestionBar}px`,
        textAlign: "center",
        fontSize: "16px",
      });
      board.appendChild(text);
      if (i > 0) {
        const line = doc.createElement("div");
        Object.assign(line.style, {
          position: "absolute",
          left: `${cell.x}px`,
          top: `${spec.suggestionBar / 2 - 12}px`,
          width: "1px",
          height: "24px",
          background: IOS_KEYBOARD_COLORS.separator,
        });
        board.appendChild(line);
      }
    });
  } else {
    // Gboard 도구 줄
    const slot = (width - 16) / GBOARD_TOOLBAR.length;
    GBOARD_TOOLBAR.forEach((paths, i) => {
      const icon = svgIcon(doc, paths, GBOARD_COLORS.icon, 22);
      Object.assign(icon.style, {
        position: "absolute",
        left: `${8 + slot * i + slot / 2 - 11}px`,
        top: `${spec.suggestionBar / 2 - 11}px`,
      });
      board.appendChild(icon);
    });
  }

  for (const key of layout.keys) board.appendChild(renderKey(doc, key, ios, shift));
  return board;
}

function keyBackground(key: KeyRect, ios: boolean, pressed: boolean): string {
  const colors = ios ? IOS_KEYBOARD_COLORS : GBOARD_COLORS;
  if (key.bare) return "transparent";
  if (key.accent) return colors.accent;
  if (key.functional) return pressed ? colors.functionKeyPressed : colors.functionKey;
  return pressed ? colors.keyPressed : colors.key;
}

function renderKey(doc: Document, key: KeyRect, ios: boolean, shift: boolean): HTMLElement {
  const colors = ios ? IOS_KEYBOARD_COLORS : GBOARD_COLORS;
  const el = doc.createElement("div");
  el.dataset.key = key.kind;
  if (key.text != null) el.dataset.text = key.text;
  const labelColor = key.accent ? colors.onAccent : colors.label;
  Object.assign(el.style, {
    position: "absolute",
    left: `${key.x}px`,
    top: `${key.y}px`,
    width: `${key.width}px`,
    height: `${key.height}px`,
    borderRadius: ios ? "5px" : "7px",
    background: keyBackground(key, ios, false),
    boxShadow: ios && !key.bare ? `0 1px 0 ${IOS_KEYBOARD_COLORS.keyShadow}` : "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: labelColor,
    fontSize: key.kind === "char" && key.label.length === 1 && isJamo(key.label) ? "22px" : "16px",
    cursor: "default",
  } satisfies Partial<CSSStyleDeclaration>);

  const icon = ICONS[key.kind];
  if (key.label) {
    el.textContent = key.label;
    if (!ios && key.kind === "enter") el.style.fontSize = "20px";
  } else if (icon) {
    const color = key.bare ? colors.icon : labelColor;
    const size = key.bare ? (ios ? 26 : 20) : 22;
    el.appendChild(svgIcon(doc, icon, color, size, key.kind === "shift" && shift));
  }
  if (key.hint) {
    const hint = doc.createElement("span");
    hint.textContent = key.hint;
    Object.assign(hint.style, {
      position: "absolute",
      top: "3px",
      right: "5px",
      fontSize: "10px",
      color: GBOARD_COLORS.hint,
    });
    el.appendChild(hint);
  }
  return el;
}

// ── 설치 ────────────────────────────────────────────────────────────────────────

export type InstallKeyboardOptions = {
  keyboard: KeyboardController;
  doc?: Document;
  win?: Window;
};

/** 프레임 부트스트랩이 앱보다 먼저 한 번 부른다. 걷어 내는 함수를 돌려준다 */
export function installKeyboardLayer({
  keyboard,
  doc = document,
  win = window,
}: InstallKeyboardOptions): () => void {
  const existing = doc.getElementById(LAYER_ID);
  if (existing) existing.remove();

  const root = doc.createElement("div");
  root.id = LAYER_ID;
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "0",
    height: "0px",
    zIndex: "2147483000",
    transform: "translateY(100%)",
    pointerEvents: "none",
    willChange: "transform",
    overflow: "hidden",
  } satisfies Partial<CSSStyleDeclaration>);
  doc.body.appendChild(root);

  let shift = false;
  let enterKeyHint: string | null = null;
  let renderedKey = "";
  let focused: HTMLElement | null = null;

  const draw = (spec: KeyboardSpec | null) => {
    if (spec == null) return;
    const width = win.innerWidth;
    const key = `${spec.style}:${spec.total}:${width}:${shift}:${enterKeyHint}`;
    if (key === renderedKey) return;
    renderedKey = key;
    root.replaceChildren(renderKeyboard({ doc, spec, width, shift, enterKeyHint }));
    root.style.height = `${spec.total}px`;
  };

  const apply = (state: KeyboardVisualState) => {
    draw(state.spec);
    const easing =
      state.spec?.style === "android" ? ANDROID_KEYBOARD_CSS_EASING : IOS_KEYBOARD_CSS_EASING;
    root.style.transition = `transform ${state.durationMs}ms ${easing}`;
    root.style.transform = state.open ? "translateY(0)" : "translateY(100%)";
    root.style.pointerEvents = state.open ? "auto" : "none";
    const config = getFrameConfig();
    if (config) {
      postToShell({
        type: "lab:keyboardState",
        frameId: config.frameId,
        open: state.open,
        height: state.open ? state.height : 0,
      });
    }
  };
  const stopVisual = keyboard.onVisualChange(apply);

  const closeIfFocusLeft = () => {
    if (keyboard.openedBy() !== "focus") return;
    if (isTextField(doc.activeElement)) return;
    focused = null;
    keyboard.close();
  };

  const onFocusIn = (event: FocusEvent) => {
    if (!isTextField(event.target)) return;
    focused = event.target;
    const hint = focused.getAttribute("enterkeyhint");
    if (hint !== enterKeyHint || shift) {
      enterKeyHint = hint;
      shift = false;
      if (keyboard.isOpen()) draw(keyboard.visualState().spec);
    }
    keyboard.open("focus");
  };
  // 포커스가 다른 입력칸으로 옮겨 가는 중이면 닫지 않는다 — 다음 틱에 판정한다
  const onFocusOut = () => win.setTimeout(closeIfFocusLeft, 0);
  doc.addEventListener("focusin", onFocusIn);
  doc.addEventListener("focusout", onFocusOut);
  const watch = win.setInterval(() => {
    if (keyboard.isOpen()) closeIfFocusLeft();
  }, FOCUS_CHECK_MS);

  // 키 — 포커스를 빼앗지 않게 기본 동작을 막고, 앱(RN 응답 시스템)까지 올라가지 않게 멈춘다
  const swallow = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const keyAt = (event: Event) =>
    (event.target instanceof Element
      ? event.target.closest("[data-key]")
      : null) as HTMLElement | null;
  let pressed: HTMLElement | null = null;
  const release = () => {
    if (pressed) pressed.style.filter = "";
    pressed = null;
  };
  const onPointerDown = (event: PointerEvent) => {
    swallow(event);
    const el = keyAt(event);
    if (!el) return;
    pressed = el;
    el.style.filter = "brightness(0.86)";
    onKey(el.dataset.key as KeyKind, el.dataset.text);
  };
  const onKey = (kind: KeyKind, text: string | undefined) => {
    const target = isEditable(doc.activeElement) ? doc.activeElement : null;
    switch (kind) {
      case "char":
      case "space":
        if (target && text != null) {
          typeText(target, text, target.selectionStart === target.selectionEnd);
          if (shift) {
            shift = false;
            draw(keyboard.visualState().spec);
          }
        }
        return;
      case "shift":
        shift = !shift;
        draw(keyboard.visualState().spec);
        return;
      case "delete":
        if (target) deleteBackward(target);
        return;
      case "enter":
        if (target) pressEnter(target);
        return;
      case "hide":
        (doc.activeElement as HTMLElement | null)?.blur?.();
        keyboard.close();
        return;
      default:
        // 123 · 😊 · 🌐 · 🎤 — 그림만 있다
        return;
    }
  };
  root.addEventListener("pointerdown", onPointerDown);
  root.addEventListener("pointerup", release);
  root.addEventListener("pointerleave", release);
  root.addEventListener("pointercancel", release);
  for (const type of ["mousedown", "mouseup", "click", "touchstart", "touchend"]) {
    root.addEventListener(type, swallow);
  }

  const stopShell = listenToKeyboardMessages((open) => {
    if (open) keyboard.open("shell");
    else {
      if (focused && doc.activeElement === focused) focused.blur();
      keyboard.close();
    }
  });

  // 창 너비가 바뀌면(셸이 기기를 바꾸면 새로 불러오지만, 직접 연 창은 줄일 수 있다) 다시 그린다
  const onResize = () => {
    renderedKey = "";
    if (keyboard.isOpen()) draw(keyboard.visualState().spec);
  };
  win.addEventListener("resize", onResize);

  return () => {
    stopVisual();
    stopShell();
    doc.removeEventListener("focusin", onFocusIn);
    doc.removeEventListener("focusout", onFocusOut);
    win.removeEventListener("resize", onResize);
    win.clearInterval(watch);
    root.remove();
  };
}
