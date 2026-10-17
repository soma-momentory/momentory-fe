import type { StudioDesign } from "../../../src/design/studioDesign";

/** Keeps Undo/Redo while the Studio component is unmounted for Compare or Atlas. */
let session: { draft: string; undo: StudioDesign[]; redo: StudioDesign[] } = {
  draft: "",
  undo: [],
  redo: [],
};

export function readSessionHistory(draft: string) {
  return session.draft === draft ? session : { draft, undo: [], redo: [] };
}

export function saveSessionHistory(draft: string, undo: StudioDesign[], redo: StudioDesign[]) {
  session = { draft, undo, redo };
}
