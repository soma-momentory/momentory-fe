import type { ImageSourcePropType } from "react-native";

import type { EmotionId } from "@/features/emotion/model/emotion";

/** 사진을 추가할 때 이 표에 해당 감정 id와 정적 require만 더한다. 다른 감정 사진을 대체로 쓰지 않는다. */
export const DIARY_PHOTOS: Partial<Record<EmotionId, ImageSourcePropType>> = {
  1: require("../../../assets/diary/photos/joy.jpg"),
  2: require("../../../assets/diary/photos/calm.jpg"),
  3: require("../../../assets/diary/photos/proud.jpg"),
  4: require("../../../assets/diary/photos/affection.jpg"),
  5: require("../../../assets/diary/photos/sad.jpg"),
  6: require("../../../assets/diary/photos/anxious.jpg"),
  7: require("../../../assets/diary/photos/angry.jpg"),
  8: require("../../../assets/diary/photos/disappointed.jpg"),
  9: require("../../../assets/diary/photos/ashamed.jpg"),
  10: require("../../../assets/diary/photos/confused.jpg"),
  11: require("../../../assets/diary/photos/sorry.jpg"),
  12: require("../../../assets/diary/photos/exhausted.jpg"),
};

/** 감정 태그가 없는 일기 전용 그림. 새로운 감정 id나 스티커를 만들지 않는다. */
export const NEUTRAL_DIARY_PHOTO: ImageSourcePropType = require("../../../assets/diary/photos/neutral.jpg");

/** 서버가 정한 감정 순서에서 사진이 있는 첫 감정. 사진을 고르려고 감정 자체를 줄이거나 바꾸지 않는다. */
export function diaryPhotoOf(emotions: readonly EmotionId[]) {
  if (emotions.length === 0) return { emotion: null, source: NEUTRAL_DIARY_PHOTO };
  const emotion = emotions.find((id) => DIARY_PHOTOS[id] != null);
  return emotion == null ? null : { emotion, source: DIARY_PHOTOS[emotion]! };
}
