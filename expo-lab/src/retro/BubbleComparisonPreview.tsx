import { Image, ScrollView, StyleSheet, View } from "react-native";

import { Screen, Text } from "../../../src/components/ds";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { label, space } from "../../../src/design/ds";
import { PreviewBubble, bubbleStyles } from "./PreviewBubble";

export const bubbleComparisonScenarios = [
  { id: "default", label: "짧은 대화 비교" },
  { id: "long", label: "긴 대화 비교" },
];

export function BubbleComparisonPreview({
  scenarioId,
  fontScale = 1,
}: {
  scenarioId: string;
  fontScale?: 1 | 1.3 | 1.5;
}) {
  const question =
    scenarioId === "long"
      ? "지은님, 오늘 다연 생파 일정도 있었네요. 하루 중 가장 기억에 남는 일은 뭐였어요? 그때 어떤 마음이 들었는지도 천천히 이야기해 주세요."
      : "오늘 가장 기억에 남는 순간은요?";
  const answer =
    scenarioId === "long"
      ? "오랜만에 친구들을 만나서 생일을 축하했어요. 바쁜 하루였는데 같이 웃으며 이야기를 나누니 마음이 편안해졌어요."
      : "친구랑 웃으며 이야기했어요.";
  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <Screen>
        <ScrollView
          testID="bubble-comparison-gallery"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.intro}>
            <Text variant="title3Hand">말풍선 4종 비교</Text>
            <Text variant="caption1" color={label.neutral}>
              같은 질문과 답변으로 비교해 보세요.
            </Text>
          </View>
          {bubbleStyles.map((style) => (
            <View key={style.id} testID={`bubble-comparison-${style.id}`} style={styles.group}>
              <View style={styles.heading}>
                <View style={styles.headingText}>
                  <Text variant="headline1">{style.label}</Text>
                  <Text variant="caption1" color={label.neutral}>
                    {style.description}
                  </Text>
                </View>
                {style.reference ? (
                  <Image
                    source={style.reference}
                    accessibilityLabel={`${style.label} 첨부 원본`}
                    style={styles.reference}
                    resizeMode="contain"
                  />
                ) : null}
              </View>
              <PreviewBubble bubbleStyle={style.id}>{question}</PreviewBubble>
              <PreviewBubble bubbleStyle={style.id} variant="answer">
                {answer}
              </PreviewBubble>
            </View>
          ))}
        </ScrollView>
      </Screen>
    </PreviewFontScaleContext.Provider>
  );
}
const styles = StyleSheet.create({
  content: { paddingTop: space.lg, paddingBottom: space.xl, gap: space.xl },
  intro: { gap: space.xs },
  group: { gap: space.sm },
  heading: { flexDirection: "row", alignItems: "center", minHeight: 56, gap: space.sm },
  headingText: { flex: 1, gap: space.xs },
  reference: { width: 92, height: 54, borderRadius: 8 },
});
