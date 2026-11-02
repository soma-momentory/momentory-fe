/**
 * 돋보기 — 무대 위에 투명한 층을 덮고, 커서가 올라간 기기 화면의 그 자리를 둥근 렌즈 안에 크게 보인다.
 *
 * - 렌즈 안은 앱 프레임 문서의 **스냅숏**(`magnifierSnapshot.ts`)을 `scale` 로 키운 것이다 — 입력 중인
 *   글자 · 스크롤 위치까지 지금 모습 그대로. 커서가 움직이면 150ms 마다, 가만히 있어도 0.5초마다 다시 뜬다
 * - **A/B 에서는 두 기기의 같은 자리**를 함께 보인다(커서가 A 위면 B 에도 같은 상대 좌표의 렌즈)
 * - 렌즈를 쓰는 동안 마우스는 이 층이 받는다(부모 창은 iframe 안의 움직임을 못 듣는다) — 그래서 앱은
 *   눌리지 않는다. 휠 = 배율 · Shift+휠 = 렌즈 크기
 * - 상태바 · 섬 · 홈 막대는 셸이 iframe 위에 그리는 것이라 렌즈에는 앱 화면만 보인다
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { LabDevice } from "../lab-devices";
import { frameBus } from "./frameBus";
import { snapshotInto } from "./magnifierSnapshot";
import { shellColor } from "./theme";

export const LENS_POWER = { min: 1.5, max: 4, step: 0.25, initial: 2 } as const;
export const LENS_SIZE = { min: 120, max: 420, step: 20, initial: 220 } as const;

const SNAPSHOT_THROTTLE_MS = 150;
const SNAPSHOT_IDLE_MS = 500;

export type MagnifierTarget = { frameId: string; label: string; device: LabDevice };

type Pointer = { x: number; y: number };

type LensPlacement = {
  target: MagnifierTarget;
  /** 렌즈 가운데(창 좌표) */
  cx: number;
  cy: number;
  /** 확대할 지점(기기 CSS 좌표) */
  px: number;
  py: number;
  /** 화면에 그려진 기기 배율 */
  scale: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function placeLenses(
  pointer: Pointer | null,
  targets: readonly MagnifierTarget[],
  partnerOf: (frameId: string) => string | null,
): LensPlacement[] {
  if (!pointer) return [];
  const rects = targets.flatMap((target) => {
    const element = frameBus.get(target.frameId).element;
    if (!element) return [];
    const rect = element.getBoundingClientRect();
    if (!rect.width) return [];
    return [{ target, rect, scale: rect.width / target.device.width }];
  });
  const hovered = rects.find(
    ({ rect }) =>
      pointer.x >= rect.left &&
      pointer.x <= rect.right &&
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom,
  );
  if (!hovered) return [];
  const px = (pointer.x - hovered.rect.left) / hovered.scale;
  const py = (pointer.y - hovered.rect.top) / hovered.scale;
  const lenses: LensPlacement[] = [
    { target: hovered.target, cx: pointer.x, cy: pointer.y, px, py, scale: hovered.scale },
  ];
  const partnerId = partnerOf(hovered.target.frameId);
  const partner = partnerId ? rects.find((item) => item.target.frameId === partnerId) : undefined;
  if (partner) {
    // 같은 상대 좌표 — 기기 크기가 다르면 비율로 옮긴다
    const qx = (px / hovered.target.device.width) * partner.target.device.width;
    const qy = (py / hovered.target.device.height) * partner.target.device.height;
    lenses.push({
      target: partner.target,
      cx: partner.rect.left + qx * partner.scale,
      cy: partner.rect.top + qy * partner.scale,
      px: qx,
      py: qy,
      scale: partner.scale,
    });
  }
  return lenses;
}

function Lens({
  placement,
  power,
  size,
  tick,
}: {
  placement: LensPlacement;
  power: number;
  size: number;
  tick: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [failed, setFailed] = useState(false);
  const { target, cx, cy, px, py, scale } = placement;

  useEffect(() => {
    const source = frameBus.get(target.frameId).element?.contentDocument;
    const lens = ref.current?.contentDocument;
    if (!source || !lens) return;
    setFailed(!snapshotInto(source, lens));
  }, [tick, target.frameId]);

  const k = scale * power;
  return (
    <div
      data-testid={`magnifier-lens-${target.frameId}`}
      aria-hidden
      style={{
        position: "fixed",
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 60,
        background: shellColor.panel,
        boxShadow: `0 0 0 3px ${shellColor.panel}, 0 0 0 4px ${shellColor.border}, 0 12px 32px rgba(0, 0, 0, 0.28)`,
      }}
    >
      <iframe
        ref={ref}
        title={`돋보기 · ${target.label}`}
        tabIndex={-1}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: target.device.width,
          height: target.device.height,
          border: 0,
          background: "white",
          transformOrigin: "0 0",
          transform: `translate(${size / 2 - px * k}px, ${size / 2 - py * k}px) scale(${k})`,
        }}
      />
      <span
        style={{
          position: "absolute",
          left: "50%",
          bottom: 10,
          transform: "translateX(-50%)",
          padding: "2px 8px",
          borderRadius: 8,
          background: "rgba(0, 0, 0, 0.62)",
          color: shellColor.onAccent,
          fontSize: 11,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        {failed ? "렌즈를 그리지 못했어요" : `${target.label} · ${power}×`}
      </span>
    </div>
  );
}

export function MagnifierLayer({
  targets,
  partnerOf,
  power,
  size,
  onPower,
  onSize,
}: {
  targets: readonly MagnifierTarget[];
  partnerOf: (frameId: string) => string | null;
  power: number;
  size: number;
  onPower: (power: number) => void;
  onSize: (size: number) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<Pointer | null>(null);
  const [tick, setTick] = useState(0);
  const lastShot = useRef(0);

  // 가만히 있어도 화면이 움직일 수 있다(불러오기 · 애니메이션) — 천천히 다시 뜬다
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), SNAPSHOT_IDLE_MS);
    return () => clearInterval(timer);
  }, []);

  // 휠은 수동 리스너여야 기본 스크롤을 막을 수 있다
  const latest = useRef({ power, size, onPower, onSize });
  useLayoutEffect(() => {
    latest.current = { power, size, onPower, onSize };
  });
  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY || event.deltaX;
      if (!delta) return;
      const direction = delta < 0 ? 1 : -1;
      const now = latest.current;
      if (event.shiftKey) {
        now.onSize(clamp(now.size + direction * LENS_SIZE.step, LENS_SIZE.min, LENS_SIZE.max));
      } else {
        now.onPower(clamp(now.power + direction * LENS_POWER.step, LENS_POWER.min, LENS_POWER.max));
      }
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const lenses = placeLenses(pointer, targets, partnerOf);
  return (
    <div
      ref={layer}
      data-testid="magnifier-layer"
      onMouseMove={(event) => {
        setPointer({ x: event.clientX, y: event.clientY });
        const now = Date.now();
        if (now - lastShot.current >= SNAPSHOT_THROTTLE_MS) {
          lastShot.current = now;
          setTick((value) => value + 1);
        }
      }}
      onMouseLeave={() => setPointer(null)}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 5,
        cursor: lenses.length ? "crosshair" : "zoom-in",
        background: "transparent",
      }}
    >
      {lenses.map((placement) => (
        <Lens
          key={placement.target.frameId}
          placement={placement}
          power={power}
          size={size}
          tick={tick}
        />
      ))}
    </div>
  );
}
