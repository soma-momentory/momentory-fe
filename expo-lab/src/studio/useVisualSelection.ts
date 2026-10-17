import { useEffect, type RefObject } from "react";
import { Platform, type View } from "react-native";

import type { EditableComponent } from "./registry";

/** A Lab-only DOM adapter. RN Views expose stable testIDs; no production event handler changes. */
export function useVisualSelection({
  rootRef,
  enabled,
  layers,
  selectedId,
  onSelect,
  refresh,
}: {
  rootRef: RefObject<View | null>;
  enabled: boolean;
  layers: readonly EditableComponent[];
  selectedId: string;
  onSelect: (id: string) => void;
  refresh: unknown;
}) {
  useEffect(() => {
    if (Platform.OS !== "web" || !enabled) return;
    const root = rootRef.current as unknown as HTMLElement | null;
    if (!root) return;
    const byTestId = new Map(layers.map((layer) => [layer.testId, layer.id]));
    const select = (event: Event) => {
      const pointer = event as PointerEvent;
      const nodes = new Map(
        Array.from(root.querySelectorAll<HTMLElement>("[data-testid]")).map((node) => [
          node.dataset.testid,
          node,
        ]),
      );
      const geometric = layers
        .map((layer) => {
          const node = nodes.get(layer.testId);
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          if (
            rect.width === 0 ||
            rect.height === 0 ||
            pointer.clientX < rect.left ||
            pointer.clientX > rect.right ||
            pointer.clientY < rect.top ||
            pointer.clientY > rect.bottom
          )
            return null;
          let depth = 0;
          let parentId = layer.parentId;
          while (parentId) {
            const parent = layers.find((item) => item.id === parentId);
            if (!parent) break;
            depth += 1;
            parentId = parent.parentId;
          }
          return { layer, depth, area: rect.width * rect.height };
        })
        .filter((item) => item !== null)
        .sort((a, b) => b.depth - a.depth || a.area - b.area)[0];
      if (geometric) {
        onSelect(geometric.layer.id);
        event.stopPropagation();
        return;
      }
      let target = event.target as Element | null;
      while (target && target !== root) {
        const id = byTestId.get(target.getAttribute("data-testid") ?? "");
        if (id) {
          onSelect(id);
          break;
        }
        target = target.parentElement;
      }
      event.stopPropagation();
    };
    const block = (event: Event) => {
      event.stopPropagation();
      if (event.type === "click") event.preventDefault();
    };
    root.addEventListener("pointerdown", select, true);
    root.addEventListener("pointerup", block, true);
    root.addEventListener("click", block, true);
    return () => {
      root.removeEventListener("pointerdown", select, true);
      root.removeEventListener("pointerup", block, true);
      root.removeEventListener("click", block, true);
    };
  }, [rootRef, enabled, layers, onSelect]);

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled || !selectedId) return;
    const root = rootRef.current as unknown as HTMLElement | null;
    const selected = layers.find((layer) => layer.id === selectedId);
    if (!root || !selected) return;
    const node = Array.from(root.querySelectorAll<HTMLElement>("[data-testid]")).find(
      (item) => item.dataset.testid === selected.testId,
    );
    if (!node) return;
    const outline = node.style.outline;
    const outlineOffset = node.style.outlineOffset;
    node.style.outline = "3px solid #287658";
    node.style.outlineOffset = "2px";
    return () => {
      node.style.outline = outline;
      node.style.outlineOffset = outlineOffset;
    };
    // Rebind the outline when the preview remounts for another scenario or draft.
  }, [rootRef, enabled, layers, selectedId, refresh]);
}
