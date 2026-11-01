/**
 * Expo Lab 셸 — 앱의 **모든 화면을 실제 앱 코드로** 띄우는 작업대.
 *
 *   왼쪽: 라우트 목록(앱 순서) · 가운데: 한 화면 / A·B 비교 / 전체 화면 / 매트릭스 ·
 *   오른쪽: 조작(기기 · 데이터 · 시각 · 서버 · 보기) · 디자인 편집 · 요청 기록
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

import { DesignEditorPanel } from "../design-editor/DesignEditorPanel";
import { resetFakeData, sampleParams } from "../fake-server";
import { encodeFrameConfig, type LabPlatform } from "../lab-contract";
import { chromeGeometry } from "./device/geometry";
import { ControlsPanel, type ControlActions } from "./ControlsPanel";
import { frameBus, useFrameBus } from "./frameBus";
import { framesFor, type FrameSpec } from "./frameSpecs";
import { GridView } from "./GridView";
import {
  LAYOUTS,
  parseHash,
  serializeHash,
  withPlatform,
  withRoute,
  type LayoutId,
  type ShellState,
} from "./hashState";
import { LabFrame } from "./LabFrame";
import { RequestLog } from "./RequestLog";
import { findRoute, matchPathname, type ShellRoute } from "./routes";
import { RouteTree } from "./RouteTree";
import { shellColor, shellFont } from "./theme";
import { setClock, shiftDays } from "./time";

const configKey = (spec: FrameSpec) => encodeFrameConfig(spec.config);

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
  const [stageRef, stage] = useElementSize<HTMLDivElement>();
  useFrameBus();

  const specs = useMemo(() => framesFor(state, sampleParams, realMs), [state, realMs]);

  // 프레임 메시지 처리(이벤트)가 최신 값을 읽는 자리 — 그리기가 끝난 뒤 맞춘다
  const stateRef = useRef(state);
  const specsRef = useRef(specs);
  const syncRef = useRef(syncNav);
  useLayoutEffect(() => {
    stateRef.current = state;
    specsRef.current = specs;
    syncRef.current = syncNav;
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
      const nextSpecs = framesFor(next, sampleParams, Date.now());
      const toBump: string[] = [];
      if (options.navigate && next.layout !== "grid") {
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
          if (
            options.remount ||
            !frameBus.post(spec.frameId, { type: "lab:navigate", pathname: target })
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

  // 프레임 안에서 화면이 바뀌었다 → 목록의 현재 화면을 따라가고, 같이 움직이기면 다른 프레임도 옮긴다
  useEffect(
    () =>
      frameBus.onRoute((frameId, pathname) => {
        const s = stateRef.current;
        if (s.layout === "grid") return;
        const ids = specsRef.current.map((spec) => spec.frameId);
        if (!ids.includes(frameId)) return;
        if (!syncRef.current && frameId !== primaryFrameId(s.layout, specsRef.current)) return;
        const route = matchPathname(pathname);
        if (!route) return;
        if (route.path === s.route && !syncRef.current) return;
        goTo(
          { ...s, route: route.path },
          { history: "replace", navigate: syncRef.current, target: pathname, except: frameId },
        );
      }),
    [goTo],
  );

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
    restartDiary: (path) =>
      goTo(withRoute(state, path), { history: "push", navigate: true, force: true, remount: true }),
  };

  const selectRoute = (route: ShellRoute) =>
    goTo(withRoute(state, route.path), { history: "push", navigate: true, force: true });

  const setLayout = (layout: LayoutId) => {
    if (layout === state.layout) return;
    const primary = frameBus.get(primaryFrameId(state.layout, specs)).pathname;
    const target =
      state.layout !== "grid" && primary && matchPathname(primary)?.path === state.route
        ? primary
        : undefined;
    goTo({ ...state, layout }, { history: "push", navigate: true, target, force: true });
  };

  const openFromGrid = (path: string) =>
    goTo(
      { ...withRoute(state, path), layout: "single" },
      { history: "push", navigate: true, force: true },
    );

  const route = findRoute(state.route);
  const frameKey = (spec: FrameSpec) => `${configKey(spec)}#${nonces[spec.frameId] ?? 0}`;

  const fitScale = (spec: FrameSpec, columns: number) => {
    if (state.zoom !== "fit") return state.zoom;
    const g = chromeGeometry(spec.device, Boolean(spec.device.skin));
    const width = (stage.width - 48 * columns) / columns;
    return Math.max(0.2, Math.min(1, (stage.height - 90) / g.outerHeight, width / g.outerWidth));
  };

  const editorFrames = specs.map((spec) => ({
    frameId: spec.frameId,
    element: frameBus.get(spec.frameId).element,
    isDraft: spec.config.designDraftId != null,
  }));
  const primaryPath =
    frameBus.get(primaryFrameId(state.layout, specs)).pathname?.split("?")[0] ?? state.route;

  const renderFrame = (spec: FrameSpec, scale: number) => (
    <figure
      key={spec.frameId}
      data-testid={`frame-cell-${spec.frameId}`}
      style={{ margin: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
    >
      {spec.label ? (
        <figcaption
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: spec.role === "draft" ? shellColor.draft : shellColor.ink,
          }}
        >
          {spec.label}
          {spec.role === "draft" && !spec.config.designDraftId ? " (시안 없음)" : ""}
        </figcaption>
      ) : null}
      <LabFrame
        key={frameKey(spec)}
        spec={spec}
        scale={scale}
        realMs={realMs}
        startPath={frameBus.get(spec.frameId).pathname}
      />
    </figure>
  );

  const tab = (active: boolean): CSSProperties => ({
    padding: "6px 12px",
    borderRadius: 8,
    border: 0,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    background: active ? shellColor.accent : "transparent",
    color: active ? shellColor.onAccent : shellColor.ink,
  });

  return (
    <div
      data-testid="lab-shell"
      style={{
        width: "100vw",
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "250px minmax(0, 1fr) 340px",
        gridTemplateRows: "52px minmax(0, 1fr)",
        background: shellColor.page,
        fontFamily: shellFont,
        color: shellColor.ink,
      }}
    >
      <header
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 16px",
          background: shellColor.panel,
          borderBottom: `1px solid ${shellColor.border}`,
        }}
      >
        <strong style={{ fontSize: 14 }}>
          MOMENTORY <span style={{ color: shellColor.muted, fontWeight: 500 }}>Expo Lab</span>
        </strong>
        <div role="tablist" aria-label="레이아웃" style={{ display: "flex", gap: 4 }}>
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              role="tab"
              aria-selected={state.layout === layout.id}
              onClick={() => setLayout(layout.id)}
              style={tab(state.layout === layout.id)}
            >
              {layout.label}
            </button>
          ))}
        </div>
        <span style={{ flex: 1, fontSize: 13, color: shellColor.muted }} data-testid="shell-title">
          {route ? `${route.sectionTitle} · ${route.title}` : state.route}
          {state.draft ? (
            <span style={{ marginLeft: 8, color: shellColor.draft }}>시안 {state.draft}</span>
          ) : null}
        </span>
        {state.layout !== "grid" ? (
          <label style={{ fontSize: 12, display: "flex", gap: 4, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={syncNav}
              onChange={(event) => setSyncNav(event.target.checked)}
            />
            프레임 같이 움직이기
          </label>
        ) : null}
      </header>

      <aside
        style={{
          background: shellColor.panel,
          borderRight: `1px solid ${shellColor.border}`,
          minHeight: 0,
        }}
      >
        <RouteTree
          current={state.route}
          frameIds={state.layout === "grid" ? [] : specs.map((spec) => spec.frameId)}
          onSelect={selectRoute}
        />
      </aside>

      <main
        ref={stageRef}
        data-testid="stage"
        data-layout={state.layout}
        style={{ minHeight: 0, minWidth: 0, overflow: "auto", background: shellColor.stage }}
      >
        {state.layout === "grid" ? (
          <GridView
            specs={specs}
            scale={state.zoom === "fit" ? 0.3 : state.zoom}
            realMs={realMs}
            nonces={nonces}
            onOpen={openFromGrid}
          />
        ) : (
          <div style={{ padding: "12px 24px 24px" }}>
            {route?.hint ? (
              <p
                data-testid="route-hint"
                style={{
                  margin: "0 auto 12px",
                  maxWidth: 720,
                  fontSize: 12,
                  color: shellColor.muted,
                  textAlign: "center",
                }}
              >
                {route.hint}
              </p>
            ) : null}
            <div
              style={{
                display: "flex",
                flexWrap: state.layout === "matrix" ? "wrap" : "nowrap",
                gap: 32,
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              {specs.map((spec) =>
                renderFrame(
                  spec,
                  state.layout === "matrix"
                    ? state.zoom === "fit"
                      ? 0.45
                      : state.zoom
                    : fitScale(spec, specs.length),
                ),
              )}
            </div>
          </div>
        )}
      </main>

      <aside
        style={{
          background: shellColor.panel,
          borderLeft: `1px solid ${shellColor.border}`,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div role="tablist" aria-label="패널" style={{ display: "flex", gap: 4, padding: 8 }}>
          {(
            [
              ["controls", "조작"],
              ["design", "디자인 편집"],
              ["log", `요청 ${frameBus.requests.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={state.panel === id}
              onClick={() => goTo({ ...state, panel: id }, { history: "replace" })}
              style={tab(state.panel === id)}
            >
              {label}
            </button>
          ))}
        </div>
        {/* 디자인 편집기는 높이가 고정된 자리에서 스스로 스크롤한다 — 바깥은 넘치지 않게 둔다 */}
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
          {state.panel === "controls" ? (
            <ControlsPanel state={state} realMs={realMs} actions={actions} />
          ) : state.panel === "design" ? (
            <DesignEditorPanel
              activeDraftId={state.draft}
              onActiveDraftChange={(draft) => set({ draft })}
              // 시안 내용이 바뀌었다 — 그 시안을 건 프레임(A/B 면 B)만 다시 불러온다
              onDraftChanged={(draftId) =>
                bump(
                  specs
                    .filter((spec) => spec.config.designDraftId === draftId)
                    .map((spec) => spec.frameId),
                )
              }
              frames={editorFrames}
              currentRoute={primaryPath}
            />
          ) : (
            <RequestLog />
          )}
        </div>
      </aside>
    </div>
  );
}
