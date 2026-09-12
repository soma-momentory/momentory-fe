import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Card, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import type { WeeklyReport } from "@/features/report/model/weeklyReport";

import { WeekEmotionStack, WeekMoodReveal } from "./WeekEmotionStack";

/**
 * `W1` · 일곱 칸에 그날 감정을 쌓아 올린 더미 카드 (2026-09-12 · 사용자 시안 2번).
 *
 * 예전에는 이 더미의 조상인 **점 일곱 개**가 요약 문장과 한 몸이었다. 시안이 둘을 갈랐다 —
 * 문장은 화면 첫 줄에서 **그 주를 한마디로** 말하고(`WeekMoodSummary`), 이 카드는
 * **하루하루가 어땠는지**를 보여준다. 한 카드 안에 있는 동안에는 「요약을 읽는 눈」과
 * 「일곱 날을 훑는 눈」이 같은 자리에서 겹쳤다.
 *
 * 더미·땅·요일의 규칙은 `WeekEmotionStack` 에 있고, 여기는 **고른 날이 설 자리**만 든다.
 *
 * ## 제목은 이 카드에만 남았다 (2026-09-12)
 *
 * 화면의 카드 제목 셋을 걷었다가(`report.tsx` 머리말) **이 카드만 다시 세웠다**(사용자
 * 결정). 다른 카드는 첫 줄이 곧 제 이름을 말하는데(「이번 주에 찾은 바람들」 · 셈 줄들)
 * 이 카드는 조약돌과 요일뿐이라, 제목이 없으면 무엇을 보는 판인지 말해 주는 글자가
 * 하나도 없다.
 *
 * 제목 줄은 **누른 날의 감정 이름이 서는 자리**이기도 하다(`WeekMoodReveal` · 오른쪽 끝).
 * 줄 높이는 제목(26)이 정하므로 이름이 들어와도 더미가 밀리지 않는다 — 2026-09-11 의
 * 「선택했을 때 위치 안 변하게」가 그대로 지켜진다.
 *
 * ⚠ 좁은 기기(360dp)에서 **감정이 셋 이상인 날**은 이름이 두 줄로 접혀 제목 줄이 늘 수
 * 있다. 드문 날이라 그대로 둔다.
 */
type Props = {
  report: WeeklyReport;
  thisWeek: boolean;
  /** 일기가 있는 날 — 감정 없이 끝난 일기에 빈 조약돌을 놓는 데 쓴다(`WeekEmotionStack`) */
  writtenDates: ReadonlySet<string>;
};

export function WeekEmotionCard({ report, thisWeek, writtenDates }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  // 다른 주로 넘기면 고른 날이 그 주에 없다 — 찾지 못하면 아무것도 적지 않는다
  const picked = report.days.find((d) => d.date === selected) ?? null;

  return (
    <Card padding="loose" style={styles.card}>
      <View testID="week-emotion-head" style={styles.head}>
        {/* 아래 바람카드의 첫 줄(「이번 주에 찾은 바람들」)과 **같은 단·같은 색**이다
            (2026-09-12 · 사용자 요청) — 두 카드가 같은 문법으로 자기를 소개한다.
            행간이 26 이라 제목이 정하던 줄 높이도 그대로다(누른 날 이름이 들어와도 안 밀린다) */}
        <Text variant="body1Reading" color={labelColor.normal} style={styles.title}>
          {thisWeek ? "이번 주 감정들" : "이 주 감정들"}
        </Text>
        {picked != null ? (
          <WeekMoodReveal day={picked} written={writtenDates.has(picked.date)} />
        ) : null}
      </View>
      <WeekEmotionStack
        days={report.days}
        writtenDates={writtenDates}
        selected={selected}
        onSelect={setSelected}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  /**
   * ⚠ **제 둥근 모서리로 잘라 낸다**(`overflow: hidden` · 2026-09-12). 땅이 카드 여백 밖으로
   * 번져 바닥까지 차면서(`WeekEmotionStack`) 아래 두 모서리에서 **네모난 귀퉁이가 삐져나왔다**.
   * `Card` 는 자르지 않는 판이라(그림을 넘치게 두는 카드도 있다) 자르는 쪽을 여기서 켠다.
   */
  card: { gap: space.lg, overflow: "hidden" },
  // 제목과 누른 날의 감정 — 줄 높이는 제목(행간 26)이 정한다. 감정은 가운데로 따로 선다
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  title: { flexShrink: 0 },
});
