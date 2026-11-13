import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { EmotionPebble } from "@/components/ds/EmotionPebble";
import { SelectLift } from "@/components/ds/SelectLift";
import { Text } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import type { WeekDay } from "@/features/report/model/report";

/**
 * 홈 v2 의 **이번 주 감정** — 시트 안의 일곱 칸(2026-11-03 · 날짜 옆 쪽지를 누르면 올라온다).
 * 탭바 위에 늘 붙어 있던 도크(HD-7 · WK-1)를 접은 것이라 이름만 도크로 남았다.
 *
 * 시안 `WeekDock` 은 목 색 일곱 점이었다 — 운영판은 **`weekDays()` 의 실제 기록**을 그린다.
 * 기록이 없는 주에도 **일곱 칸이 다 선다**.
 *
 * ## 하루는 세 가지 중 하나다 — 색만으로 가르지 않는다 (결정 D2 · DN-1)
 *
 * | 그날                  | 그림                                             | 낭독기                        |
 * | --------------------- | ------------------------------------------------ | ----------------------------- |
 * | 감정이 있다           | 첫 감정의 수채 조약돌(`EmotionPebble`)           | 「월요일 · 불안, 슬픔」       |
 * | 일기는 있는데 감정 없음 | **채운** 모래색 조약돌 + 가운데 잉크 점          | 「화요일 · 기록 있음, 감정 없음」 |
 * | 기록이 없다           | **테두리만** 있는 조약돌(`no-emotion.png`)       | 「금요일 · 기록 없음」        |
 *
 * 두 빈 칸은 **면이 있고 없음 + 가운데 점**이라는 형태로 갈린다. ⚠ `no-emotion.png` 는 운영의
 * 주간 줄 · 리포트에서는 여전히 「썼는데 감정 없음」의 그림이다 — 이 일곱 칸과 쪽지에서만 뜻이 바뀐다(D2).
 *
 * ## 그날 감정 이름은 칸 아래 한 줄이다
 *
 * 처음에는 오늘이 골라져 있고, 칸을 누르면 그날로 바뀐다. 줄이 늘 있으니 시트 높이가 흔들리지 않는다.
 * 오늘은 요일 글자의 **형광 바탕과 굵기**로 말한다.
 */
type Props = {
  days: readonly WeekDay[];
  today: string;
};

/** 기록 없는 날 — 테두리만 있는 빈 조약돌(D2) */
const NO_RECORD = require("../../../../../assets/emotion-pebble/no-emotion.png");

const PEBBLE = homeV2.size.dock.pebble;

/** 낭독기와 이름 줄이 함께 쓰는 그날의 말 */
export function dockDayName(day: WeekDay) {
  const names = day.emotions.map(emotionName).filter((n) => n.length > 0);
  if (names.length > 0) return names.join(", ");
  return day.written ? "기록 있음, 감정 없음" : "기록 없음";
}

export function WeekDock({ days, today }: Props) {
  const [picked, setPicked] = useState(today);
  const day = days.find((d) => d.date === picked) ?? null;

  return (
    <View>
      <View testID="week-dock" style={styles.days}>
        {days.map((d) => {
          const isToday = d.date === today;
          const on = d.date === picked;
          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${d.label}요일 · ${dockDayName(d)}`}
              onPress={() => setPicked(d.date)}
              style={styles.day}
            >
              <SelectLift selected={on} size={PEBBLE}>
                <DayPebble day={d} size={PEBBLE} />
              </SelectLift>
              <Text
                style={[styles.dayName, isToday ? styles.todayName : null]}
                color={homeV2.color.ink}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text testID="week-dock-picked" style={styles.pickedText} color={homeV2.color.ink}>
        {day != null ? `${day.label}요일 · ${dockDayName(day)}` : " "}
      </Text>
    </View>
  );
}

/** 그날의 조약돌 한 알 — 일곱 칸과 날짜 옆 쪽지가 같은 그림을 쓴다. `null` 이면 기록 없음 */
export function DayPebble({
  day,
  size,
}: {
  day: Pick<WeekDay, "emotions" | "written"> | null;
  size: number;
}) {
  const first = day?.emotions[0] ?? null;
  if (first != null) return <EmotionPebble id={first} size={size} />;
  if (day?.written) return <WrittenPebble size={size} />;
  return (
    <Image
      testID="week-dock-no-record"
      source={NO_RECORD}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    />
  );
}

/** 일기는 썼는데 감정이 없는 날 — 채운 조약돌 + 가운데 점(DN-1) */
function WrittenPebble({ size }: { size: number }) {
  return (
    <View
      testID="week-dock-written"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.written,
        {
          width: size,
          height: size,
          // 조약돌 모양 — 정원이 아니게 모서리 둘을 조금 덜 굴린다(시안 `moodPebble`)
          borderRadius: size / 2,
          borderTopLeftRadius: size / 2 - 1,
          borderBottomRightRadius: size / 2 - 1,
        },
      ]}
    >
      <View style={styles.writtenMark} />
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: "row", justifyContent: "space-between" },
  day: { flex: 1, alignItems: "center", gap: 4 },
  written: {
    backgroundColor: homeV2.color.writtenPebble,
    alignItems: "center",
    justifyContent: "center",
  },
  writtenMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: homeV2.color.writtenMark,
  },
  dayName: {
    fontFamily: homeV2.font.regular,
    ...homeV2.type.dockDay,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  // 오늘은 형광 바탕으로 구분하며 밑줄은 표시하지 않는다.
  todayName: {
    fontFamily: homeV2.font.bold,
    backgroundColor: homeV2.color.today,
  },
  pickedText: {
    marginTop: 14,
    fontFamily: homeV2.font.bold,
    ...homeV2.type.dockPicked,
    textAlign: "center",
  },
});
