import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";
import type { WeekDay } from "@/features/report/model/report";

import { DayPebble } from "./WeekDock";

/**
 * 홈 상단의 **다이어리 메모 두 장**(2026-11-03) — 「오늘 일정」 · 「이번 주 감정」.
 *
 * 앱의 카드처럼 보이지 않게 둥근 모서리 · 그림자 · 안쪽 칸을 쓰지 않는다. 말풍선처럼 손으로 오린 윤곽에
 * 테이프로 붙였고, 일정은 공책 줄 위에 적힌다. 값은 전부 실제 데이터다(일정 제목 · 그날의 조약돌).
 * 메모 전체가 버튼이다 — 누르면 각 내용이 시트로 올라오고, 체크 · 메뉴 · 끌기는 시트에서 한다.
 */

/** 손으로 오린 종이 윤곽 — 칸 크기에 맞춰 늘어난다 */
const PAPER_OUTLINE =
  "M6 4 C34 2 58 5 88 3 C118 2 142 5 164 4 C168 5 169 12 168 30 C167 52 170 78 168 104 C167 108 162 108 150 107 C120 109 92 106 62 108 C40 109 20 107 7 107 C3 106 2 100 3 84 C4 62 1 36 3 12 C3 7 4 5 6 4 Z";

function DiaryNote({
  testID,
  label,
  title,
  state,
  tilt,
  headOnly,
  onPress,
  children,
}: {
  testID: string;
  label: string;
  title: string;
  state?: string;
  tilt: string;
  headOnly: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.note, { transform: [{ rotate: tilt }] }]}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={StyleSheet.absoluteFill}
      >
        <Svg width="100%" height="100%" viewBox="0 0 172 111" preserveAspectRatio="none">
          <Path
            d={PAPER_OUTLINE}
            transform="translate(0 1.5)"
            fill={homeV2.color.shadow}
            opacity={0.08}
          />
          <Path
            d={PAPER_OUTLINE}
            fill={homeV2.color.card}
            stroke={homeV2.color.bubbleBorder}
            strokeWidth={1.4}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
      </View>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.noteTape}
      >
        <MaskingTape color={homeV2.color.date} />
      </View>
      <View testID="home-v2-note-head" style={styles.noteHead}>
        <Text style={styles.title} color={homeV2.color.ink}>
          {title}
        </Text>
        {state != null ? (
          <Text style={styles.state} color={homeV2.color.muted}>
            {state}
          </Text>
        ) : null}
      </View>
      {!headOnly ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.noteBody}
        >
          {children}
        </View>
      ) : null}
    </Pressable>
  );
}

const SCHEDULE_ROWS = 2;

/** 오늘 일정 메모 — 앞 두 일정을 공책 줄 위에 적는다 */
export function ScheduleColumn({
  schedules,
  state,
  compact,
  headOnly,
  onPress,
}: {
  schedules: readonly Schedule[];
  state: string;
  compact: boolean;
  headOnly: boolean;
  onPress: () => void;
}) {
  const rows = schedules.slice(0, compact ? 1 : SCHEDULE_ROWS);
  return (
    <DiaryNote
      testID="home-v2-schedule-entry"
      label={`오늘 일정 보기, ${state}`}
      title="오늘 일정"
      state={state}
      tilt="-1deg"
      headOnly={headOnly}
      onPress={onPress}
    >
      {rows.length === 0 ? (
        <View style={styles.line}>
          <Text style={styles.lineText} color={homeV2.color.muted}>
            일정이 없어요
          </Text>
        </View>
      ) : (
        rows.map((schedule) => (
          <View key={schedule.id} style={styles.line}>
            <View style={[styles.check, schedule.done ? styles.checkDone : null]} />
            <Text
              numberOfLines={1}
              style={[styles.lineText, schedule.done ? styles.lineDone : null]}
              color={schedule.done ? homeV2.color.muted : homeV2.color.ink}
            >
              {schedule.title}
            </Text>
          </View>
        ))
      )}
    </DiaryNote>
  );
}

/** 이번 주 감정 메모 — 공책 줄 위에 조약돌 일곱 알. 일기를 쓰고 돌아오면 그날 자리가 채워진다 */
export function WeekColumn({
  days,
  today,
  state,
  compact,
  headOnly,
  onPress,
}: {
  days: readonly WeekDay[];
  /** 오늘 — 요일 글자의 형광 바탕으로 짚는다 */
  today: string;
  state: string;
  compact: boolean;
  headOnly: boolean;
  onPress: () => void;
}) {
  const size = compact ? 13 : 18;
  return (
    <DiaryNote
      testID="home-v2-week-entry"
      label={`이번 주 감정 보기, 오늘 · ${state}`}
      title="이번 주 감정"
      tilt="1deg"
      headOnly={headOnly}
      onPress={onPress}
    >
      <View style={styles.week}>
        {days.map((day) => (
          <View key={day.date} style={styles.day}>
            <DayPebble day={day} size={size} />
            {!compact ? (
              <Text
                style={[styles.dayName, day.date === today ? styles.today : null]}
                color={homeV2.color.ink}
              >
                {day.label}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </DiaryNote>
  );
}

const styles = StyleSheet.create({
  note: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  // 두 장 다 오른쪽 위 모서리에 비스듬히 붙인다
  noteTape: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 52,
    height: 16,
    transform: [{ rotate: "14deg" }],
  },
  noteHead: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: 6,
  },
  title: { fontFamily: homeV2.font.bold, fontSize: 16, lineHeight: 20 },
  state: { fontFamily: homeV2.font.regular, fontSize: 13, lineHeight: 18 },
  noteBody: { flex: 1, marginTop: 3 },
  // 공책 줄 — 글자 아래로 얇은 줄이 지나간다
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: homeV2.color.emptyBorder,
  },
  lineText: {
    flex: 1,
    fontFamily: homeV2.font.regular,
    fontSize: 15,
    lineHeight: 20,
  },
  lineDone: { textDecorationLine: "line-through" },
  check: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.25,
    borderColor: homeV2.color.taskBorder,
  },
  checkDone: { backgroundColor: homeV2.color.green, borderColor: homeV2.color.green },
  week: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: homeV2.color.emptyBorder,
  },
  day: { alignItems: "center", gap: 2 },
  dayName: {
    fontFamily: homeV2.font.regular,
    fontSize: 13,
    lineHeight: 16,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  today: { fontFamily: homeV2.font.bold, backgroundColor: homeV2.color.today },
});
