import { useState } from "react";
import { PanResponder, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { background, fill, label as labelColor, primary, radius, space } from "@/design/ds";

import { Text } from "./Text";

/**
 * Momentory DS — 눈금 슬라이더 (`Diary.dc.html` ③-e 「척도」).
 *
 * **슬라이더가 주인공이고 숫자는 결과값이다** — 시안 주석이 「숫자는 결과값이라
 * Headline 1 Medium 으로 낮춤」이라고 못박았다. 그래서 값이 위에 작게 앉고
 * 아래 두 끝에 말이 붙는다.
 *
 * ## 왜 라이브러리를 안 쓰나
 *
 * `@react-native-community/slider` 는 **네이티브 모듈**이라 dev client 재빌드가
 * 필요하고, 트랙·엄지 모양이 플랫폼 기본값이라 시안(트랙 6 · 엄지 24 · 링 2)을
 * 못 맞춘다. 여기서 필요한 것은 **정수 눈금 하나**뿐이라 `PanResponder` 로 충분하다.
 *
 * **값은 정수로 떨어진다** — 0~10 사이 소수를 만들면 서버로 보낼 때 반올림을
 * 어디서 할지가 또 정해져야 한다.
 */
type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** 두 끝에 붙는 말. 없으면 눈금만 보인다 */
  minLabel?: string;
  maxLabel?: string;
  /** 낭독기가 읽을 이름 — 눈금이 여럿일 때 무엇의 눈금인지 말한다 */
  accessibilityLabel?: string;
  disabled?: boolean;
};

/** 낭독기용 증감 — 한 번에 한 칸 */
const ACTIONS = [{ name: "increment" }, { name: "decrement" }] as const;

/** 엄지 지름. 트랙 양끝에서 반지름만큼 안쪽으로 움직인다 */
const THUMB = 24;
const TRACK = 6;

export function Slider({
  value,
  onChange,
  min,
  max,
  minLabel,
  maxLabel,
  accessibilityLabel,
  disabled = false,
}: Props) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  /** 손가락 x → 눈금. 엄지 반지름을 빼서 **양 끝이 실제로 닿는다** */
  const valueAt = (x: number) => {
    const usable = Math.max(1, width - THUMB);
    const ratio = Math.min(1, Math.max(0, (x - THUMB / 2) / usable));
    return Math.round(min + ratio * (max - min));
  };

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: (e) => onChange(valueAt(e.nativeEvent.locationX)),
    onPanResponderMove: (e) => onChange(valueAt(e.nativeEvent.locationX)),
  });

  const ratio = max === min ? 0 : (value - min) / (max - min);
  // 채움과 엄지는 같은 자리를 가리킨다 — 엄지는 자기 반지름만큼 안쪽에서 움직인다
  const filled = THUMB / 2 + ratio * Math.max(0, width - THUMB);

  return (
    <View style={styles.root}>
      <View style={styles.valueRow}>
        <Text variant="headline1" color={labelColor.strong}>
          {String(value)}
        </Text>
        <Text variant="caption1" color={labelColor.assistive}>
          {` / ${max}`}
        </Text>
      </View>

      <View
        style={styles.track}
        onLayout={onLayout}
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min, max, now: value }}
        accessibilityState={{ disabled }}
        /**
         * ⚠ **끌기만 되면 낭독기로는 쓸 수 없다.** `adjustable` 은 증감 액션이
         * 있어야 스와이프 위/아래로 값을 바꿀 수 있다 — 눈금이 정수라 한 칸씩 움직인다.
         */
        accessibilityActions={ACTIONS}
        onAccessibilityAction={(e) => {
          if (disabled) return;
          const next = e.nativeEvent.actionName === "increment" ? value + 1 : value - 1;
          onChange(Math.min(max, Math.max(min, next)));
        }}
        {...responder.panHandlers}
      >
        <View style={styles.rail} />
        <View style={[styles.fill, { width: filled }]} />
        <View style={[styles.thumb, { left: filled - THUMB / 2 }]} />
      </View>

      {minLabel != null || maxLabel != null ? (
        <View style={styles.ends}>
          <Text variant="caption1" color={labelColor.assistive}>
            {minLabel ?? ""}
          </Text>
          <Text variant="caption1" color={labelColor.assistive}>
            {maxLabel ?? ""}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  valueRow: { flexDirection: "row", alignItems: "baseline" },
  // 엄지가 트랙 밖으로 나가지 않게 높이를 엄지에 맞춘다
  track: { height: THUMB + 4, justifyContent: "center" },
  rail: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: fill.strong,
  },
  fill: {
    position: "absolute",
    left: 0,
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: primary.normal,
  },
  thumb: {
    position: "absolute",
    width: THUMB,
    height: THUMB,
    borderRadius: radius.full,
    backgroundColor: background.elevated,
    borderWidth: 2,
    borderColor: primary.normal,
  },
  ends: { flexDirection: "row", justifyContent: "space-between" },
});
