/**
 * DS 토큰 목록 — `src/design/ds/*` 의 export 를 **실행 중인 값**에서 읽어 편집 가능한 잎으로 편다.
 *
 * 무엇을 고칠 수 있나: 평범한 객체 안의 문자열·숫자 잎 중 **소스에서 리터럴인 것**.
 * 고칠 수 없는 것과 이유:
 * - 모듈 최상위 원시값(`scheduleDot` · `restRipple` · `selectedTint` …) — ES 모듈 바인딩은 밖에서 못 바꾼다
 * - 함수(`withAlpha` · `emotionTint` · `isWaterSpot` …)
 * - 배열(연출 좌표 `motes` · 그라디언트 `stops` …) — 항목별 편집을 열지 않는다
 * - 계산·참조로 만든 잎(`fill.*` 의 템플릿 · `withAlpha(...)` · `size.button.radius = radius.medium` …) —
 *   모듈이 올라올 때 한 번 계산된 사본이라, 바꿔도 원본과 어긋나고 코드로 옮길 리터럴이 없다.
 *   어느 잎이 그런지는 소스를 봐야 알아서 **소스 지도**(`tokenSourceMap.json` · `apply-tokens.mjs --source-map`)가 든다
 * - `Object.freeze` 된 객체
 *
 * `text.*` 의 `fontSize` · `lineHeight` 는 **기준 pt** 로 편집한다(소스의 `style("medium", 16, 24)` 인자).
 * 프레임은 거기에 그 기기의 `typeScale` 을 곱해 넣는다 — 앱이 하는 셈과 같다.
 */
import { isColor } from "./colorMath";
import type { TokenModules } from "./tokenModules";
import sourceMapFile from "./tokenSourceMap.json";

export type TokenType = "color" | "number" | "fontFamily" | "string" | "other";
export type TokenValue = string | number;

export type TokenEntry = {
  /** 정규 키 — `primary.heavy` · `text.body1.fontSize` */
  key: string;
  /** ds 파일 이름(확장자 없이) */
  module: string;
  /** export 이름부터의 경로 */
  path: readonly string[];
  /** 무리 — export 이름(`label` · `homeV2`) */
  group: string;
  type: TokenType;
  /** 승인값(운영 기본값). `scaled` 면 기준 pt */
  approved: TokenValue | null;
  editable: boolean;
  /** 읽기 전용 이유 */
  reason?: string;
  /** `text.*` 크기·행간 — 프레임이 `typeScale` 을 곱한다 */
  scaled?: boolean;
};

type SourceMapEntry =
  | { file: string; kind: "typeScale"; base: number }
  | { file: string; kind: "derived"; expr: string }
  | { file: string; kind: "ambiguous" };

const sourceMap = (sourceMapFile as { entries: Record<string, SourceMapEntry> }).entries;

/** 같은 객체를 다시 묶을 뿐인 export — 키를 만들지 않는다(`apply-tokens.mjs` 와 같은 목록) */
export const AGGREGATE_EXPORTS: ReadonlySet<string> = new Set([
  "color",
  "metrics",
  "typography",
  "ds",
  "default",
]);

export const SOURCE_MAP_COMMAND = "node expo-lab/scripts/apply-tokens.mjs --source-map";

const FONT_KEY = /(^|\.)(fontFamily|gothicFamily|font)(\.|$)/;

const typeOf = (key: string, value: unknown, fonts: ReadonlySet<string>): TokenType => {
  if (typeof value === "number") return "number";
  if (typeof value !== "string") return "other";
  if (isColor(value)) return "color";
  if (FONT_KEY.test(key) || fonts.has(value)) return "fontFamily";
  return "string";
};

/** 앱이 로드하는 서체 이름 — `fontFamily` · `gothicFamily` 의 값 */
export function knownFonts(modules: TokenModules): ReadonlySet<string> {
  const typography = modules.typography ?? {};
  const names = new Set<string>();
  for (const group of [typography.fontFamily, typography.gothicFamily])
    if (group && typeof group === "object")
      for (const value of Object.values(group)) if (typeof value === "string") names.add(value);
  return names;
}

export type TokenCatalog = {
  entries: readonly TokenEntry[];
  byKey: ReadonlyMap<string, TokenEntry>;
  fonts: ReadonlySet<string>;
  /** 이 실행 문맥의 `typeScale`(셸은 웹 · 프레임은 흉내 낸 기기) */
  typeScale: number;
};

export function buildTokenCatalog(modules: TokenModules): TokenCatalog {
  const fonts = knownFonts(modules);
  const typeScaleValue = modules.typography?.typeScale;
  const typeScale = typeof typeScaleValue === "number" ? typeScaleValue : 1;
  const entries: TokenEntry[] = [];
  const seen = new WeakSet<object>();
  const exportOwner = new Map<string, string>();

  const add = (entry: Omit<TokenEntry, "type" | "approved"> & { value: unknown }) => {
    const { value, ...rest } = entry;
    const primitive = typeof value === "string" || typeof value === "number";
    entries.push({
      ...rest,
      type: primitive ? typeOf(rest.key, value, fonts) : "other",
      approved: primitive ? value : null,
    });
  };

  const walk = (module: string, path: string[], value: unknown, frozen: boolean) => {
    const key = path.join(".");
    const group = path[0]!;
    if (Array.isArray(value)) {
      add({
        key,
        module,
        path,
        group,
        value,
        editable: false,
        reason: "배열이다 — 항목별 편집을 열지 않는다",
      });
      return;
    }
    if (typeof value === "function") {
      add({ key, module, path, group, value, editable: false, reason: "함수다" });
      return;
    }
    if (value !== null && typeof value === "object") {
      if (seen.has(value)) return; // 같은 객체를 다른 이름으로 다시 묶은 것
      seen.add(value);
      const childFrozen = frozen || Object.isFrozen(value);
      for (const [child, childValue] of Object.entries(value))
        walk(module, [...path, child], childValue, childFrozen);
      return;
    }
    if (typeof value !== "string" && typeof value !== "number") {
      add({ key, module, path, group, value, editable: false, reason: "문자열·숫자가 아니다" });
      return;
    }
    const source = sourceMap[key];
    if (frozen) {
      add({ key, module, path, group, value, editable: false, reason: "Object.freeze 된 객체다" });
    } else if (source?.kind === "derived") {
      add({
        key,
        module,
        path,
        group,
        value,
        editable: false,
        reason: `계산된 값이다(${source.expr}) — 원본 식이나 가리키는 토큰을 고친다`,
      });
    } else if (source?.kind === "ambiguous") {
      add({
        key,
        module,
        path,
        group,
        value,
        editable: false,
        reason: `같은 키가 두 파일에 있다(${source.file})`,
      });
    } else if (source?.kind === "typeScale") {
      if (typeof value === "number" && Math.round(source.base * typeScale) === value) {
        entries.push({
          key,
          module,
          path,
          group,
          type: "number",
          approved: source.base,
          editable: true,
          scaled: true,
        });
      } else {
        add({
          key,
          module,
          path,
          group,
          value,
          editable: false,
          reason: `소스 지도가 낡았다 — ${SOURCE_MAP_COMMAND}`,
        });
      }
    } else {
      add({ key, module, path, group, value, editable: true });
    }
  };

  for (const [module, exports] of Object.entries(modules)) {
    for (const [name, value] of Object.entries(exports)) {
      if (AGGREGATE_EXPORTS.has(name) || name === "__esModule") continue;
      const owner = exportOwner.get(name);
      if (owner && owner !== module) {
        add({
          key: `${module}:${name}`,
          module,
          path: [name],
          group: name,
          value,
          editable: false,
          reason: `같은 export 이름이 ${owner} 에도 있다`,
        });
        continue;
      }
      exportOwner.set(name, module);
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        walk(module, [name], value, Object.isFrozen(value));
      } else if (typeof value === "function") {
        add({
          key: name,
          module,
          path: [name],
          group: name,
          value,
          editable: false,
          reason: "함수다",
        });
      } else if (Array.isArray(value)) {
        add({
          key: name,
          module,
          path: [name],
          group: name,
          value,
          editable: false,
          reason: "배열이다",
        });
      } else {
        add({
          key: name,
          module,
          path: [name],
          group: name,
          value,
          editable: false,
          reason: "모듈 최상위 값이다 — ES 모듈 바인딩이라 밖에서 바꿀 수 없다",
        });
      }
    }
  }
  return { entries, byKey: new Map(entries.map((entry) => [entry.key, entry])), fonts, typeScale };
}

/** 시안 키를 정규 키로 — 묶음 경로(`color.primary.heavy` · `typography.title2.fontSize`)도 받는다 */
export function canonicalTokenKey(key: string, catalog: Pick<TokenCatalog, "byKey">): string {
  if (catalog.byKey.has(key)) return key;
  const [head, ...rest] = key.split(".");
  if (head && AGGREGATE_EXPORTS.has(head) && rest.length) {
    const stripped = rest.join(".");
    if (catalog.byKey.has(stripped)) return stripped;
    if (head === "typography" && catalog.byKey.has(`text.${stripped}`)) return `text.${stripped}`;
  }
  return key;
}

/** 값 검사 — 통과하면 null, 아니면 이유 */
export function tokenValueError(
  entry: TokenEntry,
  value: unknown,
  fonts: ReadonlySet<string>,
): string | null {
  if (!entry.editable) return entry.reason ?? "읽기 전용이다";
  switch (entry.type) {
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return "숫자가 필요하다";
      if (entry.scaled && (value <= 0 || value > 200)) return "기준 pt 는 0 초과 200 이하다";
      if (Math.abs(value) > 100000) return "값이 너무 크다";
      return null;
    case "color":
      return isColor(value) ? null : "#RGB · #RRGGBB · #RRGGBBAA · rgb() · rgba() 만 받는다";
    case "fontFamily":
      return typeof value === "string" && fonts.has(value)
        ? null
        : `앱이 로드하는 서체만 받는다(${[...fonts].join(", ")})`;
    case "string":
      return typeof value === "string" &&
        value.trim() &&
        !/[\r\n]/.test(value) &&
        value.length <= 200
        ? null
        : "한 줄 문자열(200자 이하)이 필요하다";
    default:
      return "편집할 수 없는 형식이다";
  }
}

/**
 * 묶음(export 이름)의 한국어 — 패널에 export 이름이 그대로 새어 나오지 않게 한다.
 * 여기 없는 묶음은 「기타」로 모인다(`groupLabel`). 새 ds export 가 생기면 한 줄을 더한다 —
 * `tokens.test.ts` 가 빠진 묶음을 잡는다.
 */
export const GROUP_LABELS: Readonly<Record<string, string>> = {
  background: "면",
  label: "글자색",
  primary: "브랜드 초록",
  secondary: "보조 노랑",
  status: "상태 색",
  interaction: "누를 때 색",
  fill: "채움",
  line: "선",
  overlay: "어둡게 덮는 막",
  grid: "모눈",
  social: "소셜 로그인",
  emotion: "감정 색",
  cardFrame: "카드 액자",
  retroRug: "회고 러그",
  splashLoader: "스플래시 로더",
  splashLoaderMotion: "스플래시 로더 움직임",
  chatChoiceSelected: "회고 선택지",
  pond: "감각연못 색",
  pondMotion: "감각연못 움직임",
  pondVeil: "감각연못 덮는 막",
  pondPanelVeil: "감각연못 판 덮는 막",
  pondSize: "감각연못 크기",
  pondLayout: "감각연못 배치",
  bodyRelease: "몸에 힘 빼기 색",
  bodyReleaseLayout: "몸에 힘 빼기 배치",
  bodyReleaseSize: "몸에 힘 빼기 크기",
  bodyReleaseRing: "몸에 힘 빼기 고리",
  bodyReleaseMotion: "몸에 힘 빼기 움직임",
  bodyReleaseFinish: "몸에 힘 빼기 마무리",
  worryBox: "걱정상자 색",
  worryBoxLayout: "걱정상자 배치",
  worryBoxSize: "걱정상자 크기",
  worryBoxMotion: "걱정상자 움직임",
  worryBoxFinish: "걱정상자 마무리",
  treasureBox: "보물함 색",
  treasureBoxLayout: "보물함 배치",
  treasureBoxSize: "보물함 크기",
  treasureBoxMotion: "보물함 움직임",
  treasureBoxFinish: "보물함 마무리",
  restMood: "기분 쪽지 색",
  restMoodSize: "기분 쪽지 크기",
  restMoodMotion: "기분 쪽지 움직임",
  restScene: "쉼터 장면 색",
  restSceneSize: "쉼터 장면 크기",
  restGuideSize: "쉼터 안내 카드 크기",
  restRecommendMotion: "쉼 추천 움직임",
  raisedShadow: "그림자 색",
  onboardingArt: "온보딩 그림",
  text: "글자 스타일",
  fontFamily: "글꼴",
  gothicFamily: "로그인 글꼴",
  gothic: "로그인 글자 스타일",
  space: "간격",
  cardPadding: "카드 여백",
  radius: "모서리",
  bubbleRadius: "말풍선 모서리",
  layout: "레이아웃",
  hairline: "가는 선",
  elevation: "그림자",
  raised: "번지지 않는 그림자",
  zIndex: "쌓임 순서",
  size: "크기",
  motion: "움직임",
  sheetMotion: "시트 움직임",
  cardRipple: "카드 물결",
  babaBlink: "바바 눈 깜빡임",
  homeV2: "홈 전용",
  diaryMemo: "일기 메모지",
  diaryPaper: "일기 종이",
  letterPaper: "편지 종이",
  myPaper: "마이 종이",
  notebook: "공책",
  reportPaper: "리포트 종이",
  retroDiary: "회고 일기",
  retroBubbleComparison: "회고 말풍선 비교",
};

/** 이름표가 없는 묶음이 모이는 자리 */
export const OTHER_GROUP = "__other";
export const OTHER_GROUP_LABEL = "기타";

/** 묶음 고르기에서 먼저 보이는 것 — 가장 자주 고치는 순서 */
export const PRIMARY_GROUPS: readonly string[] = [
  "label",
  "background",
  "primary",
  "status",
  "emotion",
  "space",
  "radius",
  "text",
  "homeV2",
];

/** 묶음 id — 이름표가 없으면 「기타」 */
export const groupOf = (entry: Pick<TokenEntry, "group">): string =>
  entry.group in GROUP_LABELS ? entry.group : OTHER_GROUP;

export const groupLabel = (id: string): string => GROUP_LABELS[id] ?? OTHER_GROUP_LABEL;

const LEAF_LABELS: Readonly<Record<string, string>> = {
  fontSize: "글씨 크기",
  lineHeight: "행간",
  letterSpacing: "자간",
  fontFamily: "글꼴",
  font: "글꼴",
  radius: "모서리",
  borderRadius: "모서리",
  paper: "종이",
  card: "카드 면",
  ink: "잉크",
  shadow: "그림자",
  shadowColor: "그림자 색",
  shadowOpacity: "그림자 농도",
  shadowRadius: "그림자 번짐",
  normal: "기본",
  strong: "강하게",
  heavy: "진하게",
  medium: "중간",
  light: "옅게",
  alternative: "흐리게",
  neutral: "중립",
  assistive: "보조",
  disabled: "비활성",
  elevated: "띄운 면",
  onFill: "색 면 위 글자",
  positive: "긍정",
  negative: "부정",
  cautionary: "주의",
  duration: "시간(ms)",
  delay: "기다림(ms)",
  width: "너비",
  height: "높이",
  size: "크기",
  gap: "간격",
  inset: "안쪽 여백",
  opacity: "투명도",
  tilt: "기울기",
  grid: "모눈",
  title: "제목",
  stroke: "선",
  regular: "보통",
  semibold: "조금 굵게",
  bold: "굵게",
  xs: "아주 작게",
  sm: "작게",
  md: "보통",
  lg: "크게",
  xl: "아주 크게",
};

/** 가운데 경로 조각의 한국어 — `homeV2.color.paper` 의 `color` 같은 것 */
const PART_LABELS: Readonly<Record<string, string>> = {
  ...LEAF_LABELS,
  color: "색",
  type: "글자",
  font: "글꼴",
  size: "크기",
  shadow: "그림자",
  layout: "배치",
  motion: "움직임",
};

/**
 * 「글자색 · 기본」 · 「홈 전용 · 색 · 종이」 — 사람이 읽는 이름. 키는 따로 작게 보인다.
 * 경로가 깊으면 잎 바로 위 조각까지 보인다(같은 묶음의 「글씨 크기」 여럿을 가르려고).
 */
export function tokenLabel(entry: Pick<TokenEntry, "path" | "group">): string {
  const group = GROUP_LABELS[entry.group] ?? OTHER_GROUP_LABEL;
  const leaf = entry.path[entry.path.length - 1] ?? "";
  const leafLabel = LEAF_LABELS[leaf] ?? leaf;
  if (entry.path.length === 1) return group;
  if (entry.path.length === 2) return `${group} · ${leafLabel}`;
  const parent = entry.path[entry.path.length - 2] ?? "";
  return `${group} · ${PART_LABELS[parent] ?? parent} · ${leafLabel}`;
}

/** 시안이 걸린 값 — 덮어쓴 값이 있으면 그것, 없으면 승인값 */
export function effectiveTokenValue(
  catalog: Pick<TokenCatalog, "byKey">,
  tokens: Readonly<Record<string, TokenValue>>,
  key: string,
): TokenValue | null {
  return tokens[key] ?? catalog.byKey.get(key)?.approved ?? null;
}
