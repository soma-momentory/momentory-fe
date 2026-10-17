import type { StudioDesignKey } from "../../../src/design/studioDesign";

export type EditableProperty = {
  key: StudioDesignKey;
  label: string;
  kind: "color" | "number";
  min?: number;
  max?: number;
  step?: number;
};

export type EditableComponent = {
  id: string;
  screenId: string;
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

export const editableComponents: readonly EditableComponent[] = [
  {
    id: "home.hero",
    screenId: "home-main",
    label: "홈 히어로 카드",
    properties: [
      color("home.hero.backgroundColor"),
      number("home.hero.borderRadius", "모서리", 0, 40),
    ],
  },
  {
    id: "home.bubble",
    screenId: "home-main",
    label: "홈 말풍선",
    properties: [
      color("home.bubble.backgroundColor"),
      number("home.bubble.borderRadius", "모서리", 0, 40),
      number("home.bubble.paddingHorizontal", "가로 여백", 8, 32),
    ],
  },
  {
    id: "rest.wishPaper",
    screenId: "rest-hub",
    label: "쉼터 바람카드",
    properties: [
      color("rest.wishPaper.backgroundColor"),
      number("rest.wishPaper.paddingLeft", "왼쪽 여백", 8, 28),
    ],
  },
  {
    id: "archive.title",
    screenId: "archive",
    label: "보관함 제목",
    properties: [
      color("archive.titleWrap.backgroundColor", "종이 색"),
      number("archive.titleWrap.paddingHorizontal", "가로 여백", 8, 32),
      number("archive.title.fontSize", "글씨 크기", 24, 44),
    ],
  },
  {
    id: "my.profileCard",
    screenId: "my-main",
    label: "마이 프로필 카드",
    properties: [
      color("my.profileCard.backgroundColor"),
      number("my.profileCard.borderRadius", "모서리", 0, 32),
      number("my.profileCard.paddingHorizontal", "가로 여백", 8, 32),
      number("my.profileCard.shadowOpacity", "그림자 농도", 0, 0.4, 0.01),
    ],
  },
  {
    id: "report.weekTitle",
    screenId: "report",
    label: "리포트 주간 제목",
    properties: [
      color("report.weekTitlePaper.backgroundColor", "종이 색"),
      number("report.weekTitlePaper.paddingHorizontal", "가로 여백", 8, 32),
      number("report.weekTitle.fontSize", "글씨 크기", 24, 40),
    ],
  },
];

export const editableKeys = editableComponents.flatMap((component) => component.properties);

export function validValue(property: EditableProperty, value: unknown): boolean {
  if (property.kind === "color")
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= (property.min ?? 0) &&
    value <= (property.max ?? 0)
  );
}
