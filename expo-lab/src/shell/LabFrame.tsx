/**
 * 실제 앱 프레임 한 벌 — `<iframe name={encodeFrameConfig(config)} src="/<라우트>">` 를 기기 외형에
 * 넣는다. iframe 의 CSS 크기는 기기 크기 그대로이고, 확대는 바깥 transform 이다.
 *
 * **처음 주소는 붙을 때 한 번만 정한다** — 그 뒤 주소는 프레임 안의 앱이 움직인다(셸은
 * `lab:navigate` 로만 옮긴다). 설정이 바뀌면 부모가 key 를 바꿔 새로 붙인다.
 *
 * 「AI 수정 결과」 미리보기(`spec.origin`)는 같은 주소를 작업 공간의 다른 서버에서 연다 — 다른 출처라
 * 메시지 규칙은 `frameBus` · `frame/messages.ts` 머리말.
 */
import { useCallback, useEffect, useState } from "react";

import { encodeFrameConfig } from "../lab-contract";
import { DeviceFrame } from "./device/DeviceFrame";
import { frameBus, useFrameBus } from "./frameBus";
import { matchPathname } from "./routes";
import type { FrameSpec } from "./frameSpecs";
import { statusBarClock } from "./time";

export function LabFrame({
  spec,
  scale,
  realMs,
  startPath,
  skipVia = false,
}: {
  spec: FrameSpec;
  scale: number;
  realMs: number;
  /** 붙을 때 열 주소. 없으면 spec.href */
  startPath?: string | null;
  /**
   * 두 단계 열기(`openVia`)를 건너뛰고 목적지를 바로 연다 — 「불러오는 중」 상태처럼 서버가 오래
   * 늦으면 경유 화면의 응답도 늦어 목적지에 영영 못 가기 때문이다
   */
  skipVia?: boolean;
}) {
  useFrameBus();
  const runtime = frameBus.get(spec.frameId);
  // 차갑게 열면 앱이 다른 곳으로 보내는 화면은 경유 화면을 먼저 열고 목적지로 옮긴다
  const [boot] = useState(() => {
    const target = spec.startPath ?? startPath ?? spec.href;
    const via = skipVia ? undefined : matchPathname(target)?.openVia;
    return { target, via, src: via ? via.path : target };
  });
  // 「AI 수정 결과」 미리보기는 작업 공간의 다른 서버에서 같은 주소를 연다
  const src = spec.origin ? `${spec.origin}${boot.src}` : boot.src;
  // 렌더마다 새 함수면 React 가 ref 를 떼었다 붙여 「준비 전」으로 돌아간다 — 고정한다
  const frameId = spec.frameId;
  const ref = useCallback(
    (element: HTMLIFrameElement | null) => frameBus.attach(frameId, element),
    [frameId],
  );
  // 붙는 순간의 주소를 적어 둔다 — 프레임이 아직 `lab:route` 를 못 보내도 셸이 어디인지 안다
  useEffect(() => {
    frameBus.setPathname(frameId, boot.target);
    if (!boot.via) return;
    frameBus.queueNavigate(frameId, {
      target: boot.target,
      afterRequest: boot.via.afterRequest,
      fallbackMs: 2500 + (spec.config.latencyMs ?? 0),
    });
    return () => frameBus.cancelNavigate(frameId);
    // 붙을 때 한 번 — 설정이 바뀌면 부모가 key 를 바꿔 새로 붙인다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
        data-cross-origin={spec.origin ? "1" : undefined}
        // 프레임이 lab:ready 를 보냈나(검사 · 다른 출처 미리보기가 셸에 말하는지 보는 자리)
        data-ready={runtime.ready ? "1" : "0"}
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
