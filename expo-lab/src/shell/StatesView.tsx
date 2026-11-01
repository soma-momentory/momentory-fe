/**
 * 「상태별로 보기」 — 같은 화면을 빈 계정 · 보통 · 많음 · 긴 문구 · 불러오는 중 · 불러오기 실패로 한꺼번에.
 * 칸은 화면 근처에 왔을 때만 붙는다(IntersectionObserver). 칸을 누르면 그 상태 그대로 한 화면으로 연다.
 *
 * 「불러오기 실패」 칸은 **이 화면이 실제로 부른 서버 주소**를 실패시킨다(`screenStates.ts`).
 * 주소는 셸이 모은 것(`frameBus.pathsFor`) — 바탕 칸(보통 · 신규 사용자)이 뜨며 부른 것과 앞서 이
 * 화면에 섰던 프레임이 부른 것이다. 바탕 칸이 준비된 뒤 `QUIET_MS` 동안 새 주소가 없으면 그때의 목록으로
 * 굳혀 실패 칸을 붙인다(그 뒤에 늘어도 칸을 다시 띄우지 않는다). 아무 요청도 없는 화면이면 불러오는
 * 중 · 실패 칸을 빼고 한 줄로 알린다.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";

import { encodeFrameConfig } from "../lab-contract";
import { useSkinAvailable } from "./device/DeviceFrame";
import { chromeGeometry } from "./device/geometry";
import { frameBus, useFrameBus } from "./frameBus";
import { stateFrameId, withFailPaths, type FrameSpec } from "./frameSpecs";
import { LabFrame } from "./LabFrame";
import { matchPathname, type ShellRoute } from "./routes";
import type { ShellState } from "./hashState";
import {
  currentStateOf,
  failurePathsFrom,
  stateConfig,
  stateDef,
  statesFor,
  type ScreenStateId,
  type StateFrameConfig,
} from "./screenStates";
import { FRAME_GAP, MIN_CELL_WIDTH } from "./stageFit";
import { shellColor } from "./theme";

/** 바탕 칸이 준비된 뒤 이만큼 새 주소가 없으면 실패시킬 주소를 굳힌다 */
const QUIET_MS = 1500;
/** 바탕 칸이 끝내 준비되지 않아도 이만큼 지나면 그때까지 모은 것으로 굳힌다 */
const GIVE_UP_MS = 12_000;

const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

/** 이 화면 몫으로 모은 서버 주소(실패시킬 접두사) — 지금까지 */
export function useDetectedPaths(routePath: string): string[] {
  useFrameBus();
  return failurePathsFrom(
    frameBus.pathsFor((pathname) => matchPathname(pathname)?.path === routePath),
  );
}

/**
 * 실패시킬 주소를 굳힌다 — 바탕 프레임이 준비되고 `QUIET_MS` 동안 목록이 그대로면.
 * 굳히기 전에는 null. 화면이 바뀌면 다시 모은다
 */
export function useSettledPaths(routePath: string, baseFrameId: string): string[] | null {
  const detected = useDetectedPaths(routePath);
  const key = detected.join(",");
  const ready = frameBus.get(baseFrameId).ready;
  const [settled, setSettled] = useState<{ route: string; paths: string[] } | null>(null);
  const latest = useRef(detected);
  useEffect(() => {
    latest.current = detected;
  });
  const done = settled?.route === routePath;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(
      () => setSettled({ route: routePath, paths: latest.current }),
      GIVE_UP_MS,
    );
    return () => clearTimeout(timer);
  }, [routePath, done]);

  useEffect(() => {
    if (done || !ready) return;
    const timer = setTimeout(
      () => setSettled({ route: routePath, paths: latest.current }),
      QUIET_MS,
    );
    return () => clearTimeout(timer);
  }, [routePath, done, ready, key]);

  return settled && settled.route === routePath ? settled.paths : null;
}

function LazyCell({
  spec,
  scale,
  realMs,
  configKey,
  title,
  detail,
  action,
  onOpen,
}: {
  spec: FrameSpec;
  scale: number;
  realMs: number;
  configKey: string;
  title: string;
  detail: string;
  action?: ReactNode;
  onOpen: () => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const element = holder.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setNear(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const g = chromeGeometry(spec.device, useSkinAvailable(spec.device));
  return (
    <figure
      data-testid={`state-cell-${spec.screenState}`}
      data-frame-id={spec.frameId}
      style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6, flex: "none" }}
    >
      <Caption width={g.outerWidth * scale} title={title} detail={detail} action={action} />
      <div
        ref={holder}
        style={{ position: "relative", width: g.outerWidth * scale, height: g.outerHeight * scale }}
      >
        {near ? (
          <LabFrame
            key={configKey}
            spec={spec}
            scale={scale}
            realMs={realMs}
            skipVia={spec.screenState === "loading"}
          />
        ) : (
          <Placeholder spec={spec} scale={scale} />
        )}
        <button
          type="button"
          aria-label={`「${title}」 상태로 한 화면에서 열기`}
          title={`「${title}」 상태 그대로 한 화면에서 열어요`}
          onClick={onOpen}
          style={{
            position: "absolute",
            inset: 0,
            background: "transparent",
            border: 0,
            cursor: "zoom-in",
          }}
        />
      </div>
    </figure>
  );
}

function Caption({
  width,
  title,
  detail,
  action,
}: {
  width: number;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <figcaption
      title={`${title} — ${detail}`}
      style={{ width: Math.max(width, MIN_CELL_WIDTH), textAlign: "center", minHeight: 38 }}
    >
      <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
        <span style={{ ...ellipsis, fontSize: 13, fontWeight: 700 }}>{title}</span>
        {action}
      </div>
      <div
        data-testid="state-cell-detail"
        style={{ ...ellipsis, fontSize: 11, color: shellColor.muted }}
      >
        {detail}
      </div>
    </figcaption>
  );
}

function Placeholder({
  spec,
  scale,
  children,
}: {
  spec: FrameSpec;
  scale: number;
  children?: ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: (spec.device.cornerRadius + 15) * scale,
        background: shellColor.border,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        boxSizing: "border-box",
        textAlign: "center",
        wordBreak: "keep-all",
        fontSize: 12,
        color: shellColor.muted,
      }}
    >
      {children}
    </div>
  );
}

const shortPath = (path: string) => path.replace(/^\/api\/v\d+/, "");

export function describeFailPaths(paths: readonly string[]) {
  return paths.length
    ? `실패시킨 요청: ${paths.map(shortPath).join(" · ")}`
    : "실패시킬 요청이 없어요";
}

export function StatesView({
  route,
  specs,
  scale,
  realMs,
  nonces,
  stageWidth,
  onOpen,
  onReload,
}: {
  route: ShellRoute;
  /** `framesFor(…states)` — 실패 칸은 아직 실패 주소가 비어 있다 */
  specs: readonly FrameSpec[];
  scale: number;
  realMs: number;
  nonces: Readonly<Record<string, number>>;
  /** 칸이 놓일 폭 — 칸 수에 맞춰 줄마다 고르게 나눈다(6칸이면 5 + 1 대신 3 + 3) */
  stageWidth: number;
  /** 칸을 누름 — 그 상태(데이터 · 지연 · 실패 주소)로 한 화면 */
  onOpen: (spec: FrameSpec) => void;
  /** 칸 하나를 처음부터 다시 띄운다 */
  onReload: (frameId: string) => void;
}) {
  const states = statesFor(route);
  const baseId = stateFrameId(states[0]!.id);
  const settled = useSettledPaths(route.path, baseId);
  const failPaths = settled ? stateConfig(route, "failure", settled).failPaths : null;
  const noRequests = settled != null && settled.length === 0;

  const cell = (spec: FrameSpec) => {
    const id = spec.screenState as ScreenStateId;
    const def = stateDef(id);
    // 화면을 바꾸면 칸을 새로 띄운다 — 칸마다 그 화면을 차갑게 연다(설정만으로는 같은 열쇠다)
    const key = (s: FrameSpec) =>
      `${route.path}|${encodeFrameConfig(s.config)}#${nonces[s.frameId] ?? 0}`;
    if (id === "loading" || id === "failure") {
      if (noRequests) return null;
      if (id === "failure" && failPaths == null) {
        const g = chromeGeometry(spec.device, Boolean(spec.device.skin));
        return (
          <figure
            key={spec.frameId}
            data-testid="state-cell-failure-pending"
            style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6, flex: "none" }}
          >
            <Caption
              width={g.outerWidth * scale}
              title={def.label}
              detail="이 화면이 부르는 요청을 찾는 중이에요"
            />
            <div style={{ width: g.outerWidth * scale, height: g.outerHeight * scale }}>
              <Placeholder spec={spec} scale={scale}>
                「{stateDef(states[0]!.id).label}」 칸이 뜨며 부르는 요청을 모으고 있어요
              </Placeholder>
            </div>
          </figure>
        );
      }
    }
    const ready = id === "failure" ? withFailPaths(spec, failPaths ?? []) : spec;
    const detail =
      id === "failure"
        ? describeFailPaths(ready.config.failPaths ?? [])
        : id === "loading"
          ? "서버가 1분 늦게 답해요 — 앱이 기다리다 포기하면(10~25초) 실패 안내로 바뀌어요"
          : def.help;
    const action =
      id === "loading" ? (
        <button
          type="button"
          title="이 칸을 처음부터 다시 띄워 불러오는 동안의 화면을 다시 봐요"
          onClick={() => onReload(spec.frameId)}
          style={{
            padding: "1px 6px",
            borderRadius: 6,
            border: `1px solid ${shellColor.border}`,
            background: shellColor.panel,
            color: shellColor.ink,
            fontSize: 11,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          처음부터
        </button>
      ) : undefined;
    return (
      <LazyCell
        key={spec.frameId}
        spec={ready}
        scale={scale}
        realMs={realMs}
        configKey={key(ready)}
        title={def.label}
        detail={detail}
        action={action}
        onOpen={() => onOpen(ready)}
      />
    );
  };

  // 한 줄에 들어가는 칸 수로 줄 수를 정하고, 줄마다 고르게 나눈다
  const shown = noRequests ? specs.length - 2 : specs.length;
  const first = specs[0];
  const cellWidth = first
    ? Math.max(
        chromeGeometry(first.device, Boolean(first.device.skin)).outerWidth * scale,
        MIN_CELL_WIDTH,
      )
    : MIN_CELL_WIDTH;
  const perRow = Math.max(1, Math.floor((stageWidth + FRAME_GAP) / (cellWidth + FRAME_GAP)));
  const columns = Math.ceil(shown / Math.ceil(shown / perRow));
  const rowWidth = columns * cellWidth + (columns - 1) * FRAME_GAP + 1;

  return (
    <div data-testid="states-view">
      {noRequests ? (
        <p
          data-testid="states-no-requests"
          style={{
            margin: "0 auto 12px",
            maxWidth: 720,
            fontSize: 12,
            color: shellColor.muted,
            textAlign: "center",
            wordBreak: "keep-all",
          }}
        >
          이 화면은 서버에 요청하지 않아요 — 「불러오는 중」 · 「불러오기 실패」 칸은 뺐어요.
        </p>
      ) : null}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: FRAME_GAP,
          justifyContent: "center",
          alignItems: "flex-start",
          maxWidth: Math.max(rowWidth, cellWidth),
          margin: "0 auto",
        }}
      >
        {specs.map(cell)}
      </div>
    </div>
  );
}

/**
 * 한 화면 도구줄의 「상태: 보통 ▾」 — 폰 하나를 상태별로 바꿔 본다. 고르면 데이터 세트 · 서버 지연 ·
 * 실패 주소가 그 상태로 바뀌고 폰이 지금 서 있던 화면에서 다시 뜬다.
 */
export function StatePicker({
  route,
  state,
  onPick,
}: {
  route: ShellRoute;
  state: Pick<ShellState, "dataset" | "latencyMs" | "failPaths">;
  onPick: (config: StateFrameConfig) => void;
}) {
  const detected = useDetectedPaths(route.path);
  const current = currentStateOf(state, route, detected);
  const help = current
    ? stateDef(current).help
    : "조건 패널에서 직접 바꾼 조건이에요 — 여기서 고르면 그 상태로 돌아가요";
  return (
    <label
      title={help}
      style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, flex: "none" }}
    >
      상태
      <select
        aria-label="화면 상태"
        data-testid="state-picker"
        value={current ?? ""}
        onChange={(event) => {
          const id = event.target.value as ScreenStateId;
          if (id) onPick(stateConfig(route, id, detected));
        }}
        style={{
          padding: "3px 6px",
          borderRadius: 7,
          border: `1px solid ${shellColor.border}`,
          background: shellColor.panel,
          color: shellColor.ink,
          fontSize: 12,
        }}
      >
        {current ? null : <option value="">직접 고른 조건</option>}
        {statesFor(route).map((def) => {
          const empty = (def.id === "loading" || def.id === "failure") && detected.length === 0;
          return (
            <option key={def.id} value={def.id} disabled={empty} title={def.help}>
              {def.label}
              {empty ? " (요청 없는 화면)" : ""}
            </option>
          );
        })}
      </select>
    </label>
  );
}
