import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { homeV2, secondary, space, wardrobe, withAlpha } from "@/design/ds";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";

import { TangerineIcon } from "./Tangerine";
import { WardrobePopup } from "./WardrobePopup";

const WELCOME_AMOUNT = 100;

/**
 * 옷장 첫 선물 — 옷장을 처음 열면(아직 안 받았으면) 뜬다. 받으면 귤 칩 숫자가 바로 오른다.
 * 값은 서버 `TangerineReason.WELCOME` 과 같다(바꾸면 함께 바꾼다).
 * 종이 스티커 결 — 손글씨 제목 · 홈과 같은 초록 천 라벨 버튼(`ReflectionButton`).
 */
export function WelcomePopup({
  busy,
  onAccept,
  onDismiss,
}: {
  /** 받는 중 — 버튼을 막는다 */
  busy: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <WardrobePopup
      testID="welcome-popup"
      accessibilityLabel={`옷장에 온 걸 환영해요. 첫 선물로 귤 ${WELCOME_AMOUNT}개를 드릴게요`}
      onDismiss={onDismiss}
    >
      <View style={styles.gift}>
        <View style={styles.glow} />
        <TangerineIcon size={wardrobe.popup.gift} />
      </View>
      <Text variant="title3Hand" color={homeV2.color.ink} style={styles.center}>
        옷장에 온 걸 환영해요
      </Text>
      <Text style={styles.note} color={homeV2.color.muted}>
        첫 선물로 귤 {WELCOME_AMOUNT}개를 드릴게요{"\n"}바바에게 어울리는 옷을 골라 주세요
      </Text>
      <ReflectionButton label="받기" disabled={busy} onPress={onAccept} style={styles.button} />
    </WardrobePopup>
  );
}

const G = wardrobe.popup.glow;

const styles = StyleSheet.create({
  gift: { width: G, height: G, alignItems: "center", justifyContent: "center" },
  // 귤 뒤로 번지는 노란 빛 — 귤 축하 카드와 같은 색
  glow: {
    position: "absolute",
    width: G,
    height: G,
    borderRadius: G / 2,
    backgroundColor: withAlpha(secondary.normal, 0.35),
  },
  center: { textAlign: "center" },
  note: {
    fontFamily: homeV2.font.regular,
    ...homeV2.type.note,
    textAlign: "center",
    marginBottom: space.xs,
  },
  // 팝업이 이미 좌우 여백을 준다 — 천 라벨의 바깥 여백은 뺀다
  button: { alignSelf: "stretch", marginTop: space.xs, marginHorizontal: 0 },
});
