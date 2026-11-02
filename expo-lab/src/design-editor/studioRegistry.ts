/**
 * Studio 속성 등록표 — 옛 Design Studio(`src/studio/registry.ts`)에서 옮겼다.
 * 다섯 View(홈·쉼터·보관함·마이·리포트)가 `src/design/studioApproved.json` 에서 읽는 47개 키와,
 * 각 키가 붙은 실제 RN `testID`. 화면 요소 선택은 testID 로 여기를 찾는다.
 */
import type { StudioDesignKey } from "../../../src/design/studioDesign";
import { isStudioAssetId } from "../../../src/design/studioAssets";

export type EditableProperty = {
  key: StudioDesignKey;
  label: string;
  kind: "color" | "number" | "asset" | "choice";
  min?: number;
  max?: number;
  step?: number;
  options?: readonly { value: string; label: string }[];
};

export type EditableComponent = {
  id: string;
  screenId: string;
  parentId?: string;
  testId: string;
  kind: "screen" | "section" | "card" | "text" | "image";
  label: string;
  properties: readonly EditableProperty[];
};

const color = (key: StudioDesignKey, label = "배경색"): EditableProperty => ({
  key,
  label,
  kind: "color",
});
const number = (
  key: StudioDesignKey,
  label: string,
  min: number,
  max: number,
  step = 1,
): EditableProperty => ({ key, label, kind: "number", min, max, step });
const asset = (key: StudioDesignKey, label = "이미지"): EditableProperty => ({
  key,
  label,
  kind: "asset",
});
const fonts = [{ value: "KyoboHandwriting2025lyb", label: "교보 손글씨" }] as const;
const alignments = [
  { value: "left", label: "왼쪽" },
  { value: "center", label: "가운데" },
  { value: "right", label: "오른쪽" },
] as const;
const choice = (
  key: StudioDesignKey,
  label: string,
  options: EditableProperty["options"],
): EditableProperty => ({ key, label, kind: "choice", options });

/** Every layer points to a real testID on the shared RN View. Only listed properties can be edited. */
export const editableComponents: readonly EditableComponent[] = [
  {
    id: "home.root",
    screenId: "home-main",
    testId: "home-v2-root",
    kind: "screen",
    label: "홈",
    properties: [],
  },
  {
    id: "home.hero",
    screenId: "home-main",
    parentId: "home.root",
    testId: "studio-home-hero",
    kind: "card",
    label: "히어로 카드",
    properties: [
      color("home.hero.backgroundColor"),
      number("home.hero.borderRadius", "모서리", 0, 40),
    ],
  },
  {
    id: "home.bubble",
    screenId: "home-main",
    parentId: "home.hero",
    testId: "studio-home-bubble",
    kind: "card",
    label: "말풍선",
    properties: [
      color("home.bubble.backgroundColor"),
      number("home.bubble.borderRadius", "모서리", 0, 40),
      number("home.bubble.paddingHorizontal", "가로 여백", 8, 32),
    ],
  },
  {
    id: "home.bubbleText",
    screenId: "home-main",
    parentId: "home.bubble",
    testId: "studio-home-bubble-text",
    kind: "text",
    label: "말풍선 문구",
    properties: [
      color("home.bubbleText.color", "글씨 색"),
      number("home.bubbleText.fontSize", "글씨 크기", 18, 34),
      choice("home.bubbleText.fontFamily", "글꼴", fonts),
      choice("home.bubbleText.textAlign", "정렬", alignments),
      number("home.bubbleText.letterSpacing", "글자 간격", -1, 4, 0.1),
    ],
  },
  {
    id: "home.cta",
    screenId: "home-main",
    parentId: "home.hero",
    testId: "studio-home-cta",
    kind: "card",
    label: "일기 작성하기 버튼",
    properties: [
      color("home.cta.backgroundColor"),
      number("home.cta.paddingHorizontal", "가로 여백", 12, 36),
    ],
  },
  {
    id: "home.baba",
    screenId: "home-main",
    parentId: "home.hero",
    testId: "studio-home-baba",
    kind: "image",
    label: "바바 캐릭터",
    properties: [],
  },
  {
    id: "home.weekDock",
    screenId: "home-main",
    parentId: "home.root",
    testId: "week-dock",
    kind: "section",
    label: "주간 도크",
    properties: [],
  },

  {
    id: "rest.root",
    screenId: "rest-hub",
    testId: "studio-rest-root",
    kind: "screen",
    label: "쉼터",
    properties: [],
  },
  {
    id: "rest.heading",
    screenId: "rest-hub",
    parentId: "rest.root",
    testId: "studio-rest-heading",
    kind: "text",
    label: "쉼터 제목",
    properties: [
      color("rest.heading.backgroundColor", "종이 색"),
      color("rest.heading.color", "글자 색"),
      number("rest.heading.fontSize", "글씨 크기", 22, 40),
    ],
  },
  {
    id: "rest.wishPaper",
    screenId: "rest-hub",
    parentId: "rest.root",
    testId: "studio-rest-wish-paper",
    kind: "card",
    label: "바람카드",
    properties: [
      color("rest.wishPaper.backgroundColor"),
      number("rest.wishPaper.paddingLeft", "왼쪽 여백", 8, 28),
    ],
  },
  {
    id: "rest.wishCopy",
    screenId: "rest-hub",
    parentId: "rest.wishPaper",
    testId: "studio-rest-wish-copy",
    kind: "section",
    label: "바람카드 문구 영역",
    properties: [],
  },
  {
    id: "rest.wishSummary",
    screenId: "rest-hub",
    parentId: "rest.wishCopy",
    testId: "studio-rest-wish-summary",
    kind: "text",
    label: "바람카드 문구",
    properties: [
      color("rest.wishSummary.color", "글씨 색"),
      number("rest.wishSummary.fontSize", "글씨 크기", 16, 30),
      choice("rest.wishSummary.fontFamily", "글꼴", fonts),
      choice("rest.wishSummary.textAlign", "정렬", alignments),
      number("rest.wishSummary.letterSpacing", "글자 간격", -1, 4, 0.1),
    ],
  },
  {
    id: "rest.wishPhoto",
    screenId: "rest-hub",
    parentId: "rest.wishPaper",
    testId: "studio-rest-wish-photo",
    kind: "section",
    label: "바바 사진",
    properties: [
      number("rest.wishPhoto.width", "사진 너비", 80, 130),
      number("rest.wishPhoto.rotation", "회전 각도", -15, 15),
    ],
  },
  {
    id: "rest.babaImage",
    screenId: "rest-hub",
    parentId: "rest.wishPhoto",
    testId: "studio-rest-baba-image",
    kind: "image",
    label: "바바 이미지",
    properties: [
      asset("rest.babaImage.assetId"),
      number("rest.babaImage.opacity", "투명도", 0.2, 1, 0.05),
    ],
  },
  {
    id: "rest.contents",
    screenId: "rest-hub",
    parentId: "rest.root",
    testId: "studio-rest-content-section",
    kind: "section",
    label: "쉼터 콘텐츠",
    properties: [],
  },

  {
    id: "archive.root",
    screenId: "archive",
    testId: "studio-archive-root",
    kind: "screen",
    label: "보관함",
    properties: [],
  },
  {
    id: "archive.title",
    screenId: "archive",
    parentId: "archive.root",
    testId: "studio-archive-title",
    kind: "section",
    label: "보관함 제목 종이",
    properties: [
      color("archive.titleWrap.backgroundColor", "종이 색"),
      number("archive.titleWrap.paddingHorizontal", "가로 여백", 8, 32),
      number("archive.title.fontSize", "글씨 크기", 24, 44),
    ],
  },
  {
    id: "archive.titleText",
    screenId: "archive",
    parentId: "archive.title",
    testId: "studio-archive-title-text",
    kind: "text",
    label: "보관함 제목 글씨",
    properties: [
      color("archive.titleText.color", "글씨 색"),
      choice("archive.titleText.fontFamily", "글꼴", fonts),
    ],
  },
  {
    id: "archive.calendar",
    screenId: "archive",
    parentId: "archive.root",
    testId: "studio-archive-calendar",
    kind: "section",
    label: "달력",
    properties: [
      color("archive.calendar.backgroundColor"),
      number("archive.calendar.borderRadius", "모서리", 0, 32),
    ],
  },

  {
    id: "my.root",
    screenId: "my-main",
    testId: "studio-my-root",
    kind: "screen",
    label: "마이",
    properties: [],
  },
  {
    id: "my.profileCard",
    screenId: "my-main",
    parentId: "my.root",
    testId: "my-profile-card",
    kind: "card",
    label: "프로필 카드",
    properties: [
      color("my.profileCard.backgroundColor"),
      number("my.profileCard.borderRadius", "모서리", 0, 32),
      number("my.profileCard.paddingHorizontal", "가로 여백", 8, 32),
      number("my.profileCard.shadowOpacity", "그림자 농도", 0, 0.4, 0.01),
    ],
  },
  {
    id: "my.nickname",
    screenId: "my-main",
    parentId: "my.profileCard",
    testId: "studio-my-nickname",
    kind: "text",
    label: "닉네임",
    properties: [
      color("my.nickname.color", "글씨 색"),
      choice("my.nickname.fontFamily", "글꼴", fonts),
    ],
  },
  {
    id: "my.baba",
    screenId: "my-main",
    parentId: "my.profileCard",
    testId: "studio-my-baba",
    kind: "image",
    label: "바바 캐릭터",
    properties: [],
  },

  {
    id: "report.root",
    screenId: "report",
    testId: "studio-report-root",
    kind: "screen",
    label: "리포트",
    properties: [],
  },
  {
    id: "report.weekTitle",
    screenId: "report",
    parentId: "report.root",
    testId: "studio-report-week-title",
    kind: "section",
    label: "주간 제목 종이",
    properties: [
      color("report.weekTitlePaper.backgroundColor", "종이 색"),
      number("report.weekTitlePaper.paddingHorizontal", "가로 여백", 8, 32),
      number("report.weekTitlePaper.borderRadius", "모서리", 0, 24),
      number("report.weekTitle.fontSize", "글씨 크기", 24, 40),
    ],
  },
  {
    id: "report.weekText",
    screenId: "report",
    parentId: "report.weekTitle",
    testId: "studio-report-week-text",
    kind: "text",
    label: "주간 제목 글씨",
    properties: [
      color("report.weekTitle.color", "글씨 색"),
      choice("report.weekTitle.fontFamily", "글꼴", fonts),
      number("report.weekTitle.letterSpacing", "글자 간격", -1, 4, 0.1),
    ],
  },
  {
    id: "report.summary",
    screenId: "report",
    parentId: "report.root",
    testId: "studio-report-summary",
    kind: "section",
    label: "요약",
    properties: [number("report.summary.minHeight", "최소 높이", 100, 200)],
  },
];

export const editableKeys = [
  ...editableComponents.flatMap((component) => component.properties),
  // 삭제한 제목 색은 이전에 저장·내보낸 시안을 계속 읽을 수 있도록 검증만 유지한다.
  color("my.title.backgroundColor"),
];

export function validValue(property: EditableProperty, value: unknown): boolean {
  if (property.kind === "asset") return isStudioAssetId(value);
  if (property.kind === "choice")
    return property.options?.some((item) => item.value === value) ?? false;
  if (property.kind === "color")
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= (property.min ?? 0) &&
    value <= (property.max ?? 0)
  );
}

const propertyByKey = new Map(editableKeys.map((property) => [property.key as string, property]));

/** Studio 속성 하나 — 등록되지 않은 키면 undefined */
export const findStudioProperty = (key: string) => propertyByKey.get(key);

/** testID → 등록 요소. 화면 요소 선택이 가장 가까운 testID 를 여기서 찾는다 */
export const componentByTestId: ReadonlyMap<string, EditableComponent> = new Map(
  editableComponents.map((component) => [component.testId, component]),
);

export function layerDepth(layer: EditableComponent): number {
  let depth = 0;
  let parentId = layer.parentId;
  while (parentId) {
    const parent = editableComponents.find((item) => item.id === parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}

/** Studio 화면 id ↔ 앱 라우트. 라우트 묶음 `(tabs)` 는 떼고 본다 */
export const STUDIO_SCREENS = [
  { id: "home-main", label: "홈", route: "/home" },
  { id: "rest-hub", label: "쉼터", route: "/rest" },
  { id: "archive", label: "보관함", route: "/archive" },
  { id: "my-main", label: "마이", route: "/my" },
  { id: "report", label: "리포트", route: "/report" },
] as const;

export function studioScreenForRoute(route: string): string | null {
  const normalized = `/${(route.split("?")[0] ?? "")
    .split("/")
    .filter((part) => part && !/^\(.*\)$/.test(part))
    .join("/")}`;
  return STUDIO_SCREENS.find((screen) => screen.route === normalized)?.id ?? null;
}
