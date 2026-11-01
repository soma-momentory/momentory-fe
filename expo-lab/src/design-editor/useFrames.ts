/**
 * 셸이 넘겨준 프레임(같은 출처 iframe)과 이어지는 두 갈래 — 화면 요소 선택, 그리고 각 프레임이
 * 시안을 얼마나 반영했는지(`window.__MOMENTORY_LAB_DESIGN__`) 읽기. 프레임이 다시 불리면
 * (`load`) 다시 붙는다.
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { LAB_DESIGN_GLOBAL, type LabDesignGlobal } from "./applyDraft";
import type { EditorFrameRef } from "./DesignEditorPanel";
import { attachInspector, highlightTestId } from "./frameInspector";
import { collectScreenUsage, showBoxes, type UsageItem, type UsageSample } from "./screenUsage";

const sameFrames = (a: readonly EditorFrameRef[], b: readonly EditorFrameRef[]) =>
  a.length === b.length &&
  a.every(
    (frame, i) =>
      frame.frameId === b[i]?.frameId &&
      frame.element === b[i]?.element &&
      frame.isDraft === b[i]?.isDraft,
  );

/** 프레임 목록이 새 배열로 와도 같은 프레임·같은 iframe 이면 다시 붙지 않는다 */
function useStableFrames(frames: readonly EditorFrameRef[]) {
  const [stable, setStable] = useState(frames);
  if (!sameFrames(stable, frames)) {
    setStable(frames);
    return frames;
  }
  return stable;
}

function onEachLoad(
  frames: readonly EditorFrameRef[],
  attach: (frame: EditorFrameRef, element: HTMLIFrameElement) => (() => void) | void,
) {
  const detachers = new Map<HTMLIFrameElement, () => void>();
  const removers: (() => void)[] = [];
  for (const frame of frames) {
    const element = frame.element;
    if (!element) continue;
    const run = () => {
      detachers.get(element)?.();
      detachers.delete(element);
      try {
        const detach = attach(frame, element);
        if (detach) detachers.set(element, detach);
      } catch {
        // 다른 출처이거나 아직 문서가 없다 — 다음 load 를 기다린다
      }
    };
    element.addEventListener("load", run);
    removers.push(() => element.removeEventListener("load", run));
    run();
  }
  return () => {
    removers.forEach((remove) => remove());
    detachers.forEach((detach) => detach());
  };
}

/** 「화면에서 눌러 고르기」 — 고를 프레임 하나(보통 B)에 붙는다 */
export function useFrameInspector({
  frame,
  enabled,
  outlineColor,
  onPick,
}: {
  frame: EditorFrameRef | null;
  enabled: boolean;
  outlineColor: string;
  onPick: (element: Element, frameId: string) => void;
}) {
  const stable = useStableFrames(frame ? [frame] : []);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return;
    return onEachLoad(stable, (target, element) => {
      const doc = element.contentDocument;
      if (!doc?.body) return;
      return attachInspector(doc, {
        outlineColor,
        onPick: (picked) => pick.current(picked, target.frameId),
      });
    });
  }, [stable, enabled, outlineColor]);
}

/** 앱이 그리는 데 걸리는 시간 — 불린 뒤 · 라우트가 바뀐 뒤 이만큼 기다렸다 모은다 */
export const USAGE_SETTLE_MS = 500;
/** 화면이 바뀌는 동안(DOM 변경) 다시 모으는 간격의 하한 */
export const USAGE_THROTTLE_MS = 1000;

export type ScreenUsageSnapshot = {
  frameId: string;
  samples: UsageSample[];
  /** 모은 순간에 짝지은 결과(`match`) — 고치는 동안 줄이 사라지지 않게 그때의 값으로 짝짓는다 */
  items: UsageItem[];
  /** 지금 보이는 요소의 testID — 화면별 값은 화면에 있는 요소만 보인다 */
  testIds: ReadonlySet<string>;
  /** 모은 횟수 — 다시 모일 때마다 는다 */
  version: number;
};

/**
 * 「이 화면에 쓰인 값」 — 프레임 하나에 보이는 요소의 계산된 값을 모은다. 불렸을 때 · 프레임이
 * `lab:route` 를 보냈을 때 · `route` 가 바뀌었을 때 `USAGE_SETTLE_MS` 뒤에, 그리고 화면이 바뀌는
 * 동안(MutationObserver) `USAGE_THROTTLE_MS` 에 한 번씩 다시 모은다.
 */
export function useScreenUsage(
  frame: EditorFrameRef | null,
  route: string,
  enabled: boolean,
  /** 모은 값 → 후보 토큰. 두 번째 인자는 그 프레임의 `typeScale`(못 읽으면 null) */
  match: (samples: UsageSample[], typeScale: number | null) => UsageItem[],
): ScreenUsageSnapshot | null {
  const stable = useStableFrames(frame ? [frame] : []);
  const [snapshot, setSnapshot] = useState<ScreenUsageSnapshot | null>(null);
  const matchRef = useRef(match);
  useEffect(() => {
    matchRef.current = match;
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return;
    let version = 0;
    return onEachLoad(stable, (target, element) => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      let last = 0;
      const collect = () => {
        timer = null;
        last = Date.now();
        const doc = element.contentDocument;
        if (!doc?.body) return;
        version += 1;
        const testIds = new Set(
          Array.from(doc.querySelectorAll("[data-testid]")).map(
            (node) => node.getAttribute("data-testid") ?? "",
          ),
        );
        const samples = collectScreenUsage(doc);
        let typeScale: number | null = null;
        try {
          const global = (element.contentWindow as unknown as Record<string, unknown> | null)?.[
            LAB_DESIGN_GLOBAL
          ] as LabDesignGlobal | undefined;
          typeScale = global?.typeScale() ?? null;
        } catch {
          typeScale = null;
        }
        setSnapshot({
          frameId: target.frameId,
          samples,
          items: matchRef.current(samples, typeScale),
          testIds,
          version,
        });
      };
      const later = (ms: number) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(collect, ms);
      };
      const throttled = () => {
        if (timer) return;
        timer = setTimeout(
          collect,
          Math.max(USAGE_SETTLE_MS, USAGE_THROTTLE_MS - (Date.now() - last)),
        );
      };
      later(USAGE_SETTLE_MS);
      const onMessage = (event: MessageEvent) => {
        const data = event.data as { type?: string; frameId?: string } | null;
        if (
          data?.frameId === target.frameId &&
          (data.type === "lab:route" || data.type === "lab:ready")
        )
          later(USAGE_SETTLE_MS);
      };
      window.addEventListener("message", onMessage);
      const doc = element.contentDocument;
      const view = doc?.defaultView as (Window & typeof globalThis) | null | undefined;
      let observer: MutationObserver | null = null;
      if (doc?.body && view?.MutationObserver) {
        observer = new view.MutationObserver((records) => {
          // 우리 덮개(강조 상자)가 붙고 떨어지는 것은 화면 변화가 아니다
          const ours = records.every((record) =>
            [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].every(
              (node) => (node as Element).id?.startsWith?.("momentory-lab-") ?? false,
            ),
          );
          if (!ours) throttled();
        });
        observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
      }
      return () => {
        if (timer) clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        observer?.disconnect();
      };
    });
    // route 가 바뀌면 처음부터 다시 붙는다(= USAGE_SETTLE_MS 뒤에 모은다)
  }, [stable, enabled, route]);
  return enabled ? snapshot : null;
}

/** 패널에서 가리킨 요소들을 그 프레임에 상자로 보인다 */
export function useFrameBoxes(
  frame: EditorFrameRef | null,
  elements: readonly Element[] | null,
  color: string,
  id?: string,
) {
  useEffect(() => {
    if (Platform.OS !== "web" || !frame?.element || !elements?.length) return;
    const doc = frame.element.contentDocument;
    if (!doc) return;
    return showBoxes(doc, elements, color, id);
  }, [frame, elements, color, id]);
}

/** 패널에서 고른 Studio 요소를 모든 프레임에서 강조한다(승인본 · 시안 둘 다 — 나란히 본다) */
export function useFrameHighlight(
  frames: readonly EditorFrameRef[],
  testId: string | null,
  color: string,
) {
  const stable = useStableFrames(frames);
  useEffect(() => {
    if (Platform.OS !== "web" || !testId) return;
    return onEachLoad(stable, (_frame, element) => {
      const doc = element.contentDocument;
      if (!doc) return;
      // 앱이 그 요소를 그리기까지 조금 걸린다 — 몇 번 다시 본다
      let undo: () => void = () => undefined;
      let tries = 0;
      const timer = setInterval(() => {
        undo();
        undo = highlightTestId(doc, testId, color);
        if (++tries >= 10) clearInterval(timer);
      }, 400);
      undo = highlightTestId(doc, testId, color);
      return () => {
        clearInterval(timer);
        undo();
      };
    });
  }, [stable, testId, color]);
}

export type FrameReports = Readonly<Record<string, LabDesignGlobal | null>>;

/** 각 프레임의 적용 결과 — 프레임이 다시 불릴 때마다 새로 읽는다 */
export function useFrameReports(frames: readonly EditorFrameRef[]): FrameReports {
  const stable = useStableFrames(frames);
  const [reports, setReports] = useState<FrameReports>({});
  useEffect(() => {
    if (Platform.OS !== "web") return;
    return onEachLoad(stable, (frame, element) => {
      const read = () => {
        const global = (element.contentWindow as unknown as Record<string, unknown> | null)?.[
          LAB_DESIGN_GLOBAL
        ] as LabDesignGlobal | undefined;
        setReports((current) => ({ ...current, [frame.frameId]: global ?? null }));
      };
      read();
      // 부트스트랩이 load 뒤에 걸 수도 있다 — 한 번 더 본다
      const timer = setTimeout(read, 1200);
      return () => clearTimeout(timer);
    });
  }, [stable]);
  return reports;
}
