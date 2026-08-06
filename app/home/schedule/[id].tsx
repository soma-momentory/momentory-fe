import { router, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { EmotionGrid } from "@/components/common/EmotionGrid";
import { Sheet } from "@/components/common/Sheet";
import { Toggle } from "@/components/common/Toggle";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { text as textColor, toneBox } from "@/design/tokens.mvp";
import { useDay } from "@/features/home/model/day";

/**
 * `12-c` · 일정 상세 시트
 *
 * **가져온 일정은 읽기 전용이다** — 제목 `[수정]` 을 두지 않고, `[삭제]` 대신
 * **`[홈에서 숨기기]`** 다. 같은 자리에 삭제를 두면 캘린더 원본이 지워진다고
 * 읽힌다(실제로는 `hidden` 만 켠다).
 *
 * - **수정·삭제는 `source=manual` 에만** 붙는다 — 그 일정은 모멘토리에만
 *   있으므로 지울 것이 실제로 있다
 * - **마침과 감정은 서로를 요구하지 않는다** — 감정만 남겨도 되고 마침만 켜도 된다
 * - 감정은 **다시 누르면 취소**되는 토글이고 확인 모달을 두지 않는다
 * - **`dangerInk` 는 글자에만 얹고 면도 테두리도 채우지 않는다**(`R-40`).
 *   `[홈에서 숨기기]` 는 되돌릴 수 있는 동작이라 그중에서도 가장 가벼운
 *   처리(면·테두리 없음 · 36 시각 + 44 히트)를 쓴다
 * - **삭제를 색만으로 구분하지 않는다** — 라벨이 무엇이 일어나는지 이미 말한다
 */
export default function ScheduleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schedule = useDay((s) => s.schedules.find((x) => x.id === id));
  const toggleDone = useDay((s) => s.toggleDone);
  const toggleEmotion = useDay((s) => s.toggleEmotion);
  const hide = useDay((s) => s.hide);

  // 없는 일정이면 조용히 닫는다 — 오류 화면을 만들지 않는다(RULES 5)
  if (schedule == null) return <Sheet onDismiss={() => router.back()}>{null}</Sheet>;

  const manual = schedule.source === "manual";

  const onHide = () => {
    hide(schedule.id);
    router.back();
  };

  return (
    <Sheet>
      <View style={styles.head}>
        <View style={styles.headCopy}>
          <AppText tone="caption" weight="600" style={styles.source}>
            {manual ? "직접 추가한 일정" : "캘린더에서 가져온 일정"}
          </AppText>
          <AppText tone="strong" weight="600" style={styles.name}>
            {schedule.title}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={6}
          onPress={() => router.back()}
          style={styles.close}
        >
          <AppText tone="body" style={styles.closeMark}>
            ✕
          </AppText>
        </Pressable>
      </View>

      {/* 감정 — 마침을 켜지 않아도 남길 수 있다 */}
      <View style={styles.toneBox}>
        <View style={styles.askRow}>
          <AppText tone="accent" style={styles.ask}>
            마쳤다면, 어땠어요?
          </AppText>
          <AppText tone="caption" style={styles.undo}>
            다시 누르면 취소
          </AppText>
        </View>

        <EmotionGrid
          selected={schedule.emotions}
          onToggle={(e) => toggleEmotion(schedule.id, e)}
        />

        <AppText variant="footnote" tone="caption">
          고르지 않아도 괜찮아요 · 마침만 켜도 돼요.
        </AppText>
      </View>

      {/* 마침 — 감정을 고르지 않아도 켤 수 있다 */}
      <View style={styles.markRow}>
        <AppText tone="strong" weight="600" style={styles.markLabel}>
          마침으로 표시
        </AppText>
        <Toggle
          value={schedule.done}
          onChange={() => toggleDone(schedule.id)}
          accessibilityLabel="마침으로 표시"
        />
      </View>

      {/* 되돌릴 수 있는 동작 — 면도 테두리도 없이 글자만 dangerInk */}
      <Pressable
        accessibilityRole="button"
        hitSlop={4}
        onPress={onHide}
        style={styles.hideButton}
      >
        <AppText weight="500" style={styles.hideLabel}>
          {manual ? "이 일정 삭제" : "홈에서 숨기기"}
        </AppText>
      </Pressable>

      <AppText variant="footnote" tone="caption" style={styles.centerText}>
        {manual
          ? "모멘토리에만 있던 일정이라 완전히 지워져요"
          : "홈에서만 보이지 않게 돼요 · 캘린더 원본은 그대로 있어요"}
      </AppText>
    </Sheet>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headCopy: { flex: 1, gap: 6 },
  source: { fontSize: 11.5, lineHeight: 11.5, letterSpacing: 0.46 },
  name: { fontSize: 18, lineHeight: 25.2 },
  // .shclose — 시각 32 + 히트 44(hitSlop 6)
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.surfaceTone,
    alignItems: "center",
    justifyContent: "center",
  },
  closeMark: { fontSize: 16, lineHeight: 20 },

  toneBox: {
    gap: toneBox.gap,
    paddingVertical: toneBox.paddingVertical,
    paddingHorizontal: toneBox.paddingHorizontal,
    backgroundColor: semantic.surfaceTone,
    borderRadius: toneBox.radius,
  },
  askRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ask: { flex: 1, fontSize: 12.5, lineHeight: 17.5 },
  undo: { fontSize: 11, lineHeight: 15.4 },

  markRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: toneBox.row.gap,
    minHeight: toneBox.row.minHeight,
    paddingHorizontal: toneBox.row.paddingHorizontal,
    backgroundColor: semantic.surfaceTone,
    borderRadius: toneBox.row.radius,
  },
  markLabel: { flex: 1, fontSize: 14.5, lineHeight: 20.3 },

  // .sbtnDel — 면도 테두리도 없다. 색이 아니라 라벨이 무엇인지 말한다
  hideButton: { alignSelf: "center", minHeight: 36, paddingHorizontal: 14, justifyContent: "center" },
  hideLabel: { fontSize: 12.5, lineHeight: 12.5, color: textColor.danger },
  centerText: { textAlign: "center" },
});
