import { memo, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { contrastReadouts, hasContrastRule } from "./contrast";
import { ChoiceInput, ColorInput, NumberInput, TextValueInput } from "./inputs";
import {
  GROUP_LABELS,
  tokenLabel,
  tokenValueError,
  type TokenCatalog,
  type TokenEntry,
  type TokenType,
  type TokenValue,
} from "./tokens";
import { PanelButton, palette, Row, styles } from "./ui";

const PAGE = 60;
const TYPE_FILTERS: readonly { id: TokenType | "all"; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "color", label: "색" },
  { id: "number", label: "숫자" },
  { id: "fontFamily", label: "서체" },
  { id: "string", label: "문자열" },
];

export type TokenEditorProps = {
  catalog: TokenCatalog;
  tokens: Readonly<Record<string, TokenValue>>;
  disabled: boolean;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
  /** 화면 요소 선택에서 넘어온 키 — 검색칸을 그 키로 채운다 */
  query: string;
  onQueryChange: (query: string) => void;
};

export function TokenEditor({
  catalog,
  tokens,
  disabled,
  onChange,
  onRevert,
  query,
  onQueryChange,
}: TokenEditorProps) {
  const [type, setType] = useState<TokenType | "all">("all");
  const [group, setGroup] = useState<string | null>(null);
  const [showReadOnly, setShowReadOnly] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => {
    const seen = new Map<string, number>();
    for (const entry of catalog.entries)
      if (entry.editable) seen.set(entry.group, (seen.get(entry.group) ?? 0) + 1);
    return [...seen.entries()];
  }, [catalog]);

  const needle = query.trim().toLocaleLowerCase();
  const visible = useMemo(
    () =>
      catalog.entries.filter(
        (entry) =>
          (showReadOnly || entry.editable) &&
          (type === "all" || entry.type === type) &&
          (!group || entry.group === group) &&
          (!onlyChanged || entry.key in tokens) &&
          (!needle ||
            entry.key.toLocaleLowerCase().includes(needle) ||
            tokenLabel(entry).toLocaleLowerCase().includes(needle) ||
            String(tokens[entry.key] ?? entry.approved ?? "")
              .toLocaleLowerCase()
              .includes(needle)),
      ),
    [catalog, showReadOnly, type, group, onlyChanged, tokens, needle],
  );
  const readOnlyCount = catalog.entries.length - catalog.entries.filter((e) => e.editable).length;
  const valueOf = (key: string) => tokens[key] ?? catalog.byKey.get(key)?.approved ?? null;

  return (
    <View style={{ gap: 8 }} testID="design-editor-tokens">
      <TextInput
        accessibilityLabel="토큰 검색"
        placeholder="키 · 이름 · 값 검색 (예: primary, 글자색, #56755F)"
        value={query}
        onChangeText={(next) => {
          onQueryChange(next);
          setLimit(PAGE);
        }}
        style={styles.input}
      />
      <Row>
        {TYPE_FILTERS.map((item) => (
          <PanelButton
            key={item.id}
            label={item.label}
            selected={type === item.id}
            onPress={() => setType(item.id)}
          />
        ))}
        <PanelButton
          label="바꾼 것만"
          selected={onlyChanged}
          onPress={() => setOnlyChanged((v) => !v)}
        />
        <PanelButton
          label={`읽기 전용 ${readOnlyCount}개도 보기`}
          selected={showReadOnly}
          onPress={() => setShowReadOnly((v) => !v)}
        />
      </Row>
      <Row>
        <PanelButton label="모든 무리" selected={!group} onPress={() => setGroup(null)} />
        {groups.map(([id, count]) => (
          <PanelButton
            key={id}
            label={`${GROUP_LABELS[id] ?? id} ${count}`}
            selected={group === id}
            onPress={() => setGroup(group === id ? null : id)}
          />
        ))}
      </Row>
      <Text style={styles.hint}>
        {visible.length}개 · 편집 {catalog.entries.length - readOnlyCount} · 읽기 전용{" "}
        {readOnlyCount}
        {disabled ? " — 시안을 고르거나 만들면 편집할 수 있다" : ""}
      </Text>
      {visible.slice(0, limit).map((entry) => (
        <TokenRow
          key={entry.key}
          entry={entry}
          value={valueOf(entry.key)}
          changed={entry.key in tokens}
          disabled={disabled}
          fonts={catalog.fonts}
          contrastSource={hasContrastRule(entry.key) ? valueOf : null}
          contrastKey={hasContrastRule(entry.key) ? JSON.stringify(tokens) : ""}
          onChange={onChange}
          onRevert={onRevert}
        />
      ))}
      {visible.length > limit ? (
        <PanelButton
          label={`${Math.min(PAGE, visible.length - limit)}개 더 보기 (남은 ${visible.length - limit})`}
          onPress={() => setLimit((n) => n + PAGE)}
        />
      ) : null}
    </View>
  );
}

const TYPE_LABEL: Record<TokenType, string> = {
  color: "색",
  number: "숫자",
  fontFamily: "서체",
  string: "문자열",
  other: "기타",
};

const TokenRow = memo(function TokenRow({
  entry,
  value,
  changed,
  disabled,
  fonts,
  contrastSource,
  onChange,
  onRevert,
}: {
  entry: TokenEntry;
  value: TokenValue | null;
  changed: boolean;
  disabled: boolean;
  fonts: ReadonlySet<string>;
  contrastSource: ((key: string) => TokenValue | null) | null;
  /** 대비 짝이 바뀌면 다시 그리도록 — memo 비교용 */
  contrastKey: string;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
}) {
  const label = tokenLabel(entry);
  const validate = (next: unknown) => tokenValueError(entry, next, fonts);
  let control = null;
  if (!entry.editable || disabled) {
    control = <Text style={styles.mono}>{String(value ?? "—")}</Text>;
  } else if (entry.type === "color") {
    control = (
      <ColorInput
        value={String(value)}
        label={label}
        validate={validate}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  } else if (entry.type === "number") {
    control = (
      <NumberInput
        value={Number(value)}
        label={label}
        validate={validate}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  } else if (entry.type === "fontFamily") {
    control = (
      <ChoiceInput
        value={String(value)}
        options={[...fonts].map((font) => ({ value: font, label: font }))}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  } else {
    control = (
      <TextValueInput
        value={String(value)}
        label={label}
        validate={validate}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  }
  const readouts = contrastSource ? contrastReadouts(entry.key, contrastSource) : [];
  return (
    <View
      style={{
        gap: 4,
        padding: 8,
        borderRadius: 8,
        borderWidth: changed ? 2 : 1,
        borderColor: changed ? palette.accent : palette.hairline,
      }}
      testID={`design-token-${entry.key}`}
    >
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={[styles.label, changed && { fontWeight: "800" }]}>{label}</Text>
        <Text style={styles.badge}>{entry.scaled ? "기준 pt" : TYPE_LABEL[entry.type]}</Text>
      </Row>
      <Text style={styles.mono} selectable>
        {entry.key}
      </Text>
      {control}
      {!entry.editable ? <Text style={styles.hint}>읽기 전용 — {entry.reason}</Text> : null}
      {changed ? (
        <Row>
          <Text style={styles.hint}>승인값 {String(entry.approved)}</Text>
          <PanelButton
            label="되돌리기"
            accessibilityLabel={`${entry.key} 되돌리기`}
            onPress={() => onRevert(entry.key)}
          />
        </Row>
      ) : null}
      {readouts.map((item) => (
        <Text
          key={`${item.fg}/${item.bg}`}
          style={[styles.hint, item.min > 0 && !item.pass && styles.error]}
        >
          대비 {item.fg} / {item.bg} = {item.ratio?.toFixed(2) ?? "?"}
          {item.min > 0 ? ` · 기준 ${item.min} ${item.pass ? "통과" : "미달"}` : ""} · {item.note}
        </Text>
      ))}
    </View>
  );
});
