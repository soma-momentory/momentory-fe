/**
 * 「탭 배경 바꿔 보기」 — 탭 다섯 칸의 종이 배경을 시안(B)에서 바꿔 본다(`tabBackgrounds.ts`).
 *
 * - 탭마다 고를 수 있는 배경을 그림으로 보이고, 지금 앱(A)과 시안(B)을 함께 표시한다
 * - 「모든 탭에 같은 배경」 — 다섯 칸을 한 번에
 * - `compact` 면 지금 탭 한 줄 + 한꺼번에 바꾸기만(「이 화면에 쓰인 값」 안에서 쓴다)
 *
 * 「모눈(배경 없음)」은 고를 수 없다 — 앱의 `TabScreen` 이 늘 그 탭의 종이 배경을 깔기 때문이다.
 */
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import type { TabBackgroundTab } from "../../../src/design/tabBackgrounds";
import {
  approvedTabBackground,
  draftTabBackground,
  setTabBackgrounds,
  TAB_BACKGROUND_TABS,
  tabBackgroundIds,
  tabBackgroundName,
  tabBackgroundSource,
} from "./tabBackgrounds";
import { PanelButton, palette, Row, styles as ui, tooltipText, useWebTitle } from "./ui";

const ALL_TABS = TAB_BACKGROUND_TABS.map((item) => item.tab);

function BackgroundTile({
  id,
  selected,
  approved,
  hint,
  accessibilityLabel,
  disabled,
  onPress,
  testID,
}: {
  id: string;
  selected: boolean;
  /** 지금 앱(A)이 쓰는 배경인가 */
  approved: boolean;
  hint: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const tooltip = tooltipText(hint, disabled, "먼저 시안을 만들어요");
  const ref = useWebTitle<View>(tooltip);
  const source = tabBackgroundSource(id) as ImageSourcePropType | null;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        tile.root,
        selected && tile.selected,
        disabled && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      {source ? <Image source={source} resizeMode="cover" style={tile.thumb} /> : null}
      <Text style={[tile.name, selected && tile.nameSelected]} numberOfLines={2}>
        {tabBackgroundName(id)}
      </Text>
      <Text style={tile.marks}>
        {[approved ? "A 지금 앱" : null, selected ? "B 시안" : null].filter(Boolean).join(" · ") ||
          " "}
      </Text>
    </Pressable>
  );
}

export function TabBackgroundEditor({
  studio,
  disabled = false,
  currentTab,
  compact = false,
  onChange,
  onOpenAll,
}: {
  /** 시안의 `studio` — `tabBackground.<탭>` 키만 본다 */
  studio: Readonly<Record<string, string | number>>;
  disabled?: boolean;
  /** 지금 보고 있는 탭(탭 화면이 아니면 null) — 맨 위에 「지금 화면」으로 보인다 */
  currentTab: TabBackgroundTab | null;
  /** 지금 탭 한 줄과 한꺼번에 바꾸기만 */
  compact?: boolean;
  /** 새 `studio` — 고른 탭들을 그 배경으로(승인값과 같으면 덮어쓰기를 지운다) */
  onChange: (studio: Record<string, string | number>) => void;
  /** compact 에서 「다섯 탭 따로 고르기」 */
  onOpenAll?: () => void;
}) {
  const ids = tabBackgroundIds();
  const tabs = compact
    ? currentTab
      ? [currentTab]
      : []
    : [...(currentTab ? [currentTab] : []), ...ALL_TABS.filter((tab) => tab !== currentTab)];
  const changed = ALL_TABS.filter(
    (tab) => draftTabBackground(studio, tab) !== approvedTabBackground(tab),
  );
  const sameEverywhere = (id: string) =>
    ALL_TABS.every((tab) => draftTabBackground(studio, tab) === id);

  return (
    <View style={{ gap: 10 }} testID={compact ? "design-tab-bg-compact" : "design-tab-bg"}>
      <Text style={ui.hint}>
        탭 다섯 칸(홈 · 쉼터 · 보관함 · 리포트 · 마이)의 종이 배경을 골라 B 화면에서 바로 봐요. A는
        지금 앱 배경 그대로예요.
      </Text>
      {tabs.map((tab) => {
        const draftId = draftTabBackground(studio, tab);
        const approvedId = approvedTabBackground(tab);
        return (
          <View key={tab} style={{ gap: 4 }} testID={`design-tab-bg-${tab}`}>
            <Text style={ui.label}>
              {tab} 탭 배경{tab === currentTab ? " · 지금 화면" : ""}
            </Text>
            <Text style={ui.hint}>
              A {tabBackgroundName(approvedId)} → B {tabBackgroundName(draftId)}
              {draftId === approvedId ? " (같음)" : ""}
            </Text>
            <Row style={{ alignItems: "flex-start" }}>
              {ids.map((id) => (
                <BackgroundTile
                  key={id}
                  id={id}
                  selected={draftId === id}
                  approved={approvedId === id}
                  disabled={disabled}
                  hint={
                    approvedId === id
                      ? `${tab} 탭을 지금 앱(A) 배경 「${tabBackgroundName(id)}」로 둬요`
                      : `${tab} 탭 배경을 「${tabBackgroundName(id)}」로 바꿔 B 화면에서 봐요`
                  }
                  accessibilityLabel={`${tab} 탭 배경 ${tabBackgroundName(id)}`}
                  onPress={() => onChange(setTabBackgrounds(studio, [tab], id))}
                  testID={`design-tab-bg-${tab}-${id}`}
                />
              ))}
            </Row>
          </View>
        );
      })}
      <View style={{ gap: 4 }}>
        <Text style={ui.label}>모든 탭에 같은 배경</Text>
        <Row>
          {ids.map((id) => (
            <PanelButton
              key={id}
              label={tabBackgroundName(id)}
              accessibilityLabel={`모든 탭 배경 ${tabBackgroundName(id)}`}
              selected={sameEverywhere(id)}
              disabled={disabled}
              disabledReason="먼저 시안을 만들어요"
              hint={`다섯 탭 모두 「${tabBackgroundName(id)}」 배경으로 바꿔 B 화면에서 봐요`}
              onPress={() => onChange(setTabBackgrounds(studio, ALL_TABS, id))}
              testID={`design-tab-bg-all-${id}`}
            />
          ))}
          <PanelButton
            label="탭 배경 모두 A로"
            hint="다섯 탭의 배경을 지금 앱(A)과 같게 되돌려요"
            disabled={disabled || !changed.length}
            disabledReason={disabled ? "먼저 시안을 만들어요" : "바꾼 탭 배경이 없어요"}
            onPress={() =>
              onChange(
                changed.reduce(
                  (next, tab) => setTabBackgrounds(next, [tab], approvedTabBackground(tab)),
                  { ...studio },
                ),
              )
            }
            testID="design-tab-bg-reset"
          />
        </Row>
      </View>
      {compact && onOpenAll ? (
        <PanelButton
          label="다섯 탭 따로 고르기"
          hint="탭마다 다른 배경을 골라요 — 「탭 배경 바꿔 보기」를 열어요"
          onPress={onOpenAll}
        />
      ) : null}
      <Text style={ui.hint}>
        모눈 종이(배경 없음)는 지금 앱의 탭 화면에서 쓰지 않아 고를 수 없어요 — 탭은 늘 종이 배경을
        깔아요.
      </Text>
      <Text style={ui.hint} testID="design-tab-bg-new-hint">
        새 배경 이미지는 AI에게 ‘앱에 넣기’ 그림으로 맡겨요.
      </Text>
    </View>
  );
}

const tile = StyleSheet.create({
  root: {
    width: 92,
    padding: 4,
    gap: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.panel,
  },
  // 선택은 색만으로 말하지 않는다 — 테두리 2px + 굵은 글씨
  selected: { borderWidth: 2, borderColor: palette.accent, backgroundColor: palette.accentSoft },
  thumb: { width: "100%", height: 64, borderRadius: 4, backgroundColor: palette.sunken },
  name: { color: palette.body, fontSize: 11 },
  nameSelected: { color: palette.ink, fontWeight: "700" },
  marks: { color: palette.muted, fontSize: 10 },
});
