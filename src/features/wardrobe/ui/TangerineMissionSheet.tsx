import { StyleSheet, View } from "react-native";

import { BottomSheet, Button, Icon, Text, type IconName } from "@/components/ds";
import { background, fill, homeV2, label, radius, space, wardrobe } from "@/design/ds";

import { MISSIONS } from "../model/wardrobe";
import type { TangerineReason } from "../model/types";
import { AttendanceGrid } from "./AttendanceGrid";
import { TangerineIcon } from "./Tangerine";

const MISSION_ICON: Partial<Record<TangerineReason, IconName>> = {
  DIARY: "pencil",
  SCHEDULES_DONE: "calendar",
  // 탭바의 쉼터와 같은 글리프
  REST: "heart",
  LETTER: "mail",
};

/**
 * 귤 모으기 — 홈 머리 줄의 귤, 옷장의 귤 칩, 사기 팝업의 「귤 모으러 가기」로 연다. 위는 출석 이레, 아래는 오늘의 미션.
 * 받은 미션은 오른쪽 알약이 체크와 「받았어요」로 바뀐다(색만으로 가르지 않는다). 남은 개수 · 진행률은 쓰지 않는다.
 */
export function TangerineMissionSheet({
  todayRewards,
  attendanceDay,
  attendanceRewards,
  onDismiss,
  onGoWardrobe,
}: {
  todayRewards: readonly TangerineReason[];
  attendanceDay: number;
  attendanceRewards: readonly number[];
  onDismiss: () => void;
  /** 홈에서 열었을 때만 준다 — 맨 아래 「바바 꾸미러 가기」로 옷장에 간다(옷장 안에서 열면 없다) */
  onGoWardrobe?: () => void;
}) {
  return (
    <BottomSheet title="귤 모으기" closable onDismiss={onDismiss}>
      <View testID="tangerine-missions" style={styles.body}>
        <View style={styles.section}>
          <Text variant="label1" color={label.neutral}>
            출석
          </Text>
          <AttendanceGrid
            day={attendanceDay}
            rewards={attendanceRewards}
            checkedToday={todayRewards.includes("CHECK_IN")}
          />
        </View>
        <View style={styles.section}>
          <Text variant="label1" color={label.neutral}>
            오늘의 미션
          </Text>
          <View style={styles.panel}>
            {MISSIONS.map((mission) => {
              const done = todayRewards.includes(mission.reason);
              return (
                <View
                  key={mission.reason}
                  accessible
                  accessibilityLabel={`${mission.label}, 귤 ${mission.amount}개${done ? ", 오늘 받았어요" : ""}`}
                  style={styles.card}
                >
                  <View style={styles.iconBox}>
                    <Icon
                      name={MISSION_ICON[mission.reason] ?? "check"}
                      size={24}
                      color={label.normal}
                    />
                  </View>
                  <Text variant="body1" color={label.normal} style={styles.title}>
                    {mission.label}
                  </Text>
                  {done ? (
                    <View style={styles.pill}>
                      {/* 홈 일정을 마쳤을 때와 같은 체크 — 녹색 동그라미 + ✓ */}
                      <View style={styles.done}>
                        <Icon name="check" size={16} color={homeV2.color.white} />
                      </View>
                      <Text variant="label1" color={label.neutral}>
                        받았어요
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.pill, styles.pillOpen]}>
                      <TangerineIcon size={wardrobe.chip.icon} />
                      <Text variant="label1" color={label.normal}>{`+${mission.amount}`}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
        {onGoWardrobe != null ? (
          <Button label="바바 꾸미러 가기" fill onPress={onGoWardrobe} />
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: space.xl, paddingBottom: space.sm },
  section: { gap: space.sm },
  // 출석 칸과 같은 판 — 카드들을 한 묶음으로 담는다
  panel: {
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.large,
    backgroundColor: fill.alternative,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.large,
    backgroundColor: background.elevated,
  },
  iconBox: {
    width: wardrobe.mission.iconBox,
    height: wardrobe.mission.iconBox,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.medium,
    backgroundColor: fill.alternative,
  },
  title: { flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: wardrobe.chip.gap,
    height: wardrobe.mission.pill,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
  },
  pillOpen: { backgroundColor: fill.normal },
  done: {
    width: homeV2.size.check,
    height: homeV2.size.check,
    borderRadius: homeV2.size.check / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: homeV2.color.green,
  },
});
