import { StyleSheet, View } from "react-native";
import Svg, { Defs, FeColorMatrix, Filter, Image, Path, Pattern, Rect } from "react-native-svg";

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

/** 원본을 다시 그리지 않고 왼쪽 그림 영역만 보여준다.
 * 밝은 종이/격자만 투명하게 표시해 앱의 종이색과 모눈을 그대로 비춘다.
 */
function OriginalDiaryDrawing() {
  return (
    <Svg width="100%" height={132} viewBox="30 20 490 365" accessible={false}>
      <Defs>
        <Filter id="diary-original-ink" x="0%" y="0%" width="100%" height="100%">
          <FeColorMatrix
            type="matrix"
            values="0 0 0 0 0.24  0 0 0 0 0.22  0 0 0 0 0.19  -2 -2 -2 0 5.1"
          />
        </Filter>
      </Defs>
      <Image
        href={require("../../../assets/diary/notebook-reference.png")}
        x={0}
        y={0}
        width={1055}
        height={1491}
        filter="url(#diary-original-ink)"
      />
    </Svg>
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

// 첨부 원본에서 각 밑줄이 그려진 영역만 표시한다. 선을 재생성하지 않는다.
const underlineRegions = {
  date: "725 114 216 16",
  weather: "767 204 212 17",
  mood: "725 291 263 23",
} as const;

function OriginalUnderline({ variant }: { variant: keyof typeof underlineRegions }) {
  const filterId = `diary-original-line-${variant}`;
  return (
    <Svg
      style={styles.underline}
      width="100%"
      height={4.5}
      viewBox={underlineRegions[variant]}
      opacity={0.8}
      preserveAspectRatio="none"
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <Filter id={filterId} x="0%" y="0%" width="100%" height="100%">
          <FeColorMatrix
            type="matrix"
            values="0 0 0 0 0.24  0 0 0 0 0.22  0 0 0 0 0.19  -2 -2 -2 0 5.1"
          />
        </Filter>
      </Defs>
      <Image
        href={require("../../../assets/diary/notebook-reference.png")}
        x={0}
        y={0}
        width={1055}
        height={1491}
        filter={`url(#${filterId})`}
      />
    </Svg>
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
  underline: { position: "absolute", left: 0, bottom: 0 },
  value: {
    flex: 1,
    minWidth: 0,
    minHeight: 28,
    paddingBottom: space.sm,
  },
  valueText: { textAlign: "center" },
});
