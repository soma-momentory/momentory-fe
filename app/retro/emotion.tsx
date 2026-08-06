import { StyleSheet, View } from "react-native";

import { EmotionGrid } from "@/components/common/EmotionGrid";
import { RetroNav } from "@/components/common/RetroNav";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { useRetro } from "@/features/retro/model/retro";

/**
 * `C3` · 지금 감정 고르기 · 9종
 *
 * **감정 선택은 필수다.** `[잘 모르겠어요]` 통과 버튼을 두지 않는다 — 시작
 * 감정이 없으면 첫 질문의 근거도, 리포트의 감정 흐름도 만들 수 없다(`C3.md`).
 * 그래서 CTA 는 고르기 전까지 **잠겨 있되 사라지지 않는다**.
 *
 * - **하나만 고른다** — 여러 개를 허용하면 "지금 가장 가까운"이라는 질문이 무너진다
 * - 9종은 **한 화면에 3×3** 으로 다 보인다. 스크롤로 감추면 뒤쪽은 선택되지 않는다
 * - 선택은 배경 + **테두리 2px + 글자 굵기**를 함께 바꾼다. 점은 선택 여부와
 *   무관하게 원색이다
 * - **요약 카드가 되돌릴 수 있음을 말한다** — "지금 다시 골라도 괜찮아요"
 * - **임상 용어·강도 척도를 쓰지 않는다** — 감정에 숫자를 붙이지 않으므로
 *   리포트도 높이로 말하지 않는다(`W1`)
 */
export default function RetroEmotion() {
  const startEmotion = useRetro((s) => s.startEmotion);
  const setStartEmotion = useRetro((s) => s.setStartEmotion);

  const picked = startEmotion == null ? [] : [startEmotion];
  const name = startEmotion == null ? null : theme.emotions[startEmotion - 1]?.name;

  return (
    <ScreenBackground>
      <RetroNav />

      <View style={styles.copy}>
        <AppText tone="strong" weight="700" style={styles.title}>
          지금 마음에 가장{"\n"}가까운 감정은?
        </AppText>
        <AppText tone="body" style={styles.body}>
          하나만 골라주세요 · 고른 감정에 맞춰 오늘 대화를 함께 맞춰가요.
        </AppText>
      </View>

      <View style={styles.grid}>
        <EmotionGrid
          size="big"
          selected={picked}
          // 하나만 남긴다 — 이미 고른 것을 다시 눌러도 비우지 않는다.
          // 감정 선택은 필수라 「없음」으로 돌아갈 자리가 없다(C3.md).
          onToggle={setStartEmotion}
        />
      </View>

      {/* 고른 뒤에만 나타난다 — 빈 카드를 미리 두면 무엇이 들어올지 모른 채 자리만 본다 */}
      {name != null ? (
        <Card style={styles.summary}>
          <AppText tone="strong" weight="500" style={styles.summaryTitle}>
            {`${name}으로 시작할게요`}
          </AppText>
          <AppText variant="caption" tone="caption">
            이 감정으로 오늘 대화를 시작해요 · 지금 다시 골라도 괜찮아요.
          </AppText>
        </Card>
      ) : null}

      {/* 잠긴 CTA 는 사라지지 않고 흐려진다 — 다음이 있다는 사실은 남는다 */}
      <AppButton
        label="회고 시작하기"
        disabled={startEmotion == null}
        // TODO C4 대화 (다음 PR). 지금은 고른 감정이 store 에 남는 것까지다
        onPress={() => {}}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  copy: { paddingTop: 10, gap: 10 },
  title: { fontSize: 24, lineHeight: 33.6 },
  body: { fontSize: 14, lineHeight: 23.8 },
  // 9종이 한 화면에 다 보이도록 남은 높이를 이 블록이 가운데에서 쓴다
  grid: { flex: 1, justifyContent: "center", paddingVertical: 20 },
  summary: { gap: 7, marginBottom: theme.layout.gap.section },
  summaryTitle: { fontSize: 13, lineHeight: 19.5 },
});
