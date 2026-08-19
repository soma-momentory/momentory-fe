import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Button, SectionHeader, Text } from "@/components/ds";
import {
  emotion as emotionColor,
  emotionTint,
  fill,
  label as labelColor,
  line,
  radius,
  space,
  withAlpha,
} from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import type { WeekDay } from "@/features/report/model/report";

/**
 * 이번 주 감정 — 홈의 두 번째 칸(`Home Sample.dc.html`).
 *
 * **막대도 비율도 아니다.** 하루에 알약 하나, 그날 남긴 감정의 **55% 틴트 면 +
 * 원색 링**(`design.md` §1 「도트·캡슐은 55% 틴트 + 원색 1.5px 링」)이고,
 * 기록이 없는 날은 옅은 면으로 자리만 지킨다. 세거나 평가하지 않는다.
 *
 * ## 색만으로 말하지 않는다
 *
 * 감정 9색은 대비가 낮아(`ds/color.ts` 머리말) **이름을 늘 함께 쓴다**는 규칙이
 * 이 팔레트를 떠받친다. 알약 옆에는 요일밖에 없으므로 두 길을 둔다:
 * 낭독기에는 `「월요일 · 불안함」` 을 그대로 읽히고, 눈으로 보는 사람에게는
 * **누르면 아래에 이름 한 줄**이 선다(시안과 같다).
 *
 * ## 고른 날은 이 화면 안에서만 산다
 *
 * 눌러 이름을 확인하는 것이 전부라 상태를 밖으로 올리지 않는다 — 홈이
 * 들고 있어도 홈이 그걸로 하는 일이 없다.
 *
 * ⚠ 요일 글자는 시안이 `Label/Assistive`(2.08) 인데 **`Label/Alternative`(4.50)**
 * 로 올렸다. 알약이 무슨 날인지 말하는 유일한 글자라 읽혀야 한다(`PLAN.md` A-5
 * 의 대비 보정과 같은 판단).
 */
type Props = {
  days: readonly WeekDay[];
  /** 오늘 — 아직 아무것도 없어도 테두리로 자리를 알린다 */
  today: string;
  /** 「전체보기」 — 한 주를 제대로 보는 곳(리포트)으로 */
  onSeeAll: () => void;
};

/** 알약 높이 — 시안 26 */
const PILL_HEIGHT = 26;

export function WeekEmotionStrip({ days, today, onSeeAll }: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const day = days.find((d) => d.date === picked) ?? null;
  const dayEmotion = day?.emotions[0] ?? null;

  return (
    <View>
      <SectionHeader
        size="small"
        title="이번 주 감정"
        trailing={<Button label="전체보기" variant="text" size="small" onPress={onSeeAll} />}
      />

      <View style={styles.row}>
        {days.map((d) => {
          const id = d.emotions[0] ?? null;
          const isToday = d.date === today;
          const on = d.date === picked;
          const name = emotionName(id);

          return (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              // 색으로 말한 것을 낭독기에는 말로 말한다
              accessibilityLabel={`${d.label}요일 · ${name.length > 0 ? name : "기록 없음"}`}
              onPress={() => setPicked(on ? null : d.date)}
              style={styles.day}
            >
              <View
                style={[
                  styles.pill,
                  id != null
                    ? {
                        backgroundColor: emotionTint(id),
                        borderColor: withAlpha(emotionColor[id], 0.9),
                      }
                    : {
                        backgroundColor: fill.normal,
                        borderColor: isToday ? line.normal : "transparent",
                      },
                  // 고른 날은 **테두리가 굵어진다** — 11px 단이 하나뿐이라
                  // 글자 굵기 대신 테두리로 말한다(색만으로 표시하지 않는다)
                  on ? styles.pillPicked : null,
                ]}
              />
              <Text
                variant="caption2"
                color={on || isToday ? labelColor.strong : labelColor.alternative}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {day != null ? (
        <View style={styles.detail}>
          <View
            style={[
              styles.dot,
              dayEmotion != null
                ? {
                    backgroundColor: emotionTint(dayEmotion),
                    borderColor: withAlpha(emotionColor[dayEmotion], 0.9),
                  }
                : { backgroundColor: fill.normal, borderColor: line.normal },
            ]}
          />
          <Text variant="caption1" color={labelColor.normal}>
            {`${day.label}요일 · ${emotionName(dayEmotion).length > 0 ? emotionName(dayEmotion) : "기록 없음"}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.sm },
  day: { flex: 1, alignItems: "center", gap: space.xs },
  pill: {
    alignSelf: "stretch",
    height: PILL_HEIGHT,
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  pillPicked: { borderWidth: 2.5 },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
  dot: { width: space.md, height: space.md, borderRadius: radius.full, borderWidth: 1.5 },
});
