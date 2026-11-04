/**
 * 「시안 여러 개」 — 같은 화면 · 같은 지시로 만든 시안 N개(서버의 묶음 `group`)를 셸 · 패널이 같은 말로 그린다.
 * 순수 함수라 `__tests__/variants.test.ts` 가 고정한다.
 *
 * 서버(`server/index.js`)는 시안을 **동시에** 돌리고, 시안의 수정 결과 화면(미리보기 서버)은
 * 실행이 끝나도 저절로 켜지 않는다 — 「시안 비교」 화면이 열릴 때 셸이 켠다(`shouldStartPreview`).
 */
import type { WorkspaceSummary } from "./types";

/** 서버가 멈추기로 거둔 시안에 남기는 한 줄(`server/index.js`) */
export const STOPPED_NOTE = "멈춰서 만들지 않았어요";

export type VariantGroupView = {
  id: string;
  route: string | null;
  /** 시안 몇 개로 만들었나(버린 뒤에는 `members` 가 더 적을 수 있다) */
  total: number;
  createdAt: string;
  /** 자리 순서(시안 1 · 2 · 3) */
  members: WorkspaceSummary[];
};

/** 작업 공간 목록 → 시안 묶음들(새것 먼저) */
export function variantGroups(list: readonly WorkspaceSummary[]): VariantGroupView[] {
  const byId = new Map<string, VariantGroupView>();
  for (const ws of list) {
    if (!ws.group || ws.broken) continue;
    const group = byId.get(ws.group.id) ?? {
      id: ws.group.id,
      route: ws.route,
      total: ws.group.total,
      createdAt: ws.group.createdAt,
      members: [],
    };
    group.members.push(ws);
    byId.set(ws.group.id, group);
  }
  const groups = [...byId.values()];
  for (const group of groups)
    group.members.sort((a, b) => (a.group?.index ?? 0) - (b.group?.index ?? 0));
  return groups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 보여 줄 묶음 — 고른 것(있으면), 없으면 그 화면의 가장 새 묶음 */
export function pickGroup(
  groups: readonly VariantGroupView[],
  id: string | null,
  route: string,
): VariantGroupView | null {
  return (
    (id ? groups.find((g) => g.id === id) : undefined) ??
    groups.find((g) => g.route === route) ??
    null
  );
}

export const variantName = (ws: Pick<WorkspaceSummary, "group">) =>
  ws.group ? `시안 ${ws.group.index}` : "";

/**
 * 시안 한 자리의 상태 — 머리 둘째 줄(`label`) · 폰 자리 안내(`note` · 화면을 못 띄울 때) ·
 * 화면을 띄울 수 있나(`ready`) · 수정 결과 화면을 켜야 하나(`canStart`).
 */
export type SlotState = {
  label: string;
  note: string | null;
  ready: boolean;
  canStart: boolean;
  tone: "busy" | "ready" | "failed" | "idle";
};

/**
 * 만든 것이 있나 — 실행 기록은 서버 메모리에만 있어 Lab 을 다시 켜면 사라진다. 그때도 수정 · 저장이
 * 남아 있으면 「아직 안 만듦」이 아니다(2026-11-03 · 재시작 뒤 시안 비교에 시안이 안 뜨던 자리).
 */
const hasWork = (ws: WorkspaceSummary) =>
  ws.lastRun != null || ws.changedCount > 0 || ws.commitCount > 0;

export function slotState(ws: WorkspaceSummary): SlotState {
  const preview = ws.preview;
  if (ws.status === "working")
    return {
      label: "만드는 중",
      note: "AI가 이 시안을 만드는 중이에요",
      ready: false,
      canStart: false,
      tone: "busy",
    };
  if (ws.status === "starting")
    return {
      label: "시작하는 중",
      note: "곧 만들기 시작해요",
      ready: false,
      canStart: false,
      tone: "busy",
    };
  const run = ws.lastRun;
  if (!hasWork(ws))
    return {
      label: "아직 안 만듦",
      note: "아직 만들지 않았어요",
      ready: false,
      canStart: false,
      tone: "idle",
    };
  if (run?.status === "failed")
    return {
      label: run.error === STOPPED_NOTE ? "멈춤" : "실패",
      note: run.error ?? "AI가 끝까지 만들지 못했어요",
      ready: false,
      canStart: false,
      tone: "failed",
    };
  if (preview?.ready && preview.url)
    return {
      label: run?.status === "stopped" ? "멈춤 · 준비됨" : "준비됨",
      note: null,
      ready: true,
      canStart: false,
      tone: "ready",
    };
  if (preview?.status === "failed")
    return {
      label: "실패",
      note: preview.error ?? "수정 결과 화면을 켜지 못했어요",
      ready: false,
      canStart: true,
      tone: "failed",
    };
  return {
    label: "준비 중",
    note: "수정 결과 화면을 켜는 중…",
    ready: false,
    canStart: preview?.status !== "starting",
    tone: "busy",
  };
}

/** 「시안 비교」가 열릴 때 셸이 저절로 켤 시안 — 실행이 끝났고 화면이 꺼져 있는 것(실패한 화면은 「다시 켜기」로만) */
export const shouldStartPreview = (ws: WorkspaceSummary) => {
  const state = slotState(ws);
  return state.canStart && ws.preview?.status !== "failed";
};

/** 시안 비교가 이미 서버에 알린 시안 — 묶음을 바꾸면 다시 센다 */
export type OpenedPreviews = { groupId: string | null; ids: Set<string> };

/**
 * 이번에 서버에 알릴 시안 — 꺼진 것은 켜고, 켜진 것은 「방금 봤다」고 알린다(상한을 넘으면 오래 안 본 것부터 끈다).
 * 묶음을 바꾸면 처음부터 다시 센다 — 다른 묶음을 보는 사이 꺼졌을 수 있다.
 */
export function previewsToOpen(
  group: Pick<VariantGroupView, "id" | "members">,
  opened: OpenedPreviews,
) {
  if (opened.groupId !== group.id) {
    opened.groupId = group.id;
    opened.ids.clear();
  }
  const todo = group.members.filter(
    (m) =>
      !opened.ids.has(m.id) &&
      (shouldStartPreview(m) || m.preview?.ready || m.preview?.status === "starting"),
  );
  for (const m of todo) opened.ids.add(m.id);
  return todo;
}

/** 시안 한 자리의 진행 — 「시안 2 만드는 중」 */
export function memberProgress(ws: WorkspaceSummary): string {
  const name = variantName(ws);
  if (ws.status === "working") return `${name} 만드는 중`;
  if (ws.status === "starting") return `${name} 시작하는 중`;
  if (ws.status === "pr") return `${name} 확정 · 검토 요청 올림`;
  if (ws.status === "committed") return `${name} 저장됨`;
  const run = ws.lastRun;
  if (!hasWork(ws)) return `${name} 아직 안 만듦`;
  if (run?.status === "failed") return `${name} ${run.error === STOPPED_NOTE ? "멈춤" : "실패"}`;
  if (run?.status === "stopped") return `${name} 멈춤`;
  return `${name} 다 만듦`;
}

/** 묶음의 진행 한 줄 — 「시안 1 다 만듦 · 시안 2 만드는 중 · 시안 3 만드는 중」 */
export const groupProgress = (group: Pick<VariantGroupView, "members">) =>
  group.members.map(memberProgress).join(" · ");

/** 묶음에서 아직 AI 가 도는 시안이 있나 */
export const groupBusy = (group: Pick<VariantGroupView, "members">) =>
  group.members.some((m) => m.status === "working" || m.status === "starting");
