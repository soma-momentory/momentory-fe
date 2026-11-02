/**
 * 「AI에게 맡기기」 패널의 작은 DOM 부품 — 셸(`src/shell/`)과 같은 무채색 팔레트(`shellColor`)를 쓴다.
 * 앱 디자인 토큰을 쓰지 않는다(도구 UI 는 앱과 섞이지 않게).
 */
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

import { shellColor, shellFont } from "../shell/theme";

export const panelStyle: CSSProperties = {
  fontFamily: shellFont,
  fontSize: 13,
  color: shellColor.ink,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export const boxStyle: CSSProperties = {
  border: `1px solid ${shellColor.border}`,
  borderRadius: 10,
  background: shellColor.panel,
  padding: 10,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const inputStyle: CSSProperties = {
  fontFamily: shellFont,
  fontSize: 13,
  color: shellColor.ink,
  background: shellColor.panel,
  border: `1px solid ${shellColor.border}`,
  borderRadius: 7,
  padding: "6px 8px",
  boxSizing: "border-box",
  width: "100%",
};

export const smallStyle: CSSProperties = { fontSize: 11, color: shellColor.muted };

type Tone = "primary" | "plain" | "danger";

export function Btn({
  tone = "plain",
  style,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; children: ReactNode }) {
  const disabled = Boolean(rest.disabled);
  const palette =
    tone === "primary"
      ? { bg: shellColor.accent, fg: shellColor.onAccent, border: shellColor.accent }
      : tone === "danger"
        ? { bg: shellColor.panel, fg: shellColor.danger, border: shellColor.danger }
        : { bg: shellColor.panel, fg: shellColor.ink, border: shellColor.border };
  return (
    <button
      type="button"
      {...rest}
      style={{
        fontFamily: shellFont,
        fontSize: 13,
        fontWeight: tone === "primary" ? 700 : 500,
        padding: "6px 11px",
        borderRadius: 7,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.fg,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

/** 고르기 칩 — 고른 것은 테두리 2px · 굵은 글자(색만으로 표시하지 않는다) */
export function Chip({
  selected,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      style={{
        fontFamily: shellFont,
        fontSize: 12,
        padding: selected ? "3px 8px" : "4px 9px",
        borderRadius: 999,
        border: `${selected ? 2 : 1}px solid ${selected ? shellColor.accent : shellColor.border}`,
        background: selected ? shellColor.accentSoft : shellColor.panel,
        color: shellColor.ink,
        fontWeight: selected ? 700 : 400,
        cursor: rest.disabled ? "not-allowed" : "pointer",
        opacity: rest.disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** 한 줄 안내 — 오류도 모달 없이 이 한 줄로 */
export function Note({
  tone = "muted",
  children,
}: {
  tone?: "muted" | "danger" | "accent";
  children: ReactNode;
}) {
  const color =
    tone === "danger"
      ? shellColor.danger
      : tone === "accent"
        ? shellColor.accent
        : shellColor.muted;
  return <div style={{ fontSize: 12, color, lineHeight: 1.45 }}>{children}</div>;
}

export function Title({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: shellColor.ink }}>{children}</div>;
}
