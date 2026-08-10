import { useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { Sheet } from "@/components/common/Sheet";
import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { directionOption } from "@/design/tokens.mvp";
import type { ReplyOption } from "@/features/retro/data/retroApi";

/**
 * `C4-c` · `C4-c2` — 서버가 준 선택지를 고르는 하단 시트.
 *
 * 방향 4택(`await_direction`)·세부 2택(`await_sub_direction`)·일정 선택
 * (`await_schedule`)이 **모두 이 시트를 쓴다** — 셋 다 「선택지를 고르고 되돌려
 * 보낸다」는 같은 모양이라, 문안·개수는 서버 `options[]` 가 정하고 여기선 그리기만 한다.
 *
 * **전체 화면이 아니라 하단 시트다** — 뒤에 지금까지의 대화(그리고 방금 온 질문
 * 버블)가 반투명 스크림 너머로 보여야 흐름이 끊기지 않는다. 그래서 시트는 질문을
 * 되풀이하지 않고 **선택지만** 둔다.
 *
 * **바바는 추천하지 않는다**(`C4-c.md`): 줄들이 같은 무게이고, 처음엔 아무것도
 * 골라져 있지 않으며, 고르기 전에는 CTA 가 잠긴다.
 *
 * - **누른 순간 저장되지 않는다** — `[이 방향으로 이어가기]` 를 눌러야 확정된다.
 *   시트를 닫으면 아무 일도 일어나지 않는다(`C4-c2.md`). 그래서 선택이 로컬 상태다
 * - 선택 표시는 **테두리(1→1.5px) + 배경 + 체크** 셋을 함께 — 색 하나에 기대지 않는다
 * - **다른 줄을 누르면 앞 선택이 풀린다** — 하나만 고른다
 * - 제목/버튼 고정, **선택지 영역만 스크롤**. 시트 최대 높이 74%. 키보드 없음
 */
/** 확정 결과 — 보통 옵션은 `optionId`, "직접 입력" 옵션은 사용자가 적은 `content`. */
export type DirectionChoice = { optionId: string } | { content: string };

type Props = {
  options: ReplyOption[];
  /** 확정한 선택 — 보기면 그 `id`, 직접 입력이면 적은 텍스트를 서버로 돌려보낸다 */
  onConfirm: (choice: DirectionChoice) => void;
  onDismiss: () => void;
};

export function DirectionSheet({ options, onConfirm, onDismiss }: Props) {
  // 확정 전까지의 선택 — 시트를 닫으면 이 값이 통째로 사라진다
  const [pickedId, setPickedId] = useState<string | null>(null);
  // "직접 입력" 옵션을 골랐을 때 적는 행동 한 줄
  const [customText, setCustomText] = useState("");
  const maxListHeight =
    Dimensions.get("window").height * directionOption.sheetMaxRatio - HEADER_AND_CTA;

  const picked = options.find((o) => o.id === pickedId) ?? null;
  const isCustom = picked?.input === true;
  const trimmed = customText.trim();
  // 직접 입력은 한 줄을 적어야, 보통 옵션은 고르기만 하면 확정할 수 있다
  const canConfirm = picked != null && (!isCustom || trimmed.length > 0);

  const confirm = () => {
    if (picked == null) return;
    onConfirm(picked.input ? { content: trimmed } : { optionId: picked.id });
  };

  return (
    <Sheet onDismiss={onDismiss}>
      <View style={styles.head}>
        <AppText tone="strong" weight="700" style={styles.title}>
          어떻게 이야기를 이어가고 싶어요?
        </AppText>
        <AppText variant="caption" tone="caption">
          고르는 대로 다음 이야기가 이어져요 · 대화 중에 바꿔도 괜찮아요
        </AppText>
      </View>

      <ScrollView
        style={{ maxHeight: maxListHeight }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {options.map((option) => {
          const on = pickedId === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setPickedId(option.id)}
              style={[styles.option, on ? styles.optionOn : null]}
            >
              {/* 맥락 배지 — 카드 내용이 아니라 "지난 비슷한 상황에서" 같은 표시 */}
              {option.hint != null ? (
                <AppText variant="caption" tone="accent" weight="600" style={styles.hint}>
                  {option.hint}
                </AppText>
              ) : null}
              <View style={styles.optionHead}>
                <AppText tone="strong" weight="600" style={styles.optionTitle}>
                  {option.label}
                </AppText>
                {on ? <CheckCircleIcon /> : null}
              </View>
              {option.description != null ? (
                <AppText tone="caption" style={styles.optionDesc}>
                  {option.description}
                </AppText>
              ) : null}
              {/* "직접 입력" 을 고르면 여기서 원하는 행동을 적는다 */}
              {on && option.input ? (
                <TextInput
                  value={customText}
                  onChangeText={setCustomText}
                  placeholder="예: 자기 전에 오늘 답변 한 줄 적어보기"
                  placeholderTextColor={semantic.textSlogan}
                  multiline
                  selectionColor={semantic.accentInk}
                  style={styles.input}
                  accessibilityLabel="직접 입력한 행동"
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 고르기 전에는 잠기되 사라지지 않는다 */}
      <AppButton label="이 방향으로 이어가기" disabled={!canConfirm} onPress={confirm} />
    </Sheet>
  );
}

/** 제목·안내·CTA·시트 여백이 쓰는 세로 — 목록의 최대 높이를 여기서 뺀다 */
const HEADER_AND_CTA = 210;

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  head: { gap: 3 },
  title: { fontSize: 17, lineHeight: 24.65 },
  // .dlistw — 이 안만 스크롤된다
  list: { gap: directionOption.listGap, padding: 1 },
  option: {
    minHeight: directionOption.minHeight,
    borderRadius: directionOption.radius,
    paddingVertical: directionOption.paddingVertical,
    paddingHorizontal: directionOption.paddingHorizontal,
    gap: directionOption.gap,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: directionOption.border,
  },
  optionOn: {
    borderWidth: directionOption.onBorderWidth,
    borderColor: semantic.accentFill, // primaryDeep
    backgroundColor: semantic.accentWash,
  },
  optionHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  optionTitle: {
    flex: 1,
    fontSize: directionOption.titleSize,
    lineHeight: directionOption.titleSize * 1.5,
  },
  optionDesc: { fontSize: directionOption.descSize, lineHeight: directionOption.descSize * 1.5 },
  hint: { fontSize: directionOption.descSize },
  input: {
    marginTop: 2,
    minHeight: 40,
    borderRadius: directionOption.radius,
    borderWidth: 1,
    borderColor: semantic.accentFill,
    paddingHorizontal: directionOption.paddingHorizontal,
    paddingVertical: 8,
    fontFamily: "Pretendard-Regular",
    fontSize: directionOption.titleSize,
    lineHeight: directionOption.titleSize * 1.4,
    color: semantic.textBody,
  },
});
