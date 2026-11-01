/**
 * 「AI에게 맡기기」가 시안을 같이 넘길 때 쓰는 파일 — 디자인 편집기의 「AI에게 넘기기」 내보내기와
 * **같은 것**(`momentory-lab-handoff@1` · `design-editor/handoff.ts` 의 `buildHandoff`)을 셸에서 만든다.
 *
 * 시안 · 메모는 편집기가 localStorage 에 둔 것을 **읽기만** 한다. 지금 화면이 시안을 건 채로 지나간
 * 화면 목록에 아직 없으면 넣어서 보낸다 — 이 화면의 참고 시안 그림이 함께 가게.
 */
import { getShellCatalog } from "../design-editor/DesignEditorPanel";
import { findDraft, readDrafts } from "../design-editor/drafts";
import {
  buildHandoff,
  normalizeRoute,
  readNotes,
  type HandoffReference,
  type LabHandoff,
} from "../design-editor/handoff";
import { loadStudioApproved } from "../design-editor/tokenModules";

const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export async function buildAgentHandoff({
  draftId,
  route,
  lab,
  getReferences,
}: {
  draftId: string | null;
  /** 지금 화면(라우트 또는 실제 주소) */
  route: string;
  lab: LabHandoff["lab"];
  getReferences?: (route: string) => Promise<HandoffReference | null>;
}): Promise<LabHandoff | null> {
  if (!draftId) return null;
  const store = storage();
  const draft = findDraft(readDrafts(store), draftId);
  if (!draft) return null;
  const notes = readNotes(store, draft.id);
  const here = normalizeRoute(route);
  const visited = notes.visited.includes(here) ? notes.visited : [...notes.visited, here];
  return buildHandoff({
    draft,
    notes: { ...notes, visited },
    catalog: getShellCatalog(),
    approvedStudio: loadStudioApproved(),
    lab,
    getReferences,
  });
}
