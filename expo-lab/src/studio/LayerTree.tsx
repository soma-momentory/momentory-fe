import { Pressable, StyleSheet, Text, View } from "react-native";

import { claudeHomeColor as c } from "../claude-home/tokens";
import type { EditableComponent } from "./registry";

export function layerDepth(layer: EditableComponent, layers: readonly EditableComponent[]): number {
  let depth = 0;
  let parentId = layer.parentId;
  while (parentId) {
    const parent = layers.find((item) => item.id === parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentId;
  }
  return depth;
}

export function LayerTree({
  layers,
  selectedId,
  query,
  onSelect,
}: {
  layers: readonly EditableComponent[];
  selectedId: string;
  query: string;
  onSelect: (id: string) => void;
}) {
  const visible = layers.filter((layer) =>
    `${layer.label} ${layer.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  return (
    <View testID="studio-layer-tree" style={styles.root}>
      {visible.map((layer) => (
        <Pressable
          key={layer.id}
          accessibilityRole="button"
          accessibilityLabel={`${layer.label} 레이어`}
          aria-selected={selectedId === layer.id}
          onPress={() => onSelect(layer.id)}
          style={[
            styles.layer,
            { paddingLeft: 9 + layerDepth(layer, layers) * 14 },
            selectedId === layer.id && styles.selected,
          ]}
        >
          <Text style={[styles.label, selectedId === layer.id && styles.selectedLabel]}>
            {layer.label}
          </Text>
          <Text style={styles.kind}>{layer.properties.length ? layer.kind : "보기"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 3 },
  layer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 5,
    paddingVertical: 6,
    paddingRight: 8,
    borderRadius: 6,
  },
  selected: { backgroundColor: c.green },
  label: { color: c.ink, fontSize: 12, flexShrink: 1 },
  selectedLabel: { color: c.white, fontWeight: "700" },
  kind: { color: c.muted, fontSize: 10 },
});
