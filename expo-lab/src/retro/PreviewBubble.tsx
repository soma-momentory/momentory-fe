import { useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

import { ChatBubble, Text } from "../../../src/components/ds";
import { label, retroDiary } from "../../../src/design/ds";
import { retroBubbleComparison as paper } from "../../../src/design/ds/retroBubbleComparison";

export type BubbleStyle = "current" | "outline" | "cutout" | "stitched";
export const bubbleStyles = [
  { id: "current", label: "현재 · 단색", description: "테두리 없는 단색 스티커", reference: null },
  {
    id: "outline",
    label: "① 얇은 테두리",
    description: "따뜻한 종이 · 베이지 윤곽선",
    reference: require("./assets/bubble-outline-reference.png"),
  },
  {
    id: "cutout",
    label: "② 두꺼운 테두리",
    description: "크림색 테두리 · 종이 스티커",
    reference: require("./assets/bubble-cutout-reference.png"),
  },
  {
    id: "stitched",
    label: "③ 점선 스티치",
    description: "둥근 종이 · 손바느질 점선",
    reference: require("./assets/bubble-stitched-reference.png"),
  },
] as const;

/** 종이 윤곽을 실제 말풍선 폭·높이로 그린다. 긴 글에서도 테두리와 꼬리 굵기는 일정하다. */
function silhouette(width: number, height: number, inset: number) {
  const l = inset;
  const t = inset;
  const r = width - inset;
  const b = height - paper.tailHeight - inset;
  const corner = Math.min(30, (b - t) / 2);
  return `M ${l + corner} ${t}
    C ${l + corner / 2} ${t} ${l} ${t + corner / 3} ${l} ${t + corner}
    L ${l} ${b - corner}
    Q ${l} ${b - 7} ${l + 17} ${b}
    Q ${l + 17} ${b + 9} ${l + 8} ${height - inset}
    Q ${l + 31} ${height - inset - 4} ${l + 45} ${b}
    L ${r - corner} ${b}
    Q ${r} ${b} ${r} ${b - corner}
    L ${r} ${t + corner}
    Q ${r} ${t} ${r - corner} ${t} Z`;
}

export function PreviewBubble({
  children,
  bubbleStyle = "current",
  variant = "question",
}: {
  children: string;
  bubbleStyle?: BubbleStyle;
  variant?: "question" | "answer";
}) {
  const [bounds, setBounds] = useState({ width: paper.maxWidth as number, height: 110 });
  const id = useId().replace(/:/g, "");
  const question = variant === "question";
  if (bubbleStyle === "current") {
    return (
      <ChatBubble appearance="diary" variant={variant}>
        {children}
      </ChatBubble>
    );
  }
  const shape = silhouette(bounds.width, bounds.height, paper.inset);
  const innerShape = silhouette(bounds.width, bounds.height, paper.inset + 7);
  return (
    <View
      testID={`paper-bubble-${bubbleStyle}-${variant}`}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && layout.height > 0)
          setBounds({ width: layout.width, height: layout.height });
      }}
      style={[styles.bubble, question ? styles.question : styles.answer]}
    >
      <Svg
        pointerEvents="none"
        focusable={false}
        style={[StyleSheet.absoluteFill, question ? null : styles.mirror]}
        width="100%"
        height="100%"
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
      >
        <Defs>
          <LinearGradient id={`paper-${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={paper.paperLight} />
            <Stop offset="0.58" stopColor={paper.paper} />
            <Stop offset="1" stopColor={paper.paperShade} />
          </LinearGradient>
          <Pattern id={`grain-${id}`} width={32} height={32} patternUnits="userSpaceOnUse">
            {[
              [3, 4],
              [12, 17],
              [27, 7],
              [21, 27],
              [6, 29],
              [30, 20],
            ].map(([x, y], index) => (
              <Circle
                key={index}
                cx={x}
                cy={y}
                r={index % 2 ? 0.55 : 0.8}
                fill={paper.grain}
                opacity={0.13}
              />
            ))}
          </Pattern>
          <ClipPath id={`clip-${id}`}>
            <Path d={shape} />
          </ClipPath>
        </Defs>
        <G transform="translate(0 3)">
          <Path
            d={shape}
            fill={paper.shadow}
            stroke={paper.shadow}
            strokeWidth={6}
            strokeLinejoin="round"
          />
        </G>
        <Path
          d={shape}
          fill={question ? `url(#paper-${id})` : retroDiary.answer}
          stroke={paper.edge}
          strokeWidth={bubbleStyle === "cutout" ? 11 : 7}
          strokeLinejoin="round"
        />
        <G clipPath={`url(#clip-${id})`}>
          <Rect width="100%" height="100%" fill={`url(#grain-${id})`} />
        </G>
        {bubbleStyle === "outline" ? (
          <Path
            d={shape}
            fill="none"
            stroke={paper.outline}
            strokeWidth={2.3}
            strokeLinejoin="round"
          />
        ) : null}
        {bubbleStyle === "stitched" ? (
          <Path
            d={innerShape}
            fill="none"
            stroke={paper.stitch}
            strokeWidth={2.2}
            strokeDasharray="7 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
      </Svg>
      <Text
        variant={question ? "body1Reading" : "body1"}
        color={label.normal}
        accessibilityLabel={`${question ? "질문" : "내 답변"}: ${children}`}
      >
        {children}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  bubble: {
    minWidth: 130,
    paddingHorizontal: 27,
    paddingTop: 23,
    paddingBottom: 23 + paper.tailHeight,
    marginBottom: 2,
  },
  mirror: { transform: [{ scaleX: -1 }] },
  question: { alignSelf: "flex-start", maxWidth: paper.maxWidth },
  answer: { alignSelf: "flex-end", maxWidth: paper.answerMaxWidth },
});
