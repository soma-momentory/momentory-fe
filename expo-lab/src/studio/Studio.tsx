import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import {
  approvedDesign,
  type StudioDesign,
  type StudioDesignKey,
} from "../../../src/design/studioDesign";
import {
  letterScenarios,
  weatherScenarios,
  type LetterScenarioId,
  type WeatherScenarioId,
} from "../claude-home/validationScenarios";
import { devices, VariantPhone } from "../catalog/PhonePreview";
import { variantsFor, type LabVariant } from "../catalog/variants";
import { claudeHomeColor as c } from "../claude-home/tokens";
import {
  designDiff,
  exportDraft,
  importDraft,
  initialDrafts,
  parseDrafts,
  STORAGE_KEY,
  type StudioDrafts,
} from "./model";
import { editableComponents, validValue, type EditableProperty } from "./registry";
import { LayerTree } from "./LayerTree";
import { AssetBrowser } from "./AssetBrowser";
import { useVisualSelection } from "./useVisualSelection";
import type { StudioAssetId } from "../../../src/design/studioAssets";
import { readSessionHistory, saveSessionHistory } from "./sessionHistory";

const studioScreens = [
  { id: "home-main", label: "홈", variant: "app-v2" },
  { id: "rest-hub", label: "쉼터", variant: "app-rest" },
  { id: "archive", label: "보관함", variant: "app-archive" },
  { id: "my-main", label: "마이", variant: "app-my" },
  { id: "report", label: "리포트", variant: "app-report" },
] as const;
type StudioScreenId = (typeof studioScreens)[number]["id"];
const noLayers: readonly (typeof editableComponents)[number][] = [];
const noSelect = () => undefined;

function Button({
  label,
  selected = false,
  disabled = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, selected && styles.buttonActive, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, selected && styles.buttonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function PropertyInput({
  property,
  value,
  onChange,
}: {
  property: EditableProperty;
  value: string | number;
  onChange: (key: StudioDesignKey, value: string | number) => void;
}) {
  const [input, setInput] = useState(String(value));
  const [previousValue, setPreviousValue] = useState(value);
  if (value !== previousValue) {
    setPreviousValue(value);
    setInput(String(value));
  }
  const update = (text: string) => {
    setInput(text);
    const candidate = property.kind === "number" ? Number(text) : text;
    if (text !== "" && validValue(property, candidate)) onChange(property.key, candidate);
  };
  if (property.kind === "asset") {
    return (
      <AssetBrowser
        value={value as StudioAssetId}
        onChange={(assetId) => onChange(property.key, assetId)}
      />
    );
  }
  if (property.kind === "choice") {
    return (
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{property.label}</Text>
        <View style={styles.row}>
          {property.options?.map((option) => (
            <Button
              key={option.value}
              label={option.label}
              selected={value === option.value}
              onPress={() => onChange(property.key, option.value)}
            />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{property.label}</Text>
      <View style={styles.fieldRow}>
        {property.kind === "color" ? (
          <View style={[styles.swatch, { backgroundColor: String(value) }]} />
        ) : null}
        <TextInput
          accessibilityLabel={property.label}
          value={input}
          onChangeText={update}
          onBlur={() => setInput(String(value))}
          selectTextOnFocus
          autoCapitalize="none"
          keyboardType={property.kind === "number" ? "decimal-pad" : "default"}
          style={styles.input}
        />
      </View>
      {property.kind === "number" ? (
        <Text style={styles.hint}>
          {property.min}–{property.max}
        </Text>
      ) : (
        <Text style={styles.hint}>#RRGGBB</Text>
      )}
    </View>
  );
}

const PreviewPanel = memo(function PreviewPanel({
  label,
  variant,
  scenarioId,
  weatherId,
  letterId,
  fontScale,
  device,
  zoom,
  design,
  resetKey,
  onMessage,
  layers,
  selectedId,
  onSelect,
  selectionMode,
}: {
  label: string;
  variant: LabVariant;
  scenarioId: string;
  weatherId: WeatherScenarioId;
  letterId: LetterScenarioId;
  fontScale: 1 | 1.3 | 1.5;
  device: (typeof devices)[number];
  zoom: number;
  design: StudioDesign;
  resetKey: number;
  onMessage: (message: string) => void;
  layers: readonly (typeof editableComponents)[number][];
  selectedId: string;
  onSelect: (id: string) => void;
  selectionMode: boolean;
}) {
  const rootRef = useRef<View>(null);
  useVisualSelection({
    rootRef,
    enabled: label.startsWith("B") && selectionMode,
    layers,
    selectedId,
    onSelect,
    refresh: [design, scenarioId, resetKey],
  });
  const selectedLabel = layers.find((layer) => layer.id === selectedId)?.label;
  return (
    <View
      ref={rootRef}
      testID={label.startsWith("A") ? "studio-preview-A" : "studio-preview-B"}
      style={styles.previewPanel}
    >
      <Text style={styles.previewLabel}>{label}</Text>
      {label.startsWith("B") && selectionMode ? (
        <Text testID="studio-selection-label" style={styles.hint}>
          {selectedLabel ? `선택: ${selectedLabel}` : "화면에서 요소를 선택하세요"}
        </Text>
      ) : null}
      <VariantPhone
        key={`${variant.id}-${scenarioId}-${weatherId}-${letterId}-${resetKey}`}
        variant={variant}
        scenarioId={scenarioId}
        weatherId={weatherId}
        letterId={letterId}
        fontScale={fontScale}
        device={device}
        scale={zoom}
        design={design}
        onMessage={onMessage}
      />
    </View>
  );
});

function downloadJson(name: string, json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `momentory-${name.replace(/[^a-zA-Z0-9-]/g, "-")}-design.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Studio({ initialScreen = "home-main" }: { initialScreen?: string }) {
  const [screenId, setScreenId] = useState<StudioScreenId>(
    studioScreens.find((screen) => screen.id === initialScreen)?.id ?? "home-main",
  );
  const [scenarioId, setScenarioId] = useState("");
  const [weatherId, setWeatherId] = useState<WeatherScenarioId>("none");
  const [letterId, setLetterId] = useState<LetterScenarioId>("none");
  const [fontScale, setFontScale] = useState<1 | 1.3 | 1.5>(1);
  const [deviceWidth, setDeviceWidth] = useState(390);
  const [zoom, setZoom] = useState(0.85);
  const [selectedComponent, setSelectedComponent] = useState(
    editableComponents.find((item) => item.screenId === initialScreen && item.properties.length)
      ?.id ?? "home.hero",
  );
  const [selectionMode, setSelectionMode] = useState(true);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [screenQuery, setScreenQuery] = useState("");
  const [mockQuery, setMockQuery] = useState("");
  const [recentScreens, setRecentScreens] = useState<StudioScreenId[]>([]);
  const [layerQuery, setLayerQuery] = useState("");
  const [data, setData] = useState<StudioDrafts>(() => {
    if (Platform.OS !== "web") return initialDrafts();
    try {
      return parseDrafts(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"));
    } catch {
      return initialDrafts();
    }
  });
  const [nameInput, setNameInput] = useState("");
  const [undo, setUndo] = useState<StudioDesign[]>(() => readSessionHistory(data.active).undo);
  const [redo, setRedo] = useState<StudioDesign[]>(() => readSessionHistory(data.active).redo);
  const [aReset, setAReset] = useState(0);
  const [bReset, setBReset] = useState(0);
  const [message, setMessage] = useState(
    "편집값은 이 브라우저에 자동 저장됩니다. 운영 앱에는 자동 적용되지 않습니다.",
  );
  const { width } = useWindowDimensions();
  const screen = studioScreens.find((item) => item.id === screenId)!;
  const variant = variantsFor(screenId).find((item) => item.id === screen.variant)!;
  const scenario =
    variant.scenarios.find((item) => item.id === scenarioId) ?? variant.scenarios[0]!;
  const device = devices.find((item) => item.width === deviceWidth) ?? devices[1];
  const components = useMemo(
    () => editableComponents.filter((item) => item.screenId === screenId),
    [screenId],
  );
  const component = components.find((item) => item.id === selectedComponent);
  const design = data.drafts[data.active] ?? approvedDesign;
  const changes = useMemo(() => designDiff(design), [design]);
  const stacked = width < 1200;
  const onMessage = useCallback((text: string) => setMessage(text), []);
  const onSelect = useCallback((id: string) => setSelectedComponent(id), []);
  const selectScreen = useCallback((next: StudioScreenId) => {
    setScreenId(next);
    setScenarioId("");
    setSelectedComponent(
      editableComponents.find((layer) => layer.screenId === next && layer.properties.length)?.id ??
        "",
    );
    setRecentScreens((current) => [next, ...current.filter((id) => id !== next)].slice(0, 3));
    if (Platform.OS === "web") window.location.hash = `#studio/${next}`;
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      window.dispatchEvent(new Event("studio-draft-changed"));
    }
  }, [data]);

  useEffect(() => saveSessionHistory(data.active, undo, redo), [data.active, undo, redo]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const syncScreen = () => {
      const path = window.location.hash.slice(1).split("?")[0];
      const next = studioScreens.find((item) => `studio/${item.id}` === path)?.id;
      if (next && next !== screenId) {
        setScreenId(next);
        setScenarioId("");
        setSelectedComponent(
          editableComponents.find((layer) => layer.screenId === next && layer.properties.length)
            ?.id ?? "",
        );
        setRecentScreens((current) => [next, ...current.filter((id) => id !== next)].slice(0, 3));
      }
    };
    window.addEventListener("hashchange", syncScreen);
    return () => window.removeEventListener("hashchange", syncScreen);
  }, [screenId]);

  const update = (key: StudioDesignKey, value: string | number) => {
    if (design[key] === value) return;
    setUndo((history) => [...history.slice(-49), design]);
    setRedo([]);
    setData((current) => ({
      ...current,
      drafts: { ...current.drafts, [current.active]: { ...design, [key]: value } },
    }));
  };
  const replaceDesign = (next: StudioDesign) => {
    setUndo((history) => [...history.slice(-49), design]);
    setRedo([]);
    setData((current) => ({ ...current, drafts: { ...current.drafts, [current.active]: next } }));
  };
  const undoEdit = useCallback(() => {
    const previous = undo[undo.length - 1];
    if (!previous) return;
    setUndo((history) => history.slice(0, -1));
    setRedo((history) => [...history, design]);
    setData((current) => ({
      ...current,
      drafts: { ...current.drafts, [current.active]: previous },
    }));
  }, [undo, design]);
  const redoEdit = useCallback(() => {
    const next = redo[redo.length - 1];
    if (!next) return;
    setRedo((history) => history.slice(0, -1));
    setUndo((history) => [...history, design]);
    setData((current) => ({ ...current, drafts: { ...current.drafts, [current.active]: next } }));
  }, [redo, design]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      if (event.key === "Escape") setSelectedComponent("");
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === "z" && event.shiftKey && redo.length) {
        event.preventDefault();
        redoEdit();
      } else if (event.key.toLowerCase() === "z" && undo.length) {
        event.preventDefault();
        undoEdit();
      } else if (event.key.toLowerCase() === "y" && redo.length) {
        event.preventDefault();
        redoEdit();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, undoEdit, redoEdit]);
  const openImport = () => {
    if (Platform.OS !== "web") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = importDraft(await file.text());
        replaceDesign(imported.design);
        setMessage(`가져오기 완료: ${file.name}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
      }
    };
    input.click();
  };
  const createDraft = (fromApproved = false) => {
    const name = nameInput.trim();
    if (!name || name.length > 40 || data.drafts[name] || Object.keys(data.drafts).length >= 20) {
      setMessage("1–40자의 새 시안 이름을 입력하세요. 최대 20개입니다.");
      return;
    }
    setData((current) => ({
      active: name,
      drafts: { ...current.drafts, [name]: { ...(fromApproved ? approvedDesign : design) } },
    }));
    setUndo([]);
    setRedo([]);
    setNameInput("");
    setMessage(`${name} 시안을 저장했습니다.`);
  };
  const renameDraft = () => {
    const name = nameInput.trim();
    if (!name || name.length > 40 || (name !== data.active && data.drafts[name])) {
      setMessage("1–40자의 사용하지 않은 시안 이름을 입력하세요.");
      return;
    }
    if (name === data.active) return;
    setData((current) => {
      const drafts = { ...current.drafts };
      drafts[name] = drafts[current.active]!;
      delete drafts[current.active];
      return { active: name, drafts };
    });
    setNameInput("");
    setMessage(`${name}(으)로 시안 이름을 변경했습니다.`);
  };

  return (
    <View style={[styles.root, stacked && styles.rootStack]}>
      {leftOpen ? (
        <ScrollView
          testID="studio-sidebar"
          style={[styles.left, stacked && styles.sideStack]}
          contentContainerStyle={styles.sideContent}
        >
          <Text style={styles.kicker}>MOMENTORY</Text>
          <Text style={styles.title}>Design Studio</Text>
          <Text style={styles.hint}>실제 공유 RN View · Lab Mock</Text>
          <Text style={styles.heading}>화면</Text>
          <TextInput
            accessibilityLabel="화면 검색"
            placeholder="화면 검색"
            value={screenQuery}
            onChangeText={setScreenQuery}
            style={styles.input}
          />
          {recentScreens.length ? (
            <Text style={styles.hint}>
              최근 화면:{" "}
              {recentScreens
                .map((id) => studioScreens.find((item) => item.id === id)?.label)
                .join(" · ")}
            </Text>
          ) : null}
          {studioScreens
            .filter(
              (item) =>
                item.label.includes(screenQuery.trim()) ||
                item.id.includes(screenQuery.trim().toLowerCase()),
            )
            .map((item) => (
              <Button
                key={item.id}
                label={item.label}
                selected={screenId === item.id}
                onPress={() => selectScreen(item.id)}
              />
            ))}
          <Text style={styles.heading}>Mock 상태</Text>
          <TextInput
            accessibilityLabel="Mock 검색"
            placeholder="Mock 검색"
            value={mockQuery}
            onChangeText={setMockQuery}
            style={styles.input}
          />
          {variant.scenarios
            .filter(
              (item) =>
                item.label.includes(mockQuery.trim()) ||
                item.id.includes(mockQuery.trim().toLowerCase()),
            )
            .map((item) => (
              <Button
                key={item.id}
                label={item.label}
                selected={scenario.id === item.id}
                onPress={() => setScenarioId(item.id)}
              />
            ))}
          {screenId === "home-main" ? (
            <>
              <Text style={styles.heading}>날씨</Text>
              {weatherScenarios.map((item) => (
                <Button
                  key={item.id}
                  label={item.label}
                  selected={weatherId === item.id}
                  onPress={() => setWeatherId(item.id)}
                />
              ))}
              <Text style={styles.heading}>편지</Text>
              {letterScenarios.map((item) => (
                <Button
                  key={item.id}
                  label={item.label}
                  selected={letterId === item.id}
                  onPress={() => setLetterId(item.id)}
                />
              ))}
            </>
          ) : null}
          <Text style={styles.heading}>컴포넌트 레이어</Text>
          <TextInput
            accessibilityLabel="컴포넌트 검색"
            placeholder="레이어 검색"
            value={layerQuery}
            onChangeText={setLayerQuery}
            style={styles.input}
          />
          <LayerTree
            layers={components}
            selectedId={selectedComponent}
            query={layerQuery}
            onSelect={onSelect}
          />
          <Button label="선택 해제" onPress={() => setSelectedComponent("")} />
        </ScrollView>
      ) : null}
      <ScrollView
        testID="studio-canvas"
        style={stacked ? styles.centerStack : styles.center}
        contentContainerStyle={styles.centerContent}
      >
        <View style={styles.toolbar}>
          <View style={styles.row}>
            <Button
              label={leftOpen ? "왼쪽 패널 접기" : "왼쪽 패널 열기"}
              onPress={() => setLeftOpen((open) => !open)}
            />
            <Button
              label={rightOpen ? "오른쪽 패널 접기" : "오른쪽 패널 열기"}
              onPress={() => setRightOpen((open) => !open)}
            />
          </View>
          <Text style={styles.heading}>
            {screen.label} · {scenario.label}
          </Text>
          <View style={styles.row}>
            <Button
              label="선택 모드"
              selected={selectionMode}
              onPress={() => setSelectionMode(true)}
            />
            <Button
              label="기능 테스트 모드"
              selected={!selectionMode}
              onPress={() => setSelectionMode(false)}
            />
          </View>
          <View style={styles.row}>
            {devices.map((item) => (
              <Button
                key={item.width}
                label={`${item.width}pt`}
                selected={deviceWidth === item.width}
                onPress={() => setDeviceWidth(item.width)}
              />
            ))}
          </View>
          <View style={styles.row}>
            {[1, 1.3, 1.5].map((scale) => (
              <Button
                key={scale}
                label={`글씨 ${scale}×`}
                selected={fontScale === scale}
                onPress={() => setFontScale(scale as 1 | 1.3 | 1.5)}
              />
            ))}
            <Button
              label="−"
              disabled={zoom <= 0.5}
              onPress={() => setZoom((value) => Math.max(0.5, Math.round((value - 0.1) * 10) / 10))}
            />
            <Text style={styles.hint}>{Math.round(zoom * 100)}%</Text>
            <Button
              label="+"
              disabled={zoom >= 1.2}
              onPress={() => setZoom((value) => Math.min(1.2, Math.round((value + 0.1) * 10) / 10))}
            />
          </View>
        </View>
        <View style={[styles.compare, stacked && styles.compareStack]}>
          <View>
            <PreviewPanel
              label="A · 운영 기본 디자인"
              variant={variant}
              scenarioId={scenario.id}
              weatherId={weatherId}
              letterId={letterId}
              fontScale={fontScale}
              device={device}
              zoom={zoom}
              design={approvedDesign}
              resetKey={aReset}
              onMessage={onMessage}
              layers={noLayers}
              selectedId=""
              onSelect={noSelect}
              selectionMode={false}
            />
            <Button label="A 조작 초기화" onPress={() => setAReset((value) => value + 1)} />
          </View>
          <View>
            <PreviewPanel
              label="B · 편집 중인 시안"
              variant={variant}
              scenarioId={scenario.id}
              weatherId={weatherId}
              letterId={letterId}
              fontScale={fontScale}
              device={device}
              zoom={zoom}
              design={design}
              resetKey={bReset}
              onMessage={onMessage}
              layers={components}
              selectedId={selectedComponent}
              onSelect={onSelect}
              selectionMode={selectionMode}
            />
            <Button label="B 조작 초기화" onPress={() => setBReset((value) => value + 1)} />
          </View>
        </View>
        <Text accessibilityLiveRegion="polite" style={styles.message}>
          {message}
        </Text>
      </ScrollView>
      {rightOpen ? (
        <ScrollView
          testID="studio-properties"
          style={[styles.right, stacked && styles.sideStack]}
          contentContainerStyle={styles.sideContent}
        >
          <Text style={styles.heading}>속성 · {component?.label ?? "선택 없음"}</Text>
          {component && !component.properties.length ? (
            <Text style={styles.hint}>
              이 요소는 선택할 수 있지만 편집 속성이 아직 등록되지 않았습니다.
            </Text>
          ) : null}
          {component?.properties.map((property) => (
            <PropertyInput
              key={property.key}
              property={property}
              value={design[property.key]}
              onChange={update}
            />
          ))}
          <View style={styles.row}>
            <Button label="Undo" disabled={!undo.length} onPress={undoEdit} />
            <Button label="Redo" disabled={!redo.length} onPress={redoEdit} />
          </View>
          <Button
            label="B 디자인 초기화"
            disabled={!changes.length}
            onPress={() => replaceDesign({ ...approvedDesign })}
          />
          <Text style={styles.heading}>시안 저장</Text>
          {Object.keys(data.drafts).map((name) => (
            <Button
              key={name}
              label={name}
              selected={data.active === name}
              onPress={() => {
                setData((current) => ({ ...current, active: name }));
                setUndo([]);
                setRedo([]);
              }}
            />
          ))}
          <TextInput
            accessibilityLabel="새 시안 이름"
            placeholder="새 시안 이름"
            value={nameInput}
            onChangeText={setNameInput}
            style={styles.input}
          />
          <View style={styles.row}>
            <Button label="새 시안" onPress={() => createDraft(true)} />
            <Button label="현재 시안 복제" onPress={() => createDraft(false)} />
            <Button label="시안 이름 변경" onPress={renameDraft} />
          </View>
          <Text style={styles.heading}>변경 사항 · {changes.length}개</Text>
          {changes.length ? (
            changes.map((change) => (
              <Text key={change.key} style={styles.diff}>
                {change.key}
                {"\n"}
                {String(change.before)} → {String(change.after)}
              </Text>
            ))
          ) : (
            <Text style={styles.hint}>운영 기본 디자인과 같습니다.</Text>
          )}
          <Button
            label="JSON 내보내기"
            onPress={() => {
              if (Platform.OS === "web")
                downloadJson(data.active, exportDraft(data.active, design));
            }}
          />
          <Button label="JSON 가져오기" onPress={openImport} />
          <Text style={styles.hint}>
            운영 적용: 내보낸 JSON을 코드 검증 명령에 전달해 변경 파일을 만듭니다. 브라우저
            편집만으로 운영 소스는 바뀌지 않습니다.
          </Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row", backgroundColor: c.paper },
  rootStack: { flexDirection: "column", overflow: "scroll" },
  left: {
    width: 225,
    flexGrow: 0,
    borderRightWidth: 1,
    borderColor: c.emptyBorder,
    backgroundColor: c.card,
  },
  right: {
    width: 270,
    flexGrow: 0,
    borderLeftWidth: 1,
    borderColor: c.emptyBorder,
    backgroundColor: c.card,
  },
  sideStack: { width: "100%", height: 310, flexShrink: 0 },
  sideContent: { padding: 14, gap: 7 },
  center: { flex: 1 },
  centerStack: { width: "100%", height: 900, flexShrink: 0 },
  centerContent: { alignItems: "center", padding: 20, gap: 16 },
  kicker: { color: c.green, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: c.ink, fontSize: 24, fontWeight: "700" },
  heading: { color: c.ink, fontSize: 15, fontWeight: "700", marginTop: 8 },
  hint: { color: c.muted, fontSize: 11, lineHeight: 16 },
  toolbar: { alignItems: "center", gap: 8 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5 },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: c.emptyBorder,
    borderRadius: 7,
    backgroundColor: c.white,
  },
  buttonActive: { backgroundColor: c.green, borderColor: c.green },
  buttonText: { color: c.ink, fontSize: 12 },
  buttonTextActive: { color: c.white, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  compare: { flexDirection: "row", alignItems: "flex-start", gap: 18 },
  compareStack: { flexDirection: "column" },
  previewPanel: { padding: 8, backgroundColor: c.white, borderRadius: 14, gap: 8 },
  previewLabel: { color: c.ink, fontSize: 14, fontWeight: "700" },
  message: { color: c.green, fontSize: 12, textAlign: "center" },
  field: { gap: 3, paddingVertical: 3 },
  fieldLabel: { color: c.ink, fontSize: 12, fontWeight: "600" },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 24, height: 24, borderRadius: 4, borderWidth: 1, borderColor: c.taskBorder },
  input: {
    minWidth: 95,
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: c.taskBorder,
    borderRadius: 5,
    backgroundColor: c.white,
    color: c.ink,
    fontSize: 13,
  },
  diff: { color: c.ink, fontSize: 11, lineHeight: 17, padding: 5, backgroundColor: c.paper },
});
