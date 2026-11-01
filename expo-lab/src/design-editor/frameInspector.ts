/**
 * 화면에서 눌러 고르기 — 프레임(같은 출처 iframe)의 `contentDocument` 에 붙는 Lab 전용 DOM 어댑터.
 * 앱 코드는 바뀌지 않는다: 앱 DOM 에는 손대지 않고, 테두리는 `body` 끝에 붙인 덮개로 그린다.
 *
 * - 올려 둔 요소에 테두리를 그린다(프레임 문서 안의 `pointer-events: none` 상자 하나)
 * - 누르면 앱이 그 누름을 받지 못하게 막고 그 요소를 돌려준다 — 값 읽기 · 토큰 찾기는
 *   `screenUsage.ts`(`describeElement` · `candidatesFor`)가 한다
 */
import { showBoxes } from "./screenUsage";

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

/** iframe 의 노드는 셸 창의 `Element` 와 다른 realm 이라 `instanceof` 가 늘 거짓이다 — 모양으로 본다 */
const asElement = (target: EventTarget | null): Element | null =>
  target && typeof (target as Element).getBoundingClientRect === "function"
    ? (target as Element)
    : null;

export type InspectorOptions = {
  /** 테두리 색 — expo-lab 은 hex 를 적지 못하므로 부르는 쪽이 토큰 값을 넘긴다 */
  outlineColor: string;
  onPick: (element: Element) => void;
};

/** 문서에 붙는다. 떼는 함수를 돌려준다(문서가 이미 사라졌어도 안전하다) */
export function attachInspector(doc: Document, options: InspectorOptions): () => void {
  const overlay = doc.createElement("div");
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: "2147483647",
    outline: `2px dashed ${options.outlineColor}`,
    outlineOffset: "1px",
    display: "none",
  });
  doc.getElementById(OVERLAY_ID)?.remove();
  doc.body?.appendChild(overlay);
  const view = doc.defaultView;

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
    if (target) options.onPick(target);
  };
  const block = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };
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
  const node = doc.querySelector(`[data-testid="${CSS.escape(testId)}"]`);
  if (!node) return () => undefined;
  return showBoxes(doc, [node], color, "momentory-lab-studio-highlight");
}
