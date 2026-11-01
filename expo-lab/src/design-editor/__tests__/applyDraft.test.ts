/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules 안에서 새 모듈을 부른다 */
import { describe, expect, it, jest } from "@jest/globals";

import {
  DEFAULT_FRAME_CONFIG,
  DESIGN_DRAFTS_STORAGE_KEY,
  type DesignDraft,
} from "../../lab-contract";

const memoryStorage = (drafts: DesignDraft[] | string) => {
  const raw = typeof drafts === "string" ? drafts : JSON.stringify(drafts);
  return { getItem: (key: string) => (key === DESIGN_DRAFTS_STORAGE_KEY ? raw : null) };
};

const draft = (patch: Partial<DesignDraft>): DesignDraft => ({
  id: "d1",
  name: "실험",
  tokens: {},
  studio: {},
  updatedAt: "2026-11-02T00:00:00.000Z",
  ...patch,
});

/** 매번 새 모듈 레지스트리 — 프레임 하나의 새 JS 문맥과 같다 */
function freshFrame(storage: ReturnType<typeof memoryStorage>, designDraftId: string | null) {
  let result!: {
    report: import("../applyDraft").DesignApplyReport;
    color: typeof import("../../../../src/design/ds/color");
    typography: typeof import("../../../../src/design/ds/typography");
    metrics: typeof import("../../../../src/design/ds/metrics");
    homeV2: typeof import("../../../../src/design/ds/homeV2");
    studio: Record<string, string | number>;
  };
  jest.isolateModules(() => {
    const { applyDesignDraft } = require("../applyDraft") as typeof import("../applyDraft");
    const report = applyDesignDraft({ ...DEFAULT_FRAME_CONFIG, designDraftId }, storage);
    result = {
      report,
      color: require("../../../../src/design/ds/color"),
      typography: require("../../../../src/design/ds/typography"),
      metrics: require("../../../../src/design/ds/metrics"),
      homeV2: require("../../../../src/design/ds/homeV2"),
      studio: require("../../../../src/design/studioDesign").approvedDesign,
    };
  });
  return result;
}

describe("applyDesignDraft", () => {
  it("시안의 토큰 · Studio 속성을 앱이 읽는 객체에 제자리에서 넣는다", () => {
    const storage = memoryStorage([
      draft({
        tokens: {
          "primary.heavy": "rgb(51,85,68)",
          "color.label.normal": "rgba(10,20,30,0.9)",
          "space.lg": 18,
          "typography.title2.fontSize": 30,
          "homeV2.color.paper": "rgb(238,238,238)",
        },
        studio: { "home.hero.borderRadius": 24 },
      }),
    ]);
    const frame = freshFrame(storage, "d1");
    expect(frame.color.primary.heavy).toBe("rgb(51,85,68)");
    expect(frame.color.color.primary.heavy).toBe("rgb(51,85,68)"); // 묶음도 같은 객체
    expect(frame.color.label.normal).toBe("rgba(10,20,30,0.9)");
    expect(frame.metrics.space.lg).toBe(18);
    expect(frame.metrics.metrics.space.lg).toBe(18);
    expect(frame.typography.text.title2.fontSize).toBe(Math.round(30 * frame.typography.typeScale));
    expect(frame.homeV2.homeV2.color.paper).toBe("rgb(238,238,238)");
    expect(frame.studio["home.hero.borderRadius"]).toBe(24);
    expect(frame.report.skipped).toEqual([]);
    expect(frame.report.applied).toEqual(
      expect.arrayContaining(["primary.heavy", "label.normal", "text.title2.fontSize"]),
    );
  });

  it("모르는 키는 건너뛰고, 틀린 값과 읽기 전용 키는 이유와 함께 거부한다", () => {
    const storage = memoryStorage([
      draft({
        tokens: {
          "nope.missing": 1,
          "primary.heavy": "not-a-color",
          "space.lg": "16",
          "fill.normal": "rgb(255,255,255)",
          scheduleDot: "rgb(255,255,255)",
        },
        studio: { "home.hero.borderRadius": 900, "unknown.key": 1 },
      }),
    ]);
    const before = freshFrame(memoryStorage([]), null);
    const frame = freshFrame(storage, "d1");
    expect(frame.color.primary.heavy).toBe(before.color.primary.heavy);
    expect(frame.metrics.space.lg).toBe(before.metrics.space.lg);
    expect(frame.color.fill.normal).toBe(before.color.fill.normal);
    expect(frame.studio["home.hero.borderRadius"]).toBe(before.studio["home.hero.borderRadius"]);
    expect(frame.report.applied).toEqual([]);
    expect(frame.report.skipped.map((item) => item.key).sort()).toEqual(
      [
        "fill.normal",
        "home.hero.borderRadius",
        "nope.missing",
        "primary.heavy",
        "scheduleDot",
        "space.lg",
        "unknown.key",
      ].sort(),
    );
  });

  it("시안이 없거나 찾지 못하거나 저장소가 깨져 있으면 아무것도 바꾸지 않는다", () => {
    const pristine = freshFrame(memoryStorage([]), null);
    for (const [storage, id] of [
      [memoryStorage([draft({ tokens: { "primary.heavy": "rgb(0,0,0)" } })]), null],
      [memoryStorage([draft({ tokens: { "primary.heavy": "rgb(0,0,0)" } })]), "other"],
      [memoryStorage("{not json"), "d1"],
    ] as const) {
      const frame = freshFrame(storage, id);
      expect(frame.color.primary.heavy).toBe(pristine.color.primary.heavy);
      expect(frame.report.applied).toEqual([]);
    }
  });

  it("얼린 객체는 건드리지 않는다", () => {
    jest.isolateModules(() => {
      const { applyDraftToTargets } = require("../applyDraft") as typeof import("../applyDraft");
      const { buildTokenCatalog } = require("../tokens") as typeof import("../tokens");
      const frozen = { primary: Object.freeze({ heavy: "rgb(17,17,17)" }) };
      const modules = { color: frozen };
      const catalog = buildTokenCatalog(modules);
      expect(catalog.byKey.get("primary.heavy")?.editable).toBe(false);
      const report = applyDraftToTargets(draft({ tokens: { "primary.heavy": "rgb(34,34,34)" } }), {
        modules,
        studioApproved: {},
        catalog,
      });
      expect(frozen.primary.heavy).toBe("rgb(17,17,17)");
      expect(report.skipped[0]?.reason).toMatch(/freeze/);
    });
  });
});
