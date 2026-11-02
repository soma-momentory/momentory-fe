import { describe, expect, it } from "@jest/globals";

import { approvedDesign } from "../../../../src/design/studioDesign";
import { DESIGN_DRAFTS_STORAGE_KEY } from "../../lab-contract";
import {
  createDraft,
  deleteDraft,
  duplicateDraft,
  exportDraftJson,
  LEGACY_STUDIO_STORAGE_KEY,
  migrateLegacyStudioDrafts,
  parseDraftExport,
  readDrafts,
  renameDraft,
  setOverride,
  updateDraftContent,
  writeDrafts,
  type ImportValidators,
} from "../drafts";
import { emptyHistory, recordEdit, redo, undo } from "../history";
import { findStudioProperty, studioScreenForRoute, validValue } from "../studioRegistry";

const storage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
};

const now = new Date("2026-11-02T12:00:00.000Z");
const validators: ImportValidators = {
  token: (key) => {
    if (key === "bad.key") throw new Error("모르는 토큰");
    return key.replace(/^color\./, "");
  },
  studio: (key, value) => {
    const property = findStudioProperty(key);
    return property && validValue(property, value) ? null : "허용되지 않는다";
  },
  studioApproved: approvedDesign,
};

describe("시안 저장소", () => {
  it("만들기 · 복제 · 이름 바꾸기 · 지우기 · 내용 바꾸기가 저장소를 거쳐 돌아온다", () => {
    const store = storage();
    let { drafts, draft } = createDraft([], "홈 색 연구", undefined, now);
    drafts = updateDraftContent(drafts, draft.id, {
      tokens: { "primary.heavy": "rgb(51,85,68)" },
      studio: { "home.hero.borderRadius": 24 },
    });
    const copy = duplicateDraft(drafts, draft.id, now);
    expect(copy.draft.name).toBe("홈 색 연구 사본");
    expect(copy.draft.tokens).toEqual({ "primary.heavy": "rgb(51,85,68)" });
    drafts = renameDraft(copy.drafts, copy.draft.id, "  다른 이름 ");
    writeDrafts(store, drafts);
    const read = readDrafts(store);
    expect(read.map((item) => item.name)).toEqual(["홈 색 연구", "다른 이름"]);
    expect(deleteDraft(read, draft.id).map((item) => item.name)).toEqual(["다른 이름"]);
  });

  it("이름이 비거나 겹치면 거부한다", () => {
    const { drafts } = createDraft([], "A", undefined, now);
    expect(() => createDraft(drafts, "A")).toThrow(/같은 이름/);
    expect(() => createDraft(drafts, "   ")).toThrow(/1–40/);
    expect(() => renameDraft(drafts, drafts[0]!.id, "x".repeat(41))).toThrow();
  });

  it("깨진 저장 값은 버린다", () => {
    const store = storage();
    store.setItem(
      DESIGN_DRAFTS_STORAGE_KEY,
      JSON.stringify([
        { id: "ok", name: "좋음", tokens: { a: 1 }, studio: {}, updatedAt: "x" },
        { id: "bad", name: "나쁨", tokens: { a: { nested: 1 } }, studio: {} },
        "nope",
        { id: "ok", name: "중복", tokens: {}, studio: {} },
      ]),
    );
    expect(readDrafts(store).map((item) => item.id)).toEqual(["ok"]);
    store.setItem(DESIGN_DRAFTS_STORAGE_KEY, "{oops");
    expect(readDrafts(store)).toEqual([]);
    expect(readDrafts(null)).toEqual([]);
  });

  it("승인값과 같은 값은 덮어쓰기에서 빠진다", () => {
    expect(setOverride({ a: 1 }, "a", 2, 2)).toEqual({});
    expect(setOverride({}, "a", 3, 2)).toEqual({ a: 3 });
  });
});

describe("내보내기 · 가져오기", () => {
  it("v2 파일이 왕복하고, 키를 정규화한다", () => {
    const { draft } = createDraft(
      [],
      "왕복",
      { tokens: { "primary.heavy": "rgb(51,85,68)" }, studio: { "home.hero.borderRadius": 24 } },
      now,
    );
    const json = exportDraftJson(draft, now);
    expect(JSON.parse(json)).toMatchObject({ version: 2, kind: "momentory-design-draft" });
    expect(parseDraftExport(json, validators)).toEqual({
      name: "왕복",
      content: {
        tokens: { "primary.heavy": "rgb(51,85,68)" },
        studio: { "home.hero.borderRadius": 24 },
      },
    });
    const aliased = JSON.stringify({
      version: 2,
      name: "n",
      tokens: { "color.label.normal": "rgb(0,0,0)" },
    });
    expect(parseDraftExport(aliased, validators).content.tokens).toEqual({
      "label.normal": "rgb(0,0,0)",
    });
  });

  it("옛 Studio v1 파일은 승인본과 다른 키만 가져온다", () => {
    const design = { ...approvedDesign, "home.hero.borderRadius": 30 };
    const json = JSON.stringify({ version: 1, name: "옛 시안", design });
    expect(parseDraftExport(json, validators).content).toEqual({
      tokens: {},
      studio: { "home.hero.borderRadius": 30 },
    });
  });

  it("틀린 키·값이 하나라도 있으면 통째로 거부한다", () => {
    expect(() =>
      parseDraftExport(
        JSON.stringify({ version: 2, name: "n", tokens: { "bad.key": 1 } }),
        validators,
      ),
    ).toThrow(/bad\.key/);
    expect(() =>
      parseDraftExport(
        JSON.stringify({ version: 2, name: "n", studio: { "home.hero.borderRadius": 900 } }),
        validators,
      ),
    ).toThrow(/home\.hero\.borderRadius/);
    expect(() => parseDraftExport("not json", validators)).toThrow(/JSON/);
    expect(() => parseDraftExport(JSON.stringify({ version: 9, name: "n" }), validators)).toThrow();
  });

  it("옛 Design Studio 저장소를 새 저장소가 비어 있을 때 한 번 옮긴다", () => {
    const store = storage();
    store.setItem(
      LEGACY_STUDIO_STORAGE_KEY,
      JSON.stringify({
        active: "Draft 1",
        drafts: {
          "Draft 1": { ...approvedDesign },
          연구: { ...approvedDesign, "home.hero.borderRadius": 30, "unknown.key": 3 },
        },
      }),
    );
    const valid = (key: string, value: unknown) => {
      const property = findStudioProperty(key);
      return !!property && validValue(property, value);
    };
    expect(migrateLegacyStudioDrafts(store, approvedDesign, valid, now)).toBe(2);
    const drafts = readDrafts(store);
    expect(drafts.map((item) => [item.name, item.studio])).toEqual([
      ["Draft 1", {}],
      ["연구", { "home.hero.borderRadius": 30 }],
    ]);
    expect(migrateLegacyStudioDrafts(store, approvedDesign, valid, now)).toBe(0);
  });
});

describe("되돌리기", () => {
  it("편집 · 되돌리기 · 다시 하기", () => {
    const a = { tokens: {}, studio: {} };
    const b = { tokens: { x: 1 }, studio: {} };
    const c = { tokens: { x: 2 }, studio: {} };
    let history = recordEdit(emptyHistory(), a);
    history = recordEdit(history, b);
    const back = undo(history, c)!;
    expect(back.content).toEqual(b);
    const forward = redo(back.history, back.content)!;
    expect(forward.content).toEqual(c);
    expect(undo(emptyHistory(), a)).toBeNull();
    expect(recordEdit(forward.history, c).future).toEqual([]);
  });
});

describe("Studio 등록표", () => {
  it("라우트에서 화면을 찾는다 — 묶음 (tabs) 는 무시한다", () => {
    expect(studioScreenForRoute("/(tabs)/home")).toBe("home-main");
    expect(studioScreenForRoute("/rest?x=1")).toBe("rest-hub");
    expect(studioScreenForRoute("/diary/3")).toBeNull();
  });
});
