import { useState } from "react";
import { Modal as NativeModal, Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import { BottomSheet, IconButton, Text } from "@/components/ds";
import { label, primary, space } from "@/design/ds";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { openExternalLink } from "@/lib/links";

/** MET Norway CC BY 4.0 출처를 날씨 옆 정보 아이콘 안에서 제공한다. */
export function WeatherCredit({ style }: { style?: ViewStyle }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton
        name="circle-info"
        size={16}
        color={label.assistive}
        accessibilityLabel="날씨 정보"
        onPress={() => setOpen(true)}
        hitSlop={12}
        style={{ ...styles.trigger, ...style }}
      />

      <NativeModal
        visible={open}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <BottomSheet title="날씨 정보" onDismiss={() => setOpen(false)}>
          <View style={styles.content}>
            <Text variant="body2Reading" color={label.neutral}>
              현재 위치를 기준으로 일기를 기록한 시각의 예보를 표시해요. 날씨 데이터는 MET Norway가
              제공하며, Momentory에서 설명을 한국어로 번역했어요.
            </Text>
            <Pressable
              accessibilityRole="link"
              onPress={() => void openExternalLink("weather")}
              hitSlop={8}
            >
              <Text variant="label2" color={primary.normal}>
                MET Norway 원본 보기
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => void openExternalLink("weatherLicense")}
              hitSlop={8}
            >
              <Text variant="label2" color={primary.normal}>
                CC BY 4.0 라이선스 보기
              </Text>
            </Pressable>
          </View>
          <ReflectionButton
            testID="weather-credit-ok"
            label="확인"
            onPress={() => setOpen(false)}
            style={styles.ok}
          />
        </BottomSheet>
      </NativeModal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 20, height: 20, opacity: 0.72 },
  content: { gap: space.md },
  // 홈 「일기 작성하기」와 같은 천 라벨 — 시트가 이미 좌우 여백을 준다(2026-11-10)
  ok: { marginTop: 0, marginHorizontal: 0 },
});
