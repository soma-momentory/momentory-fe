import { Image, StyleSheet, View } from "react-native";

import { homeV2 } from "@/design/ds";

/**
 * 홈 v2 의 **바바** — 레이어 9장을 겹친 카피바라(계획 §2.5 · HD-6).
 *
 * - **장식이다** — 낭독기에서 숨고 손짓을 받지 않는다. 회고로 가는 문은 「일기 작성하기」 하나다
 * - **손짓이 없다** — 옛 `HomeCapybara` 는 누르면 팔 든 장으로 갈아 끼웠지만 바바에는 그 장이 없다.
 *   `DESIGN.md` 「손짓은 그림이 하고 코드는 갈아 끼우기만」에 따라 **코드로 흉내 내지 않는다**
 * - 레이어 순서는 `assets/home/v2/README.md` 표와 같다(아래 → 위)
 */
const LAYERS = [
  require("../../../../../assets/home/v2/baba/base-tail.webp"),
  require("../../../../../assets/home/v2/baba/base-body.webp"),
  require("../../../../../assets/home/v2/baba/base-feet.webp"),
  require("../../../../../assets/home/v2/baba/base-arms.webp"),
  require("../../../../../assets/home/v2/baba/base-muzzle.webp"),
  require("../../../../../assets/home/v2/baba/base-mouth.webp"),
  require("../../../../../assets/home/v2/baba/base-cheeks.webp"),
  require("../../../../../assets/home/v2/baba/base-eyes.webp"),
  require("../../../../../assets/home/v2/baba/base-ears.webp"),
] as const;

/** `scale` — 카드 크기에 맞춰 키우거나 줄인다. 레이어는 그대로다 */
export function Baba({ scale = 1 }: { scale?: number }) {
  return (
    <View
      testID="home-v2-baba"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: homeV2.size.baba.width * scale, height: homeV2.size.baba.height * scale }}
    >
      {LAYERS.map((source, i) => (
        <Image key={i} source={source} resizeMode="contain" style={styles.layer} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
});
