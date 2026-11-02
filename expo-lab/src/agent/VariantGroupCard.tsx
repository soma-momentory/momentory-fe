/**
 * 시안 묶음 하나의 카드 — 「AI에게 맡기기」 패널 안. 진행(「시안 1 다 만듦 · 시안 2 만드는 중 · 시안 3 대기 중」) ·
 * 「시안 비교로 보기」 · 「시안 만들기 멈추기」 · 시안마다 접힌 자세히(진행 기록 · 결과 — `WorkspaceCard`).
 */
import { useState } from "react";

import { shellColor } from "../shell/theme";
import type { AgentClient } from "./client";
import type { AgentStatus, WorkspaceSummary } from "./types";
import { boxStyle, Btn, Note, smallStyle } from "./ui";
import {
  groupBusy,
  groupProgress,
  slotState,
  variantName,
  type VariantGroupView,
} from "./variants";
import { WorkspaceCard } from "./WorkspaceCard";

const timeOf = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function VariantGroupCard({
  client,
  group,
  status,
  title,
  onChanged,
  onOpenVariants,
  onOpenPreview,
}: {
  client: AgentClient;
  group: VariantGroupView;
  status: AgentStatus | null;
  /** 화면 이름(「홈」) */
  title: string;
  onChanged: () => void;
  /** 「시안 비교로 보기」 — 셸이 시안 비교 레이아웃을 연다 */
  onOpenVariants?: (groupId: string) => void;
  onOpenPreview?: (url: string, workspace: WorkspaceSummary) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = groupBusy(group);
  const anyDone = group.members.some((m) => m.lastRun?.status === "done");

  const stop = async () => {
    setStopping(true);
    const res = await client.stopVariants(group.id);
    setStopping(false);
    if (!res.ok) return setError(res.error);
    setError(null);
    onChanged();
  };

  return (
    <section
      aria-label={`${title} 시안 ${group.total}개`}
      data-testid={`variant-group-${group.id}`}
      style={boxStyle}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
      >
        <div style={{ fontWeight: 700 }}>
          {title} · 시안 {group.total}개
        </div>
        <div style={smallStyle}>{timeOf(group.createdAt)}</div>
      </div>
      <div
        data-testid="variant-progress"
        style={{ fontSize: 12, color: busy ? shellColor.notice : shellColor.muted }}
      >
        {groupProgress(group)}
      </div>
      {busy ? (
        <Note>
          시안은 한 번에 하나씩 차례로 만들어요 — 다 끝나기 전에는 다른 지시를 받지 않아요
        </Note>
      ) : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Btn
          tone={anyDone && !busy ? "primary" : "plain"}
          onClick={() => onOpenVariants?.(group.id)}
          title="지금 앱과 시안들을 한 줄에 나란히 띄워요 — 다 만든 시안부터 보여요"
        >
          시안 비교로 보기
        </Btn>
        {busy ? (
          <Btn
            tone="danger"
            disabled={stopping}
            onClick={() => void stop()}
            title="지금 만드는 시안을 멈추고, 기다리는 시안은 만들지 않아요. 그때까지 고친 것은 남아요"
          >
            시안 만들기 멈추기
          </Btn>
        ) : null}
      </div>
      {error ? <Note tone="danger">{error}</Note> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {group.members.map((m) => {
          const slot = slotState(m);
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ minWidth: 0, fontSize: 12 }}>
                  <b>{variantName(m)}</b>{" "}
                  <span
                    style={{
                      color:
                        slot.tone === "failed"
                          ? shellColor.danger
                          : slot.tone === "busy"
                            ? shellColor.notice
                            : shellColor.muted,
                    }}
                  >
                    {slot.label}
                  </span>
                  {m.summaryLine ? (
                    <span
                      title={m.summaryLine}
                      style={{
                        display: "block",
                        color: shellColor.muted,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.summaryLine}
                    </span>
                  ) : null}
                </span>
                <Btn
                  style={{ flex: "none", fontSize: 12, padding: "3px 8px" }}
                  onClick={() => setOpen(open === m.id ? null : m.id)}
                >
                  {open === m.id ? "접기" : "자세히"}
                </Btn>
              </div>
              {open === m.id ? (
                <WorkspaceCard
                  client={client}
                  workspace={m}
                  status={status}
                  showContinue
                  onChanged={onChanged}
                  onOpenPreview={onOpenPreview}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
