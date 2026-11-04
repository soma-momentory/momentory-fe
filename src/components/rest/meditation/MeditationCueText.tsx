import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { meditation, meditationMotion, meditationSize } from "@/design/ds";

/**
 * 재생 중의 자막 — 구간이 바뀌면 같은 자리에서 옅어졌다 돌아온다(`DESIGN.md` 「쉼 콘텐츠 공통 규칙」 3).
 * 음성이 끝나 `text` 가 비면 천천히 사라지고, 낭독기에서도 빠진다.
 * 갈아 끼우는 순간은 타이머가 정한다 — 네이티브 드라이버의 완료 콜백은 테스트에 오지 않는다.
 */
export function MeditationCueText({ text, paused }: { text: string | null; paused: boolean }) {
  const [shown, setShown] = useState(text ?? "");
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (text == null) {
      Animated.timing(fade, {
        toValue: 0,
        duration: meditationMotion.cueHide,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (text === shown) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: meditationMotion.cueOut,
      useNativeDriver: true,
    }).start();
    const swap = setTimeout(() => {
      setShown(text);
      Animated.timing(fade, {
        toValue: 1,
        duration: meditationMotion.cueIn,
        useNativeDriver: true,
      }).start();
    }, meditationMotion.cueOut);
    return () => clearTimeout(swap);
  }, [text, shown, fade]);

  return (
    <Animated.View
      testID="meditation-cue"
      accessible={text != null}
      accessibilityElementsHidden={text == null}
      importantForAccessibility={text == null ? "no-hide-descendants" : "auto"}
      accessibilityLabel={shown}
      accessibilityLiveRegion="polite"
      style={[styles.line, { opacity: fade }]}
    >
      {shown.split(" ").map((word, i) => (
        <Text
          key={`${i}-${word}`}
          variant="meditationCue"
          color={paused ? meditation.onScenePaused : meditation.onScene}
          style={styles.word}
        >
          {word}
        </Text>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // 낱말을 칸으로 세운다 — 한 덩어리 글이면 「생각해봅니/다」처럼 낱말 가운데서 접혔다
  line: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: meditationSize.cueWordGap,
  },
  word: {
    textShadowColor: meditation.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 14,
  },
});
