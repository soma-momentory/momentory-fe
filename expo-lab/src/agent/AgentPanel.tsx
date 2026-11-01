/**
 * 「AI에게 맡기기」 — 지금 보는 화면을 Claude Code 또는 Codex 에게 고치게 한다(Lab 셸 안의 DOM 패널).
 *
 * - 패널을 여는 것만으로는 아무것도 만들지 않는다. 그 화면에서 **처음 「AI에게 수정 맡기기」를 누를 때** 서버가
 *   이 화면용 작업 공간(저장소 바깥 git worktree + 작업 이름(브랜치) + 수정 결과 화면)을 만든다.
 * - AI 는 작업 공간에서 고치고 검사까지만 한다. 수정 저장(커밋) · 검토 요청 올리기(PR)는 사용자가 누른다.
 * - AI 실행은 Lab 전체에서 한 번에 하나다.
 *
 * 셸 연결: `<AgentPanel screen={…} draft={…} hasReference={…} buildHandoff={…} />` — README 「AI에게 맡기기」 참고.
 */
import { useMemo, useRef, useState } from "react";

import { shellColor } from "../shell/theme";
import { AttachmentPicker, toPayload } from "./AttachmentPicker";
import { defaultAgentClient, type AgentClient } from "./client";
import { askNotificationPermission } from "./notify";
import type { AgentId, Attachment, WorkspaceSummary } from "./types";
import { boxStyle, Btn, Chip, inputStyle, Note, panelStyle, smallStyle } from "./ui";
import { useAgentStatus } from "./useAgentStatus";
import { AGENT_LABEL, statusText, WorkspaceCard } from "./WorkspaceCard";

export type AgentScreen = {
  route: string;
  title: string;
  file: string;
  specId?: string | null;
  device: { label: string; platform: string };
  datasetLabel: string;
};

export type AgentPanelProps = {
  screen: AgentScreen;
  draft: { name: string; changeCount: number } | null;
  hasReference: boolean;
  /** 지금 시안을 `momentory-lab-handoff@1` 로 — 디자인 편집기의 「AI에게 넘기기」 내보내기와 같은 것 */
  buildHandoff?: () => Promise<object | null>;
  client?: AgentClient;
  /** 「수정 결과 보기」를 셸이 B 자리에 띄우려면 받는다(없으면 새 탭) */
  onOpenPreview?: (url: string, workspace: WorkspaceSummary) => void;
  /** 다른 화면의 작업으로 가기(셸이 그 화면을 연다) */
  onOpenWorkspace?: (workspace: WorkspaceSummary) => void;
};

export const INSTRUCTION_LABEL = "지시: ";

/** 지시 칸에 미리 채우는 머리말 — 사용자가 고칠 수 있다. 커서는 마지막 「지시: 」 뒤. */
export function buildInstructionHeader(
  screen: AgentScreen,
  draft: AgentPanelProps["draft"],
  hasReference: boolean,
) {
  const spec = screen.specId ? ` (${screen.specId})` : "";
  return [
    `[화면] ${screen.title}${spec} · ${screen.route}`,
    `[파일] ${screen.file}`,
    `[환경] ${screen.device.label} (${screen.device.platform}) · 데이터 ${screen.datasetLabel}`,
    draft
      ? `[시안] 「${draft.name}」 바꾼 값 ${draft.changeCount}개 · 참고 시안 이미지 ${hasReference ? "있음" : "없음"}`
      : `[시안] 없음 · 참고 시안 이미지 ${hasReference ? "있음" : "없음"}`,
    INSTRUCTION_LABEL,
  ].join("\n");
}

/** 「지시:」 뒤에 적은 말 */
export const instructionBody = (text: string) => {
  const at = text.lastIndexOf(INSTRUCTION_LABEL.trim());
  return (at >= 0 ? text.slice(at + INSTRUCTION_LABEL.trim().length) : text).trim();
};

export function AgentPanel({
  screen,
  draft,
  hasReference,
  buildHandoff,
  client = defaultAgentClient,
  onOpenPreview,
  onOpenWorkspace,
}: AgentPanelProps) {
  const { status, error: statusError, refresh } = useAgentStatus(client);
  const header = useMemo(
    () => buildInstructionHeader(screen, draft, hasReference),
    [screen, draft, hasReference],
  );
  /** 사용자가 고친 글 — null 이면 머리말 그대로(시안 · 화면이 바뀌면 머리말이 따라간다) */
  const [edited, setEdited] = useState<string | null>(null);
  const [picked, setPicked] = useState<AgentId>("claude");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openOther, setOpenOther] = useState<string | null>(null);
  const [seenRoute, setSeenRoute] = useState(screen.route);
  const othersRef = useRef<HTMLDetailsElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 화면이 바뀌면 머리말부터 다시(렌더 중 이전 값과 견주는 React 권장 방식 — effect 로 setState 하지 않는다)
  if (seenRoute !== screen.route) {
    setSeenRoute(screen.route);
    setEdited(null);
    setFiles([]);
    setError(null);
  }
  const text = edited ?? header;
  const touched = edited !== null;

  // 쓸 수 없는 AI 를 골라 둔 채면 쓸 수 있는 쪽으로
  const agent: AgentId =
    status && !status.available[picked]
      ? status.available.claude
        ? "claude"
        : status.available.codex
          ? "codex"
          : picked
      : picked;
  const setAgent = setPicked;

  const workspace =
    status?.workspaces.find((w) => w.kind === "edit" && w.route === screen.route && !w.broken) ??
    null;
  const others = (status?.workspaces ?? []).filter((w) => w.id !== workspace?.id);
  const active = status?.activeRun ?? null;
  const otherActive = active && active.workspaceId !== workspace?.id ? active : null;
  const busyHere = workspace?.status === "working" || workspace?.status === "checking";
  const nothing = !instructionBody(text) && !draft && files.length === 0;
  const unavailable = status ? !status.available[agent] : true;

  const disabledReason = !status
    ? null
    : !status.available.claude && !status.available.codex
      ? "이 PC 에서 Claude Code · Codex 를 찾지 못했어요"
      : otherActive
        ? `다른 화면(${otherActive.title})에서 AI가 작업 중이에요`
        : workspace?.status === "working"
          ? "AI 가 아직 고치는 중이에요"
          : workspace?.status === "checking"
            ? "저장 전 검사가 도는 중이에요"
            : null;

  const send = async () => {
    setError(null);
    askNotificationPermission();
    setSending(true);
    const handoff = draft && buildHandoff ? await buildHandoff().catch(() => null) : null;
    const res = await client.run({
      agent,
      target: {
        kind: "edit",
        route: screen.route,
        title: screen.title,
        file: screen.file,
        specId: screen.specId ?? null,
      },
      instruction: text,
      handoff,
      attachments: toPayload(files),
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setEdited(null);
    setFiles([]);
    await refresh();
  };

  const placeCursor = () => {
    const el = inputRef.current;
    if (!el || touched) return;
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  const goToActive = () => {
    if (!otherActive) return;
    setOpenOther(otherActive.workspaceId);
    if (othersRef.current) othersRef.current.open = true;
    const ws = status?.workspaces.find((w) => w.id === otherActive.workspaceId);
    if (ws) onOpenWorkspace?.(ws);
  };

  return (
    <div style={panelStyle} aria-label="AI에게 맡기기">
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>AI에게 맡기기</div>
        <Note>
          지금 보는 화면을 Claude 또는 Codex 가 고쳐요. 이 화면용 작업 공간에서 고치고, 저장(커밋) ·
          검토 요청(PR)은 결과를 보고 직접 눌러요.
        </Note>
      </div>

      <div style={boxStyle}>
        <div
          style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}
          role="group"
          aria-label="맡길 AI"
        >
          {(["claude", "codex"] as const).map((id) => (
            <Chip
              key={id}
              selected={agent === id}
              disabled={status ? !status.available[id] : false}
              onClick={() => setAgent(id)}
              title={
                status && !status.available[id]
                  ? `이 PC 에서 ${AGENT_LABEL[id]} 를 찾지 못했어요`
                  : (status?.versions[id] ?? undefined)
              }
            >
              {AGENT_LABEL[id]}
            </Chip>
          ))}
          <span style={smallStyle}>이 PC 에 로그인된 Claude Code · Codex 로 실행해요</span>
        </div>
        {status &&
        !status.available[agent] &&
        (status.available.claude || status.available.codex) ? (
          <Note>이 PC 에서 {AGENT_LABEL[agent]} 를 찾지 못했어요</Note>
        ) : null}

        <textarea
          ref={inputRef}
          style={{ ...inputStyle, minHeight: 120, lineHeight: 1.5 }}
          value={text}
          aria-label="AI 에게 할 말"
          onFocus={placeCursor}
          onChange={(e) => {
            setEdited(e.target.value);
          }}
        />
        {!draft ? (
          <Note>시안이 없으면 적은 말대로만 고쳐요 — 예: 카드 간격도 시안처럼 넓혀줘</Note>
        ) : null}
        <AttachmentPicker value={files} onChange={setFiles} disabled={sending} />

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Btn
            tone="primary"
            disabled={sending || unavailable || Boolean(disabledReason) || busyHere || nothing}
            onClick={() => void send()}
            title={
              workspace
                ? "같은 작업 공간 · 같은 AI 대화에서 이어서 고쳐요"
                : "이 화면용 작업 공간을 만들고 AI 에게 고치게 해요"
            }
          >
            {sending ? "보내는 중…" : workspace ? "이어서 맡기기" : "AI에게 수정 맡기기"}
          </Btn>
          {nothing && !disabledReason ? (
            <span style={smallStyle}>「지시:」 뒤에 할 말을 적어요</span>
          ) : null}
        </div>
        {disabledReason ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Note>{disabledReason}</Note>
            {otherActive ? <Btn onClick={goToActive}>그 작업 보기</Btn> : null}
          </div>
        ) : null}
        {!workspace ? <Note>지시를 보내면 이 화면용 작업 공간을 만들어요</Note> : null}
        {!workspace && status?.git.dirty ? (
          <Note>
            작업 공간은 {status.baseBranch} 의 마지막 커밋에서 시작해요 — 이 PC 에서 아직 커밋하지
            않은 변경은 들어가지 않아요
          </Note>
        ) : null}
        {error ? <Note tone="danger">{error}</Note> : null}
        {statusError ? <Note tone="danger">{statusError}</Note> : null}
      </div>

      {workspace ? (
        <WorkspaceCard
          client={client}
          workspace={workspace}
          status={status}
          agent={agent}
          onChanged={() => void refresh()}
          onOpenPreview={onOpenPreview}
        />
      ) : null}
      <Note>코드는 작업 공간에서만 바뀌어요 — 결과는 「수정 결과 보기」에서 확인하세요.</Note>

      {others.length > 0 ? (
        <details ref={othersRef}>
          <summary style={{ cursor: "pointer", fontSize: 12 }}>다른 작업 {others.length}개</summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {others.map((w) => (
              <div key={w.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    {w.kind === "new-screen" ? "새 화면 · " : ""}
                    {w.title}{" "}
                    <span
                      style={{
                        color: w.status === "working" ? shellColor.draft : shellColor.muted,
                        fontSize: 12,
                      }}
                    >
                      {statusText(w)}
                      {w.changedCount > 0 ? ` · 바뀐 파일 ${w.changedCount}개` : ""}
                    </span>
                  </span>
                  <Btn onClick={() => setOpenOther(openOther === w.id ? null : w.id)}>
                    {openOther === w.id ? "접기" : "펼치기"}
                  </Btn>
                </div>
                {openOther === w.id ? (
                  <WorkspaceCard
                    client={client}
                    workspace={w}
                    status={status}
                    showContinue
                    onChanged={() => void refresh()}
                    onOpenPreview={onOpenPreview}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
