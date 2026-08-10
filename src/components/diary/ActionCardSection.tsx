import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { ConfirmCard } from "@/components/common/ConfirmCard";
import { SectionLabel } from "@/components/common/SectionLabel";
import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme from "@/design/theme";
import { actionCard, doneButton } from "@/design/tokens.mvp";
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
      <Card style={styles.card}>
        <SectionLabel>이 일기의 행동 카드</SectionLabel>
        <ActionRow label="상황" value={card.situation} />
        <ActionRow label="목표 행동" value={card.targetAction} />
        <View style={styles.divider} />

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
              <CheckCircleIcon size={15} />
              <AppText tone="onDark" weight="600" style={styles.doneLabel}>
                {`해봤어요 · ${card.doneAt == null ? "" : formatKoreanDateShort(card.doneAt.slice(0, 10))}`}
              </AppText>
            </Pressable>

            {/* 느낀 점은 **선택**이다 — 완료한 뒤에야 자리가 열린다 */}
            {readOnly && (card.reflection ?? "").length === 0 ? null : (
              <ActionRow label="느낀 점" value={card.reflection ?? ""}>
                <TextInput
                  value={card.reflection ?? ""}
                  onChangeText={(t) => onSetReflection?.(card.id, t)}
                  editable={!readOnly}
                  placeholder="한 줄 남겨도 좋아요"
                  placeholderTextColor={semantic.textSlogan}
                  multiline
                  selectionColor={semantic.accentInk}
                  style={styles.reflection}
                  accessibilityLabel="느낀 점"
                />
              </ActionRow>
            )}

            <AppText variant="caption" tone="caption">
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
                <AppText tone="body" weight="600" style={styles.doneLabel}>
                  해봤어요
                </AppText>
              </Pressable>
            )}
            <AppText variant="caption" tone="caption">
              {readOnly
                ? `${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요`
                : `${formatKoreanDateShort(diaryDate)} 회고에서 만들어졌어요 · 해본 뒤에 한 줄 남길 수 있어요`}
            </AppText>
          </>
        )}
      </Card>

      {/* 되돌릴 때만 확인을 묻는다 — 완료 기록과 느낀 점이 함께 사라진다 */}
      {confirmUndo && !readOnly ? (
        <ConfirmCard
          title="해본 기록을 지울까요?"
          caption="해본 날짜와 느낀 점이 함께 지워져요."
          cancelLabel="그대로 두기"
          confirmLabel="지우기"
          onCancel={() => setConfirmUndo(false)}
          onConfirm={() => {
            onUndoDone?.(card.id);
            setConfirmUndo(false);
          }}
        />
      ) : null}
    </>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  card: { gap: 10 },
  divider: { height: 1, backgroundColor: `${semantic.textPrimary}1A` },

  reflection: {
    flex: 1,
    fontFamily: "Pretendard-Regular",
    fontSize: actionCard.valueSize,
    lineHeight: actionCard.valueSize * actionCard.lineHeight,
    color: semantic.textBody,
    padding: 0,
  },

  doneButton: {
    minHeight: doneButton.minHeight,
    borderRadius: theme.radius.pill,
    borderWidth: doneButton.borderWidth,
    borderColor: doneButton.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  doneButtonOn: {
    backgroundColor: semantic.accentFill, // primaryDeep — 흰 글자가 얹히는 면
    borderColor: "transparent",
  },
  doneLabel: { fontSize: doneButton.fontSize, lineHeight: doneButton.fontSize },
});
