/**
 * 셸이 넘겨준 프레임(같은 출처 iframe)과 이어지는 두 갈래 — 화면 요소 선택, 그리고 각 프레임이
 * 시안을 얼마나 반영했는지(`window.__MOMENTORY_LAB_DESIGN__`) 읽기. 프레임이 다시 불리면
 * (`load`) 다시 붙는다.
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

import { LAB_DESIGN_GLOBAL, type LabDesignGlobal } from "./applyDraft";
import type { EditorFrameRef } from "./DesignEditorPanel";
import { attachInspector, highlightTestId, type InspectedElement } from "./frameInspector";

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

export function useFrameInspector({
  frames,
  enabled,
  outlineColor,
  onPick,
}: {
  frames: readonly EditorFrameRef[];
  enabled: boolean;
  outlineColor: string;
  onPick: (info: InspectedElement) => void;
}) {
  const stable = useStableFrames(frames);
  const pick = useRef(onPick);
  useEffect(() => {
    pick.current = onPick;
  });
  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return;
    return onEachLoad(
      stable.filter((frame) => frame.isDraft),
      (frame, element) => {
        const doc = element.contentDocument;
        if (!doc?.body) return;
        return attachInspector(doc, {
          frameId: frame.frameId,
          outlineColor,
          onPick: (info) => pick.current(info),
        });
      },
    );
  }, [stable, enabled, outlineColor]);
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
