/**
 * 셸 ↔ 참고 시안(`src/reference/`) 연결 — 기기 화면 위 겹치기 · 「옆에 나란히 놓기」 칸 ·
 * 「AI에게 넘기기」 파일에 싣는 시안 이미지.
 *
 * 겹치기 층은 `DeviceFrame` 의 `screenOverlay` 자리(상태바 · 가림 뒤)에 **감싸지 않고** 놓는다 —
 * z-index · isolation · opacity · transform 이 있는 상자로 감싸면 「다른 곳만 표시」가 iframe 과
 * 섞이지 않는다(`ReferenceOverlay` 머리말).
 */
import {
  displayScale,
  getReferenceStore,
  ReferenceOverlay,
  ReferenceSidePhone,
  useReferencesFor,
  type Reference,
  type ReferenceScope,
} from "../reference";
import type { HandoffReference } from "../design-editor/handoff";
import type { LabDevice } from "../lab-devices";
import { DeviceFrame } from "./device/DeviceFrame";
import type { FrameSpec } from "./frameSpecs";
import { statusBarClock } from "./time";

/** 이 프레임에 보일 시안을 찾는 범위 — 셸 라우트(패턴) · 프레임의 시안 · 기기 */
export const referenceScopeOf = (route: string, spec: FrameSpec): ReferenceScope => ({
  route,
  draftId: spec.config.designDraftId ?? null,
  platform: spec.device.platform,
  deviceId: spec.device.id,
});

/** 기기 화면 위 겹치기(반투명 · 다른 곳만 · 밀어서 비교). 「옆에 나란히」면 아무것도 그리지 않는다 */
export function FrameReference({ scope, device }: { scope: ReferenceScope; device: LabDevice }) {
  const { reference, url } = useReferencesFor(scope);
  return (
    <ReferenceOverlay reference={reference} url={url} width={device.width} height={device.height} />
  );
}

/** 「옆에 나란히 놓기」 — 같은 기기 외형 안에 시안 이미지만(셸 상태바 · 가림은 빼고) */
export function SideReferenceFrame({
  reference,
  url,
  device,
  scale,
  now,
  realMs,
}: {
  reference: Reference | null;
  url: string | null;
  device: LabDevice;
  scale: number;
  now: string | null;
  realMs: number;
}) {
  return (
    <DeviceFrame
      device={device}
      scale={scale}
      clock={statusBarClock(now, realMs)}
      statusBarStyle="dark"
      hideOverlays
      testID="device-reference-side"
    >
      <ReferenceSidePhone
        reference={reference}
        url={url}
        width={device.width}
        height={device.height}
      />
    </DeviceFrame>
  );
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("이미지를 읽지 못했어요"));
    reader.readAsDataURL(blob);
  });

/**
 * 「AI에게 넘기기」 가 화면마다 묻는 참고 시안 — 그 화면 · 지금 시안 · 기기에 보일 시안 한 장.
 * `align.scale` 은 **이미지 1px 이 기기 화면에서 몇 CSS px 인가**(폭 맞춤을 풀어 곱한 값)이고,
 * `offsetX`·`offsetY` 는 그 배율을 곱한 뒤 더한 CSS px 이다.
 */
export function handoffReferencesFor(scope: Omit<ReferenceScope, "route">, device: LabDevice) {
  return async (route: string): Promise<HandoffReference | null> => {
    const store = getReferenceStore();
    await store.ready();
    const reference = store.activeFor({ ...scope, route });
    if (!reference) return null;
    return {
      name: reference.name,
      dataUrl: await blobToDataUrl(reference.blob),
      align: {
        scale: displayScale(reference.align, reference.naturalWidth, device.width),
        offsetX: reference.align.offsetX,
        offsetY: reference.align.offsetY,
      },
    };
  };
}
