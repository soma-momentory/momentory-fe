import { router } from "expo-router";
import { Image, StyleSheet, View } from "react-native";

import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `10` · 완료 (온보딩 6/6)
 *
 * **받은 답을 그대로 돌려준다.** 마지막 화면이 하는 일은 축하가 아니라 **확인**이다 —
 * 캘린더가 연결됐고 회고 시각이 밤 9:30 이라는 것을 카드 한 장으로 보여준다.
 *
 * - **색종이·팡파르를 쓰지 않는다.** 체크 하나와 문장 하나로 끝낸다
 * - 캘린더를 연결하지 않았으면 그 줄을 **지운다** — 회색 처리하지 않는다.
 *   있지도 않은 것을 흐리게 남기면 "뭔가 실패했다" 로 읽힌다
 * - **쉬는 방법 줄이 없다.** `07` 을 묻지 않았으므로 돌려줄 답도 없다 —
 *   갈 곳 없는 줄을 두지 않는다
 * - 진행점을 두지 않는다. 끝났으므로 남은 분량이 없다
 */
export default function Done() {
  const calendarLinked = useDraft((s) => s.calendarLinked);
  const retroTime = useDraft((s) => s.retroTime);
  const reset = useDraft((s) => s.reset);

  const start = () => {
    // 초안은 여기까지가 수명이다. 남기면 다음 사람의 온보딩에 앞 답이 섞인다.
    // (서버 커밋은 M2-0 인증이 붙은 뒤)
    reset();
    router.replace("/login");
  };

  return (
    <ScreenBackground>
      <View style={styles.center}>
        <Image source={require("../../assets/baba/face-joy.png")} style={styles.baba} />

        <View style={styles.copy}>
          <AppText variant="heading" tone="strong" weight="600" style={styles.title}>
            고마워요.
          </AppText>
          <AppText style={styles.body}>
            당신에게 편안한 방식으로{"\n"}하루를 함께 기억해볼게요.
          </AppText>
        </View>

        <Card style={styles.summary}>
          {calendarLinked ? (
            <View style={styles.doneRow}>
              <View style={styles.check}>
                <AppText tone="onDark" style={styles.checkMark}>
                  ✓
                </AppText>
              </View>
              <View style={styles.doneCopy}>
                <AppText variant="bodySm" tone="accent" weight="600">
                  캘린더 연결 완료
                </AppText>
                <AppText variant="caption" tone="legal">
                  오늘 일정을 함께 기억할게요.
                </AppText>
              </View>
            </View>
          ) : null}

          {calendarLinked ? <View style={styles.divider} /> : null}

          <View style={styles.kv}>
            <AppText style={styles.glyph}>🌙</AppText>
            <AppText variant="caption" tone="legal" style={styles.kvLabel}>
              돌아보는 시간
            </AppText>
            <AppText tone="strong" weight="600" style={styles.kvValue}>
              {formatTime(retroTime)}
            </AppText>
          </View>

          <AppText variant="footnote" tone="legal">
            마이에서 언제든 바꿀 수 있어요.
          </AppText>
        </Card>
      </View>

      <AppButton label="모멘토리 시작하기" onPress={start} />
    </ScreenBackground>
  );
}

/** `21:30` → `밤 9:30`. 홈도 같은 말투로 시각을 말한다(`12.md`) */
function formatTime(hhmm: string) {
  const [h = "0", m = "00"] = hhmm.split(":");
  const hour = Number(h);
  const period = hour < 6 ? "새벽" : hour < 12 ? "아침" : hour < 18 ? "낮" : "밤";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}:${m}`;
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: 20 },
  baba: { width: 104, height: 104, borderRadius: 52, alignSelf: "center" },
  copy: { gap: 10 },
  title: { fontSize: 21, lineHeight: 31.5, textAlign: "center" },
  body: { fontSize: 15, lineHeight: 24.75, textAlign: "center", color: semantic.textPrimary },
  summary: { gap: 14 },
  doneRow: { flexDirection: "row", gap: 9 },
  // 17px 원 안의 ✓ — primary 는 장식 전용이라 면으로 쓰는 이 자리가 예외가 아니다.
  // 글자가 얹히지만 10px 글리프 하나라 본문이 아니다(RULES 2 의 "글자를 얹지 말 것"은
  // 읽는 문장에 대한 규칙이다). 시안이 primary 를 지정했다.
  check: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: semantic.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: { fontSize: 10, lineHeight: 12 },
  doneCopy: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: `${semantic.textPrimary}1A` }, // ink 10%
  kv: { flexDirection: "row", alignItems: "center", gap: 10 },
  glyph: { fontSize: 14, lineHeight: 18 },
  kvLabel: { flex: 1 },
  kvValue: { fontSize: 13.5, lineHeight: 19 },
});
