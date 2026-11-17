import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View } from "react-native";

import { Icon, Text } from "@/components/ds";
import { background, fill, label, line, radius, space, wardrobe } from "@/design/ds";

const TANGERINE = require("../../../../assets/baba/wardrobe/tangerine.png");

/** 숫자가 세어 올라가는 시간 · 칩이 톡 커지는 배수 */
const COUNT_MS = 700;
const POP_SCALE = 1.15;

/** 귤 그림 — 장식이라 낭독기는 옆의 숫자와 함께 「귤 N개」로 읽는다 */
export function TangerineIcon({ size }: { size: number }) {
  return (
    <Image
      source={TANGERINE}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/**
 * 가진 귤 — 귤 그림과 숫자를 한 알약에 담는다. `onPress` 를 주면 오른쪽에 「+」가 붙고, 눌러서 「귤 모으기」를 연다.
 * 귤이 늘면 숫자가 세어 올라가고 칩이 한 번 톡 커진다 — 받은 것을 눈으로 확인하게. 줄면(사기) 바로 바뀐다.
 */
export function TangerineChip({ count, onPress }: { count: number; onPress?: () => void }) {
  const [shown, setShown] = useState(count);
  // 저장소 관례(`ChatBubble`) — Animated 값은 state 로 한 번 만든다
  const [value] = useState(() => new Animated.Value(count));
  const [pop] = useState(() => new Animated.Value(1));
  const last = useRef(count);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => setShown(Math.round(v)));
    return () => value.removeListener(id);
  }, [value]);

  useEffect(() => {
    const from = last.current;
    last.current = count;
    if (count <= from) {
      value.setValue(count);
      return;
    }
    const it = Animated.parallel([
      Animated.timing(value, {
        toValue: count,
        duration: COUNT_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(pop, { toValue: POP_SCALE, duration: 140, useNativeDriver: true }),
        Animated.spring(pop, { toValue: 1, stiffness: 300, damping: 14, useNativeDriver: true }),
      ]),
    ]);
    it.start();
    return () => it.stop();
  }, [count, value, pop]);

  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <Pressable
        testID="tangerine-chip"
        disabled={onPress == null}
        onPress={onPress}
        accessibilityRole={onPress != null ? "button" : undefined}
        accessibilityLabel={`귤 ${count}개${onPress != null ? ", 귤 모으기" : ""}`}
        hitSlop={space.sm}
        style={[styles.chip, onPress != null ? styles.chipWithPlus : null]}
      >
        <TangerineIcon size={wardrobe.chip.icon} />
        <Text variant="label1" color={label.normal}>
          {shown}
        </Text>
        {onPress != null ? (
          <View style={styles.plus}>
            <Icon name="plus" size={16} color={label.normal} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: wardrobe.chip.gap,
    height: wardrobe.chip.height,
    paddingLeft: space.sm,
    paddingRight: space.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: line.neutral,
    backgroundColor: background.elevated,
  },
  chipWithPlus: { paddingRight: space.xs },
  plus: {
    width: wardrobe.chip.plus,
    height: wardrobe.chip.plus,
    marginLeft: space.xs2,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fill.normal,
  },
});
