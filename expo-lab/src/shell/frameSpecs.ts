/**
 * 셸 상태 → 그릴 프레임 목록. 순수 함수라 레이아웃마다 어떤 설정의 프레임이 몇 개 뜨는지
 * 테스트로 고정한다(`__tests__/frameSpecs.test.ts`).
 *
 * 프레임 id 는 **안정적이어야 한다** — 가짜 DB 가 `frameId:datasetId` 로 localStorage 에
 * 남으므로, 같은 자리의 프레임은 다시 불러와도 같은 데이터를 이어 쓴다.
 */
import { slotState, type VariantGroupView } from "../agent/variants";
import { datasets } from "../fake-server";
import type { DatasetId, LabFrameConfig, SampleParams } from "../lab-contract";
import { findDevice, labDevices, type LabDevice } from "../lab-devices";
import type { ShellState } from "./hashState";
import { findRoute, resolveHref, shellRoutes, type ShellRoute } from "./routes";

/**
 * 셸이 프레임에 싣는 설정. `textScale` 은 1 이면 싣지 않는다(설정 문자열이 바뀌면 프레임이 다시 뜨므로).
 */
export type ShellFrameConfig = LabFrameConfig;

/** 한 화면 · A/B 의 A · B · 표의 한 칸 · 시안 비교의 시안 한 자리(기존은 `a`) */
export type FrameRole = "solo" | "a" | "b" | "cell" | "variant";

export type FrameSpec = {
  frameId: string;
  label: string;
  role: FrameRole;
  route: ShellRoute;
  device: LabDevice;
  config: ShellFrameConfig;
  /** 처음 열 주소 */
  href: string;
  /**
   * 다른 서버에서 띄운다 — 「AI 수정 결과」 미리보기의 주소(예: `http://localhost:8103`). 없으면 셸과 같은 서버.
   * 다른 출처라 셸이 `contentDocument` 를 못 읽는다(돋보기를 못 쓴다)
   */
  origin?: string;
  /** 처음 열 주소를 이것으로 — 새 화면 미리보기처럼 이 서버의 라우트 목록에 없는 주소 */
  startPath?: string;
  /** 미리보기면 그 작업 공간(머리 이름 · 「AI 결과 닫기」) */
  preview?: FramePreview;
  /** 시안 비교의 시안 한 자리 — 머리 둘째 줄 · 「이 시안 고르기」 */
  variant?: FrameVariant;
  /**
   * 화면을 띄울 수 없을 때 폰 자리에 보일 한 줄(만드는 중 · 시작하는 중 · 켜는 중 · 실패) — 있으면 iframe 을 붙이지 않는다.
   * 시안의 수정 결과 화면이 아직 없는데 이 서버의 앱을 띄우면 「시안」이 지금 앱처럼 보이기 때문이다
   */
  placeholder?: string;
};

/** 시안 비교의 시안 한 자리 */
export type FrameVariant = {
  workspaceId: string;
  groupId: string;
  index: number;
  total: number;
  /** 머리 둘째 줄(「준비됨」 · 「만드는 중」 · 「실패」 …) */
  label: string;
  tone: "busy" | "ready" | "failed" | "idle";
  /** 요약 첫 줄(「방향: …」) */
  summaryLine: string | null;
  /** 「다시 켜기」를 보일지(수정 결과 화면이 실패 · 꺼짐) */
  canStart: boolean;
};

/** 「AI 수정 결과 보기」 — 작업 공간의 미리보기 서버를 B(또는 한 화면)에 띄운다 */
export type FramePreview = {
  url: string;
  workspaceId: string;
  title: string;
  /** 새 화면이면 그 화면 주소(`newRoutes[0]`) — 이 서버에는 없는 라우트다 */
  route: string | null;
  /** 시안 비교에서 고른 시안이면 그 자리(최종 A/B 의 설명 · 「다른 시안 다시 보기」 · 「이 시안으로 확정」) */
  variant?: { groupId: string; index: number; total: number };
};

/**
 * 미리보기를 건 프레임 — 다른 서버에서 **같은 설정**으로 띄운다(B 화면 상태도 그대로).
 * `shellOrigin` 을 실어 프레임이 셸에 말하게 한다
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
    config: { ...spec.config, shellOrigin },
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
  todayDiary?: boolean;
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
    signedIn: o.signedIn ?? state.signedIn,
    latencyMs: o.latencyMs ?? state.latencyMs,
    failPaths: o.failPaths ?? state.failPaths,
    repeatToday: state.repeatToday,
    ...(state.textScale !== 1 ? { textScale: state.textScale } : {}),
    ...((o.todayDiary ?? state.todayDiary) ? { todayDiary: true } : {}),
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

/** 데이터 세트 id → 사람이 읽는 이름(「신규 사용자」 …) */
export const datasetLabel = (id: string) => datasets.find((item) => item.id === id)?.label ?? id;

/**
 * B 의 설정 조각 — 「B 화면 상태」가 없으면(A와 같게) 아무것도 덮지 않는다. 데이터 세트가 묶인
 * 화면(로그인 전 · 온보딩)은 B 도 그 세트다(옛 주소에 `bdata` 가 남아 있어도)
 */
const bOverrides = (state: ShellState, route: ShellRoute): Partial<Overrides> =>
  state.b
    ? {
        dataset: route.preset.dataset ?? state.b.dataset,
        latencyMs: state.b.latencyMs,
        failPaths: state.b.failPaths,
      }
    : {};

export function framesFor(state: ShellState, sample: SampleParamsFor, realMs: number): FrameSpec[] {
  const route = findRoute(state.route) ?? shellRoutes[0]!;
  const build = (o: Overrides, label: string, role: FrameRole) =>
    buildSpec(state, o, label, role, sample, realMs);

  switch (state.layout) {
    case "single":
      return [build({ frameId: "solo", route }, "", "solo")];
    case "ab":
      return [
        build({ frameId: "A", route }, "A · 지금 앱", "a"),
        build({ frameId: "B", route, ...bOverrides(state, route) }, "B · 지금 앱", "b"),
      ];
    case "variants":
      // 시안 자리는 서버의 작업 공간 목록이 있어야 안다 — `variantSpecs` 가 이 「기존」 뒤에 붙인다
      return [build({ frameId: "V0", route }, "기존 · 지금 앱", "a")];
    case "matrix":
      return labDevices.map((device) =>
        build({ frameId: `m-${device.id}`, route, device }, device.label, "cell"),
      );
    case "grid":
      return shellRoutes.map((item) =>
        build(
          {
            frameId: `g-${item.path}`,
            route: item,
            signedIn: item.preset.signedIn,
            failPaths: item.preset.failPaths ?? state.failPaths,
            todayDiary: item.preset.todayDiary === true,
            dataset:
              item.preset.dataset ?? (state.dataset === "new-user" ? "normal" : state.dataset),
          },
          item.title,
          "cell",
        ),
      );
  }
}

/**
 * 「시안 비교」 — 기존(지금 앱 · `V0`) + 시안마다 한 대(`V<k>`). 같은 라우트 · 같은 기기 · 같은 화면 상태(A 의 것)이고,
 * 시안은 그 작업 공간의 미리보기 서버(다른 출처 · `withPreview`)에서 뜬다. 화면을 띄울 수 없는 시안(만드는 중 · 시작하는 중 ·
 * 켜는 중 · 실패)은 `placeholder` 한 줄만 둔다.
 */
export function variantSpecs(
  state: ShellState,
  group: VariantGroupView | null,
  shellOrigin: string,
  sample: SampleParamsFor,
  realMs: number,
): FrameSpec[] {
  const base = framesFor({ ...state, layout: "variants" }, sample, realMs);
  const route = base[0]?.route ?? findRoute(state.route) ?? shellRoutes[0]!;
  if (!group) return base;
  const slots = group.members.map((member): FrameSpec => {
    const index = member.group?.index ?? 0;
    const slot = slotState(member);
    const spec = buildSpec(
      state,
      { frameId: `V${index}`, route },
      `시안 ${index}`,
      "variant",
      sample,
      realMs,
    );
    const variant: FrameVariant = {
      workspaceId: member.id,
      groupId: group.id,
      index,
      total: group.total,
      label: slot.label,
      tone: slot.tone,
      summaryLine: member.summaryLine,
      canStart: slot.canStart,
    };
    const url = member.preview?.url;
    if (!slot.ready || !url)
      return { ...spec, variant, placeholder: slot.note ?? "수정 결과 화면이 아직 없어요" };
    return {
      ...withPreview(
        spec,
        {
          url,
          workspaceId: member.id,
          title: member.title,
          route: null,
          variant: { groupId: group.id, index, total: group.total },
        },
        shellOrigin,
      ),
      variant,
    };
  });
  return [...base, ...slots];
}
