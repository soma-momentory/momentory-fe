import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { approvedDesign } from "../../../src/design/studioDesign";
import { tabBackgroundByTab } from "../../../src/design/tabBackgrounds";
import { devices, VariantPhone } from "../catalog/PhonePreview";
import { variantsFor } from "../catalog/variants";
import { claudeHomeColor as c } from "../claude-home/tokens";
import { previewBackgrounds, type PreviewBackgroundId } from "./backgrounds";

const tabs = [
  { id: "home-main", label: "홈", variant: "app-v2", scenario: "5d" },
  { id: "rest-hub", label: "쉼터", variant: "app-rest", scenario: "default" },
  { id: "archive", label: "보관함", variant: "app-archive", scenario: "default" },
  { id: "report", label: "리포트", variant: "app-report", scenario: "default" },
  { id: "my-main", label: "마이", variant: "app-my", scenario: "default" },
] as const;

const STORAGE_KEY = "momentory-lab-background-comparison-v1";
type Settings = {
  mode: "approved" | "tabs" | "backgrounds";
  backgroundId: PreviewBackgroundId;
  tabId: (typeof tabs)[number]["id"];
  deviceWidth: number;
  scale: number;
};
const defaults: Settings = {
  mode: "approved",
  backgroundId: "warm-ivory",
  tabId: "rest-hub",
  deviceWidth: 390,
  scale: 0.5,
};

function readSettings(): Settings {
  if (Platform.OS !== "web") return defaults;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!stored || typeof stored !== "object") return defaults;
    return {
      mode: stored.mode === "backgrounds" || stored.mode === "tabs" ? stored.mode : "approved",
      backgroundId:
        previewBackgrounds.find((item) => item.id === stored.backgroundId)?.id ??
        defaults.backgroundId,
      tabId: tabs.find((item) => item.id === stored.tabId)?.id ?? defaults.tabId,
      deviceWidth:
        devices.find((item) => item.width === stored.deviceWidth)?.width ?? defaults.deviceWidth,
      scale: [0.5, 0.65, 0.85].includes(stored.scale) ? stored.scale : defaults.scale,
    };
  } catch {
    return defaults;
  }
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text style={[styles.choiceText, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

/** Compare all five real tab views with one image, or all candidate images on the same tab. */
export function BackgroundComparison() {
  const [settings, setSettings] = useState(readSettings);
  const [message, setMessage] = useState("");
  const update = (patch: Partial<Settings>) => setSettings((current) => ({ ...current, ...patch }));
  useEffect(() => {
    if (Platform.OS !== "web") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Preview remains usable when browser storage is unavailable.
    }
  }, [settings]);

  const selectedTab = tabs.find((tab) => tab.id === settings.tabId)!;
  const selectedBackground =
    previewBackgrounds.find((item) => item.id === settings.backgroundId) ?? previewBackgrounds[0];
  const device = devices.find((item) => item.width === settings.deviceWidth)!;
  const panels =
    settings.mode === "approved"
      ? tabs.map((tab) => ({
          key: tab.id,
          tab,
          background: previewBackgrounds.find((item) => item.id === tabBackgroundByTab[tab.label])!,
        }))
      : settings.mode === "tabs"
        ? tabs.map((tab) => ({ key: tab.id, tab, background: selectedBackground }))
        : previewBackgrounds.map((background) => ({
            key: background.id,
            tab: selectedTab,
            background,
          }));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      testID="background-comparison"
    >
      <Text style={styles.title}>종이 배경 비교</Text>
      <Text style={styles.note}>
        확정한 종이 질감 2종과 기존 모눈을 실제 탭 화면에 적용해 보세요. 글자와 카드는 같은
        디자인으로 비교하며, 선택은 이 브라우저에 저장됩니다.
      </Text>
      <View style={styles.row}>
        <Choice
          label="선택한 조합 · 5개 탭"
          selected={settings.mode === "approved"}
          onPress={() => update({ mode: "approved" })}
        />
        <Choice
          label="같은 배경 · 5개 탭"
          selected={settings.mode === "tabs"}
          onPress={() => update({ mode: "tabs" })}
        />
        <Choice
          label="같은 탭 · 모든 배경"
          selected={settings.mode === "backgrounds"}
          onPress={() => update({ mode: "backgrounds" })}
        />
      </View>

      {settings.mode === "tabs" ? (
        <View style={styles.controls}>
          <Text style={styles.label}>5개 탭에 함께 적용할 배경</Text>
          <View style={styles.row}>
            {previewBackgrounds.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`배경 ${item.label}`}
                accessibilityState={{ selected: selectedBackground.id === item.id }}
                onPress={() => update({ backgroundId: item.id })}
                style={[styles.swatch, selectedBackground.id === item.id && styles.swatchSelected]}
              >
                {item.source ? (
                  <Image
                    source={item.source}
                    style={styles.swatchImage}
                    contentFit="cover"
                    accessible={false}
                  />
                ) : (
                  <View style={[styles.swatchImage, styles.gridSwatch]} />
                )}
                <Text style={styles.swatchLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : settings.mode === "backgrounds" ? (
        <View style={styles.controls}>
          <Text style={styles.label}>모든 배경으로 비교할 탭</Text>
          <View style={styles.row}>
            {tabs.map((tab) => (
              <Choice
                key={tab.id}
                label={tab.label}
                selected={settings.tabId === tab.id}
                onPress={() => update({ tabId: tab.id })}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.controls}>
        <Text style={styles.label}>화면 크기</Text>
        <View style={styles.row}>
          {devices.map((item) => (
            <Choice
              key={item.width}
              label={`${item.width}pt`}
              selected={device.width === item.width}
              onPress={() => update({ deviceWidth: item.width })}
            />
          ))}
        </View>
        <Text style={styles.label}>미리보기 확대</Text>
        <View style={styles.row}>
          {[0.5, 0.65, 0.85].map((scale) => (
            <Choice
              key={scale}
              label={`${Math.round(scale * 100)}%`}
              selected={settings.scale === scale}
              onPress={() => update({ scale })}
            />
          ))}
        </View>
      </View>
      <Text style={styles.sectionTitle}>
        {settings.mode === "approved"
          ? "선택한 조합 · 주요 5개 탭"
          : settings.mode === "tabs"
            ? `${selectedBackground.label} · 주요 5개 탭`
            : `${selectedTab.label} · 배경 ${previewBackgrounds.length}종`}
      </Text>
      <Text style={styles.note}>
        각 화면을 안에서 스크롤해 아래쪽도 확인할 수 있어요. 선택한 조합이 앱의 기본 배경이며, 다른
        비교 선택은 앱에 자동 적용되지 않습니다.
      </Text>
      <View style={styles.panels}>
        {panels.map(({ key, tab, background }) => {
          const variant = variantsFor(tab.id).find((item) => item.id === tab.variant)!;
          return (
            <View key={key} style={styles.panel} testID={`background-panel-${key}`}>
              <Text style={styles.panelTitle}>
                {settings.mode === "approved"
                  ? `${tab.label} · ${background.label}`
                  : settings.mode === "tabs"
                    ? tab.label
                    : background.label}
              </Text>
              <VariantPhone
                backgroundId={background.id}
                design={approvedDesign}
                variant={variant}
                scenarioId={tab.scenario}
                weatherId="none"
                letterId="none"
                fontScale={1}
                device={device}
                scale={settings.scale}
                onMessage={setMessage}
              />
            </View>
          );
        })}
      </View>
      <Text style={styles.note} accessibilityLiveRegion="polite">
        {message}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 18, paddingBottom: 48, gap: 12 },
  title: { color: c.ink, fontSize: 25, fontWeight: "700" },
  note: { color: c.muted, fontSize: 13, lineHeight: 20 },
  label: { color: c.ink, fontSize: 13, fontWeight: "700" },
  sectionTitle: { color: c.ink, fontSize: 18, fontWeight: "700", marginTop: 8 },
  controls: { gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: c.taskBorder,
    borderRadius: 8,
    backgroundColor: c.card,
  },
  choiceText: { color: c.ink, fontSize: 12 },
  selected: { backgroundColor: c.green, borderColor: c.green },
  selectedText: { color: c.white, fontWeight: "700" },
  swatch: {
    width: 148,
    padding: 6,
    borderWidth: 2,
    borderColor: c.emptyBorder,
    borderRadius: 10,
    backgroundColor: c.card,
    gap: 6,
  },
  swatchSelected: { borderColor: c.green },
  swatchImage: { height: 48, width: "100%", borderRadius: 5 },
  gridSwatch: { backgroundColor: c.paper, borderWidth: 1, borderColor: c.grid },
  swatchLabel: { color: c.ink, fontSize: 12, fontWeight: "600" },
  panels: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", gap: 16 },
  panel: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.emptyBorder,
    gap: 8,
  },
  panelTitle: { color: c.ink, fontSize: 15, fontWeight: "700" },
});
