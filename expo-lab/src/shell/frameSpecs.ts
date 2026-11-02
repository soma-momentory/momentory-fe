/**
 * 셸 상태 → 그릴 프레임 목록. 순수 함수라 레이아웃마다 어떤 설정의 프레임이 몇 개 뜨는지
 * 테스트로 고정한다(`__tests__/frameSpecs.test.ts`).
 *
 * 프레임 id 는 **안정적이어야 한다** — 가짜 DB 가 `frameId:datasetId` 로 localStorage 에
 * 남으므로, 같은 자리의 프레임은 다시 불러와도 같은 데이터를 이어 쓴다.
 */
import { datasets } from "../fake-server";
import {
  DATASET_IDS,
  type DatasetId,
  type LabFrameConfig,
  type SampleParams,
} from "../lab-contract";
import { findDevice, labDevices, type LabDevice } from "../lab-devices";
import type { ShellState } from "./hashState";
import { findRoute, resolveHref, shellRoutes, type ShellRoute } from "./routes";
import { stateConfig, statesFor, type ScreenStateId } from "./screenStates";

/**
 * 셸이 프레임에 싣는 설정. `textScale` 은 1 이면 싣지 않는다(설정 문자열이 바뀌면 프레임이 다시 뜨므로).
 */
export type ShellFrameConfig = LabFrameConfig;

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
  /** 「상태별로 보기」 칸이면 그 상태 */
  screenState?: ScreenStateId;
  /**
   * 다른 서버에서 띄운다 — 「AI 수정 결과」 미리보기의 주소(예: `http://localhost:8103`). 없으면 셸과 같은 서버.
   * 다른 출처라 셸이 `contentDocument` 를 못 읽는다(돋보기 · 눌러 고르기를 못 쓴다)
   */
  origin?: string;
  /** 처음 열 주소를 이것으로 — 새 화면 미리보기처럼 이 서버의 라우트 목록에 없는 주소 */
  startPath?: string;
  /** 미리보기면 그 작업 공간(머리 이름 · 「시안 보기로 돌아가기」) */
  preview?: FramePreview;
};

/** 「AI 수정 결과 보기」 — 작업 공간의 미리보기 서버를 B(또는 한 화면)에 띄운다 */
export type FramePreview = {
  url: string;
  workspaceId: string;
  title: string;
  /** 새 화면이면 그 화면 주소(`newRoutes[0]`) — 이 서버에는 없는 라우트다 */
  route: string | null;
};

/**
 * 미리보기를 건 프레임 — 다른 서버에서 같은 설정으로 띄운다. 시안은 걸지 않는다(시안은 이 서버의
 * localStorage 에 있고, 미리보기는 AI 가 이미 코드로 옮긴 결과다). `shellOrigin` 을 실어 프레임이 셸에 말하게 한다
 */
export function withPreview(
  spec: FrameSpec,
  preview: FramePreview,
  shellOrigin: string,
): FrameSpec {
  const origin = preview.url.replace(/\/+$/, "");
  return {
    ...spec,
    origin,
    preview,
    ...(preview.route ? { startPath: preview.route } : {}),
    config: { ...spec.config, designDraftId: null, shellOrigin },
  };
}

export type SampleParamsFor = (datasetId: string, now?: string | null) => SampleParams;

type Overrides = {
  frameId: string;
  route: ShellRoute;
  device?: LabDevice;
  dataset?: DatasetId;
  signedIn?: boolean;
  failPaths?: readonly string[];
  latencyMs?: number;
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
    latencyMs: o.latencyMs ?? state.latencyMs,
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

/** 한 화면에 시안이 걸렸을 때 그 아래 숨겨 두는 승인본 프레임 — 「원래대로 잠깐 보기」 */
export const PEEK_FRAME_ID = "solo-base";

/**
 * 「원래대로 잠깐 보기」 용 승인본 프레임(시안 없음 · 같은 라우트 · 같은 데이터 · 같은 기기).
 * 한 화면 + 시안이 있을 때만 띄운다(성능). 주소는 셸이 `solo` 를 따라 옮긴다
 */
export function peekFrameFor(
  state: ShellState,
  sample: SampleParamsFor,
  realMs: number,
): FrameSpec[] {
  if (state.layout !== "single" || !state.draft) return [];
  const route = findRoute(state.route) ?? shellRoutes[0]!;
  return [
    buildSpec(
      state,
      { frameId: PEEK_FRAME_ID, route, designDraftId: null },
      "지금 앱",
      "approved",
      sample,
      realMs,
    ),
  ];
}

/** 「상태별로 보기」 칸의 프레임 id — 상태마다 하나(가짜 DB 가 칸마다 따로 남는다) */
export const stateFrameId = (id: ScreenStateId) => `s-${id}`;

/**
 * 「상태별로 보기」 칸들. `failure` 칸은 이 화면이 부른 주소를 아직 모르면 실패 주소가 비어 있다 —
 * 셸(`StatesView`)이 주소를 모은 뒤 `withFailPaths` 로 채워 붙인다.
 */
export function stateSpecs(
  state: ShellState,
  route: ShellRoute,
  sample: SampleParamsFor,
  realMs: number,
  detected: readonly string[] = [],
): FrameSpec[] {
  return statesFor(route).map((def) => {
    const config = stateConfig(route, def.id, detected);
    const spec = buildSpec(
      state,
      {
        frameId: stateFrameId(def.id),
        route,
        signedIn: route.preset.signedIn,
        dataset: config.dataset,
        latencyMs: config.latencyMs,
        failPaths: config.failPaths,
      },
      def.label,
      "cell",
      sample,
      realMs,
    );
    return { ...spec, screenState: def.id };
  });
}

/** 실패 주소만 바꾼 칸 — 「불러오기 실패」 칸이 모은 주소를 받는다 */
export const withFailPaths = (spec: FrameSpec, failPaths: readonly string[]): FrameSpec => ({
  ...spec,
  config: { ...spec.config, failPaths: [...failPaths] },
});

/** 데이터 세트 id → 사람이 읽는 이름(「신규 사용자」 …) */
export const datasetLabel = (id: string) => datasets.find((item) => item.id === id)?.label ?? id;

export function framesFor(state: ShellState, sample: SampleParamsFor, realMs: number): FrameSpec[] {
  const route = findRoute(state.route) ?? shellRoutes[0]!;
  const build = (o: Overrides, label: string, role: FrameRole) =>
    buildSpec(state, o, label, role, sample, realMs);

  switch (state.layout) {
    case "single":
      return [build({ frameId: "solo", route }, "", state.draft ? "draft" : "solo")];
    case "ab":
      return [
        build({ frameId: "A", route, designDraftId: null }, "A · 지금 앱", "approved"),
        build({ frameId: "B", route, designDraftId: state.draft }, "B · 시안", "draft"),
      ];
    case "matrix":
      if (state.matrix === "devices") {
        return labDevices.map((device) =>
          build({ frameId: `m-${device.id}`, route, device }, device.label, "cell"),
        );
      }
      return DATASET_IDS.map((dataset) =>
        build({ frameId: `m-${dataset}`, route, dataset }, datasetLabel(dataset), "cell"),
      );
    case "states":
      return stateSpecs(state, route, sample, realMs);
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
