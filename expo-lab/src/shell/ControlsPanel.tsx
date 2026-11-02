/**
 * 오른쪽 「화면 조건」 패널 — 화면 상태(+ A/B 의 B 화면 상태) · 기기 · 로그인 · 일기 · 시각 · 서버 응답(세부) ·
 * 글씨 크기 · 서버 요청 기록. 값은 전부 셸 상태(= URL 해시)이고, 프레임 설정에 들어가는 값이 바뀌면
 * 프레임이 새 설정으로 다시 뜬다. 데이터 양 · 불러오는 중 · 실패는 맨 위 「화면 상태」 하나로 고른다
 * (`ScreenStatePicker.tsx`) — 아래 「서버 응답」은 그보다 세밀하게 바꿀 때만 쓴다.
 *
 * 확대(맞춤 · 100% …)와 매트릭스 축은 여기 없다 — 가운데 무대 도구줄(`StageToolbar`)이 하나뿐인 자리다.
 */
import { useState, type CSSProperties, type ReactNode } from "react";

import type { LabPlatform } from "../lab-contract";
import { labDevices } from "../lab-devices";
import { frameBus, useFrameBus } from "./frameBus";
import { LATENCIES, TEXT_SCALES, type ShellState } from "./hashState";
import { failedRequestCount, RequestLog } from "./RequestLog";
import { RETRO_START_PATH, RETRO_WRITE_PATH, type ShellRoute } from "./routes";
import { ScreenStatePicker } from "./ScreenStatePicker";
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

const TEXT_SCALE_LABELS: Record<(typeof TEXT_SCALES)[number], { label: string; hint: string }> = {
  0.85: { label: "작게 0.85×", hint: "iOS 가장 작은 글씨(≈0.82) · Android 작게(0.85) 근처" },
  1: { label: "기본", hint: "기기 기본 글씨 크기" },
  1.3: { label: "크게 1.3×", hint: "앱이 따라가는 가장 큰 배율(앱 상한)" },
  1.5: {
    label: "아주 크게 1.5× (앱 상한 넘김)",
    hint: "앱 상한(1.3)을 넘겨 배치가 버티는지 보는 값",
  },
};

export type ControlActions = {
  set: (patch: Partial<ShellState>) => void;
  setPlatform: (platform: LabPlatform) => void;
  shiftDay: (days: number) => void;
  setClock: (preset: string) => void;
  resetData: () => void;
  reload: () => void;
  /** 「불러오는 중」을 처음부터 다시 — A 쪽(한 화면 · A, B 가 A와 같으면 B 도) 또는 B */
  replay: (which: "a" | "b") => void;
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

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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
      <legend
        title={hint}
        style={{ fontSize: 11, color: shellColor.muted, padding: "0 4px", marginLeft: -4 }}
      >
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
  hint,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label title={hint} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
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
  route,
  baseFrameId,
  realMs,
  actions,
}: {
  state: ShellState;
  /** 지금 화면 — 고를 수 있는 화면 상태 · 실패시킬 주소가 화면마다 다르다 */
  route: ShellRoute | undefined;
  /** 「이 화면이 서버에 요청하나」를 볼 프레임(한 화면 solo · A/B 의 A) */
  baseFrameId: string;
  realMs: number;
  actions: ControlActions;
}) {
  useFrameBus();
  const [customFail, setCustomFail] = useState("");
  const failed = failedRequestCount();
  const devices = labDevices.filter((device) => device.platform === state.platform);
  const toggleFail = (path: string) =>
    actions.set({
      failPaths: state.failPaths.includes(path)
        ? state.failPaths.filter((item) => item !== path)
        : [...state.failPaths, path],
    });

  return (
    <div data-testid="controls-panel" style={{ fontSize: 13, color: shellColor.ink }}>
      {route ? (
        <Group
          title="화면 상태"
          hint="폰 화면에 채울 기록의 양 · 불러오는 중 · 불러오기 실패 — 실제 서버가 아니라 Lab 안의 가짜 서버가 줘요"
        >
          <ScreenStatePicker
            route={route}
            config={state}
            b={state.b}
            showB={state.layout === "ab"}
            baseFrameId={baseFrameId}
            onPick={(config) => actions.set(config)}
            onPickB={(b) => actions.set({ b })}
            onReplay={actions.replay}
          />
        </Group>
      ) : null}

      <Group
        title="기기"
        hint="폰 화면이 흉내 낼 기기 — 화면 크기 · 위아래 여백 · 겉모습이 바뀌어요"
      >
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
      </Group>

      <Group title="로그인 · 일기 쓰기" hint="폰 화면을 어떤 사용자 상태로 열지 정해요">
        <Toggle
          label="로그인한 상태로 시작"
          hint="폰 화면을 열 때 로그인된 상태로 열지 정해요"
          description="끄면 로그인 전 상태로 — 첫 화면이 소개로 넘어가요"
          checked={state.signedIn}
          onChange={(signedIn) => actions.set({ signedIn })}
        />
        <Toggle
          label="오늘 다시 쓰기"
          hint="하루에 일기 한 번만 쓸 수 있는 제한을 풀어 줘요"
          description="켜면 오늘 이미 썼어도 일기 쓰는 과정을 다시 할 수 있어요 · 끄면 실제 서버처럼 하루 1번"
          checked={state.repeatToday}
          onChange={(repeatToday) => actions.set({ repeatToday })}
        />
        <Row>
          <button
            type="button"
            title="회고 확인 화면(/retro/confirm)을 새로 띄워 처음부터 해요"
            onClick={() => actions.restartDiary(RETRO_START_PATH)}
            style={button()}
          >
            일기 쓰기 다시 시작
          </button>
          <button
            type="button"
            title="대화 없이 직접 쓰는 화면(/retro/write)을 새로 띄워요"
            onClick={() => actions.restartDiary(RETRO_WRITE_PATH)}
            style={button()}
          >
            직접 쓰기로 시작
          </button>
          <button
            type="button"
            title="폰 화면마다 쌓인 기록(쓴 일기 · 일정 …)을 화면 상태의 처음 값으로 되돌려요"
            onClick={actions.resetData}
            style={button()}
          >
            쓴 기록 되돌리기
          </button>
        </Row>
      </Group>

      <Group title="시각" hint="앱이 보는 지금 시각 — 날짜가 바뀌는 04:00 경계를 시험할 때 써요">
        <div
          data-testid="virtual-clock"
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            background: state.now ? shellColor.noticeSoft : shellColor.accentSoft,
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
            지금 시각으로
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

      <Group
        title="서버 응답 (세부)"
        hint="위 「화면 상태」의 불러오는 중 · 불러오기 실패보다 세밀하게 바꿀 때 써요 — 바꾸면 화면 상태는 「직접 고른 조건」이 돼요"
      >
        <Row>
          {LATENCIES.map((latency) => (
            <button
              key={latency}
              type="button"
              title={
                latency === 0
                  ? "서버가 바로 답해요"
                  : `모든 응답을 ${latency / 1000}초 늦춰 불러오는 중 화면을 봐요`
              }
              aria-pressed={state.latencyMs === latency}
              onClick={() => actions.set({ latencyMs: latency })}
              style={button(state.latencyMs === latency)}
            >
              {latency === 0 ? "바로 응답" : `${latency / 1000}초 늦게 응답`}
            </button>
          ))}
        </Row>
        <details>
          <summary
            title="고른 주소로 시작하는 요청은 500 오류로 답해요 — 오류 안내 화면을 볼 때 써요"
            style={{ cursor: "pointer", fontSize: 12 }}
          >
            일부 요청 실패시키기 {state.failPaths.length ? `(${state.failPaths.length})` : ""}
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
                주소 더하기
              </button>
            </form>
          </div>
        </details>
      </Group>

      <Group title="글씨 크기">
        <Row>
          {TEXT_SCALES.map((scale) => (
            <button
              key={scale}
              type="button"
              title={TEXT_SCALE_LABELS[scale].hint}
              aria-pressed={state.textScale === scale}
              onClick={() => actions.set({ textScale: scale })}
              style={button(state.textScale === scale)}
            >
              {TEXT_SCALE_LABELS[scale].label}
            </button>
          ))}
        </Row>
        <div style={{ fontSize: 11, color: shellColor.muted }}>
          OS 글자 크기 설정을 흉내 내 앱 글자 크기만 바꿔요(프레임이 바로 적용해요). 화면 전체를
          크게 보려면 가운데 위 도구줄의 확대 · 돋보기를 써요.
        </div>
        <Row>
          <button
            type="button"
            title="지금 보이는 폰 화면을 모두 새로 불러와요(쓴 기록은 그대로)"
            onClick={actions.reload}
            style={button()}
          >
            폰 화면 새로 불러오기
          </button>
        </Row>
      </Group>

      <details
        data-testid="request-log-section"
        style={{ borderTop: `1px solid ${shellColor.border}` }}
      >
        <summary
          style={{
            cursor: "pointer",
            padding: "10px 14px",
            fontSize: 12,
            color: shellColor.muted,
          }}
        >
          서버 요청 기록 (개발용) · {frameBus.requests.length}
          {failed ? (
            <span
              data-testid="request-log-failed"
              title={`실패한 요청 ${failed}개`}
              style={{
                display: "inline-block",
                marginLeft: 6,
                minWidth: 16,
                padding: "0 5px",
                borderRadius: 8,
                background: shellColor.danger,
                color: shellColor.onAccent,
                fontSize: 10,
                fontWeight: 700,
                textAlign: "center",
              }}
            >
              {failed}
            </span>
          ) : null}
        </summary>
        <div style={{ padding: "0 14px", fontSize: 11, color: shellColor.muted }}>
          화면이 비거나 오류가 날 때 어떤 데이터 요청이 실패했는지 봐요.
        </div>
        <RequestLog />
      </details>
    </div>
  );
}
