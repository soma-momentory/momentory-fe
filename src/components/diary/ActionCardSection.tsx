import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { SectionLabel } from "@/components/common/SectionLabel";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import type { ActionCard } from "@/features/diary/model/diary";
import { formatKoreanDateShort } from "@/lib/day";

import { ActionRow } from "./ActionRow";

/**
 * `A3` 행동 카드 + `A3-c` 해본 뒤 — **그 일기 아래**에 붙고 따로 목록을 만들지 않는다.
 *
 * `A3-c` 는 별도 화면이 아니라 **행동 카드가 완료된 상태**다 — 버튼이 채워지고
 * 해본 날짜가 붙으며 느낀 점 한 줄이 자리에 들어온다. **빈 줄로 미리 열어두지
 * 않는다**: 쓰지 않은 칸이 먼저 보이면 안 한 일이 된다.
 *
 * - **`[해봤어요]` 는 토글이 아니라 버튼**이다 — 필요한 것은 "했다"는 사실 하나다
 * - **되돌릴 때만 확인을 묻는다** — 완료 기록과 느낀 점이 함께 지워지므로
 * - **실행 횟수·연속 일수를 세지 않는다**
 *
 * 새 디자인(`design-system.md` §4.5)은 라벨이 값 위로 올라간 블록이고 라벨색이
 * 역할을 나눈다 — 상황(초록) · 목표 행동(모래). 쉼터의 `RestActionCard` 와
 * **다른 컴포넌트**인 것은 그대로다: 저쪽은 날짜를 오가며 보는 목록의 한 장이고
 * 여기는 일기 아래 붙는 한 장이라 `[해봤어요]` 가 체크박스가 아니라 버튼이다.
 */
type Props = {
  card: ActionCard;
  /** 카드가 만들어진 회고의 날짜 — 「7월 27일 회고에서 만들어졌어요」 */
  diaryDate: string;
  onMarkDone?: (cardId: string) => void;
  onUndoDone?: (cardId: string) => void;
  onSetReflection?: (cardId: string, text: string) => void;
  /**
   * 읽기 전용 — 서버에서 불러온(store 에 없는) 카드일 때. 「해봤어요」·되돌리기·느낀
   * 점 편집이 store 를 바꾸는데 서버 카드는 그 대상이 아니라, 상호작용을 닫아 둔다.
   * done/reflection 쓰기 경로가 붙으면 풀린다.
   */
  readOnly?: boolean;
};

export function ActionCardSection({
  card,
  diaryDate,
  onMarkDone,
  onUndoDone,
  onSetReflection,
  readOnly = false,
}: Props) {
  const [confirmUndo, setConfirmUndo] = useState(false);

  return (
    <>
      <Card variant="paperSoft" style={styles.card}>
        <SectionLabel variant="paper">이 일기의 행동 카드</SectionLabel>
        {/* 라벨 문안은 스펙 그대로 「목표 행동」이다 — 시안의 「제안된 행동」은
            쉼터 카드의 말이다(`C6-b.md` · 문안은 docs/spec 우선) */}
        <ActionRow variant="paper" tone="situation" label="상황" value={card.situation} />
        <ActionRow variant="paper" tone="action" label="목표 행동" value={card.targetAction} />

        {card.done ? (
          <>
            {/* 채워진 상태 + 해본 날짜. 실행 횟수를 세지 않는다 */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="해봤어요 되돌리기"
              onPress={readOnly ? undefined : () => setConfirmUndo(true)}
              disabled={readOnly}
              style={[styles.doneButton, styles.doneButtonOn]}
            >
              {/* 체크 표시 — 이모지 대신 두 변만 남긴 사각형을 돌려 만든다 */}
              <View style={styles.checkMark} />
              <AppText weight="700" style={[styles.doneLabel, styles.doneLabelOn]}>
                {`해봤어요 · ${card.doneAt == null ? "" : formatKoreanDateShort(card.doneAt.slice(0, 10))}`}
              </AppText>
            </Pressable>

            {/* 느낀 점은 **선택**이다 — 완료한 뒤에야 자리가 열린다 */}
            {readOnly && (card.reflection ?? "").length === 0 ? null : (
              <ActionRow variant="paper" label="느낀 점" value={card.reflection ?? ""}>
                <TextInput
                  value={card.reflection ?? ""}
                  onChangeText={(t) => onSetReflection?.(card.id, t)}
                  editable={!readOnly}
                  placeholder="한 줄 남겨도 좋아요"
                  placeholderTextColor={paperColors.text.faint}
                  multiline
                  selectionColor={paperColors.brand.greenDark}
                  style={styles.reflection}
                  accessibilityLabel="느낀 점"
                />
              </ActionRow>
            )}

            <AppText style={styles.footnote}>
              {`${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`}
            </AppText>
          </>
        ) : (
          <>
            {/* 서버 카드(읽기 전용)는 아직 「해봤어요」를 눌러도 저장할 곳이 없어 버튼을 닫는다 */}
            {readOnly ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => onMarkDone?.(card.id)}
                style={styles.doneButton}
              >
                <View style={styles.checkBox} />
                <AppText weight="700" style={styles.doneLabel}>
                  해봤어요
                </AppText>
              </Pressable>
            )}
            <AppText style={styles.footnote}>
              {readOnly
                ? `${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`
                : `${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요 · 해본 뒤에 한 줄 남길 수 있어요`}
            </AppText>
          </>
        )}
      </Card>

      {/* 되돌릴 때만 확인을 묻는다 — 완료 기록과 느낀 점이 함께 사라진다.
          **모달이 아니라 그 자리에 열리는 카드**이고, 두 버튼의 무게는 같다 —
          실행 쪽을 채우거나 위험색 면으로 만들지 않는다(`ConfirmCard` 와 같은 규칙).
          공용 `ConfirmCard` 는 아직 옛 톤이라 여기서 새 톤으로 그린다(`PLAN.md` Phase 2) */}
      {confirmUndo && !readOnly ? (
        <Card variant="paperSoft" style={styles.confirm}>
          <AppText weight="700" style={styles.confirmTitle}>
            해본 기록을 지울까요?
          </AppText>
          <AppText style={styles.footnote}>해본 날짜와 느낀 점이 함께 지워져요.</AppText>
          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmUndo(false)}
              style={styles.confirmButton}
            >
              <AppText weight="700" style={styles.confirmLabel}>
                그대로 두기
              </AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onUndoDone?.(card.id);
                setConfirmUndo(false);
              }}
              style={styles.confirmButton}
            >
              <AppText weight="700" style={[styles.confirmLabel, styles.confirmDanger]}>
                지우기
              </AppText>
            </Pressable>
          </View>
        </Card>
      ) : null}
    </>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  card: { gap: 14, paddingVertical: 16, paddingHorizontal: 18 },

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

  doneButton: {
    minHeight: theme.touch.minTarget,
    borderRadius: paperRadius.pill,
    borderWidth: 1.5,
    // 초록은 장식이다 — 글자를 얹지 않는 테두리·체크에만 쓴다
    borderColor: paperColors.brand.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  // 채운 면에는 흰 글자가 얹히므로 `green`(2.7)이 아니라 `greenDark`(4.52) 다
  doneButtonOn: {
    backgroundColor: paperColors.brand.greenDark,
    borderColor: paperColors.brand.greenDark,
  },
  checkBox: {
    width: 15,
    height: 15,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: paperColors.brand.green,
  },
  checkMark: {
    width: 6,
    height: 11,
    marginTop: -3,
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
  doneLabelOn: { color: paperColors.text.onFill },

  footnote: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  confirm: { gap: 8, paddingVertical: 16, paddingHorizontal: 18 },
  confirmTitle: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
  confirmActions: { flexDirection: "row", gap: 9, paddingTop: 4 },
  confirmButton: {
    flex: 1,
    minHeight: theme.touch.minTarget,
    borderRadius: paperRadius.pill,
    borderWidth: 1,
    borderColor: paperColors.line.detail,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
  // 위험색은 **글자에만** 얹는다 — 면도 테두리도 채우지 않는다(`R-40`)
  confirmDanger: { color: paperColors.accent.dangerFill },
});
