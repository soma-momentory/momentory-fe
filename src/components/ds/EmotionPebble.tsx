import { Image, StyleSheet, View, type ImageStyle } from "react-native";

import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 「이번 주 감정」의 **하루 한 조약돌** — 홈의 주간 줄과 리포트의 7일 흐름이 함께 쓴다
 * (2026-09-11 · 사용자 시안).
 *
 * ## 색 한 점에서 그림 한 장으로
 *
 * 전에는 `EmotionDot`(55% 틴트 면 + 원색 1.5px 링 · `DESIGN.md` §1)이 이 자리에
 * 섰다. 지금은 **수채로 칠한 조약돌 열 장**이 그 자리를 대신한다 — 감정마다 한 장이고,
 * 모양이 조금씩 다른 조약돌이라 일곱 개가 나란히 서도 도장 찍은 것처럼 보이지 않는다.
 *
 * ⚠ **`EmotionDot` 을 고치지 않았다.** 그 도트는 일기 미리보기·감정 줄에서 **이름 옆의
 * 작은 표식**으로도 쓰인다(`DiaryEmotionRow`·`DiaryPreviewCard`). 거기까지 그림으로
 * 바꾸면 10dp 짜리 자리에 수채 조약돌이 들어가 뭉개진다 — 바뀌는 자리는 주간 줄 둘뿐이다.
 *
 * ## 링을 두지 않는다 — 고른 칸도 링이 아니다
 *
 * 도트의 원색 링은 **틴트 면이 옅어서** 있던 것이다. 조약돌은 스스로 짙어서 링이
 * 겹치면 그림의 결과 싸우고, 조약돌은 정원이 아니라서 둥근 링은 **깨진 테두리**로 보인다
 * (2026-09-11 · 실기기). 그래서 테두리를 아예 두지 않는다 — 고른 칸은 부르는 쪽이
 * `SelectLift` 로 **살짝 들어 올린다**.
 *
 * ## 감정 없이 끝난 일기는 **빈 조약돌**이다
 *
 * `id` 가 `null` 이면 **일기는 썼는데 감정이 추출되지 않은 날**이다 — 테두리만 있는
 * 조약돌(`no-emotion.png`)로 「썼다」를 말한다(2026-09-11 · 사용자 반입). 색을 지어내지 않는다.
 *
 * ⚠ **일기가 없는 날은 여기 오지 않는다** — 그 빈 자리는 부르는 쪽이 `WeekEmptyDot` 으로
 * 그린다. 「썼는데 감정이 없다」와 「안 썼다」는 다른 칸이라, 무엇인지는 부르는 쪽이 안다.
 *
 * 조약돌은 장식이라 낭독기에 읽히지 않는다 — 감정 이름은 칸의 접근성 라벨이 이미 읽는다
 * (`EmotionDot` 과 같은 판단 · 색만으로 판단하게 하지 않는다).
 */
type Props = {
  /** `null` — 일기는 있는데 감정이 없는 날(빈 조약돌) */
  id: EmotionId | null;
  /** 지름 — 홈·리포트 모두 26 */
  size?: number;
};

/** 감정 id → 조약돌. 파일 이름은 **서버 감정 키**와 같다(`assets/emotion-pebble/README.md`) */
const MARKS = {
  1: require("../../../assets/emotion-pebble/happy.png"),
  2: require("../../../assets/emotion-pebble/proud.png"),
  3: require("../../../assets/emotion-pebble/calm.png"),
  4: require("../../../assets/emotion-pebble/tired.png"),
  5: require("../../../assets/emotion-pebble/stuck.png"),
  6: require("../../../assets/emotion-pebble/lethargic.png"),
  7: require("../../../assets/emotion-pebble/anxious.png"),
  8: require("../../../assets/emotion-pebble/depressed.png"),
  9: require("../../../assets/emotion-pebble/angry.png"),
  10: require("../../../assets/emotion-pebble/frustrated.png"),
} as const;

/** 감정 없이 끝난 일기 — 테두리만 있는 빈 조약돌(`scripts/make-no-emotion-marks.py`) */
const NO_EMOTION = require("../../../assets/emotion-pebble/no-emotion.png");

/** 조약돌 그림 — 공책 스티커처럼 그림을 직접 겹쳐 그리는 자리가 쓴다 */
export const emotionPebbleSource = (id: EmotionId | null) => (id == null ? NO_EMOTION : MARKS[id]);

export function EmotionPebble({ id, size = 26 }: Props) {
  // 반지름은 **지름의 절반**이다 — `radius.full`(999)을 쓰지 않는다(`EmotionDot` 주석의
  // 안드로이드 New Architecture 사정이 그대로 적용된다)
  const box = { width: size, height: size, borderRadius: size / 2 } as const;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={box}>
      <Image
        source={id == null ? NO_EMOTION : MARKS[id]}
        style={[styles.art, box as ImageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 링이 얹히면 그 안쪽에 그려지도록 — 상자를 꽉 채우되 테두리를 덮지 않는다
  art: { position: "absolute", left: 0, top: 0 },
});
