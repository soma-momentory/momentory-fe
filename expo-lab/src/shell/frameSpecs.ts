/**
 * 셸 상태 → 그릴 프레임 목록. 순수 함수라 레이아웃마다 어떤 설정의 프레임이 몇 개 뜨는지
 * 테스트로 고정한다(`__tests__/frameSpecs.test.ts`).
 *
 * 프레임 id 는 **안정적이어야 한다** — 가짜 DB 가 `frameId:datasetId` 로 localStorage 에
 * 남으므로, 같은 자리의 프레임은 다시 불러와도 같은 데이터를 이어 쓴다.
 */
import {
  DATASET_IDS,
  type DatasetId,
  type LabFrameConfig,
  type SampleParams,
} from "../lab-contract";
import { findDevice, labDevices, type LabDevice } from "../lab-devices";
import type { ShellState } from "./hashState";
import { findRoute, resolveHref, shellRoutes, type ShellRoute } from "./routes";

/**
 * 셸이 프레임에 싣는 설정. `textScale` 은 아직 공유 계약에 없다 — 프레임(갈래 A)이 읽기 시작하면
 * 계약으로 옮긴다. 1 이면 싣지 않는다(설정 문자열이 바뀌면 프레임이 다시 뜨므로).
 */
export type ShellFrameConfig = LabFrameConfig & { textScale?: number };

export type FrameRole = "solo" | "approved" | "draft" | "cell";

export type FrameSpec = {
  frameId: string;
  label: string;
  role: FrameRole;
  route: ShellRoute;
  device: LabDevice;
  config: ShellFrameConfig;
  /** 처음 열 주소 */
  href: string;
};

export type SampleParamsFor = (datasetId: string, now?: string | null) => SampleParams;

type Overrides = {
  frameId: string;
  route: ShellRoute;
  device?: LabDevice;
  dataset?: DatasetId;
  signedIn?: boolean;
  failPaths?: readonly string[];
  designDraftId?: string | null;
};

function buildSpec(
  state: ShellState,
  o: Overrides,
  label: string,
  role: FrameRole,
  sample: SampleParamsFor,
  realMs: number,
): FrameSpec {
  const device = o.device ?? findDevice(state.device);
  const datasetId = o.dataset ?? state.dataset;
  const config: ShellFrameConfig = {
    frameId: o.frameId,
    datasetId,
    platform: device.platform,
    deviceId: device.id,
    now: state.now,
    designDraftId: o.designDraftId === undefined ? state.draft : o.designDraftId,
    signedIn: o.signedIn ?? state.signedIn,
    latencyMs: state.latencyMs,
    failPaths: o.failPaths ?? state.failPaths,
    repeatToday: state.repeatToday,
    ...(state.textScale !== 1 ? { textScale: state.textScale } : {}),
  };
  return {
    frameId: o.frameId,
    label,
    role,
    route: o.route,
    device,
    config,
    href: resolveHref(o.route, sample(datasetId, state.now), state.now, realMs),
  };
}

export function framesFor(state: ShellState, sample: SampleParamsFor, realMs: number): FrameSpec[] {
  const route = findRoute(state.route) ?? shellRoutes[0]!;
  const build = (o: Overrides, label: string, role: FrameRole) =>
    buildSpec(state, o, label, role, sample, realMs);

  switch (state.layout) {
    case "single":
      return [build({ frameId: "solo", route }, "", state.draft ? "draft" : "solo")];
    case "ab":
      return [
        build({ frameId: "A", route, designDraftId: null }, "A · 승인본", "approved"),
        build({ frameId: "B", route, designDraftId: state.draft }, "B · 시안", "draft"),
      ];
    case "matrix":
      if (state.matrix === "devices") {
        return labDevices.map((device) =>
          build({ frameId: `m-${device.id}`, route, device }, device.label, "cell"),
        );
      }
      return DATASET_IDS.map((dataset) =>
        build({ frameId: `m-${dataset}`, route, dataset }, dataset, "cell"),
      );
    case "grid":
      return shellRoutes.map((item) =>
        build(
          {
            frameId: `g-${item.path}`,
            route: item,
            signedIn: item.preset.signedIn,
            failPaths: item.preset.failPaths ?? state.failPaths,
            dataset:
              item.preset.dataset ?? (state.dataset === "new-user" ? "normal" : state.dataset),
          },
          item.title,
          "cell",
        ),
      );
  }
}
