/**
 * 「새 화면 만들기」 — 이름 · 들어갈 곳 · 어떤 화면인지 설명 · (선택) 그림을 적어 AI 에게 새 화면을 맡긴다.
 * 보내면 서버가 `lab/new-<영문 이름>-<시각>` 작업 공간을 만들고(지시 없이 만들지 않는다), 그 뒤는 화면 수정과 같은 상태 카드다.
 */
import { useState } from "react";

import { AttachmentPicker, toPayload } from "./AttachmentPicker";
import { defaultAgentClient, type AgentClient } from "./client";
import { askNotificationPermission } from "./notify";
import { NEW_SCREEN_SECTIONS, toSlug, type NewScreenSectionId } from "./sections";
import type { AgentId, Attachment, WorkspaceSummary } from "./types";
import { boxStyle, Btn, Chip, inputStyle, Note, panelStyle, smallStyle } from "./ui";
import { useAgentStatus } from "./useAgentStatus";
import { AGENT_LABEL, WorkspaceCard } from "./WorkspaceCard";

export type NewScreenFormProps = {
  client?: AgentClient;
  /** 작업 공간이 생겼다(셸이 목록 「새 화면(작업 중)」에 올린다) */
  onCreated?: (workspace: WorkspaceSummary) => void;
  onOpenPreview?: (url: string, workspace: WorkspaceSummary) => void;
};

const DESCRIPTION_EXAMPLE =
  "예: 쉼터에서 들어가는 「잠 기록」 화면. 어젯밤 잠든 시각과 깬 시각을 고르고, 아래에 지난 7일을 점으로 보여 준다. 저장 버튼 하나.";

export function NewScreenForm({
  client = defaultAgentClient,
  onCreated,
  onOpenPreview,
}: NewScreenFormProps) {
  const { status, error: statusError, refresh } = useAgentStatus(client);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [section, setSection] = useState<NewScreenSectionId>("other");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [agent, setAgent] = useState<AgentId>("claude");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const created = createdId ? (status?.workspaces.find((w) => w.id === createdId) ?? null) : null;
  const active = status?.activeRun ?? null;
  const cleanSlug = toSlug(slug);
  const unavailable = status ? !status.available[agent] : true;
  const ready = title.trim() && cleanSlug && description.trim();

  const send = async () => {
    setError(null);
    askNotificationPermission();
    setSending(true);
    const res = await client.run({
      agent,
      target: {
        kind: "new-screen",
        slug: cleanSlug,
        title: title.trim(),
        parentSection: section,
        description,
      },
      attachments: toPayload(files),
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setCreatedId(res.data.workspace.id);
    onCreated?.(res.data.workspace);
    await refresh();
  };

  if (created) {
    return (
      <div style={panelStyle} aria-label="새 화면 만들기">
        <div style={{ fontSize: 15, fontWeight: 700 }}>새 화면 만들기</div>
        <WorkspaceCard
          client={client}
          workspace={created}
          status={status}
          agent={agent}
          showContinue
          onChanged={() => void refresh()}
          onOpenPreview={onOpenPreview}
        />
        <Btn onClick={() => setCreatedId(null)}>다른 새 화면 만들기</Btn>
      </div>
    );
  }

  return (
    <div style={panelStyle} aria-label="새 화면 만들기">
      <div>
        <div style={{ fontSize: 15, fontWeight: 700 }}>새 화면 만들기</div>
        <Note>
          어떤 화면인지 적으면 AI 가 새 화면을 만들어요. 결과를 보고 저장(커밋) · 검토 요청(PR)은
          직접 눌러요.
        </Note>
      </div>
      <div style={boxStyle}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>화면 이름 (꼭)</span>
          <input
            style={inputStyle}
            value={title}
            aria-label="화면 이름"
            placeholder="예: 잠 기록"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>
            영문 이름 (꼭) <span style={smallStyle}>— 화면 주소 · 파일 이름에 쓰여요</span>
          </span>
          <input
            style={inputStyle}
            value={slug}
            aria-label="영문 이름"
            placeholder="예: sleep-log"
            onChange={(e) => setSlug(e.target.value)}
          />
          {slug && cleanSlug !== slug ? (
            <span style={smallStyle}>
              이렇게 쓰여요: {cleanSlug || "(영문 · 숫자로 적어 주세요)"}
            </span>
          ) : null}
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>들어갈 곳</span>
          <div
            style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
            role="group"
            aria-label="들어갈 곳"
          >
            {NEW_SCREEN_SECTIONS.map((s) => (
              <Chip key={s.id} selected={section === s.id} onClick={() => setSection(s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>어떤 화면인지</span>
          <textarea
            style={{ ...inputStyle, minHeight: 110, lineHeight: 1.5 }}
            value={description}
            aria-label="어떤 화면인지"
            placeholder={DESCRIPTION_EXAMPLE}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <AttachmentPicker value={files} onChange={setFiles} disabled={sending} />

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
            >
              {AGENT_LABEL[id]}
            </Chip>
          ))}
          <span style={smallStyle}>이 PC 에 로그인된 Claude Code · Codex 로 실행해요</span>
        </div>
        <Btn
          tone="primary"
          disabled={sending || unavailable || Boolean(active) || !ready}
          onClick={() => void send()}
          title="새 화면용 작업 공간을 만들고 AI 에게 만들게 해요"
        >
          {sending ? "보내는 중…" : "AI에게 새 화면 만들기 맡기기"}
        </Btn>
        {active ? <Note>다른 화면({active.title})에서 AI가 작업 중이에요</Note> : null}
        {!ready ? (
          <span style={smallStyle}>화면 이름 · 영문 이름 · 어떤 화면인지를 적어요</span>
        ) : null}
        {error ? <Note tone="danger">{error}</Note> : null}
        {statusError ? <Note tone="danger">{statusError}</Note> : null}
      </div>
    </div>
  );
}
