import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";

import { EmotionPebble } from "@/components/ds/EmotionPebble";
import { SelectLift } from "@/components/ds/SelectLift";
import { Text } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import type { WeekDay } from "@/features/report/model/report";

/**
 * 홈 v2 의 **이번 주 감정 도크** — 화면 아래 탭바 위에 **늘 붙어 있다**(HD-7 · WK-1).
 *
 * 시안 `WeekDock` 은 목 색 일곱 점이었다 — 운영판은 **`weekDays()` 의 실제 기록**을 그린다.
 * 기록이 없는 주에도 **일곱 칸이 다 선다**(옛 「기록이 없으면 숨긴다」 · `UX_STRUCTURE.md` A-1 은
 * 이번 적용에서 「항상 고정 · 빈 날은 빈 조약돌」로 바뀌었다 — U-5 때 다시 본다).
 *
 * ## 하루는 세 가지 중 하나다 — 색만으로 가르지 않는다 (결정 D2 · DN-1)
 *
 * | 그날                  | 그림                                             | 낭독기                        |
 * | --------------------- | ------------------------------------------------ | ----------------------------- |
 * | 감정이 있다           | 첫 감정의 수채 조약돌(`EmotionPebble`)           | 「월요일 · 불안함, 우울함」   |
 * | 일기는 있는데 감정 없음 | **채운** 모래색 조약돌 + 가운데 잉크 점          | 「화요일 · 기록 있음, 감정 없음」 |
 * | 기록이 없다           | **테두리만** 있는 조약돌(`no-emotion.png`)       | 「금요일 · 기록 없음」        |
 *
 * 두 빈 칸은 **면이 있고 없음 + 가운데 점**이라는 형태로 갈린다. ⚠ `no-emotion.png` 는 운영의
 * 주간 줄 · 리포트에서는 여전히 「썼는데 감정 없음」의 그림이다 — 이 도크 안에서만 뜻이 바뀐다
 * (D2). 운영 `WeekEmotionStrip` · 리포트는 손대지 않았다. **최종 시각은 P3 전환 전에 디자인
 * 검수**로 확정한다.
 *
 * ## 누르면 그날 감정 이름이 선다 — 도크 위쪽 말풍선
 *
 * 도크 안에는 이름을 세울 자리가 없어 **도크 바로 위**에 작은 말풍선으로 띄운다(계획 §2.4).
 * 다시 누르면 접힌다. 오늘은 요일 글자의 **형광 바탕과 굵기**로 말한다.
 */
type Props = {
  days: readonly WeekDay[];
  today: string;
};

/** 기록 없는 날 — 테두리만 있는 빈 조약돌(D2) */
const NO_RECORD = require("../../../../../assets/emotion-pebble/no-emotion.png");

const PEBBLE = homeV2.size.dock.pebble;

/** 낭독기와 말풍선이 함께 쓰는 그날의 말 */
export function dockDayName(day: WeekDay) {
  const names = day.emotions.map(emotionName).filter((n) => n.length > 0);
  if (names.length > 0) return names.join(", ");
  return day.written ? "기록 있음, 감정 없음" : "기록 없음";
}

export function WeekDock({ days, today }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const day = days.find((d) => d.date === picked) ?? null;

  return (
    <View>
      {day != null ? (
        <View testID="week-dock-picked" style={styles.picked}>
          <Text style={styles.pickedText} color={homeV2.color.ink}>
            {`${day.label}요일 · ${dockDayName(day)}`}
          </Text>
        </View>
      ) : null}

      <View testID="week-dock" style={styles.dock}>
        <Text
          style={[styles.title, { lineHeight: homeV2.type.dockTitle.lineHeight }]}
          color={homeV2.color.ink}
        >
          {"이번 주\n감정"}
        </Text>
        <View style={styles.days}>
          {days.map((d) => {
            const isToday = d.date === today;
            const on = d.date === picked;
            const first = d.emotions[0] ?? null;
            return (
              <Pressable
                key={d.date}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${d.label}요일 · ${dockDayName(d)}`}
                onPress={() => setPicked(on ? null : d.date)}
                style={styles.day}
              >
                <SelectLift selected={on} size={PEBBLE}>
                  {first != null ? (
                    <EmotionPebble id={first} size={PEBBLE} />
                  ) : d.written ? (
                    <WrittenPebble />
                  ) : (
                    <Image
                      testID="week-dock-no-record"
                      source={NO_RECORD}
                      resizeMode="contain"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={styles.pebble}
                    />
                  )}
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
      </View>
    </View>
  );
}

/** 일기는 썼는데 감정이 없는 날 — 채운 조약돌 + 가운데 점(DN-1) */
function WrittenPebble() {
  return (
    <View
      testID="week-dock-written"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.pebble, styles.written]}
    >
      <View style={styles.writtenMark} />
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    minHeight: homeV2.size.dock.height,
    paddingVertical: 10,
    borderRadius: homeV2.size.dock.radius,
    backgroundColor: homeV2.color.dock,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 14,
    boxShadow: homeV2.shadow.dock,
  },
  title: {
    fontFamily: homeV2.font.bold,
    ...homeV2.type.dockTitle,
    flexShrink: 0,
    textAlign: "center",
  },
  days: { flex: 1, minWidth: 0, flexDirection: "row", justifyContent: "space-between" },
  day: { flex: 1, alignItems: "center", gap: 3 },
  pebble: { width: PEBBLE, height: PEBBLE },
  // 조약돌 모양 — 정원이 아니게 모서리 둘을 조금 덜 굴린다(시안 `moodPebble`)
  written: {
    borderRadius: PEBBLE / 2,
    borderTopLeftRadius: PEBBLE / 2 - 1,
    borderBottomRightRadius: PEBBLE / 2 - 1,
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
  picked: {
    alignSelf: "center",
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: homeV2.color.white,
    boxShadow: homeV2.shadow.bubble,
  },
  pickedText: { fontFamily: homeV2.font.bold, ...homeV2.type.dockPicked },
});
