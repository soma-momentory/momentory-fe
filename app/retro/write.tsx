import { Redirect, router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  BackHandler,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import {
  DiaryPaperBackground,
  DiaryPaperEntry,
  DiaryScheduleMemo,
} from "@/components/diary/DiaryPaper";
import { BottomSheet, Button, ChoiceGrid, Screen, Text, TopNavigation } from "@/components/ds";
import { label, layout, space, status } from "@/design/ds";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { diaryPaper } from "@/design/ds/diaryPaper";
import { useDiary } from "@/features/diary/model/diary";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { DIARY_BODY_MAX_LENGTH } from "@/features/diary/model/types";
import { EMOTIONS, isEmotionId, type EmotionId } from "@/features/emotion/model/emotion";
import { useDay, useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { useSettings } from "@/features/my/model/settings";
import { showToast } from "@/lib/toast";

/** 오늘의 일정을 옆에 두고 빈 일기장에 직접 쓴다. AI 세션은 시작하지 않는다. */
export default function RetroWrite() {
  const { date: today } = useTodayContext();
  const wroteToday = useDiary((state) => hasDiaryOn(state.diaries, today));
  const write = useDiary((state) => state.write);
  const schedules = useDay((state) => state.schedules);
  const [body, setBody] = useState("");
  const [emotion, setEmotion] = useState<EmotionId | null>(null);
  const [emotionChosen, setEmotionChosen] = useState(false);
  const [choosingEmotion, setChoosingEmotion] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputHeight, setInputHeight] = useState(diaryPaper.body.lineHeight * 6);
  const savingRef = useRef(false);
  const attempt = useRef(0);
  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );
  useEffect(() => {
    if (!choosingEmotion) return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      setChoosingEmotion(false);
      return true;
    });
    return () => listener.remove();
  }, [choosingEmotion]);

  const save = async () => {
    if (savingRef.current || !body.trim()) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const ticket = ++attempt.current;
    const result = await write(body, emotion);
    if (ticket !== attempt.current) return;
    if (result.status === "saved") {
      Keyboard.dismiss();
      showToast("일기를 저장했어요.", "positive");
      const askLetterTime = useSettings.getState().letterChosen === false;
      router.replace(askLetterTime ? "/letter/time?next=rest" : "/(tabs)/rest?afterDiary=1");
      return;
    }
    savingRef.current = false;
    setSaving(false);
    if (result.status === "stale") return;
    setError(
      result.status === "already-written"
        ? "오늘은 이미 일기를 남겼어요. 홈에서 오늘 일기를 확인해 주세요."
        : "일기를 저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.",
    );
  };

  // 다른 진입점에서도 하루 한 장 규칙을 지킨다. 저장 직후에는 쉼터로 이동하는 흐름을 유지한다.
  if (wroteToday && !saving) return <Redirect href="/retro/talk" />;

  return (
    <>
      <Screen grid={false} backdrop={<DiaryPaperBackground />}>
        <TopNavigation
          leading="arrow-left"
          title="직접 일기 쓰기"
          onLeadingPress={() => {
            if (!savingRef.current) router.back();
          }}
        />
        <KeyboardAvoidingView
          style={styles.fill}
          behavior="padding"
          keyboardVerticalOffset={layout.keyboardGap}
        >
          <ScrollView
            style={styles.fill}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <DiaryPaperEntry
              date={today}
              emotions={emotion == null ? [] : [emotion]}
              emotionChosen={emotionChosen}
              onEmotionPress={() => {
                if (savingRef.current) return;
                Keyboard.dismiss();
                setChoosingEmotion(true);
              }}
            >
              <TextInput
                accessibilityLabel="일기 본문"
                placeholder="오늘 어떤 일이 있었나요? 떠오르는 대로 적어보세요."
                placeholderTextColor={label.alternative}
                value={body}
                onChangeText={setBody}
                editable={!saving}
                multiline
                maxLength={DIARY_BODY_MAX_LENGTH}
                textAlignVertical="top"
                style={[styles.input, { minHeight: inputHeight }]}
                onContentSizeChange={({ nativeEvent }) =>
                  setInputHeight(
                    Math.max(diaryPaper.body.lineHeight * 6, nativeEvent.contentSize.height),
                  )
                }
              />
              <Text variant="caption1" color={label.alternative} style={styles.counter}>
                {`${body.length} / ${DIARY_BODY_MAX_LENGTH}`}
              </Text>
            </DiaryPaperEntry>
            <DiaryScheduleMemo
              schedules={visibleSchedules(schedules).filter((schedule) => schedule.date === today)}
            />
          </ScrollView>
          <View style={styles.dock}>
            {error != null ? (
              <Text variant="label1" color={status.negative} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}
            <ReflectionButton
              testID="diary-save"
              label={saving ? "저장 중…" : "일기 저장하기"}
              disabled={saving || !body.trim()}
              onPress={() => void save()}
              style={styles.save}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
      {choosingEmotion ? (
        <BottomSheet
          title="오늘 어떤 감정이었나요?"
          closable
          onDismiss={() => setChoosingEmotion(false)}
        >
          <ChoiceGrid
            items={EMOTIONS.map((item) => ({ id: String(item.id), label: item.name }))}
            selected={emotion == null ? null : String(emotion)}
            onSelect={(id) => {
              const next = Number(id);
              if (!isEmotionId(next)) return;
              setEmotion(next);
              setEmotionChosen(true);
              setChoosingEmotion(false);
            }}
          />
          <Button
            label="선택 안 함"
            variant="text"
            onPress={() => {
              setEmotion(null);
              setEmotionChosen(true);
              setChoosingEmotion(false);
            }}
          />
        </BottomSheet>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  content: { paddingBottom: space.xl2 },
  input: { ...diaryPaper.body, color: label.normal, padding: 0 },
  counter: { textAlign: "right", fontVariant: ["tabular-nums"] },
  dock: { gap: space.md, paddingTop: space.md },
  save: { marginTop: 0, marginHorizontal: 0 },
});
