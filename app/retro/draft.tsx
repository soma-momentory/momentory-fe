import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { RetroNav } from "@/components/common/RetroNav";
import { SectionLabel } from "@/components/common/SectionLabel";
import { SegBar } from "@/components/common/SegBar";
import { ActionRow } from "@/components/diary/ActionRow";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { diaryBody } from "@/design/tokens.mvp";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { useRetro } from "@/features/retro/model/retro";
import { formatKoreanDate } from "@/lib/day";

/**
 * `C6` 일기 초안 · 내 문장 + `C6-b` 바바가 함께 본 오늘 + 행동 카드
 *
 * **일기는 서버가 대화를 읽고 쓴다.** 초안(`diary.diary`)은 대화에서 옮겨 적은
 * 것이라 고칠 수 있고, 고친 결과가 보관함의 「내가 남긴 오늘」이 된다(`C6.md`).
 *
 * **두 면은 있을 때만 있다** — 서버가 리프레이밍 일기(`reframedDiary`)와 행동
 * 카드를 함께 주면 세그먼트로 두 면을 오간다. 짧은 기록형은 리프레이밍도 행동
 * 카드도 없어 **한 면(내 문장)만** 그린다(`C6-b.md` — 카드는 한 장 또는 없음).
 *
 * - **감정 `[+]` 더하기를 두지 않는다** — 감정은 `C3` 시작 감정에서만 온다
 * - 본문은 **상한**이 있고 **최소 글자 수를 요구하지 않는다**
 * - 저장하면 `Diary` 한 장(+ 행동 카드가 있으면 한 장)이 남고 `C7` 로 간다
 * - **한 문장 요약·점수·배지를 만들지 않는다**
 */
const FACES: readonly [string, string] = ["내가 남긴 오늘", "바바가 함께 본 오늘"];

export default function RetroDraft() {
  const startEmotion = useRetro((s) => s.startEmotion);
  const diary = useRetro((s) => s.diary);
  const actionCard = useRetro((s) => s.actionCard);
  // 서버 회고 세션 id — 저장하는 일기에 실어 두면 나중에 서버 저장분을 되불러온다
  const sessionId = useRetro((s) => s.sessionId);
  const resetRetro = useRetro((s) => s.reset);
  const saveDiary = useDiary((s) => s.save);
  // 홈·회고 확인과 같은 「오늘」 — 일기의 날짜·날씨가 여기서 온다
  const { date: today, weather } = useTodayContext();

  const [face, setFace] = useState<0 | 1>(0);
  // `diary` 는 완료 시 store 에 담긴 서버 초안이다
  const [body, setBody] = useState<string>(diary?.diary ?? "");
  /**
   * 저장은 **한 번뿐**이다. 버튼을 빠르게 두 번 누르면 `router.replace` 가 돌기
   * 전에 `save` 가 두 번 들어와 일기가 두 장 생긴다. ref 인 이유는 같은 틱 안에서
   * 막아야 하기 때문이다(state 는 다음 렌더에야 반영된다).
   */
  const saving = useRef(false);

  // 감정·완료 일기 없이 들어올 수 없다 — 대화가 끝나야 여기 온다
  if (startEmotion == null) return <Redirect href="/retro/emotion" />;
  if (diary == null) return <Redirect href="/retro/talk" />;

  // 「바바가 함께 본 오늘」 면 — 리프레이밍 일기나 행동 카드가 있을 때만 존재한다
  const reframed = diary.reframedDiary;
  const hasBabaFace = reframed != null || actionCard != null;

  const save = () => {
    if (saving.current) return;
    saving.current = true;
    saveDiary({
      date: today,
      body,
      babaView: reframed,
      babaViewBasis: null,
      emotions: [startEmotion],
      storyEmotion: null,
      startEmotion,
      weather: `${weather.label} · ${weather.celsius}℃`,
      situation: actionCard?.situation ?? null,
      targetAction: actionCard?.action ?? null,
      retrospectId: sessionId != null ? String(sessionId) : null,
      edited: body !== diary.diary,
    });
    // 회고 한 벌은 여기까지가 수명이다 — 다음 회고에 앞 대화가 섞이지 않게
    resetRetro();
    router.replace("/retro/done");
  };

  // 첫 면(내 문장). 두 번째 면이 없으면 여기서 바로 저장한다
  const showEditor = face === 0 || !hasBabaFace;

  return (
    <ScreenBackground>
      <RetroNav title="오늘의 일기" rest={false} />

      <View style={styles.head}>
        <AppText variant="caption" tone="caption" style={styles.date}>
          {`${formatKoreanDate(today)} · 오늘의 회고`}
        </AppText>
        {/* 감정을 더하는 [+] 를 두지 않는다 — 여기서 만들면 리포트가 두 갈래가 된다 */}
        <EmotionPill id={startEmotion} />
      </View>

      {hasBabaFace ? <SegBar items={FACES} activeIndex={face} onChange={setFace} /> : null}

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {showEditor ? (
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
            {reframed != null ? (
              <Card style={styles.babaCard}>
                <AppText tone="strong" style={styles.body}>
                  {reframed}
                </AppText>
                <AppText variant="caption" tone="caption">
                  바바의 관점은 제안일 뿐이에요 · 내 문장이 우선이에요
                </AppText>
              </Card>
            ) : null}

            {actionCard != null ? (
              <Card style={styles.card}>
                <SectionLabel>오늘 만든 행동 카드</SectionLabel>
                <ActionRow label="상황" value={actionCard.situation} />
                <ActionRow label="목표 행동" value={actionCard.action} />
                <AppText variant="caption" tone="caption">
                  저장하면 이 일기 아래에 함께 남아요
                </AppText>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* 저장은 마지막 면에서 한 번뿐이다 — 세그먼트는 면을 바꿀 뿐 저장하지 않는다 */}
      {hasBabaFace && face === 0 ? (
        <AppButton label="다음" onPress={() => setFace(1)} />
      ) : (
        <AppButton label="오늘 일기 저장하기" onPress={save} />
      )}
    </ScreenBackground>
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
});
