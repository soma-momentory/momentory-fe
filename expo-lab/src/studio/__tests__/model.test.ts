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
    expect(() =>
      parseDesign({ ...approvedDesign, "rest.babaImage.assetId": "external-url" }),
    ).toThrow();
    expect(() =>
      parseDesign({ ...approvedDesign, "home.bubbleText.fontFamily": "ExternalFont" }),
    ).toThrow();
  });

  it("restores a Version 2 draft while filling only newly approved properties", () => {
    const legacy = Object.fromEntries(
      Object.entries(approvedDesign)
        .slice(0, 5)
        .concat(
          Object.entries(approvedDesign).filter(([key]) =>
            [
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
            ].includes(key),
          ),
        ),
    );
    legacy["home.hero.borderRadius"] = 24;
    const restored = parseDrafts({ active: "Old draft", drafts: { "Old draft": legacy } });
    expect(restored.drafts["Old draft"]).toEqual({
      ...approvedDesign,
      "home.hero.borderRadius": 24,
    });
  });
});
