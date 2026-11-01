/**
 * 돋보기 렌즈의 스냅숏 — 앱 프레임(같은 출처 iframe)의 **지금 문서**를 복제해 렌즈 안의 빈 iframe 에
 * 옮겨 그린다. 렌즈는 그 복제를 `scale` 로 키워 보여 줄 뿐, 앱을 다시 돌리지 않는다.
 *
 * 복제에 저절로 안 따라오는 것을 옮겨 적는다:
 * - **스타일** — react-native-web 은 규칙을 `insertRule`(CSSOM)로 넣어 `<style>` 의 글자가 비어 있다.
 *   그래서 `<style>` 을 복제하지 않고 `document.styleSheets` 의 규칙 글자를 모아 렌즈 문서에 한 장으로
 *   싣는다(`@font-face` 도 규칙이라 함께 온다). 규칙 수가 그대로면 다시 쓰지 않는다 — 글꼴을 매번 새로
 *   읽어 깜빡이지 않게 `<head>` 는 두고 `<body>` 만 갈아 끼운다
 * - **스크롤 위치** — 스크롤 컨테이너마다 scrollTop/Left 를 표시해 두고 넣은 뒤 적용한다
 * - **입력 중인 글자** — `input.value` 는 속성이 아니라 복제에 안 따라온다 → value 속성 · textarea 내용으로
 * - 스크립트 · 하위 iframe 은 뺀다(렌즈는 그림일 뿐이다)
 */

const cssCache = new WeakMap<Document, { key: string; text: string }>();

function collectCss(doc: Document): { key: string; text: string } {
  const lists = Array.from(doc.styleSheets, (sheet) => {
    try {
      return sheet.cssRules;
    } catch {
      return null; // 다른 출처의 스타일시트 — 읽을 수 없다
    }
  });
  const key = lists.map((rules) => rules?.length ?? -1).join(",");
  const cached = cssCache.get(doc);
  if (cached && cached.key === key) return cached;
  const text = lists
    .map((rules) => (rules ? Array.from(rules, (rule) => rule.cssText).join("\n") : ""))
    .join("\n");
  const next = { key, text };
  cssCache.set(doc, next);
  return next;
}

const SCROLL_ATTR = "data-lab-scroll";
const CSS_ATTR = "data-lab-css";
/** 렌즈는 그림이다 — 깜빡이는 커서 · 스크롤바를 지운다 */
const LENS_CSS =
  "html, body { overflow: hidden !important; } * { caret-color: transparent !important; scrollbar-width: none !important; }";

/** `source` 문서를 복제해 `target`(렌즈 iframe 의 문서)에 그린다. 실패하면 false */
export function snapshotInto(source: Document, target: Document): boolean {
  try {
    const body = source.body;
    if (!body || !target.documentElement) return false;
    const clone = body.cloneNode(true) as HTMLElement;
    const from = [body, ...Array.from(body.getElementsByTagName("*"))];
    const to = [clone, ...Array.from(clone.getElementsByTagName("*"))];
    for (let i = 0; i < from.length; i += 1) {
      const el = from[i]!;
      const copy = to[i];
      if (!copy) break;
      if (el.scrollTop || el.scrollLeft) {
        copy.setAttribute(SCROLL_ATTR, `${el.scrollTop},${el.scrollLeft}`);
      }
      if (el.tagName === "INPUT") {
        const input = el as HTMLInputElement;
        if (input.type === "checkbox" || input.type === "radio") {
          if (input.checked) copy.setAttribute("checked", "");
          else copy.removeAttribute("checked");
        } else {
          copy.setAttribute("value", input.value);
        }
      } else if (el.tagName === "TEXTAREA") {
        copy.textContent = (el as HTMLTextAreaElement).value;
      }
    }
    clone.querySelectorAll("script, iframe").forEach((node) => node.remove());

    // <head> — 처음 한 번 만들고, 규칙이 바뀌었을 때만 고친다
    const head = target.head ?? target.documentElement.appendChild(target.createElement("head"));
    let base = head.querySelector("base");
    if (!base) {
      base = target.createElement("base");
      head.prepend(base);
    }
    if (base.href !== source.baseURI) base.href = source.baseURI;
    let style = head.querySelector<HTMLStyleElement>(`style[${CSS_ATTR}]`);
    if (!style) {
      style = target.createElement("style");
      style.setAttribute(CSS_ATTR, "");
      head.append(style);
    }
    const css = collectCss(source);
    if (style.getAttribute(CSS_ATTR) !== css.key) {
      style.textContent = `${css.text}\n${LENS_CSS}`;
      style.setAttribute(CSS_ATTR, css.key);
    }
    // <html> 의 속성(lang · style · class)
    for (const attr of Array.from(source.documentElement.attributes)) {
      if (target.documentElement.getAttribute(attr.name) !== attr.value) {
        target.documentElement.setAttribute(attr.name, attr.value);
      }
    }

    const imported = target.importNode(clone, true);
    if (target.body) target.documentElement.replaceChild(imported, target.body);
    else target.documentElement.appendChild(imported);
    target.querySelectorAll<HTMLElement>(`[${SCROLL_ATTR}]`).forEach((node) => {
      const [top, left] = (node.getAttribute(SCROLL_ATTR) ?? "0,0").split(",").map(Number);
      node.scrollTop = top ?? 0;
      node.scrollLeft = left ?? 0;
    });
    return true;
  } catch {
    return false;
  }
}
