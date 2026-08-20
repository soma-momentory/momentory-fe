import { useRef } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { fill, fontFamily, label as labelColor, radius, size, space } from "@/design/ds";

import { Text } from "./Text";

/**
 * 세로 휠 — `DESIGN.md` §11 「시간 선택」.
 *
 * > 세로 휠 3개(오전·오후 / 시 1~12 / 분 5분 단위) · **40px 행** ·
 * > 중앙 하이라이트 밴드 · `완료`
 *
 * **열을 따로 쓰지 않고 하나가 다 그린다.** 하이라이트 밴드가 열 전체에 걸쳐
 * 하나여야 해서다 — 열마다 밴드를 그리면 사이가 끊긴다.
 *
 * ## 왜 커스텀인가
 *
 * OS 피커(`@react-native-community/datetimepicker`)는 플랫폼 모양을 그대로 쓰는데
 * 시안이 자체 휠을 정의한다. **온보딩(08)과 마이(M2)가 같은 것을 쓴다** —
 * 시안에선 두 파일에 각각 인라인이었다(`EXPORT_MANIFEST` §4).
 *
 * ## 스냅
 *
 * `snapToInterval` 로 행에 맞춰 서고, 멈춘 위치에서 값을 읽는다. 항목을 직접
 * 눌러도 고를 수 있다 — 스크롤만 되면 **보조기술로 못 고른다**.
 */
export type WheelColumn = {
  key: string;
  /** 낭독기가 읽을 이름 — 「오전·오후」·「시」·「분」 */
  label: string;
  items: readonly string[];
  value: string;
  onChange: (value: string) => void;
  /** 라벨 길이에 맞춘 열 너비 */
  width: number;
  /** 화면에 보이는 문자열. 없으면 값 그대로 */
  format?: (value: string) => string;
};

/** 시안 값 — 행 40 · 보이는 칸 5개(중앙 + 위아래 2칸) */
const ROW = size.sheet.wheelRow;
const VISIBLE = 5;
const HEIGHT = ROW * VISIBLE;
const PAD = (HEIGHT - ROW) / 2;

export function WheelPicker({ columns }: { columns: readonly WheelColumn[] }) {
  return (
    <View style={styles.root}>
      {/* 중앙 하이라이트 밴드 — 열들 위에 걸쳐 하나만 그린다 */}
      <View pointerEvents="none" style={styles.band} />
      {columns.map((c) => (
        <WheelColumnView key={c.key} column={c} />
      ))}
    </View>
  );
}

function WheelColumnView({ column }: { column: WheelColumn }) {
  const ref = useRef<ScrollView>(null);
  const selected = column.items.indexOf(column.value);

  const onSettle = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / ROW);
    const next = column.items[Math.max(0, Math.min(i, column.items.length - 1))];
    if (next != null && next !== column.value) column.onChange(next);
  };

  return (
    <ScrollView
      ref={ref}
      accessibilityLabel={column.label}
      style={[styles.column, { width: column.width }]}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
      snapToInterval={ROW}
      decelerationRate="fast"
      // 처음 열릴 때 고른 값이 가운데 오게. 이후엔 사용자가 굴린다
      contentOffset={{ x: 0, y: Math.max(0, selected) * ROW }}
      onMomentumScrollEnd={onSettle}
      // 손을 뗐는데 관성이 없으면 momentum 이 안 온다 — 그때도 값을 읽는다
      onScrollEndDrag={onSettle}
    >
      {column.items.map((item) => {
        const on = item === column.value;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => column.onChange(item)}
            style={styles.row}
          >
            {/* 고른 값은 굵기와 색이 함께 바뀐다 — 밴드(면)만으로 말하지 않는다 */}
            <Text
              style={[styles.item, on ? styles.itemOn : null]}
              color={on ? labelColor.strong : labelColor.assistive}
            >
              {column.format ? column.format(item) : item}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xs,
    height: HEIGHT,
    paddingVertical: space.xs,
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: PAD + space.xs,
    height: ROW,
    borderRadius: radius.small,
    backgroundColor: fill.normal,
  },
  column: { height: HEIGHT },
  // 위아래로 빈 칸을 둬야 첫·마지막 항목도 가운데에 설 수 있다
  columnContent: { paddingVertical: PAD },
  row: { height: ROW, alignItems: "center", justifyContent: "center" },
  // 17/24 — 시안 값. 타입 스케일의 headline1(18/26) 과 다른 한 칸이라 여기 둔다
  item: { fontFamily: fontFamily.regular, fontSize: 17, lineHeight: 24 },
  itemOn: { fontFamily: fontFamily.semibold },
});
