/**
 * 셸 상태 ↔ URL 해시. 새로고침 · 뒤로/앞으로 · 주소 공유가 같은 화면을 다시 연다.
 *
 *   #/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=ab
 *            &now=2026-11-03T21:30:00%2B09:00&latency=1000&fail=/api/v1/reports&scale=1.3
 *            &zoom=0.6&draft=<시안 id>&repeat=0&signedIn=0&matrix=datasets&panel=controls
 *
 * 기본값과 같은 항목은 적지 않는다(주소를 짧게). 읽을 수 없는 값은 기본값으로 돌린다.
 */
import { DATASET_IDS, type DatasetId, type LabPlatform } from "../lab-contract";
import { DEFAULT_DEVICE_ID, labDevices } from "../lab-devices";
import { DEFAULT_ROUTE_PATH, findRoute } from "./routes";

export const LAYOUTS = [
  { id: "single", label: "한 화면" },
  { id: "ab", label: "A/B 비교" },
  { id: "grid", label: "전체 화면" },
  { id: "matrix", label: "매트릭스" },
] as const;
export type LayoutId = (typeof LAYOUTS)[number]["id"];

export const MATRIX_AXES = [
  { id: "devices", label: "기기별" },
  { id: "datasets", label: "데이터 세트별" },
] as const;
export type MatrixAxis = (typeof MATRIX_AXES)[number]["id"];

export const TEXT_SCALES = [1, 1.3, 1.5] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

export const LATENCIES = [0, 1000, 5000] as const;

/** 오른쪽 패널 — 처음엔 디자인 편집기가 보인다 */
export const SIDE_PANELS = ["design", "controls", "log"] as const;
export type SidePanel = (typeof SIDE_PANELS)[number];

export type Zoom = "fit" | number;

export type ShellState = {
  /** 라우트 패턴(예: "/diary/[id]") */
  route: string;
  dataset: DatasetId;
  platform: LabPlatform;
  device: string;
  layout: LayoutId;
  matrix: MatrixAxis;
  signedIn: boolean;
  /** 가상 시각(ISO · KST). null 이면 실제 시각 */
  now: string | null;
  latencyMs: number;
  failPaths: string[];
  textScale: TextScale;
  zoom: Zoom;
  /** 시안 프레임에 걸 시안 id. null 이면 시안 없음 */
  draft: string | null;
  /** 「오늘 다시 쓰기」 — 가짜 서버가 하루 1회 제한을 풀어 준다 */
  repeatToday: boolean;
  /** 오른쪽 패널 탭 */
  panel: SidePanel;
};

export const DEFAULT_STATE: ShellState = {
  route: DEFAULT_ROUTE_PATH,
  dataset: "normal",
  platform: "ios",
  device: DEFAULT_DEVICE_ID.ios,
  layout: "single",
  matrix: "devices",
  signedIn: true,
  now: null,
  latencyMs: 0,
  failPaths: [],
  textScale: 1,
  zoom: "fit",
  draft: null,
  repeatToday: true,
  panel: "design",
};

const HASH_PREFIX = "#/screens";

const isDataset = (value: string | null): value is DatasetId =>
  value != null && (DATASET_IDS as readonly string[]).includes(value);

/** 라우트를 고르면 그 화면의 프리셋(세션 · 데이터 세트)을 적용한다 */
export function withRoute(state: ShellState, path: string): ShellState {
  const route = findRoute(path);
  if (!route) return state;
  const dataset = route.preset.dataset ?? (state.dataset === "new-user" ? "normal" : state.dataset);
  return { ...state, route: route.path, signedIn: route.preset.signedIn, dataset };
}

/** 플랫폼을 바꾸면 기기도 그 플랫폼의 기본으로 */
export function withPlatform(state: ShellState, platform: LabPlatform): ShellState {
  if (platform === state.platform) return state;
  return { ...state, platform, device: DEFAULT_DEVICE_ID[platform] };
}

export function parseHash(hash: string): ShellState {
  if (!hash.startsWith(HASH_PREFIX)) return DEFAULT_STATE;
  const query = hash.slice(HASH_PREFIX.length).replace(/^\?/, "");
  const p = new URLSearchParams(query);
  const d = DEFAULT_STATE;

  const route = findRoute(p.get("route"))?.path ?? d.route;
  const platform: LabPlatform = p.get("platform") === "android" ? "android" : "ios";
  const device =
    labDevices.find((item) => item.id === p.get("device") && item.platform === platform)?.id ??
    DEFAULT_DEVICE_ID[platform];
  const layout = LAYOUTS.find((item) => item.id === p.get("layout"))?.id ?? d.layout;
  const matrix = MATRIX_AXES.find((item) => item.id === p.get("matrix"))?.id ?? d.matrix;
  const dataset = isDataset(p.get("dataset")) ? (p.get("dataset") as DatasetId) : d.dataset;
  const now = p.get("now");
  const latency = Number(p.get("latency"));
  const scale = Number(p.get("scale"));
  const zoomRaw = p.get("zoom");
  const zoomNum = Number(zoomRaw);

  return {
    route,
    dataset,
    platform,
    device,
    layout,
    matrix,
    signedIn: p.get("signedIn") !== "0",
    now: now && !Number.isNaN(Date.parse(now)) ? now : null,
    latencyMs: Number.isFinite(latency) && latency > 0 ? Math.min(latency, 60_000) : 0,
    failPaths: (p.get("fail") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.startsWith("/")),
    textScale: TEXT_SCALES.find((item) => item === scale) ?? d.textScale,
    zoom: zoomRaw && zoomNum >= 0.1 && zoomNum <= 2 ? zoomNum : "fit",
    draft: p.get("draft") || null,
    repeatToday: p.get("repeat") !== "0",
    panel: SIDE_PANELS.find((item) => item === p.get("panel")) ?? d.panel,
  };
}

export function serializeHash(state: ShellState): string {
  const d = DEFAULT_STATE;
  const p = new URLSearchParams();
  p.set("route", state.route);
  p.set("dataset", state.dataset);
  p.set("platform", state.platform);
  p.set("device", state.device);
  p.set("layout", state.layout);
  if (state.layout === "matrix") p.set("matrix", state.matrix);
  if (!state.signedIn) p.set("signedIn", "0");
  if (state.now) p.set("now", state.now);
  if (state.latencyMs !== d.latencyMs) p.set("latency", String(state.latencyMs));
  if (state.failPaths.length) p.set("fail", state.failPaths.join(","));
  if (state.textScale !== d.textScale) p.set("scale", String(state.textScale));
  if (state.zoom !== "fit") p.set("zoom", String(state.zoom));
  if (state.draft) p.set("draft", state.draft);
  if (!state.repeatToday) p.set("repeat", "0");
  if (state.panel !== d.panel) p.set("panel", state.panel);
  // 「/」 와 「,」 는 그대로 둬도 해시에서 안전하다 — 사람이 읽기 쉽게 되돌린다
  return `${HASH_PREFIX}?${p.toString().replace(/%2F/g, "/").replace(/%2C/g, ",")}`;
}
