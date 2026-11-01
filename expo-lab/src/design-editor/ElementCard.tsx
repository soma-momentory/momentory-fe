/**
 * 화면에서 고른 요소 하나 — 그 요소의 글자색 · 바탕 · 크기 · 모서리 … 를, 같은 값의 토큰(또는
 * 화면별 값)과 함께 바로 고칠 수 있는 칸으로 보인다.
 */
import { useState } from "react";
import { Text, View } from "react-native";

import { CandidateEditor } from "./ScreenUsageList";
import {
  PROPERTY_INFO,
  screenGroupsForRoute,
  type PickedElement,
  type UsageProperty,
} from "./screenUsage";
import { PropertyRow } from "./StudioEditor";
import type { TokenCatalog, TokenEntry, TokenValue } from "./tokens";
import { PanelButton, palette, Row, styles, ValueChip } from "./ui";

const ORDER: readonly UsageProperty[] = [
  "color",
  "backgroundColor",
  "borderColor",
  "fontSize",
  "lineHeight",
  "fontFamily",
  "borderRadius",
  "padding",
  "gap",
];

export type PickedCard = {
  element: PickedElement;
  /** 고른 순간의 후보 — 시안이 바뀌어 프레임이 다시 그려져도 같은 토큰을 붙든다 */
  candidates: Partial<Record<UsageProperty, TokenEntry[]>>;
  /** 이 화면에서 같은 값을 쓰는 곳 수 */
  counts: Partial<Record<UsageProperty, number>>;
};

export const elementTitle = (element: PickedElement) => {
  if (element.text) return `글자 『${element.text}』`;
  if (element.tag === "img" || element.tag === "svg" || element.tag === "image") return "그림";
  return element.component ? `「${element.component.label}」` : "면";
};

export function ElementCard({
  picked,
  catalog,
  tokens,
  studio,
  approvedStudio,
  hasDraft,
  route,
  onCreateDraft,
  onChange,
  onRevert,
  onStudioChange,
  onStudioRevert,
  onOpenAll,
  onClose,
}: {
  picked: PickedCard;
  catalog: TokenCatalog;
  tokens: Readonly<Record<string, TokenValue>>;
  studio: Readonly<Record<string, string | number>>;
  approvedStudio: Readonly<Record<string, string | number>>;
  hasDraft: boolean;
  /** 지금 라우트 — 함께 바뀌는 범위를 말할 때 쓴다 */
  route: string;
  onCreateDraft: () => void;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
  onStudioChange: (key: string, value: string | number) => void;
  onStudioRevert: (key: string) => void;
  onOpenAll: (key: string) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<Partial<Record<UsageProperty, string>>>({});
  const { element } = picked;
  const properties = ORDER.filter((property) => element.style[property] !== undefined);
  const component = element.component;
  return (
    <View style={styles.card} testID="design-editor-element">
      <Row
        style={{ justifyContent: "space-between", flexWrap: "nowrap", alignItems: "flex-start" }}
      >
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            이 요소: {elementTitle(element)}
          </Text>
          <Text style={styles.keyText}>
            {element.tag}
            {element.testId ? ` · ${element.testId}` : ""}
          </Text>
        </View>
        <PanelButton
          label="닫기"
          hint="요소 카드를 닫고 「이 화면에 쓰인 값」으로 돌아가요"
          onPress={onClose}
        />
      </Row>
      {!hasDraft ? (
        <View style={[styles.note, { gap: 6 }]} testID="design-editor-element-needs-draft">
          <Text style={styles.label}>먼저 시안을 만들어요</Text>
          <Text style={styles.hint}>
            시안을 만들면 지금 앱(A)은 그대로 두고 B 화면에서만 이 요소를 바꿔 볼 수 있어요.
          </Text>
          <PanelButton
            label="시안 만들고 이 요소 고치기"
            tone="primary"
            hint="빈 시안을 만들어 B 화면에 걸고, 이 요소 카드를 그대로 이어서 고쳐요"
            onPress={onCreateDraft}
          />
        </View>
      ) : null}
      {component && component.properties.length ? (
        <View style={{ gap: 6 }} testID="design-editor-element-studio">
          <Text style={styles.label}>이 요소의 화면별 값 · 「{component.label}」</Text>
          {component.properties.map((property) => (
            <PropertyRow
              key={property.key}
              property={property}
              value={studio[property.key] ?? approvedStudio[property.key]!}
              approved={approvedStudio[property.key]!}
              changed={property.key in studio}
              disabled={!hasDraft}
              onChange={onStudioChange}
              onRevert={onStudioRevert}
            />
          ))}
        </View>
      ) : null}
      {properties.map((property) => {
        const value = element.style[property]!;
        const candidates = picked.candidates[property] ?? [];
        return (
          <View
            key={property}
            style={{ gap: 4, paddingTop: 6, borderTopWidth: 1, borderColor: palette.hairline }}
            testID={`design-element-${property}`}
          >
            <Row style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <Text style={styles.label}>{PROPERTY_INFO[property].label}</Text>
              <ValueChip value={typeof value === "number" ? `${value}px` : value} />
            </Row>
            {candidates.length ? (
              <CandidateEditor
                candidates={candidates}
                chosenKey={chosen[property]}
                onChoose={(key: string) =>
                  setChosen((current) => ({ ...current, [property]: key }))
                }
                catalog={catalog}
                tokens={tokens}
                disabled={!hasDraft}
                count={picked.counts[property] ?? 0}
                screenGroups={screenGroupsForRoute(route)}
                onChange={onChange}
                onRevert={onRevert}
                onOpenAll={onOpenAll}
              />
            ) : (
              <Text style={styles.hint}>앱 코드에 직접 적힌 값이라 여기서 못 바꿔요.</Text>
            )}
          </View>
        );
      })}
      {!properties.length && !component?.properties.length ? (
        <Text style={styles.hint}>
          이 요소에는 고칠 만한 색 · 크기가 없어요. 안쪽 글자나 바깥 면을 눌러 보세요.
        </Text>
      ) : null}
    </View>
  );
}
