import {
  approvedDesign,
  type StudioDesign,
  type StudioDesignKey,
} from "../../../src/design/studioDesign";

import { editableKeys, validValue } from "./registry";

export const STORAGE_KEY = "momentory-design-studio-v1";
const legacyKeys = [
  "home.hero.backgroundColor",
  "home.hero.borderRadius",
  "home.bubble.backgroundColor",
  "home.bubble.borderRadius",
  "home.bubble.paddingHorizontal",
  "rest.wishPaper.backgroundColor",
  "rest.wishPaper.paddingLeft",
  "archive.titleWrap.backgroundColor",
  "archive.titleWrap.paddingHorizontal",
  "archive.title.fontSize",
  "my.profileCard.backgroundColor",
  "my.profileCard.borderRadius",
  "my.profileCard.paddingHorizontal",
  "my.profileCard.shadowOpacity",
  "report.weekTitlePaper.backgroundColor",
  "report.weekTitlePaper.paddingHorizontal",
  "report.weekTitle.fontSize",
];
export type StudioDrafts = { active: string; drafts: Record<string, StudioDesign> };
export const initialDrafts = (): StudioDrafts => ({
  active: "Draft 1",
  drafts: { "Draft 1": { ...approvedDesign } },
});

export function parseDesign(value: unknown): StudioDesign {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("디자인 객체가 필요합니다.");
  const record = value as Record<string, unknown>;
  const keys = editableKeys.map((property) => property.key);
  if (
    Object.keys(record).length === legacyKeys.length &&
    Object.keys(record).every((key) => legacyKeys.includes(key))
  ) {
    // Version 2 drafts have no explicit schema version. Fill only the new approved defaults.
    return parseDesign({ ...approvedDesign, ...record });
  }
  if (
    Object.keys(record).length !== keys.length ||
    Object.keys(record).some((key) => !keys.includes(key as StudioDesignKey))
  ) {
    throw new Error("등록되지 않았거나 누락된 속성이 있습니다.");
  }
  for (const property of editableKeys) {
    if (!validValue(property, record[property.key]))
      throw new Error(`${property.key}: 허용되지 않는 값입니다.`);
  }
  return record as StudioDesign;
}

export function parseDrafts(value: unknown): StudioDrafts {
  if (typeof value !== "object" || value === null)
    throw new Error("저장 데이터가 올바르지 않습니다.");
  const record = value as Record<string, unknown>;
  if (
    typeof record.active !== "string" ||
    typeof record.drafts !== "object" ||
    record.drafts === null
  )
    throw new Error("저장 데이터가 올바르지 않습니다.");
  const entries = Object.entries(record.drafts);
  if (
    entries.length === 0 ||
    entries.length > 20 ||
    !entries.some(([name]) => name === record.active)
  )
    throw new Error("시안 목록이 올바르지 않습니다.");
  const drafts: Record<string, StudioDesign> = {};
  for (const [name, design] of entries) {
    if (!name.trim() || name.length > 40) throw new Error("시안 이름이 올바르지 않습니다.");
    drafts[name] = parseDesign(design);
  }
  return { active: record.active, drafts };
}

export function exportDraft(name: string, design: StudioDesign) {
  return JSON.stringify({ version: 1, name, design }, null, 2) + "\n";
}

export function importDraft(json: string): { name: string; design: StudioDesign } {
  const value: unknown = JSON.parse(json);
  if (typeof value !== "object" || value === null)
    throw new Error("JSON 형식이 올바르지 않습니다.");
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.name !== "string")
    throw new Error("지원하지 않는 파일 형식입니다.");
  return { name: record.name, design: parseDesign(record.design) };
}

export function designDiff(design: StudioDesign) {
  return editableKeys
    .filter((property) => design[property.key] !== approvedDesign[property.key])
    .map((property) => ({
      ...property,
      before: approvedDesign[property.key],
      after: design[property.key],
    }));
}
