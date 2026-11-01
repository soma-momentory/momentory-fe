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

import {
  DiaryPaperBackground,
  DiaryPaperEntry,
  DiaryScheduleMemo,
} from "@/components/diary/DiaryPaper";
import { Button, Screen, Text, TopNavigation } from "@/components/ds";
import { label, layout, space, status } from "@/design/ds";
import { diaryPaper } from "@/design/ds/diaryPaper";
import { useDiary } from "@/features/diary/model/diary";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { DIARY_BODY_MAX_LENGTH } from "@/features/diary/model/types";
import { useDay, useTodayContext, visibleSchedules } from "@/features/home/model/day";
import { showToast } from "@/lib/toast";

/** 오늘의 일정을 옆에 두고 빈 일기장에 직접 쓴다. AI 세션은 시작하지 않는다. */
export default function RetroWrite() {
  const { date: today } = useTodayContext();
  const wroteToday = useDiary((state) => hasDiaryOn(state.diaries, today));
  const write = useDiary((state) => state.write);
  const schedules = useDay((state) => state.schedules);
  const [body, setBody] = useState("");
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

  const save = async () => {
    if (savingRef.current || !body.trim()) return;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    const ticket = ++attempt.current;
    const result = await write(body);
    if (ticket !== attempt.current) return;
    if (result.status === "saved") {
      Keyboard.dismiss();
      showToast("일기를 저장했어요.", "positive");
      router.replace(`/diary/${result.id}`);
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

  // 다른 진입점에서도 하루 한 장 규칙을 지킨다. 저장 직후에는 상세로 이동하는 흐름을 유지한다.
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
            <DiaryPaperEntry date={today} emotions={[]}>
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
            <Button
              label={saving ? "저장 중…" : "일기 저장하기"}
              fill
              raised
              disabled={saving || !body.trim()}
              onPress={() => void save()}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  content: { paddingBottom: space.xl2 },
  input: { ...diaryPaper.body, color: label.normal, padding: 0 },
  counter: { textAlign: "right", fontVariant: ["tabular-nums"] },
  dock: { gap: space.md, paddingTop: space.md },
});
