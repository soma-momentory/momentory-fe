import type { ImageSourcePropType } from "react-native";

import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 감정 얼굴 아이콘 9종 — 새 디자인 팔레트의 카피바라 얼굴
 * (`docs/design/design-system.md` §1.4 · 원본 `docs/design/prototype/assets/`).
 *
 * id ↔ 파일 대응은 `src/design/paper.ts` `paperEmotions` 의 `icon` 과 같다 —
 * RN 의 require 는 정적 경로만 받아서 맵을 여기 편다. 감정 미선택(null)은
 * 아이콘이 없다 — 색(`paperColors.neutral.task`)으로만 표시한다.
 *
 * 표시 크기는 스펙이 세 단이다: 캘린더 셀 22 · 기록 카드 32 · 리스트 아바타 34.
 */
export const MOOD_ICONS: Record<EmotionId, ImageSourcePropType> = {
  1: require("../../../assets/moods/mood-anxious.png"), //  불안함
  2: require("../../../assets/moods/mood-down.png"), //     우울함
  3: require("../../../assets/moods/mood-angry.png"), //    화남/답답
  4: require("../../../assets/moods/mood-happy.png"), //    행복함
  5: require("../../../assets/moods/mood-stuck.png"), //    막막함
  6: require("../../../assets/moods/mood-flat.png"), //     무기력
  7: require("../../../assets/moods/mood-tired.png"), //    피곤함
  8: require("../../../assets/moods/mood-excited.png"), //  뿌듯함 (이름 유지 — PLAN.md D3)
  9: require("../../../assets/moods/mood-calm.png"), //     평온함
};

export const MOOD_ICON_SIZE = { calendarCell: 22, recordCard: 32, listAvatar: 34 } as const;
