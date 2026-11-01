/**
 * 값 입력 넷 — 색 · 숫자 · 한 줄 문자열 · 선택지. 입력은 **틀린 값을 시안에 넣지 않는다**:
 * 칸에는 치는 그대로 두고, 검사를 통과한 값만 `onChange` 로 올린다.
 */
import { useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";

import { parseColor, toHex6 } from "./colorMath";
import { PanelButton, Row, styles, Swatch } from "./ui";

/** 바깥 값이 바뀌면(되돌리기 · 다른 시안) 칸도 따라간다 */
function useSyncedText(value: string) {
  const [text, setText] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setText(value);
  }
  return [text, setText] as const;
}

export function ColorInput({
  value,
  label,
  validate,
  onChange,
}: {
  value: string;
  label: string;
  validate: (value: string) => string | null;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useSyncedText(value);
  const error = text === value ? null : validate(text.trim());
  const parsed = parseColor(value);
  const update = (next: string) => {
    setText(next);
    if (!validate(next.trim())) onChange(next.trim());
  };
  const fromPicker = (hex: string) => {
    // 투명도가 있던 색은 투명도를 지킨다 — 피커는 #RRGGBB 만 고른다
    const picked = parseColor(hex);
    if (!picked) return;
    const next =
      parsed && parsed.a < 1
        ? `rgba(${picked.r},${picked.g},${picked.b},${parsed.a})`
        : toHex6(picked);
    update(next);
  };
  return (
    <View style={{ gap: 3 }}>
      <Row style={{ flexWrap: "nowrap" }}>
        <Swatch color={value} />
        {Platform.OS === "web" && parsed ? (
          <input
            type="color"
            aria-label={`${label} 색 고르기`}
            title="팔레트에서 색을 골라요"
            value={toHex6(parsed)}
            onChange={(event) => fromPicker(event.currentTarget.value)}
            style={{ width: 28, height: 24, padding: 0, border: "none", background: "none" }}
          />
        ) : null}
        <TextInput
          accessibilityLabel={label}
          value={text}
          onChangeText={update}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, error ? styles.inputInvalid : null]}
        />
      </Row>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const decimals = (n: number) => (Number.isInteger(n) ? 0 : (String(n).split(".")[1]?.length ?? 0));

export function NumberInput({
  value,
  label,
  step,
  min,
  max,
  validate,
  onChange,
}: {
  value: number;
  label: string;
  step?: number;
  min?: number;
  max?: number;
  validate: (value: number) => string | null;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useSyncedText(String(value));
  const stepSize =
    step ?? (Number.isInteger(value) ? 1 : value !== 0 && Math.abs(value) < 1 ? 0.01 : 0.1);
  const candidate = Number(text);
  const error =
    text === String(value)
      ? null
      : text.trim() === "" || !Number.isFinite(candidate)
        ? "숫자가 필요하다"
        : validate(candidate);
  const commit = (next: number) => {
    const places = Math.max(decimals(stepSize), decimals(value));
    const rounded = Number(next.toFixed(Math.min(places, 6)));
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, rounded));
    if (!validate(clamped)) onChange(clamped);
  };
  return (
    <View style={{ gap: 3 }}>
      <Row style={{ flexWrap: "nowrap" }}>
        <PanelButton
          label="−"
          hint={`${stepSize}만큼 줄여요`}
          accessibilityLabel={`${label} 줄이기`}
          onPress={() => commit(value - stepSize)}
        />
        <TextInput
          accessibilityLabel={label}
          value={text}
          inputMode="decimal"
          onChangeText={(next) => {
            setText(next);
            const n = Number(next);
            if (next.trim() !== "" && Number.isFinite(n) && !validate(n)) onChange(n);
          }}
          style={[styles.input, { maxWidth: 90 }, error ? styles.inputInvalid : null]}
        />
        <PanelButton
          label="+"
          hint={`${stepSize}만큼 늘려요`}
          accessibilityLabel={`${label} 늘리기`}
          onPress={() => commit(value + stepSize)}
        />
      </Row>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function TextValueInput({
  value,
  label,
  validate,
  onChange,
}: {
  value: string;
  label: string;
  validate: (value: string) => string | null;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useSyncedText(value);
  const error = text === value ? null : validate(text);
  const commit = () => {
    if (text !== value && !validate(text)) onChange(text);
  };
  return (
    <View style={{ gap: 3 }}>
      <TextInput
        accessibilityLabel={label}
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        style={[styles.input, error ? styles.inputInvalid : null]}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <Text style={styles.hint}>Enter · 칸을 떠나면 반영</Text>
      )}
    </View>
  );
}

export function ChoiceInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Row>
      {options.map((option) => (
        <PanelButton
          key={option.value}
          label={option.label}
          hint={`「${option.label}」로 바꿔요`}
          selected={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </Row>
  );
}
