import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/ds";
import { Baba } from "@/components/onboarding/OnboardingParts";
import {
  background,
  iosVariant,
  label as labelColor,
  line,
  overlay,
  radius,
  space,
} from "@/design/ds";
import { letterPaper } from "@/design/ds/letterPaper";
import type { Letter, LetterSummary } from "@/features/letter/data/letterApi";
import { keepWords, receivedLabel } from "@/features/letter/model/letter";
import { letterPaperStyle, Lined } from "@/features/letter/ui/LetterPaper";

/**
 * 일기 상세의 바바의 편지 입구 — **노트에 테이프로 붙인 쪽지**(2026-10-27 사용자 결정 · 비교 시안 셋 중 v3 ·
 * `analysis/2026-10-27-baba-letter-prd/entry-references.md` 5번).
 *
 * 처음엔 바람 카드처럼 「제목 + 편지지 카드」였는데, 바로 아래 바람 카드와 같은 「칸」으로 보여 묻혔다.
 * 그래서 노트에 붙여 둔 물건처럼 살짝 기울이고, 테이프에 「바바의 편지」를 써서 제목 줄을 대신한다.
 * 테이프는 보관함 제목 뒤 테이프와 같은 베이지 단색 띠다.
 * 안에는 배경이 투명한 바바 · 첫 줄(인용이 있으면 인용, 없으면 관점의 첫 문장) 두 줄 · 서명.
 * 안 읽은 새 편지는 빨간 점 대신 **오른쪽 위 귀가 접혀** 있다. 편지 내용을 아직 못 받았으면 서명만 그린다.
 */
type Props = {
  summary: LetterSummary;
  /** 불러온 편지. 아직이면 `null` */
  letter: Letter | null;
  onPress: () => void;
};

const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;
const previewOf = (letter: Letter) =>
  letter.quote != null ? `「${letter.quote}」` : firstSentence(letter.insight);

export function LetterPreviewCard({ summary, letter, onPress }: Props) {
  const unread = summary.isNew && summary.openedAt == null;
  const hand = iosVariant("body1ReadingHand", "body1ReadingHandLg");
  const { note } = letterPaper;

  return (
    <View style={styles.slot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`바바의 편지 열기, ${receivedLabel(summary.date)}${unread ? ", 새 편지" : ""}`}
        onPress={onPress}
        style={[letterPaperStyle.paper, styles.note, { transform: [{ rotate: note.tilt }] }]}
      >
        {({ pressed }) => (
          <>
            <View style={styles.tapeSlot} pointerEvents="none">
              <View style={styles.tape}>
                <Text variant="tapeHand" color={labelColor.normal}>
                  바바의 편지
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.portrait, { transform: [{ rotate: note.portraitTilt }] }]}>
                <Baba size={44} />
              </View>
              <View style={styles.text}>
                {letter != null ? (
                  <Lined variant={hand} maxLines={2}>
                    {keepWords(previewOf(letter))}
                  </Lined>
                ) : null}
                <Text variant={hand} color={labelColor.strong} style={styles.sign}>
                  바바가
                </Text>
              </View>
            </View>
            {unread ? (
              <Svg
                testID="letter-entry-dogear"
                width={note.dogEar}
                height={note.dogEar}
                style={styles.dogEar}
              >
                <Path
                  d={`M0 0 L${note.dogEar} ${note.dogEar} L0 ${note.dogEar} Z`}
                  fill={note.dogEarFill}
                  stroke={line.normal}
                  strokeWidth={1}
                />
              </Svg>
            ) : null}
            {pressed ? (
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pressed]} />
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // 위로 반쯤 걸친 테이프가 앞 칸에 잘리지 않게 자리를 둔다
  slot: { paddingTop: space.md },
  note: { marginHorizontal: space.xs, paddingTop: space.xl },
  // 테이프는 쪽지 왼쪽 위에 반쯤 걸친다 — 예전 「바바의 편지」 제목 줄처럼 왼쪽에서 읽힌다
  tapeSlot: { position: "absolute", top: -16, left: 14 },
  // 보관함 제목(「보관함」) 뒤 테이프와 같은 모양 — 찢긴 끝 · 광택 없는 베이지 단색 띠를 살짝 기울인다
  // (2026-10-27 사용자 요청 · 일기 확인 화면의 수채화 테이프는 너무 반짝였다)
  tape: {
    backgroundColor: background.splash,
    transform: [{ rotate: "-3deg" }],
    paddingHorizontal: 18,
    paddingVertical: 3,
  },
  row: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  portrait: {
    padding: space.xs,
    paddingBottom: space.md,
  },
  text: { flex: 1, gap: space.xs },
  sign: { alignSelf: "flex-end" },
  dogEar: { position: "absolute", top: 0, right: 0 },
  pressed: { backgroundColor: overlay.pressLight, borderRadius: radius.large },
});
