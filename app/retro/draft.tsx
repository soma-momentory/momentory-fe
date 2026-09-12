import { Redirect, router } from "expo-router";
import { useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { DiaryEmotionRow } from "@/components/diary/DiaryEmotionRow";
import { Button, Card, Screen, Text, TopNavigation } from "@/components/ds";
import { iosVariant, label as labelColor, layout, space, text } from "@/design/ds";
import { updateDiaryBody } from "@/features/diary/data/diaryApi";
import { type EmotionId } from "@/features/emotion/model/emotion";
import { useDiary } from "@/features/diary/model/diary";
import { DIARY_BODY_MAX_LENGTH } from "@/features/diary/model/types";
import { useDay, useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { emotionIdOfKey, useRetro } from "@/features/retro/model/retro";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `C6` · 완성된 일기 확인
 *
 * `DESIGN.md` 「일기」 4번: 「정리 중 → **일기 확인(제목 없음, 날짜·날씨·감정 +
 * 본문 + 그날 일정)** → `일기 저장하기` / `직접 고치기`」
 *
 * ## 여기서 대화 문법이 끝난다
 *
 * 시안 주석: 「여기서 대화 문법을 끝내고 **읽기 레이아웃으로 전환**(말풍선 없음)」 ·
 * 「**대화 원문은 결과 화면에 다시 보여주지 않아요** — 대화는 과정, 일기는 결과」.
 * 그래서 이 화면만 `ChatScaffold` 를 쓰지 않는다.
 *
 * ## 기본은 읽기다 — 고치기는 모드다
 *
 * 옛 화면은 처음부터 `TextInput` 이었다. 시안은 **읽기로 보여주고 `직접 고치기`**
 * 로 편집에 들어간다(④-c). 「새 화면 문법을 만들지 않고 입력 컴포넌트만 재사용」
 * 이라 라우트를 늘리지 않고 같은 자리에서 모드만 바꾼다.
 *
 * - **감정 `[+]` 더하기를 두지 않는다** — 감정은 `C3` 시작 감정에서만 온다
 * - 본문은 **상한**이 있고 **최소 글자 수를 요구하지 않는다**
 * - 저장하면 `Diary` 한 장(+ 행동 카드가 있으면 한 장)이 남고 `C7` 로 간다
 * - **한 문장 요약·점수·배지를 만들지 않는다**
 *
 * 옛 세그먼트(「내가 남긴 오늘 / 바바가 함께 본 오늘」)는 뺐다 — 이 화면은 본문 한 면만
 * 보여준다. ⚠ **「바바가 함께 본 오늘」은 이제 어디에도 그려지지 않는다**(2026-08-20 · 상세
 * A3 에서도 뺐다). `reframedDiary` 는 `Diary.babaView` 로 저장만 되고 화면에는 안 뜬다.
 * 행동 카드는 여기가 아니라 저장 완료(`C7`)가 보여준다(시안 5번).
 */
export default function RetroDraft() {
  const diary = useRetro((s) => s.diary);
  const wishCard = useRetro((s) => s.wishCard);
  // 서버 회고 세션 id — 저장하는 일기에 실어 두면 나중에 서버 저장분을 되불러온다
  const sessionId = useRetro((s) => s.sessionId);
  const saveDiary = useDiary((s) => s.save);
  const schedules = useDay((s) => s.schedules);
  // 홈·일정 확인과 같은 「오늘」 — 일기의 날짜가 여기서 온다
  const { date: today } = useTodayContext();

  const [body, setBody] = useState<string>(diary?.diary ?? "");
  const [editing, setEditing] = useState(false);
  /**
   * 저장은 **한 번뿐**이다. 버튼을 빠르게 두 번 누르면 `router.replace` 가 돌기
   * 전에 `save` 가 두 번 들어와 일기가 두 장 생긴다. ref 인 이유는 같은 틱 안에서
   * 막아야 하기 때문이다(state 는 다음 렌더에야 반영된다).
   */
  const saving = useRef(false);

  // 완료 일기 없이 들어올 수 없다 — 대화가 끝나야 여기 온다
  if (diary == null) return <Redirect href="/retro/talk" />;

  // 일기 감정 태그 — 완료 응답이 준 '일기에서 드러난 감정 전체'(감정 탐색을 안 거쳐도 추출 감정이 온다).
  // 키를 id 로 되돌린다. 낙관적 일기가 저장 직후에도 이 감정을 바로 보여준다.
  const emotions = (diary.emotions ?? [])
    .map(emotionIdOfKey)
    .filter((x): x is EmotionId => x != null);

  const save = () => {
    if (saving.current) return;
    saving.current = true;
    const edited = body !== diary.diary;
    saveDiary({
      // 완료 턴이 준 서버 일기 id — 있으면 store 가 이걸 그대로 써서 저장 직후에도 삭제가 닿는다
      id: diary.diaryId,
      date: today,
      body,
      babaView: diary.reframedDiary,
      babaViewBasis: null,
      emotions,
      storyEmotion: null,
      startEmotion: null,
      weather: null,
      situation: wishCard?.situation ?? null,
      targetAction: wishCard?.smallAction ?? null,
      // 바람 카드 리치 필드 — 완료 직후 쉼터/상세에서도 바로 채워 보이게 함께 싣는다.
      cardEmotions:
        wishCard?.emotions.map(emotionIdOfKey).filter((e): e is EmotionId => e != null) ?? [],
      needs: wishCard?.needs.map((n) => n.word) ?? [],
      desiredState: wishCard?.desiredState ?? null,
      sentiment: wishCard?.sentiment === "positive" ? "positive" : "uncomfortable",
      // 완료 턴이 준 서버 카드 id — 있으면 저장 직후에도 완료/느낀 점/삭제가 서버에 닿는다
      actionCardId: wishCard?.wishCardId ?? null,
      retrospectId: sessionId != null ? String(sessionId) : null,
      edited,
    });
    // 서버는 완료 때 이미 LLM 원본을 저장했다 — 사용자가 고쳤으면 그 회고의 일기 본문을
    // 갱신한다(fail-quiet · 못 닿으면 다음 load 에 서버 값이 다시 비친다). 안 고쳤으면 보내지 않는다.
    if (edited && sessionId != null) void updateDiaryBody(String(sessionId), body);
    // 회고 한 벌은 여기까지가 수명이다 — 다음 회고에 앞 대화가 섞이지 않게…
    // 단, `C7` 이 행동 카드를 보여주므로 **그 화면이 읽고 나서** 비운다
    router.replace("/retro/done");
  };

  return (
    <Screen>
      {/* 고치는 중에는 뒤로가기가 읽기로 되돌린다(시안 ④-c 「뒤로가기로 나가고」) */}
      <TopNavigation
        leading={editing ? "arrow-left" : "close"}
        onLeadingPress={() => (editing ? setEditing(false) : router.replace("/home"))}
      />

      {/*
        ⚠ 날씨 한 줄이 사라졌다 (2026-08-21) — 「맑음」은 샘플 값이었고 공급처가
        없다(`features/home/model/day.ts` 의 `useTodayContext`). 지어낸 날씨를
        적어 두면 그게 그날의 기록으로 남는다.
      */}
      <View style={styles.head}>
        {/* 날짜 제목은 일기 상세(A3)와 같은 크기로 — 저장 전후 같은 일기가 같은 서체·크기로 읽힌다.
            iOS 에서 상세가 한 단 내려갔으므로(2026-09-13) 여기도 같이 내려간다 */}
        <Text variant={iosVariant("title3Hand", "title1Hand")} color={labelColor.strong}>
          {`${formatKoreanDateShort(today)}의 일기`}
        </Text>
      </View>

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <Card padding="loose" style={styles.card}>
          {/* 일기 상세(`A3`)와 같은 줄을 쓴다 — 값을 각자 들면 또 갈린다 */}
          <DiaryEmotionRow emotions={emotions} />

          {editing ? (
            <>
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={DIARY_BODY_MAX_LENGTH}
                style={styles.input}
                accessibilityLabel="일기 본문"
              />
              {/* 카운터만 둔다 — 최소 글자 수를 요구하지 않는다 */}
              <Text variant="caption1" color={labelColor.alternative} style={styles.counter}>
                {`${body.length} / ${DIARY_BODY_MAX_LENGTH}`}
              </Text>
            </>
          ) : (
            <Text
              variant={iosVariant("body1ReadingHand", "body1ReadingHandLg")}
              color={labelColor.normal}
            >
              {body}
            </Text>
          )}
        </Card>

        {/* 본문 아래 「오늘 일정」을 함께 기록. 일기 상세(A3)의 「그날 일정」과 **같은 구조**다 —
            제목은 label1/neutral, 목록은 완료 점(채운=완료·빈=미완료)과 함께 제목보다 조금
            오른쪽으로 들여쓴다(요청 2026-08-25). 일정이 없으면 블록 자체를 숨긴다 */}
        {visibleSchedules(schedules).length > 0 ? (
          <View style={styles.schedules}>
            <Text variant="label1" color={labelColor.neutral} style={styles.schedulesTitle}>
              오늘 일정
            </Text>
            <DayScheduleList
              schedules={visibleSchedules(schedules)}
              showStatusDot
              inset={space.md}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.dock}>
        {/*
          고치는 중에는 바로 저장하지 않는다 — 「수정 완료」로 읽기로 돌아가
          고친 본문을 한 번 확인한 뒤 「일기 저장하기」로 넘어간다(수정 완료 → 저장).
        */}
        {editing ? (
          <Button label="수정 완료" fill onPress={() => setEditing(false)} />
        ) : (
          <>
            <Button label="일기 저장하기" fill onPress={save} />
            <View style={styles.secondary}>
              <Button
                label="직접 고치기"
                variant="text"
                size="small"
                onPress={() => setEditing(true)}
              />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    paddingBottom: space.md,
  },

  stack: { flex: 1, marginHorizontal: -space.xl },
  stackContent: {
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
  },

  card: { gap: space.md },
  // 읽는 본문과 **같은 손글씨·같은 크기**로 — 고치기로 들어가도 본문 크기가 바뀌지 않는다.
  // 안드로이드는 `body1ReadingHandLg`(18/30), iOS 는 한 단 내린 `body1ReadingHand`(16/26)다
  input: {
    // 읽기와 **같은 단**이어야 한다 — 위 주석. iOS 는 한 단 내린 `body1ReadingHand` 다
    ...(Platform.OS === "ios" ? text.body1ReadingHand : text.body1ReadingHandLg),
    color: labelColor.normal,
    padding: 0,
  },
  counter: { textAlign: "right", fontVariant: ["tabular-nums"] },
  // 「오늘 일정」 섹션 — 일기 상세(A3)의 「그날 일정」과 같은 값(제목 gap·왼쪽 들여쓰기)
  schedules: { gap: space.md },
  schedulesTitle: { paddingLeft: space.xs },

  // 주 버튼과 보조 버튼 사이 — 같은 짝을 쓰는 화면이 전부 같은 값이다(`layout.dockActionGap`)
  dock: { gap: layout.dockActionGap },
  secondary: { alignItems: "center" },
});
