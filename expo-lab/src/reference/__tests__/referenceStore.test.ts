import { describe, expect, it, jest } from "@jest/globals";

import {
  createMemoryBackend,
  createMemoryChannelHub,
  createReferenceStore,
  REFERENCE_UI_STORAGE_KEY,
  referenceApplies,
  type ReferenceBackend,
  type ReferenceChannel,
} from "../referenceStore";
import { handleReferenceShortcut } from "../shortcuts";
import { DEFAULT_ALIGN, DEFAULT_VIEW } from "../types";

/** jest 환경에는 진짜 Blob 이 없을 수 있다 — 저장소는 type · size · name 만 본다 */
const image = (name = "home.png", type = "image/png", size = 2048) =>
  ({ name, type, size }) as unknown as Blob;

const memoryStorage = () => {
  const rows = new Map<string, string>();
  return {
    getItem: (key: string) => rows.get(key) ?? null,
    setItem: (key: string, value: string) => void rows.set(key, value),
    rows,
  };
};

const makeStore = (
  options: {
    backend?: ReferenceBackend;
    channel?: ReferenceChannel | null;
    storage?: ReturnType<typeof memoryStorage>;
  } = {},
) => {
  let id = 0;
  let tick = 0;
  const urls = {
    create: jest.fn((blob: Blob) => `blob:${(blob as File).name}`),
    revoke: jest.fn(),
  };
  const store = createReferenceStore({
    backend: options.backend ?? createMemoryBackend(),
    channel: options.channel ?? null,
    uiStorage: options.storage ?? memoryStorage(),
    urls,
    measure: async () => ({ width: 1179, height: 2556 }),
    now: () => new Date(Date.UTC(2026, 10, 2, 12, 0, tick++)),
    makeId: () => `r${++id}`,
  });
  return { store, urls };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("referenceStore — CRUD", () => {
  it("저장하면 크기를 재고 기본 정렬 · 보기로 넣는다 · 라우트는 정규형", async () => {
    const backend = createMemoryBackend();
    const { store } = makeStore({ backend });
    const saved = await store.save(image(), { route: "/(tabs)/home/", platform: "ios" });
    expect(saved).toMatchObject({
      id: "r1",
      route: "/home",
      platform: "ios",
      deviceId: null,
      draftId: null,
      name: "home",
      naturalWidth: 1179,
      naturalHeight: 2556,
      mimeType: "image/png",
      byteSize: 2048,
      align: DEFAULT_ALIGN,
      view: DEFAULT_VIEW,
    });
    expect(await backend.getAll()).toHaveLength(1);
    expect(await store.list({ route: "/home" })).toHaveLength(1);
  });

  it("이미지가 아니면 거절한다", async () => {
    const { store } = makeStore();
    await expect(store.save(image("a.gif", "image/gif"), { route: "/home" })).rejects.toThrow(
      "PNG · JPEG · WebP",
    );
    await expect(store.list()).resolves.toHaveLength(0);
  });

  it("고치기는 곧바로 반영되고 뒤에서 저장된다 · 값은 범위 안으로 자른다", async () => {
    const backend = createMemoryBackend();
    const { store } = makeStore({ backend });
    const saved = await store.save(image(), { route: "/home" });
    const next = store.update(saved.id, {
      name: "  홈 v2 ",
      align: { offsetX: 3.456, scale: 0 },
      view: { opacity: 2, mode: "difference" },
    });
    expect(next).toMatchObject({
      name: "홈 v2",
      align: { fit: "width", scale: 0.02, offsetX: 3.46, offsetY: 0 },
      view: { mode: "difference", opacity: 1, wipe: 0.5 },
    });
    expect(store.get(saved.id)?.name).toBe("홈 v2");
    await store.flush();
    expect((await backend.getAll())[0]?.view.mode).toBe("difference");
    // 빈 이름은 무시
    expect(store.update(saved.id, { name: "   " })?.name).toBe("홈 v2");
    expect(store.update("없음", { name: "x" })).toBeNull();
  });

  it("지우면 저장소 · 이미지 주소 · 고른 상태에서 다 빠진다", async () => {
    const backend = createMemoryBackend();
    const { store, urls } = makeStore({ backend });
    const saved = await store.save(image(), { route: "/home" });
    expect(store.getUrl(saved.id)).toBe("blob:home.png");
    expect(store.getUrl(saved.id)).toBe("blob:home.png");
    expect(urls.create).toHaveBeenCalledTimes(1);
    store.select("/home", saved.id);
    await store.remove(saved.id);
    expect(urls.revoke).toHaveBeenCalledWith("blob:home.png");
    expect(await backend.getAll()).toHaveLength(0);
    expect(store.getSnapshot().ui.selected).toEqual({});
    expect(store.getUrl(saved.id)).toBeNull();
  });

  it("IndexedDB 를 못 열면 메모리로 갈아타고 persistent=false 로 알린다", async () => {
    const broken: ReferenceBackend = {
      persistent: true,
      getAll: () => Promise.reject(new Error("blocked")),
      put: () => Promise.reject(new Error("blocked")),
      remove: () => Promise.reject(new Error("blocked")),
    };
    const { store } = makeStore({ backend: broken });
    await store.ready();
    expect(store.getSnapshot()).toMatchObject({ loaded: true, persistent: false });
    await store.save(image(), { route: "/home" });
    expect(await store.list()).toHaveLength(1);
  });
});

describe("referenceStore — 범위", () => {
  it("화면 패턴 · 시안 · 플랫폼 · 기기로 거른다 — 새것이 먼저", async () => {
    const { store } = makeStore();
    const any = await store.save(image("a.png"), { route: "/diary/[id]" });
    const ios = await store.save(image("b.png"), { route: "/diary/[id]", platform: "ios" });
    const device = await store.save(image("c.png"), {
      route: "/diary/[id]",
      platform: "ios",
      deviceId: "iphone-16",
    });
    const draft = await store.save(image("d.png"), { route: "/diary/[id]", draftId: "d1" });
    await store.save(image("e.png"), { route: "/home" });

    const ids = async (scope: Parameters<typeof store.list>[0]) =>
      (await store.list(scope)).map((reference) => reference.name);

    expect(await ids({ route: "/diary/42" })).toEqual(["d", "c", "b", "a"]);
    expect(await ids({ route: "/diary/42", draftId: null })).toEqual(["c", "b", "a"]);
    expect(await ids({ route: "/diary/42", draftId: "d1" })).toEqual(["d", "c", "b", "a"]);
    expect(
      await ids({ route: "/diary/42", draftId: null, platform: "android", deviceId: "pixel-8" }),
    ).toEqual(["a"]);
    expect(
      await ids({ route: "/diary/42", draftId: null, platform: "ios", deviceId: "iphone-16e" }),
    ).toEqual(["b", "a"]);
    expect(referenceApplies(device, { route: "/diary/1", deviceId: "iphone-16" })).toBe(true);
    expect(referenceApplies(any, { route: "/home" })).toBe(false);
    expect([ios.id, draft.id]).toEqual(["r2", "r4"]);
  });

  it("보일 시안은 고른 것이 범위에 맞으면 그것, 아니면 가장 새것", async () => {
    const { store } = makeStore();
    const first = await store.save(image("a.png"), { route: "/home" });
    const second = await store.save(image("b.png"), { route: "/home", platform: "android" });
    const scope = {
      route: "/home",
      draftId: null,
      platform: "ios" as const,
      deviceId: "iphone-16",
    };
    expect(store.activeFor(scope)?.id).toBe(first.id);
    store.select("/(tabs)/home", second.id);
    // 고른 것이 Android 전용이라 iOS 프레임에는 맞지 않는다
    expect(store.activeFor(scope)?.id).toBe(first.id);
    expect(store.activeFor({ ...scope, platform: "android", deviceId: "pixel-8" })?.id).toBe(
      second.id,
    );
    store.select("/home", null);
    expect(store.getSnapshot().ui.selected).toEqual({});
  });
});

describe("referenceStore — 알림", () => {
  it("구독자는 저장 · 고치기 · 지우기 · 보이기마다 새 스냅샷을 받는다", async () => {
    const { store } = makeStore();
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    await store.ready();
    const before = store.getSnapshot();
    const saved = await store.save(image(), { route: "/home" });
    store.update(saved.id, { view: { opacity: 0.3 } });
    store.toggleVisible();
    await store.remove(saved.id);
    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(store.getSnapshot()).not.toBe(before);
    expect(store.getSnapshot().ui.visible).toBe(false);
    unsubscribe();
    store.toggleVisible();
    expect(listener.mock.calls.length).toBeLessThan(8);
  });

  it("다른 창(같은 IndexedDB · 같은 localStorage)이 바꾸면 통로로 듣고 다시 읽는다", async () => {
    const backend = createMemoryBackend();
    const storage = memoryStorage();
    const hub = createMemoryChannelHub();
    const shell = makeStore({ backend, storage, channel: hub.channel() }).store;
    const other = makeStore({ backend, storage, channel: hub.channel() }).store;
    await shell.ready();
    await other.ready();
    const listener = jest.fn();
    other.subscribe(listener);

    const saved = await shell.save(image(), { route: "/home" });
    await flush();
    expect(other.getSnapshot().references.map((reference) => reference.id)).toEqual([saved.id]);

    shell.update(saved.id, { align: { offsetY: 59 } });
    await shell.flush();
    await flush();
    expect(other.get(saved.id)?.align.offsetY).toBe(59);

    shell.setVisible(false);
    expect(JSON.parse(storage.rows.get(REFERENCE_UI_STORAGE_KEY)!)).toMatchObject({
      visible: false,
    });
    expect(other.getSnapshot().ui.visible).toBe(false);

    await shell.remove(saved.id);
    await flush();
    expect(other.getSnapshot().references).toHaveLength(0);
    expect(listener).toHaveBeenCalled();
  });

  it("R 단축키 — 글 칸에서는 먹지 않는다 · 한글 자판(ㄱ)도 받는다", () => {
    const { store } = makeStore();
    const key = (k: string, target: unknown = null, code?: string) =>
      ({ key: k, code, ctrlKey: false, metaKey: false, altKey: false, target }) as KeyboardEvent;
    expect(handleReferenceShortcut(key("r"), store)).toBe(true);
    expect(store.getSnapshot().ui.visible).toBe(false);
    expect(handleReferenceShortcut(key("ㄱ", null, "KeyR"), store)).toBe(true);
    expect(store.getSnapshot().ui.visible).toBe(true);
    const input = { tagName: "INPUT", type: "text", isContentEditable: false };
    expect(handleReferenceShortcut(key("r", input), store)).toBe(false);
    const checkbox = { tagName: "INPUT", type: "checkbox", isContentEditable: false };
    expect(handleReferenceShortcut(key("r", checkbox), store)).toBe(true);
    expect(handleReferenceShortcut({ ...key("r"), ctrlKey: true } as KeyboardEvent, store)).toBe(
      false,
    );
  });
});
