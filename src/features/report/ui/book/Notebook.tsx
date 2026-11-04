import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";

import { reportBook } from "@/design/ds";

const { color, size } = reportBook;
const TURN_MS = 650;
const GRAIN = require("../../../../../assets/report/kraft-grain.png");
/** 질감 조각을 깔아 표지를 채운다 — `repeat` 는 웹에서 한 장만 그려져 조각을 직접 놓는다 */
const GRAIN_SIZE = 240;
const GRAIN_TILES = [0, 1, 2, 3].flatMap((y) => [0, 1].map((x) => [x, y] as const));

/** 넘어가는 한 장 — 왼쪽(스프링)을 축으로 돌아 넘어가고, 다 넘어가면 사라진다 */
export function Leaf({
  turned,
  z,
  reduceMotion,
  children,
  testID,
}: {
  turned: boolean;
  z: number;
  reduceMotion: boolean;
  children: ReactNode;
  testID?: string;
}) {
  const [turn] = useState(() => new Animated.Value(turned ? 1 : 0));
  useEffect(() => {
    if (reduceMotion) {
      turn.setValue(turned ? 1 : 0);
      return;
    }
    Animated.timing(turn, {
      toValue: turned ? 1 : 0,
      duration: TURN_MS,
      easing: Easing.bezier(0.22, 0.8, 0.3, 1),
      useNativeDriver: true,
    }).start();
  }, [turn, turned, reduceMotion]);
  return (
    <Animated.View
      testID={testID}
      pointerEvents={turned ? "none" : "auto"}
      accessibilityElementsHidden={turned}
      importantForAccessibility={turned ? "no-hide-descendants" : "auto"}
      style={[
        styles.leaf,
        {
          zIndex: z,
          opacity: turn.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] }),
          transform: [
            { perspective: 1800 },
            { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-100deg"] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** 크래프트지 표지의 재질 — 접힌 금 · 바느질 · 고무줄까지 */
export function KraftFace({ children }: { children: ReactNode }) {
  return (
    <View style={styles.kraft}>
      {GRAIN_TILES.map(([x, y]) => (
        <Image
          key={`${x}${y}`}
          source={GRAIN}
          style={[styles.grain, { left: x * GRAIN_SIZE, top: y * GRAIN_SIZE }]}
        />
      ))}
      <View style={styles.fold} />
      <View style={styles.stitch} />
      <View style={styles.band} />
      {children}
    </View>
  );
}

/** 공책 몸통 — 뒷표지와 속지 층 위에 장들을 얹고, 스프링은 그 위에 그 자리로 남는다 */
export function Notebook({
  tabCount,
  activeTab,
  children,
}: {
  tabCount: number;
  activeTab: number;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0);
  return (
    <View style={styles.book} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
      <View style={styles.back} />
      <View style={styles.pages} />
      <View style={styles.tabs} pointerEvents="none">
        {Array.from({ length: tabCount }, (_, i) => (
          <View
            key={i}
            testID={i === activeTab ? "book-tab-on" : "book-tab"}
            style={[
              styles.tab,
              {
                top: size.tab.top + i * size.tab.pitch,
                backgroundColor: i === activeTab ? color.green : color.tabs[i % color.tabs.length],
                width: i === activeTab ? size.tab.onWidth : size.tab.width,
              },
            ]}
          />
        ))}
      </View>
      <View style={StyleSheet.absoluteFill}>{children}</View>
      <Rings height={height} />
    </View>
  );
}

function Rings({ height }: { height: number }) {
  const { pitch, width, out } = size.rings;
  const count = Math.max(0, Math.floor((height - 12) / pitch));
  if (count === 0) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.rings, { left: -out, width, height: count * pitch }]}
    >
      <Svg width={width} height={count * pitch} viewBox={`0 0 ${width} ${count * pitch}`}>
        {Array.from({ length: count }, (_, i) => (
          <G key={i} y={i * pitch}>
            <Path
              d="M4.6 14 C5 17.6 10 18.6 15 18"
              fill="none"
              stroke={color.ringBack}
              strokeWidth={2.2}
              strokeLinecap="round"
            />
            <Circle cx={24} cy={13} r={2.8} fill={color.hole} fillOpacity={0.6} />
            <Path
              d="M4.6 14 C4.6 7.6 17.6 6.4 24 13"
              fill="none"
              stroke={color.ring}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <Path
              d="M6.6 12.2 C8.6 9 17 8.2 21.8 11.2"
              fill="none"
              stroke={color.ringShine}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          </G>
        ))}
      </Svg>
    </View>
  );
}

const RADIUS = {
  borderTopLeftRadius: 3,
  borderBottomLeftRadius: 3,
  borderTopRightRadius: 10,
  borderBottomRightRadius: 10,
};

const styles = StyleSheet.create({
  book: { flex: 1, boxShadow: reportBook.shadow.book, ...RADIUS },
  back: {
    position: "absolute",
    top: 4,
    bottom: -8,
    left: 0,
    right: -6,
    backgroundColor: color.kraftBack,
    ...RADIUS,
  },
  pages: {
    position: "absolute",
    top: 2,
    bottom: -4,
    left: 2,
    right: -3,
    backgroundColor: color.pageEdge,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.pageLine,
    ...RADIUS,
  },
  tabs: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: -size.tab.onWidth,
    width: size.tab.onWidth,
  },
  tab: {
    position: "absolute",
    left: 0,
    height: size.tab.height,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  leaf: {
    ...StyleSheet.absoluteFill,
    transformOrigin: "left center",
    backfaceVisibility: "hidden",
    overflow: "hidden",
    ...RADIUS,
  },
  kraft: { flex: 1, backgroundColor: color.kraft, overflow: "hidden", ...RADIUS },
  grain: { position: "absolute", width: GRAIN_SIZE, height: GRAIN_SIZE },
  fold: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 25,
    width: 1.5,
    backgroundColor: color.fold,
  },
  stitch: {
    position: "absolute",
    top: 9,
    bottom: 9,
    left: 33,
    right: 9,
    borderWidth: 1.4,
    borderStyle: "dashed",
    borderColor: color.stitch,
    borderRadius: 5,
  },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 19,
    width: 8,
    backgroundColor: color.band,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.bandEdge,
    zIndex: 3,
  },
  rings: { position: "absolute", top: 6, zIndex: 40 },
});
