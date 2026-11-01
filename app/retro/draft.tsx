import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import {
  DiaryPaperBackground,
  DiaryPaperEntry,
  DiaryScheduleMemo,
} from "@/components/diary/DiaryPaper";
import { WeatherCredit } from "@/components/diary/WeatherCredit";
import { Button, Screen, Text, TopNavigation } from "@/components/ds";
import { label as labelColor, layout, space } from "@/design/ds";
import { diaryPaper } from "@/design/ds/diaryPaper";
import { track } from "@/features/analytics";
import { useActiveClock } from "@/features/analytics/activeClock";
import { useDiaryWeather } from "@/features/diary/model/useDiaryWeather";
import { updateDiaryBody } from "@/features/diary/data/diaryApi";
import { type EmotionId } from "@/features/emotion/model/emotion";
import { useDiary } from "@/features/diary/model/diary";
import { DIARY_BODY_MAX_LENGTH } from "@/features/diary/model/types";
import { useDay, useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { useSettings } from "@/features/my/model/settings";
import { emotionIdOfKey, useRetro } from "@/features/retro/model/retro";

/**
 * `C6` · 완성된 일기 확인
 *
 * `DESIGN.md` 「일기」 4번: 「정리 중 → **일기 확인(날짜·감정 사진 +
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
 * - 저장하면 `Diary` 한 장(+ 행동 카드가 있으면 한 장)이 남는다. 바람카드가 있으면 `C7` 로,
 *   없으면 `C7` 을 거치지 않고 **곧장 쉼터(`R1`)로** 간다(2026-10-12 · 거기서 쉼 추천 시트가 올라온다)
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
  const resetRetro = useRetro((s) => s.reset);
  const schedules = useDay((s) => s.schedules);
  // 홈·일정 확인과 같은 「오늘」 — 일기의 날짜가 여기서 온다
  const { date: today } = useTodayContext();

  const { weather } = useDiaryWeather(diary?.diaryId, today);

  const [body, setBody] = useState<string>(diary?.diary ?? "");
  const [editing, setEditing] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const shownSchedules = visibleSchedules(schedules).filter((schedule) => schedule.date === today);

  // 스크롤이 끝에 닿았는가 — 닿기 전에는 버튼 위를 흐리게 덮어 글이 이어진다는 걸 보인다
  const [atEnd, setAtEnd] = useState(true);
  const scrollY = useRef(0);
  const viewportH = useRef(0);
  const contentH = useRef(0);
  const syncEnd = () => setAtEnd(scrollY.current + viewportH.current >= contentH.current - 2);

  // 키보드가 화면을 줄인 **뒤**에 새 뷰포트 기준으로 끝을 다시 계산한다. 열리기 전에
  // scrollToEnd 하면 옛 높이까지만 움직여 긴 본문의 마지막 줄이 키보드 뒤에 남는다.
  useEffect(() => {
    if (!editing) return;
    const shown = Keyboard.addListener("keyboardDidShow", () => {
      scroll.current?.scrollToEnd({ animated: true });
    });
    return () => shown.remove();
  }, [editing]);
  /**
   * 저장은 **한 번뿐**이다. 버튼을 빠르게 두 번 누르면 `router.replace` 가 돌기
   * 전에 `save` 가 두 번 들어와 일기가 두 장 생긴다. ref 인 이유는 같은 틱 안에서
   * 막아야 하기 때문이다(state 는 다음 렌더에야 반영된다).
   */
  const saving = useRef(false);
  /** 바람카드 없이 저장해 회고를 비우고 쉼터로 떠나는 중 — 아래 「완료 일기 없음」 되돌리기를 막는다 */
  const [leaving, setLeaving] = useState(false);

  /**
   * 「직접 고치기」 계측(2026-09-28) — AI 가 쓴 일기를 얼마나 고치는가는 일기 품질의 간접 지표다.
   * 고친 시간과 글자 수 변화만 보낸다. 본문은 보내지 않는다.
   */
  const clock = useActiveClock();
  const editFrom = useRef<{ at: number; chars: number } | null>(null);
  const startEdit = () => {
    editFrom.current = { at: clock.now(), chars: body.length };
    if (sessionId != null) track("diary_edit_started", { retrospect_id: String(sessionId) });
    setEditing(true);
  };
  const finishEdit = () => {
    const from = editFrom.current;
    editFrom.current = null;
    if (from != null && sessionId != null) {
      track("diary_edit_finished", {
        retrospect_id: String(sessionId),
        duration_ms: clock.now() - from.at,
        chars_delta: body.length - from.chars,
      });
    }
    setEditing(false);
  };

  // 완료 일기 없이 들어올 수 없다 — 대화가 끝나야 여기 온다. 단 바람카드 없이 저장하면 이 화면이
  // 회고를 비우고 쉼터로 떠나는 중이라, 그 사이 다시 그려져도 대화로 되돌리지 않는다
  if (diary == null) return leaving ? null : <Redirect href="/retro/talk" />;

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
      weather,
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
    // 편지 시각을 고른 적이 없으면 다음 화면 전에 한 번 묻는다(바바의 편지 PRD 4-8 · 2026-10-27).
    // 서버가 편지를 모르면(`null`) 묻지 않는다
    const askLetterTime = useSettings.getState().letterChosen === false;
    if (wishCard != null) {
      // 바람카드는 저장 완료(`C7`)가 보여 준다 — 회고 한 벌은 **그 화면이 읽고 나서** 비운다
      router.replace(askLetterTime ? "/letter/time?next=done" : "/retro/done");
      return;
    }
    // 바람카드가 없으면 `C7` 을 거치지 않는다(2026-10-12) — 쉼터로 넘어온 것이 곧 저장이 끝났다는 뜻이다.
    // `/rest` 가 아니라 `/(tabs)/rest` 다 — 온보딩 그룹의 같은 경로로 새지 않게(`C7` 과 같은 주소).
    // 회고 한 벌은 여기까지가 수명이다 — 다음 회고에 앞 대화가 섞이지 않게
    setLeaving(true);
    router.replace(askLetterTime ? "/letter/time?next=rest" : "/(tabs)/rest?afterDiary=1");
    resetRetro();
  };

  return (
    <Screen grid={false} backdrop={<DiaryPaperBackground />}>
      {/* 고치는 중에는 뒤로가기가 읽기로 되돌린다(시안 ④-c 「뒤로가기로 나가고」) */}
      <TopNavigation
        leading={editing ? "arrow-left" : "close"}
        onLeadingPress={() => (editing ? finishEdit() : router.replace("/home"))}
        trailing={weather ? <WeatherCredit /> : undefined}
      />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior="padding"
        keyboardVerticalOffset={layout.keyboardGap}
      >
        <View style={styles.scrollArea}>
          <ScrollView
            ref={scroll}
            style={styles.stack}
            contentContainerStyle={styles.stackContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => {
              scrollY.current = e.nativeEvent.contentOffset.y;
              syncEnd();
            }}
            scrollEventThrottle={32}
            onLayout={(e) => {
              viewportH.current = e.nativeEvent.layout.height;
              syncEnd();
            }}
            onContentSizeChange={(_, h) => {
              contentH.current = h;
              syncEnd();
            }}
          >
            <DiaryPaperEntry date={today} emotions={emotions}>
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
                <Text variant="body1ReadingHand" style={diaryPaper.body} color={labelColor.normal}>
                  {body}
                </Text>
              )}
            </DiaryPaperEntry>
            {!editing ? <DiaryScheduleMemo schedules={shownSchedules} /> : null}
          </ScrollView>

          {/* 버튼 뒤로 본문이 이어진다는 표시 — 끝까지 내리면 걷힌다 */}
          {atEnd ? null : (
            <Svg style={styles.fade} pointerEvents="none" accessible={false}>
              <Defs>
                <LinearGradient id="draftFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={diaryPaper.paper} stopOpacity={0} />
                  <Stop offset="1" stopColor={diaryPaper.paper} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#draftFade)" />
            </Svg>
          )}
        </View>

        <View style={styles.dock}>
          {/*
          고치는 중에는 바로 저장하지 않는다 — 「수정 완료」로 읽기로 돌아가
          고친 본문을 한 번 확인한 뒤 「일기 저장하기」로 넘어간다(수정 완료 → 저장).
        */}
          {editing ? (
            <Button label="수정 완료" fill raised onPress={finishEdit} />
          ) : (
            <>
              <Button label="일기 저장하기" fill raised onPress={save} />
              <View style={styles.secondary}>
                <Button label="직접 고치기" variant="text" size="small" onPress={startEdit} />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, minHeight: 0 },
  scrollArea: { flex: 1, minHeight: 0 },
  stack: { flex: 1 },
  stackContent: { paddingBottom: space.xl2 },
  fade: { position: "absolute", left: -space.xl, right: -space.xl, bottom: 0, height: 36 },
  input: { ...diaryPaper.body, color: labelColor.normal, padding: 0 },
  counter: { textAlign: "right", fontVariant: ["tabular-nums"] },

  // 주 버튼과 보조 버튼 사이 — 같은 짝을 쓰는 화면이 전부 같은 값이다(`layout.dockActionGap`)
  dock: { gap: layout.dockActionGap },
  secondary: { alignItems: "center" },
});
