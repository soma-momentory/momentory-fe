/**
 * 작업 공간 하나의 상태 카드 — 진행 기록 · 결과 · 바뀐 파일 · 수정 결과 보기 · 수정 저장(커밋) · 검토 요청 올리기(PR) · 이 작업 버리기.
 * 화면 수정과 새 화면 만들기가 같은 카드를 쓴다.
 *
 * 「수정 저장(커밋)」은 저장 **전에** 저장소의 검사(typecheck · lint · test · Codex 리뷰 — `.claude/hooks/codex-review.mjs`)를
 * 한 번 돌린다. 지적이 나오면 「AI에게 고치게 하기」 · 「그래도 저장」 · 「취소」 중에서 고른다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { shellColor } from "../shell/theme";
import { AttachmentPicker, toPayload } from "./AttachmentPicker";
import type { AgentClient } from "./client";
import { askNotificationPermission, notifyRunEnded } from "./notify";
import type {
  AgentId,
  AgentStatus,
  Attachment,
  CheckState,
  RunLine,
  RunSnapshot,
  WorkspaceDetail,
  WorkspaceStatus,
  WorkspaceSummary,
} from "./types";
import { boxStyle, Btn, inputStyle, Note, smallStyle, Title } from "./ui";

export const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  working: "AI가 고치는 중",
  checking: "저장 전 검사 중",
  edited: "수정됨 · 저장 전",
  committed: "저장됨 · 검토 요청 전",
  pr: "검토 요청 올림",
  fresh: "아직 바뀐 것 없음",
};

export const AGENT_LABEL: Record<AgentId, string> = { claude: "Claude Code", codex: "Codex" };

export const statusText = (ws: Pick<WorkspaceSummary, "status" | "pr">) =>
  ws.status === "pr" && ws.pr?.number
    ? `${STATUS_LABEL.pr} #${ws.pr.number}`
    : STATUS_LABEL[ws.status];

const FIX_PREFIX =
  "저장 전 검사(typecheck · lint · test · Codex 리뷰)에서 나온 지적을 고쳐 줘. 지적이 틀렸다고 판단하면 고치지 말고 근거를 summary 에 적는다.\n\n";

const formatElapsed = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;
};

/** 기록 줄을 묶는다 — 도구 · stderr 는 접어 두고 글은 펼친다. */
function groupLines(lines: readonly RunLine[]) {
  const groups: (
    { kind: "text" | "error" | "result"; line: RunLine } | { kind: "tools"; lines: RunLine[] }
  )[] = [];
  for (const line of lines) {
    if (line.kind === "tool" || line.kind === "stderr") {
      const last = groups.at(-1);
      if (last && last.kind === "tools") last.lines.push(line);
      else groups.push({ kind: "tools", lines: [line] });
    } else groups.push({ kind: line.kind, line });
  }
  return groups;
}

function RunLog({ lines }: { lines: readonly RunLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);
  const groups = useMemo(() => groupLines(lines), [lines]);
  if (lines.length === 0) return <Note>아직 기록이 없어요</Note>;
  return (
    <div
      ref={ref}
      aria-label="진행 기록"
      style={{
        maxHeight: 260,
        overflowY: "auto",
        border: `1px solid ${shellColor.border}`,
        borderRadius: 8,
        padding: 8,
        background: shellColor.page,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 12,
        lineHeight: 1.5,
      }}
    >
      {groups.map((g) =>
        g.kind === "tools" ? (
          <details key={`t${g.lines[0]?.seq}`}>
            <summary style={{ cursor: "pointer", color: shellColor.muted }}>
              한 일 {g.lines.length}개 — {g.lines.at(-1)?.text.slice(0, 60)}
            </summary>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                color: shellColor.muted,
                whiteSpace: "pre-wrap",
              }}
            >
              {g.lines.map((l) => (
                <div key={l.seq}>{l.text}</div>
              ))}
            </div>
          </details>
        ) : (
          <div
            key={g.line.seq}
            style={{
              whiteSpace: "pre-wrap",
              color:
                g.kind === "error"
                  ? shellColor.danger
                  : g.kind === "result"
                    ? shellColor.accent
                    : shellColor.ink,
            }}
          >
            {g.line.text}
          </div>
        ),
      )}
    </div>
  );
}

function ResultView({ run }: { run: RunSnapshot }) {
  const r = run.result;
  if (run.status === "running") return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {run.status === "failed" ? (
        <Note tone="danger">{run.error ?? "AI 가 끝까지 하지 못했어요"}</Note>
      ) : null}
      {run.status === "stopped" ? <Note>멈췄어요 — 그때까지 고친 것은 남아 있어요</Note> : null}
      {r?.summary || run.summary ? (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{r?.summary ?? run.summary}</div>
      ) : null}
      {r && r.skipped.length > 0 ? (
        <div>
          <Title>하지 않은 것</Title>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {r.skipped.map((s, i) => (
              <li key={i}>
                {s.request} — <span style={{ color: shellColor.muted }}>{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {r && r.neededImages.length > 0 ? (
        <div>
          <Title>더 필요한 그림</Title>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {r.neededImages.map((s, i) => (
              <li key={i}>
                {s.what} · {s.size} · <span style={{ color: shellColor.muted }}>{s.where}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {r && r.neededApis.length > 0 ? (
        <div>
          <Title>서버에 더 필요한 데이터(API)</Title>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {r.neededApis.map((s, i) => (
              <li key={i}>
                <code>
                  {s.method} {s.path}
                </code>{" "}
                <span style={{ color: shellColor.muted }}>
                  보냄 {s.request || "-"} · 받음 {s.response || "-"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export type WorkspaceCardProps = {
  client: AgentClient;
  workspace: WorkspaceSummary;
  status: AgentStatus | null;
  /** 이어서 맡길 AI(고른 것). 없으면 이 작업 공간이 쓰던 AI */
  agent?: AgentId;
  /** 카드 안에 「이어서 맡기기」 칸을 둘지(화면 수정 패널은 위의 지시 칸을 쓴다) */
  showContinue?: boolean;
  /** 상태가 바뀌었다 — 부모가 목록을 다시 읽는다 */
  onChanged: () => void;
  /** 「수정 결과 보기」 — 셸이 B 자리에 띄우려면 받는다. 없으면 새 탭 */
  onOpenPreview?: (url: string, workspace: WorkspaceSummary) => void;
};

export function WorkspaceCard({
  client,
  workspace,
  status,
  agent,
  showContinue = false,
  onChanged,
  onOpenPreview,
}: WorkspaceCardProps) {
  const id = workspace.id;
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  /** 기록 줄 — 어느 실행의 것인지와 함께(실행이 바뀌면 새로 쌓는다) */
  const [log, setLog] = useState<{ runId: string | null; lines: RunLine[] }>({
    runId: null,
    lines: [],
  });
  const [run, setRun] = useState<RunSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "commit" | "pr" | "remove" | "preview" | "continue">(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState<string | null>(null);
  const [prBody, setPrBody] = useState<string | null>(null);
  const [base, setBase] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckState | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [more, setMore] = useState("");
  const [moreFiles, setMoreFiles] = useState<Attachment[]>([]);
  const wasRunning = useRef(false);

  const reload = useCallback(async () => {
    const res = await client.workspace(id);
    if (res.ok) {
      setDetail(res.data);
      if (res.data.check) setCheck(res.data.check);
      const latest = res.data.run;
      if (latest)
        setRun((prev) =>
          !prev || prev.id !== latest.id || latest.status !== "running" ? latest : prev,
        );
    }
  }, [client, id]);

  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload, workspace.status, workspace.changedCount, workspace.commitCount]);

  const runId = detail?.run?.id ?? null;
  const lines = log.runId === runId ? log.lines : [];
  useEffect(() => {
    if (!runId) return;
    const off = client.subscribe(id, 0, {
      onLine: (line) =>
        setLog((prev) =>
          prev.runId !== runId
            ? { runId, lines: [line] }
            : prev.lines.some((l) => l.seq === line.seq)
              ? prev
              : { runId, lines: [...prev.lines, line] },
        ),
      onRun: (snapshot) => {
        setRun(snapshot);
        if (snapshot.status === "running") wasRunning.current = true;
        else if (wasRunning.current) {
          wasRunning.current = false;
          notifyRunEnded({
            title: workspace.title,
            ok: snapshot.status === "done",
            body:
              snapshot.status === "done"
                ? (snapshot.result?.summary ?? snapshot.summary ?? "").slice(0, 120)
                : (snapshot.error ?? "멈췄어요"),
          });
          void reload();
          onChanged();
        }
      },
    });
    return off;
  }, [client, id, runId, reload, onChanged, workspace.title]);

  const running = run?.status === "running" || workspace.status === "working";
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const commitMessage = message ?? detail?.blocks.commitMessage ?? "";
  const doCommit = useCallback(async () => {
    setBusy("commit");
    const res = await client.commit(id, commitMessage);
    setBusy(null);
    setCheck(null);
    if (!res.ok) return setError(res.error);
    setError(null);
    setNotice(`저장했어요 — ${res.data.commit.sha} ${res.data.commit.subject}`);
    await reload();
    onChanged();
  }, [client, id, commitMessage, reload, onChanged]);

  // 검사가 통과(또는 검사를 못 하는 환경이라 건너뜀)하면 바로 저장한다
  const autoCommit = useRef(false);
  const settleCheck = useCallback(
    (next: CheckState) => {
      setCheck(next);
      if (next.status === "running" || !autoCommit.current) return;
      autoCommit.current = false;
      if (next.status === "pass" || next.status === "skipped") void doCommit();
    },
    [doCommit],
  );

  // 검사 중이면 1.5초마다 다시 본다
  useEffect(() => {
    if (check?.status !== "running") return;
    const timer = setInterval(async () => {
      const res = await client.check(id);
      if (res.ok && res.data.check) settleCheck(res.data.check);
    }, 1500);
    return () => clearInterval(timer);
  }, [client, id, check?.status, settleCheck]);

  const startCommit = async () => {
    setError(null);
    setNotice(null);
    if (!commitMessage.trim()) return setError("저장 메시지를 적어 주세요");
    const res = await client.startCheck(id);
    if (!res.ok) return setError(res.error);
    autoCommit.current = true;
    settleCheck(res.data.check);
  };

  const continueWith = async (instruction: string, files: readonly Attachment[] = []) => {
    const who = agent ?? workspace.session?.agent ?? "claude";
    askNotificationPermission();
    setBusy("continue");
    const res = await client.continueRun(id, {
      agent: who,
      instruction,
      attachments: toPayload(files),
    });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setError(null);
    setCheck(null);
    setMore("");
    setMoreFiles([]);
    wasRunning.current = true;
    await reload();
    onChanged();
  };

  const openPreview = async () => {
    const preview = workspace.preview;
    if (preview?.ready && preview.url) {
      if (onOpenPreview) onOpenPreview(preview.url, workspace);
      else window.open(preview.url, "_blank", "noopener");
      return;
    }
    setBusy("preview");
    const res = await client.startPreview(id);
    setBusy(null);
    if (!res.ok) return setError(res.error);
    onChanged();
  };

  const remove = async () => {
    setBusy("remove");
    const res = await client.remove(id);
    setBusy(null);
    setConfirmRemove(false);
    if (!res.ok) return setError(res.error);
    onChanged();
  };

  const changes = detail?.changes;
  const latestSubject = changes?.commits[0]?.subject ?? "";
  const title = prTitle ?? latestSubject;
  const body = prBody ?? detail?.blocks.prBody ?? "";
  const baseOptions = detail?.baseOptions ?? [status?.baseBranch ?? "main"];
  const chosenBase = base ?? status?.baseBranch ?? baseOptions[0] ?? "main";
  const otherActive =
    status?.activeRun && status.activeRun.workspaceId !== id ? status.activeRun : null;
  const startedAt = run?.startedAt ?? 0;
  const preview = workspace.preview;

  const submitPr = async () => {
    setBusy("pr");
    const res = await client.pr(id, { title, body, base: chosenBase });
    setBusy(null);
    if (!res.ok) return setError(res.error);
    setError(null);
    setNotice(res.data.pushedOnly ? "검토 요청에 새 저장을 더했어요" : "검토 요청을 올렸어요");
    onChanged();
  };

  return (
    <section aria-label={`${workspace.title} 작업`} style={boxStyle}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}
      >
        <div style={{ fontWeight: 700 }}>
          {workspace.kind === "new-screen" ? "새 화면 · " : ""}
          {workspace.title}
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: running ? shellColor.draft : shellColor.accent,
          }}
        >
          {statusText(workspace)}
        </div>
      </div>
      <div style={smallStyle} title="이 작업만의 git 브랜치 이름이에요">
        작업 이름 {workspace.branch} · {workspace.baseBranch} 에서 시작
      </div>
      {workspace.broken ? <Note tone="danger">{workspace.broken}</Note> : null}

      {running ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Note tone="accent">
            {AGENT_LABEL[run?.agent ?? workspace.lastRun?.agent ?? "claude"]} 가 고치는 중 ·{" "}
            {formatElapsed(now - startedAt)}
          </Note>
          <Btn
            tone="danger"
            onClick={() => void client.stop(id)}
            title="AI 를 멈춰요. 그때까지 고친 것은 남아요"
          >
            AI 멈추기
          </Btn>
        </div>
      ) : null}
      {runId ? <RunLog lines={lines} /> : null}
      {run ? <ResultView run={run} /> : null}

      {/* 수정 결과 보기 */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn
          tone={preview?.ready ? "primary" : "plain"}
          disabled={busy === "preview" || preview?.status === "starting"}
          onClick={() => void openPreview()}
          title="이 작업 공간의 앱을 따로 띄운 Lab 에서 고친 결과를 봐요"
        >
          {preview?.ready
            ? "수정 결과 보기"
            : preview?.status === "starting"
              ? "수정 결과 화면 준비 중…"
              : "수정 결과 화면 켜기"}
        </Btn>
        {preview?.url ? <span style={smallStyle}>{preview.url}</span> : null}
        {preview?.status === "failed" && preview.error ? (
          <Note tone="danger">{preview.error}</Note>
        ) : null}
      </div>
      {workspace.newRoutes.length > 0 ? (
        <div style={smallStyle}>새 화면 주소: {workspace.newRoutes.join(" · ")}</div>
      ) : null}

      {/* 바뀐 파일 */}
      {changes && changes.fileCount > 0 ? (
        <details>
          <summary style={{ cursor: "pointer" }}>바뀐 파일 {changes.fileCount}개</summary>
          <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 12 }}>
            {changes.files.map((f) => (
              <li key={f.path}>
                <span style={{ color: shellColor.muted }}>
                  {f.status === "??" ? "새 파일" : f.status === "D" ? "지움" : "고침"}
                </span>{" "}
                {f.path}
              </li>
            ))}
          </ul>
          {changes.diffStat ? (
            <pre
              style={{ fontSize: 11, color: shellColor.muted, whiteSpace: "pre-wrap", margin: 0 }}
            >
              {changes.diffStat}
            </pre>
          ) : null}
        </details>
      ) : null}
      {changes && changes.newAssets.length > 0 ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="새 그림">
          {changes.newAssets.map((p) => (
            <figure key={p} style={{ margin: 0, width: 72 }}>
              <img
                src={client.imageUrl(id, p)}
                alt={p}
                style={{
                  width: 72,
                  height: 72,
                  objectFit: "contain",
                  border: `1px solid ${shellColor.border}`,
                  borderRadius: 6,
                }}
              />
              <figcaption
                style={{
                  ...smallStyle,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.split("/").at(-1)}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      {/* 이어서 맡기기(새 화면 · 다른 화면 카드) */}
      {showContinue ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <textarea
            style={{ ...inputStyle, minHeight: 56 }}
            value={more}
            aria-label="이어서 맡길 말"
            placeholder="이어서 맡길 말 — 예: 제목을 조금 더 크게"
            disabled={running}
            onChange={(e) => setMore(e.target.value)}
          />
          <AttachmentPicker value={moreFiles} onChange={setMoreFiles} disabled={running} />
          <Btn
            tone="primary"
            disabled={
              running ||
              busy === "continue" ||
              Boolean(otherActive) ||
              (!more.trim() && moreFiles.length === 0)
            }
            onClick={() => void continueWith(more, moreFiles)}
            title="같은 작업 공간 · 같은 AI 대화에서 이어서 고쳐요"
          >
            이어서 맡기기
          </Btn>
          {otherActive ? <Note>다른 화면({otherActive.title})에서 AI가 작업 중이에요</Note> : null}
        </div>
      ) : null}

      {/* 수정 저장(커밋) */}
      {changes && changes.fileCount > 0 && !running ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Title>수정 저장(커밋)</Title>
          <textarea
            style={{ ...inputStyle, minHeight: 80, fontFamily: "monospace", fontSize: 12 }}
            value={commitMessage}
            aria-label="저장 메시지"
            placeholder="feat: 무엇을 했는지 한 줄 — 빈 줄 — 왜 했는지"
            onChange={(e) => setMessage(e.target.value)}
          />
          {check?.status === "running" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Note tone="accent">
                저장 전 검사 중 — typecheck · lint · test · Codex 리뷰 (몇 분 걸려요)
              </Note>
              <Btn
                onClick={() => void client.stopCheck(id).then(() => (autoCommit.current = false))}
              >
                검사 멈추기
              </Btn>
            </div>
          ) : check?.status === "findings" ||
            check?.status === "failed" ||
            check?.status === "stopped" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Note tone="danger">
                {check.status === "findings"
                  ? "저장 전 검사에서 고칠 것이 나왔어요"
                  : (check.message ?? "검사를 마치지 못했어요")}
              </Note>
              {check.findings ? (
                <pre
                  aria-label="검사 지적"
                  style={{
                    fontSize: 11,
                    whiteSpace: "pre-wrap",
                    maxHeight: 220,
                    overflowY: "auto",
                    margin: 0,
                    background: shellColor.page,
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  {check.findings}
                </pre>
              ) : null}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {check.findings ? (
                  <Btn
                    tone="primary"
                    disabled={Boolean(otherActive)}
                    onClick={() => void continueWith(FIX_PREFIX + check.findings)}
                    title="지적 목록을 붙여 같은 AI 대화에서 고치게 해요"
                  >
                    AI에게 고치게 하기
                  </Btn>
                ) : null}
                <Btn
                  onClick={() => void doCommit()}
                  disabled={busy === "commit"}
                  title="지적을 두고 지금 그대로 저장해요"
                >
                  그래도 저장
                </Btn>
                <Btn onClick={() => setCheck(null)}>취소</Btn>
              </div>
            </div>
          ) : (
            <Btn
              tone="primary"
              disabled={busy === "commit" || !commitMessage.trim()}
              onClick={() => void startCommit()}
              title="저장소 검사를 한 번 돌린 뒤, 통과하면 이 작업 이름(브랜치)에 저장해요"
            >
              수정 저장(커밋)
            </Btn>
          )}
        </div>
      ) : null}

      {/* 검토 요청 올리기(PR) */}
      {changes && changes.commits.length > 0 && !running ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Title>검토 요청 올리기(PR)</Title>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {changes.commits.map((c) => (
              <li key={c.sha}>
                <span style={{ color: shellColor.muted }}>{c.sha}</span> {c.subject}
              </li>
            ))}
          </ul>
          {workspace.pr ? (
            <a
              href={workspace.pr.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: shellColor.accent, fontSize: 12 }}
            >
              검토 요청 {workspace.pr.number ? `#${workspace.pr.number}` : ""} 열기
            </a>
          ) : (
            <>
              <input
                style={inputStyle}
                value={title}
                aria-label="검토 요청 제목"
                onChange={(e) => setPrTitle(e.target.value)}
              />
              <textarea
                style={{ ...inputStyle, minHeight: 100, fontSize: 12 }}
                value={body}
                aria-label="검토 요청 본문"
                onChange={(e) => setPrBody(e.target.value)}
              />
              <label style={{ ...smallStyle, display: "flex", gap: 6, alignItems: "center" }}>
                올릴 곳
                <select
                  value={chosenBase}
                  onChange={(e) => setBase(e.target.value)}
                  aria-label="올릴 곳"
                  style={{ ...inputStyle, width: "auto" }}
                >
                  {baseOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <Btn
            tone={workspace.pr ? "plain" : "primary"}
            disabled={
              busy === "pr" ||
              changes.fileCount > 0 ||
              (!workspace.pr && !title.trim()) ||
              status?.available.gh === false
            }
            onClick={() => void submitPr()}
            title={
              workspace.pr
                ? "새로 저장한 수정을 같은 검토 요청에 더해요"
                : "GitHub 에 올리고 검토 요청(PR)을 만들어요. 합치기(머지)는 하지 않아요"
            }
          >
            {workspace.pr ? "검토 요청에 새 저장 더하기" : "검토 요청 올리기(PR)"}
          </Btn>
          {changes.fileCount > 0 ? (
            <Note>저장하지 않은 수정이 있어요 — 먼저 「수정 저장(커밋)」을 눌러요</Note>
          ) : null}
          {status?.available.gh === false ? (
            <Note>이 PC 에서 gh(GitHub CLI)를 찾지 못했어요</Note>
          ) : null}
        </div>
      ) : null}

      {notice ? <Note tone="accent">{notice}</Note> : null}
      {error ? <Note tone="danger">{error}</Note> : null}

      {/* 이 작업 버리기 */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        {confirmRemove ? (
          <>
            <Note tone="danger">
              저장하지 않은 수정과 이 작업 공간이 사라져요. 저장(커밋)한 것은 작업 이름에 남아요.
            </Note>
            <Btn tone="danger" disabled={busy === "remove"} onClick={() => void remove()}>
              버리기
            </Btn>
            <Btn onClick={() => setConfirmRemove(false)}>그만두기</Btn>
          </>
        ) : (
          <Btn
            tone="danger"
            onClick={() => setConfirmRemove(true)}
            title="이 화면의 작업 공간 · 수정 결과 화면을 지워요"
          >
            이 작업 버리기
          </Btn>
        )}
      </div>
    </section>
  );
}
