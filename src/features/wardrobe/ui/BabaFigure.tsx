import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, StyleSheet } from "react-native";

import { figureLayers, LAYER_RANK } from "../model/figure";
import { NO_OUTFIT, type Outfit } from "../model/types";

/**
 * 꾸민 바바 — 같은 3:4 캔버스에 그린 부품과 아이템을 `model/figure.ts` 순서대로 겹친다.
 * 위치를 코드에서 맞추지 않는다(가장 높은 모자도 캔버스 안이라 상자 크기가 변하지 않는다).
 * 홈 · 회고 · 옷장이 같은 부품을 쓴다. 장식이라 낭독기에서 숨는다 — 누를 자리는 감싸는 쪽이 만든다.
 *
 * **갈아입을 때 앞 모습을 들고 있다** — 옷을 입으면 목 아래 몸을 빼고 옷 그림을 넣는데, 옷 그림이 아직 안 읽혔으면
 * 그 사이에 머리만 남은 바바가 보인다. 그래서 새 모습을 보이지 않게 위에 깔아 두고, 그림이 다 읽히면 그때 바꾼다.
 *
 * **처음 뜰 때도 한 번에 나온다** — 화면을 옮기면 부품이 하나씩 읽히며 뚝뚝 조립돼 보였다(2026-11-17 사용자). 그래서 부품이
 * 다 읽힐 때까지 통째로 숨겼다가 짧게 나타난다. 이 앱에서 한 번 읽은 부품은 `expo-image` 메모리에 남아 다음 화면에서는
 * 기다리지 않고 바로 보인다.
 */
/** 이 앱이 켜진 뒤 한 번이라도 읽은 부품 — 다음 화면의 바바는 이것만으로 이루어지면 숨기지 않는다 */
const SEEN = new Set<number>();
/** 처음 부품이 다 읽혔을 때 나타나는 시간 */
const APPEAR_MS = 140;
export function BabaFigure({ outfit = NO_OUTFIT, width }: { outfit?: Outfit; width: number }) {
  // ponytail: 600 × 800 그림을 그대로 쓴다 — 홈에서 최대 약 290pt 라 3배 화면에서 조금 늘어난다. 흐리면 900 판으로 다시 뽑는다
  const next = figureLayers(outfit);
  const nextKey = next.join(",");
  const [shown, setShown] = useState({ key: nextKey, layers: next });
  const shownSet = new Set(shown.layers);
  const added = next.filter((source) => !shownSet.has(source));
  /**
   * 읽힌 그림 — 장 수가 아니라 **어느 그림인지**로 센다. 옷이 읽히는 도중에 모자를 또 바꾸면 옷 그림은 이미
   * 떠 있어 다시 읽히지 않는다. 장 수로 세면 그 옷 몫을 영영 못 받아 앞 모습에 멈춘다.
   */
  const [loaded, setLoaded] = useState<ReadonlySet<number>>(() => new Set());
  const ready = added.every((source) => loaded.has(source));
  const whole = shown.layers.every((source) => loaded.has(source) || SEEN.has(source));
  const [appear] = useState(() => new Animated.Value(whole ? 1 : 0));
  useEffect(() => {
    if (!whole) return;
    const it = Animated.timing(appear, { toValue: 1, duration: APPEAR_MS, useNativeDriver: true });
    it.start();
    return () => it.stop();
  }, [whole, appear]);

  // 더할 그림이 없거나(벗기만 함) 이미 다 읽혔으면 기다리지 않고 바로 바꾼다(렌더 중 갱신 · React 가 권하는 방식)
  if (shown.key !== nextKey && ready) setShown({ key: nextKey, layers: next });

  // 다 읽혔는지는 다음 렌더의 `ready` 가 보고 바꾼다
  const onLoaded = (source: number) => {
    SEEN.add(source);
    setLoaded((prev) => (prev.has(source) ? prev : new Set(prev).add(source)));
  };

  // 앞 모습과 새 모습을 한 겹으로 섞어 그린다. 새 그림은 다 읽힐 때까지 보이지 않고, 같은 그림은 그대로 남는다
  const union = [...new Set([...shown.layers, ...next])].sort(
    (a, b) => (LAYER_RANK.get(a) ?? 0) - (LAYER_RANK.get(b) ?? 0),
  );
  const pending = shown.key !== nextKey;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height: (width * 4) / 3, opacity: appear }}
    >
      {union.map((source) => {
        return (
          <Image
            key={source}
            testID="baba-layer"
            source={source}
            contentFit="contain"
            cachePolicy="memory"
            // 갈아입기는 위의 두 겹이 맡는다 — 그림마다 페이드를 넣으면 부품이 따로 번진다
            transition={null}
            style={[styles.layer, pending && !shownSet.has(source) ? styles.hidden : null]}
            // 처음 뜰 때 한 번만 불린다 — 보이는 그림도 읽힌 것으로 남겨 둔다
            onLoad={() => onLoaded(source)}
            // 못 읽은 그림이 있어도 갈아입기가 멈추지 않게 읽은 것으로 센다
            onError={() => onLoaded(source)}
          />
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  hidden: { opacity: 0 },
});
