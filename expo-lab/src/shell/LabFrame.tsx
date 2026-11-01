/**
 * 실제 앱 프레임 한 벌 — `<iframe name={encodeFrameConfig(config)} src="/<라우트>">` 를 기기 외형에
 * 넣는다. iframe 의 CSS 크기는 기기 크기 그대로이고, 확대는 바깥 transform 이다.
 *
 * **처음 주소는 붙을 때 한 번만 정한다** — 그 뒤 주소는 프레임 안의 앱이 움직인다(셸은
 * `lab:navigate` 로만 옮긴다). 설정이 바뀌면 부모가 key 를 바꿔 새로 붙인다.
 */
import { useCallback, useEffect, useState } from "react";

import { encodeFrameConfig } from "../lab-contract";
import { DeviceFrame } from "./device/DeviceFrame";
import { frameBus, useFrameBus } from "./frameBus";
import type { FrameSpec } from "./frameSpecs";
import { statusBarClock } from "./time";

export function LabFrame({
  spec,
  scale,
  realMs,
  startPath,
}: {
  spec: FrameSpec;
  scale: number;
  realMs: number;
  /** 붙을 때 열 주소. 없으면 spec.href */
  startPath?: string | null;
}) {
  useFrameBus();
  const runtime = frameBus.get(spec.frameId);
  const [src] = useState(() => startPath ?? spec.href);
  // 렌더마다 새 함수면 React 가 ref 를 떼었다 붙여 「준비 전」으로 돌아간다 — 고정한다
  const frameId = spec.frameId;
  const ref = useCallback(
    (element: HTMLIFrameElement | null) => frameBus.attach(frameId, element),
    [frameId],
  );
  // 붙는 순간의 주소를 적어 둔다 — 프레임이 아직 `lab:route` 를 못 보내도 셸이 어디인지 안다
  useEffect(() => frameBus.setPathname(frameId, src), [frameId, src]);
  return (
    <DeviceFrame
      device={spec.device}
      scale={scale}
      clock={statusBarClock(spec.config.now, realMs)}
      statusBarStyle={runtime.statusBar}
      testID={`device-${spec.frameId}`}
    >
      <iframe
        ref={ref}
        title={`${spec.label || spec.route.title} — ${spec.device.label}`}
        name={encodeFrameConfig(spec.config)}
        src={src}
        data-testid={`lab-frame-${spec.frameId}`}
        data-frame-id={spec.frameId}
        style={{
          display: "block",
          width: spec.device.width,
          height: spec.device.height,
          border: 0,
          background: "white",
        }}
      />
    </DeviceFrame>
  );
}
