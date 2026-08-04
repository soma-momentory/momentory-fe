import { StyleSheet, Text, View } from "react-native";

import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { fill, text } from "@/design/tokens.mvp";

const { styles: type, fontFamily } = theme.typography;

/**
 * M0 검수 화면 — 바닥이 시안과 맞는지만 본다.
 *
 * `03_미리보기/MVP.html` 을 브라우저로 열고 이 화면과 나란히 놓아
 * 배경 그라디언트·서체·글자 크기가 같은지 확인한다.
 *
 * M2 에서 이 자리는 `S0` 스플래시(entry machine 의 route 판정)가 된다.
 */
export default function Index() {
  return (
    <ScreenBackground>
      <View style={styles.stack}>
        <Text style={[styles.base, styles.title]}>오늘도 잠시{"\n"}쉬어가도 괜찮아요</Text>

        <Text style={[styles.base, styles.body]}>
          바바와 짧게 이야기하며 오늘을 천천히 돌아보는 공간이에요. 이 화면은 바닥이 시안과 맞는지
          확인하는 자리입니다.
        </Text>

        <View style={styles.swatches}>
          {theme.emotions.map((e) => (
            <View key={e.id} style={[styles.pill, { backgroundColor: `${e.base}38` }]}>
              <View style={[styles.dot, { backgroundColor: e.base }]} />
              <Text style={[styles.base, styles.pillLabel, { color: e.ink }]}>{e.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.cta}>
          <Text style={[styles.base, styles.ctaLabel]}>버튼 라벨 · 15 bold</Text>
        </View>

        <Text style={[styles.base, styles.footnote]}>
          Pretendard · {fontFamily} · 이 줄이 시스템 서체로 보이면 폰트 로딩이 실패한 것이다
        </Text>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  stack: {
    flex: 1,
    justifyContent: "center",
    gap: theme.layout.gap.section,
  },
  base: { fontFamily: "Pretendard-Regular" },

  title: {
    fontSize: type.title.fontSize,
    lineHeight: type.title.lineHeight,
    fontFamily: "Pretendard-Bold",
    color: text.strong,
  },
  body: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: text.body,
  },

  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.layout.gap.chip,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: theme.radius.pill,
  },
  dot: { width: 7, height: 7, borderRadius: theme.radius.pill },
  pillLabel: {
    fontSize: type.caption.fontSize,
    fontFamily: "Pretendard-Medium",
  },

  cta: {
    height: theme.touch.buttonHeight,
    borderRadius: theme.radius.control,
    backgroundColor: fill.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: {
    fontSize: type.bodyLg.fontSize,
    fontFamily: "Pretendard-Bold",
    color: text.onDark,
  },

  footnote: {
    fontSize: type.footnote.fontSize,
    lineHeight: type.footnote.lineHeight,
    color: text.caption,
  },
});
