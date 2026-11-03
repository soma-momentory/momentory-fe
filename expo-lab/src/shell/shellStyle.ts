/**
 * 셸(최상위 창)에만 까는 CSS — 왼쪽 화면 목록 · 오른쪽 패널의 **스크롤바 막대를 숨긴다**.
 *
 * 창이 조금만 낮아도 막대가 15px 자리를 차지해 칸이 좁아지고 글이 다시 흐른다(2026-11-03 사용자 제보).
 * 스크롤은 그대로다 — 휠 · 터치패드 · 키보드로 내려간다. 프레임(실제 앱)에는 들어가지 않는다.
 */
export const SHELL_WEB_CSS = [
  "* { scrollbar-width: none; }",
  "*::-webkit-scrollbar { display: none; }",
].join("\n");

const STYLE_ID = "momentory-lab-shell-web";

export function installShellWebStyle(doc: Document | undefined = globalThis.document): void {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = SHELL_WEB_CSS;
  doc.head.appendChild(style);
}
