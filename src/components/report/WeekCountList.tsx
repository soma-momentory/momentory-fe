import { StyleSheet, View } from "react-native";

import { Icon, Text, type IconName } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { interaction, space } from "@/design/ds";
import { reportPaper } from "@/design/ds/reportPaper";
import type { WeeklyReport } from "@/features/report/model/weeklyReport";

/**
 * `W1` · 「**이번 주 기록**」 — 일정과 일기를 HTML 시안의 종이 통계 타일에 센다.
 *
 * ## 바람카드 줄이 빠졌다 · 이름도 바뀌었다 (2026-09-12)
 *
 * 「n개 중 m개 실천」 한 줄이 하던 말을 **바람카드 카드**(`WeekWishCard`)가 통째로,
 * 그것도 **무엇을 실천했는지까지** 말한다 — 같은 것을 두 번 세면 어느 쪽이 정본인지
 * 흐려진다. 그래서 이 카드에는 **바람카드가 말하지 않는 것**만 남았다.
 *
 * 이름도 바뀌었다: 시안이 이 카드에 붙였던 「이번 주 한눈에」는 화면에서 아예 사라졌고
 * (카드 제목을 전부 걷었다 · `report.tsx` 머리말), 여기만 **「이번 주 기록」**이라는 섹션
 * 라벨을 든다 — **여러 줄을 세는 카드**라 무엇을 세는지 한 번은 말해 주어야 한다.
 *
 * ## 분모를 함께 적는다 (2026-08-24)
 *
 * `DESIGN.md` 「리포트」는 「지표는 `9개 완료` 형태」라고만 적었고, 예전 줄은 그래서
 * 전체 개수를 숨겼다 — 「분모를 붙이면 비율이 읽히고 비율은 평가가 된다」는 이유였다.
 * **그 판단을 뒤집었다**: 분모 없는 「9개 완료」는 그 주에 일정이 아홉이었는지 서른이었는지
 * 알 수 없어서, 값이 커도 작아도 읽는 사람이 자기 기억으로 분모를 채워 넣게 된다.
 * 「12개 중 9개」는 **비율이 아니라 그 주에 있었던 일의 크기**다.
 *
 * 대신 **비율은 여전히 만들지 않는다** — %·완료율·달성률·연속을 쓰지 않고, 굵은
 * 글자는 언제나 「해낸 쪽」이다. 기록: `docs/PRODUCT.md` 「상류와 차이」.
 *
 * 셀 것이 하나도 없는 줄은 「0개 중 0개 완료」로 적지 않는다 — **없던 일에 0 을 붙이면
 * 못 한 것처럼 읽힌다.** 그런 줄은 「없음」 한 마디로 닫는다.
 *
 * ⚠ **일정의 분모는 「그 주에 잡힌 일정」이다**(BE `WeeklyReport`) — 두 값이 같은 분모를
 * 나눠 갖기 때문에 「n개 중 m개」가 성립한다.
 *
 * 아이콘은 **숫자보다 약하게**(시안 「Interaction/Inactive」) — 줄의 주인공은 값이다.
 */
type WeekCount = {
  icon: IconName;
  label: string;
  /** 「12개 중」 — 셀 것이 없으면 비운다 */
  prefix: string;
  /** 「9개 완료」 — 이 줄에서 굵게 서는 값 */
  value: string;
};

/** 「n개 중 m개 <했다>」. 분모가 0 이면 분모를 말하지 않는다 */
const countOf = (total: number, done: number, verb: string): Pick<WeekCount, "prefix" | "value"> =>
  total === 0
    ? { prefix: "", value: "없음" }
    : { prefix: `${total}개 중`, value: `${done}개 ${verb}` };

/** 일기는 하루 한 벌이라 **남긴 날 수**가 곧 장수다 — 분모가 될 「전체」가 없다 */
const diaryCountOf = (days: number): Pick<WeekCount, "prefix" | "value"> =>
  days === 0 ? { prefix: "", value: "없음" } : { prefix: "", value: `${days}일 기록` };

export const weekCounts = (report: WeeklyReport): WeekCount[] => [
  {
    icon: "calendar",
    label: "일정",
    ...countOf(report.scheduleTotal, report.scheduleCompleted, "완료"),
  },
  { icon: "document", label: "일기", ...diaryCountOf(report.diaryCount) },
];

export function WeekCountList({ report }: { report: WeeklyReport }) {
  const fontScale = useEffectiveFontScale();
  return (
    <View style={styles.grid}>
      {weekCounts(report).map((c, index) => (
        <View key={c.label} style={[styles.tile, index % 2 === 0 ? styles.left : styles.right]}>
          <View style={[styles.tape, index % 2 === 0 ? styles.tapeGold : styles.tapePink]} />
          <View style={styles.labelRow}>
            <Icon name={c.icon} size={16} color={interaction.inactive} />
            <Text
              variant="body2"
              color={reportPaper.muted}
              style={[styles.label, { lineHeight: 22 * fontScale }]}
            >
              {c.label}
            </Text>
          </View>
          <View style={styles.values}>
            {c.prefix.length > 0 ? (
              <Text
                variant="caption1"
                color={reportPaper.muted}
                style={[styles.prefix, { lineHeight: 18 * fontScale }]}
              >
                {c.prefix}
              </Text>
            ) : null}
            <Text
              variant="headline1"
              color={reportPaper.strong}
              style={[styles.value, { lineHeight: 26 * fontScale }]}
            >
              {c.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 16, paddingHorizontal: space.xs },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 88,
    justifyContent: "space-between",
    gap: space.xs,
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: reportPaper.white,
    borderWidth: 1,
    borderColor: reportPaper.border,
    boxShadow: `0px 4px 8px ${reportPaper.shadow}1A`,
  },
  left: { transform: [{ rotate: "-2deg" }] },
  right: { transform: [{ rotate: "1.5deg" }] },
  tape: { position: "absolute", top: -8, left: "38%", width: 42, height: 16 },
  tapeGold: { backgroundColor: reportPaper.tape, opacity: 0.85 },
  tapePink: { backgroundColor: reportPaper.date, opacity: 0.9 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  label: { flexShrink: 1, fontFamily: reportPaper.font.regular, fontSize: 17, lineHeight: 22 },
  values: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: space.xs },
  prefix: { fontFamily: reportPaper.font.regular, fontSize: 14, lineHeight: 18 },
  value: { fontFamily: reportPaper.font.bold, fontSize: 21, lineHeight: 26 },
});
