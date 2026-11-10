import { Modal as NativeModal, Pressable, StyleSheet, View } from "react-native";

import { BottomSheet, Text } from "@/components/ds";
import { label as labelColor, primary, space } from "@/design/ds";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { formatWeatherUpdatedAt } from "@/features/home/model/weather";
import { clock } from "@/lib/clock";
import { openExternalLink } from "@/lib/links";

/**
 * 홈 날씨의 **출처와 갱신 시각** 시트(HW-5 · 계획 §4.6) — 스티커를 누르면 열린다.
 *
 * - 출처 이름은 **`source` prop 을 그대로** 쓴다(CP-1 「실제 출처」 — BE 가 출처를 바꾸면 따라간다).
 *   링크 주소만 `lib/links.ts` 의 `weather` · `weatherLicense` 다 — 서버가 준 URL 은 열지 않는다.
 * - 홈은 「지금 있는 곳의 예보」다. 일기 ⓘ(`components/diary/WeatherCredit.tsx` — 「일기를 기록한 시각의
 *   예보」)와 문안이 달라 **따로 둔다**(결정 D1 — 일기 ⓘ 는 이번에 그대로 · 합치는 것은 후속).
 * - 오류 안내가 아니라 사용자가 연 정보 시트다 — 모달 금지 규칙(오류 · 거부)과 무관하다(일기 ⓘ 선례).
 *
 * ⚠ 문안은 CP-1 최종 검토 전이다.
 */
export function WeatherCreditSheet({
  visible,
  onDismiss,
  source,
  label,
  temperatureC,
  updatedAt,
}: {
  visible: boolean;
  onDismiss: () => void;
  source: string;
  label?: string;
  temperatureC?: number | null;
  updatedAt?: string;
}) {
  const summary =
    label == null ? null : temperatureC == null ? label : `${label} · ${temperatureC}℃`;
  // 「오늘인가」를 가르는 지금 — 시각의 단일 공급자(`lib/clock.ts`)를 지난다
  const updated = updatedAt == null ? "" : formatWeatherUpdatedAt(updatedAt, clock.now().getTime());

  return (
    <NativeModal
      visible={visible}
      transparent
      // 움직임은 `BottomSheet` 가 맡는다 — 딤은 제자리에서 짙어지고 시트만 올라온다(홈의 일정 · 이번 주 감정과 같다).
      // "slide" 를 주면 딤까지 함께 밀려 올라온다
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <BottomSheet title="날씨 정보" onDismiss={onDismiss}>
        <View style={styles.content}>
          {summary != null && (
            <Text variant="headline1" color={labelColor.strong}>
              {summary}
            </Text>
          )}
          <Text variant="body2Reading" color={labelColor.neutral}>
            {updated === "" ? `${source} 예보` : `${source} 예보 · ${updated}`}
          </Text>
          <Text variant="body2Reading" color={labelColor.neutral}>
            지금 있는 곳의 예보를 보여 드려요. 설명은 Momentory가 한국어로 옮겼어요.
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
          onPress={onDismiss}
          style={styles.ok}
        />
      </BottomSheet>
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  // 홈 「일기 작성하기」와 같은 천 라벨 — 시트가 이미 좌우 여백을 준다(2026-11-10)
  ok: { marginTop: 0, marginHorizontal: 0 },
});
