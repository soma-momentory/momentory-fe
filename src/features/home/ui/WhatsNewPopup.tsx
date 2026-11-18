import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { Baba } from "@/components/onboarding/OnboardingParts";
import { homeV2, secondary, space, wardrobe, withAlpha } from "@/design/ds";
import { WardrobePopup } from "@/features/wardrobe/ui/WardrobePopup";

import { WHATS_NEW } from "../model/whatsNew";
import { ReflectionButton } from "./v2/HeroCard";

const HEADING = "신규 기능";
const STAGE = wardrobe.popup.glow;

/**
 * 신규 기능 공지 — 업데이트한 기존 사용자가 홈에 처음 들어왔을 때 한 번 뜬다.
 * 일기를 쓴 뒤의 귤 카드와 같은 창(`WardrobePopup`)에 귤 대신 바바를 두고, 큰 제목과 한 문장만 말한다.
 */
export function WhatsNewPopup({ onDismiss }: { onDismiss: () => void }) {
  return (
    <WardrobePopup
      testID="whats-new-popup"
      accessibilityLabel={`${HEADING}. ${WHATS_NEW.message.replace("\n", " ")}`}
      onDismiss={onDismiss}
    >
      <Text variant="title1Hand" color={homeV2.color.ink} style={styles.center}>
        {HEADING}
      </Text>
      <View style={styles.stage}>
        <View style={styles.glow} />
        <Baba size={STAGE} />
      </View>
      <Text variant="title3Hand" color={homeV2.color.ink} style={styles.center}>
        {WHATS_NEW.message}
      </Text>
      <ReflectionButton label="확인" onPress={onDismiss} style={styles.button} />
    </WardrobePopup>
  );
}

const styles = StyleSheet.create({
  stage: { width: STAGE, height: STAGE, alignItems: "center", justifyContent: "center" },
  // 바바 뒤로 번지는 노란 빛 — 귤 카드와 같은 색
  glow: {
    position: "absolute",
    width: STAGE,
    height: STAGE,
    borderRadius: STAGE / 2,
    backgroundColor: withAlpha(secondary.normal, 0.35),
  },
  center: { textAlign: "center" },
  // 팝업이 이미 좌우 여백을 준다 — 천 라벨의 바깥 여백은 뺀다
  button: { alignSelf: "stretch", marginTop: space.md, marginHorizontal: 0 },
});
