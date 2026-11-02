/**
 * 「AI에게 넘기기」 — 시안을 사람이 명령으로 옮기지 않고 AI(Claude Code · Codex)에게 맡기는 파일.
 * 형식 `momentory-lab-handoff@1` 의 정본은 `expo-lab/HANDOFF.md` 다 — 여기는 그 모양을 만든다.
 *
 * 메모는 시안(`DesignDraft`) 타입을 바꾸지 않고 시안마다 따로 둔다:
 * `localStorage["momentory.lab.draftNotes:<draftId>"]` = `{ request, notes: {route: 메모}, visited: [route] }`.
 */
import type { DesignDraft } from "../lab-contract";
import { findStudioProperty } from "./studioRegistry";
import { approvedTabBackgroundFor, tabBackgroundLabel } from "./tabBackgrounds";
import { tokenLabel, type TokenCatalog, type TokenValue } from "./tokens";

export const HANDOFF_FORMAT = "momentory-lab-handoff@1";
export const DRAFT_NOTES_PREFIX = "momentory.lab.draftNotes:";
/** 받은 파일을 AI에게 줄 때 쓰는 문장 — 패널이 복사 버튼으로 건넨다 */
export const HANDOFF_PROMPT = "이 Lab 시안 반영해줘";

export type HandoffReference = {
  name: string;
  dataUrl: string;
  align: { scale: number; offsetX: number; offsetY: number };
};

export type HandoffChange = {
  key: string;
  label: string;
  before: TokenValue | null;
  after: TokenValue;
};

export type LabHandoff = {
  format: typeof HANDOFF_FORMAT;
  createdAt: string;
  draft: { id: string; name: string };
  request: string;
  tokens: HandoffChange[];
  studio: HandoffChange[];
  screens: { route: string; note?: string; reference?: HandoffReference }[];
  lab: { platform: string; deviceId: string; datasetId: string };
};

export type DraftNotes = {
  /** 시안 전체에 대한 메모 — 값으로 못 맞춘 차이 · 의도 */
  request: string;
  /** 화면별 짧은 메모 */
  notes: Record<string, string>;
  /** 시안을 건 채로 지나간 화면 */
  visited: string[];
};

export const emptyNotes = (): DraftNotes => ({ request: "", notes: {}, visited: [] });

/** 라우트를 같은 모양으로 — 쿼리 · `(tabs)` 같은 묶음 조각을 뗀다 */
export const normalizeRoute = (route: string) =>
  `/${(route.split("?")[0] ?? "")
    .split("/")
    .filter((part) => part && !/^\(.*\)$/.test(part))
    .join("/")}`;

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readNotes(store: KeyValueStore | null, draftId: string): DraftNotes {
  try {
    const raw = store?.getItem(`${DRAFT_NOTES_PREFIX}${draftId}`);
    if (!raw) return emptyNotes();
    const parsed = JSON.parse(raw) as Partial<DraftNotes>;
    return {
      request: typeof parsed.request === "string" ? parsed.request : "",
      notes:
        parsed.notes && typeof parsed.notes === "object"
          ? Object.fromEntries(
              Object.entries(parsed.notes).filter(([, value]) => typeof value === "string"),
            )
          : {},
      visited: Array.isArray(parsed.visited)
        ? parsed.visited.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return emptyNotes();
  }
}

export function writeNotes(store: KeyValueStore | null, draftId: string, notes: DraftNotes) {
  try {
    store?.setItem(`${DRAFT_NOTES_PREFIX}${draftId}`, JSON.stringify(notes));
  } catch {
    // 저장소가 가득 찼거나 막혔다 — 메모는 이 창 안에서만 남는다
  }
}

export function dropNotes(store: KeyValueStore | null, draftId: string) {
  try {
    store?.removeItem(`${DRAFT_NOTES_PREFIX}${draftId}`);
  } catch {
    // 지울 수 없으면 그대로 둔다
  }
}

/** 한국 시각(+09:00) — 파일 이름과 `createdAt` 이 같은 시계를 쓴다 */
function kst(now: Date) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return {
    iso: `${shifted.slice(0, 19)}+09:00`,
    stamp: `${shifted.slice(0, 4)}${shifted.slice(5, 7)}${shifted.slice(8, 10)}-${shifted.slice(11, 13)}${shifted.slice(14, 16)}`,
  };
}

export const draftSlug = (name: string) =>
  name
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "draft";

export const handoffFileName = (name: string, now: Date) =>
  `momentory-handoff-${draftSlug(name)}-${kst(now).stamp}.json`;

/** 넘길 화면 — 메모가 있거나 시안을 건 채로 본 화면. 본 순서대로 */
export function handoffRoutes(notes: DraftNotes): string[] {
  const routes = [...notes.visited];
  for (const [route, note] of Object.entries(notes.notes))
    if (note.trim() && !routes.includes(route)) routes.push(route);
  return routes;
}

export async function buildHandoff({
  draft,
  notes,
  catalog,
  approvedStudio,
  lab,
  now = new Date(),
  getReferences,
}: {
  draft: DesignDraft;
  notes: DraftNotes;
  catalog: Pick<TokenCatalog, "byKey">;
  approvedStudio: Readonly<Record<string, string | number>>;
  lab: LabHandoff["lab"];
  now?: Date;
  /** 참고 시안 이미지 — 통합 전에는 없다(`expo-lab/src/reference/`) */
  getReferences?: (route: string) => Promise<HandoffReference | null>;
}): Promise<LabHandoff> {
  const tokens = Object.entries(draft.tokens)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, after]) => {
      const entry = catalog.byKey.get(key);
      return {
        key,
        label: entry ? tokenLabel(entry) : key,
        before: entry?.approved ?? null,
        after,
      };
    });
  const studio = Object.entries(draft.studio)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, after]) => ({
      key,
      // 탭 배경(`tabBackground.<탭>`)도 여기 실린다 — 「쉼터 탭 배경」 · 배경 id 전후
      label: findStudioProperty(key)?.label ?? tabBackgroundLabel(key) ?? key,
      before: approvedStudio[key] ?? approvedTabBackgroundFor(key) ?? null,
      after,
    }));
  const screens: LabHandoff["screens"] = [];
  for (const route of handoffRoutes(notes)) {
    const screen: LabHandoff["screens"][number] = { route };
    const note = notes.notes[route]?.trim();
    if (note) screen.note = note;
    const reference = getReferences ? await getReferences(route).catch(() => null) : null;
    if (reference) screen.reference = reference;
    screens.push(screen);
  }
  return {
    format: HANDOFF_FORMAT,
    createdAt: kst(now).iso,
    draft: { id: draft.id, name: draft.name },
    request: notes.request.trim(),
    tokens,
    studio,
    screens,
    lab,
  };
}

/** 셸 주소(`#/screens?…`)에서 기기 · 데이터를 읽는다 — 셸이 넘겨주지 않을 때의 대안 */
export function labFromHash(hash: string): LabHandoff["lab"] {
  const query = new URLSearchParams(hash.split("?")[1] ?? "");
  return {
    platform: query.get("platform") ?? "ios",
    deviceId: query.get("device") ?? (query.get("platform") === "android" ? "" : "iphone-16"),
    datasetId: query.get("dataset") ?? "normal",
  };
}
