/**
 * 「이 화면에 쓰인 값」 — 지금 프레임에 보이는 요소가 실제로 쓰는 값만 묶음별로 보인다.
 * 줄에 마우스를 올리면 그 값을 쓰는 요소들이 프레임에 상자로 보인다.
 */
import { useState } from "react";
import { Text, View } from "react-native";

import {
  COMMON_GROUPS,
  PROPERTY_INFO,
  screenGroupsForRoute,
  USAGE_CATEGORIES,
  type UsageCategory,
  type UsageItem,
} from "./screenUsage";
import { TokenControl } from "./TokenEditor";
import {
  groupLabel,
  tokenLabel,
  type TokenCatalog,
  type TokenEntry,
  type TokenValue,
} from "./tokens";
import { BeforeAfter, PanelButton, palette, Row, styles, Tip, ValueChip } from "./ui";

const PER_CATEGORY = 6;

export type ScreenUsageProps = {
  items: readonly UsageItem[] | null;
  catalog: TokenCatalog;
  tokens: Readonly<Record<string, TokenValue>>;
  disabled: boolean;
  route: string;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
  /** 줄에 올린 요소들 — 프레임에 상자로 보인다(null 이면 지운다) */
  onHover: (elements: readonly Element[] | null) => void;
  /** 「모든 공통 값」에서 이 키를 연다 */
  onOpenAll: (key: string) => void;
};

export function ScreenUsage({
  items,
  catalog,
  tokens,
  disabled,
  route,
  onChange,
  onRevert,
  onHover,
  onOpenAll,
}: ScreenUsageProps) {
  const [open, setOpen] = useState<Partial<Record<UsageCategory, boolean>>>({});
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const screenGroups = screenGroupsForRoute(route);
  if (!items)
    return (
      <Text style={styles.hint} testID="design-editor-usage-loading">
        화면을 읽는 중이에요… 화면(프레임)이 다 그려지면 여기에 그 화면이 쓰는 값이 모여요.
      </Text>
    );
  const matched = items.filter((item) => item.candidates.length > 0);
  return (
    <View style={{ gap: 10 }} testID="design-editor-usage">
      <Text style={styles.note}>
        지금 화면({route})에 보이는 요소가 쓰는 값만 모았어요 — {matched.length}가지. 줄에 마우스를
        올리면 화면에서 그 값을 쓰는 곳이 상자로 보여요. 같은 값을 쓰는 다른 화면도 함께 바뀌어요.
      </Text>
      {USAGE_CATEGORIES.map((category) => {
        const inCategory = items.filter(
          (item) => PROPERTY_INFO[item.property].category === category.id,
        );
        const withToken = inCategory.filter((item) => item.candidates.length > 0);
        const without = inCategory.filter((item) => item.candidates.length === 0);
        if (!inCategory.length) return null;
        const expanded = open[category.id] ?? false;
        const shown = expanded ? withToken : withToken.slice(0, PER_CATEGORY);
        return (
          <View key={category.id} style={{ gap: 6 }} testID={`design-usage-${category.id}`}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {category.label} {withToken.length}
            </Text>
            {shown.map((item) => (
              <UsageRow
                key={item.id}
                item={item}
                catalog={catalog}
                tokens={tokens}
                disabled={disabled}
                chosenKey={chosen[item.id]}
                onChoose={(key) => setChosen((current) => ({ ...current, [item.id]: key }))}
                onChange={onChange}
                onRevert={onRevert}
                onHover={onHover}
                onOpenAll={onOpenAll}
                screenGroups={screenGroups}
              />
            ))}
            {withToken.length > PER_CATEGORY ? (
              <PanelButton
                label={expanded ? "접기" : `${withToken.length - PER_CATEGORY}개 더 보기`}
                hint={expanded ? "많이 쓰인 것만 남겨요" : "이 묶음의 나머지 값도 펼쳐요"}
                onPress={() => setOpen((current) => ({ ...current, [category.id]: !expanded }))}
              />
            ) : null}
            {without.length ? (
              <Tip text="같은 공통 값이 없어요 — 앱 코드에 숫자 · 색이 직접 적혀 있거나, 투명도를 섞어 계산된 값이라 여기서 못 바꿔요">
                <View
                  onPointerEnter={() => onHover(without.flatMap((item) => item.elements))}
                  onPointerLeave={() => onHover(null)}
                >
                  <Text style={styles.hint}>
                    공통 값이 아닌 값 {without.length}개(
                    {without
                      .slice(0, 4)
                      .map((item) => `${item.value}${typeof item.value === "number" ? "px" : ""}`)
                      .join(" · ")}
                    {without.length > 4 ? " …" : ""}) — 앱 코드에 직접 적힌 값이라 여기서 못 바꿔요
                  </Text>
                </View>
              </Tip>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** 고칠 수 없는 이유를 처음 보는 사람 말로 — 코드 식은 괄호 안에만 */
export function friendlyReason(entry: TokenEntry): string {
  const reason = entry.reason ?? "";
  const derived = /^계산된 값이다\((.*)\)/.exec(reason);
  const tail = " 메모로 남기면 AI가 코드에서 고쳐요.";
  if (derived) return `여기서는 못 고쳐요 — 다른 값에서 계산돼요(${derived[1]}).${tail}`;
  if (reason.startsWith("모듈 최상위"))
    return `여기서는 못 고쳐요 — 앱 코드 구조상 밖에서 바꿀 수 없어요.${tail}`;
  return `여기서는 못 고쳐요 — ${reason}.${tail}`;
}

/** 이 토큰이 어디까지 함께 바뀌나 — 한 줄 */
export function shareLine(entry: TokenEntry, count: number, screenGroups: readonly string[]) {
  const here = count > 0 ? `이 화면 ${count}곳` : "이 화면";
  if (COMMON_GROUPS.has(entry.group)) return `이 값은 ${here} · 앱 전체에서 함께 써요`;
  if (screenGroups.includes(entry.group))
    return `이 값은 ${here}에서 함께 써요 — 「${groupLabel(entry.group)}」 묶음이라 그 묶음을 쓰는 화면에만 걸려요`;
  return `「${groupLabel(entry.group)}」 묶음의 값과 우연히 같아요 — 고치면 그 묶음을 쓰는 다른 화면이 바뀌고, 이 화면은 그대로일 수 있어요`;
}

/** 후보 토큰 고르기 + 입력칸 — 「이 화면」 줄과 요소 카드가 함께 쓴다 */
export function CandidateEditor({
  candidates,
  chosenKey,
  onChoose,
  catalog,
  tokens,
  disabled,
  count,
  screenGroups,
  onChange,
  onRevert,
  onOpenAll,
}: {
  candidates: readonly TokenEntry[];
  /** 지금 화면 전용 묶음 — 함께 바뀌는 범위를 말할 때 쓴다 */
  screenGroups: readonly string[];
  chosenKey: string | undefined;
  onChoose: (key: string) => void;
  catalog: TokenCatalog;
  tokens: Readonly<Record<string, TokenValue>>;
  disabled: boolean;
  count: number;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
  onOpenAll: (key: string) => void;
}) {
  const entry = candidates.find((item) => item.key === chosenKey) ?? candidates[0]!;
  const value = tokens[entry.key] ?? entry.approved;
  const changed = entry.key in tokens;
  const others = candidates.filter((item) => item.key !== entry.key);
  return (
    <View style={{ gap: 4 }}>
      <Row
        style={{ justifyContent: "space-between", flexWrap: "nowrap", alignItems: "flex-start" }}
      >
        <View style={{ flexShrink: 1, gap: 1 }}>
          <Text style={[styles.label, changed && { fontWeight: "800" }]}>
            {changed ? "● " : ""}
            {tokenLabel(entry)}
          </Text>
          <Tip text="코드에 적힌 이름이에요. 누르면 「모든 공통 값」에서 열려요">
            <Text
              style={[styles.keyText, { textDecorationLine: "underline" }]}
              onPress={() => onOpenAll(entry.key)}
              accessibilityRole="link"
            >
              {entry.key}
            </Text>
          </Tip>
        </View>
      </Row>
      <TokenControl
        entry={entry}
        value={value}
        disabled={disabled}
        fonts={catalog.fonts}
        onChange={onChange}
      />
      {entry.editable ? (
        <Text style={styles.hint}>{shareLine(entry, count, screenGroups)}</Text>
      ) : (
        <Text style={styles.hint}>{friendlyReason(entry)}</Text>
      )}
      {changed ? (
        <Row style={{ justifyContent: "space-between" }}>
          <BeforeAfter approved={entry.approved} value={value} />
          <PanelButton
            label="되돌리기"
            hint="이 값만 지금 앱(A) 값으로 되돌려요"
            accessibilityLabel={`${entry.key} 되돌리기`}
            onPress={() => onRevert(entry.key)}
          />
        </Row>
      ) : null}
      {others.length ? (
        <Row style={{ gap: 4 }}>
          <Tip text="화면에는 값의 이름이 남지 않아 같은 값을 가진 공통 값을 모두 후보로 보여요. 이 화면 전용 묶음을 먼저 뒀어요 — 다른 후보를 누르면 그 값을 고쳐요">
            <Text style={styles.hint}>같은 값 후보</Text>
          </Tip>
          {others.map((other) => (
            <PanelButton
              key={other.key}
              label={tokenLabel(other)}
              hint={`${other.key} — 이 값을 고치도록 바꿔요${other.editable ? "" : " (고칠 수 없는 값)"}`}
              onPress={() => onChoose(other.key)}
            />
          ))}
        </Row>
      ) : null}
    </View>
  );
}

function UsageRow({
  item,
  catalog,
  tokens,
  disabled,
  chosenKey,
  onChoose,
  onChange,
  onRevert,
  onHover,
  onOpenAll,
  screenGroups,
}: {
  item: UsageItem;
  screenGroups: readonly string[];
  catalog: TokenCatalog;
  tokens: Readonly<Record<string, TokenValue>>;
  disabled: boolean;
  chosenKey: string | undefined;
  onChoose: (key: string) => void;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
  onHover: (elements: readonly Element[] | null) => void;
  onOpenAll: (key: string) => void;
}) {
  const changed = item.candidates.some((entry) => entry.key in tokens);
  return (
    <View
      testID={`design-usage-item-${item.id}`}
      onPointerEnter={() => onHover(item.elements)}
      onPointerLeave={() => onHover(null)}
      style={{
        gap: 4,
        padding: 8,
        borderRadius: 8,
        borderWidth: changed ? 2 : 1,
        borderColor: changed ? palette.accent : palette.hairline,
      }}
    >
      <Row style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
        <Text style={styles.hint}>
          {PROPERTY_INFO[item.property].label} · {item.count}곳
        </Text>
        <ValueChip value={typeof item.value === "number" ? `${item.value}px` : item.value} />
      </Row>
      <CandidateEditor
        candidates={item.candidates}
        chosenKey={chosenKey}
        onChoose={onChoose}
        catalog={catalog}
        tokens={tokens}
        disabled={disabled}
        count={item.count}
        screenGroups={screenGroups}
        onChange={onChange}
        onRevert={onRevert}
        onOpenAll={onOpenAll}
      />
    </View>
  );
}
