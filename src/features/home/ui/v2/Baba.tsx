import { View } from "react-native";

import { homeV2 } from "@/design/ds";
import type { Outfit } from "@/features/wardrobe/model/types";
import { BabaFigure } from "@/features/wardrobe/ui/BabaFigure";

/**
 * 홈 v2 의 **바바** — 꾸미기 부품을 겹친 카피바라(2026-11-17 부터 `wardrobe/ui/BabaFigure`).
 *
 * - **장식이다** — 낭독기에서 숨는다. 누르면 옷장이 열리는 자리는 감싸는 `HeroCard` 가 만든다
 * - **손짓이 없다** — 옛 `HomeCapybara` 는 누르면 팔 든 장으로 갈아 끼웠지만 바바에는 그 장이 없다.
 *   `DESIGN.md` 「손짓은 그림이 하고 코드는 갈아 끼우기만」에 따라 **코드로 흉내 내지 않는다**
 * - 입은 것이 없으면 기본 바바다(강제 업데이트 화면처럼 서버를 모르는 곳도 그대로 쓴다)
 */
export function Baba({ scale = 1, outfit }: { scale?: number; outfit?: Outfit }) {
  return (
    <View
      testID="home-v2-baba"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: homeV2.size.baba.height * scale }}
    >
      <BabaFigure outfit={outfit} width={homeV2.size.baba.width * scale} />
    </View>
  );
}
