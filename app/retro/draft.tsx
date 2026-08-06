import { Redirect, router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { RetroNav } from "@/components/common/RetroNav";
import { SegBar } from "@/components/common/SegBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { actionCard, diaryBody, home } from "@/design/tokens.mvp";
import { useDiary } from "@/features/diary/model/diary";
import { DRAFT_DEMO, useRetro } from "@/features/retro/model/retro";
import { formatKoreanDate } from "@/lib/day";
import { SAMPLE_TODAY } from "@/mocks/sample";

/**
 * `C6` 일기 초안 · 내 문장 + `C6-b` 바바가 함께 본 오늘 + 행동 카드
 *
 * **일기는 두 면이고, 첫 면은 사용자의 것이다.** 초안은 대화에서 옮겨 적은
 * 것이라 고칠 수 있고, 고친 결과가 보관함의 「내가 남긴 오늘」이 된다(`C6.md`).
 *
 * 두 면이 한 파일인 이유는 **세그먼트가 면을 바꾸는 것이지 화면을 바꾸는 것이
 * 아니기** 때문이다 — 저장은 `C6-b` 의 버튼 **한 번**이고, 그 사이 어느 면에
 * 있었는지는 저장과 무관하다.
 *
 * - **감정 `[+]` 더하기를 두지 않는다** — 감정은 `C3` 시작 감정과 일정별
 *   감정에서만 정해진다. 일기에서 새로 만들면 리포트 수치가 두 갈래가 된다
 * - 본문은 **500자 상한**이고 **최소 글자 수를 요구하지 않는다**
 * - **한 문장 요약을 만들지 않는다** — 요약은 이미 일기 자체다
 * - **행동 카드는 한 장뿐이다** — 여러 장은 할 일 목록이 되고, 할 일 목록은
 *   지키지 못한 것의 목록이 된다
 * - 바바의 관점은 **사용자의 문장을 부정하지 않는다** — "제안일 뿐이에요 ·
 *   내 문장이 우선이에요"를 화면에 둔다
 * - 저장하면 `Diary` 한 장 + `ActionCard` 한 장이 남고 `C7` 로 간다.
 *   **한 문장 요약·점수·배지를 만들지 않는다**
 *
 * ⚠ 초안 본문·바바의 관점·행동의 「상황」은 서버가 대화를 읽고 쓰는 값이라
 * 아직 데모 문장이다(`DRAFT_DEMO`). **「목표 행동」만은 진짜** — `C4-e` 에서
 * 사용자가 말한 것을 옮긴다.
 */
const FACES: readonly [string, string] = ["내가 남긴 오늘", "바바가 함께 본 오늘"];

export default function RetroDraft() {
  const startEmotion = useRetro((s) => s.startEmotion);
  const nextAction = useRetro((s) => s.nextAction);
  const resetRetro = useRetro((s) => s.reset);
  const saveDiary = useDiary((s) => s.save);

  const [face, setFace] = useState<0 | 1>(0);
  // `DRAFT_DEMO` 가 `as const` 라 명시하지 않으면 리터럴 타입으로 좁혀져 못 고친다
  const [body, setBody] = useState<string>(DRAFT_DEMO.body);

  // 감정 없이 들어올 수 없다 — C3 이 필수이기 때문이다
  if (startEmotion == null) return <Redirect href="/retro/emotion" />;

  // 「이야기 속 감정」 + 「회고 시작 감정」 두 개다 (A3-b 의 두 줄과 같은 값)
  const emotions = [DRAFT_DEMO.storyEmotion, startEmotion];
  // 행동은 사용자가 말한 것에서 나온다 — 없으면(대화를 건너뛴 경우) 데모 값
  const targetAction = nextAction ?? DRAFT_DEMO.targetAction;

  const save = () => {
    saveDiary({
      date: SAMPLE_TODAY,
      body,
      babaView: DRAFT_DEMO.babaView,
      emotions,
      situation: DRAFT_DEMO.situation,
      targetAction,
      edited: body !== DRAFT_DEMO.body,
    });
    // 회고 한 벌은 여기까지가 수명이다 — 다음 회고에 앞 대화가 섞이지 않게
    resetRetro();
    router.replace("/retro/done");
  };

  return (
    <ScreenBackground>
      <RetroNav title="오늘의 일기" rest={false} />

      <View style={styles.head}>
        <AppText variant="caption" tone="caption" style={styles.date}>
          {`${formatKoreanDate(SAMPLE_TODAY)} · 오늘의 회고`}
        </AppText>
        {/* 감정을 더하는 [+] 를 두지 않는다 — 여기서 만들면 리포트가 두 갈래가 된다 */}
        {emotions.map((e, i) => (
          <EmotionPill key={`${e}-${i}`} id={e} />
        ))}
      </View>

      <SegBar items={FACES} activeIndex={face} onChange={setFace} />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {face === 0 ? (
          <Card style={styles.card}>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={diaryBody.maxLength}
              selectionColor={semantic.accentInk}
              style={styles.body}
              accessibilityLabel="일기 본문"
            />
            <View style={styles.footRow}>
              <AppText variant="caption" tone="caption" style={styles.foot}>
                대화를 바탕으로 적어봤어요 · 고쳐도 괜찮아요
              </AppText>
              {/* 카운터만 둔다 — 최소 글자 수를 요구하지 않는다 */}
              <AppText variant="caption" tone="caption" style={styles.counter}>
                {`${body.length} / ${diaryBody.maxLength}`}
              </AppText>
            </View>
          </Card>
        ) : (
          <>
            {/* 회고를 마친 당시의 고정 스냅샷 — 저장 뒤에는 다시 만들지 않는다 */}
            <Card style={styles.babaCard}>
              <AppText tone="strong" style={styles.body}>
                {DRAFT_DEMO.babaView}
              </AppText>
              <AppText variant="caption" tone="caption">
                바바의 관점은 제안일 뿐이에요 · 내 문장이 우선이에요
              </AppText>
            </Card>

            <Card style={styles.card}>
              <AppText tone="accent" weight="600" style={styles.section}>
                오늘 만든 행동 카드
              </AppText>
              <ActionRow label="상황" value={DRAFT_DEMO.situation} />
              <ActionRow label="목표 행동" value={targetAction} />
              <AppText variant="caption" tone="caption">
                저장하면 이 일기 아래에 함께 남아요
              </AppText>
            </Card>
          </>
        )}
      </ScrollView>

      {/* 저장은 둘째 면에서 한 번뿐이다 — 세그먼트는 면을 바꿀 뿐 저장하지 않는다 */}
      {face === 0 ? (
        <AppButton label="다음" onPress={() => setFace(1)} />
      ) : (
        <AppButton label="오늘 일기 저장하기" onPress={save} />
      )}
    </ScreenBackground>
  );
}

/** `.acrow` — 라벨 열 62 + 값. 두 줄의 값 시작점이 같아야 표로 읽힌다 */
function ActionRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.acRow}>
      <AppText tone="caption" weight="500" style={styles.acLabel}>
        {label}
      </AppText>
      <AppText tone="body" style={styles.acValue}>
        {value}
      </AppText>
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    paddingBottom: theme.layout.gap.element,
  },
  date: { flex: 1, fontSize: 12.5, lineHeight: 15 },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: theme.layout.gap.element,
    paddingHorizontal: theme.layout.screenMargin,
    paddingVertical: theme.layout.gap.element,
  },

  card: { gap: 10 },
  // 바바의 면은 톤 배경 — 내 문장과 다른 사람의 문장이 면으로 갈린다
  babaCard: { gap: 10, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  body: {
    fontFamily: "Pretendard-Regular",
    fontSize: diaryBody.fontSize,
    lineHeight: diaryBody.lineHeight,
    color: semantic.textPrimary,
    padding: 0,
  },
  footRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  foot: { flex: 1 },
  counter: { fontVariant: ["tabular-nums"] },

  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  acRow: { flexDirection: "row", alignItems: "flex-start", gap: actionCard.gap },
  acLabel: {
    width: actionCard.labelWidth,
    fontSize: actionCard.labelSize,
    lineHeight: actionCard.labelSize * actionCard.lineHeight,
  },
  acValue: {
    flex: 1,
    fontSize: actionCard.valueSize,
    lineHeight: actionCard.valueSize * actionCard.lineHeight,
  },
});
