/**
 * 기기 상태바 · 화면 가림(노치·섬·펀치홀) · 하단 막대를 iframe **위에** 그린다(누르기는 통과).
 * 앱은 같은 기기의 안전 영역을 받으므로(프레임이 `deviceId` 로 준다) 앱 내용과 겹치는 자리가 맞는다.
 *
 * 배치:
 * - iOS 섬 기기: 시각은 섬 왼쪽 귀의 가운데, 아이콘은 오른쪽 귀의 가운데, 세로는 섬의 가운데
 * - iOS 노치 기기: 같은 규칙을 노치 양옆 귀에
 * - iPhone SE: 20pt 줄 — 신호·와이파이 왼쪽 · 시각 가운데 · 배터리 오른쪽
 * - Android(Pixel 8 AVD 캡처 실측): 시각 왼쪽 30dp · 아이콘 오른쪽 28.6dp · 세로 = 펀치홀 가운데.
 *   상태바가 더 낮은 Galaxy 는 같은 배치를 상태바 높이 비율로 줄인다(근사)
 */
import type { CSSProperties } from "react";

import { BOTTOM_BAR_SHAPE, type LabDevice } from "../../lab-devices";
import { shellColor } from "../theme";

type Style = "light" | "dark";

const ink = (style: Style) => (style === "light" ? shellColor.statusLight : shellColor.statusDark);

const overlay: CSSProperties = { position: "absolute", pointerEvents: "none" };

/** 시각 · 아이콘을 잰 기기(Pixel 8)의 상태바 높이 — 낮은 상태바는 이 비율로 줄여 그린다 */
const PIXEL_STATUS_BAR = 50.29;

function IosSignal({ color }: { color: string }) {
  return (
    <svg width={18} height={12} viewBox="0 0 18 12" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5} y={9 - i * 3} width={3} height={3 + i * 3} rx={0.8} fill={color} />
      ))}
    </svg>
  );
}

function IosWifi({ color }: { color: string }) {
  return (
    <svg width={16} height={12} viewBox="0 0 16 12" aria-hidden>
      <path
        d="M8 2.4c2.3 0 4.4.9 6 2.4l1.1-1.2A10.2 10.2 0 0 0 8 .7 10.2 10.2 0 0 0 .9 3.6L2 4.8a8.6 8.6 0 0 1 6-2.4Z"
        fill={color}
      />
      <path
        d="M8 5.8c1.4 0 2.6.5 3.6 1.4l1.1-1.2A7 7 0 0 0 8 4.1 7 7 0 0 0 3.3 6l1.1 1.2c1-.9 2.2-1.4 3.6-1.4Z"
        fill={color}
      />
      <path d="M8 9.1c.6 0 1.1.2 1.5.6L8 11.4 6.5 9.7c.4-.4.9-.6 1.5-.6Z" fill={color} />
    </svg>
  );
}

function IosBattery({ color }: { color: string }) {
  return (
    <svg width={27} height={13} viewBox="0 0 27 13" aria-hidden>
      <rect
        x={0.5}
        y={0.5}
        width={23}
        height={12}
        rx={3.8}
        fill="none"
        stroke={color}
        strokeOpacity={0.35}
      />
      <rect x={2} y={2} width={20} height={9} rx={2.5} fill={color} />
      <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill={color} fillOpacity={0.4} />
    </svg>
  );
}

function AndroidIcons({ color }: { color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <svg width={17} height={17} viewBox="0 0 17 17" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 4.3}
            y={12 - i * 3.6}
            width={3}
            height={5 + i * 3.6}
            rx={1.5}
            fill={color}
            fillOpacity={i === 3 ? 0.45 : 1}
          />
        ))}
      </svg>
      <svg width={19} height={15} viewBox="0 0 19 15" aria-hidden>
        <path d="M9.5 15 0 4.2A14.6 14.6 0 0 1 9.5.7 14.6 14.6 0 0 1 19 4.2L9.5 15Z" fill={color} />
      </svg>
      <svg width={30} height={15} viewBox="0 0 30 15" aria-hidden>
        <rect x={0} y={0} width={26} height={15} rx={7.5} fill={color} fillOpacity={0.35} />
        <rect x={0} y={0} width={20} height={15} rx={7.5} fill={color} />
        <rect x={27} y={4.5} width={2.5} height={6} rx={1.2} fill={color} fillOpacity={0.35} />
      </svg>
    </span>
  );
}

function Cutout({ device }: { device: LabDevice }) {
  const { cutout, width } = device;
  if (cutout.kind === "dynamic-island") {
    return (
      <div
        data-testid="device-cutout"
        style={{
          ...overlay,
          left: (width - cutout.width) / 2,
          top: cutout.top,
          width: cutout.width,
          height: cutout.height,
          borderRadius: cutout.height / 2,
          background: shellColor.glass,
        }}
      />
    );
  }
  if (cutout.kind === "notch") {
    const { width: w, height: h } = cutout;
    const e = 6;
    const r = 20;
    return (
      <svg
        data-testid="device-cutout"
        width={w + e * 2}
        height={h}
        viewBox={`${-e} 0 ${w + e * 2} ${h}`}
        style={{ ...overlay, left: (width - w) / 2 - e, top: 0 }}
        aria-hidden
      >
        <path
          d={`M ${-e} 0 H ${w + e} C ${w + e * 0.4} 0 ${w} ${e * 0.4} ${w} ${e} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${e} C 0 ${e * 0.4} ${-e * 0.4} 0 ${-e} 0 Z`}
          fill={shellColor.glass}
        />
      </svg>
    );
  }
  if (cutout.kind === "punch-hole") {
    return (
      <div
        data-testid="device-cutout"
        style={{
          ...overlay,
          left: cutout.centerX - cutout.diameter / 2,
          top: cutout.top,
          width: cutout.diameter,
          height: cutout.diameter,
          borderRadius: "50%",
          background: shellColor.glass,
        }}
      />
    );
  }
  return null;
}

export function DeviceOverlays({
  device,
  clock,
  style,
}: {
  device: LabDevice;
  /** 상태바 시각("9:41") */
  clock: string;
  style: Style;
}) {
  const color = ink(style);
  const { width, statusBarHeight: sb, cutout } = device;
  const bar: CSSProperties = {
    ...overlay,
    left: 0,
    top: 0,
    width,
    height: sb,
    color,
    fontFamily: '-apple-system, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
  };

  let statusBar;
  if (device.platform === "android") {
    const centerY = cutout.kind === "punch-hole" ? cutout.top + cutout.diameter / 2 : sb / 2;
    // 시각 · 아이콘 크기와 자리는 Pixel 8 캡처 실측이다. 상태바가 더 낮은 기기(Galaxy 34dp 안팎)는
    // 같은 비율로 줄인다 — One UI 상태바 글자는 재지 않았다(근사)
    const k = Math.min(1, sb / PIXEL_STATUS_BAR);
    statusBar = (
      <div data-testid="device-status-bar" style={bar}>
        <span
          style={{
            position: "absolute",
            left: 30 * k,
            top: centerY,
            transform: "translateY(-50%)",
            fontSize: 20 * k,
            fontWeight: 500,
            letterSpacing: 0.2,
            fontFamily: '"Google Sans", Roboto, "Segoe UI", sans-serif',
          }}
        >
          {clock}
        </span>
        <span
          style={{
            position: "absolute",
            right: 28.6 * k,
            top: centerY,
            transform: `translateY(-50%) scale(${k})`,
            transformOrigin: "right center",
          }}
        >
          <AndroidIcons color={color} />
        </span>
      </div>
    );
  } else if (device.bottomBar === "home-button") {
    statusBar = (
      <div data-testid="device-status-bar" style={bar}>
        <span
          style={{
            position: "absolute",
            left: 6,
            top: sb / 2,
            transform: "translateY(-50%)",
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          <IosSignal color={color} />
          <IosWifi color={color} />
        </span>
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: sb / 2,
            transform: "translate(-50%, -50%)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {clock}
        </span>
        <span
          style={{ position: "absolute", right: 6, top: sb / 2, transform: "translateY(-50%)" }}
        >
          <IosBattery color={color} />
        </span>
      </div>
    );
  } else {
    const cutWidth = cutout.kind === "dynamic-island" || cutout.kind === "notch" ? cutout.width : 0;
    const centerY =
      cutout.kind === "dynamic-island" ? cutout.top + cutout.height / 2 : Math.min(sb / 2, 24);
    const ear = (width - cutWidth) / 2;
    statusBar = (
      <div data-testid="device-status-bar" style={bar}>
        <span
          style={{
            position: "absolute",
            left: ear / 2,
            top: centerY,
            transform: "translate(-50%, -50%)",
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.4,
          }}
        >
          {clock}
        </span>
        <span
          style={{
            position: "absolute",
            left: width - ear / 2,
            top: centerY,
            transform: "translate(-50%, -50%)",
            display: "flex",
            gap: 6,
            alignItems: "center",
          }}
        >
          <IosSignal color={color} />
          <IosWifi color={color} />
          <IosBattery color={color} />
        </span>
      </div>
    );
  }

  const bottom =
    device.bottomBar === "home-button" ? null : (
      <div
        data-testid="device-bottom-bar"
        style={{
          ...overlay,
          left: (width - BOTTOM_BAR_SHAPE[device.bottomBar].width) / 2,
          bottom: BOTTOM_BAR_SHAPE[device.bottomBar].bottom,
          width: BOTTOM_BAR_SHAPE[device.bottomBar].width,
          height: BOTTOM_BAR_SHAPE[device.bottomBar].height,
          borderRadius: 3,
          background: color,
          opacity: device.platform === "android" ? 0.8 : 1,
        }}
      />
    );

  return (
    <>
      {statusBar}
      <Cutout device={device} />
      {bottom}
    </>
  );
}
