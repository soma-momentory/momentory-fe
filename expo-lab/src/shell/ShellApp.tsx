/**
 * Expo Lab 셸 — 앱의 **모든 화면을 실제 앱 코드로** 띄우는 작업대.
 *
 *   왼쪽: 라우트 목록(앱 순서 · 접히는 묶음) · 가운데: 도구줄(설명 · 확대 · 돋보기) +
 *   한 화면 / A·B 비교 / 전체 화면 / 매트릭스 / 상태별(`StatesView`) · 오른쪽: 조작(… · 서버 요청 기록) ·
 *   디자인 편집 · 참고 시안(`src/reference/` — 겹치는 층은 주인공 프레임의 화면 상자 안 · `FrameReference.tsx`) ·
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
 * - 프레임 설정(데이터 세트 · 세션 · 시각 · 지연 · 실패 · 시안 · 기기 …)이 바뀌면 — key 가 설정
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
} from "react";

import { AgentPanel, defaultAgentClient, NewScreenForm, type WorkspaceSummary } from "../agent";
import { DesignEditorPanel } from "../design-editor/DesignEditorPanel";
import { resetFakeData, sampleParams } from "../fake-server";
import { encodeFrameConfig, type LabPlatform, type SampleParams } from "../lab-contract";
import { findDevice } from "../lab-devices";
import { handleReferenceShortcut, ReferencePanel, useReferencesFor } from "../reference";
import { buildAgentHandoff } from "./agentHandoff";
import { newScreenPath, NewScreenNav, useNewScreenWorkspaces } from "./AgentNav";
import { skinKnownAvailable } from "./device/DeviceFrame";
import { chromeGeometry } from "./device/geometry";
import { ControlsPanel, type ControlActions } from "./ControlsPanel";
import { notifyDraftsChanged, useDraftInfo, type DraftInfo } from "./draftInfo";
import {
  FrameReference,
  handoffReferencesFor,
  referenceScopeOf,
  SideReferenceFrame,
} from "./FrameReference";
import { frameBus, useFrameBus } from "./frameBus";
import {
  datasetLabel,
  framesFor,
  peekFrameFor,
  PEEK_FRAME_ID,
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
  type Zoom,
} from "./hashState";
import { LabFrame } from "./LabFrame";
import { LENS_POWER, LENS_SIZE, MagnifierLayer, type MagnifierTarget } from "./Magnifier";
import { findRoute, matchPathname, shellRoutes, type ShellRoute } from "./routes";
import { RouteTree } from "./RouteTree";
import { StageToolbar } from "./StageToolbar";
import { LOADING_LATENCY_MS } from "./screenStates";
import { StatePicker, StatesView } from "./StatesView";
import {
  FRAME_GAP,
  MIN_CELL_WIDTH,
  STAGE_PAD_BOTTOM,
  STAGE_PAD_X,
  fitRow,
  fitScale,
} from "./stageFit";
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
/** A/B 기기 위 이름 두 줄(이름 + 바꾼 값)의 높이 */
const AB_CAPTION = 46;

const SIDE_TABS = [
  ["controls", "화면 조건", "조건 바꾸기"],
  ["design", "디자인 편집", "디자인 편집"],
  ["reference", "참고 시안", "참고 시안"],
  ["agent", "AI에게 맡기기", "AI 맡기기"],
] as const satisfies readonly (readonly [SidePanel, string, string])[];
const SIDE_TAB_TITLE: Record<SidePanel, string> = {
  controls: "기기 · 테스트 데이터 · 시각 · 서버 응답 · 글씨 크기를 바꿔요",
  design: "시안을 만들고 색 · 글자 · 화면 값을 고쳐요 — 시안을 건 폰 화면(B)에만 적용돼요",
  reference:
    "피그마 · Claude Design 에서 뽑은 화면 그림을 앱 위에 겹쳐 어긋난 곳을 찾아요 — R 키로 보이기 · 숨기기",
  agent:
    "지금 보는 화면을 Claude Code · Codex 에게 고치게 해요 — 고친 결과는 B 자리에 띄워 지금 앱과 비교해요",
  "new-screen": "어떤 화면인지 적으면 AI 가 앱에 새 화면을 만들어요",
};
/** 탭 줄에서 이 패널일 때 눌려 보이는 탭 — 「새 화면 만들기」는 「AI에게 맡기기」 안에 있다 */
const tabOf = (panel: SidePanel): SidePanel => (panel === "new-screen" ? "agent" : panel);

/** 다른 서버(작업 공간)의 화면은 셸이 문서를 못 읽는다 — 돋보기 · 눌러 고르기가 빠지는 이유 */
export const CROSS_ORIGIN_NOTE =
  "AI 수정 결과 화면은 다른 서버라 돋보기 · 눌러 고르기를 쓸 수 없어요";

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

/** 칸마다 차갑게 여는 레이아웃 — 셸이 주소를 옮기지 않고, 칸 안의 이동을 따라가지 않는다 */
const isWall = (layout: LayoutId) => layout === "grid" || layout === "states";

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

  const specs = useMemo(
    () => applyPreview(framesFor(state, cachedSampleParams, realMs), preview, state.layout),
    [state, realMs, preview],
  );
  /** 한 화면 + 시안이면 그 아래 숨긴 승인본(「원래대로 잠깐 보기」) — 그리지 않는 곳에서는 specs 와 함께 다룬다 */
  const peekSpecs = useMemo(
    () =>
      preview && state.layout === "single" ? [] : peekFrameFor(state, cachedSampleParams, realMs),
    [state, realMs, preview],
  );
  const allSpecs = useMemo(() => [...specs, ...peekSpecs], [specs, peekSpecs]);

  // 프레임 메시지 처리(이벤트)가 최신 값을 읽는 자리 — 그리기가 끝난 뒤 맞춘다
  const stateRef = useRef(state);
  const specsRef = useRef(allSpecs);
  const syncRef = useRef(syncNav);
  const previewRef = useRef(preview);
  useLayoutEffect(() => {
    stateRef.current = state;
    specsRef.current = allSpecs;
    syncRef.current = syncNav;
    previewRef.current = preview;
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
      const nextPreview = previewRef.current;
      const nextSpecs = [
        ...applyPreview(framesFor(next, cachedSampleParams, Date.now()), nextPreview, next.layout),
        ...(nextPreview && next.layout === "single"
          ? []
          : peekFrameFor(next, cachedSampleParams, Date.now())),
      ];
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
      // 숨긴 승인본은 따라가기만 한다 — 그 프레임의 주소로 다른 프레임을 옮기지 않는다
      if (!ids.includes(frameId) || frameId === PEEK_FRAME_ID) return;
      if (frameId === "solo" && ids.includes(PEEK_FRAME_ID)) {
        const pathname = frameBus.get(frameId).pathname;
        if (pathname && frameBus.get(PEEK_FRAME_ID).pathname !== pathname) {
          frameBus.setPathname(PEEK_FRAME_ID, pathname);
          frameBus.post(PEEK_FRAME_ID, { type: "lab:navigate", pathname });
        }
      }
      if (!syncRef.current && frameId !== primaryFrameId(s.layout, specsRef.current)) return;
      const pathname = frameBus.get(frameId).pathname;
      const route = pathname ? matchPathname(pathname) : undefined;
      if (!pathname || !route) return;
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
      for (const spec of allSpecs) {
        if (!frameBus.post(spec.frameId, { type: "lab:resetData" })) {
          // 프레임이 아직 말을 못 들으면 셸이 직접 비운다(같은 출처 localStorage)
          resetFakeData(spec.config);
          toBump.push(spec.frameId);
        }
      }
      bump(toBump);
    },
    reload: () => bump(allSpecs.map((spec) => spec.frameId)),
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
    goTo({ ...state, layout }, { history: "push", navigate: true, target, force: true });
  };

  const openFromGrid = (path: string) =>
    goTo(
      { ...withRoute(state, path), layout: "single" },
      { history: "push", navigate: true, force: true },
    );

  // 「상태별로 보기」 칸을 누름 — 그 칸의 데이터 · 지연 · 실패 주소 그대로 한 화면
  const openFromState = (spec: FrameSpec) =>
    goTo(
      {
        ...state,
        layout: "single",
        dataset: spec.config.datasetId as ShellState["dataset"],
        signedIn: spec.config.signedIn ?? state.signedIn,
        latencyMs: spec.config.latencyMs ?? 0,
        failPaths: [...(spec.config.failPaths ?? [])],
      },
      { history: "push", navigate: true, force: true },
    );

  const route = findRoute(state.route);
  const frameKey = (spec: FrameSpec) => `${configKey(spec)}#${nonces[spec.frameId] ?? 0}`;
  const draftInfo = useDraftInfo(state.draft);

  // ── 참고 시안 ─────────────────────────────────────────────
  // 겹치기 · 나란히 놓기는 주인공 프레임 하나에만(한 화면 = 그 폰 · A/B = 시안을 건 B)
  const showsReference = state.layout === "single" || state.layout === "ab";
  const primaryId = primaryFrameId(state.layout, specs);
  const primarySpec = showsReference ? specs.find((spec) => spec.frameId === primaryId) : undefined;
  const primaryScope = primarySpec
    ? referenceScopeOf(state.route, primarySpec)
    : { route: state.route, draftId: state.draft };
  const primaryReference = useReferencesFor(primaryScope);
  const sideReference =
    primarySpec && primaryReference.reference?.view.mode === "side" ? primaryReference : null;
  const handoffDevice = findDevice(state.device);
  const getReferences = useMemo(
    () =>
      handoffReferencesFor(
        { draftId: state.draft, platform: handoffDevice.platform, deviceId: handoffDevice.id },
        handoffDevice,
      ),
    [state.draft, handoffDevice],
  );

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
  const captionReserve = state.layout === "ab" ? AB_CAPTION : 0;
  const phoneSizes = specs.map((spec) => {
    const g = chromeGeometry(spec.device, skinKnownAvailable(spec.device));
    return { width: g.outerWidth, height: g.outerHeight };
  });
  // 「옆에 나란히 놓기」면 같은 기기 하나를 더 세운다 — 한 줄에 같이 맞춘다
  const fitted =
    sideReference && primarySpec
      ? fitRow(area, rowTop + captionReserve, [
          ...phoneSizes,
          phoneSizes[specs.indexOf(primarySpec)]!,
        ])
      : fitScale(state.layout, area, rowTop + captionReserve, phoneSizes);
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

  // A/B 「시안 만들기」 — 시안은 편집기가 만든다. 셸은 디자인 편집 탭을 열고 이름 칸에 커서를 둔다
  const startDraft = () => {
    openSide("design");
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[aria-label="시안 이름"]');
      input?.scrollIntoView({ block: "center" });
      input?.focus();
    }, 150);
  };

  // ── AI에게 맡기기 · 수정 결과 보기 ───────────────────────────
  const { workspaces: newScreens, refresh: refreshNewScreens } = useNewScreenWorkspaces();
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
  });
  /** 「수정 결과 보기」 — 화면 수정은 A/B 의 B 에(한 화면이면 그 폰에), 새 화면은 한 화면에(이 서버에는 그 화면이 없다) */
  const openPreview = (url: string, ws: WorkspaceSummary) => {
    setPendingPreview(null);
    if (ws.kind === "new-screen") return changePreview(previewOf(url, ws), "single");
    const target = ws.route ? findRoute(ws.route) : undefined;
    const next = previewOf(url, ws);
    previewRef.current = next;
    setPreview(next);
    const layout: LayoutId = state.layout === "single" ? "single" : "ab";
    if (target && target.path !== state.route) {
      goTo(
        { ...withRoute(state, target.path), layout },
        { history: "push", navigate: true, force: true },
      );
    } else if (layout !== state.layout) goTo({ ...state, layout }, { history: "push" });
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
  const agentDraft = useMemo(
    () => (draftInfo ? { name: draftInfo.name, changeCount: draftInfo.changes } : null),
    [draftInfo],
  );
  const agentReference = useReferencesFor({
    route: state.route,
    draftId: state.draft,
    platform: agentDevice.platform,
    deviceId: agentDevice.id,
  });
  const buildHandoff = () =>
    buildAgentHandoff({
      draftId: state.draft,
      route: frameBus.get(primaryFrameId(state.layout, specs)).pathname ?? state.route,
      lab: { platform: state.platform, deviceId: state.device, datasetId: state.dataset },
      getReferences,
    });

  // ── 키보드 ──────────────────────────────────────────────
  // 한 화면은 그 폰, A/B 는 두 폰 함께. 눌림 상태는 프레임이 알린 `lab:keyboardState` 를 따른다
  const keyboardTargets =
    state.layout === "single" ? ["solo"] : state.layout === "ab" ? ["A", "B"] : [];
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

  // ── 원래대로 잠깐 보기(한 화면 + 시안) ───────────────────────
  const [peeking, setPeeking] = useState(false);
  const peekSpec = peekSpecs[0];
  const peekOn = peeking && peekSpec != null;

  // 단축키 — 셸에 포커스가 있을 때만(입력칸 · 프레임 안이면 그대로 둔다)
  const canPeek = peekSpec != null;
  const keyRef = useRef({ stepBy, setZoom, lensActive, drawer, canPeek });
  useLayoutEffect(() => {
    keyRef.current = { stepBy, setZoom, lensActive, drawer, canPeek };
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
      // R — 참고 시안 보이기 · 숨기기(누르고 있어도 한 번만)
      if (!event.repeat && handleReferenceShortcut(event)) {
        event.preventDefault();
        return;
      }
      if (event.key === "z" || event.key === "Z") {
        if (!event.repeat) setLensHeld(true);
      } else if (event.key === "`" || event.key === "o" || event.key === "O") {
        if (k.canPeek && !event.repeat) setPeeking(true);
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
      if (event.key === "`" || event.key === "o" || event.key === "O") setPeeking(false);
    };
    const onBlur = () => {
      setLensHeld(false);
      setPeeking(false);
    };
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

  // 다른 서버의 프레임(AI 수정 결과)은 문서를 못 읽는다 — 편집기에는 없는 프레임으로 넘긴다
  const editorFrames = specs.map((spec) => ({
    frameId: spec.frameId,
    element: spec.origin ? null : frameBus.get(spec.frameId).element,
    isDraft: spec.config.designDraftId != null,
  }));
  const previewSpec = specs.find((spec) => spec.preview);
  const primaryPath =
    frameBus.get(primaryFrameId(state.layout, specs)).pathname?.split("?")[0] ?? state.route;

  const frameLabel = (spec: FrameSpec) => {
    if (spec.preview && state.layout === "ab") return `B · AI 수정 결과 (${spec.preview.title})`;
    if (spec.role !== "draft" || state.layout !== "ab") return spec.label;
    return draftInfo ? `B · 시안 「${draftInfo.name}」` : "B · 시안 없음";
  };

  const renderFrame = (spec: FrameSpec, frameScale: number) => {
    const g = chromeGeometry(spec.device, skinKnownAvailable(spec.device));
    const width = Math.max(g.outerWidth * frameScale, MIN_CELL_WIDTH);
    const isB = state.layout === "ab" && spec.frameId === "B";
    const isA = state.layout === "ab" && spec.frameId === "A";
    const label = frameLabel(spec);
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
              ...(state.layout === "ab" ? { minHeight: AB_CAPTION - 6 } : {}),
            }}
          >
            <span
              style={{
                ...ellipsis,
                fontSize: state.layout === "ab" ? 14 : 12,
                fontWeight: 700,
                color: spec.role === "draft" ? shellColor.draft : shellColor.ink,
              }}
            >
              {label}
            </span>
            {isA ? (
              <span style={{ ...ellipsis, fontSize: 11, color: shellColor.muted }}>
                운영 중인 값 그대로
              </span>
            ) : null}
            {isB && spec.preview ? (
              <button
                type="button"
                data-testid="preview-back"
                onClick={() => changePreview(null)}
                title="B 를 다시 디자인 편집의 시안(이 서버의 앱)으로 돌려요"
                style={previewBackButton}
              >
                시안 보기로 돌아가기
              </button>
            ) : isB ? (
              <span
                data-testid="draft-change-count"
                style={{ ...ellipsis, fontSize: 11, color: shellColor.muted }}
              >
                {draftInfo ? `바꾼 값 ${draftInfo.changes}개` : "시안을 고르면 여기에 적용돼요"}
              </span>
            ) : null}
          </figcaption>
        ) : null}
        <div style={{ position: "relative" }}>
          {/* 한 화면 + 시안 — 같은 자리 아래에 승인본을 숨겨 두고, 누르는 동안 위 시안을 감춘다 */}
          {spec.frameId === "solo" && peekSpec ? (
            <div
              data-testid="peek-frame"
              aria-hidden={!peekOn}
              style={{ position: "absolute", left: 0, top: 0, zIndex: 0 }}
            >
              <LabFrame
                key={frameKey(peekSpec)}
                spec={peekSpec}
                scale={frameScale}
                realMs={realMs}
                startPath={
                  frameBus.get(PEEK_FRAME_ID).pathname ?? frameBus.get(spec.frameId).pathname
                }
              />
            </div>
          ) : null}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              visibility: spec.frameId === "solo" && peekOn ? "hidden" : "visible",
            }}
          >
            <LabFrame
              key={frameKey(spec)}
              spec={spec}
              scale={frameScale}
              realMs={realMs}
              startPath={frameBus.get(spec.frameId).pathname}
              // 1분 늦는 「불러오는 중」이면 경유 화면도 늦어 목적지에 못 간다 — 바로 연다
              skipVia={(spec.config.latencyMs ?? 0) >= LOADING_LATENCY_MS}
              screenOverlay={
                spec === primarySpec ? (
                  <FrameReference scope={primaryScope} device={spec.device} />
                ) : undefined
              }
            />
          </div>
          {isB && !draftInfo && !overlayDiff && !spec.preview ? (
            <div
              data-testid="ab-no-draft"
              // 흐린 막은 누르기를 통과시킨다 — 시안이 없어도 B 를 눌러 보거나 디자인 편집의
              // 「요소 선택」으로 고를 수 있어야 한다. 막는 것은 위쪽 안내 카드 한 장뿐이다
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 2,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: `${Math.max(56, 90 * frameScale)}px 12px 12px`,
                borderRadius: (spec.device.cornerRadius + 15) * frameScale,
                background: "rgba(252, 252, 250, 0.55)",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  maxWidth: 260,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: shellColor.panel,
                  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.16)",
                  textAlign: "center",
                  wordBreak: "keep-all",
                  pointerEvents: "auto",
                }}
              >
                <p style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700 }}>
                  아직 시안이 없어서 A와 똑같아요
                </p>
                <p style={{ margin: "0 0 14px", fontSize: 12, color: shellColor.muted }}>
                  디자인 편집에서 시안을 만들고 값을 고치면 B에만 바로 적용돼요.
                </p>
                <button
                  type="button"
                  onClick={startDraft}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    border: 0,
                    background: shellColor.accent,
                    color: shellColor.onAccent,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  시안 만들기
                </button>
              </div>
            </div>
          ) : null}
        </div>
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
    margin: "2px auto 0",
    display: "block",
    padding: "2px 10px",
    borderRadius: 7,
    border: `1px solid ${shellColor.draft}`,
    background: shellColor.draftSoft,
    color: shellColor.draft,
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
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
    .filter((spec) => !spec.origin)
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
          {state.draft ? (
            <span style={{ marginLeft: 8, color: shellColor.draft }}>
              시안 {draftInfo?.name ?? state.draft}
            </span>
          ) : null}
        </span>
        <button
          type="button"
          aria-pressed={sideVisible}
          title={
            sideVisible
              ? "오른쪽 칸(화면 조건 · 디자인 편집)을 닫아요"
              : "오른쪽 칸(화면 조건 · 디자인 편집)을 열어요"
          }
          onClick={toggleSide}
          style={headerToggle(sideVisible)}
        >
          편집 칸 보기<span aria-hidden> ▤</span>
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
          matrix={state.matrix}
          zoom={state.zoom}
          effectiveScale={scale}
          syncNav={syncNav}
          magnifier={lensActive}
          magnifierPower={lensPower}
          onZoom={setZoom}
          onStep={stepBy}
          onMatrix={(matrix) => set({ matrix })}
          onSyncNav={setSyncNav}
          onMagnifier={(on) => {
            setLensOn(on);
            if (!on) setLensHeld(false);
          }}
        >
          {state.layout === "single" && route ? (
            <StatePicker
              route={route}
              state={state}
              onPick={(config) =>
                set({
                  dataset: config.dataset,
                  latencyMs: config.latencyMs,
                  failPaths: config.failPaths,
                })
              }
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
          ) : state.layout === "single" ? (
            <SingleDraftBar
              draftInfo={draftInfo}
              peeking={peekOn}
              canPeek={canPeek}
              onPeek={setPeeking}
              onStartDraft={startDraft}
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
            ) : state.layout === "states" && route ? (
              <div style={{ padding: `12px ${STAGE_PAD_X}px ${STAGE_PAD_BOTTOM}px` }}>
                <div ref={rowRef} />
                <StatesView
                  route={route}
                  specs={specs}
                  scale={scale}
                  realMs={realMs}
                  nonces={nonces}
                  stageWidth={area.width - STAGE_PAD_X * 2}
                  onOpen={openFromState}
                  onReload={(frameId) => bump([frameId])}
                />
              </div>
            ) : (
              <div style={{ padding: `12px ${STAGE_PAD_X}px ${STAGE_PAD_BOTTOM}px` }}>
                {state.layout === "ab" ? (
                  <AbBanner
                    preview={previewSpec?.preview ?? null}
                    draftInfo={draftInfo}
                    diff={diff}
                    diffOpacity={diffOpacity}
                    onDiff={setDiff}
                    onDiffOpacity={setDiffOpacity}
                    onStartDraft={startDraft}
                  />
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
                  ref={rowRef}
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
                    ...(state.layout === "ab"
                      ? { width: "max-content", margin: "0 auto" }
                      : state.layout === "single"
                        ? { minWidth: "max-content" }
                        : {}),
                  }}
                >
                  {specs.map((spec) => renderFrame(spec, scale))}
                  {sideReference && primarySpec ? (
                    <figure
                      data-testid="reference-side-cell"
                      style={{
                        margin: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 6,
                        flex: "none",
                      }}
                    >
                      <figcaption
                        title={`참고 시안 「${sideReference.reference?.name ?? ""}」`}
                        style={{
                          width: "100%",
                          textAlign: "center",
                          ...(state.layout === "ab" ? { minHeight: AB_CAPTION - 6 } : {}),
                        }}
                      >
                        <span
                          style={{
                            ...ellipsis,
                            fontSize: state.layout === "ab" ? 14 : 12,
                            fontWeight: 700,
                            color: shellColor.draft,
                          }}
                        >
                          참고 시안 「{sideReference.reference?.name}」
                        </span>
                      </figcaption>
                      <SideReferenceFrame
                        reference={sideReference.reference}
                        url={sideReference.url}
                        device={primarySpec.device}
                        scale={scale}
                        now={state.now}
                        realMs={realMs}
                      />
                    </figure>
                  ) : null}
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
        {/* 디자인 편집기는 높이가 고정된 자리에서 스스로 스크롤한다 — 바깥은 넘치지 않게 둔다.
            패널을 닫아도 편집기는 붙어 있다(고치던 상태를 잃지 않게) */}
        <div
          data-testid={`side-panel-${state.panel}`}
          style={{
            minHeight: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: state.panel === "design" ? "hidden" : "auto",
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
                draft={agentDraft}
                hasReference={agentReference.active != null}
                buildHandoff={buildHandoff}
                onOpenPreview={openPreview}
                onOpenWorkspace={openWorkspace}
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
          ) : state.panel === "controls" ? (
            <ControlsPanel state={state} realMs={realMs} actions={actions} />
          ) : state.panel === "reference" ? (
            <ReferencePanel
              route={state.route}
              draftId={primarySpec?.config.designDraftId ?? state.draft}
              platform={state.platform}
              deviceId={state.device}
            />
          ) : (
            <DesignEditorPanel
              activeDraftId={state.draft}
              onActiveDraftChange={(draft) => set({ draft })}
              // 시안 내용이 바뀌었다 — 그 시안을 건 프레임(A/B 면 B)만 다시 불러온다
              onDraftChanged={(draftId) => {
                notifyDraftsChanged();
                bump(
                  specs
                    .filter((spec) => spec.config.designDraftId === draftId)
                    .map((spec) => spec.frameId),
                );
              }}
              frames={editorFrames}
              currentRoute={primaryPath}
              labContext={{
                platform: state.platform,
                deviceId: state.device,
                datasetId: state.dataset,
              }}
              getReferences={getReferences}
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

/** 「AI 수정 결과」를 띄운 동안의 한 줄 — 무엇을 보는지 · 돌아가기 · 돋보기/눌러 고르기가 빠지는 이유 */
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
    border: `1px solid ${primary ? shellColor.accent : shellColor.draft}`,
    background: primary ? shellColor.accent : shellColor.draftSoft,
    color: primary ? shellColor.onAccent : shellColor.draft,
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
          color: shellColor.draft,
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
        title="AI 수정 결과를 닫고 이 서버의 앱(시안이 있으면 시안)으로 돌아가요"
        style={button(false)}
      >
        {layout === "ab" ? "시안 보기로 돌아가기" : "지금 앱으로 돌아가기"}
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

function SingleDraftBar({
  draftInfo,
  peeking,
  canPeek,
  onPeek,
  onStartDraft,
}: {
  draftInfo: DraftInfo | null;
  peeking: boolean;
  canPeek: boolean;
  onPeek: (value: boolean) => void;
  onStartDraft: () => void;
}) {
  const smallButton = (primary: boolean): CSSProperties => ({
    flex: "none",
    padding: "4px 10px",
    borderRadius: 7,
    border: `1px solid ${primary ? shellColor.accent : shellColor.draft}`,
    background: primary ? shellColor.accent : peeking ? shellColor.draft : shellColor.draftSoft,
    color: primary || peeking ? shellColor.onAccent : shellColor.draft,
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    userSelect: "none",
    touchAction: "none",
  });
  return (
    <div
      data-testid="single-draft-bar"
      style={{
        flexBasis: "100%",
        display: "flex",
        gap: 10,
        alignItems: "center",
        minWidth: 0,
        fontSize: 12,
      }}
    >
      {draftInfo ? (
        <>
          <span
            style={{
              ...ellipsis,
              minWidth: 0,
              flex: "0 1 auto",
              color: shellColor.draft,
              fontWeight: 600,
            }}
          >
            {peeking
              ? "지금 앱을 보는 중 — 떼면 시안으로 돌아가요"
              : `시안 「${draftInfo.name}」 적용 중 · 바꾼 값 ${draftInfo.changes}개`}
          </span>
          <button
            type="button"
            aria-pressed={peeking}
            disabled={!canPeek}
            title="누르고 있는 동안 같은 화면을 지금 앱 그대로 보여 줘요 — ` 또는 O 키를 누르고 있어도 돼요"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              onPeek(true);
            }}
            onPointerUp={() => onPeek(false)}
            onPointerCancel={() => onPeek(false)}
            onLostPointerCapture={() => onPeek(false)}
            style={smallButton(false)}
          >
            원래대로 잠깐 보기
          </button>
          <span style={{ ...ellipsis, minWidth: 0, color: shellColor.faint }}>
            누르고 있는 동안 · ` 또는 O 키
          </span>
        </>
      ) : (
        <>
          <span style={{ ...ellipsis, minWidth: 0, color: shellColor.muted }}>
            시안 없음 — 지금 앱 그대로
          </span>
          <button type="button" onClick={onStartDraft} style={smallButton(true)}>
            시안 만들기
          </button>
        </>
      )}
    </div>
  );
}

function AbBanner({
  preview,
  draftInfo,
  diff,
  diffOpacity,
  onDiff,
  onDiffOpacity,
  onStartDraft,
}: {
  preview: FramePreview | null;
  draftInfo: DraftInfo | null;
  diff: boolean;
  diffOpacity: number;
  onDiff: (value: boolean) => void;
  onDiffOpacity: (value: number) => void;
  onStartDraft: () => void;
}) {
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
        <span style={{ flex: "1 1 260px", minWidth: 0 }}>
          {preview ? (
            <>
              <b>A</b>는 지금 앱, <b style={{ color: shellColor.draft }}>B</b>는 AI 가 작업 공간 「
              {preview.title}」에서 고친 결과예요. 같은 화면 · 같은 데이터로 나란히 보여 줘요.
            </>
          ) : (
            <>
              <b>A</b>는 지금 앱, <b style={{ color: shellColor.draft }}>B</b>는 디자인 편집에서
              고친 시안이에요. 같은 화면 · 같은 데이터로 나란히 보여 줘요.
            </>
          )}
        </span>
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
      {!preview && draftInfo && draftInfo.changes === 0 ? (
        <div data-testid="ab-empty-draft" style={{ fontSize: 12, color: shellColor.draft }}>
          시안 「{draftInfo.name}」에 아직 바꾼 값이 없어요 — 오른쪽 디자인 편집에서 값을 고치면
          B에만 바로 적용돼요.
        </div>
      ) : null}
      {!preview && !draftInfo ? (
        <div style={{ fontSize: 12, color: shellColor.muted }}>
          지금은 시안이 없어 두 화면이 같아요.{" "}
          <button
            type="button"
            onClick={onStartDraft}
            style={{
              padding: 0,
              border: 0,
              background: "transparent",
              color: shellColor.accent,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            디자인 편집 열기
          </button>
        </div>
      ) : null}
      {diff ? (
        <div style={{ fontSize: 12, color: shellColor.muted }}>
          B를 A 위에 겹쳤어요 — 막대를 A 쪽으로 밀면 A가, B 쪽으로 밀면 B가 진해져요. 겹친 동안 B는
          눌리지 않아요.
        </div>
      ) : null}
    </div>
  );
}
