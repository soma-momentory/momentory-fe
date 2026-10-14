import { Gaegu_400Regular, Gaegu_700Bold, useFonts } from "@expo-google-fonts/gaegu";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { type ClaudeHomeTask, type ClaudeWeather } from "./claude-home/HomeView";
import { claudeHomeScenarios, type ClaudeHomeScenario } from "./claude-home/scenarios";
import { claudeHomeColor as c, claudeHomeFont as font } from "./claude-home/tokens";
import { homeVariants, type HomeVariant } from "./claude-home/variants";

const devices = [
  { label: "iPhone 13 mini", width: 375, height: 812 },
  { label: "iPhone 16e", width: 390, height: 844 },
  { label: "원본 402", width: 402, height: 874 },
  { label: "iPhone 16 Plus", width: 430, height: 932 },
] as const;

const weathers: ClaudeWeather[] = ["sunny", "cloudy", "rainy", "snowy", "thunder", "windy"];

function initialPreview() {
  if (typeof window === "undefined")
    return { scenario: "5d" as ClaudeHomeScenario["id"], deviceIndex: 2 };
  const params = new URLSearchParams(window.location.search);
  const scenario =
    claudeHomeScenarios.find((item) => item.id === params.get("scenario"))?.id ?? "5d";
  const deviceIndex = devices.findIndex((item) => String(item.width) === params.get("device"));
  return { scenario, deviceIndex: deviceIndex < 0 ? 2 : deviceIndex };
}

function Preview({
  scenario,
  variant,
  onMessage,
}: {
  scenario: ClaudeHomeScenario;
  variant: HomeVariant;
  onMessage: (message: string) => void;
}) {
  const [tasks, setTasks] = useState<ClaudeHomeTask[]>(() =>
    scenario.tasks.map((task) => ({ ...task })),
  );
  const [weather, setWeather] = useState<ClaudeWeather>("sunny");
  const Screen = variant.Screen;
  return (
    <Screen
      gridPhaseY={4}
      model={{
        date: "10월 14일",
        weekday: "수요일",
        tasks,
        weather,
        showWeekDock: scenario.showWeekDock,
        unreadNotifications: true,
      }}
      actions={{
        onToggleTask: (id) =>
          setTasks((current) =>
            current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
          ),
        onAddTask: () => {
          setTasks((current) => [
            ...current,
            { id: `mock-${current.length}`, title: "새 일정", time: "21:00", done: false },
          ]);
          onMessage("Lab Mock 일정만 추가했습니다.");
        },
        onCycleWeather: () =>
          setWeather(
            (current) => weathers[(weathers.indexOf(current) + 1) % weathers.length] ?? "sunny",
          ),
        onStartReflection: () => onMessage("회고 진입은 Lab Mock 액션입니다."),
        onOpenNotifications: () => onMessage("알림은 연결하지 않았습니다."),
        onSelectTab: (tab) => onMessage(`${tab} 탭은 미리보기 전용입니다.`),
      }}
    />
  );
}

function DeviceFrame({
  scenario,
  variant,
  device,
  onMessage,
}: {
  scenario: ClaudeHomeScenario;
  variant: HomeVariant;
  device: (typeof devices)[number];
  onMessage: (message: string) => void;
}) {
  return (
    <View style={[styles.device, { width: device.width + 20, height: device.height + 20 }]}>
      <View style={styles.statusBar}>
        <Svg pointerEvents="none" width={device.width} height={62} style={StyleSheet.absoluteFill}>
          {Array.from({ length: Math.ceil(device.width / 22) + 1 }, (_, index) => (
            <Line
              key={`v${index}`}
              x1={index * 22}
              y1={0}
              x2={index * 22}
              y2={62}
              stroke={c.grid}
              strokeWidth={1}
            />
          ))}
          {[0, 22, 44].map((y) => (
            <Line
              key={`h${y}`}
              x1={0}
              y1={y}
              x2={device.width}
              y2={y}
              stroke={c.grid}
              strokeWidth={1}
            />
          ))}
        </Svg>
        <Text style={styles.statusTime}>9:41</Text>
        <Svg width={74} height={20} viewBox="0 0 74 20" fill={c.statusInk}>
          <Rect x={0} y={13} width={3} height={5} rx={1} />
          <Rect x={4} y={10} width={3} height={8} rx={1} />
          <Rect x={8} y={7} width={3} height={11} rx={1} />
          <Rect x={12} y={4} width={3} height={14} rx={1} />
          <Path d="M27 7c4-4 12-4 16 0l-2 2c-3-3-9-3-12 0zM31 11c2-2 6-2 8 0l-4 5z" />
          <Rect
            x={53}
            y={4}
            width={18}
            height={13}
            rx={3}
            fill="none"
            stroke={c.statusInk}
            strokeWidth={1.5}
          />
          <Rect x={55} y={6} width={14} height={9} rx={1} />
          <Rect x={72} y={8} width={2} height={5} rx={1} />
        </Svg>
      </View>
      <Preview key={scenario.id} scenario={scenario} variant={variant} onMessage={onMessage} />
    </View>
  );
}

export function App() {
  const [fontsLoaded, fontError] = useFonts({ Gaegu_400Regular, Gaegu_700Bold });
  const [scenarioId, setScenarioId] = useState<ClaudeHomeScenario["id"]>(
    () => initialPreview().scenario,
  );
  const [deviceIndex, setDeviceIndex] = useState(() => initialPreview().deviceIndex);
  const [variantId, setVariantId] = useState(homeVariants[0]!.id);
  const [message, setMessage] = useState("일정 체크와 날씨 스티커를 눌러 볼 수 있어요.");
  const { width: viewportWidth } = useWindowDimensions();
  const scenario =
    claudeHomeScenarios.find((item) => item.id === scenarioId) ?? claudeHomeScenarios[0]!;
  const variant = homeVariants.find((item) => item.id === variantId) ?? homeVariants[0]!;
  const device = devices[deviceIndex] ?? devices[2];
  const scale = Math.min(1, (viewportWidth - 36) / (device.width + 20));

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>
          {fontError ? "Gaegu 폰트를 읽지 못했습니다." : "폰트를 불러오는 중…"}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
      <View style={styles.intro}>
        <Text style={styles.kicker}>MOMENTORY · EXPO WEB DESIGN LAB</Text>
        <Text style={styles.title}>Claude Design 홈 · v2</Text>
        <Text style={styles.description}>
          원본 5a–5f 상태를 하나의 React Native 화면과 Lab Mock 데이터로 미리봅니다. 운영 앱에는
          아직 연결하지 않았습니다.
        </Text>
      </View>
      <View style={styles.controls}>
        {homeVariants.length > 1 ? (
          <>
            <Text style={styles.controlLabel}>디자인 시안</Text>
            <View style={styles.chips}>
              {homeVariants.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.id === variant.id }}
                  onPress={() => setVariantId(item.id)}
                  style={[styles.chip, item.id === variant.id && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, item.id === variant.id && styles.chipTextSelected]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Text style={styles.controlLabel}>일정·감정 상태</Text>
        <View style={styles.chips}>
          {claudeHomeScenarios.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === scenario.id }}
              onPress={() => {
                setScenarioId(item.id);
                setMessage(`${item.id} · ${item.label}`);
              }}
              style={[styles.chip, item.id === scenario.id && styles.chipSelected]}
            >
              <Text style={[styles.chipText, item.id === scenario.id && styles.chipTextSelected]}>
                {item.id} · {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.controlLabel}>화면 크기</Text>
        <View style={styles.chips}>
          {devices.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: deviceIndex === index }}
              onPress={() => setDeviceIndex(index)}
              style={[styles.chip, deviceIndex === index && styles.chipSelected]}
            >
              <Text style={[styles.chipText, deviceIndex === index && styles.chipTextSelected]}>
                {item.label} · {item.width}×{item.height}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      </View>
      <View
        style={[
          styles.deviceSlot,
          { width: (device.width + 20) * scale, height: (device.height + 20) * scale },
        ]}
      >
        <View style={{ transform: [{ scale }], transformOrigin: "top left" }}>
          <DeviceFrame
            scenario={scenario}
            variant={variant}
            device={device}
            onMessage={setMessage}
          />
        </View>
      </View>
      <Text style={styles.caption}>
        Claude Design 원본: 402×874 · 폰트 Gaegu · 이미지 원본 복사본 사용
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.paper },
  pageInner: {
    minHeight: "100%",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 64,
    gap: 20,
  },
  intro: { width: "100%", maxWidth: 940, gap: 4 },
  kicker: { color: c.green, fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: c.ink, fontFamily: font.bold, fontSize: 36, lineHeight: 42 },
  description: { color: c.muted, fontSize: 14, lineHeight: 22 },
  controls: { width: "100%", maxWidth: 940, gap: 10 },
  controlLabel: { color: c.ink, fontSize: 13, fontWeight: "700", marginTop: 4 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.taskBorder,
    backgroundColor: c.card,
  },
  chipSelected: { backgroundColor: c.green, borderColor: c.green },
  chipText: { color: c.ink, fontSize: 12, fontWeight: "600" },
  chipTextSelected: { color: c.white },
  message: { color: c.muted, fontSize: 12, minHeight: 18 },
  deviceSlot: { alignSelf: "center" },
  device: {
    borderRadius: 44,
    borderWidth: 10,
    borderColor: c.bezel,
    overflow: "hidden",
    backgroundColor: c.paper,
    shadowColor: c.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 8,
  },
  statusBar: {
    height: 62,
    paddingLeft: 35,
    paddingRight: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: c.paper,
  },
  statusTime: { color: c.statusInk, fontSize: 16, fontWeight: "700" },
  caption: { color: c.muted, fontSize: 12, textAlign: "center" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.paper },
  loadingText: { color: c.ink, fontSize: 16 },
});
