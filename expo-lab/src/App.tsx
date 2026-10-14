import { Gaegu_400Regular, Gaegu_700Bold, useFonts } from "@expo-google-fonts/gaegu";
import { useEffect, useRef, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { claudeHomeColor as c, claudeHomeFont as font } from "./claude-home/tokens";
import { CapturePhone, devices, VariantPhone } from "./catalog/PhonePreview";
import type { CaptureId } from "./catalog/captures";
import {
  findScreen,
  screenCount,
  screenGroups,
  screens,
  type CatalogScreen,
} from "./catalog/screens";
import { variantsFor } from "./catalog/variants";

type LabRoute = {
  page: "atlas" | "compare";
  groupId: string;
  screenId: CaptureId;
  variantId: string;
  scenarioId: string;
  deviceWidth: number;
};

function readRoute(): LabRoute {
  const fallback: LabRoute = {
    page: "atlas",
    groupId: "",
    screenId: "home-main",
    variantId: "claude-v2",
    scenarioId: "5d",
    deviceWidth: 390,
  };
  if (Platform.OS !== "web") return fallback;
  const [path = "", query = ""] = window.location.hash.slice(1).split("?");
  const parts = path.split("/");
  const search = new URLSearchParams(query || window.location.search);
  const screen =
    findScreen(parts[1] ?? "") ?? screens.find((item) => item.id === fallback.screenId)!;
  const variants = variantsFor(screen.id);
  const variant = variants.find((item) => item.id === parts[2]) ?? variants[0];
  const scenarioId =
    variant?.scenarios.find((item) => item.id === search.get("scenario"))?.id ??
    variant?.scenarios[0]?.id ??
    "5d";
  const requestedWidth = Number(search.get("device"));
  const deviceWidth = devices.find((item) => item.width === requestedWidth)?.width ?? 390;
  return {
    page:
      parts[0] === "compare" || parts[0] === "preview" || (!path && !!window.location.search)
        ? "compare"
        : "atlas",
    groupId:
      parts[0] === "atlas" && screenGroups.some((item) => item.id === parts[1])
        ? (parts[1] ?? "")
        : "",
    screenId: screen.id,
    variantId: variant?.id ?? "",
    scenarioId,
    deviceWidth,
  };
}

function routeHash(route: LabRoute): string {
  const path =
    route.page === "atlas"
      ? `atlas${route.groupId ? `/${route.groupId}` : ""}`
      : `compare/${route.screenId}${route.variantId ? `/${route.variantId}` : ""}`;
  const params = new URLSearchParams();
  params.set("device", String(route.deviceWidth));
  if (route.page === "compare" && route.variantId) params.set("scenario", route.scenarioId);
  return `#${path}?${params.toString()}`;
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
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function CaptureBadge({ screen }: { screen: CatalogScreen }) {
  return (
    <Text style={styles.badge}>
      {screen.fixture ? "실제 앱 캡처 · 예시 데이터" : "실제 앱 캡처"}
    </Text>
  );
}

function Atlas({
  deviceWidth,
  onOpen,
  onDeviceWidth,
  onJump,
  onGroupLayout,
}: {
  deviceWidth: number;
  onOpen: (screenId: CaptureId) => void;
  onDeviceWidth: (width: number) => void;
  onJump: (groupId: string) => void;
  onGroupLayout: (groupId: string, y: number) => void;
}) {
  const device = devices.find((item) => item.width === deviceWidth) ?? devices[1];
  return (
    <View style={styles.section}>
      <Text style={styles.sectionKicker}>APP SCREEN ATLAS</Text>
      <Text style={styles.sectionTitle}>기존 앱 · 전체 화면</Text>
      <Text style={styles.description}>
        iPhone 13 mini 시뮬레이터에서 캡처한 {screenCount}개 화면을 펼쳐 봅니다. 카드를 누르면 기존
        화면과 등록된 시안을 비교할 수 있습니다.
      </Text>
      <Text style={styles.controlLabel}>스마트폰 종류</Text>
      <View style={styles.chipRow}>
        {devices.map((item) => (
          <Choice
            key={item.width}
            label={`${item.label} · ${item.width}×${item.height}`}
            selected={item.width === device.width}
            onPress={() => onDeviceWidth(item.width)}
          />
        ))}
      </View>
      <View style={styles.groupJump}>
        {screenGroups.map((group) => (
          <Choice
            key={group.id}
            label={`${group.title} ${group.screens.length}`}
            selected={false}
            onPress={() => onJump(group.id)}
          />
        ))}
      </View>
      {screenGroups.map((group) => (
        <View
          key={group.id}
          style={styles.group}
          onLayout={(event) => onGroupLayout(group.id, event.nativeEvent.layout.y)}
        >
          <View style={styles.groupHeading}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.meta}>{group.screens.length}개 화면</Text>
          </View>
          <View style={styles.atlasGrid}>
            {group.screens.map((screen) => (
              <Pressable
                key={screen.id}
                accessibilityRole="button"
                accessibilityLabel={`${screen.title} 화면 크게 보기`}
                onPress={() => onOpen(screen.id)}
                style={styles.atlasCard}
              >
                <Text style={styles.routeText}>{screen.route}</Text>
                <Text style={styles.cardTitle}>{screen.title}</Text>
                <CaptureBadge screen={screen} />
                <View style={styles.atlasPhone}>
                  <CapturePhone screen={screen} device={device} scale={0.65} />
                </View>
                <Text style={styles.openText}>크게 보기 · 시안 비교 ↗</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function Compare({
  route,
  viewportWidth,
  onNavigate,
  onMessage,
}: {
  route: LabRoute;
  viewportWidth: number;
  onNavigate: (change: Partial<LabRoute>) => void;
  onMessage: (message: string) => void;
}) {
  const screen = findScreen(route.screenId) ?? screens[0]!;
  const group = screenGroups.find((item) => item.screens.some((entry) => entry.id === screen.id))!;
  const variants = variantsFor(screen.id);
  const variant = variants.find((item) => item.id === route.variantId) ?? variants[0];
  const device = devices.find((item) => item.width === route.deviceWidth) ?? devices[1];
  const sideBySide = viewportWidth >= 960;
  const scale = sideBySide ? 1 : Math.min(1, (viewportWidth - 64) / (device.width + 20));

  return (
    <View style={styles.section}>
      <Text style={styles.sectionKicker}>SCREEN COMPARISON</Text>
      <Text style={styles.sectionTitle}>{screen.title} · 기존 화면과 시안</Text>
      <Text style={styles.description}>
        왼쪽은 기존 앱의 정지 캡처, 오른쪽은 Lab의 React Native 시안입니다. 시안의 동작은 Mock만
        사용합니다.
      </Text>
      <View style={styles.controls}>
        <Text style={styles.controlLabel}>화면 그룹</Text>
        <View style={styles.chipRow}>
          {screenGroups.map((item) => (
            <Choice
              key={item.id}
              label={item.title}
              selected={item.id === group.id}
              onPress={() => onNavigate({ screenId: item.screens[0]!.id })}
            />
          ))}
        </View>
        <Text style={styles.controlLabel}>화면 선택</Text>
        <View style={styles.chipRow}>
          {group.screens.map((item) => (
            <Choice
              key={item.id}
              label={item.title}
              selected={item.id === screen.id}
              onPress={() => onNavigate({ screenId: item.id })}
            />
          ))}
        </View>
        <Text style={styles.controlLabel}>화면 크기</Text>
        <View style={styles.chipRow}>
          {devices.map((item) => (
            <Choice
              key={item.width}
              label={`${item.label} · ${item.width}×${item.height}`}
              selected={item.width === device.width}
              onPress={() => onNavigate({ deviceWidth: item.width })}
            />
          ))}
        </View>
        {variants.length > 0 ? (
          <>
            <Text style={styles.controlLabel}>이 화면의 시안</Text>
            <View style={styles.chipRow}>
              {variants.map((item) => (
                <Choice
                  key={item.id}
                  label={item.label}
                  selected={item.id === variant?.id}
                  onPress={() => onNavigate({ variantId: item.id })}
                />
              ))}
            </View>
            {variant && variant.scenarios.length > 0 ? (
              <>
                <Text style={styles.controlLabel}>시안 상태</Text>
                <View style={styles.chipRow}>
                  {variant.scenarios.map((item) => (
                    <Choice
                      key={item.id}
                      label={`${item.id} · ${item.label}`}
                      selected={item.id === route.scenarioId}
                      onPress={() => onNavigate({ scenarioId: item.id })}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}
      </View>
      <View style={[styles.compareGrid, !sideBySide && styles.compareStack]}>
        <View style={[styles.comparePanel, sideBySide && styles.comparePanelWide]}>
          <Text style={styles.panelEyebrow}>CURRENT APP</Text>
          <Text style={styles.panelTitle}>기존 앱 화면</Text>
          <Text style={styles.routeText}>{screen.route}</Text>
          <CaptureBadge screen={screen} />
          <View style={styles.phoneSpace}>
            <CapturePhone screen={screen} device={device} scale={scale} />
          </View>
          <Text style={styles.panelNote}>
            375×812pt 실기 캡처를 선택한 화면 크기에 맞춰 표시합니다. 실제 앱 동작은 포함되지
            않습니다.
          </Text>
        </View>
        <View style={[styles.comparePanel, sideBySide && styles.comparePanelWide]}>
          <Text style={styles.panelEyebrow}>DESIGN VARIANT</Text>
          <Text style={styles.panelTitle}>{variant?.label ?? "등록된 시안 없음"}</Text>
          <Text style={styles.panelNote}>
            {variant
              ? "React Native 공유 UI · Lab Mock 데이터 · 운영 앱 미적용"
              : "이 화면의 새 시안은 아직 없습니다. 시안이 등록되면 기존 캡처와 나란히 비교합니다."}
          </Text>
          {variant ? (
            <View style={styles.phoneSpace}>
              <VariantPhone
                key={`${screen.id}-${variant.id}-${route.scenarioId}`}
                variant={variant}
                scenarioId={route.scenarioId}
                device={device}
                scale={scale}
                onMessage={onMessage}
              />
            </View>
          ) : (
            <View style={[styles.emptyVariant, { height: (device.height + 20) * scale }]}>
              <Text style={styles.emptyVariantText}>시안 등록 대기 중</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function LabApp() {
  const [fontsLoaded, fontError] = useFonts({ Gaegu_400Regular, Gaegu_700Bold });
  const [route, setRoute] = useState(readRoute);
  const [message, setMessage] = useState("시안의 일정 체크와 날씨 스티커를 눌러 볼 수 있어요.");
  const { width: viewportWidth } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const atlasTop = useRef(0);
  const groupOffsets = useRef<Record<string, number>>({});

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    if (route.page !== "atlas" || !route.groupId) return;
    const offset = groupOffsets.current[route.groupId];
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ y: atlasTop.current + offset, animated: true });
    }
  }, [route.page, route.groupId]);

  const navigate = (change: Partial<LabRoute>) => {
    const next = { ...route, ...change };
    if (change.screenId && change.screenId !== route.screenId) {
      const variant = variantsFor(change.screenId)[0];
      next.variantId = variant?.id ?? "";
      next.scenarioId = variant?.scenarios[0]?.id ?? "5d";
    }
    if (change.variantId) {
      const variant = variantsFor(next.screenId).find((item) => item.id === change.variantId);
      if (variant && !variant.scenarios.some((item) => item.id === next.scenarioId)) {
        next.scenarioId = variant.scenarios[0]?.id ?? "5d";
      }
    }
    if (Platform.OS !== "web") {
      setRoute(next);
    } else {
      const hash = routeHash(next);
      if (window.location.hash === hash) setRoute(next);
      else window.location.hash = hash;
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <Text style={styles.meta}>
          {fontError ? "Gaegu 폰트를 읽지 못했습니다." : "폰트를 불러오는 중…"}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView ref={scrollRef} style={styles.page} contentContainerStyle={styles.pageInner}>
        <View style={styles.header}>
          <Text style={styles.kicker}>MOMENTORY · EXPO DESIGN LAB</Text>
          <Text style={styles.title}>Design Lab</Text>
          <Text style={styles.description}>
            기존 앱 38개 화면과 React Native 시안을 한곳에서 탐색합니다. 운영 앱과 API에는 연결되지
            않습니다.
          </Text>
          <View style={styles.navigation}>
            <Choice
              label="기존 앱 · 전체 화면"
              selected={route.page === "atlas"}
              onPress={() => navigate({ page: "atlas", groupId: "" })}
            />
            <Choice
              label="화면 선택 · 시안 비교"
              selected={route.page === "compare"}
              onPress={() => navigate({ page: "compare" })}
            />
          </View>
        </View>
        {route.page === "atlas" ? (
          <View
            style={styles.section}
            onLayout={(event) => {
              atlasTop.current = event.nativeEvent.layout.y;
            }}
          >
            <Atlas
              deviceWidth={route.deviceWidth}
              onDeviceWidth={(deviceWidth) => navigate({ deviceWidth })}
              onJump={(groupId) => navigate({ groupId })}
              onGroupLayout={(groupId, y) => {
                groupOffsets.current[groupId] = y;
                if (route.groupId === groupId) {
                  scrollRef.current?.scrollTo({ y: atlasTop.current + y, animated: false });
                }
              }}
              onOpen={(screenId) => navigate({ page: "compare", screenId })}
            />
          </View>
        ) : (
          <Compare
            route={route}
            viewportWidth={viewportWidth}
            onNavigate={navigate}
            onMessage={setMessage}
          />
        )}
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function App() {
  return (
    <SafeAreaProvider>
      <LabApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: c.paper },
  page: { flex: 1, backgroundColor: c.paper },
  pageInner: { alignItems: "center", paddingHorizontal: 18, paddingTop: 28, paddingBottom: 64 },
  header: { width: "100%", maxWidth: 1200, gap: 5, marginBottom: 28 },
  kicker: { color: c.green, fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: c.ink, fontFamily: font.bold, fontSize: 40, lineHeight: 48 },
  description: { color: c.muted, fontSize: 14, lineHeight: 22 },
  navigation: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  section: { width: "100%", maxWidth: 1200, gap: 8 },
  sectionKicker: { color: c.green, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  sectionTitle: { color: c.ink, fontFamily: font.bold, fontSize: 30, lineHeight: 38 },
  groupJump: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  group: { marginTop: 28, gap: 14 },
  groupHeading: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  groupTitle: { color: c.ink, fontFamily: font.bold, fontSize: 25, lineHeight: 32 },
  meta: { color: c.muted, fontSize: 13 },
  atlasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  atlasCard: {
    width: 320,
    backgroundColor: c.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: c.emptyBorder,
    gap: 5,
  },
  routeText: { color: c.muted, fontSize: 11 },
  cardTitle: { color: c.ink, fontFamily: font.bold, fontSize: 23, lineHeight: 27 },
  badge: { alignSelf: "flex-start", color: c.green, fontSize: 11, fontWeight: "700" },
  atlasPhone: { marginVertical: 8 },
  openText: { alignSelf: "center", color: c.green, fontSize: 12, fontWeight: "700" },
  controls: { gap: 10, marginTop: 12, marginBottom: 16 },
  controlLabel: { color: c.ink, fontSize: 13, fontWeight: "700", marginTop: 5 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: c.taskBorder,
    backgroundColor: c.card,
  },
  choiceSelected: { backgroundColor: c.green, borderColor: c.green, borderWidth: 2 },
  choiceText: { color: c.ink, fontSize: 12, fontWeight: "600" },
  choiceTextSelected: { color: c.white, fontWeight: "700" },
  compareGrid: { flexDirection: "row", gap: 18, alignItems: "flex-start" },
  compareStack: { flexDirection: "column" },
  comparePanel: {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.emptyBorder,
    gap: 4,
  },
  comparePanelWide: { width: "49%" },
  panelEyebrow: { color: c.green, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  panelTitle: { color: c.ink, fontFamily: font.bold, fontSize: 25, lineHeight: 30 },
  panelNote: { color: c.muted, fontSize: 12, lineHeight: 18 },
  phoneSpace: { marginTop: 10, marginBottom: 10 },
  emptyVariant: {
    alignSelf: "center",
    width: "90%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: c.emptyBorder,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  emptyVariantText: { color: c.muted, fontFamily: font.bold, fontSize: 21 },
  message: { color: c.muted, fontSize: 12, marginTop: 22, textAlign: "center" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.paper },
});
