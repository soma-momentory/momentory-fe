import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { label as labelColor, space } from "@/design/ds";

import { Text } from "./Text";

/**
 * 구역의 머리 — `01 Core Components.dc.html` 의 `SectionHeader`.
 *
 * **제목 + (설명) + (오른쪽 행동)** 한 벌이다. 홈이 한 화면에서 두 크기를 쓴다:
 * 「오늘 일정 / N개 남음 / ＋ 추가」(`medium`)와 「이번 주 감정 / 전체보기」(`small`).
 *
 * ## 크기 두 단만 둔다
 *
 * - `medium` — 제목 `headline1`(18/26 600). 시안 주석의 「22px Bold → Heading 2」가
 *   가리키는 자리인데 `design.md` §2 스케일에 Heading 2 가 없다. **스케일에
 *   13번째를 만들지 않는다**(로그인에서 정한 판정 · `PLAN.md` A-7)라 한 단 아래인
 *   `headline1` 을 쓴다 — 날짜(`title3` 24)와 본문(16) 사이의 자리다
 * - `small` — 제목 `label2`(13/18 600) · `label.alternative`. 카드 위가 아니라
 *   본문 흐름 안에서 묶음을 나누는 자리다(시안의 「이번 주 감정」이 그렇다)
 *
 * 설명은 제목 **아래**에 붙는다 — 오른쪽에 두면 행동(`trailing`)과 자리를 다툰다.
 */
type Props = {
  title: string;
  /** 제목 아래 한 줄. 「N개 남음」처럼 **사실**만 적는다 — 진행률·점수가 아니다 */
  description?: string;
  /** 오른쪽 행동 — Text Button(＋ 추가 · 전체보기) 또는 Icon Button */
  trailing?: ReactNode;
  size?: "medium" | "small";
};

export function SectionHeader({ title, description, trailing, size = "medium" }: Props) {
  const medium = size === "medium";

  return (
    <View style={styles.root}>
      <View style={styles.line}>
        <Text
          variant={medium ? "headline1" : "label2"}
          color={medium ? labelColor.strong : labelColor.alternative}
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </Text>
        {trailing}
      </View>
      {description != null ? (
        <Text variant="caption1" color={labelColor.alternative}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.xs, paddingBottom: space.sm },
  // 제목과 행동은 **바닥선을 맞춘다** — 크기가 달라도 한 줄로 읽힌다
  line: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: space.md,
  },
  title: { flexShrink: 1 },
});
