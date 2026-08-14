import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius, paperShadows, paperTypography } from "@/design/paper";
import type { ActionCard } from "@/features/diary/model/diary";

/**
 * 쉼터의 행동 카드 — `docs/design/prototype/쉼터.dc.html` 의 카드.
 *
 * 시안대로 **자세히 보기 없이 바로 보인다**: 상황 · 제안된 행동 · 수행 체크 ·
 * 느낀 점. **카드 전체가 상세로 가는 탭 타깃**이고, 체크와 입력은 그 탭을
 * 가로챈다(`app-flow.md` §2.4 — "체크·입력은 상세로 넘어가지 않음").
 *
 * 일기의 `ActionCardSection`(`A3`)과 **다른 컴포넌트**다 — 저쪽은 일기 아래
 * 붙는 한 장이고 여기는 날짜를 오가며 보는 목록의 한 장이다. 규칙은 같이 지킨다:
 * **실행 횟수·연속 일수를 세지 않는다.**
 */
type Props = {
  card: ActionCard;
  onOpen?: () => void;
  onToggleDone?: () => void;
  onSetReflection?: (text: string) => void;
  /** 상세에서는 카드 자신이 화면이라 더 들어갈 곳이 없다 */
  readOnly?: boolean;
};

export function RestActionCard({
  card,
  onOpen,
  onToggleDone,
  onSetReflection,
  readOnly = false,
}: Props) {
  const body = (
    <>
      <View style={styles.block}>
        <AppText weight="700" style={styles.situationLabel}>
          상황
        </AppText>
        <AppText style={styles.value}>{card.situation}</AppText>
      </View>

      <View style={styles.block}>
        <AppText weight="700" style={styles.actionLabel}>
          제안된 행동
        </AppText>
        <AppText style={styles.value}>{card.targetAction}</AppText>
      </View>

      <View style={styles.doneRow}>
        {/* 체크는 카드 탭을 가로챈다 — 상세로 넘어가지 않는다 */}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: card.done }}
          accessibilityLabel="수행"
          hitSlop={10}
          onPress={onToggleDone}
          style={[styles.check, card.done ? styles.checkOn : null]}
        >
          {card.done ? <View style={styles.checkMark} /> : null}
        </Pressable>
        <AppText weight={card.done ? "700" : "400"} style={styles.doneLabel}>
          수행
        </AppText>
      </View>

      {/* 느낀 점은 **선택**이다 — 비워 둬도 된다 */}
      <TextInput
        value={card.reflection ?? ""}
        onChangeText={onSetReflection}
        editable={!readOnly && onSetReflection != null}
        placeholder="느낀 점을 한 줄 남겨도 좋아요"
        placeholderTextColor={paperColors.text.faint}
        selectionColor={paperColors.brand.greenDark}
        multiline
        style={styles.reflection}
        accessibilityLabel="느낀 점"
      />
    </>
  );

  if (onOpen == null) return <View style={styles.card}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="행동 카드 자세히 보기"
      onPress={onOpen}
      style={styles.card}
    >
      {body}
    </Pressable>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: paperRadius.card,
    backgroundColor: paperColors.bg.cardSoft,
    ...paperShadows.flat,
  },
  block: { gap: 4 },
  // 시안의 `#8FA28A` 는 글자로 쓰면 2.7 이라 같은 계열의 진한 톤을 쓴다
  situationLabel: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.brand.greenDark,
  },
  // 시안의 `#C8A96B` 도 글자로는 2.2 라 `sandText` 다 (Phase 1 대비 검수)
  actionLabel: {
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.accent.sandText,
  },
  value: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },

  doneRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: paperColors.brand.green,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: paperColors.brand.green },
  // 체크 표시 — 이모지 대신 두 변만 남긴 사각형을 돌려 만든다
  checkMark: {
    width: 6,
    height: 11,
    marginTop: -2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: paperColors.text.onFill,
    transform: [{ rotate: "45deg" }],
  },
  doneLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },

  reflection: {
    minHeight: 44,
    padding: 12,
    borderRadius: paperRadius.field,
    backgroundColor: paperColors.bg.field,
    borderWidth: 1,
    borderColor: paperColors.line.soft,
    fontFamily: paperTypography.fontFamily.regular,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
    textAlignVertical: "top",
  },
});
