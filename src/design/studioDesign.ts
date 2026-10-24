import rawDesign from "./studioApproved.json";

export type HeroStructureNode =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "group"; children: HeroStructureNode[] };
export type StudioDesign = Omit<typeof rawDesign, "home.hero.structure"> & {
  "home.hero.structure": HeroStructureNode[];
};
export const approvedDesign = rawDesign as StudioDesign;
export type StudioDesignKey = keyof StudioDesign;
