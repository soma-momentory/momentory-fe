/**
 * 프레임 안에서만 까는 웹 보정 CSS — **네이티브 앱에는 없는 브라우저 기본 모양**을 지운다.
 *
 * - 포커스 테두리(outline): 브라우저는 포커스된 입력칸 · 누를 수 있는 요소에 검은/파란 테두리를
 *   그린다. 일정 추가 · 수정 시트의 입력칸 둘레에 사각 테두리가 생기던 자리다(2026-11-02 사용자 제보).
 *   iOS · Android 앱에는 이 테두리가 없으므로 프레임에서만 끈다. 앱이 **스스로** 그리는 포커스 표시
 *   (테두리 색 · 굵기를 바꾸는 스타일)는 style 속성이라 영향을 받지 않는다.
 *
 * 앱 코드는 고치지 않는다 — 셸(최상위 창)에는 걸리지 않고 프레임 문서에만 들어간다.
 */
export const FRAME_WEB_CSS = [
  "*:focus, *:focus-visible { outline: none !important; }",
  "input, textarea { outline: none; box-shadow: none; }",
].join("\n");

const STYLE_ID = "momentory-lab-frame-web";

export function installFrameWebStyle(doc: Document | undefined = globalThis.document): void {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = FRAME_WEB_CSS;
  doc.head.appendChild(style);
}
