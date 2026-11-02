/**
 * 최종 A/B 의 결정 줄 — 시안 비교에서 「이 시안 고르기」로 B 에 띄운 시안을 **확정**하거나 다른 시안으로 돌아간다.
 *
 * 「이 시안으로 확정」 = 그 시안 작업 공간의 저장 · 검토 요청을 한 번에 — 서버의 같은 길을 그대로 쓴다
 * (저장 전 검사 `POST …/check` → 통과하면 `POST …/commit` → `POST …/pr`). 지적이 나오면 목록과 「그래도 확정」 ·
 * 「그만두기」. 합치기(머지)는 하지 않는다. 확정한 뒤에는 「나머지 시안 버리기」(`DELETE /variants/:group?keep=`)를
 * 줄 안의 확인(브라우저 대화 상자 없이)을 거쳐 연다.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { shellColor } from "../shell/theme";
import type { AgentClient } from "./client";
import type { CheckState, WorkspaceDetail, WorkspaceSummary } from "./types";
import { Btn, inputStyle, Note, smallStyle } from "./ui";
import { variantName, type VariantGroupView } from "./variants";

type Phase = "idle" | "form" | "checking" | "findings" | "committing" | "pr" | "done";

const CHECK_POLL_MS = 1500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function VariantDecision({
  client,
  workspace,
  group,
  baseBranch,
  onChanged,
  onBack,
}: {
  client: AgentClient;
  /** 고른 시안(작업 공간 목록의 최신 값) — 아직 못 읽었으면 null */
  workspace: WorkspaceSummary | null;
  group: VariantGroupView | null;
  baseBranch: string;
  /** 저장 · 검토 요청 · 버리기 뒤 — 셸이 작업 공간 목록을 다시 읽는다 */
  onChanged: () => void;
  /** 「다른 시안 다시 보기」 */
  onBack: () => void;
}) {
  const id = workspace?.id ?? null;
  const [phase, setPhase] = useState<Phase>("idle");
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [prTitle, setPrTitle] = useState<string | null>(null);
  const [prBody, setPrBody] = useState<string | null>(null);
  const [check, setCheck] = useState<CheckState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pr, setPr] = useState<{ number: number | null; url: string } | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [discarded, setDiscarded] = useState(false);
  const [saved, setSaved] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!id) return null;
    const res = await client.workspace(id);
    if (!res.ok) {
      setError(res.error);
      return null;
    }
    setDetail(res.data);
    return res.data;
  }, [client, id]);

  if (!workspace) return null;
  const name = variantName(workspace);
  const others = (group?.members ?? []).filter((m) => m.id !== workspace.id);
  const confirmed = Boolean(workspace.pr || pr);
  // 저장까지 됐으면(검토 요청만 못 올렸어도) 고른 시안은 남는다 — 나머지를 버려도 된다
  const kept = confirmed || saved || workspace.status === "committed";
  const shownPr = pr ?? workspace.pr;
  const changes = detail?.changes;
  const needsCommit = (changes?.fileCount ?? workspace.changedCount) > 0;
  const commitMessage =
    message ??
    detail?.blocks.commitMessage ??
    `feat: ${workspace.title.replace(/ · /g, " ")} 로 고친다`;
  const title =
    prTitle ?? (changes?.commits[0]?.subject || commitMessage.split("\n")[0]?.trim() || "");
  const body = prBody ?? detail?.blocks.prBody ?? "";
  const working = phase === "checking" || phase === "committing" || phase === "pr";

  const openForm = async () => {
    setError(null);
    setPhase("form");
    await load();
  };

  /** 저장(필요하면 검사 → 커밋) → 검토 요청. `skipCheck` 는 지적을 두고 「그래도 확정」 */
  const confirm = async (skipCheck = false) => {
    if (!id) return;
    setError(null);
    const latest = detail ?? (await load());
    if (!latest) return;
    if (latest.changes.fileCount > 0) {
      if (!commitMessage.trim()) return setError("저장 메시지를 적어 주세요");
      if (!skipCheck) {
        setPhase("checking");
        const started = await client.startCheck(id);
        if (!started.ok) {
          setPhase("form");
          return setError(started.error);
        }
        let state: CheckState = started.data.check;
        while (state.status === "running") {
          await sleep(CHECK_POLL_MS);
          if (!alive.current) return;
          const res = await client.check(id);
          if (res.ok && res.data.check) state = res.data.check;
        }
        setCheck(state);
        if (state.status !== "pass" && state.status !== "skipped") return setPhase("findings");
      }
      setPhase("committing");
      const committed = await client.commit(id, commitMessage);
      if (!committed.ok) {
        setPhase("form");
        return setError(committed.error);
      }
      setSaved(true);
    } else if (latest.changes.commits.length === 0 && !workspace.pr) {
      setPhase("form");
      return setError("이 시안에는 바뀐 것이 없어요 — 확정할 수정이 없어요");
    }
    if (!title.trim() && !workspace.pr) {
      setPhase("form");
      return setError("검토 요청 제목을 적어 주세요");
    }
    setPhase("pr");
    const res = await client.pr(id, { title, body, base: baseBranch });
    onChanged();
    if (!res.ok) {
      // 저장은 됐다 — 검토 요청만 못 올렸다(gh 없음 · 네트워크). 그 한 줄을 남기고 나머지 버리기는 연다
      setPhase("form");
      return setError(`저장은 했어요. 검토 요청은 못 올렸어요: ${res.error}`);
    }
    setPr(res.data.pr);
    setPhase("done");
  };

  const stopCheck = async () => {
    if (id) await client.stopCheck(id);
  };

  const discardOthers = async () => {
    if (!group || !id) return;
    setDiscarding(true);
    const res = await client.discardOtherVariants(group.id, id);
    setDiscarding(false);
    setConfirmDiscard(false);
    if (!res.ok) return setError(res.error);
    setDiscarded(true);
    onChanged();
  };

  return (
    <div
      data-testid="variant-decision"
      style={{
        display: "grid",
        gap: 8,
        borderTop: `1px solid ${shellColor.border}`,
        paddingTop: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Btn
          onClick={onBack}
          title="지금 앱과 시안들을 다시 한 줄에 나란히 띄워요"
          style={{ fontSize: 12, padding: "4px 10px" }}
        >
          ← 다른 시안 다시 보기
        </Btn>
        {confirmed ? (
          <span data-testid="variant-confirmed" style={{ fontSize: 12, color: shellColor.accent }}>
            확정했어요 — {name}
            {shownPr ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={shownPr.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: shellColor.accent }}
                >
                  검토 요청 {shownPr.number ? `#${shownPr.number}` : ""} 열기
                </a>
              </>
            ) : (
              " · 검토 요청은 아직이에요"
            )}
          </span>
        ) : phase === "idle" ? (
          <Btn
            tone="primary"
            onClick={() => void openForm()}
            title="이 시안의 수정을 저장(커밋)하고 검토 요청(PR)을 올려요. 합치기(머지)는 하지 않아요"
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            이 시안으로 확정
          </Btn>
        ) : null}
        {kept && others.length > 0 && !discarded && !confirmDiscard ? (
          <Btn
            tone="danger"
            onClick={() => setConfirmDiscard(true)}
            title="고르지 않은 시안의 작업 공간과 수정 결과 화면을 지워요"
            style={{ fontSize: 12, padding: "4px 10px" }}
          >
            나머지 시안 버리기
          </Btn>
        ) : null}
        {discarded ? <span style={smallStyle}>나머지 시안을 버렸어요</span> : null}
      </div>

      {confirmDiscard ? (
        <div
          data-testid="variant-discard-confirm"
          style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <Note tone="danger">
            {others.map(variantName).join(" · ")}의 작업 공간과 수정 결과 화면이 사라져요. 저장하지
            않은 수정은 되돌릴 수 없어요.
          </Note>
          <Btn tone="danger" disabled={discarding} onClick={() => void discardOthers()}>
            {discarding ? "버리는 중…" : "버리기"}
          </Btn>
          <Btn onClick={() => setConfirmDiscard(false)}>그만두기</Btn>
        </div>
      ) : null}

      {!confirmed && phase !== "idle" ? (
        <div data-testid="variant-confirm-form" style={{ display: "grid", gap: 6 }}>
          {needsCommit ? (
            <textarea
              style={{ ...inputStyle, minHeight: 54, fontFamily: "monospace", fontSize: 12 }}
              value={commitMessage}
              aria-label="저장 메시지"
              disabled={working}
              onChange={(e) => setMessage(e.target.value)}
            />
          ) : null}
          <input
            style={{ ...inputStyle, fontSize: 12 }}
            value={title}
            aria-label="검토 요청 제목"
            disabled={working}
            onChange={(e) => setPrTitle(e.target.value)}
          />
          <details>
            <summary style={{ cursor: "pointer", fontSize: 12 }}>검토 요청 본문 고치기</summary>
            <textarea
              style={{ ...inputStyle, minHeight: 90, fontSize: 12, marginTop: 4 }}
              value={body}
              aria-label="검토 요청 본문"
              disabled={working}
              onChange={(e) => setPrBody(e.target.value)}
            />
          </details>
          {phase === "checking" ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Note tone="accent">
                저장 전 검사 중 — typecheck · lint · test · Codex 리뷰 (몇 분 걸려요)
              </Note>
              <Btn onClick={() => void stopCheck()}>검사 멈추기</Btn>
            </div>
          ) : phase === "committing" ? (
            <Note tone="accent">저장하는 중…</Note>
          ) : phase === "pr" ? (
            <Note tone="accent">검토 요청 올리는 중…</Note>
          ) : phase === "findings" ? (
            <div style={{ display: "grid", gap: 6 }}>
              <Note tone="danger">
                {check?.status === "findings"
                  ? "저장 전 검사에서 고칠 것이 나왔어요"
                  : (check?.message ?? "검사를 마치지 못했어요")}
              </Note>
              {check?.findings ? (
                <pre
                  aria-label="검사 지적"
                  style={{
                    fontSize: 11,
                    whiteSpace: "pre-wrap",
                    maxHeight: 140,
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
                <Btn onClick={() => void confirm(true)} title="지적을 두고 지금 그대로 확정해요">
                  그래도 확정
                </Btn>
                <Btn onClick={() => setPhase("form")}>그만두기</Btn>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Btn
                tone="primary"
                onClick={() => void confirm()}
                title="저장 전 검사를 한 번 돌리고, 통과하면 저장(커밋)한 뒤 검토 요청(PR)을 올려요"
                style={{ fontSize: 12, padding: "4px 10px" }}
              >
                저장하고 검토 요청 올리기
              </Btn>
              <Btn onClick={() => setPhase("idle")} style={{ fontSize: 12, padding: "4px 10px" }}>
                그만두기
              </Btn>
              <span style={smallStyle}>합치기(머지)는 GitHub 에서 직접 해요</span>
            </div>
          )}
        </div>
      ) : null}
      {error ? <Note tone="danger">{error}</Note> : null}
    </div>
  );
}
