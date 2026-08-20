import { StyleSheet, View } from "react-native";

import { EmotionDot, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import type { WeekDay } from "@/features/report/model/report";

/**
 * `W1` · **7일 감정 흐름** — `design.md` 「리포트」의 「도넛·비율·범례 **없이**
 * 7일 감정 흐름」이 이 한 줄이다.
 *
 * **감정은 막대가 아니라 요일별 점**이다(`W1.md`) — 감정에 강도를 입력받지
 * 않으므로 높이로 말할 수 있는 것이 없다. 하루 최대 3개, **이름을 함께** 적고
 * 기록 없는 날은 색 없이 잔잔한 중립 원으로 남긴다(시안 「기록 없는 날은 색 없이
 * 아주 연한 중립 원」).
 *
 * ## ⚠ 시안은 이름을 뺐고 우리는 넣는다
 *
 * 시안 스스로 「요일 아래 감정명은 넣지 않았어요 — 필요하면 선택적으로 추가」라고
 * 적어 둔 자리다. **필요하다** — 감정 원색은 배경 대비가 1.46~3.31 이고 아홉 중
 * 일곱이 3:1 을 못 넘는다. 그 예외를 떠받치는 것이 「이름을 늘 함께 쓴다」는
 * 규칙이라(`RULES.md` · `src/design/ds/color.ts` 머리말) 이름을 빼면 규칙이 깨진다.
 *
 * ## 점 크기가 개수에 따라 바뀐다
 *
 * 시안은 하루 한 개 26px 을 그렸는데 스펙은 **하루 최대 3개**다. 375 프레임에서
 * 한 칸은 40px 안팎이라 26px 셋이 들어가지 않는다 — 칸 높이는 26 으로 고정하고
 * **개수에 따라 지름만** 줄인다. 칸 높이를 고정하는 이유는 요일 라벨의 밑줄이
 * 일곱 칸에서 나란해야 하기 때문이다.
 */
const DOT_SIZE = [22, 14, 10] as const;
const dotSize = (count: number) => DOT_SIZE[Math.min(count, 3) - 1] ?? DOT_SIZE[0];

export function WeekEmotionRow({ days }: { days: readonly WeekDay[] }) {
  return (
    <View style={styles.row}>
      {days.map((d) => {
        const empty = d.emotions.length === 0;
        const size = dotSize(d.emotions.length);

        return (
          <View key={d.date} accessibilityLabel={`${d.label}요일`} style={styles.col}>
            <View style={styles.dots}>
              {empty ? (
                <EmotionDot id={null} size={DOT_SIZE[0]} />
              ) : (
                d.emotions.map((e, i) => <EmotionDot key={`${e}-${i}`} id={e} size={size} />)
              )}
            </View>

            <Text variant="caption2" color={empty ? labelColor.assistive : labelColor.normal}>
              {d.label}
            </Text>

            {/* 색만으로 판단하게 하지 않는다 — 이름을 함께 적는다 */}
            {empty ? (
              <Text variant="caption2" color={labelColor.assistive} style={styles.name}>
                기록 없음
              </Text>
            ) : (
              d.emotions.map((e, i) => (
                <Text
                  key={`${e}-name-${i}`}
                  variant="caption2"
                  color={labelColor.neutral}
                  style={styles.name}
                >
                  {emotionName(e)}
                </Text>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

// 시안의 원 지름 — 개수가 늘어도 이 높이는 그대로다
const DOT_SLOT = 26;

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs, alignItems: "flex-start" },
  col: { flex: 1, minWidth: 0, alignItems: "center", gap: space.xs },
  dots: {
    height: DOT_SLOT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  name: { textAlign: "center" },
});
