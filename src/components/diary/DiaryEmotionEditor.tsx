import { useEffect, useRef, useState } from "react";
import { BackHandler, ScrollView, StyleSheet, View } from "react-native";

import { BottomSheet, Button, Card, Text } from "@/components/ds";
import { space, status } from "@/design/ds";
import { diaryPaper } from "@/design/ds/diaryPaper";
import type { DiaryEmotionSelection } from "@/features/diary/model/types";
import { EMOTION_DETAILS, EMOTIONS, emotionName } from "@/features/emotion/model/emotion";
import { RetroStickerChoices } from "@/features/retro/ui/RetroStickerChoices";

/** 채팅 직후와 보관함에서 같은 사건별 감정 편집을 쓴다. 저장 실패 시 초안을 유지한다. */
export function DiaryEmotionEditor({
  selection,
  onSave,
  onDismiss,
}: {
  selection: DiaryEmotionSelection;
  onSave: (selection: DiaryEmotionSelection) => Promise<boolean>;
  onDismiss: () => void;
}) {
  const [draft, setDraft] = useState(() => ({
    events: selection.events.map((event) => ({ ...event, emotions: [...event.emotions] })),
    unlinkedEmotions: [...selection.unlinkedEmotions],
  }));
  const [target, setTarget] = useState<number | null>(selection.events[0]?.eventId ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const busy = useRef(false);
  const dismiss = () => {
    if (!busy.current) onDismiss();
  };
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!busy.current) onDismiss();
      return true;
    });
    return () => listener.remove();
  }, [onDismiss]);
  const selected =
    target == null
      ? draft.unlinkedEmotions
      : (draft.events.find((event) => event.eventId === target)?.emotions ?? []);
  const save = async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(false);
    try {
      if (await onSave(draft)) onDismiss();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };
  return (
    <BottomSheet title="감정 수정하기" closable fitToScreen onDismiss={dismiss}>
      <View style={styles.events}>
        <Text variant="headline1" accessibilityRole="header">
          사건 선택
        </Text>
        <RetroStickerChoices
          options={[
            ...draft.events.map((event) => ({
              id: String(event.eventId),
              label: `${event.label} - ${event.emotions.map(emotionName).join(", ") || "선택한 감정 없음"}`,
            })),
            {
              id: "unlinked",
              label:
                draft.unlinkedEmotions.length === 0
                  ? "사건 없이 느낀 감정"
                  : `사건 없이 느낀 감정 - ${draft.unlinkedEmotions.map(emotionName).join(", ")}`,
            },
          ]}
          selected={[target == null ? "unlinked" : String(target)]}
          arrangement="stack"
          selectedTone="brown"
          disabled={saving}
          unselectedAppearance="outlined"
          selectionBorder="fill"
          onToggle={(id) => setTarget(id === "unlinked" ? null : Number(id))}
        />
      </View>
      <Card style={styles.emotionCard}>
        <Text variant="headline1" accessibilityRole="header">
          감정 선택
        </Text>
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          accessibilityLabel="감정 목록"
          showsVerticalScrollIndicator
        >
          <RetroStickerChoices
            options={EMOTIONS.map((emotion) => ({
              id: String(emotion.id),
              label: emotion.name,
              description: EMOTION_DETAILS[emotion.id].join(", "),
            }))}
            selected={selected.map(String)}
            descriptionSeparator=" - "
            descriptionPlacement="outside"
            disabled={saving}
            unselectedAppearance="outlined"
            selectionBorder="fill"
            onToggle={(id) => {
              const emotion = EMOTIONS.find((item) => String(item.id) === id);
              if (emotion == null) return;
              setDraft((prev) => {
                const current =
                  target == null
                    ? prev.unlinkedEmotions
                    : (prev.events.find((event) => event.eventId === target)?.emotions ?? []);
                const next = current.includes(emotion.id)
                  ? current.filter((value) => value !== emotion.id)
                  : [...current, emotion.id];
                return target == null
                  ? { ...prev, unlinkedEmotions: next }
                  : {
                      ...prev,
                      events: prev.events.map((event) =>
                        event.eventId === target ? { ...event, emotions: next } : event,
                      ),
                    };
              });
            }}
          />
        </ScrollView>
      </Card>
      {error ? (
        <Text variant="caption1" color={status.negative} accessibilityRole="alert">
          감정을 저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.
        </Text>
      ) : null}
      <Button
        label={saving ? "저장 중…" : "감정 저장하기"}
        disabled={saving}
        onPress={() => void save()}
      />
      <Button label="취소" variant="text" disabled={saving} onPress={dismiss} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { flexShrink: 1, minHeight: 0 },
  events: { gap: space.sm },
  emotionCard: {
    backgroundColor: diaryPaper.emotionCard.surface,
    borderWidth: 0,
    maxHeight: diaryPaper.emotionChoicesMaxHeight,
    flexShrink: 1,
    minHeight: 0,
    gap: space.sm,
  },
});
