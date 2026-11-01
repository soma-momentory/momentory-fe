import { memo, useMemo, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { contrastReadouts, hasContrastRule } from "./contrast";
import { ChoiceInput, ColorInput, NumberInput, TextValueInput } from "./inputs";
import {
  groupLabel,
  groupOf,
  PRIMARY_GROUPS,
  tokenLabel,
  tokenValueError,
  type TokenCatalog,
  type TokenEntry,
  type TokenType,
  type TokenValue,
} from "./tokens";
import { BeforeAfter, PanelButton, palette, Row, styles, Tip, ValueChip } from "./ui";

const PAGE = 60;
const TYPE_FILTERS: readonly { id: TokenType | "all"; label: string; hint: string }[] = [
  { id: "all", label: "전체", hint: "모든 종류의 값을 보여요" },
  { id: "color", label: "색", hint: "글자색 · 면 · 선 같은 색만 보여요" },
  {
    id: "number",
    label: "크기 · 간격",
    hint: "크기 · 간격 · 모서리 · 글씨 크기 · 시간(ms) 같은 숫자 값만 보여요",
  },
  { id: "fontFamily", label: "글꼴", hint: "글꼴 이름만 보여요" },
  { id: "string", label: "기타", hint: "기울기 · 그림자 식처럼 글로 적힌 값만 보여요" },
];

const READ_ONLY_HINT =
  "다른 값에서 계산되거나(예: 투명도를 섞은 색) 앱 코드 구조상 밖에서 바꿀 수 없는 값이에요. 보기만 할 수 있고, 줄마다 이유가 적혀 있어요";

export type TokenEditorProps = {
  catalog: TokenCatalog;
  tokens: Readonly<Record<string, TokenValue>>;
  disabled: boolean;
  onChange: (key: string, value: TokenValue) => void;
  onRevert: (key: string) => void;
  /** 화면 요소 선택에서 넘어온 키 — 검색칸을 그 키로 채운다 */
  query: string;
  onQueryChange: (query: string) => void;
  /** 지금 보고 있는 라우트가 홈인가 — 홈 안내를 앞에 둔다 */
  onHome?: boolean;
};

export function TokenEditor({
  catalog,
  tokens,
  disabled,
  onChange,
  onRevert,
  query,
  onQueryChange,
  onHome = false,
}: TokenEditorProps) {
  const [type, setType] = useState<TokenType | "all">("all");
  const [group, setGroup] = useState<string | null>(null);
  const [showReadOnly, setShowReadOnly] = useState(false);
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [allGroups, setAllGroups] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const groups = useMemo(() => {
    const seen = new Map<string, number>();
    for (const entry of catalog.entries)
      if (entry.editable) seen.set(groupOf(entry), (seen.get(groupOf(entry)) ?? 0) + 1);
    const primary = PRIMARY_GROUPS.filter((id) => seen.has(id));
    const rest = [...seen.keys()].filter((id) => !PRIMARY_GROUPS.includes(id));
    return { counts: seen, primary, rest };
  }, [catalog]);
  const shownGroups = allGroups
    ? [...groups.primary, ...groups.rest]
    : [...groups.primary, ...(group && !groups.primary.includes(group) ? [group] : [])];

  const needle = query.trim().toLocaleLowerCase();
  const visible = useMemo(
    () =>
      catalog.entries.filter(
        (entry) =>
          (showReadOnly || entry.editable) &&
          (type === "all" || entry.type === type) &&
          (!group || groupOf(entry) === group) &&
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
      <Text style={styles.note} testID="design-editor-tokens-note">
        여기서 고친 값은 B의 모든 화면에 함께 적용돼요.
        {onHome ? " 지금 보는 홈은 " : " 단, 홈은 "}
        대부분 홈 전용 값을 써서 글자색 · 면 같은 값을 바꿔도 거의 그대로예요 — 홈은 아래 「홈
        전용」 묶음이나 「화면별 값 → 홈」에서 고쳐요.
      </Text>
      <TextInput
        accessibilityLabel="공통 값 검색"
        placeholder="이름 · 키 · 값으로 찾기 (예: 글자색, primary, #56755F)"
        value={query}
        onChangeText={(next) => {
          onQueryChange(next);
          setLimit(PAGE);
        }}
        style={styles.input}
      />
      <Text style={styles.groupHead}>종류</Text>
      <Row>
        {TYPE_FILTERS.map((item) => (
          <PanelButton
            key={item.id}
            label={item.label}
            hint={item.hint}
            selected={type === item.id}
            onPress={() => setType(item.id)}
          />
        ))}
        <PanelButton
          label="바꾼 값만"
          hint="이 시안에서 A와 다르게 바꾼 값만 보여요"
          selected={onlyChanged}
          onPress={() => setOnlyChanged((v) => !v)}
        />
        <PanelButton
          label={`고칠 수 없는 값도 보기 (${readOnlyCount})`}
          hint={READ_ONLY_HINT}
          selected={showReadOnly}
          onPress={() => setShowReadOnly((v) => !v)}
        />
      </Row>
      <Text style={styles.groupHead}>묶음</Text>
      <Row>
        <PanelButton
          label="전체 묶음"
          hint="묶음을 가리지 않고 모두 보여요"
          selected={!group}
          onPress={() => setGroup(null)}
        />
        {shownGroups.map((id) => (
          <PanelButton
            key={id}
            label={`${groupLabel(id)} ${groups.counts.get(id) ?? 0}`}
            hint={`「${groupLabel(id)}」 묶음의 값 ${groups.counts.get(id) ?? 0}개만 보여요 — 다시 누르면 풀려요`}
            selected={group === id}
            onPress={() => setGroup(group === id ? null : id)}
          />
        ))}
        <PanelButton
          label={allGroups ? "묶음 접기" : `묶음 더 보기 (${groups.rest.length})`}
          hint={
            allGroups
              ? "자주 쓰는 묶음만 남겨요"
              : "화면 전용 색 · 움직임 · 크기 같은 나머지 묶음까지 펼쳐요"
          }
          onPress={() => setAllGroups((v) => !v)}
        />
      </Row>
      <Text style={styles.hint}>
        {visible.length}개 보임 · 고칠 수 있는 값 {catalog.entries.length - readOnlyCount} · 고칠 수
        없는 값 {readOnlyCount}
        {disabled ? " — 시안을 만들거나 고르면 고칠 수 있어요" : ""}
      </Text>
      {visible.length === 0 ? (
        <Text style={styles.hint}>
          찾는 값이 없어요. 검색어를 지우거나 종류 · 묶음을 「전체」로 바꿔 보세요.
        </Text>
      ) : null}
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
          hint="목록을 더 펼쳐요"
          onPress={() => setLimit((n) => n + PAGE)}
        />
      ) : null}
    </View>
  );
}

const TYPE_LABEL: Record<TokenType, string> = {
  color: "색",
  number: "숫자",
  fontFamily: "글꼴",
  string: "기타",
  other: "기타",
};

/** 토큰 하나의 입력칸 — 고칠 수 없거나 시안이 없으면 값만 보인다 */
export function TokenControl({
  entry,
  value,
  disabled,
  fonts,
  onChange,
}: {
  entry: TokenEntry;
  value: TokenValue | null;
  disabled: boolean;
  fonts: ReadonlySet<string>;
  onChange: (key: string, value: TokenValue) => void;
}) {
  const label = tokenLabel(entry);
  const validate = (next: unknown) => tokenValueError(entry, next, fonts);
  if (!entry.editable || disabled) return <ValueChip value={value} />;
  if (entry.type === "color")
    return (
      <ColorInput
        value={String(value)}
        label={label}
        validate={validate}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  if (entry.type === "number")
    return (
      <NumberInput
        value={Number(value)}
        label={label}
        validate={validate}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  if (entry.type === "fontFamily")
    return (
      <ChoiceInput
        value={String(value)}
        options={[...fonts].map((font) => ({ value: font, label: font }))}
        onChange={(next) => onChange(entry.key, next)}
      />
    );
  return (
    <TextValueInput
      value={String(value)}
      label={label}
      validate={validate}
      onChange={(next) => onChange(entry.key, next)}
    />
  );
}

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
  const control = (
    <TokenControl
      entry={entry}
      value={value}
      disabled={disabled}
      fonts={fonts}
      onChange={onChange}
    />
  );
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
      <Row
        style={{ justifyContent: "space-between", flexWrap: "nowrap", alignItems: "flex-start" }}
      >
        <View style={{ flexShrink: 1, gap: 1 }}>
          <Text style={[styles.label, changed && { fontWeight: "800" }]}>
            {changed ? "● " : ""}
            {label}
          </Text>
          <Tip text="코드에 적힌 이름이에요. 검색이나 반영 명령에서 이 이름을 써요">
            <Text style={styles.keyText} selectable>
              {entry.key}
            </Text>
          </Tip>
        </View>
        <Tip
          text={
            entry.scaled
              ? "기준 글씨 크기(pt)예요. 화면에는 기기 폭에 맞춘 배율을 곱해 그려요"
              : `값의 종류 — ${TYPE_LABEL[entry.type]}`
          }
        >
          <Text style={styles.badge}>{entry.scaled ? "기준 pt" : TYPE_LABEL[entry.type]}</Text>
        </Tip>
      </Row>
      {control}
      {!entry.editable ? <Text style={styles.hint}>고칠 수 없어요 — {entry.reason}</Text> : null}
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
