/**
 * 오른쪽 조작 패널 — 기기 · 데이터 · 시각 · 서버 · 보기. 값은 전부 셸 상태(= URL 해시)이고,
 * 프레임 설정에 들어가는 값이 바뀌면 프레임이 새 설정으로 다시 뜬다.
 */
import { useState, type CSSProperties, type ReactNode } from "react";

import { datasets } from "../fake-server";
import type { LabPlatform } from "../lab-contract";
import { labDevices } from "../lab-devices";
import {
  LATENCIES,
  MATRIX_AXES,
  TEXT_SCALES,
  type MatrixAxis,
  type ShellState,
  type Zoom,
} from "./hashState";
import { RETRO_START_PATH, RETRO_WRITE_PATH } from "./routes";
import { shellColor } from "./theme";
import { describeVirtual, TIME_PRESETS } from "./time";

/** 실패시킬 수 있는 서버 주소 접두사 — 앱이 실제로 부르는 것(`src/features/*\/data`) */
export const FAIL_PATH_OPTIONS = [
  "/api/v1/users/me",
  "/api/v2/users/me",
  "/api/v1/onboarding",
  "/api/v1/auth",
  "/api/v1/schedules",
  "/api/v1/weather",
  "/api/v1/retrospect",
  "/api/v1/diaries",
  "/api/v1/action-cards",
  "/api/v1/letters",
  "/api/v1/reports",
  "/api/v1/rest-records",
  "/api/v1/treasures",
  "/api/v1/worries",
  "/api/v1/inquiries",
] as const;

const ZOOMS: readonly { id: Zoom; label: string }[] = [
  { id: "fit", label: "맞춤" },
  { id: 0.5, label: "50%" },
  { id: 0.75, label: "75%" },
  { id: 1, label: "100%" },
];

export type ControlActions = {
  set: (patch: Partial<ShellState>) => void;
  setPlatform: (platform: LabPlatform) => void;
  shiftDay: (days: number) => void;
  setClock: (preset: string) => void;
  resetData: () => void;
  reload: () => void;
  restartDiary: (path: string) => void;
};

const button = (active = false): CSSProperties => ({
  padding: "5px 9px",
  borderRadius: 7,
  border: `1px solid ${active ? shellColor.accent : shellColor.border}`,
  background: active ? shellColor.accent : shellColor.panel,
  color: active ? shellColor.onAccent : shellColor.ink,
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
});

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset
      style={{
        border: 0,
        borderTop: `1px solid ${shellColor.border}`,
        margin: 0,
        padding: "12px 14px",
        display: "grid",
        gap: 8,
      }}
    >
      <legend style={{ fontSize: 11, color: shellColor.muted, padding: "0 4px", marginLeft: -4 }}>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>;
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ marginTop: 2 }}
      />
      <span>
        {label}
        {description ? (
          <span style={{ display: "block", fontSize: 11, color: shellColor.muted }}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ControlsPanel({
  state,
  realMs,
  actions,
}: {
  state: ShellState;
  realMs: number;
  actions: ControlActions;
}) {
  const [customFail, setCustomFail] = useState("");
  const devices = labDevices.filter((device) => device.platform === state.platform);
  const toggleFail = (path: string) =>
    actions.set({
      failPaths: state.failPaths.includes(path)
        ? state.failPaths.filter((item) => item !== path)
        : [...state.failPaths, path],
    });

  return (
    <div data-testid="controls-panel" style={{ fontSize: 13, color: shellColor.ink }}>
      <Group title="기기">
        <Row>
          {(["ios", "android"] as const).map((platform) => (
            <button
              key={platform}
              type="button"
              aria-pressed={state.platform === platform}
              onClick={() => actions.setPlatform(platform)}
              style={button(state.platform === platform)}
            >
              {platform === "ios" ? "iOS" : "Android"}
            </button>
          ))}
        </Row>
        <select
          aria-label="기기"
          value={state.device}
          onChange={(event) => actions.set({ device: event.target.value })}
          style={{ padding: 6, borderRadius: 7, border: `1px solid ${shellColor.border}` }}
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.label} · {device.width}×{device.height}
            </option>
          ))}
        </select>
        {state.layout === "matrix" ? (
          <Row>
            {MATRIX_AXES.map((axis) => (
              <button
                key={axis.id}
                type="button"
                aria-pressed={state.matrix === axis.id}
                onClick={() => actions.set({ matrix: axis.id as MatrixAxis })}
                style={button(state.matrix === axis.id)}
              >
                {axis.label}
              </button>
            ))}
          </Row>
        ) : null}
      </Group>

      <Group title="데이터">
        <select
          aria-label="데이터 세트"
          value={state.dataset}
          onChange={(event) =>
            actions.set({ dataset: event.target.value as ShellState["dataset"] })
          }
          style={{ padding: 6, borderRadius: 7, border: `1px solid ${shellColor.border}` }}
        >
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.label} — {dataset.description}
            </option>
          ))}
        </select>
        <Toggle
          label="로그인한 상태로 시작"
          description="끄면 세션 없이 — 스플래시가 소개로 보낸다"
          checked={state.signedIn}
          onChange={(signedIn) => actions.set({ signedIn })}
        />
        <Toggle
          label="오늘 다시 쓰기"
          description="켜면 오늘 이미 썼어도 일기 쓰는 과정을 다시 할 수 있어요 · 끄면 실제 서버처럼 하루 1번"
          checked={state.repeatToday}
          onChange={(repeatToday) => actions.set({ repeatToday })}
        />
        <Row>
          <button
            type="button"
            onClick={() => actions.restartDiary(RETRO_START_PATH)}
            style={button()}
          >
            일기 쓰기 다시 시작
          </button>
          <button
            type="button"
            onClick={() => actions.restartDiary(RETRO_WRITE_PATH)}
            style={button()}
          >
            직접 쓰기로
          </button>
          <button type="button" onClick={actions.resetData} style={button()}>
            데이터 초기화
          </button>
        </Row>
      </Group>

      <Group title="시각">
        <div
          data-testid="virtual-clock"
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: state.now ? shellColor.draftSoft : shellColor.accentSoft,
            fontWeight: 600,
          }}
        >
          {describeVirtual(state.now, realMs)}
        </div>
        <Row>
          <button type="button" onClick={() => actions.shiftDay(-1)} style={button()}>
            하루 되돌리기 (−1일)
          </button>
          <button type="button" onClick={() => actions.shiftDay(1)} style={button()}>
            하루 넘기기 (+1일)
          </button>
          <button
            type="button"
            onClick={() => actions.set({ now: null })}
            disabled={state.now == null}
            style={button()}
          >
            지금으로
          </button>
        </Row>
        <Row>
          {TIME_PRESETS.filter((preset) => preset.id !== "real").map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => actions.setClock(preset.id)}
              style={button()}
            >
              {preset.label}
            </button>
          ))}
        </Row>
      </Group>

      <Group title="가짜 서버">
        <Row>
          {LATENCIES.map((latency) => (
            <button
              key={latency}
              type="button"
              aria-pressed={state.latencyMs === latency}
              onClick={() => actions.set({ latencyMs: latency })}
              style={button(state.latencyMs === latency)}
            >
              {latency === 0 ? "지연 없음" : `${latency / 1000}초 지연`}
            </button>
          ))}
        </Row>
        <details>
          <summary style={{ cursor: "pointer", fontSize: 12 }}>
            실패시킬 주소 {state.failPaths.length ? `(${state.failPaths.length})` : ""}
          </summary>
          <div style={{ display: "grid", gap: 4, marginTop: 6 }}>
            {[...new Set([...FAIL_PATH_OPTIONS, ...state.failPaths])].map((path) => (
              <label key={path} style={{ fontSize: 12, display: "flex", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={state.failPaths.includes(path)}
                  onChange={() => toggleFail(path)}
                />
                <code>{path}</code>
              </label>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const path = customFail.trim();
                if (path.startsWith("/") && !state.failPaths.includes(path)) {
                  actions.set({ failPaths: [...state.failPaths, path] });
                }
                setCustomFail("");
              }}
              style={{ display: "flex", gap: 4 }}
            >
              <input
                aria-label="실패시킬 주소 직접 입력"
                placeholder="/api/v1/..."
                value={customFail}
                onChange={(event) => setCustomFail(event.target.value)}
                style={{ flex: 1, fontSize: 12, padding: 4 }}
              />
              <button type="submit" style={button()}>
                더하기
              </button>
            </form>
          </div>
        </details>
      </Group>

      <Group title="보기">
        <Row>
          {TEXT_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              aria-pressed={state.textScale === scale}
              onClick={() => actions.set({ textScale: scale })}
              style={button(state.textScale === scale)}
            >
              글씨 {scale}×
            </button>
          ))}
        </Row>
        <div style={{ fontSize: 11, color: shellColor.muted }}>
          글씨 배율은 프레임 설정의 `textScale` 로 넘긴다 — 프레임이 읽어야 적용된다
        </div>
        <Row>
          {ZOOMS.map((zoom) => (
            <button
              key={String(zoom.id)}
              type="button"
              aria-pressed={state.zoom === zoom.id}
              onClick={() => actions.set({ zoom: zoom.id })}
              style={button(state.zoom === zoom.id)}
            >
              {zoom.label}
            </button>
          ))}
          <button type="button" onClick={actions.reload} style={button()}>
            다시 불러오기
          </button>
        </Row>
      </Group>
    </div>
  );
}
