import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { cardRipple, motion, radius, restRipple } from "@/design/ds";

/**
 * 쉼터에서 **카드를 누르는 느낌** — 바람카드 · 쉼 콘텐츠 2×2 가 함께 쓴다(2026-09-11 · 사용자 요청).
 *
 * ## 누른 자리에서 물결이 번진다 (2026-09-11 · 사용자 요청)
 *
 * 손끝이 닿은 자리에서 옅은 회색 원이 카드를 다 덮을 만큼 번지며 사라진다(`cardRipple` ·
 * `restRipple` — 옅은 초록 → 짙은 아이보리를 거쳐 2026-09-11 에 회색으로 정했다).
 * 쉼터와 감각연못의 **물결**과 같은 말이고, 손가락 둘레로 번지니 손에 가려도 보인다.
 *
 * - **OS 리플을 쓰지 않는다.** `android_ripple` 은 안드로이드에만 있고 iOS 에는 대응이 없다 —
 *   같은 앱이 기기마다 다르게 반응하지 않도록 두 플랫폼 모두 여기서 그린다
 * - 색이 거의 없는 **회색 그늘**이라 초록처럼 칸을 「골라 놓은」 것으로 읽히지 않는다
 * - 물결은 카드 **모서리 안에서만** 번진다(`radius.large` · 카드와 같은 반경으로 자른다)
 * - 네이티브 드라이버로 도는 크기·투명도 변환이다 — 레이아웃을 건드리지 않는다
 *
 * ### 다 채워진 뒤에 이동한다 (2026-09-11 · 사용자 요청)
 *
 * 누르자마자 넘어가면 물결이 화면 전환에 가려 보이지 않았다(실기기). 그래서 `onPress` 는
 * 물결이 **카드를 다 덮은 뒤**(`cardRipple.duration`) 부른다 — 번지는 동안은 짙기를
 * 지키고, 다 덮은 순간 이동하며 옅어진다(`cardRipple.fade`).
 *
 * - 다 채워지기 전에 **한 번 더 눌러도 한 번만** 간다 — 두 번 넘어가지 않는다
 * - 누르다 스크롤로 빠지면(누름 없이 손을 뗌) 이동하지 않고, 다 번진 뒤 조용히 사라진다
 * - 오래 누르고 있다 떼면 이미 다 찼으니 **곧바로** 간다
 * - 낭독기·키보드의 활성화는 손끝이 없어 카드 가운데에서 채우고 같은 시간 뒤에 간다
 *
 * ### 손끝 자리는 덮개가 받는다
 *
 * 카드 위에 **보이지 않는 덮개**를 한 겹 두고 손짓은 그 덮개가 받는다. 손끝 좌표
 * (`locationX`)는 **실제로 손이 닿은 뷰** 기준이라, 덮개 없이 받으면 카드 안의 글자를 눌렀을 때
 * 글자 상자 기준 좌표가 와서 물결이 엉뚱한 자리에서 시작한다. 카드 전체가 하나의 진입점이라
 * 덮개가 안쪽 손짓을 가로챌 일이 없다.
 *
 * ## 그리고 아래로 눌린다
 *
 * 카드는 손가락 밑에서 `PRESS_DEPTH` 만큼 내려갔다가 떼면 돌아온다 — 물결 이전부터 있던
 * 반응이고 그대로 둔다. 크기는 바뀌지 않는다.
 *
 * 두 가지를 먼저 시도했다가 사용자 요청으로 물렸다:
 *
 * - **크기 줄이기**(버튼·잔디 CTA 의 방식) — 카드는 면이 넓어 출렁이고, 격자에서 한 칸만 줄면 옆 칸과 어긋난다
 * - **초록 물들이기 + 초록 테두리** — 「눌렀다」보다 「골라 놓았다」로 읽혔다. 물결은 초록이 아니고
 *   번지며 곧 사라지며 테두리를 두르지 않아 그렇게 읽히지 않는다
 *
 * ⚠ **그림자는 쓰지 않는다.** 눌린 종이라면 그림자가 함께 엷어져야 맞지만 `DESIGN.md` §5 에서
 * **카드에는 그림자가 없다**(hairline 만) — 없는 것을 이 자리에서 만들지 않는다.
 */
type Props = {
  accessibilityLabel: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** 눌린 동안 내려가는 깊이(dp) — 더 깊으면 카드가 떨어지는 것처럼 보이고, 1 은 눈에 안 띈다 */
const PRESS_DEPTH = 2;

type Wave = { id: number; x: number; y: number; size: number; fading: boolean };
type Size = { width: number; height: number };

export function RestCardPressable({ accessibilityLabel, onPress, style, children }: Props) {
  const [down, setDown] = useState(false);
  // 저장소 관례(`ChatBubble`·`GrassButton`) — ref 는 렌더 중 읽지 않는다
  const [press] = useState(() => new Animated.Value(0));
  const [size, setSize] = useState<Size | null>(null);
  const [waves, setWaves] = useState<Wave[]>([]);
  const nextId = useRef(0);
  /** 지금 번지는 물결과 그 시작 시각 — 「다 채워지기까지 남은 시간」을 여기서 잰다 */
  const active = useRef<{ id: number; at: number } | null>(null);
  /** 이동이 예약된 물결 — 이 물결은 이동하는 순간에 옅어진다(떼는 쪽이 따로 지우지 않는다) */
  const leavingId = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 화면을 떠나면 기다리던 이동·사라짐을 버린다
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  /** 그 물결이 카드를 다 덮기까지 남은 시간 */
  const untilFull = (wave: { at: number }) =>
    Math.max(0, cardRipple.duration - (Date.now() - wave.at));

  const fade = (id: number) => {
    if (active.current?.id === id) active.current = null;
    setWaves((ws) => ws.map((w) => (w.id === id ? { ...w, fading: true } : w)));
  };

  useEffect(() => {
    const run = Animated.timing(press, {
      toValue: down ? 1 : 0,
      duration: motion.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [down, press]);

  /** 손끝 자리에서 물결 하나 — 좌표가 없으면(낭독기 활성화 등) 카드 가운데에서 */
  const spread = (e?: GestureResponderEvent) => {
    if (size == null) return null;
    const touch = e?.nativeEvent;
    const x = Number.isFinite(touch?.locationX) ? touch!.locationX : size.width / 2;
    const y = Number.isFinite(touch?.locationY) ? touch!.locationY : size.height / 2;
    // 손끝에서 가장 먼 모서리까지 닿아야 카드 전체가 한 번 물결에 덮인다
    const reach = Math.hypot(Math.max(x, size.width - x), Math.max(y, size.height - y));
    const id = nextId.current++;
    setWaves((ws) => [...ws, { id, x, y, size: reach * 2, fading: false }]);
    active.current = { id, at: Date.now() };
    return active.current;
  };

  /** 손을 뗐다 — 누름이 뒤따르지 않으면(스크롤로 빠짐) 다 번진 뒤 이동 없이 사라진다 */
  const release = () => {
    setDown(false);
    const wave = active.current;
    if (wave == null) return;
    // 누름은 떼는 것 **바로 뒤에** 온다 — 그래서 판단은 다 번진 시각에 한다
    later(() => {
      if (leavingId.current !== wave.id) fade(wave.id);
    }, untilFull(wave));
  };

  /** 눌렀다 — 물결이 카드를 다 덮은 뒤에 간다. 그 전에 또 눌러도 한 번만 */
  const go = () => {
    if (leavingId.current != null) return;
    const wave = active.current ?? spread();
    if (wave == null) {
      // 크기를 아직 모른다(첫 그림 전) — 채울 물결이 없으니 기다리지 않는다
      onPress();
      return;
    }
    leavingId.current = wave.id;
    later(() => {
      leavingId.current = null;
      onPress();
      fade(wave.id);
    }, untilFull(wave));
  };

  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, PRESS_DEPTH] });

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={go}
      onPressIn={(e) => {
        setDown(true);
        // 이동을 기다리는 동안의 손짓은 새 물결을 만들지 않는다 — 이미 가는 중이다
        if (leavingId.current == null) spread(e);
      }}
      onPressOut={release}
      style={[style, { transform: [{ translateY }] }]}
    >
      {children}
      {/* 손짓을 받는 보이지 않는 덮개 — 물결은 이 안에서 카드 모서리대로 잘린다 */}
      <View
        testID="rest-card-surface"
        onLayout={(e) => setSize(e.nativeEvent.layout)}
        style={styles.surface}
      >
        {waves.map((w) => (
          <CardRipple
            key={w.id}
            wave={w}
            onDone={() => setWaves((ws) => ws.filter((it) => it.id !== w.id))}
          />
        ))}
      </View>
    </AnimatedPressable>
  );
}

/**
 * 물결 하나 — 번져서 카드를 **덮은 채 머물고**, 부모가 `fading` 을 주면 옅어져 스스로 지워진다
 * (끝은 같은 길이의 시계가 말한다 — 네이티브 드라이버의 완료는 jest 에 오지 않는다).
 */
function CardRipple({ wave, onDone }: { wave: Wave; onDone: () => void }) {
  const [progress] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const run = Animated.timing(progress, {
      toValue: 1,
      duration: cardRipple.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [progress]);

  useEffect(() => {
    if (!wave.fading) return;
    const run = Animated.timing(fade, {
      toValue: 0,
      duration: cardRipple.fade,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start();
    const t = setTimeout(onDone, cardRipple.fade);
    return () => {
      run.stop();
      clearTimeout(t);
    };
    // onDone 은 부모가 매 렌더 새로 만든다 — 사라지는 일은 한 번만 잰다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave.fading, fade]);

  const half = wave.size / 2;
  return (
    <Animated.View
      pointerEvents="none"
      testID="rest-card-ripple"
      style={[
        styles.ripple,
        {
          left: wave.x - half,
          top: wave.y - half,
          width: wave.size,
          height: wave.size,
          borderRadius: half,
          // 번지는 동안 짙기를 지킨다 — 다 덮은 모습이 보여야 「채워졌다」가 된다
          opacity: Animated.multiply(
            fade,
            progress.interpolate({
              inputRange: [0, 0.15, 1],
              outputRange: [
                cardRipple.peakOpacity * 0.6,
                cardRipple.peakOpacity,
                cardRipple.peakOpacity,
              ],
            }),
          ),
          transform: [
            {
              scale: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [cardRipple.fromScale, 1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  // 카드와 같은 크기·반경 — 물결이 모서리 밖으로 새지 않는다
  surface: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radius.large,
    overflow: "hidden",
  },
  ripple: { position: "absolute", backgroundColor: restRipple },
});
