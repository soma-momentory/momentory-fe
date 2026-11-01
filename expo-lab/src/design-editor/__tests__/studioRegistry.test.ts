import { describe, expect, it } from "@jest/globals";
import { approvedDesign } from "../../../../src/design/studioDesign";

import { editableComponents, editableKeys } from "../studioRegistry";

describe("Studio 속성 등록표", () => {
  it("요소 id · testID · 속성 키가 겹치지 않고, 승인값 파일의 키와 정확히 같다", () => {
    expect(new Set(editableComponents.map((layer) => layer.id)).size).toBe(
      editableComponents.length,
    );
    expect(new Set(editableComponents.map((layer) => layer.testId)).size).toBe(
      editableComponents.length,
    );
    expect(new Set(editableKeys.map((property) => property.key)).size).toBe(editableKeys.length);
    expect(editableKeys.map((property) => property.key).sort()).toEqual(
      Object.keys(approvedDesign).sort(),
    );
  });

  it("부모는 같은 화면에 있고 없는 요소를 가리키지 않는다", () => {
    for (const layer of editableComponents) {
      if (!layer.parentId) continue;
      const parent = editableComponents.find((candidate) => candidate.id === layer.parentId);
      expect(parent).toBeDefined();
      expect(parent?.screenId).toBe(layer.screenId);
    }
  });
});
