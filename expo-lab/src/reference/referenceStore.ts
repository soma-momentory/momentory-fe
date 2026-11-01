/**
 * 참고 시안 저장소 — 이미지(Blob)는 IndexedDB, 화면 상태(보이기 · 고른 시안)는 localStorage.
 *
 * 한 창 안에서는 셸 · 패널 · 오버레이가 같은 저장소 하나(`getReferenceStore()`)를 구독하고,
 * 다른 탭 · 프레임(iframe)과는 BroadcastChannel 로 「바뀌었다」만 알린다 — 받은 쪽은 IndexedDB 에서
 * 다시 읽는다. 저장 장치 · 알림 통로 · object URL · 이미지 재기는 전부 주입할 수 있다(jest 는
 * `createMemoryBackend` · `createMemoryChannelHub`).
 *
 * 쓰기는 **낙관적**이다: 고친 값은 곧바로 스냅샷에 들어가고(슬라이더가 끊기지 않게) 저장은 뒤에서
 * id 마다 줄을 세워 한다. 다른 곳에 알리는 것은 저장이 끝난 뒤다.
 */
import type { LabPlatform } from "../lab-contract";
import { matchRoute, normalizeRoute } from "./routeMatch";
import {
  DEFAULT_ALIGN,
  DEFAULT_VIEW,
  REFERENCE_IMAGE_TYPES,
  type Reference,
  type ReferencePatch,
  type ReferenceScope,
} from "./types";

// ── 저장 장치 ─────────────────────────────────────────────────────────

export type ReferenceBackend = {
  /** 영구 저장인가 — false 면 새로고침하면 사라진다(패널이 알린다) */
  readonly persistent: boolean;
  getAll(): Promise<Reference[]>;
  put(reference: Reference): Promise<void>;
  remove(id: string): Promise<void>;
};

export function createMemoryBackend(initial: readonly Reference[] = []): ReferenceBackend {
  const rows = new Map(initial.map((reference) => [reference.id, reference]));
  return {
    persistent: false,
    getAll: async () => [...rows.values()],
    put: async (reference) => {
      rows.set(reference.id, reference);
    },
    remove: async (id) => {
      rows.delete(id);
    },
  };
}

export const REFERENCE_DB_NAME = "momentory-lab-references";
const OBJECT_STORE = "references";

const request = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export function createIndexedDbBackend(
  factory: IDBFactory = indexedDB,
  dbName = REFERENCE_DB_NAME,
): ReferenceBackend {
  let db: Promise<IDBDatabase> | null = null;
  const open = () => {
    db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const req = factory.open(dbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(OBJECT_STORE)) {
          req.result.createObjectStore(OBJECT_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error("IndexedDB 가 다른 탭에 막혀 있어요"));
    });
    db.catch(() => {
      db = null;
    });
    return db;
  };
  const tx = async (mode: IDBTransactionMode) =>
    (await open()).transaction(OBJECT_STORE, mode).objectStore(OBJECT_STORE);
  return {
    persistent: true,
    getAll: async () => (await request((await tx("readonly")).getAll())) as Reference[],
    put: async (reference) => {
      await request((await tx("readwrite")).put(reference));
    },
    remove: async (id) => {
      await request((await tx("readwrite")).delete(id));
    },
  };
}

// ── 알림 통로 ─────────────────────────────────────────────────────────

export type ReferenceMessage = { type: "references" } | { type: "ui" };

export type ReferenceChannel = {
  post(message: ReferenceMessage): void;
  listen(handler: (message: ReferenceMessage) => void): () => void;
  close(): void;
};

export const REFERENCE_CHANNEL_NAME = "momentory.lab.references";

export function createBroadcastReferenceChannel(
  name = REFERENCE_CHANNEL_NAME,
): ReferenceChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(name);
  return {
    post: (message) => channel.postMessage(message),
    listen: (handler) => {
      const onMessage = (event: MessageEvent) => {
        const data = event.data as ReferenceMessage | undefined;
        if (data && (data.type === "references" || data.type === "ui")) handler(data);
      };
      channel.addEventListener("message", onMessage);
      return () => channel.removeEventListener("message", onMessage);
    },
    close: () => channel.close(),
  };
}

/** 테스트용 — BroadcastChannel 처럼 **보낸 쪽을 뺀** 나머지에게 전한다 */
export function createMemoryChannelHub() {
  const members = new Set<(message: ReferenceMessage) => void>();
  return {
    channel(): ReferenceChannel {
      const own = new Set<(message: ReferenceMessage) => void>();
      return {
        post: (message) => {
          for (const member of members) if (!own.has(member)) member(message);
        },
        listen: (handler) => {
          own.add(handler);
          members.add(handler);
          return () => {
            own.delete(handler);
            members.delete(handler);
          };
        },
        close: () => {
          for (const handler of own) members.delete(handler);
          own.clear();
        },
      };
    },
  };
}

// ── 화면 상태(보이기 · 고른 시안) ─────────────────────────────────────

export type ReferenceUiState = {
  /** 오버레이를 보이는가 — 셸의 `R` 단축키 · 패널의 「보이기/숨기기」 */
  visible: boolean;
  /** 화면(정규화한 라우트 패턴)마다 고른 시안 id */
  selected: Readonly<Record<string, string>>;
};

export const REFERENCE_UI_STORAGE_KEY = "momentory.lab.referenceUi";
const DEFAULT_UI: ReferenceUiState = { visible: true, selected: {} };

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

const readUi = (storage: KeyValueStorage | null): ReferenceUiState => {
  try {
    const raw = storage?.getItem(REFERENCE_UI_STORAGE_KEY);
    if (!raw) return DEFAULT_UI;
    const parsed = JSON.parse(raw) as Partial<ReferenceUiState>;
    return {
      visible: parsed.visible !== false,
      selected:
        parsed.selected && typeof parsed.selected === "object" ? { ...parsed.selected } : {},
    };
  } catch {
    return DEFAULT_UI;
  }
};

// ── 범위 ──────────────────────────────────────────────────────────────

/** 이 시안이 이 프레임(화면 · 시안 · 플랫폼 · 기기)에 보이는가. 범위에 없는 항목은 거르지 않는다 */
export function referenceApplies(
  reference: Pick<Reference, "route" | "draftId" | "platform" | "deviceId">,
  scope: Partial<ReferenceScope>,
): boolean {
  if (scope.route !== undefined && !matchRoute(reference.route, scope.route)) return false;
  if (scope.draftId !== undefined && reference.draftId !== null) {
    if (reference.draftId !== scope.draftId) return false;
  }
  if (scope.platform != null && reference.platform !== null) {
    if (reference.platform !== scope.platform) return false;
  }
  if (scope.deviceId != null && reference.deviceId !== null) {
    if (reference.deviceId !== scope.deviceId) return false;
  }
  return true;
}

/** 새것이 먼저 */
const byNewest = (a: Reference, b: Reference) =>
  b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : a.id < b.id ? 1 : -1;

export const filterReferences = (
  references: readonly Reference[],
  scope: Partial<ReferenceScope>,
): Reference[] => references.filter((reference) => referenceApplies(reference, scope));

/** 고른 시안 상태의 열쇠 — 패턴이든 실제 주소든 정규화한 것 */
export const selectionKey = (route: string) => normalizeRoute(route);

// ── 저장소 ────────────────────────────────────────────────────────────

export type SaveReferenceMeta = {
  route: string;
  platform?: LabPlatform | null;
  deviceId?: string | null;
  draftId?: string | null;
  name?: string;
  /** 알면 넘긴다(테스트) — 없으면 이미지를 열어 잰다 */
  naturalWidth?: number;
  naturalHeight?: number;
};

export type ReferenceSnapshot = {
  /** 처음 읽기가 끝났는가 */
  loaded: boolean;
  /** 새로고침해도 남는가 — IndexedDB 를 못 열면 false */
  persistent: boolean;
  /** 새것이 먼저 */
  references: readonly Reference[];
  ui: ReferenceUiState;
};

export type ReferenceStoreOptions = {
  backend: ReferenceBackend;
  channel?: ReferenceChannel | null;
  urls?: { create(blob: Blob): string; revoke(url: string): void } | null;
  measure?: (blob: Blob) => Promise<{ width: number; height: number }>;
  uiStorage?: KeyValueStorage | null;
  now?: () => Date;
  makeId?: () => string;
  /** IndexedDB 를 못 열었을 때 갈아탈 곳 — 기본은 메모리 */
  fallbackBackend?: () => ReferenceBackend;
};

export type ReferenceStore = ReturnType<typeof createReferenceStore>;

export class ReferenceImageError extends Error {}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round2 = (value: number) => Math.round(value * 100) / 100;

async function measureImage(blob: Blob): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(blob);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => reject(new ReferenceImageError("이미지를 열지 못했어요"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const defaultUrls =
  typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
    ? {
        create: (blob: Blob) => URL.createObjectURL(blob),
        revoke: (url: string) => URL.revokeObjectURL(url),
      }
    : null;

const stripExtension = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

export function createReferenceStore(options: ReferenceStoreOptions) {
  let backend = options.backend;
  const channel = options.channel ?? null;
  const urls = options.urls === undefined ? defaultUrls : options.urls;
  const measure = options.measure ?? measureImage;
  const uiStorage = options.uiStorage ?? null;
  const now = options.now ?? (() => new Date());
  const makeId =
    options.makeId ??
    (() => `ref-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  let snapshot: ReferenceSnapshot = {
    loaded: false,
    persistent: backend.persistent,
    references: [],
    ui: readUi(uiStorage),
  };
  const listeners = new Set<() => void>();
  const urlCache = new Map<string, string>();
  const writes = new Map<string, Promise<void>>();
  let loading: Promise<void> | null = null;

  const emit = (next: Partial<ReferenceSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of [...listeners]) listener();
  };

  const forgetUrl = (id: string) => {
    const url = urlCache.get(id);
    if (url && urls) urls.revoke(url);
    urlCache.delete(id);
  };

  const replaceAll = (rows: Reference[]) => {
    const ids = new Set(rows.map((row) => row.id));
    for (const id of [...urlCache.keys()]) if (!ids.has(id)) forgetUrl(id);
    emit({ loaded: true, persistent: backend.persistent, references: [...rows].sort(byNewest) });
  };

  const load = async () => {
    let rows: Reference[];
    try {
      rows = await backend.getAll();
    } catch {
      // 사생활 보호 창 등 IndexedDB 를 못 여는 브라우저 — 메모리로 갈아타고 그렇다고 알린다
      backend = options.fallbackBackend?.() ?? createMemoryBackend(snapshot.references);
      rows = await backend.getAll();
    }
    replaceAll(rows);
  };

  const ready = () => {
    loading ??= load();
    return loading;
  };

  /** 같은 id 의 저장은 차례로 — 마지막 값이 이긴다 */
  const persist = (id: string, work: () => Promise<void>) => {
    const previous = writes.get(id) ?? Promise.resolve();
    const next = previous.then(work, work).then(
      () => channel?.post({ type: "references" }),
      () => undefined,
    );
    writes.set(id, next);
    void next.finally(() => {
      if (writes.get(id) === next) writes.delete(id);
    });
    return next;
  };

  const setUi = (ui: ReferenceUiState) => {
    try {
      uiStorage?.setItem(REFERENCE_UI_STORAGE_KEY, JSON.stringify(ui));
    } catch {
      // 저장소가 가득 차도 이 창에서는 계속 쓴다
    }
    emit({ ui });
    channel?.post({ type: "ui" });
  };

  const unlisten = channel?.listen((message) => {
    if (message.type === "ui") {
      emit({ ui: readUi(uiStorage) });
      return;
    }
    // 다른 탭 · 프레임이 바꿨다 — 다시 읽는다(이 창의 쓰기가 아직 줄에 있으면 끝난 뒤에)
    loading = Promise.all([...writes.values()]).then(load);
  });

  const find = (id: string) => snapshot.references.find((reference) => reference.id === id);

  return {
    ready,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      void ready();
      return () => {
        listeners.delete(listener);
      };
    },

    /** 이 범위(화면 · 시안 · 플랫폼 · 기기)에 맞는 시안 — 새것이 먼저 */
    async list(scope: Partial<ReferenceScope> = {}) {
      await ready();
      return filterReferences(snapshot.references, scope);
    },

    get: (id: string) => find(id) ?? null,

    async save(blob: Blob, meta: SaveReferenceMeta): Promise<Reference> {
      if (!(REFERENCE_IMAGE_TYPES as readonly string[]).includes(blob.type)) {
        throw new ReferenceImageError("PNG · JPEG · WebP 이미지만 넣을 수 있어요");
      }
      await ready();
      const size =
        meta.naturalWidth && meta.naturalHeight
          ? { width: meta.naturalWidth, height: meta.naturalHeight }
          : await measure(blob).catch(() => {
              throw new ReferenceImageError("이미지를 열지 못했어요 — 파일이 깨졌는지 봐 주세요");
            });
      if (!(size.width > 0 && size.height > 0)) {
        throw new ReferenceImageError("이미지 크기를 읽지 못했어요");
      }
      const fileName = (blob as Partial<File>).name;
      const reference: Reference = {
        id: makeId(),
        route: normalizeRoute(meta.route),
        platform: meta.platform ?? null,
        deviceId: meta.deviceId ?? null,
        draftId: meta.draftId ?? null,
        name:
          meta.name?.trim() ||
          (fileName ? stripExtension(fileName) : `시안 ${snapshot.references.length + 1}`),
        naturalWidth: size.width,
        naturalHeight: size.height,
        mimeType: blob.type,
        byteSize: blob.size,
        createdAt: now().toISOString(),
        align: { ...DEFAULT_ALIGN },
        view: { ...DEFAULT_VIEW },
        blob,
      };
      emit({ references: [reference, ...snapshot.references].sort(byNewest) });
      await persist(reference.id, () => backend.put(reference));
      return reference;
    },

    /** 낙관적으로 곧바로 반영하고 뒤에서 저장한다. 없는 id 면 null */
    update(id: string, patch: ReferencePatch): Reference | null {
      const current = find(id);
      if (!current) return null;
      const align = { ...current.align, ...patch.align };
      const view = { ...current.view, ...patch.view };
      const next: Reference = {
        ...current,
        ...(patch.name !== undefined ? { name: patch.name.trim() || current.name } : {}),
        ...(patch.route !== undefined ? { route: normalizeRoute(patch.route) } : {}),
        ...(patch.platform !== undefined ? { platform: patch.platform } : {}),
        ...(patch.deviceId !== undefined ? { deviceId: patch.deviceId } : {}),
        ...(patch.draftId !== undefined ? { draftId: patch.draftId } : {}),
        align: {
          fit: align.fit,
          scale: clamp(Number.isFinite(align.scale) ? align.scale : 1, 0.02, 20),
          offsetX: round2(Number.isFinite(align.offsetX) ? align.offsetX : 0),
          offsetY: round2(Number.isFinite(align.offsetY) ? align.offsetY : 0),
        },
        view: {
          mode: view.mode,
          opacity: clamp(Number.isFinite(view.opacity) ? view.opacity : 0.5, 0, 1),
          wipe: clamp(Number.isFinite(view.wipe) ? view.wipe : 0.5, 0, 1),
        },
      };
      emit({
        references: snapshot.references.map((reference) =>
          reference.id === id ? next : reference,
        ),
      });
      void persist(id, () => backend.put(next));
      return next;
    },

    async remove(id: string) {
      forgetUrl(id);
      emit({ references: snapshot.references.filter((reference) => reference.id !== id) });
      const selected = Object.fromEntries(
        Object.entries(snapshot.ui.selected).filter(([, value]) => value !== id),
      );
      if (Object.keys(selected).length !== Object.keys(snapshot.ui.selected).length) {
        setUi({ ...snapshot.ui, selected });
      }
      await persist(id, () => backend.remove(id));
    },

    /** 저장이 다 끝날 때까지 — 테스트 · 창을 닫기 전 */
    flush: () => Promise.all([...writes.values()]).then(() => undefined),

    /** 이미지 주소(object URL). 처음 부를 때 만들고 지울 때 거둔다. 아직 못 읽었으면 null */
    getUrl(id: string): string | null {
      const cached = urlCache.get(id);
      if (cached) return cached;
      const reference = find(id);
      if (!reference || !urls) return null;
      const url = urls.create(reference.blob);
      urlCache.set(id, url);
      return url;
    },

    setVisible: (visible: boolean) => setUi({ ...snapshot.ui, visible }),
    toggleVisible: () => setUi({ ...snapshot.ui, visible: !snapshot.ui.visible }),
    select(route: string, id: string | null) {
      const key = selectionKey(route);
      const selected = { ...snapshot.ui.selected };
      if (id) selected[key] = id;
      else delete selected[key];
      setUi({ ...snapshot.ui, selected });
    },

    /** 이 범위에서 보일 시안 — 고른 것이 범위에 맞으면 그것, 아니면 가장 새것 */
    activeFor(scope: ReferenceScope): Reference | null {
      const matches = filterReferences(snapshot.references, scope);
      const chosen = snapshot.ui.selected[selectionKey(scope.route)];
      return matches.find((reference) => reference.id === chosen) ?? matches[0] ?? null;
    },

    dispose() {
      unlisten?.();
      channel?.close();
      for (const id of [...urlCache.keys()]) forgetUrl(id);
      listeners.clear();
    },
  };
}

// ── 창 하나에 하나 ────────────────────────────────────────────────────

let shared: ReferenceStore | null = null;

/** 셸 · 패널 · 오버레이가 같이 쓰는 저장소. IndexedDB 가 없는 환경(jest)이면 메모리 */
export function getReferenceStore(): ReferenceStore {
  shared ??= createReferenceStore({
    backend:
      typeof indexedDB !== "undefined" ? createIndexedDbBackend(indexedDB) : createMemoryBackend(),
    channel: createBroadcastReferenceChannel(),
    uiStorage: typeof localStorage !== "undefined" ? localStorage : null,
  });
  return shared;
}

/** 테스트가 저장소를 갈아 끼운다 — null 이면 다음 `getReferenceStore()` 가 새로 만든다 */
export function setReferenceStore(store: ReferenceStore | null) {
  shared?.dispose();
  shared = store;
}

// 짧은 이름 — 셸 · 편집기가 저장소를 몰라도 쓰게
export const listReferences = (scope: Partial<ReferenceScope> = {}) =>
  getReferenceStore().list(scope);
export const saveReference = (blob: Blob, meta: SaveReferenceMeta) =>
  getReferenceStore().save(blob, meta);
export const updateReference = (id: string, patch: ReferencePatch) =>
  getReferenceStore().update(id, patch);
export const deleteReference = (id: string) => getReferenceStore().remove(id);
export const getReferenceUrl = (id: string) => getReferenceStore().getUrl(id);
export const subscribeReferences = (listener: () => void) =>
  getReferenceStore().subscribe(listener);
export const toggleReferenceVisible = () => getReferenceStore().toggleVisible();
export const setReferenceVisible = (visible: boolean) => getReferenceStore().setVisible(visible);
