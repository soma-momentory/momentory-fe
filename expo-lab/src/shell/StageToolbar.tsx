/**
 * 가운데 무대 위 도구줄 — 지금 레이아웃의 한 줄 설명 · 프레임 같이 움직이기 · 돋보기 ·
 * 확대(맞춤 · 100% · 125% · 150% · 200% · −/+). 확대 조작은 **여기 하나뿐**이다(조작 패널에 없다).
 *
 * 단축키(셸에 포커스가 있을 때 · 입력칸 밖): Ctrl/⌘ + = / − / 0(맞춤) · Z 누르고 있기 = 돋보기 ·
 * [ ] = 돋보기 배율 · Esc = 돋보기 끄기. 포커스가 프레임(iframe) 안이면 브라우저 확대를 건드리지 않는다.
 */
import type { CSSProperties, ReactNode } from "react";

import { LAYOUTS, ZOOM_PRESETS, type LayoutId, type Zoom } from "./hashState";
import { shellColor } from "./theme";

const chip = (active = false): CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 7,
  border: `1px solid ${active ? shellColor.accent : shellColor.border}`,
  background: active ? shellColor.accent : shellColor.panel,
  color: active ? shellColor.onAccent : shellColor.ink,
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: "16px",
});

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {children}
    </div>
  );
}

export const percent = (scale: number) => `${Math.round(scale * 100)}%`;

export function StageToolbar({
  layout,
  zoom,
  effectiveScale,
  syncNav,
  magnifier,
  magnifierPower,
  onZoom,
  onStep,
  onSyncNav,
  onMagnifier,
  children,
}: {
  layout: LayoutId;
  zoom: Zoom;
  /** 지금 그려진 배율(맞춤이면 계산된 값) */
  effectiveScale: number;
  syncNav: boolean;
  magnifier: boolean;
  magnifierPower: number;
  onZoom: (zoom: Zoom) => void;
  onStep: (direction: 1 | -1) => void;
  onSyncNav: (value: boolean) => void;
  onMagnifier: (value: boolean) => void;
  /** 레이아웃별 조각(화면 상태 바로 가기 · 키보드 · AI 수정 결과 줄) — 도구줄 끝에 */
  children?: ReactNode;
}) {
  const description = LAYOUTS.find((item) => item.id === layout)?.description ?? "";
  return (
    <div
      data-testid="stage-toolbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px 14px",
        padding: "8px 12px",
        background: shellColor.panel,
        borderBottom: `1px solid ${shellColor.border}`,
      }}
    >
      <span
        data-testid="layout-description"
        title={description}
        style={{
          flex: "1 1 220px",
          minWidth: 0,
          fontSize: 12,
          color: shellColor.muted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {description}
      </span>

      {layout === "ab" || layout === "matrix" || layout === "variants" ? (
        <label
          title="한 폰에서 화면을 옮기면 다른 폰도 같은 화면으로 따라가요"
          style={{
            fontSize: 12,
            display: "flex",
            gap: 4,
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={syncNav}
            onChange={(event) => onSyncNav(event.target.checked)}
          />
          {layout === "ab"
            ? "두 화면 함께 이동"
            : layout === "variants"
              ? "모두 함께 이동"
              : "모든 폰 함께 이동"}
        </label>
      ) : null}

      <button
        type="button"
        aria-pressed={magnifier}
        title="돋보기 — 커서 주변을 둥근 렌즈로 크게 봐요(A/B 는 두 화면의 같은 자리를 함께). Z 를 누르고 있는 동안만 켤 수도 있어요"
        onClick={() => onMagnifier(!magnifier)}
        style={chip(magnifier)}
      >
        {magnifier ? `돋보기 끄기 (${magnifierPower}×)` : "돋보기로 보기"}
      </button>

      <Group label="확대">
        <button
          type="button"
          aria-label="작게 보기"
          title="작게 보기 (Ctrl/⌘ + −)"
          onClick={() => onStep(-1)}
          style={chip()}
        >
          −
        </button>
        <button
          type="button"
          aria-pressed={zoom === "fit"}
          title="무대에 꽉 차게 맞춰요 — 크게도 맞춰요(최대 200%) (Ctrl/⌘ + 0)"
          onClick={() => onZoom("fit")}
          style={chip(zoom === "fit")}
        >
          화면에 맞게
        </button>
        {ZOOM_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={zoom === preset}
            title={preset === 1 ? "실제 기기 크기(CSS px 그대로)" : `${percent(preset)}로 크게`}
            onClick={() => onZoom(preset)}
            style={chip(zoom === preset)}
          >
            {percent(preset)}
          </button>
        ))}
        <button
          type="button"
          aria-label="크게 보기"
          title="크게 보기 (Ctrl/⌘ + =)"
          onClick={() => onStep(1)}
          style={chip()}
        >
          +
        </button>
        <span
          data-testid="zoom-readout"
          title="지금 그려진 배율"
          style={{
            minWidth: 40,
            textAlign: "right",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            color: shellColor.muted,
            whiteSpace: "nowrap",
          }}
        >
          {percent(effectiveScale)}
        </span>
      </Group>

      {magnifier ? (
        <span
          data-testid="magnifier-note"
          style={{
            flexBasis: "100%",
            fontSize: 12,
            color: shellColor.notice,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          돋보기 중에는 화면을 누를 수 없어요 · Esc 로 끄기 · 휠 = 배율 · Shift+휠 = 렌즈 크기
        </span>
      ) : null}
      {children}
    </div>
  );
}
