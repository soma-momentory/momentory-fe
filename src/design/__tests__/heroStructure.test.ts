import { changeHeroStructure, validateHeroStructure } from "../heroStructure";

describe("editable hero structure", () => {
  it("adds, nests, reorders, unnests and removes blocks as validated data", () => {
    let blocks = changeHeroStructure([], {type:"add-group",newId:"group-one"});
    blocks = changeHeroStructure(blocks, {type:"add-text",newId:"text-one"});
    blocks = changeHeroStructure(blocks, {type:"nest",id:"text-one"});
    expect(blocks[0]).toEqual({id:"group-one",kind:"group",children:[{id:"text-one",kind:"text",text:"새 정보"}]});
    blocks = changeHeroStructure(blocks, {type:"unnest",id:"text-one"});
    blocks = changeHeroStructure(blocks, {type:"up",id:"text-one"});
    expect(blocks.map((block) => block.id)).toEqual(["text-one","group-one"]);
    blocks = changeHeroStructure(blocks, {type:"remove",id:"group-one"});
    expect(blocks).toHaveLength(1);
  });

  it("rejects arbitrary node types, duplicate IDs and nested groups", () => {
    expect(() => validateHeroStructure([{id:"script",kind:"script",text:"run"}])).toThrow();
    expect(() => validateHeroStructure([{id:"same",kind:"text",text:"a"},{id:"same",kind:"text",text:"b"}])).toThrow();
    expect(() => validateHeroStructure([{id:"outer",kind:"group",children:[{id:"inner",kind:"group",children:[]}]}])).toThrow();
    expect(() => validateHeroStructure([{id:"hidden",kind:"text",text:"safe\u202Eevil"}])).toThrow();
    expect(() => validateHeroStructure([{id:"invisible",kind:"text",text:"safe\u200Devil"}])).toThrow();
  });
});
