/**
 * Expo Lab 셸 — 앱의 **모든 화면을 실제 앱 코드로** 띄우는 작업대.
 *
 *   왼쪽: 라우트 목록(앱 순서 · 접히는 묶음) · 가운데: 도구줄(설명 · 확대 · 돋보기) +
 *   한 화면 / 나란히 비교(A/B) / 모든 화면 / 기기별 / 시안 비교(기존 + AI 시안 최대 3 — 하나를 고르면 최종 A/B) ·
 *   오른쪽: 화면 조건(화면 상태 · B 화면 상태 … · 서버 요청 기록) ·
 *   AI에게 맡기기(`src/agent/` — 「수정 결과 보기」는 B(한 화면이면 그 폰)를 작업 공간의 미리보기 서버로 바꾼다)
 *   · 목록 맨 위 「＋ 새 화면 만들기」 · 「새 화면 (작업 중)」(`AgentNav.tsx`)
 *
 * 양옆 패널은 접힌다(머리줄 「목록」「패널」 · 패널 안 «/× · 해시 `nav=0` `side=0`). 창이
 * `NARROW_WIDTH` 보다 좁으면(브라우저 확대 등) 둘 다 저절로 접히고, 같은 버튼이 무대 위에 뜨는
 * 서랍으로 연다 — 무대는 `MIN_STAGE_WIDTH` 아래로 줄지 않는다.
 *
 * 프레임 = `<iframe name={encodeFrameConfig(config)}>` 안의 실제 앱(갈래 A). 셸은 설정을 iframe 이름에
 * 싣고, 주소는 `lab:navigate` 로만 옮긴다. 상태는 전부 URL 해시(`hashState.ts`)에 남는다.
 *
 * 프레임을 언제 다시 띄우나:
 * - 프레임 설정(데이터 세트 · 세션 · 시각 · 지연 · 실패 · 기기 …)이 바뀌면 — key 가 설정
 *   문자열이라 새로 붙고, **지금 서 있던 주소**에서 다시 시작한다(흐름을 잃지 않게)
 * - 목록에서 화면을 고르면 — 준비된 프레임은 `lab:navigate`, 아직 준비 전이면 새로 붙인다
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  AgentPanel,
  defaultAgentClient,
  NewScreenForm,
  VariantDecision,
  type WorkspaceSummary,
} from "../agent";
import {
  groupBusy,
  groupProgress,
  pickGroup,
  shouldStartPreview,
  variantGroups,
  type VariantGroupView,
} from "../agent/variants";
import { resetFakeData, sampleParams } from "../fake-server";
import { encodeFrameConfig, type LabPlatform, type SampleParams } from "../lab-contract";
import { findDevice } from "../lab-devices";
import { newScreenPath, NewScreenNav, useLabWorkspaces } from "./AgentNav";
import { skinKnownAvailable } from "./device/DeviceFrame";
import { chromeGeometry } from "./device/geometry";
import { ControlsPanel, type ControlActions } from "./ControlsPanel";
import { frameBus, useFrameBus } from "./frameBus";
import {
  datasetLabel,
  framesFor,
  variantSpecs,
  withPreview,
  type FramePreview,
  type FrameSpec,
} from "./frameSpecs";
import { GridView } from "./GridView";
import {
  LAYOUTS,
  parseHash,
  serializeHash,
  stepZoom,
  withPlatform,
  withRoute,
  type LayoutId,
  type ShellState,
  type SidePanel,
  type StateConfig,
  type Zoom,
} from "./hashState";
import { LabFrame } from "./LabFrame";
import { LENS_POWER, LENS_SIZE, MagnifierLayer, type MagnifierTarget } from "./Magnifier";
import { findRoute, isOnScreenOf, matchPathname, shellRoutes, type ShellRoute } from "./routes";
import { RouteTree } from "./RouteTree";
import { StageToolbar } from "./StageToolbar";
import { stateLabel, ToolbarStatePicker, useDetectedPaths } from "./ScreenStatePicker";
import { LOADING_LATENCY_MS } from "./screenStates";
import { FRAME_GAP, MIN_CELL_WIDTH, STAGE_PAD_BOTTOM, STAGE_PAD_X, fitScale } from "./stageFit";
import { shellColor, shellFont } from "./theme";
import { setClock, shiftDays } from "./time";

/** 프레임 주소가 이만큼 그대로면 「지금 화면」으로 본다 */
const ROUTE_SETTLE_MS = 400;

/** 이보다 좁은 창(CSS px)에서는 양옆 패널이 저절로 접혀 서랍이 된다 */
export const NARROW_WIDTH = 1180;
/** 무대는 이보다 좁아지지 않는다 */
const MIN_STAGE_WIDTH = 360;
const NAV_WIDTH = 250;
const SIDE_WIDTH = 340;
/** 접힌 패널 자리의 막대 폭 */
const RAIL_WIDTH = 44;
const HEADER_HEIGHT = 52;
/** A/B 기기 위 이름 두 줄(이름 + 화면 상태)의 높이 */
const AB_CAPTION = 46;
/** 시안 비교에서 기기 아래 「이 시안 고르기」 줄의 높이(간격 포함) */
const VARIANT_PICK = 38;

const SIDE_TABS = [
  ["controls", "화면 조건", "조건 바꾸기"],
  ["agent", "AI에게 맡기기", "AI 맡기기"],
] as const satisfies readonly (readonly [SidePanel, string, string])[];
const SIDE_TAB_TITLE: Record<SidePanel, string> = {
  controls: "화면 상태(기록 보통 · 기록 많음 · 불러오는 중 …) · 기기 · 시각 · 글씨 크기를 바꿔요",
  agent:
    "지금 보는 화면을 Claude Code · Codex 에게 고치게 해요 — 고친 결과는 B 자리에 띄워 지금 앱과 비교해요",
  "new-screen": "어떤 화면인지 적으면 AI 가 앱에 새 화면을 만들어요",
};
/** 탭 줄에서 이 패널일 때 눌려 보이는 탭 — 「새 화면 만들기」는 「AI에게 맡기기」 안에 있다 */
const tabOf = (panel: SidePanel): SidePanel => (panel === "new-screen" ? "agent" : panel);

/** 다른 서버(작업 공간)의 화면은 셸이 문서를 못 읽는다 — 돋보기가 빠지는 이유 */
export const CROSS_ORIGIN_NOTE = "AI 수정 결과 화면은 다른 서버라 돋보기를 쓸 수 없어요";
export const VARIANTS_CROSS_ORIGIN_NOTE = "시안 화면은 다른 서버라 돋보기는 「기존」에만 써요";

/** 꺼진 미리보기를 켜고 기다리는 간격 · 횟수(2초 × 90 = 3분 — Metro 첫 묶기가 1분 남짓 걸린다) */
const PREVIEW_WAIT_MS = 2000;
const PREVIEW_WAIT_TRIES = 90;

/** 미리보기를 거는 프레임 — 한 화면은 그 폰, A/B 는 B. 다른 레이아웃은 걸지 않는다 */
const previewFrameId = (layout: LayoutId) =>
  layout === "single" ? "solo" : layout === "ab" ? "B" : null;

/** 「AI 수정 결과 보기」를 건 프레임 목록 — 그 자리 하나만 다른 서버에서 같은 설정으로 띄운다 */
const applyPreview = (
  list: readonly FrameSpec[],
  preview: FramePreview | null,
  layout: LayoutId,
): FrameSpec[] => {
  const target = preview ? previewFrameId(layout) : null;
  if (!preview || !target) return [...list];
  return list.map((spec) =>
    spec.frameId === target ? withPreview(spec, preview, window.location.origin) : spec,
  );
};

/** 레이아웃의 프레임 목록 — 시안 비교는 시안 묶음(서버의 작업 공간 목록)까지 있어야 그린다 */
const specsFor = (
  state: ShellState,
  preview: FramePreview | null,
  group: VariantGroupView | null,
  realMs: number,
): FrameSpec[] =>
  state.layout === "variants"
    ? variantSpecs(state, group, window.location.origin, cachedSampleParams, realMs)
    : applyPreview(framesFor(state, cachedSampleParams, realMs), preview, state.layout);

/** 칸마다 차갑게 여는 레이아웃 — 셸이 주소를 옮기지 않고, 칸 안의 이동을 따라가지 않는다 */
const isWall = (layout: LayoutId) => layout === "grid";

const shellRouteCount = shellRoutes.length;

const ellipsis = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

/** 프레임을 새로 붙일지 가르는 열쇠 — 설정 + (미리보기면) 그 서버와 처음 주소 */
const configKey = (spec: FrameSpec) =>
  `${encodeFrameConfig(spec.config)}${spec.origin ? `@${spec.origin}${spec.startPath ?? ""}` : ""}`;

/**
 * `sampleParams` 는 데이터 세트를 통째로 시드해서 고른다 — 전체 화면(57칸)이 매번 부르지 않게
 * (데이터 세트 · 가상 시각 · 실제 날짜)마다 한 번만 부른다
 */
const sampleCache = new Map<string, SampleParams>();
const cachedSampleParams = (datasetId: string, now?: string | null): SampleParams => {
  const key = `${datasetId}|${now ?? new Date().toDateString()}`;
  let value = sampleCache.get(key);
  if (!value) {
    value = sampleParams(datasetId, now);
    sampleCache.set(key, value);
  }
  return value;
};

function useRealClock(): number {
  const [ms, setMs] = useState(() => Date.now());
  useEffect(() => {
    // 분이 바뀔 때마다 — 상태바 시계가 실제 시각을 따라간다
    const tick = () => setMs(Date.now());
    let interval: ReturnType<typeof setInterval> | undefined;
    const align = setTimeout(
      () => {
        tick();
        interval = setInterval(tick, 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
    return () => {
      clearTimeout(align);
      if (interval) clearInterval(interval);
    };
  }, []);
  return ms;
}

function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 1000, height: 800 });
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

const primaryFrameId = (layout: LayoutId, specs: readonly FrameSpec[]) =>
  layout === "single" ? "solo" : layout === "ab" ? "B" : (specs[0]?.frameId ?? "solo");

export function ShellApp() {
  const [state, setState] = useState<ShellState>(() => parseHash(window.location.hash));
  const realMs = useRealClock();
  const [nonces, setNonces] = useState<Record<string, number>>({});
  const [syncNav, setSyncNav] = useState(true);
  const [scrollRef, area] = useElementSize<HTMLDivElement>();
  const narrow = useWindowWidth() < NARROW_WIDTH;
  /** 좁은 창에서 열린 서랍 — 해시에 남기지 않는다 */
  const [openDrawer, setDrawer] = useState<"nav" | "side" | null>(null);
  const drawer = narrow ? openDrawer : null;
  useFrameBus();
  /** 「AI 수정 결과 보기」 — 작업 공간의 미리보기 서버를 B(한 화면이면 그 폰)에. 해시에 남기지 않는다 */
  const [preview, setPreview] = useState<FramePreview | null>(null);
  /** 작업 공간 목록 — 왼쪽 「새 화면 (작업 중)」 · 시안 비교의 시안 자리 */
  const { workspaces: labWorkspaces, refresh: refreshWorkspaces } = useLabWorkspaces();
  const groups = useMemo(() => variantGroups(labWorkspaces), [labWorkspaces]);
  const group = pickGroup(groups, state.group, state.route);

  const specs = useMemo(
    () => specsFor(state, preview, group, realMs),
    [state, realMs, preview, group],
  );

  // 프레임 메시지 처리(이벤트)가 최신 값을 읽는 자리 — 그리기가 끝난 뒤 맞춘다
  const stateRef = useRef(state);
  const specsRef = useRef(specs);
  const syncRef = useRef(syncNav);
  const previewRef = useRef(preview);
  const groupRef = useRef(group);
  useLayoutEffect(() => {
    stateRef.current = state;
    specsRef.current = specs;
    syncRef.current = syncNav;
    previewRef.current = preview;
    groupRef.current = group;
  });

  const writeHash = (next: ShellState, mode: "push" | "replace" | "none") => {
    const hash = serializeHash(next);
    if (mode === "none" || hash === window.location.hash) return;
    if (mode === "push") window.history.pushState(null, "", hash);
    else window.history.replaceState(null, "", hash);
  };

  const bump = useCallback((frameIds: readonly string[]) => {
    if (!frameIds.length) return;
    setNonces((current) => {
      const next = { ...current };
      for (const id of frameIds) next[id] = (next[id] ?? 0) + 1;
      return next;
    });
  }, []);

  /**
   * 상태를 바꾸고, 필요하면 프레임 주소도 옮긴다.
   * - `target`: 모든 프레임을 이 주소로(없으면 각 프레임의 라우트 주소)
   * - `force`: 이미 그 라우트에 있어도 옮긴다(목록을 다시 누름)
   * - `remount`: 옮기지 말고 새로 띄운다(회고를 처음부터)
   */
  const goTo = useCallback(
    (
      next: ShellState,
      options: {
        history: "push" | "replace" | "none";
        navigate?: boolean;
        target?: string;
        force?: boolean;
        remount?: boolean;
        except?: string;
      },
    ) => {
      const before = new Map(specsRef.current.map((spec) => [spec.frameId, configKey(spec)]));
      const nextSpecs = specsFor(next, previewRef.current, groupRef.current, Date.now());
      const toBump: string[] = [];
      if (options.navigate && !isWall(next.layout)) {
        for (const spec of nextSpecs) {
          if (spec.frameId === options.except) continue;
          const current = frameBus.get(spec.frameId).pathname;
          const onRoute = current != null && matchPathname(current)?.path === next.route;
          if (onRoute && !options.force && !options.target) continue;
          const target = options.target ?? spec.href;
          if (current === target && !options.force && !options.remount) continue;
          frameBus.setPathname(spec.frameId, target);
          const alive = before.get(spec.frameId) === configKey(spec);
          if (!alive) continue; // 새로 붙는 프레임은 위 주소에서 시작한다
          // 두 단계로 여는 화면은 경유 화면 위에서만 바로 옮긴다 — 아니면 새로 띄워 경유부터
          const via = matchPathname(target)?.openVia;
          const fromVia = !via || current?.split("?")[0] === via.path;
          if (
            options.remount ||
            !fromVia ||
            !frameBus.post(spec.frameId, {
              type: "lab:navigate",
              pathname: target,
              ...(via ? { mode: "push" as const } : {}),
            })
          ) {
            toBump.push(spec.frameId);
          }
        }
      }
      setState(next);
      writeHash(next, options.history);
      bump(toBump);
    },
    [bump],
  );

  // 뒤로/앞으로 · 주소창에서 해시를 고침
  useEffect(() => {
    if (!window.location.hash.startsWith("#/screens")) writeHash(state, "replace");
    const onPop = () => goTo(parseHash(window.location.hash), { history: "none", navigate: true });
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 프레임 메시지
  useEffect(() => frameBus.listen(window), []);

  // 프레임 안에서 화면이 바뀌었다 → 목록의 현재 화면을 따라가고, 같이 움직이기면 다른 프레임도 옮긴다.
  // 앱은 진입 가드 때문에 「/ → 목적지」처럼 잠깐 다른 주소를 거친다 — **마지막 주소**만 본다
  // (바로 따라가면 A 의 「/」 가 B 를 「/」 로 보내고 B 가 다시 A 를 보내는 핑퐁이 된다)
  useEffect(() => {
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const settle = (frameId: string) => {
      const s = stateRef.current;
      if (isWall(s.layout)) return;
      const ids = specsRef.current.map((spec) => spec.frameId);
      if (!ids.includes(frameId)) return;
      if (!syncRef.current && frameId !== primaryFrameId(s.layout, specsRef.current)) return;
      const pathname = frameBus.get(frameId).pathname;
      const route = pathname ? matchPathname(pathname) : undefined;
      if (!pathname || !route) return;
      // 시트 줄(`screenOf`)은 그 라우트 주소에 있는 동안 지금 화면이다 — 쉼터 줄로 옮겨 가지 않는다
      if (isOnScreenOf(s.route, pathname)) return;
      if (route.path === s.route && !syncRef.current) return;
      goTo(
        { ...s, route: route.path },
        { history: "replace", navigate: syncRef.current, target: pathname, except: frameId },
      );
    };
    const off = frameBus.onRoute((frameId) => {
      clearTimeout(timers.get(frameId));
      timers.set(
        frameId,
        setTimeout(() => settle(frameId), ROUTE_SETTLE_MS),
      );
    });
    return () => {
      off();
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [goTo]);

  const set = (patch: Partial<ShellState>) => goTo({ ...state, ...patch }, { history: "push" });

  const actions: ControlActions = {
    set,
    setPlatform: (platform: LabPlatform) =>
      goTo(withPlatform(state, platform), { history: "push" }),
    shiftDay: (days) => set({ now: shiftDays(state.now, days, Date.now()) }),
    setClock: (hhmm) => set({ now: setClock(state.now, hhmm, Date.now()) }),
    resetData: () => {
      const toBump: string[] = [];
      for (const spec of specs) {
        if (!frameBus.post(spec.frameId, { type: "lab:resetData" })) {
          // 프레임이 아직 말을 못 들으면 셸이 직접 비운다(같은 출처 localStorage)
          resetFakeData(spec.config);
          toBump.push(spec.frameId);
        }
      }
      bump(toBump);
    },
    reload: () => bump(specs.map((spec) => spec.frameId)),
    // 「불러오는 중」 처음부터 — A 쪽은 B 가 A와 같으면 B 도 같이
    replay: (which) =>
      bump(
        which === "b"
          ? ["B"]
          : state.layout === "ab"
            ? state.b
              ? ["A"]
              : ["A", "B"]
            : specs.map((spec) => spec.frameId),
      ),
    restartDiary: (path) =>
      goTo(withRoute(state, path), { history: "push", navigate: true, force: true, remount: true }),
  };

  const selectRoute = (route: ShellRoute) =>
    goTo(withRoute(state, route.path), { history: "push", navigate: true, force: true });

  const setLayout = (layout: LayoutId) => {
    if (layout === state.layout) return;
    const primary = frameBus.get(primaryFrameId(state.layout, specs)).pathname;
    const target =
      !isWall(state.layout) && primary && matchPathname(primary)?.path === state.route
        ? primary
        : undefined;
    // 시안 비교는 보던 묶음(없으면 이 화면의 가장 새 묶음)을 주소에 적는다 — 안의 폰이 다른 화면으로 옮겨 가도 그 묶음이다
    const nextGroup =
      layout === "variants"
        ? (state.group ?? pickGroup(groups, null, state.route)?.id ?? null)
        : state.group;
    goTo(
      { ...state, layout, group: nextGroup },
      { history: "push", navigate: true, target, force: true },
    );
  };

  const openFromGrid = (path: string) =>
    goTo(
      { ...withRoute(state, path), layout: "single" },
      { history: "push", navigate: true, force: true },
    );

  const route = findRoute(state.route);
  const frameKey = (spec: FrameSpec) => `${configKey(spec)}#${nonces[spec.frameId] ?? 0}`;
  // 화면 상태 이름(머리 · 도구줄) — 「불러오기 실패」는 이 화면이 부른 주소로 알아본다
  const detected = useDetectedPaths(state.route);
  const labelOf = (config: StateConfig) => (route ? stateLabel(config, route, detected) : "");
  const aStateLabel = labelOf(state);
  const bStateLabel = state.b ? labelOf(state.b) : aStateLabel;

  // ── 확대 ────────────────────────────────────────────────
  // 기기 줄 위에 이미 쓰인 높이(안내 · A/B 설명) — 배율과 무관하므로 그린 뒤 재서 맞춤에 쓴다
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowTop, setRowTop] = useState(12);
  // 매 그리기 뒤에 잰다 — 값이 같으면 다시 그리지 않으므로 돌고 돌지 않는다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const top = rowRef.current?.offsetTop;
    if (top != null && top !== rowTop) setRowTop(top);
  });
  // 설명 줄이 셸을 다시 그리지 않고 커질 때도(시안 확정 칸이 펼쳐짐 등) 다시 잰다 — 기기 줄을 감싼 칸의 크기를 본다
  const [rowEl, setRowEl] = useState<HTMLDivElement | null>(null);
  const attachRow = useCallback((element: HTMLDivElement | null) => {
    rowRef.current = element;
    setRowEl(element);
  }, []);
  useEffect(() => {
    const rowParent = rowEl?.parentElement;
    if (!rowParent || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const top = rowRef.current?.offsetTop;
      if (top != null) setRowTop(top);
    });
    observer.observe(rowParent);
    return () => observer.disconnect();
  }, [rowEl]);
  const captionReserve =
    state.layout === "ab"
      ? AB_CAPTION
      : state.layout === "variants"
        ? AB_CAPTION + VARIANT_PICK
        : 0;
  const phoneSizes = specs.map((spec) => {
    const g = chromeGeometry(spec.device, skinKnownAvailable(spec.device));
    return { width: g.outerWidth, height: g.outerHeight };
  });
  const fitted = fitScale(state.layout, area, rowTop + captionReserve, phoneSizes);
  const scale = state.zoom === "fit" ? fitted : state.zoom;
  const setZoom = (zoom: Zoom) => goTo({ ...state, zoom }, { history: "replace" });
  const stepBy = (direction: 1 | -1) => setZoom(stepZoom(scale, direction));

  // ── 패널 ────────────────────────────────────────────────
  const navDocked = !narrow && state.navOpen;
  const sideDocked = !narrow && state.sideOpen;
  const navVisible = navDocked || drawer === "nav";
  const sideVisible = sideDocked || drawer === "side";
  const toggleNav = () => {
    if (narrow) setDrawer((current) => (current === "nav" ? null : "nav"));
    else goTo({ ...state, navOpen: !state.navOpen }, { history: "replace" });
  };
  const openSide = (panel: SidePanel = state.panel) => {
    if (narrow) setDrawer("side");
    goTo({ ...state, panel, sideOpen: narrow ? state.sideOpen : true }, { history: "replace" });
  };
  const closeSide = () => {
    if (narrow) setDrawer(null);
    else goTo({ ...state, sideOpen: false }, { history: "replace" });
  };
  const toggleSide = () => (sideVisible ? closeSide() : openSide());
  const closeNav = () => {
    if (narrow) setDrawer(null);
    else goTo({ ...state, navOpen: false }, { history: "replace" });
  };

  // A/B 설명의 「B 화면 상태 바꾸기」 — 화면 조건 패널의 그 칸을 열고 커서를 둔다
  const focusBStatePicker = () => {
    openSide("controls");
    setTimeout(() => {
      const select = document.querySelector<HTMLSelectElement>('[data-testid="b-screen-state"]');
      select?.scrollIntoView({ block: "center" });
      select?.focus();
    }, 150);
  };

  // ── AI에게 맡기기 · 수정 결과 보기 ───────────────────────────
  const newScreens = useMemo(
    () => labWorkspaces.filter((w) => w.kind === "new-screen"),
    [labWorkspaces],
  );
  const refreshNewScreens = refreshWorkspaces;
  /** 켜는 중인 미리보기 — 준비되면 저절로 연다(새 화면 목록에서 누른 것) */
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  /** 미리보기를 건다 · 거둔다. 레이아웃도 함께 바꾸면 그 판으로 프레임을 맞춘다 */
  const changePreview = (next: FramePreview | null, layout: LayoutId = state.layout) => {
    const frameId = previewFrameId(layout);
    if (!next && preview) {
      // 새 화면 미리보기에서 돌아오면 이 서버에 없는 주소에 서 있다 — 지금 라우트로 되돌린다
      for (const id of ["solo", "B"]) {
        const pathname = frameBus.get(id).pathname;
        if (pathname && !matchPathname(pathname)) {
          const spec = specs.find((item) => item.frameId === id);
          frameBus.setPathname(id, spec?.href ?? state.route);
        }
      }
    }
    if (next?.route && frameId) frameBus.setPathname(frameId, next.route);
    previewRef.current = next;
    setPreview(next);
    if (layout !== state.layout) goTo({ ...state, layout }, { history: "push" });
  };
  const previewOf = (url: string, ws: WorkspaceSummary): FramePreview => ({
    url,
    workspaceId: ws.id,
    title: ws.title,
    route: ws.kind === "new-screen" ? newScreenPath(ws) : null,
    ...(ws.group
      ? { variant: { groupId: ws.group.id, index: ws.group.index, total: ws.group.total } }
      : {}),
  });
  /** 「수정 결과 보기」 — 화면 수정은 A/B 의 B 에(한 화면이면 그 폰에), 새 화면은 한 화면에(이 서버에는 그 화면이 없다) */
  const openPreview = (url: string, ws: WorkspaceSummary) => {
    setPendingPreview(null);
    if (ws.kind === "new-screen") return changePreview(previewOf(url, ws), "single");
    const target = ws.route ? findRoute(ws.route) : undefined;
    const next = previewOf(url, ws);
    previewRef.current = next;
    setPreview(next);
    // 시안이면 최종 A/B(「다른 시안 다시 보기」가 그 묶음으로) — 시안 비교에서 왔어도 A/B 로
    const layout: LayoutId = state.layout === "single" && !ws.group ? "single" : "ab";
    const groupId = ws.group?.id ?? state.group;
    if (target && target.path !== state.route) {
      goTo(
        { ...withRoute(state, target.path), layout, group: groupId },
        { history: "push", navigate: true, force: true },
      );
    } else if (layout !== state.layout || groupId !== state.group)
      goTo({ ...state, layout, group: groupId }, { history: "push" });
  };

  // ── 시안 비교 ────────────────────────────────────────────
  /** 「시안 비교로 보기」 — 그 묶음의 화면으로 옮겨 시안 비교를 연다 */
  const openVariants = (groupId: string) => {
    const target = groups.find((g) => g.id === groupId)?.route;
    const moved = target && findRoute(target) && findRoute(target)?.path !== state.route;
    const base = moved ? withRoute(state, findRoute(target)!.path) : state;
    previewRef.current = null;
    setPreview(null);
    goTo(
      { ...base, layout: "variants", group: groupId },
      { history: "push", navigate: true, force: Boolean(moved) },
    );
  };
  /** 지금 서 있는 주소 — 레이아웃을 바꿔도 흐름을 이어 가게(그 라우트 위일 때만) */
  const pathOn = (frameId: string) => {
    const pathname = frameBus.get(frameId).pathname;
    return pathname && matchPathname(pathname)?.path === state.route ? pathname : undefined;
  };
  /** 「이 시안 고르기」 — 최종 A/B: A 는 지금 앱, B 는 그 시안의 수정 결과 화면 */
  const pickVariant = (spec: FrameSpec) => {
    if (!spec.preview) return;
    previewRef.current = spec.preview;
    setPreview(spec.preview);
    goTo(
      { ...state, layout: "ab", group: spec.variant?.groupId ?? state.group },
      { history: "push", navigate: true, target: pathOn("V0"), force: true },
    );
  };
  /** 「다른 시안 다시 보기」 — 최종 A/B 에서 그 묶음의 시안 비교로 */
  const backToVariants = () => {
    const groupId = preview?.variant?.groupId ?? state.group;
    const target = pathOn("A");
    previewRef.current = null;
    setPreview(null);
    goTo(
      { ...state, layout: "variants", group: groupId },
      { history: "push", navigate: true, target, force: true },
    );
  };
  // 시안 비교가 열리면 꺼져 있는 시안의 수정 결과 화면을 켠다(실행이 끝난 것만 · 한 번씩).
  // 서버가 한꺼번에 띄우는 수는 `maxPreviews` 로 막는다
  const startedPreviews = useRef(new Set<string>());
  useEffect(() => {
    if (state.layout !== "variants") {
      startedPreviews.current.clear();
      return;
    }
    if (!group) return;
    const todo = group.members.filter(
      (m) => shouldStartPreview(m) && !startedPreviews.current.has(m.id),
    );
    if (!todo.length) return;
    for (const m of todo) startedPreviews.current.add(m.id);
    void (async () => {
      for (const m of todo) await defaultAgentClient.startPreview(m.id);
      void refreshWorkspaces();
    })();
  }, [state.layout, group, refreshWorkspaces]);
  const restartPreview = async (workspaceId: string) => {
    await defaultAgentClient.startPreview(workspaceId);
    void refreshWorkspaces();
  };
  const stopVariants = async (groupId: string) => {
    await defaultAgentClient.stopVariants(groupId);
    void refreshWorkspaces();
  };
  /** 다른 화면의 작업으로 — 그 화면을 열고 오른쪽은 「AI에게 맡기기」 */
  const openWorkspace = (ws: WorkspaceSummary) => {
    if (ws.kind === "new-screen") {
      if (ws.preview?.ready && ws.preview.url) openPreview(ws.preview.url, ws);
      return;
    }
    const target = ws.route ? findRoute(ws.route) : undefined;
    if (!target) return;
    goTo(
      { ...withRoute(state, target.path), panel: "agent", sideOpen: true },
      { history: "push", navigate: true, force: true },
    );
  };
  // 「AI에게 맡기기」 패널은 처음 열 때 붙이고 그 뒤로는 숨기기만 한다(렌더 중 이전 값과 견주는 방식)
  const [agentMounted, setAgentMounted] = useState(state.panel === "agent");
  if (!agentMounted && state.panel === "agent") setAgentMounted(true);

  // 기다리는 동안 셸 상태가 바뀌어도 준비된 순간의 최신 값으로 연다
  const openPreviewRef = useRef(openPreview);
  const pendingRef = useRef(pendingPreview);
  useLayoutEffect(() => {
    openPreviewRef.current = openPreview;
    pendingRef.current = pendingPreview;
  });
  /** 왼쪽 「새 화면 (작업 중)」 — 미리보기가 꺼져 있으면 켜고, 켜지면(2초마다 묻는다 · 3분까지) 연다 */
  const openNewScreen = async (ws: WorkspaceSummary) => {
    if (ws.preview?.ready && ws.preview.url) return openPreview(ws.preview.url, ws);
    setPendingPreview(ws.id);
    pendingRef.current = ws.id;
    if (ws.preview?.status !== "starting") await defaultAgentClient.startPreview(ws.id);
    for (let tries = 0; tries < PREVIEW_WAIT_TRIES; tries += 1) {
      if (pendingRef.current !== ws.id) return; // 다른 것을 눌렀다
      const res = await defaultAgentClient.workspace(ws.id);
      const latest = res.ok ? res.data.workspace : null;
      if (latest?.preview?.ready && latest.preview.url) {
        void refreshNewScreens();
        if (pendingRef.current === ws.id) openPreviewRef.current(latest.preview.url, latest);
        return;
      }
      if (latest?.preview?.status === "failed" || latest?.preview?.status === "stopped") break;
      await new Promise((resolve) => setTimeout(resolve, PREVIEW_WAIT_MS));
    }
    if (pendingRef.current === ws.id) setPendingPreview(null);
    void refreshNewScreens();
  };

  const agentDevice = findDevice(state.device);
  const agentScreen = useMemo(
    () => ({
      route: state.route,
      title: route?.title ?? state.route,
      file: route?.file ?? "",
      specId: route?.specId ?? null,
      device: { label: agentDevice.label, platform: agentDevice.platform },
      datasetLabel: datasetLabel(state.dataset),
    }),
    [state.route, route, agentDevice, state.dataset],
  );

  // ── 키보드 ──────────────────────────────────────────────
  // 한 화면은 그 폰, A/B 는 두 폰 함께. 눌림 상태는 프레임이 알린 `lab:keyboardState` 를 따른다
  const keyboardTargets =
    state.layout === "single"
      ? ["solo"]
      : state.layout === "ab"
        ? ["A", "B"]
        : state.layout === "variants"
          ? specs.filter((spec) => !spec.placeholder).map((spec) => spec.frameId)
          : [];
  const keyboardOpen = keyboardTargets.some((id) => frameBus.get(id).keyboard.open);
  const keyboardReady = keyboardTargets.some((id) => frameBus.get(id).ready);
  const toggleKeyboard = () => {
    const open = !keyboardOpen;
    for (const id of keyboardTargets) frameBus.post(id, { type: "lab:keyboard", open });
  };

  // ── 돋보기 ──────────────────────────────────────────────
  const [lensOn, setLensOn] = useState(false);
  const [lensHeld, setLensHeld] = useState(false);
  const [lensPower, setLensPower] = useState<number>(LENS_POWER.initial);
  const [lensSize, setLensSize] = useState<number>(LENS_SIZE.initial);
  const lensActive = lensOn || lensHeld;

  // 단축키 — 셸에 포커스가 있을 때만(입력칸 · 프레임 안이면 그대로 둔다)
  const keyRef = useRef({ stepBy, setZoom, lensActive, drawer });
  useLayoutEffect(() => {
    keyRef.current = { stepBy, setZoom, lensActive, drawer };
  });
  useEffect(() => {
    const typing = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element || !element.tagName) return false;
      return (
        /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName) || element.isContentEditable === true
      );
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (typing(event.target)) return;
      const k = keyRef.current;
      if (event.ctrlKey || event.metaKey) {
        if (event.key === "=" || event.key === "+") k.stepBy(1);
        else if (event.key === "-" || event.key === "_") k.stepBy(-1);
        else if (event.key === "0") k.setZoom("fit");
        else return;
        event.preventDefault();
        return;
      }
      if (event.altKey) return;
      if (event.key === "z" || event.key === "Z") {
        if (!event.repeat) setLensHeld(true);
      } else if (event.key === "[" && k.lensActive) {
        setLensPower((p) => Math.max(LENS_POWER.min, p - LENS_POWER.step));
      } else if (event.key === "]" && k.lensActive) {
        setLensPower((p) => Math.min(LENS_POWER.max, p + LENS_POWER.step));
      } else if (event.key === "Escape") {
        if (k.lensActive) {
          setLensOn(false);
          setLensHeld(false);
        } else if (k.drawer) setDrawer(null);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "z" || event.key === "Z") setLensHeld(false);
    };
    const onBlur = () => setLensHeld(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ── A/B 차이 보기 ────────────────────────────────────────
  const [diff, setDiff] = useState(false);
  const [diffOpacity, setDiffOpacity] = useState(0.5);
  const overlayDiff = state.layout === "ab" && diff;

  // 시안 비교의 시안들은 「AI 수정 결과 보는 중」 줄이 아니다(시안 비교 설명이 따로 있다)
  const previewSpec = state.layout === "variants" ? undefined : specs.find((spec) => spec.preview);
  const variantsLayout = state.layout === "variants";
  const pickedWorkspace = preview?.variant
    ? (labWorkspaces.find((w) => w.id === preview.workspaceId) ?? null)
    : null;
  const pickedGroup = preview?.variant
    ? (groups.find((g) => g.id === preview.variant?.groupId) ?? null)
    : null;

  const frameLabel = (spec: FrameSpec) =>
    spec.preview && state.layout === "ab"
      ? spec.preview.variant
        ? `B · 시안 ${spec.preview.variant.index} (AI 수정 결과)`
        : `B · AI 수정 결과 (${spec.preview.title})`
      : spec.label;
  /** A/B 머리 둘째 줄 — 그 폰의 화면 상태 */
  const stateCaption = (isB: boolean) =>
    isB && !state.b
      ? `화면 상태: ${bStateLabel} (A와 같게)`
      : `화면 상태: ${isB ? bStateLabel : aStateLabel}`;

  const renderFrame = (spec: FrameSpec, frameScale: number) => {
    const g = chromeGeometry(spec.device, skinKnownAvailable(spec.device));
    const width = Math.max(g.outerWidth * frameScale, MIN_CELL_WIDTH);
    const isB = state.layout === "ab" && spec.frameId === "B";
    const isA = state.layout === "ab" && spec.frameId === "A";
    const twoLine = state.layout === "ab" || variantsLayout;
    const label = frameLabel(spec);
    const variant = spec.variant;
    return (
      <figure
        key={spec.frameId}
        data-testid={`frame-cell-${spec.frameId}`}
        style={{
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          width,
          flex: "none",
          ...(isB && overlayDiff
            ? {
                position: "absolute",
                left: 0,
                top: 0,
                opacity: diffOpacity,
                pointerEvents: "none",
              }
            : {}),
        }}
      >
        {label ? (
          <figcaption
            data-testid={`frame-label-${spec.frameId}`}
            title={label}
            style={{
              width: "100%",
              textAlign: "center",
              visibility: isB && overlayDiff ? "hidden" : "visible",
              ...(twoLine ? { minHeight: AB_CAPTION - 6 } : {}),
            }}
          >
            <span
              style={{
                ...ellipsis,
                fontSize: twoLine ? 14 : 12,
                fontWeight: 700,
                color:
                  (isB && (spec.preview || state.b)) || variant
                    ? shellColor.notice
                    : shellColor.ink,
              }}
            >
              {label}
            </span>
            {variantsLayout ? (
              // 둘째 줄 — 기존은 화면 상태, 시안은 상태(준비됨 · 만드는 중 · 실패) + 방향 한 줄
              <span
                data-testid={`frame-state-${spec.frameId}`}
                title={
                  variant
                    ? [variant.label, variant.summaryLine].filter(Boolean).join(" · ")
                    : `화면 상태: ${aStateLabel}`
                }
                style={{
                  ...ellipsis,
                  fontSize: 11,
                  color:
                    variant?.tone === "failed"
                      ? shellColor.danger
                      : variant?.tone === "busy"
                        ? shellColor.notice
                        : shellColor.muted,
                }}
              >
                {variant
                  ? [variant.label, variant.summaryLine].filter(Boolean).join(" · ")
                  : `화면 상태: ${aStateLabel}`}
              </span>
            ) : isA || isB ? (
              // 둘째 줄 — 화면 상태(+ AI 수정 결과면 닫기). 한 줄에 둬서 머리 높이(AB_CAPTION)를 지킨다
              <span
                style={{
                  display: "flex",
                  gap: 6,
                  justifyContent: "center",
                  alignItems: "center",
                  minWidth: 0,
                }}
              >
                <span
                  data-testid={`frame-state-${spec.frameId}`}
                  style={{ ...ellipsis, minWidth: 0, fontSize: 11, color: shellColor.muted }}
                >
                  {stateCaption(isB)}
                </span>
                {isB && spec.preview ? (
                  <button
                    type="button"
                    data-testid="preview-back"
                    onClick={() => changePreview(null)}
                    title="AI 수정 결과를 닫고 B 자리에 다시 지금 앱을 띄워요"
                    style={previewBackButton}
                  >
                    AI 결과 닫기
                  </button>
                ) : null}
              </span>
            ) : null}
          </figcaption>
        ) : null}
        {spec.placeholder ? (
          <div
            data-testid={`variant-placeholder-${spec.frameId}`}
            style={{
              width: g.outerWidth * frameScale,
              height: g.outerHeight * frameScale,
              boxSizing: "border-box",
              borderRadius: 18,
              border: `1px dashed ${shellColor.border}`,
              background: shellColor.panel,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              textAlign: "center",
              fontSize: 12,
              lineHeight: 1.5,
              wordBreak: "keep-all",
              color: variant?.tone === "failed" ? shellColor.danger : shellColor.muted,
            }}
          >
            {spec.placeholder}
            {variant?.canStart && variant.tone === "failed" ? (
              <button
                type="button"
                onClick={() => void restartPreview(variant.workspaceId)}
                style={toolbarChip(false)}
              >
                다시 켜기
              </button>
            ) : null}
          </div>
        ) : (
          <LabFrame
            key={frameKey(spec)}
            spec={spec}
            scale={frameScale}
            realMs={realMs}
            startPath={frameBus.get(spec.frameId).pathname}
            // 1분 늦는 「불러오는 중」이면 경유 화면도 늦어 목적지에 못 간다 — 바로 연다
            skipVia={(spec.config.latencyMs ?? 0) >= LOADING_LATENCY_MS}
          />
        )}
        {variant ? (
          <button
            type="button"
            data-testid={`variant-pick-${variant.index}`}
            disabled={!spec.preview}
            onClick={() => pickVariant(spec)}
            title={
              spec.preview
                ? `왼쪽에 지금 앱(A), 오른쪽에 시안 ${variant.index}(B)를 나란히 띄워 최종으로 견줘요`
                : "수정 결과 화면이 준비되면 고를 수 있어요"
            }
            style={{
              ...pickButton,
              opacity: spec.preview ? 1 : 0.45,
              cursor: spec.preview ? "pointer" : "not-allowed",
            }}
          >
            이 시안 고르기
          </button>
        ) : null}
      </figure>
    );
  };

  const tab = (active: boolean): CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: 0,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    background: active ? shellColor.accent : "transparent",
    color: active ? shellColor.onAccent : shellColor.ink,
    whiteSpace: "nowrap",
  });

  const headerToggle = (pressed: boolean): CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "5px 10px",
    borderRadius: 8,
    border: `1px solid ${pressed ? shellColor.accent : shellColor.border}`,
    background: pressed ? shellColor.accentSoft : shellColor.panel,
    color: shellColor.ink,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    flex: "none",
  });

  const railButton: CSSProperties = {
    width: 38,
    padding: "8px 0",
    borderRadius: 8,
    border: `1px solid ${shellColor.border}`,
    background: shellColor.panel,
    color: shellColor.ink,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const previewBackButton: CSSProperties = {
    flex: "none",
    padding: "2px 10px",
    borderRadius: 7,
    border: `1px solid ${shellColor.notice}`,
    background: shellColor.noticeSoft,
    color: shellColor.notice,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const pickButton: CSSProperties = {
    flex: "none",
    marginTop: 2,
    padding: "5px 12px",
    borderRadius: 8,
    border: `1px solid ${shellColor.accent}`,
    background: shellColor.accent,
    color: shellColor.onAccent,
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  const closeButton: CSSProperties = {
    flex: "none",
    width: 28,
    height: 28,
    borderRadius: 7,
    border: 0,
    background: "transparent",
    color: shellColor.muted,
    fontSize: 16,
    cursor: "pointer",
  };

  const drawerStyle = (side: "left" | "right"): CSSProperties => ({
    position: "fixed",
    top: HEADER_HEIGHT,
    bottom: 0,
    [side]: 0,
    width: side === "left" ? `min(${NAV_WIDTH + 30}px, 86vw)` : `min(${SIDE_WIDTH + 20}px, 92vw)`,
    zIndex: 40,
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.22)",
  });

  // 돋보기는 같은 서버의 프레임만 — 다른 서버(AI 수정 결과)의 문서는 복제할 수 없다
  const magnifierTargets: MagnifierTarget[] = specs
    .filter((spec) => !spec.origin && !spec.placeholder)
    .map((spec) => ({
      frameId: spec.frameId,
      label: spec.label || spec.route.title,
      device: spec.device,
    }));

  return (
    <div
      data-testid="lab-shell"
      data-narrow={narrow ? "1" : "0"}
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: `${navDocked ? `${NAV_WIDTH}px` : `${RAIL_WIDTH}px`} minmax(${MIN_STAGE_WIDTH}px, 1fr) ${sideDocked ? `${SIDE_WIDTH}px` : `${RAIL_WIDTH}px`}`,
        gridTemplateRows: `${HEADER_HEIGHT}px minmax(0, 1fr)`,
        background: shellColor.page,
        fontFamily: shellFont,
        color: shellColor.ink,
      }}
    >
      <header
        style={{
          gridColumn: "1 / -1",
          gridRow: 1,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 12px",
          minWidth: 0,
          background: shellColor.panel,
          borderBottom: `1px solid ${shellColor.border}`,
        }}
      >
        <button
          type="button"
          aria-pressed={navVisible}
          title={navVisible ? "왼쪽 화면 목록을 접어요" : "왼쪽에 화면 목록을 펼쳐요"}
          onClick={toggleNav}
          style={headerToggle(navVisible)}
        >
          <span aria-hidden>☰ </span>목록 보기
        </button>
        {/* 좁은 창에서는 이름을 빼서 탭 자리를 둔다 */}
        {narrow ? null : (
          <strong style={{ fontSize: 14, whiteSpace: "nowrap", flex: "none" }}>
            MOMENTORY <span style={{ color: shellColor.muted, fontWeight: 500 }}>Expo Lab</span>
          </strong>
        )}
        <div
          role="tablist"
          aria-label="보는 방식"
          style={{ display: "flex", gap: 2, flex: "0 1 auto", minWidth: 0, overflowX: "auto" }}
        >
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              role="tab"
              aria-selected={state.layout === layout.id}
              title={layout.description}
              onClick={() => setLayout(layout.id)}
              style={tab(state.layout === layout.id)}
            >
              {layout.label}
            </button>
          ))}
        </div>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 13,
            color: shellColor.muted,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          data-testid="shell-title"
        >
          {route ? `${route.sectionTitle} · ${route.title}` : state.route}
        </span>
        <button
          type="button"
          aria-pressed={sideVisible}
          title={
            sideVisible
              ? "오른쪽 칸(화면 조건 · AI에게 맡기기)을 닫아요"
              : "오른쪽 칸(화면 조건 · AI에게 맡기기)을 열어요"
          }
          onClick={toggleSide}
          style={headerToggle(sideVisible)}
        >
          오른쪽 칸 보기<span aria-hidden> ▤</span>
        </button>
      </header>

      {/* 왼쪽 — 붙어 있거나(넓은 창) 서랍(좁은 창)이거나 접힌 막대 */}
      {!navDocked ? (
        <div
          data-testid="nav-rail"
          style={{
            gridColumn: 1,
            gridRow: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            paddingTop: 10,
            background: shellColor.panel,
            borderRight: `1px solid ${shellColor.border}`,
          }}
        >
          <button
            type="button"
            title="왼쪽에 화면 목록을 펼쳐요"
            onClick={toggleNav}
            style={railButton}
          >
            <span aria-hidden>»</span>
            <br />
            목록
            <br />
            열기
          </button>
        </div>
      ) : null}
      <aside
        data-testid="nav-panel"
        aria-label="화면 목록 패널"
        style={{
          background: shellColor.panel,
          borderRight: `1px solid ${shellColor.border}`,
          minHeight: 0,
          minWidth: 0,
          flexDirection: "column",
          display: navVisible ? "flex" : "none",
          ...(navDocked ? { gridColumn: 1, gridRow: 2 } : drawerStyle("left")),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 6px 0 14px",
          }}
        >
          <span style={{ fontSize: 11, color: shellColor.muted, whiteSpace: "nowrap" }}>
            화면 {shellRouteCount}개
          </span>
          <button
            type="button"
            aria-label="목록 접기"
            title="목록 접기"
            onClick={closeNav}
            style={closeButton}
          >
            «
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <RouteTree
            top={
              <NewScreenNav
                workspaces={newScreens}
                currentWorkspaceId={preview?.route ? preview.workspaceId : null}
                pendingWorkspaceId={pendingPreview}
                onCreate={() => {
                  if (narrow) setDrawer(null);
                  openSide("new-screen");
                }}
                onOpen={(ws) => {
                  if (narrow) setDrawer(null);
                  void openNewScreen(ws);
                }}
              />
            }
            current={state.route}
            frameIds={isWall(state.layout) ? [] : specs.map((spec) => spec.frameId)}
            onSelect={(next) => {
              if (narrow) setDrawer(null);
              selectRoute(next);
            }}
          />
        </div>
      </aside>

      <main
        data-testid="stage"
        data-layout={state.layout}
        style={{
          gridColumn: 2,
          gridRow: 2,
          minHeight: 0,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          background: shellColor.stage,
        }}
      >
        <StageToolbar
          layout={state.layout}
          zoom={state.zoom}
          effectiveScale={scale}
          syncNav={syncNav}
          magnifier={lensActive}
          magnifierPower={lensPower}
          onZoom={setZoom}
          onStep={stepBy}
          onSyncNav={setSyncNav}
          onMagnifier={(on) => {
            setLensOn(on);
            if (!on) setLensHeld(false);
          }}
        >
          {state.layout === "single" && route ? (
            <ToolbarStatePicker
              route={route}
              config={state}
              baseFrameId={primaryFrameId(state.layout, specs)}
              chipStyle={toolbarChip(false)}
              onPick={(config) => actions.set(config)}
            />
          ) : null}
          {keyboardTargets.length ? (
            <button
              type="button"
              data-testid="keyboard-toggle"
              aria-pressed={keyboardOpen}
              disabled={!keyboardReady}
              title="입력칸을 누르면 저절로 올라와요. 이 버튼은 입력 없이 키보드 올린 모습을 볼 때 써요"
              onClick={toggleKeyboard}
              style={toolbarChip(keyboardOpen)}
            >
              {keyboardOpen ? "키보드 내리기" : "키보드 올리기"}
            </button>
          ) : null}
          {previewSpec?.preview ? (
            <PreviewBar
              preview={previewSpec.preview}
              layout={state.layout}
              onBack={() => changePreview(null)}
              onCompare={() => changePreview(previewSpec.preview ?? null, "ab")}
            />
          ) : null}
        </StageToolbar>
        <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
          <div
            ref={scrollRef}
            data-testid="stage-scroll"
            style={{ position: "absolute", inset: 0, overflow: "auto" }}
          >
            {state.layout === "grid" ? (
              <GridView
                specs={specs}
                scale={scale}
                realMs={realMs}
                nonces={nonces}
                onOpen={openFromGrid}
              />
            ) : (
              <div style={{ padding: `12px ${STAGE_PAD_X}px ${STAGE_PAD_BOTTOM}px` }}>
                {state.layout === "ab" ? (
                  <AbBanner
                    preview={previewSpec?.preview ?? null}
                    aState={aStateLabel}
                    bState={state.b ? bStateLabel : null}
                    diff={diff}
                    diffOpacity={diffOpacity}
                    onDiff={setDiff}
                    onDiffOpacity={setDiffOpacity}
                    onPickB={focusBStatePicker}
                  >
                    {previewSpec?.preview?.variant ? (
                      <VariantDecision
                        client={defaultAgentClient}
                        workspace={pickedWorkspace}
                        group={pickedGroup}
                        baseBranch={pickedWorkspace?.baseBranch ?? "main"}
                        onChanged={() => void refreshWorkspaces()}
                        onBack={backToVariants}
                      />
                    ) : null}
                  </AbBanner>
                ) : variantsLayout ? (
                  <VariantsBanner
                    group={group}
                    groups={groups.filter((g) => g.route === group?.route || g.id === group?.id)}
                    aState={aStateLabel}
                    onPickGroup={(id) => goTo({ ...state, group: id }, { history: "push" })}
                    onStop={(id) => void stopVariants(id)}
                    onOpenAgent={() => openSide("agent")}
                  />
                ) : null}
                {route?.path === "/home/schedule/[id]" &&
                cachedSampleParams(state.dataset, state.now).scheduleId == null ? (
                  <p
                    data-testid="route-empty-notice"
                    style={{
                      margin: "0 auto 8px",
                      maxWidth: 720,
                      fontSize: 13,
                      color: shellColor.ink,
                      textAlign: "center",
                      wordBreak: "keep-all",
                    }}
                  >
                    「{datasetLabel(state.dataset)}」 상태에는 오늘 일정이 없어서 일정 수정이 열리지
                    않고 홈에 머물러요. 오른쪽 「화면 조건」의 화면 상태를 「기록 보통」이나 「기록
                    많음」으로 바꿔 보세요.
                  </p>
                ) : null}
                {route?.hint ? (
                  <p
                    data-testid="route-hint"
                    style={{
                      margin: "0 auto 12px",
                      maxWidth: 720,
                      fontSize: 12,
                      color: shellColor.muted,
                      textAlign: "center",
                      wordBreak: "keep-all",
                    }}
                  >
                    {route.hint}
                  </p>
                ) : null}
                <div
                  ref={attachRow}
                  data-testid="frame-row"
                  style={{
                    position: "relative",
                    display: "flex",
                    flexWrap: state.layout === "matrix" ? "wrap" : "nowrap",
                    gap: FRAME_GAP,
                    justifyContent: "center",
                    alignItems: "flex-start",
                    // A/B 는 두 대를 한 덩어리로 가운데(차이 보기에서 B 를 A 위에 겹친다) ·
                    // 한 화면은 크게 키우면 옆으로 스크롤 · 매트릭스는 무대 폭 안에서 줄을 바꾼다
                    ...(state.layout === "ab" || variantsLayout
                      ? { width: "max-content", margin: "0 auto" }
                      : state.layout === "single"
                        ? { minWidth: "max-content" }
                        : {}),
                  }}
                >
                  {specs.map((spec) => renderFrame(spec, scale))}
                </div>
              </div>
            )}
          </div>
          {lensActive ? (
            <MagnifierLayer
              targets={magnifierTargets}
              partnerOf={(frameId) =>
                state.layout === "ab"
                  ? frameId === "A"
                    ? "B"
                    : frameId === "B"
                      ? "A"
                      : null
                  : null
              }
              power={lensPower}
              size={lensSize}
              onPower={setLensPower}
              onSize={setLensSize}
            />
          ) : null}
        </div>
      </main>

      {/* 오른쪽 — 붙어 있거나(넓은 창) 서랍(좁은 창)이거나 접힌 막대 */}
      {!sideDocked ? (
        <div
          data-testid="side-rail"
          style={{
            gridColumn: 3,
            gridRow: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            paddingTop: 10,
            background: shellColor.panel,
            borderLeft: `1px solid ${shellColor.border}`,
          }}
        >
          {SIDE_TABS.map(([id, label, short]) => (
            <button
              key={id}
              type="button"
              aria-label={`${label} 열기`}
              title={`「${label}」 열기 — ${SIDE_TAB_TITLE[id]}`}
              onClick={() => openSide(id)}
              style={railButton}
            >
              {short.split(" ").map((word, index) => (
                <span key={word} style={{ display: "block" }}>
                  {word}
                </span>
              ))}
            </button>
          ))}
        </div>
      ) : null}
      <aside
        data-testid="side-panel"
        aria-label="오른쪽 패널"
        style={{
          background: shellColor.panel,
          borderLeft: `1px solid ${shellColor.border}`,
          minHeight: 0,
          minWidth: 0,
          flexDirection: "column",
          display: sideVisible ? "flex" : "none",
          ...(sideDocked ? { gridColumn: 3, gridRow: 2 } : drawerStyle("right")),
        }}
      >
        <div style={{ display: "flex", gap: 4, padding: 8, alignItems: "center" }}>
          <div
            role="tablist"
            aria-label="패널"
            style={{ display: "flex", flexWrap: "wrap", gap: 2, flex: 1, minWidth: 0 }}
          >
            {SIDE_TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tabOf(state.panel) === id}
                title={SIDE_TAB_TITLE[id]}
                onClick={() => goTo({ ...state, panel: id }, { history: "replace" })}
                style={{ ...tab(tabOf(state.panel) === id), padding: "5px 7px", fontSize: 12 }}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="패널 닫기"
            title="패널 닫기"
            onClick={closeSide}
            style={closeButton}
          >
            ×
          </button>
        </div>
        <div
          data-testid={`side-panel-${state.panel}`}
          style={{
            minHeight: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {/* 「AI에게 맡기기」는 한 번 열면 붙여 둔다 — 다른 탭을 보고 와도 적던 지시가 남게 */}
          {agentMounted ? (
            <div
              data-testid="agent-panel-slot"
              style={{
                display: state.panel === "agent" ? "block" : "none",
                padding: "4px 12px 16px",
              }}
            >
              <AgentPanel
                screen={agentScreen}
                onOpenPreview={openPreview}
                onOpenWorkspace={openWorkspace}
                onOpenVariants={openVariants}
              />
            </div>
          ) : null}
          {state.panel === "agent" ? null : state.panel === "new-screen" ? (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 12px 16px" }}
            >
              <button
                type="button"
                onClick={() => goTo({ ...state, panel: "agent" }, { history: "replace" })}
                title="지금 보는 화면을 고치는 「AI에게 맡기기」로 돌아가요"
                style={{
                  alignSelf: "flex-start",
                  padding: "4px 8px",
                  borderRadius: 7,
                  border: `1px solid ${shellColor.border}`,
                  background: shellColor.panel,
                  color: shellColor.ink,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                ← 이 화면 고치기로
              </button>
              <NewScreenForm
                onCreated={() => void refreshNewScreens()}
                onOpenPreview={openPreview}
              />
            </div>
          ) : (
            <ControlsPanel
              state={state}
              route={route}
              baseFrameId={state.layout === "ab" ? "A" : primaryFrameId(state.layout, specs)}
              realMs={realMs}
              actions={actions}
            />
          )}
        </div>
      </aside>

      {drawer ? (
        <div
          data-testid="drawer-backdrop"
          aria-hidden
          onClick={() => setDrawer(null)}
          style={{
            position: "fixed",
            inset: `${HEADER_HEIGHT}px 0 0 0`,
            background: "rgba(0, 0, 0, 0.18)",
            zIndex: 35,
          }}
        />
      ) : null}
    </div>
  );
}

const toolbarChip = (active: boolean): CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 7,
  border: `1px solid ${active ? shellColor.accent : shellColor.border}`,
  background: active ? shellColor.accent : shellColor.panel,
  color: active ? shellColor.onAccent : shellColor.ink,
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
  lineHeight: "16px",
});

/** 「AI 수정 결과」를 띄운 동안의 한 줄 — 무엇을 보는지 · 돌아가기 · 돋보기가 빠지는 이유 */
function PreviewBar({
  preview,
  layout,
  onBack,
  onCompare,
}: {
  preview: FramePreview;
  layout: LayoutId;
  onBack: () => void;
  onCompare: () => void;
}) {
  const button = (primary: boolean): CSSProperties => ({
    flex: "none",
    padding: "4px 10px",
    borderRadius: 7,
    border: `1px solid ${primary ? shellColor.accent : shellColor.notice}`,
    background: primary ? shellColor.accent : shellColor.noticeSoft,
    color: primary ? shellColor.onAccent : shellColor.notice,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });
  return (
    <div
      data-testid="preview-bar"
      style={{
        flexBasis: "100%",
        display: "flex",
        flexWrap: "wrap",
        gap: "4px 10px",
        alignItems: "center",
        minWidth: 0,
        fontSize: 12,
      }}
    >
      <span
        style={{
          ...ellipsis,
          minWidth: 0,
          flex: "0 1 auto",
          color: shellColor.notice,
          fontWeight: 600,
        }}
      >
        {layout === "ab" ? "B" : "이 화면"} · AI 수정 결과 ({preview.title}) 보는 중
        {preview.route ? ` · ${preview.route}` : ""}
      </span>
      {layout === "single" && !preview.route ? (
        <button
          type="button"
          onClick={onCompare}
          title="왼쪽에 지금 앱(A), 오른쪽에 AI 수정 결과(B)를 나란히 띄워요"
          style={button(true)}
        >
          지금 앱과 나란히 보기
        </button>
      ) : null}
      <button
        type="button"
        data-testid="preview-close"
        onClick={onBack}
        title="AI 수정 결과를 닫고 이 서버의 지금 앱으로 돌아가요"
        style={button(false)}
      >
        {layout === "ab" ? "AI 결과 닫기" : "지금 앱으로 돌아가기"}
      </button>
      <span
        data-testid="cross-origin-note"
        style={{ ...ellipsis, minWidth: 0, color: shellColor.faint }}
      >
        {CROSS_ORIGIN_NOTE}
      </span>
    </div>
  );
}

function AbBanner({
  preview,
  aState,
  bState,
  diff,
  diffOpacity,
  onDiff,
  onDiffOpacity,
  onPickB,
  children,
}: {
  preview: FramePreview | null;
  /** A 의 화면 상태 이름(「기록 보통」 …) */
  aState: string;
  /** B 화면 상태 이름 — null 이면 A와 같게 */
  bState: string | null;
  diff: boolean;
  diffOpacity: number;
  onDiff: (value: boolean) => void;
  onDiffOpacity: (value: number) => void;
  /** 「B 화면 상태 바꾸기」 — 화면 조건 패널의 그 칸을 연다 */
  onPickB: () => void;
  /** 고른 시안이면 결정 줄(「다른 시안 다시 보기」 · 「이 시안으로 확정」 · 「나머지 시안 버리기」) */
  children?: ReactNode;
}) {
  const accent = { color: shellColor.notice };
  return (
    <div
      data-testid="ab-banner"
      style={{
        margin: "0 auto 14px",
        maxWidth: 820,
        padding: "10px 14px",
        borderRadius: 10,
        background: shellColor.panel,
        border: `1px solid ${shellColor.border}`,
        display: "grid",
        gap: 6,
        fontSize: 13,
        wordBreak: "keep-all",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span data-testid="ab-banner-text" style={{ flex: "1 1 260px", minWidth: 0 }}>
          {preview?.variant ? (
            <>
              <b>A</b>는 지금 앱, <b style={accent}>B</b>는 고른 「시안 {preview.variant.index}
              」(시안 {preview.variant.total}개 중)예요.{" "}
              {bState
                ? `A는 「${aState}」, B는 「${bState}」 상태로 보여 줘요.`
                : `둘 다 「${aState}」 상태로 나란히 보여 줘요.`}
            </>
          ) : preview ? (
            <>
              <b>A</b>는 지금 앱, <b style={accent}>B</b>는 AI 가 작업 공간 「{preview.title}」에서
              고친 결과예요.{" "}
              {bState
                ? `A는 「${aState}」, B는 「${bState}」 상태로 보여 줘요.`
                : `둘 다 「${aState}」 상태로 나란히 보여 줘요.`}
            </>
          ) : bState ? (
            <>
              같은 화면을 <b>A</b>는 「{aState}」, <b style={accent}>B</b>는 「{bState}」 상태로
              나란히 보여 줘요.
            </>
          ) : (
            <>
              <b>A</b>와 <b style={accent}>B</b>는 지금 같은 화면 · 같은 상태(「{aState}」)예요. B만
              다른 상태(예: 기록 많음 · 불러오는 중)로 바꾸면 두 상태를 나란히 견줄 수 있어요.
            </>
          )}
        </span>
        <button
          type="button"
          data-testid="ab-pick-b"
          onClick={onPickB}
          title="오른쪽 「화면 조건」에서 B 화면 상태를 골라요"
          style={{
            padding: "4px 10px",
            borderRadius: 7,
            border: `1px solid ${shellColor.accent}`,
            background: bState ? shellColor.panel : shellColor.accent,
            color: bState ? shellColor.accent : shellColor.onAccent,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          B 화면 상태 바꾸기
        </button>
        <label
          title="B를 A 위에 겹쳐 반투명으로 보여 줘요 — 어긋난 자리가 겹쳐 보여요"
          style={{
            display: "flex",
            gap: 4,
            alignItems: "center",
            fontSize: 12,
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={diff}
            onChange={(event) => onDiff(event.target.checked)}
          />
          겹쳐서 차이 보기
        </label>
        {diff ? (
          <label
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            A
            <input
              type="range"
              aria-label="B 겹침 정도"
              min={0}
              max={1}
              step={0.05}
              value={diffOpacity}
              onChange={(event) => onDiffOpacity(Number(event.target.value))}
              style={{ width: 120 }}
            />
            B
          </label>
        ) : null}
      </div>
      {diff ? (
        <div style={{ fontSize: 12, color: shellColor.muted }}>
          B를 A 위에 겹쳤어요 — 막대를 A 쪽으로 밀면 A가, B 쪽으로 밀면 B가 진해져요. 겹친 동안 B는
          눌리지 않아요.
        </div>
      ) : null}
      {children}
    </div>
  );
}

const groupTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/** 「시안 비교」 위 설명 — 무엇을 나란히 보는지 · 진행 · 멈추기 · 다른 묶음 고르기 · 돋보기 한계 */
function VariantsBanner({
  group,
  groups,
  aState,
  onPickGroup,
  onStop,
  onOpenAgent,
}: {
  group: VariantGroupView | null;
  /** 고를 수 있는 묶음(같은 화면) */
  groups: readonly VariantGroupView[];
  aState: string;
  onPickGroup: (groupId: string) => void;
  onStop: (groupId: string) => void;
  onOpenAgent: () => void;
}) {
  const box: CSSProperties = {
    margin: "0 auto 14px",
    maxWidth: 820,
    padding: "10px 14px",
    borderRadius: 10,
    background: shellColor.panel,
    border: `1px solid ${shellColor.border}`,
    display: "grid",
    gap: 6,
    fontSize: 13,
    wordBreak: "keep-all",
  };
  if (!group)
    return (
      <div data-testid="variants-banner" style={box}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span data-testid="variants-empty" style={{ flex: "1 1 300px", minWidth: 0 }}>
            이 화면의 시안이 아직 없어요. 오른쪽 「AI에게 맡기기」에서 「시안 개수」를 2개나 3개로
            골라 맡기면, 여기에 지금 앱과 나란히 떠요.
          </span>
          <button type="button" onClick={onOpenAgent} style={toolbarChip(true)}>
            AI에게 맡기기 열기
          </button>
        </div>
      </div>
    );
  const busy = groupBusy(group);
  return (
    <div data-testid="variants-banner" style={box}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span data-testid="variants-banner-text" style={{ flex: "1 1 300px", minWidth: 0 }}>
          <b>기존</b>(지금 앱)과{" "}
          <b style={{ color: shellColor.notice }}>시안 {group.members.length}개</b>를 같은 화면 ·
          같은 상태(「{aState}」)로 나란히 보여 줘요. 마음에 드는 시안 아래 「이 시안 고르기」를
          누르면 지금 앱과 A/B로 견줘요.
        </span>
        {groups.length > 1 ? (
          <select
            aria-label="시안 묶음"
            value={group.id}
            onChange={(event) => onPickGroup(event.target.value)}
            style={{ ...toolbarChip(false), maxWidth: 220 }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                시안 {g.total}개 · {groupTime(g.createdAt)}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: "4px 10px", alignItems: "center", flexWrap: "wrap" }}>
        <span
          data-testid="variants-progress"
          style={{ fontSize: 12, color: busy ? shellColor.notice : shellColor.muted }}
        >
          {groupProgress(group)}
        </span>
        {busy ? (
          <button
            type="button"
            onClick={() => onStop(group.id)}
            title="지금 만드는 시안을 멈추고, 기다리는 시안은 만들지 않아요"
            style={{
              ...toolbarChip(false),
              color: shellColor.danger,
              borderColor: shellColor.danger,
            }}
          >
            시안 만들기 멈추기
          </button>
        ) : null}
        <span
          data-testid="cross-origin-note"
          style={{ fontSize: 12, color: shellColor.faint, whiteSpace: "nowrap" }}
        >
          {VARIANTS_CROSS_ORIGIN_NOTE}
        </span>
      </div>
    </div>
  );
}
