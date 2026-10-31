import { PreviewBubble, type BubbleStyle } from "./PreviewBubble";
import { RetroStickerChoices } from "./RetroStickerChoices";
import { useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Button, ChatDock, ChatScaffold, Text } from "../../../src/components/ds";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { background, label, retroDiary, space } from "../../../src/design/ds";
import {
  RetroBaba,
  RETRO_BABA_HEIGHT,
  RETRO_BABA_LEFT,
} from "../../../src/features/retro/ui/RetroBaba";
import {
  RetroBabaPeek,
  RETRO_BABA_PEEK_HEIGHT,
  RETRO_BABA_PEEK_LEFT,
} from "../../../src/features/retro/ui/RetroBabaPeek";
import { RetroScheduleSticker } from "../../../src/features/retro/ui/RetroScheduleSticker";
import type { Schedule } from "../../../src/features/home/model/types";

export const retroConfirmScenarios = [
  { id: "default", label: "오늘 일정" },
  { id: "empty", label: "일정 없는 날" },
];
export const retroTalkScenarios = [
  { id: "default", label: "바바와 대화" },
  { id: "typing", label: "키보드 열린 배치" },
  { id: "conversation", label: "대화가 쌓인 상태" },
  { id: "choices", label: "감정 스티커 선택" },
  { id: "wishes", label: "바람 스티커 선택" },
];
const emotionChoices = ["반가움", "행복함", "편안함", "아쉬움", "직접 적기"].map((label) => ({
  label,
}));
const wishChoices = [
  { label: "연결", description: "마음을 나누고 함께하고 싶은 바람" },
  { label: "휴식", description: "잠시 쉬며 나를 돌보고 싶은 바람" },
  { label: "인정", description: "내 마음과 노력을 알아줬으면 하는 바람" },
  { label: "이해", description: "서로의 마음을 이해하고 싶은 바람" },
  { label: "직접 적기" },
];
const schedules: Schedule[] = [
  {
    id: "preview-birthday",
    date: "2026-10-29",
    title: "다연 생파",
    done: false,
    source: "manual",
    time: null,
    externalId: null,
    doneAt: null,
    emotions: [],
    hidden: false,
  },
];

export function RetroDiaryPreview({
  screen,
  scenarioId,
  onMessage,
  fontScale = 1,
  bubbleStyle = "current",
}: {
  screen: "confirm" | "talk";
  scenarioId: string;
  onMessage: (message: string) => void;
  fontScale?: 1 | 1.3 | 1.5;
  bubbleStyle?: BubbleStyle;
}) {
  const [value, setValue] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [keyboardOpen, setKeyboardOpen] = useState(scenarioId === "typing");
  const [dockHeight, setDockHeight] = useState<number>(retroDiary.inputMinHeight);
  const [picked, setPicked] = useState<string[]>([]);
  const choosing = screen === "talk" && (scenarioId === "choices" || scenarioId === "wishes");
  const input = useRef<TextInput>(null);
  const typing = screen === "talk" && keyboardOpen;
  const hideKeyboard = () => {
    input.current?.blur();
    Keyboard.dismiss();
    setKeyboardOpen(false);
  };
  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <View style={styles.root}>
        <ChatScaffold
          leading="close"
          leadingColor={label.onFill}
          surface="transparent"
          grid={false}
          onConversationPress={hideKeyboard}
          onLeadingPress={() => onMessage("미리보기에서 닫기를 눌렀어요.")}
          companion={screen === "talk" ? typing ? <RetroBabaPeek /> : <RetroBaba /> : undefined}
          companionHeight={typing ? RETRO_BABA_PEEK_HEIGHT : RETRO_BABA_HEIGHT}
          companionLift={typing ? dockHeight : retroDiary.characterLift}
          companionLeft={typing ? RETRO_BABA_PEEK_LEFT : RETRO_BABA_LEFT}
          dock={
            screen === "confirm" ? (
              <Button
                label="다음"
                labelVariant="headline1"
                fill
                onPress={() => onMessage("회고 대화에서 바바와 이야기를 시작해요.")}
              />
            ) : (
              <View
                style={styles.dock}
                onLayout={(event) => setDockHeight(event.nativeEvent.layout.height)}
              >
                {choosing ? (
                  <RetroStickerChoices
                    options={scenarioId === "wishes" ? wishChoices : emotionChoices}
                    selected={picked}
                    onToggle={(label) => {
                      if (label === "직접 적기") {
                        setPicked([]);
                        input.current?.focus();
                        setKeyboardOpen(true);
                        return;
                      }
                      hideKeyboard();
                      setPicked((previous) =>
                        previous.includes(label)
                          ? previous.filter((value) => value !== label)
                          : previous.length < 2
                            ? [...previous, label]
                            : previous,
                      );
                    }}
                  />
                ) : null}
                <View style={styles.actionSlot}>
                  {picked.length > 0 ? (
                    <Button
                      label="보내기"
                      labelVariant="headline1"
                      fill
                      onPress={() => {
                        setAnswers([...answers, picked.join(", ")]);
                        setPicked([]);
                        onMessage("선택한 스티커를 보냈어요. 미리보기예요.");
                      }}
                    />
                  ) : (
                    <ChatDock
                      inputRef={input}
                      onFocus={() => setKeyboardOpen(true)}
                      appearance="diary"
                      value={value}
                      onChangeText={setValue}
                      onSend={() => {
                        setAnswers([...answers, value]);
                        setValue("");
                      }}
                    />
                  )}
                </View>
              </View>
            )
          }
        >
          {screen === "confirm" ? (
            <>
              <PreviewBubble bubbleStyle={bubbleStyle}>
                오늘 있었던 일을 잠깐 떠올려봐요.
              </PreviewBubble>
              {scenarioId === "empty" ? (
                <PreviewBubble bubbleStyle={bubbleStyle}>
                  오늘은 따로 적어둔 일정이 없네요. 그래도 오늘 하루를 같이 돌아봐요.
                </PreviewBubble>
              ) : (
                <RetroScheduleSticker date="2026-10-29" schedules={schedules} />
              )}
            </>
          ) : (
            <>
              {choosing ? (
                <PreviewBubble bubbleStyle={bubbleStyle}>
                  {scenarioId === "wishes"
                    ? "그때 마음속으로 바랐던 건 무엇이었을까요?"
                    : "친구와 함께한 순간에 어떤 감정이 들었나요?"}
                </PreviewBubble>
              ) : scenarioId === "conversation" ? (
                <>
                  <PreviewBubble bubbleStyle={bubbleStyle} variant="answer">
                    친구 생일을 같이 축하했어요. 오랜만에 만나서 반가웠어요.
                  </PreviewBubble>
                  <PreviewBubble bubbleStyle={bubbleStyle}>
                    함께한 시간이 따뜻하게 남았나 봐요. 어떤 순간이 가장 좋았어요?
                  </PreviewBubble>
                </>
              ) : (
                <PreviewBubble bubbleStyle={bubbleStyle}>
                  지은님, 오늘 다연 생파 일정도 있었네요. 하루 중 가장 기억에 남는 일은 뭐였어요?
                </PreviewBubble>
              )}
              {answers.map((answer, index) => (
                <PreviewBubble key={index} bubbleStyle={bubbleStyle} variant="answer">
                  {answer}
                </PreviewBubble>
              ))}
            </>
          )}
        </ChatScaffold>
        {typing ? (
          <View
            testID="retro-preview-keyboard"
            style={styles.keyboard}
            accessibilityLabel="키보드 배치 참고용. 실제 기기 키보드는 운영체제가 표시해요."
          >
            <View style={styles.keyboardToolbar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="키보드 내리기"
                onPress={hideKeyboard}
                hitSlop={6}
                style={styles.dismissKeyboard}
              >
                <Text variant="body1Reading">키보드 내리기 ⌄</Text>
              </Pressable>
            </View>
            {[
              "ㅂ ㅈ ㄷ ㄱ ㅅ ㅛ ㅕ ㅑ ㅐ ㅔ",
              "ㅁ ㄴ ㅇ ㄹ ㅎ ㅗ ㅓ ㅏ ㅣ",
              "⇧ ㅋ ㅌ ㅊ ㅍ ㅠ ㅜ ㅡ ⌫",
              "한/영       스페이스       ↵",
            ].map((row) => (
              <View key={row} style={styles.keyRow}>
                {row.split(/ +/).map((key, index) => (
                  <View key={`${key}-${index}`} style={styles.key}>
                    <Text variant="body1">{key}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </PreviewFontScaleContext.Provider>
  );
}
const styles = StyleSheet.create({
  dock: { gap: space.md },
  actionSlot: { minHeight: retroDiary.inputMinHeight, justifyContent: "center" },
  root: { flex: 1, minHeight: 0, backgroundColor: "transparent" },
  keyboard: {
    height: 264,
    padding: space.sm,
    paddingTop: space.lg,
    gap: space.sm,
    backgroundColor: retroDiary.previewKeyboard,
  },
  keyRow: { flexDirection: "row", justifyContent: "center", gap: 4, flex: 1 },
  keyboardToolbar: { flexDirection: "row", justifyContent: "flex-end" },
  dismissKeyboard: { minHeight: 32, justifyContent: "center", paddingHorizontal: space.sm },
  key: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: background.elevated,
    borderRadius: 7,
  },
});
