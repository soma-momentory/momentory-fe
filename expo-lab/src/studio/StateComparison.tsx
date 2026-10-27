import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { approvedDesign, type StudioDesign } from "../../../src/design/studioDesign";
import {
  letterScenarios,
  weatherScenarios,
  type LetterScenarioId,
  type WeatherScenarioId,
} from "../claude-home/validationScenarios";
import { claudeHomeColor as c } from "../claude-home/tokens";
import { devices, VariantPhone } from "../catalog/PhonePreview";
import type { LabVariant } from "../catalog/variants";

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

function StatePanel({
  label,
  variant,
  scenarioId,
  onScenario,
  weatherId,
  onWeather,
  letterId,
  onLetter,
  fontScale,
  device,
  scale,
  design,
  resetKey,
  onReset,
  onMessage,
}: {
  label: "A" | "B";
  variant: LabVariant;
  scenarioId: string;
  onScenario: (id: string) => void;
  weatherId: WeatherScenarioId;
  onWeather: (id: WeatherScenarioId) => void;
  letterId: LetterScenarioId;
  onLetter: (id: LetterScenarioId) => void;
  fontScale: 1 | 1.3 | 1.5;
  device: (typeof devices)[number];
  scale: number;
  design: StudioDesign;
  resetKey: number;
  onReset: () => void;
  onMessage: (message: string) => void;
}) {
  return (
    <View testID={`state-preview-${label}`} style={styles.panel}>
      <Text style={styles.panelTitle}>
        {label} · {variant.scenarios.find((item) => item.id === scenarioId)?.label}
      </Text>
      <Text style={styles.label}>Mock 데이터</Text>
      <View style={styles.row}>
        {variant.scenarios.map((item) => (
          <Choice
            key={item.id}
            label={item.label}
            selected={scenarioId === item.id}
            onPress={() => onScenario(item.id)}
          />
        ))}
      </View>
      {variant.id === "app-v2" ? (
        <>
          <Text style={styles.label}>날씨</Text>
          <View style={styles.row}>
            {weatherScenarios.map((item) => (
              <Choice
                key={item.id}
                label={item.label}
                selected={weatherId === item.id}
                onPress={() => onWeather(item.id)}
              />
            ))}
          </View>
          <Text style={styles.label}>편지</Text>
          <View style={styles.row}>
            {letterScenarios.map((item) => (
              <Choice
                key={item.id}
                label={item.label}
                selected={letterId === item.id}
                onPress={() => onLetter(item.id)}
              />
            ))}
          </View>
        </>
      ) : null}
      <VariantPhone
        key={`${variant.id}-${scenarioId}-${weatherId}-${letterId}-${resetKey}`}
        variant={variant}
        scenarioId={scenarioId}
        weatherId={weatherId}
        letterId={letterId}
        fontScale={fontScale}
        device={device}
        scale={scale}
        design={design}
        onMessage={onMessage}
      />
      <Choice label={`${label} 조작 초기화`} selected={false} onPress={onReset} />
    </View>
  );
}

/** Compares two Mock states of the same shared RN View under one selected design source. */
export function StateComparison({
  variant,
  device,
  fontScale,
  viewportWidth,
  draftDesign,
  onFontScale,
  onMessage,
}: {
  variant: LabVariant;
  device: (typeof devices)[number];
  fontScale: 1 | 1.3 | 1.5;
  viewportWidth: number;
  draftDesign: StudioDesign;
  onFontScale: (scale: 1 | 1.3 | 1.5) => void;
  onMessage: (message: string) => void;
}) {
  const [source, setSource] = useState<"approved" | "draft">("approved");
  const [aChoice, setAChoice] = useState("");
  const [bChoice, setBChoice] = useState("");
  const [aWeather, setAWeather] = useState<WeatherScenarioId>("none");
  const [bWeather, setBWeather] = useState<WeatherScenarioId>("none");
  const [aLetter, setALetter] = useState<LetterScenarioId>("none");
  const [bLetter, setBLetter] = useState<LetterScenarioId>("none");
  const [aReset, setAReset] = useState(0);
  const [bReset, setBReset] = useState(0);
  const scenarioA =
    variant.scenarios.find((item) => item.id === aChoice)?.id ?? variant.scenarios[0]!.id;
  const scenarioB =
    variant.scenarios.find((item) => item.id === bChoice)?.id ??
    variant.scenarios[1]?.id ??
    scenarioA;
  const design = source === "draft" ? draftDesign : approvedDesign;
  const sideBySide = viewportWidth >= 1050;
  const scale = sideBySide ? 0.8 : Math.min(0.9, (viewportWidth - 72) / (device.width + 20));

  return (
    <View testID="state-comparison" style={styles.root}>
      <Text style={styles.title}>같은 RN 화면 · 서로 다른 Mock 상태</Text>
      <Text style={styles.note}>
        두 화면에 같은 디자인·디바이스·글씨 배율을 적용합니다. 스타일 A/B는 디자인 편집 탭에서
        비교합니다.
      </Text>
      <Text style={styles.label}>두 상태에 적용할 디자인</Text>
      <View style={styles.row}>
        <Choice
          label="승인 디자인"
          selected={source === "approved"}
          onPress={() => setSource("approved")}
        />
        <Choice
          label="현재 시안"
          selected={source === "draft"}
          onPress={() => setSource("draft")}
        />
      </View>
      <Text style={styles.label}>글씨 배율 · Web 모의</Text>
      <View style={styles.row}>
        {[1, 1.3, 1.5].map((item) => (
          <Choice
            key={item}
            label={`${item}배`}
            selected={fontScale === item}
            onPress={() => onFontScale(item as 1 | 1.3 | 1.5)}
          />
        ))}
      </View>
      <View style={[styles.panels, !sideBySide && styles.stacked]}>
        <StatePanel
          label="A"
          variant={variant}
          scenarioId={scenarioA}
          onScenario={setAChoice}
          weatherId={aWeather}
          onWeather={setAWeather}
          letterId={aLetter}
          onLetter={setALetter}
          fontScale={fontScale}
          device={device}
          scale={scale}
          design={design}
          resetKey={aReset}
          onReset={() => setAReset((value) => value + 1)}
          onMessage={onMessage}
        />
        <StatePanel
          label="B"
          variant={variant}
          scenarioId={scenarioB}
          onScenario={setBChoice}
          weatherId={bWeather}
          onWeather={setBWeather}
          letterId={bLetter}
          onLetter={setBLetter}
          fontScale={fontScale}
          device={device}
          scale={scale}
          design={design}
          resetKey={bReset}
          onReset={() => setBReset((value) => value + 1)}
          onMessage={onMessage}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%", gap: 8, marginTop: 12 },
  title: { color: c.ink, fontSize: 22, fontWeight: "700" },
  note: { color: c.muted, fontSize: 12, lineHeight: 18 },
  label: { color: c.ink, fontSize: 12, fontWeight: "700", marginTop: 5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  panels: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  stacked: { flexDirection: "column" },
  panel: { flex: 1, minWidth: 0, padding: 12, backgroundColor: c.card, borderRadius: 12, gap: 7 },
  panelTitle: { color: c.ink, fontSize: 17, fontWeight: "700" },
  choice: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: c.taskBorder,
    backgroundColor: c.white,
  },
  selected: { backgroundColor: c.green, borderColor: c.green },
  choiceText: { color: c.ink, fontSize: 11 },
  selectedText: { color: c.white, fontWeight: "700" },
});
