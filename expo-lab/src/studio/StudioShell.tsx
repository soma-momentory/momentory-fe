import { Pressable, StyleSheet, Text, View } from "react-native";

import { claudeHomeColor as c } from "../claude-home/tokens";

export type StudioMode = "studio" | "compare" | "atlas" | "backgrounds";

const modes: readonly { id: StudioMode; label: string }[] = [
  { id: "studio", label: "디자인 편집" },
  { id: "compare", label: "상태 비교" },
  { id: "backgrounds", label: "배경 비교" },
  { id: "atlas", label: "전체 화면 Atlas" },
];

export function StudioShell({
  mode,
  draftName,
  changeCount,
  onMode,
}: {
  mode: StudioMode;
  draftName: string;
  changeCount: number;
  onMode: (mode: StudioMode) => void;
}) {
  return (
    <View style={styles.root} testID="studio-shell">
      <View style={styles.identity}>
        <Text style={styles.brand}>MOMENTORY</Text>
        <Text style={styles.title}>Design Studio</Text>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {modes.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === item.id }}
            onPress={() => onMode(item.id)}
            style={[styles.tab, mode === item.id && styles.selected]}
          >
            <Text style={[styles.tabText, mode === item.id && styles.selectedText]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.draft}>
        <Text style={styles.draftName} numberOfLines={1}>
          {draftName}
        </Text>
        <Text style={styles.status}>
          {changeCount ? `${changeCount}개 변경` : "운영 디자인과 동일"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 20,
    backgroundColor: c.card,
    borderBottomWidth: 1,
    borderColor: c.emptyBorder,
  },
  identity: { minWidth: 160 },
  brand: { color: c.green, fontSize: 10, fontWeight: "700", letterSpacing: 1.3 },
  title: { color: c.ink, fontSize: 19, fontWeight: "700" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 7, flexGrow: 1 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  selected: { backgroundColor: c.green },
  tabText: { color: c.ink, fontSize: 13, fontWeight: "600" },
  selectedText: { color: c.white },
  draft: { maxWidth: 180, alignItems: "flex-end" },
  draftName: { color: c.ink, fontSize: 12, fontWeight: "700" },
  status: { color: c.muted, fontSize: 11 },
});
