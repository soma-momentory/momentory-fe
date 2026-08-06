import { useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Sheet } from "@/components/common/Sheet";
import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { directionOption } from "@/design/tokens.mvp";
import { DIRECTIONS, type RetroDirection } from "@/features/retro/model/retro";

/**
 * `C4-c` · `C4-c2` — 회고 방향 고르기 하단 시트.
 *
 * **전체 화면이 아니라 하단 시트다** — 뒤에 지금까지의 대화가 그대로 보여야
 * 흐름이 끊기지 않는다.
 *
 * **바바는 추천하지 않는다**(`C4-c.md`): 네 줄 모두 같은 무게이고, 처음에는
 * 아무것도 골라져 있지 않으며, 고르기 전에는 CTA 가 잠긴다. 추천이 붙으면 그
 * 줄이 정답처럼 보이고 방향을 정하는 일이 바바의 판단을 확인하는 일이 된다.
 *
 * - **고른 값은 누른 순간 저장되지 않는다** — `[이 방향으로 이어가기]` 를
 *   눌러야 확정된다. 시트를 닫으면 아무 일도 일어나지 않는다(`C4-c2.md`).
 *   그래서 선택이 이 컴포넌트의 로컬 상태다
 * - 선택 표시는 **테두리(1→1.5px) + 배경 + 체크** 셋을 함께 — 색 하나에
 *   기대지 않는다. 체크는 완료 카드와 같은 `.ico17` 한 벌이다
 * - **다른 줄을 누르면 앞의 선택이 풀린다** — 방향은 하나다
 * - 제목과 버튼은 **고정**이고 **선택지 영역만 스크롤**된다(`.dlistw`).
 *   시트 최대 높이 74%
 * - **키보드는 열리지 않는다** — 이 시트에 입력이 없다
 */
type Props = {
  onConfirm: (direction: RetroDirection) => void;
  onDismiss: () => void;
};

export function DirectionSheet({ onConfirm, onDismiss }: Props) {
  // 확정 전까지의 선택 — 시트를 닫으면 이 값이 통째로 사라진다
  const [picked, setPicked] = useState<RetroDirection | null>(null);
  const maxListHeight =
    Dimensions.get("window").height * directionOption.sheetMaxRatio - HEADER_AND_CTA;

  return (
    <Sheet onDismiss={onDismiss}>
      <View style={styles.head}>
        <AppText tone="strong" weight="700" style={styles.title}>
          지금은 어떻게 이야기를 이어가고 싶어요?
        </AppText>
        <AppText variant="caption" tone="caption">
          고르는 대로 다음 질문이 달라져요 · 대화 중에 바꿔도 괜찮아요
        </AppText>
      </View>

      <ScrollView
        style={{ maxHeight: maxListHeight }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {DIRECTIONS.map((d) => {
          const on = picked === d.id;
          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setPicked(d.id)}
              style={[styles.option, on ? styles.optionOn : null]}
            >
              <View style={styles.optionHead}>
                <AppText tone="strong" weight="600" style={styles.optionTitle}>
                  {d.title}
                </AppText>
                {on ? <CheckCircleIcon /> : null}
              </View>
              <AppText tone="caption" style={styles.optionDesc}>
                {d.desc}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 고르기 전에는 잠기되 사라지지 않는다 */}
      <AppButton
        label="이 방향으로 이어가기"
        disabled={picked == null}
        onPress={() => picked != null && onConfirm(picked)}
      />
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
});
