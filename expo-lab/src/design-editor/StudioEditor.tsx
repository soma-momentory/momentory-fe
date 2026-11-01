import { Text, View } from "react-native";

import type { StudioAssetId } from "../../../src/design/studioAssets";
import { AssetBrowser } from "./AssetBrowser";
import { ChoiceInput, ColorInput, NumberInput } from "./inputs";
import {
  editableComponents,
  layerDepth,
  STUDIO_SCREENS,
  validValue,
  type EditableProperty,
} from "./studioRegistry";
import { PanelButton, palette, Row, styles } from "./ui";

export type StudioEditorProps = {
  approved: Readonly<Record<string, string | number>>;
  studio: Readonly<Record<string, string | number>>;
  disabled: boolean;
  /** 지금 라우트의 Studio 화면(없으면 null — 홈·쉼터·보관함·마이·리포트 밖) */
  routeScreenId: string | null;
  screenId: string;
  onScreenChange: (screenId: string) => void;
  selectedId: string | null;
  onSelect: (componentId: string | null) => void;
  onChange: (key: string, value: string | number) => void;
  onRevert: (key: string) => void;
};

export function StudioEditor({
  approved,
  studio,
  disabled,
  routeScreenId,
  screenId,
  onScreenChange,
  selectedId,
  onSelect,
  onChange,
  onRevert,
}: StudioEditorProps) {
  const layers = editableComponents.filter((layer) => layer.screenId === screenId);
  return (
    <View style={{ gap: 8 }} testID="design-editor-studio">
      <Text style={styles.hint}>
        다섯 화면의 View 가 `studioApproved.json` 에서 읽는 속성이다. 다른 화면은 「토큰」으로
        고친다.
      </Text>
      <Row>
        {STUDIO_SCREENS.map((screen) => (
          <PanelButton
            key={screen.id}
            label={screen.id === routeScreenId ? `${screen.label} · 지금 화면` : screen.label}
            selected={screen.id === screenId}
            onPress={() => onScreenChange(screen.id)}
          />
        ))}
      </Row>
      {layers.map((layer) => {
        const selected = layer.id === selectedId;
        return (
          <View
            key={layer.id}
            testID={`design-studio-layer-${layer.id}`}
            style={{
              marginLeft: layerDepth(layer) * 10,
              padding: 8,
              gap: 6,
              borderRadius: 8,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? palette.accent : palette.hairline,
            }}
          >
            <Row style={{ justifyContent: "space-between" }}>
              <PanelButton
                label={layer.label}
                selected={selected}
                accessibilityLabel={`${layer.label} 레이어`}
                onPress={() => onSelect(selected ? null : layer.id)}
              />
              <Text style={styles.mono}>{layer.testId}</Text>
            </Row>
            {!layer.properties.length ? (
              <Text style={styles.hint}>보기 전용 — 등록된 속성이 없다</Text>
            ) : null}
            {(selected || layer.properties.some((p) => p.key in studio)) &&
              layer.properties.map((property) => (
                <PropertyRow
                  key={property.key}
                  property={property}
                  value={studio[property.key] ?? approved[property.key]!}
                  approved={approved[property.key]!}
                  changed={property.key in studio}
                  disabled={disabled}
                  onChange={onChange}
                  onRevert={onRevert}
                />
              ))}
          </View>
        );
      })}
    </View>
  );
}

function PropertyRow({
  property,
  value,
  approved,
  changed,
  disabled,
  onChange,
  onRevert,
}: {
  property: EditableProperty;
  value: string | number;
  approved: string | number;
  changed: boolean;
  disabled: boolean;
  onChange: (key: string, value: string | number) => void;
  onRevert: (key: string) => void;
}) {
  const validate = (next: unknown) => (validValue(property, next) ? null : "허용되지 않는 값이다");
  let control;
  if (disabled) control = <Text style={styles.mono}>{String(value)}</Text>;
  else if (property.kind === "color")
    control = (
      <ColorInput
        value={String(value)}
        label={property.label}
        validate={validate}
        onChange={(next) => onChange(property.key, next)}
      />
    );
  else if (property.kind === "number")
    control = (
      <NumberInput
        value={Number(value)}
        label={property.label}
        step={property.step}
        min={property.min}
        max={property.max}
        validate={validate}
        onChange={(next) => onChange(property.key, next)}
      />
    );
  else if (property.kind === "choice")
    control = (
      <ChoiceInput
        value={String(value)}
        options={property.options ?? []}
        onChange={(next) => onChange(property.key, next)}
      />
    );
  else
    control = (
      <AssetBrowser
        value={value as StudioAssetId}
        onChange={(next) => onChange(property.key, next)}
      />
    );
  return (
    <View style={{ gap: 3 }} testID={`design-studio-${property.key}`}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={[styles.label, changed && { fontWeight: "800" }]}>{property.label}</Text>
        <Text style={styles.mono}>{property.key}</Text>
      </Row>
      {control}
      {property.kind === "number" ? (
        <Text style={styles.hint}>
          범위 {property.min} – {property.max}
        </Text>
      ) : null}
      {changed ? (
        <Row>
          <Text style={styles.hint}>승인값 {String(approved)}</Text>
          <PanelButton
            label="되돌리기"
            accessibilityLabel={`${property.key} 되돌리기`}
            onPress={() => onRevert(property.key)}
          />
        </Row>
      ) : null}
    </View>
  );
}
