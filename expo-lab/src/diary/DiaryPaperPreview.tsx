import { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";

import {
  DiaryPaperBackground,
  DiaryPaperEntry,
  DiaryScheduleMemo,
} from "../../../src/components/diary/DiaryPaper";
import { Button, IconButton, Screen, Text, TopNavigation } from "../../../src/components/ds";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { label, layout, space } from "../../../src/design/ds";
import { diaryPaper } from "../../../src/design/ds/diaryPaper";
import type { EmotionId } from "../../../src/features/emotion/model/emotion";
import type { Schedule } from "../../../src/features/home/model/types";
import { DIARY_BODY_MAX_LENGTH } from "../../../src/features/diary/model/types";

export const diaryPaperScenarios = [
  { id: "proud", label: "뿌듯함 · 감정 3개" },
  { id: "happy", label: "행복함" },
  { id: "calm", label: "평온함" },
  { id: "tired", label: "피곤함" },
  { id: "stuck", label: "막막함" },
  { id: "lethargic", label: "무기력" },
  { id: "anxious", label: "불안함" },
  { id: "depressed", label: "우울함" },
  { id: "angry", label: "화남" },
  { id: "frustrated", label: "답답함" },
  { id: "neutral", label: "무감정" },
  { id: "many", label: "감정 10개 · 긴 일정" },
  { id: "empty", label: "무감정 · 일정 없음" },
  { id: "long", label: "긴 본문 · 문단" },
] as const;

const EMOTIONS: Record<string, EmotionId[]> = {
  proud: [2, 1, 3],
  happy: [1],
  calm: [3],
  tired: [4],
  stuck: [5],
  lethargic: [6],
  anxious: [7],
  depressed: [8],
  angry: [9],
  frustrated: [10],
  neutral: [],
  many: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  empty: [],
  long: [3, 4],
};
const BODY =
  "오늘은 평소보다 조금 천천히 걸었다.\n늘 지나던 길인데 햇살이 유난히 따뜻했다.\n따뜻한 커피를 마시며 잠깐 쉬었다.\n\n아무것도 서두르지 않아도 되는 시간이 좋았다.\n하루를 돌아보니 마음이 조금 가벼워졌다.\n이런 평범한 날도 오래 기억하고 싶다.";

export function DiaryPaperPreview({
  screen,
  scenarioId,
  fontScale,
  onMessage,
}: {
  screen: "draft" | "detail";
  scenarioId: string;
  fontScale: 1 | 1.3 | 1.5;
  onMessage: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(scenarioId === "long" ? [BODY, BODY, BODY].join("\n\n") : BODY);
  const [savedBody, setSavedBody] = useState(body);
  const [inputHeight, setInputHeight] = useState(diaryPaper.body.lineHeight * 8);
  const cancelEdit = () => {
    if (screen === "detail") setBody(savedBody);
    setEditing(false);
  };
  const emotions = EMOTIONS[scenarioId] ?? EMOTIONS.proud!;
  const schedules: Schedule[] =
    scenarioId === "empty"
      ? []
      : [
          "책 반납하기",
          scenarioId === "many"
            ? "오랜만에 만나는 친구와 동네 공원에서 천천히 산책하기"
            : "산책하기",
        ].map((title, i) => ({
          id: String(i),
          title,
          date: "2026-10-30",
          time: null,
          done: false,
          doneAt: null,
          source: "manual",
          externalId: null,
          emotions: [],
          hidden: false,
        }));
  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <Screen grid={false} backdrop={<DiaryPaperBackground />}>
        <TopNavigation
          leading={screen === "detail" || editing ? "arrow-left" : "close"}
          onLeadingPress={() =>
            editing ? cancelEdit() : onMessage("미리보기에서 돌아가기를 눌렀어요.")
          }
          trailing={
            screen === "detail" && !editing ? (
              <View style={styles.topActions}>
                <IconButton
                  name="pencil"
                  accessibilityLabel="일기 수정"
                  size={20}
                  onPress={() => setEditing(true)}
                />
                <IconButton
                  name="trash"
                  accessibilityLabel="일기 삭제"
                  size={20}
                  onPress={() => onMessage("일기 삭제 미리보기예요. 실제로 삭제하지 않아요.")}
                />
              </View>
            ) : undefined
          }
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <DiaryPaperEntry date="2026-10-30" emotions={emotions}>
            {editing ? (
              <TextInput
                accessibilityLabel="일기 본문"
                multiline
                value={body}
                onChangeText={setBody}
                style={[styles.input, { height: inputHeight }]}
                onContentSizeChange={(event) =>
                  setInputHeight(
                    Math.max(
                      diaryPaper.body.lineHeight * 8,
                      Math.ceil(event.nativeEvent.contentSize.height),
                    ),
                  )
                }
                maxLength={DIARY_BODY_MAX_LENGTH}
              />
            ) : (
              <Text variant="body1ReadingHand" style={diaryPaper.body}>
                {body}
              </Text>
            )}
          </DiaryPaperEntry>
          {schedules.length > 0 || screen === "draft" ? (
            <DiaryScheduleMemo
              schedules={schedules}
              title={screen === "draft" ? "오늘 일정" : "그날 일정"}
            />
          ) : null}
        </ScrollView>
        {screen === "draft" || editing ? (
          <View style={styles.dock}>
            <Button
              label={
                editing ? (screen === "detail" ? "수정 저장하기" : "수정 완료") : "일기 저장하기"
              }
              fill
              raised
              disabled={editing && !body.trim()}
              onPress={() => {
                if (editing) {
                  setSavedBody(body);
                  setEditing(false);
                  if (screen === "detail")
                    onMessage("일기 수정 미리보기예요. 실제로 저장하지 않아요.");
                } else onMessage("일기 저장 미리보기예요. 실제로 저장하지 않아요.");
              }}
            />
            {!editing ? (
              <View style={styles.secondary}>
                <Button
                  label="직접 고치기"
                  variant="text"
                  size="small"
                  onPress={() => setEditing(true)}
                />
              </View>
            ) : null}
            {screen === "detail" && editing ? (
              <View style={styles.secondary}>
                <Button label="취소" variant="text" size="small" onPress={cancelEdit} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Screen>
    </PreviewFontScaleContext.Provider>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: "row", alignItems: "center" },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingBottom: space.xl2 },
  input: { ...diaryPaper.body, color: label.normal, padding: 0 },
  dock: { gap: layout.dockActionGap },
  secondary: { alignItems: "center" },
});
