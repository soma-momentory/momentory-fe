import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { RetroNav } from "@/components/common/RetroNav";
import { SegBar } from "@/components/common/SegBar";
import { ActionCardSection } from "@/components/diary/ActionCardSection";
import { DiaryBabaFace } from "@/components/diary/DiaryBabaFace";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import {
  fetchRetrospectDiary,
  type FetchedActionCard,
} from "@/features/diary/data/retrospectDiaryApi";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import type { ActionCard } from "@/features/diary/model/types";
import { formatKoreanDate, formatKoreanDateShort } from "@/lib/day";

/**
 * `A3` 내가 남긴 오늘 + 행동 카드 · `A3-b` 바바가 함께 본 오늘 · `A3-c` 해본 뒤
 *
 * **일기 한 장은 두 면을 가진다**(`A3.md`) — 내가 쓴 문장과 바바가 함께 본 오늘.
 * **두 면을 한 화면에 섞지 않는다.**
 *
 * 이 파일은 **면 전환과 조합만** 한다 — 행동 카드의 규칙(`A3-c` 는 상태다 ·
 * 되돌릴 때만 확인)은 `ActionCardSection`, 바바 면의 규칙(고정 스냅샷 · 근거
 * 인용 · 그날의 기록 두 줄)은 `DiaryBabaFace` 에 있다.
 *
 * - 이 면(내가 남긴 오늘)의 본문만 `A4` 에서 고칠 수 있다
 */
const FACES: readonly [string, string] = ["내가 남긴 오늘", "바바가 함께 본 오늘"];

export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const card = useDiary((s) => actionCardOf(s.actionCards, id ?? ""));
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);

  const [face, setFace] = useState<0 | 1>(0);

  /**
   * 로컬 store 에 카드가 없고 이 일기가 서버 회고에서 온 것이면(`retrospectId`),
   * 서버에 저장된 행동 카드를 불러온다 — 보관함처럼 로컬 초안 없이 열린 일기의 자리.
   * 지금 흐름(회고 → 저장 → 열기)은 로컬 카드가 늘 있어 이 경로를 타지 않는다.
   * 서버 카드는 **읽기 전용**이다(done/reflection 쓰기 경로가 아직 없다).
   */
  const retrospectId = diary?.retrospectId ?? null;
  const needServerCard = card == null && retrospectId != null;
  const [serverCard, setServerCard] = useState<FetchedActionCard | null>(null);
  useEffect(() => {
    if (!needServerCard || retrospectId == null) return;
    const controller = new AbortController();
    fetchRetrospectDiary(retrospectId, { signal: controller.signal }).then((d) => {
      if (!controller.signal.aborted) setServerCard(d?.actionCard ?? null);
    });
    return () => controller.abort();
  }, [needServerCard, retrospectId]);

  // 지워진 일기를 열고 있었다면 보관함으로 — 오류 화면을 만들지 않는다
  if (diary == null) return <Redirect href="/archive" />;

  // 서버에서 온 카드를 화면 카드 모양으로 옮긴다(읽기 전용) — 로컬 카드가 없을 때만
  const readOnlyCard: ActionCard | null =
    card == null && serverCard != null
      ? {
          id: serverCard.id,
          diaryId: diary.id,
          situation: serverCard.situation,
          targetAction: serverCard.targetAction,
          done: serverCard.done,
          doneAt: null,
          reflection: serverCard.reflection,
          createdAt: serverCard.createdDate ?? diary.date,
        }
      : null;

  return (
    <ScreenBackground>
      <RetroNav title={`${formatKoreanDate(diary.date)}의 일기`} rest={false} />

      <View style={styles.head}>
        <AppText variant="caption" tone="caption" style={styles.date}>
          {`${formatKoreanDate(diary.date)} · 그날의 회고`}
        </AppText>
        {diary.emotions.map((e, i) => (
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
          <>
            <Card style={styles.card}>
              <AppText tone="strong" style={styles.body}>
                {diary.body}
              </AppText>
              {/* 고친 뒤에는 언제 고쳤는지까지 말한다 — 「수정함」은 언제인지를 말하지 못한다 */}
              <AppText variant="caption" tone="caption">
                {diary.editedAt != null
                  ? `회고 대화에서 작성 · ${formatKoreanDateShort(diary.editedAt.slice(0, 10))} 수정`
                  : "회고 대화에서"}
              </AppText>
            </Card>

            {card != null ? (
              <ActionCardSection
                card={card}
                diaryDate={diary.date}
                onMarkDone={markDone}
                onUndoDone={undoDone}
                onSetReflection={setReflection}
              />
            ) : readOnlyCard != null ? (
              // 서버에서 불러온 카드 — 상호작용은 닫혀 있다(읽기 전용)
              <ActionCardSection card={readOnlyCard} diaryDate={diary.date} readOnly />
            ) : null}
          </>
        ) : (
          <DiaryBabaFace diary={diary} />
        )}
      </ScrollView>

      {/* 이 면의 본문만 고칠 수 있다 — 바바의 면에서는 수정으로 가지 않는다 */}
      {face === 0 ? (
        <AppButton
          label="수정하기"
          variant="ghost"
          onPress={() => router.push(`/diary/${diary.id}/edit`)}
        />
      ) : null}
    </ScreenBackground>
  );
}

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
  body: { fontSize: 15, lineHeight: 27 },
});
