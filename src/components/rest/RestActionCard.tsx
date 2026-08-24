import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Button, Card, Icon, IconButton, Text } from "@/components/ds";
import {
  background,
  fill,
  hairline,
  label as labelColor,
  line,
  primary,
  radius,
  space,
  status,
  text,
} from "@/design/ds";
import type { ActionCard } from "@/features/diary/model/types";

/**
 * 행동 카드 한 장 (`Rest.dc.html` R2 · `DESIGN.md` 「쉼터」).
 *
 * ## 체크박스가 없다
 *
 * 시안 규칙: 「**왼쪽은 상태**(「아직 하지 않았어요」/「수행했어요」), **오른쪽은
 * 행동 버튼**(「했어요」/「수행 취소」) — 체크박스 없음」.
 *
 * 옛 카드는 체크박스 하나로 두 일을 했다 — 상태를 보여주는 일과 상태를 바꾸는 일.
 * 나눠 두면 **읽는 것과 누르는 것이 섞이지 않는다.**
 *
 * ## 수행 상태 3단계
 *
 * `a` 수행 전 → `b` 느낀 점 입력 → `c` 저장. 「했어요」를 누르면 **카드 안에서
 * 바로** 입력창이 열린다 — 화면을 옮기지 않는다.
 *
 * - **느낀 점은 선택이다** — 「남기지 않아도 괜찮아요.」. 비워 둬도 수행은 수행이다
 * - 저장하면 읽기 블록 + `고치기`. 입력창은 1줄(52)에서 **최대 3줄**까지만 자라고
 *   읽기 블록도 3줄에서 잘린다 — 전체는 「자세히 보기」에서 본다
 * - **`수행 취소` 로 되돌리면 입력도 초기화된다**(`DESIGN.md` 「쉼터」)
 * - **수행률·연속 일수를 세지 않는다**(`RULES.md` 4)
 */
type Props = {
  card: ActionCard;
  /** 카드가 만들어진 날. 머리에 날짜로 선다 */
  date: string;
  /** 「오늘」처럼 날짜 오른쪽에 붙는 한 마디. 없으면 두지 않는다 */
  dateNote?: string;
  onToggleDone: () => void;
  onSetReflection: (text: string) => void;
  /** 누적 기록(`R3`)으로. 없으면 「자세히 보기」를 두지 않는다 */
  onOpenTrail?: () => void;
  /**
   * ⋮ 를 누른 지점(창 기준 y) — 없으면 ⋮ 를 두지 않는다.
   * 메뉴 자체는 **화면이 그린다**(일기 상세의 ⋮ 와 같은 문법) — 카드가 자기
   * 위에 절대 배치 레이어를 얹으면 스크롤과 함께 밀린다.
   */
  onMore?: (atY: number) => void;
};

/** 읽기 블록도 3줄에서 … 처리 — 전체는 「자세히 보기」에서 (시안 규칙) */
const NOTE_LINES = 3;

/**
 * 느낀 점 저장 버튼 지름 — 입력 한 줄이 이 높이의 가운데에 선다.
 * 입력창을 낮추려고 32→28 로 줄였다(2026-08-24 · 하단 영역 축소).
 */
const NOTE_BUTTON = 28;
const NOTE_PADDING_Y = (NOTE_BUTTON - text.body1.lineHeight) / 2;
/** 느낀 점 입력창 최소 높이 — 옛 `size.input.compact`(52)에서 낮췄다(하단 축소) */
const NOTE_INPUT_MIN = 40;

export function RestActionCard({
  card,
  date,
  dateNote,
  onToggleDone,
  onSetReflection,
  onOpenTrail,
  onMore,
}: Props) {
  const saved = card.reflection != null && card.reflection.length > 0;
  /** 저장된 느낀 점을 **고치는 중**인지. 수행 직후에는 자동으로 열려 있다 */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const writing = card.done && (!saved || editing);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed.length === 0) return;
    onSetReflection(trimmed);
    setEditing(false);
    setDraft("");
  };

  const toggle = () => {
    // 되돌리면 적던 것도 함께 지운다 — 남겨 두면 다음 수행의 초안으로 읽힌다
    setEditing(false);
    setDraft("");
    onToggleDone();
  };

  /**
   * 카드 하단 한 줄의 **왼쪽** — 상태별로 다르다. 오른쪽 「자세히 보기」와 한 줄에
   * 세워 하단 높이를 줄인다(느낀 점 도움말이 「자세히 보기」와 같은 줄에 선다).
   */
  const footLead = !card.done ? (
    <Text variant="caption1" color={labelColor.alternative}>
      수행하면 느낀 점을 남길 수 있어요
    </Text>
  ) : writing ? (
    <Text variant="caption1" color={labelColor.alternative}>
      남기지 않아도 괜찮아요.
    </Text>
  ) : saved ? (
    <Button
      label="고치기"
      variant="text"
      size="small"
      onPress={() => {
        setDraft(card.reflection ?? "");
        setEditing(true);
      }}
    />
  ) : null;

  return (
    <Card padding="loose" style={styles.card}>
      <View style={styles.head}>
        <View style={styles.headName}>
          <Text variant="headline1" color={labelColor.strong}>
            {date}
          </Text>
          {dateNote != null ? (
            <Text variant="caption1" color={labelColor.alternative}>
              {dateNote}
            </Text>
          ) : null}
        </View>
        {onMore != null ? (
          <IconButton
            name="more-vertical"
            size={20}
            accessibilityLabel="더보기"
            color={labelColor.alternative}
            onPress={(e) => onMore(e.nativeEvent.pageY)}
            style={styles.more}
          />
        ) : null}
      </View>

      <View style={styles.field}>
        <Text variant="label2" color={labelColor.alternative}>
          상황
        </Text>
        <Text variant="body2" color={labelColor.neutral}>
          {card.situation}
        </Text>
      </View>

      <View style={styles.field}>
        <Text variant="label2" color={labelColor.alternative}>
          제안된 행동
        </Text>
        <Text variant="body1" color={labelColor.strong}>
          {card.targetAction}
        </Text>
      </View>

      <View style={styles.foot}>
        <View style={styles.statusRow}>
          <View style={styles.statusLabel}>
            <Icon
              name={card.done ? "circle-check" : "clock"}
              size={16}
              color={card.done ? status.positive : labelColor.alternative}
            />
            <Text variant="label1" color={card.done ? status.positive : labelColor.alternative}>
              {card.done ? "수행했어요" : "아직 하지 않았어요"}
            </Text>
          </View>
          <Button
            label={card.done ? "수행 취소" : "했어요"}
            variant="outlined"
            size="small"
            onPress={toggle}
          />
        </View>

        {/* 느낀 점 입력/읽기 — 수행 후에만 연다(무엇에 대한 느낌인지가 있어야) */}
        {card.done && writing ? (
          <View style={styles.noteInput}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="느낀 점을 남겨보세요…"
              placeholderTextColor={labelColor.assistive}
              accessibilityLabel="느낀 점"
              multiline
              style={styles.noteField}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="느낀 점 저장"
              accessibilityState={{ disabled: draft.trim().length === 0 }}
              disabled={draft.trim().length === 0}
              onPress={save}
              style={[styles.send, draft.trim().length === 0 ? styles.sendIdle : styles.sendReady]}
            >
              <Icon
                name="send"
                size={16}
                color={draft.trim().length === 0 ? labelColor.disabled : labelColor.onFill}
              />
            </Pressable>
          </View>
        ) : card.done && saved ? (
          <View style={styles.noteRead}>
            <Text variant="body2" color={labelColor.neutral} numberOfLines={NOTE_LINES}>
              {card.reflection}
            </Text>
          </View>
        ) : null}

        {/* 하단 한 줄 — 왼쪽 도움말/고치기 · 오른쪽 「자세히 보기」. 둘을 한 줄로
            합쳐 카드 하단 높이를 줄인다 */}
        {footLead != null || onOpenTrail != null ? (
          <View style={styles.footRow}>
            <View style={styles.footLead}>{footLead}</View>
            {onOpenTrail != null ? (
              <Button label="자세히 보기" variant="text" size="small" onPress={onOpenTrail} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  headName: { flexDirection: "row", alignItems: "baseline", gap: space.sm, flexShrink: 1 },
  // 44 히트는 지키되 머리 줄의 높이를 밀지 않게 위아래·오른쪽으로 당긴다
  more: { marginVertical: -space.md, marginRight: -space.md },
  field: { gap: space.xs },

  // 상태·느낀 점은 카드 안에서 한 겹 아래다 — 위 선 하나로 나눈다
  foot: {
    gap: space.sm,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
  // ⚠ paddingTop 을 두지 않는다 — 상태줄이 위 구분선에 붙는다(`foot` 의 10 만 띄운다)
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  statusLabel: { flexDirection: "row", alignItems: "center", gap: space.sm, flexShrink: 1 },

  noteInput: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    minHeight: NOTE_INPUT_MIN,
    paddingLeft: 12,
    padding: 6,
    borderRadius: 12,
    backgroundColor: background.elevated,
    ...hairline.neutral,
    borderColor: primary.normal,
  },
  noteField: {
    flex: 1,
    minWidth: 0,
    // 한 줄일 때 저장 버튼(32)과 세로 중심이 맞는다 — 플레이스홀더가 위에
    // 떠 보이지 않게. 안드로이드는 여러 줄 입력의 글자를 위에 붙인다
    minHeight: NOTE_BUTTON,
    textAlignVertical: "center",
    // 1줄에서 최대 3줄까지만 (시안 규칙)
    maxHeight: text.body1.lineHeight * NOTE_LINES + NOTE_PADDING_Y * 2,
    paddingVertical: NOTE_PADDING_Y,
    paddingHorizontal: 0,
    ...text.body1,
    color: labelColor.normal,
  },
  send: {
    width: NOTE_BUTTON,
    height: NOTE_BUTTON,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendReady: { backgroundColor: primary.heavy },
  sendIdle: { backgroundColor: fill.normal },

  noteRead: {
    padding: 14,
    borderRadius: radius.medium,
    backgroundColor: fill.alternative,
  },
  // 도움말/고치기(왼쪽)와 「자세히 보기」(오른쪽)를 한 줄에 — 하단 높이를 줄인다
  footRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  footLead: { flexShrink: 1 },
});
