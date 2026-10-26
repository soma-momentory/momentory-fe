import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { Image, StyleSheet, View } from "react-native";

import { pondLayout } from "@/design/ds";

/**
 * 연못 위에 **처음부터 떠 있는 것** — 지금은 수련 꽃 하나
 * (2026-09-05 · 연잎 셋을 걷어내면서 2026-09-06 에 하나만 남았다).
 *
 * ## 배경 한 장으로 끝내지 않는다
 *
 * 수면은 배경 그림이 이미 그리고 있지만, 그 위에 **따로 얹은 것**이 있어야 연못이
 * 한 장의 그림이 아니라 **여러 겹이 겹친 장면**으로 읽힌다. 물 위에 뜬 것과 물속에
 * 비친 것이 같은 층이면 깊이가 사라진다. 배경 그림에도 흰 연꽃이 하나 있어서,
 * 이 분홍 꽃은 한 발 앞쪽에 앉아 그 깊이를 만든다.
 *
 * ## 연잎 셋은 여기 없다 (2026-09-06)
 *
 * `lily-01`~`03` 은 2026-09-05 까지 여기서 **처음부터 떠 있는 장식**이었고, 잠시
 * 「찾을 때마다 하나씩 떠오르는 결과물」이기도 했다. 지금은 **아무 데도 없다** —
 * 손짓의 결과로 무언가 생기면 쉼이 수집이 되고, 처음부터 넷을 얹으면 배경 그림 속
 * 연잎·연꽃과 층이 갈린다. 물 위의 잎과 꽃은 **배경 그림이 그리는 자연 풍경**이다.
 * 그림 파일(`assets/sensory-pond/lily-0*.png`)은 지우지 않고 그대로 둔다.
 *
 * ## 감각 포인트의 자리를 비켜 앉는다
 *
 * 자리는 `pondLayout.decor` 에 있고, 감각 포인트 세 자리에서 **최소 120px 떨어져**
 * 있다(꽃 반지름 + 포인트 번짐 + 여유). 겹치면 포인트가 꽃에 묻혀 못 찾거나, 꽃이
 * 포인트에 가려 장식이 사라진다 — 둘 다 살아 있어야 한다.
 *
 * 손짓을 받지 않는다(`pointerEvents="none"`) — 이 위의 손짓은 **아래 수면**의 몫이다.
 * 낭독기에도 읽히지 않는다: 연못은 「연못」 하나로 읽힌다.
 */
type Props = {
  /** 연못 장면의 크기 — 자리와 크기가 전부 이 비율이다 */
  width: number;
  height: number;
};

/**
 * 장식 그림표 — **가로세로비는 그림의 것**이라 여기 든다(자리·크기는 `pondLayout`).
 * 지금 얹는 것은 수련 꽃 하나뿐이다(2026-09-06).
 */
const ART = {
  // 수련 꽃 — 오른쪽 물가의 「작은 발견」. 배경 그림에도 흰 연꽃이 하나 있어서,
  // 이 분홍 꽃은 **한 발 앞쪽**에 앉아 깊이를 만든다
  flower: {
    source: require("../../../../assets/sensory-pond/touch-flower.png"),
    aspect: 384 / 225,
  },
} as const;

export type PondDecorId = keyof typeof ART;

export function PondDecor({ width, height }: Props) {
  return (
    <View pointerEvents="none" {...decorativeAccessibilityProps} style={styles.layer}>
      {pondLayout.decor.map((it) => {
        const art = ART[it.id];
        const w = width * it.width;
        const h = w / art.aspect;
        return (
          <Image
            key={it.id}
            testID={`pond-decor-${it.id}`}
            source={art.source}
            resizeMode="contain"
            style={{
              position: "absolute",
              left: width * it.x - w / 2,
              top: height * it.y - h / 2,
              width: w,
              height: h,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
});
