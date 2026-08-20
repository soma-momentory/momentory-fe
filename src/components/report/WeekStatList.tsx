import { StyleSheet, View } from "react-native";

import { Card, Icon, Text, type IconName } from "@/components/ds";
import { interaction, label as labelColor, space } from "@/design/ds";

/**
 * `W1` · **한 주 한눈에** — 시안의 「항목별로 「9개 완료」 한 값만」 줄이다.
 *
 * `design.md` 「리포트」: 「지표는 `9개 완료` 형태」 · 「**완료율·%·분석 같은
 * 표현을 쓰지 않는다**」. 그래서 여기는 **분모를 말하지 않는다** — 전체 개수를
 * 옆에 붙이면 곧바로 비율이 읽히고, 비율은 평가가 된다(`W1.md` 「관찰이지
 * 평가가 아니다」).
 *
 * 이 세 줄이 `W1.md` 의 **요약 3칸**이다. 값 아래 한 줄(`note`)은 **비교의 기준을
 * 밝히는 자리**다 — "이전 주보다 완만했어요" · "이전 주 3회". 기준 없는 비교를
 * 쓰지 않는다.
 *
 * 아이콘은 **숫자보다 약하게**(시안 「Interaction/Inactive」) — 줄의 주인공은 값이다.
 */
export type WeekStat = {
  icon: IconName;
  label: string;
  value: string;
  /** 비교·근거 한 줄. 비교할 것이 없으면 비운다 */
  note?: string;
};

export function WeekStatList({ stats }: { stats: readonly WeekStat[] }) {
  return (
    <Card padding="loose" style={styles.card}>
      {stats.map((s) => (
        <View key={s.label} style={styles.row}>
          <Icon name={s.icon} size={20} color={interaction.inactive} />
          <Text variant="body2" color={labelColor.neutral} style={styles.label}>
            {s.label}
          </Text>
          <View style={styles.values}>
            <Text variant="headline1" color={labelColor.strong}>
              {s.value}
            </Text>
            {s.note != null && s.note.length > 0 ? (
              <Text variant="caption1" color={labelColor.alternative}>
                {s.note}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xl },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  label: { flex: 1, minWidth: 0, paddingTop: space.xs },
  values: { alignItems: "flex-end", gap: space.xs2, flexShrink: 1 },
});
