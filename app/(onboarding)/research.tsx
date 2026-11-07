import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";

import { BottomSheet, Text } from "@/components/ds";
import { OnboardingFrame, TextLink } from "@/components/onboarding/OnboardingParts";
import {
  background,
  fontFamily,
  label as labelColor,
  line,
  onboardingArt,
  space,
} from "@/design/ds";
import { RESEARCH, RESEARCH_DETAILS, RESEARCH_NOTE } from "@/features/onboarding/model/flow";

// 그래프 선 — `proto-v2.html` 의 곡선 그대로(일주일 동안 다시 떠오른 횟수)
const CALM =
  "M8.0,145.0 C13.0,143.1 28.0,136.9 38.0,133.5 C48.0,130.1 58.0,127.2 68.0,124.3 C78.0,121.4 88.0,118.9 98.0,116.2 C108.0,113.6 118.0,110.7 128.0,108.2 C138.0,105.7 148.0,103.4 158.0,101.3 C168.0,99.2 178.0,97.2 188.0,95.6 C198.0,93.9 213.0,92.0 218.0,91.3";
const LOOP =
  "M8.0,145.0 C13.0,141.4 28.0,129.7 38.0,123.2 C48.0,116.6 58.0,111.7 68.0,105.9 C78.0,100.2 88.0,94.2 98.0,88.7 C108.0,83.1 118.0,77.5 128.0,72.5 C138.0,67.6 148.0,63.5 158.0,58.8 C168.0,54.0 178.0,48.5 188.0,43.8 C198.0,39.1 213.0,32.9 218.0,30.7";
const CROSSES = [
  [34, 119.2],
  [64, 101.9],
  [124, 68.5],
  [154, 54.8],
  [184, 39.8],
] as const;

/** 연구 그래프 — 「다음」 · 「건너뛰기」 모두 지금 첫 회고로. 「연구 자세히 보기」는 시트로 연다 */
export default function Research() {
  const [open, setOpen] = useState(false);
  const next = () => router.push("/now");

  return (
    <>
      <OnboardingFrame
        onSkip={next}
        art={
          <View style={styles.chart}>
            <Svg
              width="100%"
              height={190}
              viewBox="0 0 256 165"
              accessibilityRole="image"
              accessibilityLabel="일주일 동안 다시 떠오른 횟수, 혼자 되새긴 사람 9.9회, 떨어져서 돌아본 사람 4.7회"
            >
              <Defs>
                <LinearGradient id="calm" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={onboardingArt.reflection} stopOpacity={0.32} />
                  <Stop offset="1" stopColor={onboardingArt.reflection} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Line x1={8} x2={218} y1={145} y2={145} stroke={line.neutral} />
              <Path d={`${CALM} L218,145 L8,145 Z`} fill="url(#calm)" />
              <Path
                d={LOOP}
                fill="none"
                stroke={onboardingArt.rumination}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
              {CROSSES.map(([x, y]) => (
                <Path
                  key={x}
                  d={`M${x},${y}l8,8m0,-8l-8,8`}
                  stroke={onboardingArt.rumination}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              ))}
              <Path
                d={CALM}
                fill="none"
                stroke={onboardingArt.reflection}
                strokeWidth={4}
                strokeLinecap="round"
              />
              <Circle cx={218} cy={91.3} r={11} fill={onboardingArt.reflection} opacity={0.18} />
              <Circle
                cx={218}
                cy={91.3}
                r={6}
                fill={background.elevated}
                stroke={onboardingArt.reflection}
                strokeWidth={3}
              />
              <Circle cx={218} cy={30.7} r={5} fill={onboardingArt.rumination} />
              <SvgText
                x={227}
                y={35.7}
                fill={onboardingArt.rumination}
                fontFamily={fontFamily.hand}
                fontSize={15}
              >
                9.9회
              </SvgText>
              <SvgText
                x={229}
                y={97.3}
                fill={onboardingArt.reflection}
                fontFamily={fontFamily.hand}
                fontSize={20}
              >
                4.7회
              </SvgText>
              <SvgText
                x={8}
                y={161}
                fill={labelColor.alternative}
                fontFamily={fontFamily.hand}
                fontSize={14}
              >
                그날
              </SvgText>
              <SvgText
                x={218}
                y={161}
                fill={labelColor.alternative}
                fontFamily={fontFamily.hand}
                fontSize={14}
                textAnchor="end"
              >
                일주일
              </SvgText>
            </Svg>
            <View style={styles.legend}>
              <Legend color={onboardingArt.reflection} label="떨어져서 돌아본 사람" />
              <Legend color={onboardingArt.rumination} label="혼자 되새긴 사람" />
              <Text variant="caption1" color={labelColor.neutral}>
                ✕ 또 떠오름
              </Text>
            </View>
          </View>
        }
        title={RESEARCH.title}
        body={RESEARCH.body}
        cite={RESEARCH.cite}
        primary={{ label: "다음", onPress: next }}
        secondary={{ label: "연구 자세히 보기 ›", onPress: () => setOpen(true) }}
      />

      {open ? (
        <BottomSheet title="연구 자세히 보기" onDismiss={() => setOpen(false)}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetList}
            showsVerticalScrollIndicator={false}
          >
            {RESEARCH_DETAILS.map((d) => (
              <View key={d.title} style={styles.item}>
                <Text variant="body1" color={labelColor.strong}>
                  {d.title}
                </Text>
                <Text variant="body2Reading" color={labelColor.neutral}>
                  {d.body}
                </Text>
                <Text variant="caption2" color={labelColor.alternative}>
                  {d.source}
                </Text>
              </View>
            ))}
            <Text variant="caption1" color={labelColor.alternative}>
              {RESEARCH_NOTE}
            </Text>
          </ScrollView>
          <TextLink label="닫기" onPress={() => setOpen(false)} />
        </BottomSheet>
      ) : null}
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text variant="caption1" color={labelColor.neutral}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { alignSelf: "stretch" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: space.md,
    marginTop: space.sm,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: space.xs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  sheet: { maxHeight: 420 },
  sheetList: { gap: space.sm },
  item: { backgroundColor: background.elevated, borderRadius: 12, padding: 10, gap: 2 },
});
