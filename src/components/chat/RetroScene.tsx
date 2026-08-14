import { Image, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Hill } from "@/components/common/Hill";
import { CHARACTERS } from "@/components/icons/characters";
import { paperColors } from "@/design/paper";
import theme from "@/design/theme";

/**
 * 회고 화면(`C1`~`C7`)의 배경 층 — 곡선 언덕 + 카피바라
 * (`docs/design/prototype/회고.dc.html`).
 *
 * 시안은 화면 아래 **436/803 지점**에 언덕의 곡선 캡을 세우고 그 아래를 같은
 * 초록(`bg/hill`)으로 채운다. 카피바라(`capybaraAlt` 192px)는 왼쪽 아래에
 * 앉아 말풍선 뒤로 보인다 — **장식이라 보조기술이 읽지 않고 탭도 받지 않는다.**
 *
 * `ScreenBackground` 안에 **첫 자식**으로 두면 뒤에 깔린다. 그 컨테이너는
 * SafeArea 인셋 + 화면 좌우 여백만큼 안으로 들어와 있으므로, 그만큼 음수로
 * 되밀어 **화면 끝까지** 그린다 — 언덕이 여백에서 끊기면 종이 위에 뜬 띠가 된다.
 *
 * 회고 전용이다. 온보딩(`app/(onboarding)/**`)은 리스킨 범위 밖이라 쓰지 않는다.
 */

/** 시안: 언덕 층이 화면 바닥에서 436, 기기 높이 803 */
const HILL_RATIO = 436 / 803;
/** `assets/characters/capybara2-trim.png` — 755×988 */
const CAPYBARA = { width: 192, ratio: 988 / 755 };

export function RetroScene() {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.layer,
        {
          left: -(theme.layout.screenMargin + insets.left),
          right: -(theme.layout.screenMargin + insets.right),
          bottom: -insets.bottom,
          height: height * HILL_RATIO,
        },
      ]}
    >
      {/* 곡선 캡과 이어지는 면 사이에 틈을 만들지 않는다 (`Hill` 주석) */}
      <Hill height="lg" />
      <View style={styles.ground} />

      <Image
        source={CHARACTERS.capybaraAlt}
        resizeMode="contain"
        style={[
          styles.capybara,
          { width: CAPYBARA.width, height: CAPYBARA.width * CAPYBARA.ratio },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute" },
  ground: { flex: 1, backgroundColor: paperColors.bg.hill },
  // 시안 `left:8;bottom:52;opacity:.95`
  capybara: { position: "absolute", left: 8, bottom: 52, opacity: 0.95 },
});
