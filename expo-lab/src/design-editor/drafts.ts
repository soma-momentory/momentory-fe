/**
 * 디자인 시안 저장소 — `DESIGN_DRAFTS_STORAGE_KEY` 의 `DesignDraft[]`. 셸 · 편집기 · 프레임이 같이 읽는다.
 *
 * 시안은 **승인본과 다른 값만** 든다(`tokens` · `studio` 둘 다 덮어쓰기 목록). 그래서 승인본이 바뀌어도
 * 시안이 건드리지 않은 값은 새 승인본을 따른다.
 */
import { DESIGN_DRAFTS_STORAGE_KEY, type DesignDraft } from "../lab-contract";

export type DraftContent = Pick<DesignDraft, "tokens" | "studio">;
export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const MAX_DRAFTS = 30;
export const MAX_NAME_LENGTH = 40;
/** 옛 Design Studio 2.0/3.0 의 저장 키 — 새 저장소가 비어 있을 때 한 번 옮겨 온다 */
export const LEGACY_STUDIO_STORAGE_KEY = "momentory-design-studio-v1";
export const EXPORT_KIND = "momentory-design-draft";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const valueMap = (value: unknown): Record<string, string | number> | null => {
  if (!isRecord(value)) return null;
  const out: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" || (typeof item === "number" && Number.isFinite(item)))
      out[key] = item;
    else return null;
  }
  return out;
};

export function parseStoredDraft(value: unknown): DesignDraft | null {
  if (!isRecord(value)) return null;
  const tokens = valueMap(value.tokens ?? {});
  const studio = valueMap(value.studio ?? {});
  if (
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    !tokens ||
    !studio
  )
    return null;
  return {
    id: value.id,
    name: value.name,
    tokens,
    studio,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString(),
  };
}

/** 읽기 — 깨진 항목은 버리고 나머지를 돌려준다. 저장소가 없으면 빈 목록 */
export function readDrafts(storage: Pick<Storage, "getItem"> | null | undefined): DesignDraft[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(DESIGN_DRAFTS_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    const ids = new Set<string>();
    return parsed.flatMap((item) => {
      const draft = parseStoredDraft(item);
      if (!draft || ids.has(draft.id)) return [];
      ids.add(draft.id);
      return [draft];
    });
  } catch {
    return [];
  }
}

export function writeDrafts(storage: KeyValueStorage | null | undefined, drafts: DesignDraft[]) {
  storage?.setItem(DESIGN_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

export const findDraft = (drafts: readonly DesignDraft[], id: string | null | undefined) =>
  id ? (drafts.find((draft) => draft.id === id) ?? null) : null;

let counter = 0;
export function newDraftId(now = Date.now()): string {
  counter = (counter + 1) % 1296;
  return `draft-${now.toString(36)}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 이름 검사 — 통과하면 null */
export function draftNameError(
  drafts: readonly DesignDraft[],
  name: string,
  exceptId?: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_NAME_LENGTH) return `이름은 1–${MAX_NAME_LENGTH}자다`;
  if (drafts.some((draft) => draft.id !== exceptId && draft.name === trimmed))
    return "같은 이름의 시안이 있다";
  return null;
}

/** 겹치지 않는 이름 — 「시안 1」 · 「홈 색 연구 사본 2」 */
export function uniqueDraftName(drafts: readonly DesignDraft[], base: string): string {
  const names = new Set(drafts.map((draft) => draft.name));
  const stem = base.trim().slice(0, MAX_NAME_LENGTH - 3) || "시안";
  if (!names.has(stem)) return stem;
  for (let i = 2; ; i++) if (!names.has(`${stem} ${i}`)) return `${stem} ${i}`;
}

export function createDraft(
  drafts: readonly DesignDraft[],
  name: string,
  content: DraftContent = { tokens: {}, studio: {} },
  now = new Date(),
): { drafts: DesignDraft[]; draft: DesignDraft } {
  if (drafts.length >= MAX_DRAFTS) throw new Error(`시안은 ${MAX_DRAFTS}개까지다`);
  const error = draftNameError(drafts, name);
  if (error) throw new Error(error);
  const draft: DesignDraft = {
    id: newDraftId(now.getTime()),
    name: name.trim(),
    tokens: { ...content.tokens },
    studio: { ...content.studio },
    updatedAt: now.toISOString(),
  };
  return { drafts: [...drafts, draft], draft };
}

export function duplicateDraft(drafts: readonly DesignDraft[], id: string, now = new Date()) {
  const source = findDraft(drafts, id);
  if (!source) throw new Error("시안을 찾지 못했다");
  return createDraft(drafts, uniqueDraftName(drafts, `${source.name} 사본`), source, now);
}

export function renameDraft(
  drafts: readonly DesignDraft[],
  id: string,
  name: string,
  now = new Date(),
): DesignDraft[] {
  const error = draftNameError(drafts, name, id);
  if (error) throw new Error(error);
  return drafts.map((draft) =>
    draft.id === id ? { ...draft, name: name.trim(), updatedAt: now.toISOString() } : draft,
  );
}

export const deleteDraft = (drafts: readonly DesignDraft[], id: string): DesignDraft[] =>
  drafts.filter((draft) => draft.id !== id);

export function updateDraftContent(
  drafts: readonly DesignDraft[],
  id: string,
  content: DraftContent,
  now = new Date(),
): DesignDraft[] {
  return drafts.map((draft) =>
    draft.id === id
      ? {
          ...draft,
          tokens: { ...content.tokens },
          studio: { ...content.studio },
          updatedAt: now.toISOString(),
        }
      : draft,
  );
}

/** 덮어쓰기 하나를 넣거나(승인값과 같으면) 뺀다 */
export function setOverride(
  map: Readonly<Record<string, string | number>>,
  key: string,
  value: string | number,
  approved: string | number | null | undefined,
): Record<string, string | number> {
  const next = { ...map };
  if (value === approved) delete next[key];
  else next[key] = value;
  return next;
}

export type DraftExport = {
  version: 2;
  kind: typeof EXPORT_KIND;
  name: string;
  tokens: Record<string, string | number>;
  studio: Record<string, string | number>;
  exportedAt: string;
};

export function exportDraftJson(draft: DesignDraft, now = new Date()): string {
  const file: DraftExport = {
    version: 2,
    kind: EXPORT_KIND,
    name: draft.name,
    tokens: sortKeys(draft.tokens),
    studio: sortKeys(draft.studio),
    exportedAt: now.toISOString(),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

const sortKeys = (map: Record<string, string | number>) =>
  Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));

export type ImportValidators = {
  /** 토큰 키·값 검사 — 정규 키를 돌려주거나 이유를 던진다 */
  token: (key: string, value: unknown) => string;
  /** Studio 키·값 검사 — 통과하면 null */
  studio: (key: string, value: unknown) => string | null;
  /** v1(옛 Studio) 파일의 승인값 — 같은 값은 덮어쓰기에서 뺀다 */
  studioApproved: Readonly<Record<string, string | number>>;
};

/**
 * 가져오기 — v2(이 편집기) 와 v1(옛 Design Studio 의 `{ version: 1, name, design }`) 둘 다 받는다.
 * 하나라도 틀리면 통째로 거부한다(무엇이 틀렸는지 첫 키를 말한다).
 */
export function parseDraftExport(
  json: string,
  validators: ImportValidators,
): {
  name: string;
  content: DraftContent;
} {
  let value: unknown;
  try {
    value = JSON.parse(json.replace(/^﻿/, ""));
  } catch {
    throw new Error("JSON 형식이 아니다");
  }
  if (!isRecord(value) || typeof value.name !== "string")
    throw new Error("시안 파일이 아니다(name 이 없다)");
  if (value.version === 1) {
    const design = valueMap(value.design);
    if (!design) throw new Error("옛 Studio 파일의 design 이 올바르지 않다");
    const studio: Record<string, string | number> = {};
    for (const [key, item] of Object.entries(design)) {
      const error = validators.studio(key, item);
      if (error) throw new Error(`${key}: ${error}`);
      if (validators.studioApproved[key] !== item) studio[key] = item;
    }
    return { name: value.name, content: { tokens: {}, studio } };
  }
  if (value.version !== 2) throw new Error("지원하지 않는 시안 파일 버전이다");
  const tokensIn = valueMap(value.tokens ?? {});
  const studioIn = valueMap(value.studio ?? {});
  if (!tokensIn || !studioIn) throw new Error("tokens · studio 는 문자열·숫자 값의 객체다");
  const tokens: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(tokensIn)) {
    try {
      tokens[validators.token(key, item)] = item;
    } catch (error) {
      throw new Error(`${key}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  for (const [key, item] of Object.entries(studioIn)) {
    const error = validators.studio(key, item);
    if (error) throw new Error(`${key}: ${error}`);
  }
  return { name: value.name, content: { tokens, studio: studioIn } };
}

/**
 * 옛 Design Studio 시안(`{ active, drafts: { 이름: 전체 디자인 } }`)을 새 저장소로 한 번 옮긴다.
 * 새 저장소에 무엇이든 있으면 손대지 않는다. 옮긴 수를 돌려준다.
 */
export function migrateLegacyStudioDrafts(
  storage: KeyValueStorage | null | undefined,
  studioApproved: Readonly<Record<string, string | number>>,
  validStudio: (key: string, value: unknown) => boolean,
  now = new Date(),
): number {
  if (!storage || storage.getItem(DESIGN_DRAFTS_STORAGE_KEY) !== null) return 0;
  let legacy: unknown;
  try {
    legacy = JSON.parse(storage.getItem(LEGACY_STUDIO_STORAGE_KEY) ?? "null");
  } catch {
    return 0;
  }
  if (!isRecord(legacy) || !isRecord(legacy.drafts)) return 0;
  let drafts: DesignDraft[] = [];
  for (const [name, design] of Object.entries(legacy.drafts)) {
    const values = valueMap(design);
    if (!values || draftNameError(drafts, name) || drafts.length >= MAX_DRAFTS) continue;
    const studio: Record<string, string | number> = {};
    for (const [key, item] of Object.entries(values))
      if (validStudio(key, item) && studioApproved[key] !== item) studio[key] = item;
    drafts = createDraft(drafts, name, { tokens: {}, studio }, now).drafts;
  }
  if (drafts.length) writeDrafts(storage, drafts);
  return drafts.length;
}
