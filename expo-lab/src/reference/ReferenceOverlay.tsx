/**
 * 참고 시안을 그리는 층 — 셸이 **기기 화면 상자 안**(iframe 과 같은 좌표 · 기기 CSS 폭×높이)에 놓는다.
 * 바깥 외형이 transform 으로 확대 · 축소하므로 이 층도 같이 따라간다.
 *
 * 「다른 곳만 표시」(difference)는 이미지에 `mix-blend-mode: difference` 를 건다. 섞이는 바탕은 **가장 가까운 쌓임
 * 맥락(stacking context)** 안의 것이라, 이 층의 뿌리는 쌓임 맥락을 만들지 않게 둔다(z-index ·
 * opacity · transform · filter · clip-path 없음). 그러면 같은 맥락에 있는 iframe(실제 앱)이 바탕이
 * 된다 — Chromium 에서 같은 출처 iframe 위에 섞이는 것을 확인했다(2026-11-02 · 바뀐 버튼 색과
 * 옮긴 제목만 밝게 남고 나머지는 검다. 확대 · 축소로 다시 그린 글자 가장자리는 가는 선으로 남는다).
 * ⚠ 셸이 이 층을 isolation · z-index 가 있는 상자로 감싸면 iframe 과 떨어져 섞이지 않는다.
 */
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import { shellColor } from "../shell/theme";
import { referenceLayout } from "./fit";
import { getReferenceStore } from "./referenceStore";
import type { Reference } from "./types";

type ImageProps = {
  reference: Reference;
  url: string | null;
  width: number;
  style?: CSSProperties;
};

/** 정렬(폭 맞춤 · 배율 · 이동)을 반영한 이미지 한 장 */
export function ReferenceImage({ reference, url, width, style }: ImageProps) {
  const layout = referenceLayout(
    reference.align,
    { width: reference.naturalWidth, height: reference.naturalHeight },
    width,
  );
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      data-testid="reference-image"
      style={{
        position: "absolute",
        left: layout.left,
        top: layout.top,
        width: layout.width,
        height: layout.height,
        maxWidth: "none",
        userSelect: "none",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

const urlOf = (reference: Reference, url: string | null | undefined) =>
  url === undefined ? getReferenceStore().getUrl(reference.id) : url;

export function ReferenceOverlay({
  reference,
  url,
  width,
  height,
  onWipeChange,
}: {
  /** null 이면 아무것도 그리지 않는다 — `useReferencesFor(...).reference` 를 그대로 넘긴다 */
  reference: Reference | null;
  /** 이미지 주소. 생략하면 저장소에서 찾는다 */
  url?: string | null;
  /** 기기 CSS 크기(= iframe 크기) */
  width: number;
  height: number;
  /** 「밀어서 앞뒤 비교」 손잡이를 놓았을 때 — 기본은 저장소에 적는다 */
  onWipeChange?: (wipe: number) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [dragWipe, setDragWipe] = useState<number | null>(null);
  if (!reference || reference.view.mode === "side") return null;
  const src = urlOf(reference, url);
  const mode = reference.view.mode;
  const wipe = dragWipe ?? reference.view.wipe;

  const commitWipe = (value: number) => {
    const next = Math.min(1, Math.max(0, value));
    if (onWipeChange) onWipeChange(next);
    else getReferenceStore().update(reference.id, { view: { wipe: next } });
  };
  const wipeAt = (clientX: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return wipe;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragWipe(wipeAt(event.clientX));
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragWipe === null) return;
    setDragWipe(wipeAt(event.clientX));
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragWipe === null) return;
    commitWipe(wipeAt(event.clientX));
    setDragWipe(null);
  };
  const onHandleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.1 : 0.01;
    if (event.key === "ArrowLeft") commitWipe(wipe - step);
    else if (event.key === "ArrowRight") commitWipe(wipe + step);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      ref={rootRef}
      data-testid="reference-overlay"
      data-mode={mode}
      aria-hidden={mode !== "wipe"}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width,
        height,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {mode === "overlay" ? (
        <ReferenceImage
          reference={reference}
          url={src}
          width={width}
          style={{ opacity: reference.view.opacity }}
        />
      ) : mode === "difference" ? (
        <ReferenceImage
          reference={reference}
          url={src}
          width={width}
          style={{ mixBlendMode: "difference" }}
        />
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
            }}
          >
            <ReferenceImage reference={reference} url={src} width={width} />
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="앞뒤 비교 경계선 옮기기"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(wipe * 100)}
            title="끌어서 경계선을 옮겨요 — 왼쪽이 시안, 오른쪽이 앱 (←/→ 1% · Shift 10%)"
            data-testid="reference-wipe-handle"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDragWipe(null)}
            onKeyDown={onHandleKey}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: wipe * width - 12,
              width: 24,
              cursor: "ew-resize",
              pointerEvents: "auto",
              touchAction: "none",
              outline: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 11,
                width: 2,
                background: shellColor.draft,
                boxShadow: `0 0 0 1px ${shellColor.statusLight}`,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: 24,
                height: 40,
                marginTop: -20,
                borderRadius: 12,
                background: shellColor.draft,
                boxShadow: `0 0 0 2px ${shellColor.statusLight}`,
                color: shellColor.onAccent,
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ⇔
            </div>
            <WipeLabel side="left" text="시안" />
            <WipeLabel side="right" text="앱" />
          </div>
        </>
      )}
    </div>
  );
}

function WipeLabel({ side, text }: { side: "left" | "right"; text: string }) {
  return (
    <span
      style={{
        position: "absolute",
        top: "50%",
        marginTop: 26,
        [side === "left" ? "right" : "left"]: 14,
        padding: "2px 6px",
        borderRadius: 6,
        background: side === "left" ? shellColor.draft : shellColor.ink,
        color: shellColor.onAccent,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/**
 * 「옆에 나란히 놓기」 — 시안 이미지만 그린 화면 크기 상자. 셸이 실제 앱 프레임 옆 칸에(가능하면 같은
 * 기기 외형 안에) 놓는다. 화면 자리만 그린다.
 */
export function ReferenceSidePhone({
  reference,
  url,
  width,
  height,
}: {
  reference: Reference | null;
  url?: string | null;
  width: number;
  height: number;
}) {
  return (
    <div
      data-testid="reference-side-phone"
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        background: shellColor.statusLight,
      }}
    >
      {reference ? (
        <ReferenceImage reference={reference} url={urlOf(reference, url)} width={width} />
      ) : (
        <p
          style={{
            margin: 0,
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: shellColor.muted,
            fontSize: 13,
          }}
        >
          이 화면의 참고 시안이 없어요
        </p>
      )}
    </div>
  );
}
