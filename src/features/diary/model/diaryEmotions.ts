import type { EmotionId } from "@/features/emotion/model/emotion";
import { emotionName } from "@/features/emotion/model/emotion";
import type { DiaryEmotionSelection } from "./types";

export const allDiaryEmotions = (selection: DiaryEmotionSelection): EmotionId[] => [
  ...new Set([
    ...selection.events.flatMap((event) => event.emotions),
    ...selection.unlinkedEmotions,
  ]),
];

/** 같은 감정이 여러 사건에 연결되어 있으면 해당 사건을 모두 보여준다. */
export const diaryEmotionCaption = (
  selection: DiaryEmotionSelection,
  emotion: EmotionId,
): string => {
  const labels = selection.events
    .filter((event) => event.emotions.includes(emotion))
    .map((event) => event.label);
  if (selection.unlinkedEmotions.includes(emotion)) labels.push("사건 없이 느낀 감정");
  return labels.length === 0
    ? emotionName(emotion)
    : labels.map((event) => `${event} - ${emotionName(emotion)}`).join("\n");
};
