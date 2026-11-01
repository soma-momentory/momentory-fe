/**
 * 왼쪽 화면 목록 맨 위 — 「＋ 새 화면 만들기」 단추와 「새 화면 (작업 중)」 묶음.
 *
 * 묶음은 `GET /__lab/agent/workspaces` 의 `kind: "new-screen"` 작업 공간이다(이 서버의 `app/` 에는 아직 없는
 * 화면이라 라우트 목록에 없다). 누르면 그 작업 공간의 수정 결과 화면(미리보기 서버)에서 `newRoutes[0]`
 * (없으면 첫 화면)을 연다. 미리보기 서버가 아직 꺼져 있으면 켜고, 켜지는 동안은 「켜는 중」이다.
 *
 * 「AI에게 맡기기」 서버가 없는 Lab(작업 공간의 미리보기 서버 · `MOMENTORY_LAB_AGENT=off`)에서는 묶음이
 * 비고 단추만 남는다 — 단추는 오른쪽 패널의 「새 화면 만들기」를 열 뿐이라 거기서 한 줄로 알린다.
 */
import { useCallback, useEffect, useState } from "react";

import { AGENT_API } from "../agent/client";
import { statusText } from "../agent/WorkspaceCard";
import type { WorkspaceSummary } from "../agent/types";
import { shellColor } from "./theme";

const POLL_MS = 10_000;
const BUSY_POLL_MS = 2500;

const ellipsis = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

/** 새 화면 작업 공간 목록 — 실행 · 미리보기 켜는 중이면 자주, 아니면 가끔 다시 읽는다 */
export function useNewScreenWorkspaces() {
  const [list, setList] = useState<WorkspaceSummary[]>([]);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${AGENT_API}/workspaces`, { cache: "no-store" });
      if (!res.ok) return setList([]);
      const data = (await res.json()) as { workspaces?: WorkspaceSummary[] };
      setList((data.workspaces ?? []).filter((w) => w.kind === "new-screen" && !w.broken));
    } catch {
      setList([]);
    }
  }, []);
  const busy = list.some(
    (w) => w.status === "working" || w.status === "checking" || w.preview?.status === "starting",
  );
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), busy ? BUSY_POLL_MS : POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, busy]);
  return { workspaces: list, refresh };
}

/** 새 화면의 미리보기 주소 — 서버가 아는 첫 새 라우트, 없으면 첫 화면 */
export const newScreenPath = (workspace: Pick<WorkspaceSummary, "newRoutes">) =>
  workspace.newRoutes[0] ?? "/";

export function NewScreenNav({
  workspaces,
  currentWorkspaceId,
  pendingWorkspaceId = null,
  onCreate,
  onOpen,
}: {
  workspaces: readonly WorkspaceSummary[];
  /** 지금 미리보기로 보고 있는 작업 공간 */
  currentWorkspaceId: string | null;
  /** 수정 결과 화면을 켜는 중인 작업 공간 — 준비되면 셸이 연다 */
  pendingWorkspaceId?: string | null;
  onCreate: () => void;
  onOpen: (workspace: WorkspaceSummary) => void;
}) {
  return (
    <div data-testid="new-screen-nav" style={{ display: "grid", gap: 4, marginBottom: 6 }}>
      <button
        type="button"
        data-testid="new-screen-button"
        onClick={onCreate}
        title="어떤 화면인지 적으면 AI 가 앱에 새 화면을 만들어요 — 결과는 따로 띄운 화면에서 봐요"
        style={{
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px dashed ${shellColor.accent}`,
          background: shellColor.accentSoft,
          color: shellColor.ink,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        ＋ 새 화면 만들기
      </button>
      {workspaces.length > 0 ? (
        <section data-section="new-screens" aria-label="새 화면 (작업 중)">
          <h3
            style={{
              margin: 0,
              padding: "7px 8px 3px",
              fontSize: 13,
              fontWeight: 700,
              color: shellColor.ink,
            }}
          >
            새 화면 (작업 중){" "}
            <span style={{ fontSize: 11, fontWeight: 400, color: shellColor.faint }}>
              {workspaces.length}
            </span>
          </h3>
          <div style={{ padding: "0 0 6px 14px", display: "grid", gap: 1 }}>
            {workspaces.map((w) => {
              const selected = w.id === currentWorkspaceId;
              const preview =
                w.preview?.ready && w.preview.url
                  ? "누르면 AI 수정 결과 화면에서 열어요"
                  : w.preview?.status === "starting"
                    ? "수정 결과 화면을 켜는 중이에요"
                    : "누르면 수정 결과 화면을 켜고 열어요";
              return (
                <button
                  key={w.id}
                  type="button"
                  data-workspace={w.id}
                  aria-current={selected ? "page" : undefined}
                  title={`${w.title} — ${newScreenPath(w)} · ${preview}`}
                  onClick={() => onOpen(w)}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "5px 8px",
                    border: 0,
                    borderLeft: `2px solid ${selected ? shellColor.draft : shellColor.border}`,
                    borderRadius: "0 7px 7px 0",
                    textAlign: "left",
                    cursor: "pointer",
                    background: selected ? shellColor.draftSoft : "transparent",
                    fontWeight: selected ? 700 : 400,
                    color: shellColor.ink,
                  }}
                >
                  <span style={{ ...ellipsis, fontSize: 13 }}>{w.title}</span>
                  <span
                    style={{
                      ...ellipsis,
                      fontSize: 11,
                      color: w.status === "working" ? shellColor.draft : shellColor.faint,
                    }}
                  >
                    {w.id === pendingWorkspaceId
                      ? "수정 결과 화면을 켜는 중…"
                      : `${statusText(w)} · ${newScreenPath(w)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
