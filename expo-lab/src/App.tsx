import { useFonts } from "expo-font";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { claudeHomeColor as c, claudeHomeFont as font } from "./claude-home/tokens";
import {
  inboxScenarios,
  weatherScenarios,
  type InboxScenarioId,
  type WeatherScenarioId,
} from "./claude-home/validationScenarios";
import { CapturePhone, CurrentHomePhone, devices, VariantPhone } from "./catalog/PhonePreview";
import type { CaptureId } from "./catalog/captures";
import {
  findScreen,
  screenCount,
  screenGroups,
  screens,
  type CatalogScreen,
  type ScreenGroup,
} from "./catalog/screens";
import { variantsFor } from "./catalog/variants";

type LabRoute = {
  page: "atlas" | "compare";
  groupId: string;
  screenId: CaptureId;
  variantId: string;
  scenarioId: string;
  weatherId: WeatherScenarioId;
  inboxId: InboxScenarioId;
  fontScale: 1 | 1.3 | 1.5;
  deviceWidth: number;
};

type AtlasRow =
  | { id: string; kind: "heading"; group: ScreenGroup; length: number }
  | { id: string; kind: "cards"; screens: readonly CatalogScreen[]; length: number };

const ATLAS_CARD_WIDTH = 320;
const ATLAS_GAP = 16;
const ATLAS_HEADING_HEIGHT = 74;

function atlasRows(deviceHeight: number, columns: number): AtlasRow[] {
  const cardHeight = Math.ceil(132 + (deviceHeight + 14) * 0.65);
  return screenGroups.flatMap((group) => {
    const rows: AtlasRow[] = [
      { id: `heading-${group.id}`, kind: "heading", group, length: ATLAS_HEADING_HEIGHT },
    ];
    for (let index = 0; index < group.screens.length; index += columns) {
      const last = index + columns >= group.screens.length;
      rows.push({
        id: `cards-${group.id}-${index}`,
        kind: "cards",
        screens: group.screens.slice(index, index + columns),
        length: cardHeight + (last ? 0 : ATLAS_GAP),
      });
    }
    return rows;
  });
}

function readRoute(): LabRoute {
  const fallback: LabRoute = {
    page: "compare",
    groupId: "",
    screenId: "home-main",
    variantId: "claude-v2",
    scenarioId: "5d",
    weatherId: "none",
    inboxId: "empty",
    fontScale: 1,
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
  const weatherId =
    weatherScenarios.find((item) => item.id === search.get("weather"))?.id ?? fallback.weatherId;
  const inboxId =
    inboxScenarios.find((item) => item.id === search.get("inbox"))?.id ?? fallback.inboxId;
  const type = search.get("type");
  const fontScale = type === "1.5" ? 1.5 : type === "large" ? 1.3 : 1;
  return {
    page: parts[0] === "atlas" ? "atlas" : "compare",
    groupId:
      parts[0] === "atlas" && screenGroups.some((item) => item.id === parts[1])
        ? (parts[1] ?? "")
        : "",
    screenId: screen.id,
    variantId: variant?.id ?? "",
    scenarioId,
    weatherId,
    inboxId,
    fontScale,
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
  if (
    route.page === "compare" &&
    ["app-v2", "app-rest", "app-archive", "app-my", "app-report"].includes(route.variantId)
  ) {
    if (route.variantId === "app-v2") {
      params.set("weather", route.weatherId);
      params.set("inbox", route.inboxId);
    }
    params.set(
      "type",
      route.fontScale === 1.5 ? "1.5" : route.fontScale === 1.3 ? "large" : "normal",
    );
  }
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

function AtlasHeader({
  deviceWidth,
  onDeviceWidth,
  onJump,
}: {
  deviceWidth: number;
  onDeviceWidth: (width: number) => void;
  onJump: (groupId: string) => void;
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
    </View>
  );
}

function AtlasRowView({
  row,
  deviceWidth,
  contentWidth,
  onOpen,
}: {
  row: AtlasRow;
  deviceWidth: number;
  contentWidth: number;
  onOpen: (screenId: CaptureId) => void;
}) {
  if (row.kind === "heading") {
    return (
      <View style={[styles.atlasHeadingRow, { width: contentWidth, height: row.length }]}>
        <View style={styles.groupHeading}>
          <Text style={styles.groupTitle}>{row.group.title}</Text>
          <Text style={styles.meta}>{row.group.screens.length}개 화면</Text>
        </View>
      </View>
    );
  }
  const device = devices.find((item) => item.width === deviceWidth) ?? devices[1];
  const cardHeight = Math.ceil(132 + (device.height + 14) * 0.65);
  return (
    <View style={[styles.atlasGrid, { width: contentWidth, height: row.length }]}>
      {row.screens.map((screen) => (
        <Pressable
          key={screen.id}
          accessibilityRole="button"
          accessibilityLabel={`${screen.title} 화면 크게 보기`}
          onPress={() => onOpen(screen.id)}
          style={[styles.atlasCard, { height: cardHeight }]}
        >
          <Text style={styles.routeText}>{screen.route}</Text>
          <Text style={styles.cardTitle}>{screen.title}</Text>
          <CaptureBadge screen={screen} />
          <View style={styles.atlasPhone}>
            <CapturePhone screen={screen} device={device} scale={0.65} thumbnail />
          </View>
          <Text style={styles.openText}>크게 보기 · 시안 비교 ↗</Text>
        </Pressable>
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
  const [showHomeCapture, setShowHomeCapture] = useState(false);
  const screen = findScreen(route.screenId) ?? screens[0]!;
  const group = screenGroups.find((item) => item.screens.some((entry) => entry.id === screen.id))!;
  const variants = variantsFor(screen.id);
  const variant = variants.find((item) => item.id === route.variantId) ?? variants[0];
  const device = devices.find((item) => item.width === route.deviceWidth) ?? devices[1];
  const sideBySide = viewportWidth >= 960;
  const scale = sideBySide ? 1 : Math.min(1, (viewportWidth - 64) / (device.width + 20));
  const liveHome = screen.id === "home-main" && !showHomeCapture;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionKicker}>SCREEN COMPARISON</Text>
      <Text style={styles.sectionTitle}>{screen.title} · 기존 화면과 시안</Text>
      <Text style={styles.description}>
        홈·쉼터·보관함·마이·리포트는 운영 앱과 공유하는 React Native UI를 Lab Mock으로 조작할 수
        있습니다. 다른 화면의 기존 캡처는 이전 참고 자료이며 모든 동작은 Lab Mock입니다.
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
            {variant?.id === "app-v2" ||
            variant?.id === "app-rest" ||
            variant?.id === "app-archive" ||
            variant?.id === "app-my" ||
            variant?.id === "app-report" ? (
              <>
                {variant?.id === "app-v2" ? (
                  <>
                    <Text style={styles.controlLabel}>운영 홈 날씨 Mock</Text>
                    <View style={styles.chipRow}>
                      {weatherScenarios.map((item) => (
                        <Choice
                          key={item.id}
                          label={item.label}
                          selected={item.id === route.weatherId}
                          onPress={() => onNavigate({ weatherId: item.id })}
                        />
                      ))}
                    </View>
                    <Text style={styles.controlLabel}>운영 홈 알림 Mock</Text>
                    <View style={styles.chipRow}>
                      {inboxScenarios.map((item) => (
                        <Choice
                          key={item.id}
                          label={item.label}
                          selected={item.id === route.inboxId}
                          onPress={() => onNavigate({ inboxId: item.id })}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
                <Text style={styles.controlLabel}>글씨 크기 · Web 모의</Text>
                <View style={styles.chipRow}>
                  <Choice
                    label="기본 1.0배"
                    selected={route.fontScale === 1}
                    onPress={() => onNavigate({ fontScale: 1 })}
                  />
                  <Choice
                    label="큰 글씨 1.3배"
                    selected={route.fontScale === 1.3}
                    onPress={() => onNavigate({ fontScale: 1.3 })}
                  />
                  <Choice
                    label="큰 글씨 1.5배 · XXXL 대비"
                    selected={route.fontScale === 1.5}
                    onPress={() => onNavigate({ fontScale: 1.5 })}
                  />
                </View>
                <Text style={styles.meta}>
                  1.5배는 운영 앱의 글씨 배율 상한을 넘겨 배치를 점검하는 Web 모의입니다. 실제 OS
                  변경과 앱 재시작은 네이티브에서 별도 확인해야 합니다.
                </Text>
                {variant?.id === "app-v2" ? (
                  <Text style={styles.meta}>
                    날씨 조회 중·실패·미매핑은 운영 정책대로 스티커를 숨깁니다. 알림과 일정 조작은
                    Lab 메모리에서만 바뀝니다.
                  </Text>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </View>
      <View style={[styles.compareGrid, !sideBySide && styles.compareStack]}>
        <View style={[styles.comparePanel, sideBySide && styles.comparePanelWide]}>
          <Text style={styles.panelEyebrow}>CURRENT APP</Text>
          <Text style={styles.panelTitle}>
            {liveHome ? "기존 홈 · 실제 UI" : "기존 앱 화면 · 캡처"}
          </Text>
          <Text style={styles.routeText}>{screen.route}</Text>
          {screen.id === "home-main" ? (
            <View style={styles.chipRow}>
              <Choice
                label="실제 UI"
                selected={!showHomeCapture}
                onPress={() => setShowHomeCapture(false)}
              />
              <Choice
                label="원본 캡처 참고"
                selected={showHomeCapture}
                onPress={() => setShowHomeCapture(true)}
              />
            </View>
          ) : (
            <CaptureBadge screen={screen} />
          )}
          <View style={styles.phoneSpace}>
            {liveHome ? (
              <CurrentHomePhone
                key={`${screen.id}-${route.scenarioId}`}
                scenarioId={route.scenarioId}
                device={device}
                scale={scale}
                onMessage={onMessage}
              />
            ) : (
              <CapturePhone screen={screen} device={device} scale={scale} />
            )}
          </View>
          <Text style={styles.panelNote}>
            {liveHome
              ? "앱의 홈 UI 컴포넌트·토큰을 사용합니다. 일정과 모든 이동은 Lab 메모리 안에서만 동작합니다."
              : "375×812pt 실기 캡처를 선택한 크기에 맞춰 표시합니다. 캡처에는 동작이 없습니다."}
          </Text>
        </View>
        <View style={[styles.comparePanel, sideBySide && styles.comparePanelWide]}>
          <Text style={styles.panelEyebrow}>DESIGN VARIANT</Text>
          <Text style={styles.panelTitle}>{variant?.label ?? "등록된 시안 없음"}</Text>
          <Text style={styles.panelNote}>
            {variant
              ? ["app-v2", "app-rest", "app-archive", "app-my", "app-report"].includes(variant.id)
                ? "운영 앱과 같은 React Native UI · Lab Mock 데이터 · API 미연결"
                : "React Native 시안 UI · Lab Mock 데이터 · 운영 앱 미적용"
              : "이 화면의 새 시안은 아직 없습니다. 시안이 등록되면 기존 캡처와 나란히 비교합니다."}
          </Text>
          {variant ? (
            <View style={styles.phoneSpace}>
              <VariantPhone
                key={`${screen.id}-${variant.id}-${route.scenarioId}-${route.inboxId}`}
                variant={variant}
                scenarioId={route.scenarioId}
                weatherId={route.weatherId}
                inboxId={route.inboxId}
                fontScale={route.fontScale}
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

function LabHeader({
  page,
  onAtlas,
  onCompare,
}: {
  page: LabRoute["page"];
  onAtlas: () => void;
  onCompare: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.kicker}>MOMENTORY · EXPO DESIGN LAB</Text>
      <Text style={styles.title}>Design Lab</Text>
      <Text style={styles.description}>
        홈·쉼터·보관함·마이·리포트의 실제 React Native UI를 비교·조작합니다. 38개 기존 화면 캡처는
        이전 참고 자료로 보존합니다. 운영 앱과 API에는 연결되지 않습니다.
      </Text>
      <View style={styles.navigation}>
        <Choice label="화면 선택 · 시안 비교" selected={page === "compare"} onPress={onCompare} />
        <Choice label="기존 앱 · 전체 화면" selected={page === "atlas"} onPress={onAtlas} />
      </View>
    </View>
  );
}

function LabApp() {
  // 앱과 같은 파일 · 같은 이름(assets/fonts/README.md 「Gaegu」 · 결정 DN-4) — 시안 원본 변형도 이 이름을 쓴다
  const [fontsLoaded, fontError] = useFonts({
    "Gaegu-Regular": require("../../assets/fonts/Gaegu-Regular.ttf"),
    "Gaegu-Bold": require("../../assets/fonts/Gaegu-Bold.ttf"),
    KyoboHandwriting2025lyb: require("../../assets/fonts/KyoboHandwriting2025lyb.ttf"),
  });
  const [route, setRoute] = useState(readRoute);
  const [message, setMessage] = useState(
    "공유 UI에서 카드와 버튼을 눌러 Lab Mock 동작을 비교할 수 있어요.",
  );
  const { width: viewportWidth } = useWindowDimensions();
  const atlasListRef = useRef<FlatList<AtlasRow>>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const device = devices.find((item) => item.width === route.deviceWidth) ?? devices[1];
  const contentWidth = Math.min(Math.max(viewportWidth - 36, ATLAS_CARD_WIDTH), 1200);
  const columns = Math.max(
    1,
    Math.floor((contentWidth + ATLAS_GAP) / (ATLAS_CARD_WIDTH + ATLAS_GAP)),
  );
  const rows = useMemo(() => atlasRows(device.height, columns), [device.height, columns]);
  const rowOffsets = useMemo(
    () => rows.map((_, index) => rows.slice(0, index).reduce((sum, row) => sum + row.length, 0)),
    [rows],
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    if (route.page !== "atlas" || !route.groupId || !headerHeight) return;
    const index = rows.findIndex((row) => row.kind === "heading" && row.group.id === route.groupId);
    if (index < 0) return;
    const offset = 28 + headerHeight + rowOffsets[index]!;
    const frame = requestAnimationFrame(() =>
      atlasListRef.current?.scrollToOffset({ offset, animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, [route.page, route.groupId, headerHeight, rows, rowOffsets]);

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
          {fontError ? "폰트를 읽지 못했습니다." : "폰트를 불러오는 중…"}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {route.page === "atlas" ? (
        <FlatList
          ref={atlasListRef}
          style={styles.page}
          contentContainerStyle={styles.pageInner}
          data={rows}
          keyExtractor={(row) => row.id}
          extraData={route}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          windowSize={5}
          getItemLayout={(_, index) => ({
            index,
            length: rows[index]!.length,
            offset: 28 + headerHeight + rowOffsets[index]!,
          })}
          ListHeaderComponent={
            <View
              style={[styles.listHeader, { width: contentWidth }]}
              onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
            >
              <LabHeader
                page="atlas"
                onAtlas={() => navigate({ page: "atlas", groupId: "" })}
                onCompare={() => navigate({ page: "compare" })}
              />
              <AtlasHeader
                deviceWidth={route.deviceWidth}
                onDeviceWidth={(deviceWidth) => navigate({ deviceWidth })}
                onJump={(groupId) => navigate({ groupId })}
              />
            </View>
          }
          renderItem={({ item }) => (
            <AtlasRowView
              row={item}
              deviceWidth={route.deviceWidth}
              contentWidth={contentWidth}
              onOpen={(screenId) => navigate({ page: "compare", screenId })}
            />
          )}
          ListFooterComponent={
            <Text accessibilityLiveRegion="polite" style={styles.message}>
              {message}
            </Text>
          }
        />
      ) : (
        <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
          <LabHeader
            page="compare"
            onAtlas={() => navigate({ page: "atlas", groupId: "" })}
            onCompare={() => navigate({ page: "compare" })}
          />
          <Compare
            route={route}
            viewportWidth={viewportWidth}
            onNavigate={navigate}
            onMessage={setMessage}
          />
          <Text accessibilityLiveRegion="polite" style={styles.message}>
            {message}
          </Text>
        </ScrollView>
      )}
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
  listHeader: { alignSelf: "center" },
  header: { width: "100%", maxWidth: 1200, gap: 5, marginBottom: 28 },
  kicker: { color: c.green, fontSize: 12, fontWeight: "700", letterSpacing: 1.5 },
  title: { color: c.ink, fontFamily: font.bold, fontSize: 40, lineHeight: 48 },
  description: { color: c.muted, fontSize: 14, lineHeight: 22 },
  navigation: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  section: { width: "100%", maxWidth: 1200, gap: 8 },
  sectionKicker: { color: c.green, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  sectionTitle: { color: c.ink, fontFamily: font.bold, fontSize: 30, lineHeight: 38 },
  groupJump: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  atlasHeadingRow: {
    alignSelf: "center",
    paddingTop: 28,
    paddingBottom: 14,
    justifyContent: "flex-end",
  },
  groupHeading: { flexDirection: "row", alignItems: "baseline", gap: 10 },
  groupTitle: { color: c.ink, fontFamily: font.bold, fontSize: 25, lineHeight: 32 },
  meta: { color: c.muted, fontSize: 13 },
  atlasGrid: { alignSelf: "center", flexDirection: "row", gap: 16 },
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
