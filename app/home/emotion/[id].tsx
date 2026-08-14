import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { EmotionGrid } from "@/components/common/EmotionGrid";
import { Sheet } from "@/components/common/Sheet";
import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import { useDay } from "@/features/home/model/day";

/**
 * 일정 완료 감정 시트 — **마침 원을 누르면 뜬다**
 * (`docs/design/design-system.md` §4.3 · `홈.dc.html`).
 *
 * 시안의 규칙 그대로:
 * - **일정이 있어야만 열린다** — 원이 없으면 이 화면으로 오는 길도 없다
 * - **선택은 건너뛸 수 있다** — 「감정 없이 완료」가 그 말이다. 마침은 이미
 *   켜졌으므로 여기서 아무것도 고르지 않아도 하루는 기록된다
 * - 고른 감정은 **홈의 마침 원에 그 색으로 채워진다**(`ScheduleRow`)
 *
 * ⚠ 서버가 감정을 하나만 받으므로 여기서도 하나만 남는다(`PRODUCT.md` 「상류와 차이」).
 */
export default function ScheduleEmotion() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schedule = useDay((s) => s.schedules.find((x) => x.id === id));
  const selectEmotion = useDay((s) => s.selectEmotion);

  const close = () => router.back();

  // 없는 일정이면 조용히 닫는다 — 오류 화면을 만들지 않는다(RULES 5)
  if (schedule == null)
    return (
      <Sheet variant="paper" onDismiss={close}>
        {null}
      </Sheet>
    );

  return (
    <Sheet variant="paper">
      <View style={styles.head}>
        <AppText weight="700" style={styles.title}>
          마쳤어요! 어땠나요?
        </AppText>
        <View style={styles.chip}>
          <AppText numberOfLines={1} style={styles.chipLabel}>
            {schedule.title}
          </AppText>
        </View>
      </View>

      <EmotionGrid
        variant="paper"
        selected={schedule.emotions}
        onToggle={(e) => selectEmotion(schedule.id, e)}
      />

      <Pressable accessibilityRole="button" onPress={close} style={styles.done}>
        <AppText weight="700" style={styles.doneLabel}>
          완료
        </AppText>
      </Pressable>

      {/* 건너뛸 수 있다 — 고르지 않아도 마침은 이미 켜져 있다 */}
      <Pressable accessibilityRole="button" onPress={close} style={styles.skip}>
        <AppText style={styles.skipLabel}>감정 없이 완료</AppText>
      </Pressable>
    </Sheet>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  head: { alignItems: "center", gap: 8 },
  title: {
    fontSize: type.sheetTitle.fontSize,
    lineHeight: type.sheetTitle.lineHeight,
    color: paperColors.text.primary,
  },
  // 무엇을 마쳤는지 한 번 더 말한다 — 시트만 보고도 알 수 있어야 한다
  chip: {
    maxWidth: "80%",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: paperRadius.pill,
    backgroundColor: paperColors.bg.titleChip,
  },
  chipLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },

  done: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: paperRadius.pill,
    backgroundColor: paperColors.brand.greenDark,
  },
  doneLabel: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.onFill,
  },
  skip: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  skipLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
});
