/**
 * 실제 기기처럼 보이는 외형 — 화면 자리에 iframe(자식)을 놓고, 그 위에 상태바 · 가림 · 하단 막대를
 * 그린다. 화면 크기는 `device.width × device.height` 그대로이고, 확대는 바깥에서 `scale` 로 한다.
 *
 * Android 는 로컬 SDK 의 에뮬레이터 스킨(back.webp + mask.webp)이 있으면 그것으로 그린다 —
 * 화면 모서리 · 펀치홀은 스킨 mask 를 CSS mask 로 뒤집어 iframe 을 깎는다. 없으면 SVG 외형.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import type { LabDevice } from "../../lab-devices";
import { shellColor } from "../theme";
import { chromeGeometry, sideButtons } from "./geometry";
import { DeviceOverlays } from "./StatusBar";

export const skinUrl = (name: string, file: "back.webp" | "mask.webp") =>
  `/device-skins/${name}/${file}`;

const skinCache = new Map<string, boolean>();

/** 스킨 이미지가 개발 서버에 있나 — `link-device-skins.mjs` 를 돌렸는지 */
export function useSkinAvailable(device: LabDevice): boolean {
  const name = device.skin?.name;
  const [available, setAvailable] = useState(() => (name ? (skinCache.get(name) ?? false) : false));
  useEffect(() => {
    if (!name || skinCache.has(name)) return;
    const image = new Image();
    image.onload = () => {
      skinCache.set(name, true);
      setAvailable(true);
    };
    image.onerror = () => skinCache.set(name, false);
    image.src = skinUrl(name, "back.webp");
  }, [name]);
  return available;
}

export function DeviceFrame({
  device,
  scale,
  clock,
  statusBarStyle,
  children,
  screenOverlay,
  hideOverlays = false,
  testID,
}: {
  device: LabDevice;
  scale: number;
  clock: string;
  statusBarStyle: "light" | "dark";
  children: ReactNode;
  /**
   * 화면 위에 얹는 층(참고 시안). 상태바 · 가림 **뒤에** 그려서 시안의 상태바가 셸 상태바와 겹친다.
   * ⚠ 감싸지 않고 그대로 둔다 — z-index · isolation · opacity · transform 이 있는 상자로 감싸면
   * 「다른 곳만 표시」(mix-blend-mode)가 iframe 과 섞이지 않는다
   */
  screenOverlay?: ReactNode;
  /** 상태바 · 가림 · 하단 막대를 그리지 않는다(시안 이미지만 세우는 「옆에 나란히」 칸) */
  hideOverlays?: boolean;
  testID?: string;
}) {
  const skinAvailable = useSkinAvailable(device);
  const g = chromeGeometry(device, skinAvailable);
  const isSkin = g.kind === "android-skin" && device.skin;

  const screen: CSSProperties = {
    position: "absolute",
    left: g.screenX,
    top: g.screenY,
    width: device.width,
    height: device.height,
    overflow: "hidden",
    background: shellColor.glass,
    borderRadius: isSkin ? 0 : device.cornerRadius,
  };
  if (isSkin && device.skin) {
    // mask.webp 는 화면 **바깥**(모서리 · 펀치홀)이 불투명하다 — 꽉 찬 층에서 빼서 뒤집는다
    const mask = `url(${skinUrl(device.skin.name, "mask.webp")}), linear-gradient(black, black)`;
    Object.assign(screen, {
      maskImage: mask,
      WebkitMaskImage: mask,
      maskSize: "100% 100%",
      WebkitMaskSize: "100% 100%",
      maskComposite: "exclude",
      WebkitMaskComposite: "xor",
    });
  }

  return (
    <div
      data-testid={testID}
      data-chrome={g.kind}
      style={{ width: g.outerWidth * scale, height: g.outerHeight * scale, flex: "none" }}
    >
      <div
        style={{
          position: "relative",
          width: g.outerWidth,
          height: g.outerHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {isSkin && device.skin ? (
          <>
            <img
              src={skinUrl(device.skin.name, "back.webp")}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                width: g.outerWidth,
                height: g.outerHeight,
                pointerEvents: "none",
              }}
            />
            {/* 펀치홀 · 모서리 자리가 비어 보이지 않게 화면 뒤를 검게 */}
            <div
              style={{
                position: "absolute",
                left: g.screenX,
                top: g.screenY,
                width: device.width,
                height: device.height,
                borderRadius: device.cornerRadius,
                background: shellColor.glass,
              }}
            />
          </>
        ) : (
          <Body device={device} g={g} />
        )}
        <div style={screen} data-testid={testID ? `${testID}-screen` : undefined}>
          {children}
          {hideOverlays ? null : (
            <DeviceOverlays device={device} clock={clock} style={statusBarStyle} />
          )}
          {screenOverlay}
        </div>
      </div>
    </div>
  );
}

function Body({ device, g }: { device: LabDevice; g: ReturnType<typeof chromeGeometry> }) {
  const light = g.kind === "ios-home-button";
  const buttons = sideButtons(g.kind, g.bodyHeight);
  return (
    <>
      {buttons.map((button, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: g.bodyY + button.top,
            left: button.side === "left" ? g.bodyX - 3 : g.bodyX + g.bodyWidth - 1,
            width: 4,
            height: button.length,
            borderRadius: 2,
            background: light ? shellColor.seRim : shellColor.bodyButton,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: g.bodyX,
          top: g.bodyY,
          width: g.bodyWidth,
          height: g.bodyHeight,
          borderRadius: g.bodyRadius,
          background: light ? shellColor.seBody : shellColor.body,
          boxShadow: `inset 0 0 0 ${light ? 2 : 3}px ${light ? shellColor.seRim : shellColor.bodyRim}, 0 18px 40px rgba(0, 0, 0, 0.18)`,
        }}
      />
      {light ? (
        <>
          {/* 수화부 · 전면 카메라 */}
          <div
            style={{
              position: "absolute",
              left: g.bodyX + g.bodyWidth / 2 - 30,
              top: 50,
              width: 60,
              height: 6,
              borderRadius: 3,
              background: shellColor.seRim,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: g.bodyX + g.bodyWidth / 2 - 54,
              top: 47,
              width: 12,
              height: 12,
              borderRadius: 6,
              background: shellColor.seRim,
            }}
          />
          {/* 홈 버튼 */}
          <div
            data-testid="device-home-button"
            style={{
              position: "absolute",
              left: g.bodyX + g.bodyWidth / 2 - 33,
              top: g.screenY + device.height + (g.bodyHeight - g.screenY - device.height) / 2 - 33,
              width: 66,
              height: 66,
              borderRadius: 33,
              boxShadow: `inset 0 0 0 3px ${shellColor.seButtonRing}`,
            }}
          />
        </>
      ) : null}
    </>
  );
}
