import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { Button, Icon, IconButton, Text } from "@/components/ds";
import { WishCardFields } from "@/components/diary/WishCardFields";
import { RestPaperClip, RestPaperSheet } from "@/components/rest/RestPaperSheet";
import { homeV2, layout, radius, restCards, space, status } from "@/design/ds";
import type { ActionCard } from "@/features/diary/model/types";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { keepWords } from "@/features/letter/model/letter";

/**
 * 행동 카드 한 장 (`DESIGN.md` 「쉼터」 R2) — 클립으로 집은 쪽지 한 장(2026-11-05).
 *
 * ## 쪽지는 내용만큼 자란다
 *
 * 전에는 달력 위 정해진 자리에 맞춰 높이를 고정하고 안쪽을 스크롤했다. 그러면 아무 표시 없이 「작은 행동」이
 * 잘렸다. 지금은 **화면 전체가 스크롤**하고 쪽지는 다섯 항목을 다 보여 준다.
 *
 * ## 체크박스가 없다
 *
 * 「**왼쪽은 상태**(「아직 하지 않았어요」 등), **오른쪽은 행동 버튼**(「했어요」/「수행 취소」) — 체크박스 없음」.
 * 읽는 것과 누르는 것이 섞이지 않는다. 「했어요」가 이 화면의 주 버튼이라 홈 · 리포트와 같은 천 라벨이다.
 *
 * ## 수행 상태 3단계
 *
 * `a` 수행 전 → `b` 느낀 점 입력 → `c` 저장. 입력은 **쪽지 안에서 바로** 열린다 — 화면을 옮기지 않는다.
 *
 * - **느낀 점은 선택이다** — 비워 둬도 수행은 수행이다
 * - **`수행 취소` 로 되돌리면 입력도 초기화된다**(`DESIGN.md` 「쉼터」)
 * - **수행률·연속 일수를 세지 않는다**(`RULES.md` 4)
 */
type Props = {
  card: ActionCard;
  /** 카드가 만들어진 날. 머리에 날짜로 선다 */
  date: string;
  /** 「오늘」처럼 날짜 오른쪽에 붙는 한 마디. 없으면 두지 않는다 */
  dateNote?: string;
  /** 오늘 만든 카드인가 — 비어 있는 「작은 행동」에 예고 문구를 둔다(`WishCardFields`) */
  madeToday?: boolean;
  onToggleDone: () => void;
  onSetReflection: (text: string) => void;
  /**
   * ⋮ 를 누른 지점(창 기준 y) — 없으면 ⋮ 를 두지 않는다.
   * 메뉴 자체는 **화면이 그린다**(일기 상세의 ⋮ 와 같은 문법).
   */
  onMore?: (atY: number) => void;
};

/**
 * 느낀 점 글자 수 상한 — 저장한 글이 상태 줄에서 두 줄 안에 든다. 이모지만 예외다(1 em 이 넘는다).
 * 잘린 뒤를 볼 자리가 없어서 자르는 대신 애초에 넘치지 않게 막는다(`docs/PRODUCT.md` #35).
 */
const NOTE_MAX = 24;

const NOTE_INPUT_LINE = restCards.type.reflection.lineHeight;
const NOTE_INPUT_LINES = 2;
/** 한 줄(24)일 때도 터치 목표 44 — 글 자체가 고치는 버튼이다 */
const NOTE_HIT_SLOP = { top: 10, bottom: 10 };

const { color, type, font } = restCards;

export function RestActionCard({
  card,
  date,
  dateNote,
  madeToday = false,
  onToggleDone,
  onSetReflection,
  onMore,
}: Props) {
  const saved = card.reflection != null && card.reflection.length > 0;
  const [draft, setDraft] = useState("");
  /**
   * 느낀 점을 **적는 중**인지. 「했어요」를 누르면 바로 열리고, 「나중에 적을게요」로 닫는다.
   *
   * ⚠ **기기에만 있다.** 계약에 「적는 중」을 담을 자리가 없다 — 앱을 다시 열면 닫힌 채로 시작한다.
   * 날짜를 옮길 때는 `key={card.id}` 가 카드마다 갈라 준다(`app/rest/cards/index.tsx`).
   */
  const [open, setOpen] = useState(false);

  const writing = card.done && open;
  /** 비어 있어도 **눌린다**: 빈 채로 누르면 적지 않고 자리를 닫는다. 그래서 잠긴 색을 쓰지 않는다 */
  const empty = draft.trim().length === 0;

  const save = () => {
    const trimmed = draft.trim();
    // 빈 채로 눌렀으면 **적지 않고 닫는다** — 서버로 보낼 것이 없다
    if (trimmed.length > 0) onSetReflection(trimmed);
    setOpen(false);
    setDraft("");
  };

  /** 적으러 들어간다 — 저장된 것이 있으면 그것을 초안으로 삼는다 */
  const openNote = () => {
    setDraft(card.reflection ?? "");
    setOpen(true);
  };

  const toggle = () => {
    // 되돌리면 적던 것도 함께 지운다 — 남겨 두면 다음 수행의 초안으로 읽힌다.
    // 「했어요」는 곧바로 메모 자리를 연다(2026-11-10) — 2026-09-06 에 걷었던 것은 **닫을 길이 없어서**였고,
    // 지금은 「나중에 적을게요」가 닫는다
    setOpen(!card.done);
    setDraft("");
    onToggleDone();
  };

  return (
    <RestPaperSheet
      testID="rest-card-note"
      tilt={restCards.tilt.note}
      decoration={<RestPaperClip />}
    >
      <View style={styles.head}>
        <View style={styles.headName}>
          <Text style={styles.date} color={color.ink}>
            {date}
          </Text>
          {dateNote != null ? (
            <Text style={styles.dateNote} color={color.muted}>
              {dateNote}
            </Text>
          ) : null}
        </View>
        {onMore != null ? (
          <IconButton
            name="more-vertical"
            size={20}
            accessibilityLabel="더보기"
            color={color.muted}
            onPress={(e) => onMore(e.nativeEvent.pageY)}
            style={styles.more}
          />
        ) : null}
      </View>

      <WishCardFields
        situation={card.situation}
        emotions={card.emotions}
        needs={card.needs}
        desiredState={card.desiredState}
        smallAction={card.targetAction}
        positive={card.sentiment === "positive"}
        madeToday={madeToday}
        inline
      />

      {/* **할 일이 없으면 하단 줄째로 숨긴다**(2026-10-27). 작은 행동은 다음 날 편지에서 고른다 —
          고르기 전에는 「했어요」를 누를 대상이 없다. 작은 행동 없이 이미 「했어요」를 누른 예전 카드는
          「수행 취소」가 남아야 하니 그대로 둔다 */}
      {card.done || (card.targetAction ?? "").length > 0 ? (
        <>
          <View style={styles.foot}>
            {/* **왼쪽은 상태, 오른쪽은 행동** — 「수행했어요」라는 글자는 두지 않는다(체크와 「수행 취소」가 말한다) */}
            <View style={styles.statusSide}>
              <Icon
                name={card.done ? "circle-check" : "clock"}
                size={20}
                color={card.done ? status.positive : color.muted}
              />
              {!card.done ? (
                <Text style={styles.status} color={color.muted}>
                  아직 하지 않았어요
                </Text>
              ) : null}
            </View>
            {card.done ? (
              // 되돌리기는 보조 행동이라 「했어요」(초록 천 라벨)보다 가볍게 — 쪽지와 같은 크림 면에 갈색 테두리 알약이다.
              // 작은 글자 버튼은 버튼처럼 안 보이고 글씨도 작았다(2026-11-10 · 사용자 요청)
              <Pressable
                accessibilityRole="button"
                onPress={toggle}
                style={({ pressed }) => [styles.undo, pressed ? styles.undoPressed : null]}
              >
                <Text style={styles.undoText} color={color.ink}>
                  수행 취소
                </Text>
              </Pressable>
            ) : (
              <ReflectionButton
                compact
                testID="rest-card-done"
                color={homeV2.color.green}
                label="했어요"
                onPress={toggle}
              />
            )}
          </View>

          {/*
            해 본 뒤의 **메모 자리** — 쪽지 아래 공책 줄에 손으로 적는 자리다(2026-11-10 · 사용자 요청
            「했어요만 누르는 느낌 — 진짜 글을 써야 할 것 같았으면」). 셋 중 하나가 선다:
            적는 중 = 물음 · 줄 친 입력 · 남기기 / 비었음 = 연필과 빈 줄(누르면 적는다) / 적었음 = 그 글(누르면 고친다)
          */}
          {!card.done ? null : writing ? (
            <View style={styles.memo}>
              <View style={styles.memoAsk}>
                <Icon name="pencil" size={16} color={color.ink} />
                <Text style={styles.status} color={color.ink}>
                  해 보니 어땠나요?
                </Text>
              </View>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="느낀 점을 한 줄 남겨 보세요"
                placeholderTextColor={color.muted}
                accessibilityLabel="느낀 점"
                multiline
                autoFocus
                // 넘치면 자르는 대신 **애초에 막는다** — 위 `NOTE_MAX` 주석
                maxLength={NOTE_MAX}
                style={styles.memoField}
              />
              <Text style={styles.memoCount} color={color.muted}>
                {`${draft.length}/${NOTE_MAX}`}
              </Text>
              <View style={styles.memoActions}>
                <Button
                  label="나중에 적을게요"
                  labelVariant="label1"
                  variant="text"
                  size="small"
                  accessibilityLabel="느낀 점 없이 넘어가기"
                  onPress={() => {
                    setOpen(false);
                    setDraft("");
                  }}
                />
                <ReflectionButton
                  compact
                  testID="rest-card-note-save"
                  color={homeV2.color.green}
                  label="남기기"
                  disabled={empty}
                  onPress={save}
                />
              </View>
            </View>
          ) : saved ? (
            /* 적어 둔 느낀 점을 누르면 고친다 — 따로 「고치기」 버튼을 두지 않는다 */
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="느낀 점 고치기"
              onPress={openNote}
              hitSlop={NOTE_HIT_SLOP}
              style={styles.memoLine}
            >
              <Icon name="pencil" size={16} color={color.muted} />
              <Text style={styles.reflection} color={color.ink}>
                {keepWords(card.reflection ?? "")}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={openNote}
              style={({ pressed }) => [styles.memoLine, pressed ? styles.memoLinePressed : null]}
            >
              <Icon name="pencil" size={16} color={color.muted} />
              <Text style={styles.status} color={color.muted}>
                느낀 점 적기
              </Text>
            </Pressable>
          )}
        </>
      ) : null}
    </RestPaperSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingBottom: restCards.size.headGap,
    borderBottomWidth: 1,
    borderBottomColor: color.rule,
  },
  headName: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    columnGap: space.sm,
    flexShrink: 1,
    // 날짜가 클립을 비켜선다
    marginLeft: restCards.size.headIndent - restCards.size.sheetPaddingX,
  },
  date: { fontFamily: font.bold, ...type.date },
  dateNote: { fontFamily: font.regular, ...type.dateNote },
  // 44 히트는 지키되 머리 줄의 높이를 밀지 않게 위아래·오른쪽으로 당긴다
  more: { marginVertical: -space.md, marginRight: -space.md },

  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    marginTop: restCards.size.footGap,
  },
  // `flexShrink` — 셋이 한 줄에 빠듯할 때 오른쪽 버튼을 밀지 않고 이쪽이 먼저 접힌다
  statusSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    flexShrink: 1,
  },
  status: { flexShrink: 1, fontFamily: font.regular, ...type.status },
  reflection: { flexShrink: 1, fontFamily: font.regular, ...type.reflection },

  // 메모 자리 — 쪽지의 공책 줄과 같은 줄(`color.rule`)을 그어 「여기 적는다」가 보이게 한다
  memo: { gap: space.sm, marginTop: space.md },
  memoAsk: { flexDirection: "row", alignItems: "center", gap: space.xs },
  memoField: {
    minHeight: NOTE_INPUT_LINE * NOTE_INPUT_LINES,
    paddingVertical: space.xs,
    paddingHorizontal: 0,
    textAlignVertical: "top",
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderBottomColor: color.rule,
    fontFamily: font.regular,
    ...type.reflection,
    color: color.ink,
  },
  memoCount: { alignSelf: "flex-end", fontFamily: font.regular, ...type.status },
  memoActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.md,
  },
  memoLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    // 줄 자체가 누르는 자리다 — 최소 터치 44(`layout.minTouch`)를 줄 높이로 지킨다
    minHeight: layout.minTouch,
    marginTop: space.sm,
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderBottomColor: color.rule,
  },
  memoLinePressed: { opacity: 0.55 },
  // 「했어요」(compact 천 라벨 44)와 같은 높이 · 크림 면 + 쪽지 윤곽색 테두리 — 초록이 없어 한 단 가볍다
  undo: {
    minHeight: layout.minTouch,
    paddingHorizontal: space.lg,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: color.edge,
    backgroundColor: color.paper,
  },
  undoPressed: { backgroundColor: color.rule, transform: [{ translateY: 1 }] },
  undoText: { fontFamily: font.bold, ...type.status },
});
