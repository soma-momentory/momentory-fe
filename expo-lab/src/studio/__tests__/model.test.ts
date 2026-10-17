import { describe, expect, it } from "@jest/globals";
import { approvedDesign } from "../../../../src/design/studioDesign";

import { designDiff, exportDraft, importDraft, parseDesign, parseDrafts } from "../model";

describe("Design Studio data boundary", () => {
  it("round trips an approved draft and reports only changed properties", () => {
    const design = { ...approvedDesign, "home.hero.borderRadius": 24 };
    expect(importDraft(exportDraft("Card study", design))).toEqual({ name: "Card study", design });
    expect(designDiff(design).map((change) => change.key)).toEqual(["home.hero.borderRadius"]);
  });

  it("rejects unknown keys and out-of-range values before applying or saving", () => {
    expect(() => parseDesign({ ...approvedDesign, "home.hero.borderRadius": 900 })).toThrow();
    expect(() => parseDesign({ ...approvedDesign, "unregistered.opacity": 0.5 })).toThrow();
    expect(() => parseDesign({ ...approvedDesign, "home.hero.backgroundColor": "red" })).toThrow();
    expect(() => parseDrafts({ active: "Missing", drafts: { Draft: approvedDesign } })).toThrow();
  });
});
