/**
 * 화면 요소 선택 — 시안 프레임(같은 출처 iframe)의 `contentDocument` 에 붙는 Lab 전용 DOM 어댑터.
 * 앱 코드는 바뀌지 않는다: RN Web 이 `testID` 를 `data-testid` 로 그리는 것만 쓴다.
 *
 * - 올려 둔 요소에 테두리를 그린다(프레임 문서 안의 `pointer-events: none` 상자 하나)
 * - 누르면 앱이 그 누름을 받지 못하게 막고, 가장 가까운 **등록된** testID(Studio 등록표)와
 *   그 요소의 계산된 색·글씨를 돌려준다
 * - 등록된 요소가 아니면 계산된 값과 같은 토큰을 찾는다(「이 색은 `label.normal`」 — 어림짐작이다)
 */
import { parseColor, sameColor } from "./colorMath";
import { componentByTestId, type EditableComponent } from "./studioRegistry";
import type { TokenCatalog, TokenValue } from "./tokens";

export type InspectedElement = {
  frameId: string;
  tag: string;
  /** 가장 가까운 testID(등록 여부와 무관) */
  testId: string | null;
  /** 가장 가까운 등록된 요소 */
  component: EditableComponent | null;
  text: string;
  color: string;
  backgroundColor: string;
  borderColor: string;
  fontSize: number | null;
  fontFamily: string;
};

export type TokenMatch = {
  key: string;
  property: "color" | "backgroundColor" | "borderColor" | "fontSize" | "fontFamily";
  editable: boolean;
};

const OVERLAY_ID = "momentory-lab-inspector-outline";
const BLOCKED = [
  "pointerup",
  "mousedown",
  "mouseup",
  "click",
  "touchstart",
  "touchend",
  "dblclick",
];

const transparent = (value: string) => {
  const c = parseColor(value);
  return !c || c.a === 0;
};

/** iframe 의 노드는 셸 창의 `Element` 와 다른 realm 이라 `instanceof` 가 늘 거짓이다 — 모양으로 본다 */
const asElement = (target: EventTarget | null): Element | null =>
  target && typeof (target as Element).getBoundingClientRect === "function"
    ? (target as Element)
    : null;

function describe(element: Element, frameId: string): InspectedElement {
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  let testId: string | null = null;
  let component: EditableComponent | null = null;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const id = node.getAttribute("data-testid");
    if (!id) continue;
    testId ??= id;
    const registered = componentByTestId.get(id);
    if (registered) {
      component = registered;
      break;
    }
  }
  // 배경은 투명한 겹이 많다 — 처음으로 칠해진 조상의 색을 쓴다
  let backgroundColor = "";
  for (let node: Element | null = element; node && view; node = node.parentElement) {
    const bg = view.getComputedStyle(node).backgroundColor;
    if (!transparent(bg)) {
      backgroundColor = bg;
      break;
    }
  }
  const fontSize = style ? Number.parseFloat(style.fontSize) : Number.NaN;
  return {
    frameId,
    tag: element.tagName.toLowerCase(),
    testId,
    component,
    text: (element.textContent ?? "").trim().slice(0, 40),
    color: style?.color ?? "",
    backgroundColor,
    borderColor: style && Number.parseFloat(style.borderTopWidth) > 0 ? style.borderTopColor : "",
    fontSize: Number.isFinite(fontSize) ? fontSize : null,
    fontFamily: (style?.fontFamily ?? "")
      .split(",")[0]!
      .trim()
      .replace(/^["']|["']$/g, ""),
  };
}

/** 계산된 값과 같은 토큰 — 편집할 수 있는 것을 먼저, 속성마다 몇 개까지만 */
export function matchTokens(
  info: InspectedElement,
  catalog: TokenCatalog,
  tokens: Readonly<Record<string, TokenValue>>,
  typeScale: number,
  perProperty = 6,
): TokenMatch[] {
  const out: TokenMatch[] = [];
  const valueOf = (key: string, approved: TokenValue | null) => tokens[key] ?? approved;
  const push = (
    property: TokenMatch["property"],
    test: (key: string, value: TokenValue) => boolean,
  ) => {
    const found = catalog.entries
      .filter((entry) => {
        const value = valueOf(entry.key, entry.approved);
        return (
          value !== null &&
          test(entry.key, value) &&
          (entry.type !== "number" || /fontSize$/.test(entry.key))
        );
      })
      .sort((a, b) => Number(b.editable) - Number(a.editable))
      .slice(0, perProperty);
    for (const entry of found) out.push({ key: entry.key, property, editable: entry.editable });
  };
  for (const property of ["color", "backgroundColor", "borderColor"] as const) {
    const computed = info[property];
    if (computed && !transparent(computed))
      push(
        property,
        (key, value) => catalog.byKey.get(key)?.type === "color" && sameColor(value, computed),
      );
  }
  if (info.fontSize !== null) {
    const size = info.fontSize;
    push("fontSize", (key, value) => {
      const entry = catalog.byKey.get(key);
      if (entry?.type !== "number" || typeof value !== "number") return false;
      return (entry.scaled ? Math.round(value * typeScale) : value) === Math.round(size);
    });
  }
  if (info.fontFamily)
    push(
      "fontFamily",
      (key, value) => catalog.byKey.get(key)?.type === "fontFamily" && value === info.fontFamily,
    );
  return out;
}

export type InspectorOptions = {
  frameId: string;
  /** 테두리 색 — expo-lab 은 hex 를 적지 못하므로 부르는 쪽이 토큰 값을 넘긴다 */
  outlineColor: string;
  onPick: (info: InspectedElement) => void;
};

/** 문서에 붙는다. 떼는 함수를 돌려준다(문서가 이미 사라졌어도 안전하다) */
export function attachInspector(doc: Document, options: InspectorOptions): () => void {
  const overlay = doc.createElement("div");
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    outline: `2px solid ${options.outlineColor}`,
    outlineOffset: "1px",
    display: "none",
  });
  doc.getElementById(OVERLAY_ID)?.remove();
  doc.body?.appendChild(overlay);

  const outline = (element: Element | null) => {
    if (!element) {
      overlay.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: "block",
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
    });
  };
  const onMove = (event: Event) => outline(asElement(event.target));
  const onLeave = () => outline(null);
  const onDown = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const target = asElement(event.target);
    if (target) options.onPick(describe(target, options.frameId));
  };
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
  const view = doc.defaultView;
  view?.addEventListener("pointermove", onMove, true);
  doc.addEventListener("pointerleave", onLeave, true);
  view?.addEventListener("pointerdown", onDown, true);
  for (const type of BLOCKED) view?.addEventListener(type, block, true);
  return () => {
    try {
      view?.removeEventListener("pointermove", onMove, true);
      doc.removeEventListener("pointerleave", onLeave, true);
      view?.removeEventListener("pointerdown", onDown, true);
      for (const type of BLOCKED) view?.removeEventListener(type, block, true);
      overlay.remove();
    } catch {
      // 프레임이 다시 불려 문서가 사라졌다 — 뗄 것이 없다
    }
  };
}

/** 등록된 요소를 프레임 안에서 강조한다(패널에서 고른 경우). 떼는 함수를 돌려준다 */
export function highlightTestId(doc: Document, testId: string, color: string): () => void {
  const node = doc.querySelector<HTMLElement>(`[data-testid="${CSS.escape(testId)}"]`);
  if (!node) return () => undefined;
  const previous = { outline: node.style.outline, outlineOffset: node.style.outlineOffset };
  node.style.outline = `3px solid ${color}`;
  node.style.outlineOffset = "2px";
  return () => {
    node.style.outline = previous.outline;
    node.style.outlineOffset = previous.outlineOffset;
  };
}
