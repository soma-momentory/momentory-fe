/**
 * 「이 화면에 쓰인 값」 — 프레임(같은 출처 iframe)에 **지금 보이는 요소**의 계산된 스타일을 모아,
 * 같은 값을 가진 토큰을 찾는다. 앱 코드는 바뀌지 않는다: 문서를 읽기만 하고, 강조는 `body` 끝에
 * 붙였다 떼는 상자로 그린다(`showBoxes`).
 *
 * 값 → 토큰은 **어림짐작**이다. 화면은 토큰 이름을 남기지 않으므로 「같은 값」으로 찾는다 —
 * 같은 값의 토큰이 여럿이면 모두 후보로 두고, 그 화면 전용 묶음(홈이면 `homeV2`)을 먼저 둔다.
 * 숫자는 이름으로 좁힌다(글씨 크기는 `fontSize` 잎, 모서리는 `radius` 잎 …) — 안 그러면 16 은
 * 수백 개와 맞는다.
 */
import { parseColor, sameColor } from "./colorMath";
import { componentByTestId, type EditableComponent } from "./studioRegistry";
import type { TokenCatalog, TokenEntry, TokenValue } from "./tokens";

export type UsageProperty =
  | "color"
  | "backgroundColor"
  | "borderColor"
  | "fontSize"
  | "lineHeight"
  | "fontFamily"
  | "borderRadius"
  | "padding"
  | "gap";

export type UsageCategory = "text" | "surface" | "border" | "type" | "radius" | "space";

export const USAGE_CATEGORIES: readonly { id: UsageCategory; label: string }[] = [
  { id: "text", label: "글자색" },
  { id: "surface", label: "바탕" },
  { id: "border", label: "테두리" },
  { id: "type", label: "글자 크기 · 글꼴" },
  { id: "radius", label: "모서리" },
  { id: "space", label: "간격" },
];

export const PROPERTY_INFO: Readonly<
  Record<UsageProperty, { label: string; category: UsageCategory }>
> = {
  color: { label: "글자색", category: "text" },
  backgroundColor: { label: "바탕", category: "surface" },
  borderColor: { label: "테두리", category: "border" },
  fontSize: { label: "글자 크기", category: "type" },
  lineHeight: { label: "행간", category: "type" },
  fontFamily: { label: "글꼴", category: "type" },
  borderRadius: { label: "모서리", category: "radius" },
  padding: { label: "안쪽 여백", category: "space" },
  gap: { label: "사이 간격", category: "space" },
};

/** 요소 하나의 계산된 값 — 없는 속성은 빠진다 */
export type ElementStyle = Partial<Record<UsageProperty, string | number>>;

/** 화면에서 모은 값 하나 — 같은 속성 · 같은 값을 쓰는 요소들 */
export type UsageSample = {
  property: UsageProperty;
  value: string | number;
  elements: Element[];
};

const OVERLAY_PREFIX = "momentory-lab-";

const transparent = (value: string) => {
  const c = parseColor(value);
  return !c || c.a === 0;
};
const px = (value: string | undefined) => {
  const n = Number.parseFloat(value ?? "");
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};
const firstFont = (value: string) =>
  value
    .split(",")[0]!
    .trim()
    .replace(/^["']|["']$/g, "");

const hasOwnText = (element: Element) => {
  for (const node of Array.from(element.childNodes))
    if (node.nodeType === 3 && (node.textContent ?? "").trim()) return true;
  return false;
};

/** 요소 하나의 계산된 값 — 글자 관련은 글자를 직접 든 요소에만 센다 */
export function readElementStyle(element: Element): ElementStyle {
  const view = element.ownerDocument.defaultView;
  const style = view?.getComputedStyle(element);
  if (!style) return {};
  const out: ElementStyle = {};
  if (hasOwnText(element)) {
    if (!transparent(style.color)) out.color = style.color;
    const size = px(style.fontSize);
    if (size) out.fontSize = size;
    const line = px(style.lineHeight);
    if (line) out.lineHeight = line;
    const font = firstFont(style.fontFamily);
    if (font) out.fontFamily = font;
  }
  if (!transparent(style.backgroundColor)) out.backgroundColor = style.backgroundColor;
  const borderWidth = px(style.borderTopWidth) ?? 0;
  if (borderWidth > 0 && !transparent(style.borderTopColor)) out.borderColor = style.borderTopColor;
  const radius = px(style.borderTopLeftRadius) ?? 0;
  if (radius > 0 && (out.backgroundColor || out.borderColor)) out.borderRadius = radius;
  const padding = Math.max(px(style.paddingLeft) ?? 0, px(style.paddingTop) ?? 0);
  if (padding > 0) out.padding = padding;
  const gap = Math.max(px(style.rowGap) ?? 0, px(style.columnGap) ?? 0);
  if (gap > 0) out.gap = gap;
  return out;
}

/** 프레임 창 안에 보이는 요소인가 */
function isVisible(element: Element, view: Window): boolean {
  if ((element as HTMLElement).id?.startsWith(OVERLAY_PREFIX)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;
  if (rect.bottom <= 0 || rect.right <= 0) return false;
  if (rect.top >= view.innerHeight || rect.left >= view.innerWidth) return false;
  const style = view.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

/** 문서에 지금 보이는 요소들의 값을 속성 · 값별로 모은다 */
export function collectScreenUsage(doc: Document): UsageSample[] {
  const view = doc.defaultView;
  if (!view || !doc.body) return [];
  const byKey = new Map<string, UsageSample>();
  for (const element of Array.from(doc.body.querySelectorAll("*"))) {
    if (element.closest(`[id^="${OVERLAY_PREFIX}"]`)) continue;
    if (!isVisible(element, view)) continue;
    const style = readElementStyle(element);
    for (const [property, value] of Object.entries(style) as [UsageProperty, string | number][]) {
      const normalized = typeof value === "string" ? value.replace(/\s+/g, "") : value;
      const key = `${property}|${normalized}`;
      const sample = byKey.get(key);
      if (sample) sample.elements.push(element);
      else byKey.set(key, { property, value, elements: [element] });
    }
  }
  return [...byKey.values()];
}

// ── 값 → 토큰 ───────────────────────────────────────────────

/** 라우트 → 그 화면 전용 묶음(먼저 보인다). 앞에서부터 맞는 첫 줄을 쓴다 */
const SCREEN_GROUPS: readonly [RegExp, readonly string[]][] = [
  [/^\/(home|archive|rest\/?$)/, ["homeV2"]],
  [
    /^\/rest\/sense-pond/,
    ["pond", "pondMotion", "pondVeil", "pondPanelVeil", "pondSize", "pondLayout"],
  ],
  [/^\/rest\/worr/, ["worryBox", "worryBoxLayout", "worryBoxSize", "worryBoxFinish", "restScene"]],
  [
    /^\/rest\/treasure/,
    ["treasureBox", "treasureBoxLayout", "treasureBoxSize", "treasureBoxFinish", "restScene"],
  ],
  [
    /^\/rest\/body-release/,
    ["bodyRelease", "bodyReleaseLayout", "bodyReleaseSize", "bodyReleaseRing", "bodyReleaseFinish"],
  ],
  [
    /^\/rest/,
    ["restScene", "restSceneSize", "restMood", "restMoodSize", "restGuideSize", "homeV2"],
  ],
  [/^\/my/, ["myPaper"]],
  [/^\/report/, ["reportPaper"]],
  [/^\/diary/, ["diaryPaper", "diaryMemo"]],
  [/^\/letter/, ["letterPaper"]],
  [
    /^\/retro/,
    ["retroDiary", "retroRug", "chatChoiceSelected", "retroBubbleComparison", "cardFrame"],
  ],
  [/^\/login/, ["social", "gothic", "gothicFamily"]],
  [/^\/$/, ["splashLoader"]],
  [
    /^\/intro|^\/(mood|why|day-end|diary-history|goal|reading|name|about|calendar|notify|research|now)/,
    ["onboardingArt", "notebook"],
  ],
];

/** 앱 전체가 함께 쓰는 묶음 — 화면 전용 묶음 다음에 보인다 */
export const COMMON_GROUPS: ReadonlySet<string> = new Set([
  "background",
  "label",
  "primary",
  "secondary",
  "status",
  "interaction",
  "fill",
  "line",
  "overlay",
  "grid",
  "emotion",
  "text",
  "fontFamily",
  "space",
  "cardPadding",
  "radius",
  "bubbleRadius",
  "layout",
  "hairline",
  "size",
]);

const normalizeRoute = (route: string) =>
  `/${(route.split("?")[0] ?? "")
    .split("/")
    .filter((part) => part && !/^\(.*\)$/.test(part))
    .join("/")}`;

export function screenGroupsForRoute(route: string): readonly string[] {
  const path = normalizeRoute(route);
  return SCREEN_GROUPS.find(([pattern]) => pattern.test(path))?.[1] ?? [];
}

const leaf = (entry: TokenEntry) => entry.path[entry.path.length - 1] ?? "";

/** 이 속성의 값으로 쓰일 수 있는 토큰인가 — 숫자는 이름으로 좁힌다 */
function fitsProperty(entry: TokenEntry, property: UsageProperty): boolean {
  switch (property) {
    case "color":
    case "backgroundColor":
    case "borderColor":
      return entry.type === "color";
    case "fontFamily":
      return entry.type === "fontFamily";
    case "fontSize":
      return entry.type === "number" && leaf(entry) === "fontSize";
    case "lineHeight":
      return entry.type === "number" && leaf(entry) === "lineHeight";
    case "borderRadius":
      return entry.type === "number" && (entry.group === "radius" || /radius/i.test(leaf(entry)));
    case "padding":
    case "gap":
      return (
        entry.type === "number" &&
        (entry.group === "space" ||
          entry.group === "cardPadding" ||
          /padding|gap|inset|margin/i.test(leaf(entry)))
      );
  }
}

/** 얼마나 잘 맞나 — 0 그대로 같다 · 1 기기 배율을 곱하면 같다 · null 다르다 */
function matchStrength(
  entry: TokenEntry,
  value: TokenValue,
  computed: string | number,
  typeScale: number,
): 0 | 1 | null {
  if (entry.type === "color") return sameColor(value, computed) ? 0 : null;
  if (entry.type === "fontFamily") return value === computed ? 0 : null;
  if (typeof value !== "number" || typeof computed !== "number") return null;
  const target = Math.round(computed);
  // `text.*` 는 앱이 기기 배율을 곱해 그린다(기준 pt) — 그 셈이 곧 정답이다
  if (entry.scaled) return Math.round(value * typeScale) === target ? 0 : null;
  if (Math.round(value) === target) return 0;
  // 화면 전용 글씨 크기는 대개 그대로 쓰지만, 배율을 곱해 쓰는 곳도 있어 약한 후보로 둔다
  if (/^(fontSize|lineHeight)$/.test(leaf(entry)) && Math.round(value * typeScale) === target)
    return 1;
  return null;
}

export type MatchContext = {
  catalog: TokenCatalog;
  /** 시안이 덮어쓴 값 — 프레임이 그린 값과 비교한다 */
  tokens: Readonly<Record<string, TokenValue>>;
  typeScale: number;
  /** 지금 화면 전용 묶음(`screenGroupsForRoute`) */
  screenGroups: readonly string[];
};

/**
 * 후보 순서 — 이 화면 전용(고칠 수 있음) → 앱 공통(고칠 수 있음) → 이 화면 전용(고칠 수 없음)
 * → 앱 공통(고칠 수 없음) → 다른 화면 전용. 다른 화면 묶음은 우연히 값이 같은 것일 때가 많아
 * (홈의 잉크 = 마이 종이 그림자) 고칠 수 있어도 맨 뒤로 민다 — 그걸 고치면 이 화면은 그대로이고
 * 다른 화면이 바뀐다.
 */
const rank = (entry: TokenEntry, strength: 0 | 1, screenGroups: readonly string[]) => {
  const screen = screenGroups.indexOf(entry.group);
  const common = COMMON_GROUPS.has(entry.group);
  let tier: number;
  if (screen >= 0) tier = entry.editable ? screen : 150 + screen;
  else if (common) tier = entry.editable ? 100 : 180;
  else tier = entry.editable ? 200 : 300;
  return strength * 1000 + tier;
};

/** 계산된 값 하나와 맞는 토큰 — 화면 전용 묶음 · 공통 묶음 · 고칠 수 있는 것을 먼저 */
export function candidatesFor(
  property: UsageProperty,
  computed: string | number,
  context: MatchContext,
  limit = 6,
): TokenEntry[] {
  const { catalog, tokens, typeScale, screenGroups } = context;
  const found: { entry: TokenEntry; order: number }[] = [];
  for (const entry of catalog.entries) {
    if (!fitsProperty(entry, property)) continue;
    const value = tokens[entry.key] ?? entry.approved;
    if (value === null) continue;
    const strength = matchStrength(entry, value, computed, typeScale);
    if (strength !== null) found.push({ entry, order: rank(entry, strength, screenGroups) });
  }
  found.sort((a, b) => a.order - b.order);
  // 이 화면 · 공통 묶음에 맞는 것이 하나라도 있으면 다른 화면 묶음의 우연한 일치는 뺀다
  const strong = found.filter((item) => item.order % 1000 < 200);
  return (strong.length ? strong : found).slice(0, limit).map((item) => item.entry);
}

export type UsageItem = {
  id: string;
  property: UsageProperty;
  value: string | number;
  count: number;
  elements: Element[];
  candidates: TokenEntry[];
};

/** 모은 값에 후보 토큰을 붙인다. 많이 쓰인 값부터 */
export function matchUsage(samples: readonly UsageSample[], context: MatchContext): UsageItem[] {
  return samples
    .map((sample) => ({
      id: `${sample.property}|${sample.value}`,
      property: sample.property,
      value: sample.value,
      count: sample.elements.length,
      elements: sample.elements,
      candidates: candidatesFor(sample.property, sample.value, context),
    }))
    .sort((a, b) => b.count - a.count);
}

/** 이 화면에서 같은 속성 · 같은 값을 쓰는 요소 수 */
export function usageCount(
  items: readonly UsageItem[],
  property: UsageProperty,
  value: string | number,
): number {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, "") : value;
  return (
    items.find(
      (item) =>
        item.property === property &&
        (typeof item.value === "string" ? item.value.replace(/\s+/g, "") : item.value) ===
          normalized,
    )?.count ?? 0
  );
}

// ── 고른 요소 ───────────────────────────────────────────────

export type PickedElement = {
  frameId: string;
  tag: string;
  text: string;
  /** 가장 가까운 testID(등록 여부와 무관) */
  testId: string | null;
  /** 가장 가까운 등록된 요소(화면별 값) */
  component: EditableComponent | null;
  style: ElementStyle;
  /** 프레임이 다시 불리면 끊긴다 — 강조에만 쓴다 */
  element: Element | null;
};

export function describeElement(element: Element, frameId: string): PickedElement {
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
  const style = readElementStyle(element);
  // 글자를 직접 들지 않은 겹을 눌렀으면 안의 첫 글자 요소의 글자 값을 빌린다
  if (style.color === undefined) {
    const inner = Array.from(element.querySelectorAll("*")).find(hasOwnText);
    if (inner) {
      const innerStyle = readElementStyle(inner);
      for (const key of ["color", "fontSize", "lineHeight", "fontFamily"] as const)
        if (innerStyle[key] !== undefined) style[key] = innerStyle[key];
    }
  }
  // 바탕은 투명한 겹이 많다 — 처음으로 칠해진 조상의 색을 쓴다
  if (style.backgroundColor === undefined) {
    const view = element.ownerDocument.defaultView;
    for (let node = element.parentElement; node && view; node = node.parentElement) {
      const bg = view.getComputedStyle(node).backgroundColor;
      if (!transparent(bg)) {
        style.backgroundColor = bg;
        break;
      }
    }
  }
  return {
    frameId,
    tag: element.tagName.toLowerCase(),
    text: (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 30),
    testId,
    component,
    style,
    element,
  };
}

// ── 강조 상자 ───────────────────────────────────────────────

const BOXES_ID = `${OVERLAY_PREFIX}boxes`;

/**
 * 요소들 위에 상자를 그린다 — 앱 DOM 은 건드리지 않고 `body` 끝에 덮개 하나를 붙인다.
 * 떼는 함수를 돌려준다(문서가 사라졌어도 안전하다).
 */
export function showBoxes(
  doc: Document,
  elements: readonly Element[],
  color: string,
  id = BOXES_ID,
): () => void {
  try {
    doc.getElementById(id)?.remove();
    const live = elements.filter((element) => element.isConnected && element.ownerDocument === doc);
    if (!live.length || !doc.body) return () => undefined;
    const layer = doc.createElement("div");
    layer.id = id;
    Object.assign(layer.style, {
      position: "fixed",
      inset: "0",
      pointerEvents: "none",
      zIndex: "2147483646",
    });
    for (const element of live.slice(0, 200)) {
      const rect = element.getBoundingClientRect();
      const box = doc.createElement("div");
      Object.assign(box.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        outline: `2px solid ${color}`,
        outlineOffset: "1px",
        borderRadius: "3px",
      });
      layer.appendChild(box);
    }
    doc.body.appendChild(layer);
    return () => {
      try {
        layer.remove();
      } catch {
        // 문서가 이미 사라졌다
      }
    };
  } catch {
    return () => undefined;
  }
}
