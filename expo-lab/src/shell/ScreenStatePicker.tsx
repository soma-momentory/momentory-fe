/**
 * 「화면 조건」 패널 맨 위의 **「화면 상태」** — 같은 화면을 신규 사용자 · 기록 없음 · 기록 보통 · 기록 많음 · 긴 글 ·
 * 불러오는 중 · 불러오기 실패로 바꿔 본다. 한 화면 · A/B 의 A 에 걸리고, A/B 에서는 **「B 화면 상태」**로 B 만
 * 따로 고를 수 있다(처음은 「A와 같게」). 한 화면의 도구줄에도 같은 목록을 띄운다(`ToolbarStatePicker` — 패널을 거치지
 * 않고 그 자리에서 고른다 · 2026-11-04 사용자 요청). A/B 설명의 「B 화면 상태 바꾸기」는 이 칸을 연다.
 *
 * 「불러오기 실패」는 **이 화면이 실제로 부른 서버 주소**를 실패시킨다(`screenStates.ts`). 주소는 셸이 모은
 * 것(`frameBus.pathsFor`)이고, 고르는 순간의 목록을 프레임 설정에 싣는다(그 뒤 늘어도 다시 띄우지 않는다).
 * 바탕 프레임이 준비된 뒤 `QUIET_MS` 동안 새 주소가 없는데 하나도 없으면 「이 화면은 서버에 요청하지 않아요」
 * 한 줄로 알리고 불러오는 중 · 실패를 고를 수 없게 한다.
 */
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { frameBus, useFrameBus } from "./frameBus";
import type { StateConfig } from "./hashState";
import { findRoute, matchPathname, type ShellRoute } from "./routes";
import {
  bStatesFor,
  currentStateOf,
  failurePathsFrom,
  isNewUserRoute,
  stateConfig,
  stateDef,
  statesFor,
  type ScreenStateDef,
  type ScreenStateId,
} from "./screenStates";
import { shellColor } from "./theme";

/** 바탕 프레임이 준비된 뒤 이만큼 새 주소가 없으면 「요청이 있나」를 굳힌다 */
const QUIET_MS = 1500;
/** 바탕 프레임이 끝내 준비되지 않아도 이만큼 지나면 그때까지 모은 것으로 굳힌다 */
const GIVE_UP_MS = 12_000;

/** 이 화면 몫으로 모은 서버 주소(실패시킬 접두사) — 지금까지 */
export function useDetectedPaths(routePath: string): string[] {
  useFrameBus();
  // 시트 줄(`screenOf`)은 그 라우트가 부른 주소를 함께 쓴다
  const path = findRoute(routePath)?.screenOf ?? routePath;
  return failurePathsFrom(frameBus.pathsFor((pathname) => matchPathname(pathname)?.path === path));
}

/**
 * 모은 주소를 굳힌다 — 바탕 프레임이 준비되고 `QUIET_MS` 동안 목록이 그대로면.
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

const shortPath = (path: string) => path.replace(/^\/api\/v\d+/, "");

export function describeFailPaths(paths: readonly string[]) {
  return paths.length
    ? `실패시킨 요청: ${paths.map(shortPath).join(" · ")}`
    : "실패시킬 요청이 없어요";
}

/** 지금 조건의 상태 이름 — 고른 상태와 다르면(서버 응답을 직접 바꿈) 「직접 고른 조건」 */
export function stateLabel(
  config: StateConfig,
  route: ShellRoute,
  detected: readonly string[],
): string {
  const id = currentStateOf(config, route, detected);
  return id ? stateDef(id).label : "직접 고른 조건";
}

export const NO_REQUESTS_NOTE =
  "이 화면은 서버에 요청하지 않아요 — 「불러오는 중」 · 「불러오기 실패」는 고를 수 없어요.";
export const NEW_USER_ROUTE_NOTE =
  "로그인 전 · 온보딩 화면이라 기록이 생기기 전 상태(「신규 사용자」)로만 열려요.";

const selectStyle: CSSProperties = {
  width: "100%",
  padding: 6,
  borderRadius: 7,
  border: `1px solid ${shellColor.border}`,
  background: shellColor.panel,
  color: shellColor.ink,
  fontSize: 13,
};

const noteStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  color: shellColor.muted,
  wordBreak: "keep-all",
};

const smallButton: CSSProperties = {
  justifySelf: "start",
  padding: "3px 8px",
  borderRadius: 6,
  border: `1px solid ${shellColor.border}`,
  background: shellColor.panel,
  color: shellColor.ink,
  fontSize: 11,
  cursor: "pointer",
};

/** 한 줄 설명 — 고른 상태가 무엇을 바꿨는지 */
function stateNote(id: ScreenStateId | null, config: StateConfig) {
  if (!id) return "아래 「서버 응답」에서 직접 바꾼 조건이에요 — 여기서 고르면 그 상태로 돌아가요.";
  if (id === "failure") return describeFailPaths(config.failPaths);
  if (id === "loading")
    return "서버가 1분 늦게 답해요 — 앱이 기다리다 포기하면(10~25초) 실패 안내로 바뀌어요.";
  return stateDef(id).help;
}

type StateFieldProps = {
  label: string;
  testId: string;
  defs: readonly ScreenStateDef[];
  /** 지금 상태 — null 이면 직접 고른 조건(또는 B 의 「A와 같게」) */
  value: ScreenStateId | null;
  /** B 칸 — 맨 앞에 「A와 같게」 */
  sameAsA?: boolean;
  detected: readonly string[];
  settled: readonly string[] | null;
  onPick: (id: ScreenStateId | null) => void;
};

/** 고르는 목록 — 패널의 칸과 도구줄이 함께 쓴다. 고를 수 없는 상태를 막는 규칙도 여기 하나다 */
function StateField({
  label,
  testId,
  defs,
  value,
  sameAsA,
  detected,
  settled,
  onPick,
  style,
  onFocus,
  onBlur,
}: StateFieldProps & {
  style: CSSProperties;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const noRequests = settled != null && detected.length === 0;
  // 실패는 실패시킬 주소를 알아야 한다 · 요청이 없는 화면이면 둘 다 아무 일도 없다
  const blocked = (id: ScreenStateId) =>
    (id === "failure" && detected.length === 0) || (id === "loading" && noRequests);
  return (
    <select
      aria-label={label}
      data-testid={testId}
      value={value ?? ""}
      onChange={(event) => {
        const id = (event.target.value || null) as ScreenStateId | null;
        // 막힌 칸은 자동화 도구가 값을 밀어 넣어도 고르지 않는다
        if (id && blocked(id)) return;
        onPick(id);
      }}
      onFocus={onFocus}
      onBlur={onBlur}
      style={style}
    >
      {sameAsA ? <option value="">A와 같게</option> : null}
      {!sameAsA && value == null ? <option value="">직접 고른 조건</option> : null}
      {defs.map((def) => {
        const off = blocked(def.id);
        const suffix = off ? (noRequests ? " (요청 없는 화면)" : " (요청을 찾는 중)") : "";
        return (
          <option key={def.id} value={def.id} disabled={off} title={def.help}>
            {def.label}
            {suffix}
          </option>
        );
      })}
    </select>
  );
}

function StateSelect({
  showLabel = true,
  ...field
}: StateFieldProps & {
  /** 칸 위에 이름을 쓸지 — 한 화면이면 묶음 제목(「화면 상태」)과 겹쳐 뺀다 */
  showLabel?: boolean;
}) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 12 }}>
      {showLabel ? <span style={{ fontWeight: 600 }}>{field.label}</span> : null}
      <StateField {...field} style={selectStyle} />
    </label>
  );
}

/**
 * 도구줄의 「화면 상태: 기록 보통 ▾」 — 누르면 그 자리에서 목록이 열리고, 오른쪽 패널은 움직이지 않는다.
 * 보이는 것은 글자이고, 투명한 목록을 칩 전체에 덮어 어디를 눌러도 열리게 한다.
 */
export function ToolbarStatePicker({
  route,
  config,
  baseFrameId,
  chipStyle,
  onPick,
}: {
  route: ShellRoute;
  config: StateConfig;
  /** 「요청이 있나」를 굳힐 때 기다리는 프레임 */
  baseFrameId: string;
  /** 도구줄 버튼들과 같은 모양 */
  chipStyle: CSSProperties;
  onPick: (config: StateConfig) => void;
}) {
  const detected = useDetectedPaths(route.path);
  const settled = useSettledPaths(route.path, baseFrameId);
  const [focused, setFocused] = useState(false);
  return (
    <span
      data-testid="state-shortcut"
      title="화면 상태를 바꿔요 — 기록 보통 · 기록 많음 · 불러오는 중 …"
      style={{
        ...chipStyle,
        position: "relative",
        display: "inline-block",
        ...(focused ? { borderColor: shellColor.accent } : null),
      }}
    >
      화면 상태: {stateLabel(config, route, detected)} ▾
      <StateField
        label="화면 상태"
        testId="toolbar-screen-state"
        defs={statesFor(route)}
        value={currentStateOf(config, route, detected)}
        detected={detected}
        settled={settled}
        onPick={(id) => {
          if (id) onPick(stateConfig(route, id, detected));
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0,
          cursor: "pointer",
          fontSize: 13,
        }}
      />
    </span>
  );
}

export function ScreenStatePicker({
  route,
  config,
  b,
  showB,
  baseFrameId,
  onPick,
  onPickB,
  onReplay,
}: {
  route: ShellRoute;
  /** A(한 화면)의 지금 조건 */
  config: StateConfig;
  /** B 화면 상태 — null 이면 A와 같게 */
  b: StateConfig | null;
  /** A/B 일 때만 B 칸을 보인다 */
  showB: boolean;
  /** 「요청이 있나」를 굳힐 때 기다리는 프레임(한 화면 solo · A/B 의 A) */
  baseFrameId: string;
  onPick: (config: StateConfig) => void;
  onPickB: (config: StateConfig | null) => void;
  /** 「불러오는 중」을 처음부터 다시 — A 쪽(`"a"`) 또는 B */
  onReplay: (which: "a" | "b") => void;
}) {
  const detected = useDetectedPaths(route.path);
  const settled = useSettledPaths(route.path, baseFrameId);
  const noRequests = settled != null && detected.length === 0;
  const current = currentStateOf(config, route, detected);
  const currentB = b ? currentStateOf(b, route, detected) : null;

  return (
    <div data-testid="screen-state-picker" style={{ display: "grid", gap: 8 }}>
      <StateSelect
        label={showB ? "A 화면 상태" : "화면 상태"}
        showLabel={showB}
        testId="screen-state"
        defs={statesFor(route)}
        value={current}
        detected={detected}
        settled={settled}
        onPick={(id) => {
          if (id) onPick(stateConfig(route, id, detected));
        }}
      />
      <p data-testid="screen-state-note" style={noteStyle}>
        {stateNote(current, config)}
      </p>
      {current === "loading" || current === "failure" ? (
        // Lab 은 요청을 정말 늦추거나 실패시킨다 — 그런데도 빈 화면처럼 보이면 그 화면이
        // 불러오는 중 · 실패를 따로 그리지 않는 것이다(예: 홈 일정 · 2026-11-02 Codex QA)
        <p data-testid="screen-state-app-note" style={noteStyle}>
          폰 화면이 「비어 있음」처럼 보이면, 앱의 이 화면이 불러오는 중 · 실패를 따로 그리지 않는
          거예요(Lab 이 아니라 앱 동작).
        </p>
      ) : null}
      {current === "loading" ? (
        <button
          type="button"
          title="폰 화면을 처음부터 다시 띄워 불러오는 동안의 화면을 다시 봐요"
          onClick={() => onReplay("a")}
          style={smallButton}
        >
          처음부터 다시 보기
        </button>
      ) : null}

      {showB ? (
        <>
          <StateSelect
            label="B 화면 상태"
            testId="b-screen-state"
            defs={bStatesFor(route)}
            value={b ? (currentB ?? null) : null}
            sameAsA
            detected={detected}
            settled={settled}
            onPick={(id) => onPickB(id ? stateConfig(route, id, detected) : null)}
          />
          <p data-testid="b-screen-state-note" style={noteStyle}>
            {b
              ? currentB
                ? stateNote(currentB, b)
                : "B 만 직접 고른 조건이에요 — 여기서 다시 고르면 그 상태로 바뀌어요."
              : "B 도 A 와 같은 상태로 열려요. 다른 상태를 고르면 두 상태를 나란히 볼 수 있어요."}
          </p>
          {b && currentB === "loading" ? (
            <button
              type="button"
              title="B 화면을 처음부터 다시 띄워 불러오는 동안의 화면을 다시 봐요"
              onClick={() => onReplay("b")}
              style={smallButton}
            >
              B 처음부터 다시 보기
            </button>
          ) : null}
        </>
      ) : null}

      {isNewUserRoute(route) ? (
        <p data-testid="screen-state-new-user" style={noteStyle}>
          {NEW_USER_ROUTE_NOTE}
        </p>
      ) : null}
      {noRequests ? (
        <p data-testid="screen-state-no-requests" style={noteStyle}>
          {NO_REQUESTS_NOTE}
        </p>
      ) : null}
    </div>
  );
}
