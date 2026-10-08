import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";

import { Text } from "@/components/ds";
import { label, space } from "@/design/ds";
import { notebook } from "@/design/ds/notebook";
import type { EmotionId } from "@/features/emotion/model/emotion";

import { emotionName } from "@/features/emotion/model/emotion";

/** 상세 화면 전용의 촘촘한 모눈종이. 장식은 접근성 읽기 순서에서 제외한다. */
export function NotebookBackground() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs>
        <Pattern
          id="diary-paper-grid"
          width={notebook.gridSize}
          height={notebook.gridSize}
          patternUnits="userSpaceOnUse"
        >
          <Path
            d={`M ${notebook.gridSize} 0 H 0 V ${notebook.gridSize}`}
            fill="none"
            stroke={notebook.gridStroke}
            strokeWidth={0.6}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill={notebook.paper} />
      <Rect width="100%" height="100%" fill="url(#diary-paper-grid)" />
    </Svg>
  );
}

/**
 * 원본 노트의 왼쪽 그림(카피바라 · 「오늘의 일기」) — 투명 바탕 잉크 그림이라 앱의 종이색과
 * 모눈이 그대로 비친다. 원본 위에 SVG `feColorMatrix` 를 걸던 것을 미리 구웠다 — iOS 의
 * Core Image 필터가 알파를 자르지 않아 선이 하얗게 날아갔다(2026-10-08 ·
 * `scripts/make-diary-notebook-ink.py`).
 */
function OriginalDiaryDrawing() {
  return (
    <Image
      source={require("../../../assets/diary/notebook-capybara.png")}
      contentFit="contain"
      transition={0}
      style={styles.drawing}
      accessible={false}
    />
  );
}

export function DiaryNotebookHeader({
  date,
  weather,
  weatherStatus,
  emotions,
}: {
  date: string;
  weather: string | null;
  weatherStatus?: string | null;
  emotions: readonly EmotionId[];
}) {
  const weatherLabel = weather?.replace(/\s*·\s*-?\d+(?:\.\d+)?℃\s*$/, "").trim();

  return (
    <View style={styles.header}>
      <View
        style={styles.illustration}
        accessible
        accessibilityLabel="오늘의 일기"
        accessibilityRole="header"
      >
        <OriginalDiaryDrawing />
      </View>
      <View style={styles.details}>
        <Metadata label="Date." value={date} line="date" />
        <Metadata
          label="Weather."
          value={weatherLabel || weatherStatus || "기록 없음"}
          line="weather"
        />
        <View style={styles.field}>
          <Text variant="label1Hand" color={notebook.ink}>
            Mood.
          </Text>
          <View style={styles.value}>
            {emotions.length > 0 ? (
              <View style={styles.emotions}>
                {emotions.map((emotion, index) => (
                  <Text key={`${emotion}-${index}`} variant="label1Hand" color={label.normal}>
                    {emotionName(emotion)}
                  </Text>
                ))}
              </View>
            ) : (
              <Text variant="label1Hand" color={label.alternative}>
                기록 없음
              </Text>
            )}
            <OriginalUnderline variant="mood" />
          </View>
        </View>
      </View>
    </View>
  );
}

// 원본 노트에 그려진 밑줄 셋 — 선을 다시 그리지 않고 원본에서 잘라 구운 그림이다(그림과 같은 스크립트)
const underlines = {
  date: require("../../../assets/diary/notebook-line-date.png"),
  weather: require("../../../assets/diary/notebook-line-weather.png"),
  mood: require("../../../assets/diary/notebook-line-mood.png"),
} as const;

function OriginalUnderline({ variant }: { variant: keyof typeof underlines }) {
  return (
    <Image
      source={underlines[variant]}
      contentFit="fill"
      transition={0}
      style={styles.underline}
      pointerEvents="none"
      accessible={false}
    />
  );
}

function Metadata({
  label: title,
  value,
  line,
}: {
  label: string;
  value: string;
  line: "date" | "weather";
}) {
  return (
    <View style={styles.field}>
      <Text variant="label1Hand" color={notebook.ink}>
        {title}
      </Text>
      <View style={styles.value}>
        <Text variant="label1Hand" color={label.normal} style={styles.valueText}>
          {value}
        </Text>
        <OriginalUnderline variant={line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
    paddingTop: space.md,
  },
  illustration: { flexGrow: 1, flexBasis: 128 },
  details: { flexGrow: 1, flexBasis: 168, gap: space.md },
  field: { flexDirection: "row", alignItems: "baseline", gap: space.sm },
  emotions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: space.sm,
  },
  drawing: { width: "100%", height: 132 },
  underline: { position: "absolute", left: 0, bottom: 0, width: "100%", height: 4.5, opacity: 0.8 },
  value: {
    flex: 1,
    minWidth: 0,
    minHeight: 28,
    paddingBottom: space.sm,
  },
  valueText: { textAlign: "center" },
});
