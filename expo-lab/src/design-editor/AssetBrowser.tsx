import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { studioAssets, type StudioAssetId } from "../../../src/design/studioAssets";
import { palette } from "./ui";

const c = {
  ink: palette.ink,
  muted: palette.muted,
  paper: palette.sunken,
  white: palette.panel,
  taskBorder: palette.line,
  green: palette.accent,
  greenSoft: palette.accentSoft,
};

export function AssetBrowser({
  value,
  onChange,
}: {
  value: StudioAssetId;
  onChange: (value: StudioAssetId) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const categories = ["전체", ...new Set(studioAssets.map((asset) => asset.category))];
  const visible = studioAssets.filter(
    (asset) =>
      (category === "전체" || asset.category === category) &&
      `${asset.label} ${asset.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const selected = studioAssets.find((asset) => asset.id === value) ?? studioAssets[0];

  return (
    <View testID="studio-asset-browser" style={styles.root}>
      <Text style={styles.heading}>프로젝트 이미지</Text>
      <View style={styles.selected}>
        <Image source={selected.source} resizeMode="contain" style={styles.selectedImage} />
        <Text style={styles.name}>{selected.label}</Text>
      </View>
      <TextInput
        accessibilityLabel="이미지 검색"
        placeholder="파일명 또는 이름 검색"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      <View style={styles.categories}>
        {categories.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: item === category }}
            onPress={() => setCategory(item)}
            style={[styles.category, item === category && styles.categoryActive]}
          >
            <Text style={styles.name}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grid}>
        {visible.map((asset) => (
          <Pressable
            key={asset.id}
            accessibilityRole="button"
            accessibilityLabel={`${asset.label} 이미지 선택`}
            accessibilityState={{ selected: asset.id === value }}
            onPress={() => onChange(asset.id)}
            style={[styles.asset, asset.id === value && styles.assetActive]}
          >
            <Image source={asset.source} resizeMode="contain" style={styles.thumbnail} />
            <Text style={styles.name} numberOfLines={2}>
              {asset.label}
            </Text>
            <Text style={styles.filename} numberOfLines={1}>
              {asset.id}
            </Text>
          </Pressable>
        ))}
      </View>
      {!visible.length ? <Text style={styles.filename}>일치하는 에셋이 없습니다.</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => onChange("rest-baba-sleep")}>
        <Text style={styles.restore}>기본 이미지 복원</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  heading: { color: c.ink, fontSize: 13, fontWeight: "700" },
  selected: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectedImage: { width: 58, height: 58, backgroundColor: c.paper, borderRadius: 7 },
  name: { color: c.ink, fontSize: 11, flexShrink: 1 },
  search: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.taskBorder,
    backgroundColor: c.white,
    color: c.ink,
  },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  category: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.taskBorder,
  },
  categoryActive: { backgroundColor: c.greenSoft },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  asset: {
    width: 98,
    padding: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: c.taskBorder,
    gap: 2,
  },
  assetActive: { borderColor: c.green, borderWidth: 2 },
  thumbnail: { width: "100%", height: 55, backgroundColor: c.paper },
  filename: { color: c.muted, fontSize: 10 },
  restore: { color: c.green, fontSize: 12, fontWeight: "700" },
});
