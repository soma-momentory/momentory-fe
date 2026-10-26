import { describe, expect, it } from "@jest/globals";
import { approvedDesign } from "../../../../src/design/studioDesign";

import { editableComponents, editableKeys } from "../registry";

describe("visual editor registry", () => {
  it("keeps IDs, preview anchors and design keys unique", () => {
    expect(new Set(editableComponents.map((layer) => layer.id)).size).toBe(
      editableComponents.length,
    );
    expect(new Set(editableComponents.map((layer) => layer.testId)).size).toBe(
      editableComponents.length,
    );
    expect(new Set(editableKeys.map((property) => property.key)).size).toBe(editableKeys.length);
    expect(editableKeys.map((property) => property.key).sort()).toEqual(
      Object.keys(approvedDesign).filter((key) => key !== "home.hero.structure").sort(),
    );
  });

  it("uses parents on the same screen and never points at a missing layer", () => {
    for (const layer of editableComponents) {
      if (!layer.parentId) continue;
      const parent = editableComponents.find((candidate) => candidate.id === layer.parentId);
      expect(parent).toBeDefined();
      expect(parent?.screenId).toBe(layer.screenId);
    }
  });
});
