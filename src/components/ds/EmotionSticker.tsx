import { Image, StyleSheet, View, type ImageStyle, type ViewStyle } from "react-native";

import type { EmotionId } from "@/features/emotion/model/emotion";
import { fill, line } from "@/design/ds";

/**
 * 감정 스티커 — 보관함 달력이 「그날 무슨 마음이었는지」를 **얼굴 하나**로 말한다.
 *
 * ## 왜 도트가 아니라 그림인가
 *
 * `EmotionDot` 은 55% 틴트 + 원색 링의 **색 하나**다. 달력 한 달을 펼쳐 놓으면 그
 * 색 열 가지가 서로 가까워(원색 대비 1.46~3.31 · `ds/color.ts` 머리말) 「비슷한
 * 파스텔 점 서른 개」로 읽혔다. 얼굴은 **눈·눈썹·입 모양**이 함께 달라서 색이 안
 * 보이는 눈에도 갈린다 — 「감정을 색만으로 판단하게 하지 않는다」(`RULES.md`
 * 「보관함」)를 이 격자 안에서 처음으로 그림이 거든다.
 *
 * ⚠ 그래도 **이름을 대신하지는 못한다.** 스티커는 장식이라 낭독기에 읽히지 않고,
 * 그날 감정의 이름은 여전히 아래 기록 카드가 글자로 말한다(달력 칸의 낭독기
 * 이름에도 감정 이름을 붙인다 · `ds/Calendar.tsx`).
 *
 * ## 그림의 색은 코드가 정하지 않는다
 *
 * 카피바라 그림과 같은 판단이다(`DESIGN.md` 「쉼터」) — 열 장은 각자 색을 들고
 * 있고 여기서 tint 하지 않는다. 원본을 갈아 끼우면 색도 함께 바뀐다.
 *
 * `id` 가 `null` 이면 **감정 없이 끝난 일기**다. 얼굴을 지어내지 않고 잔잔한 중립
 * 원으로 「썼지만 감정은 안 골랐다」 자리만 지킨다 — `EmotionDot` 의 빈 자리와 같다.
 */
type Props = {
  id: EmotionId | null;
  /**
   * 한 변. **없으면 부모 자리를 가득 채운다** — 달력은 그림 크기를 칸 폭에서
   * 계산하므로(`ds/Calendar.tsx`) 여기에 숫자를 박아 두면 그 계산이 무시된다.
   */
  size?: number;
};

export function EmotionSticker({ id, size }: Props) {
  const box: ImageStyle & ViewStyle = size == null ? FILL : { width: size, height: size };

  if (id == null) {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        // 반지름은 **지름의 절반**이다 — `radius.full` 을 쓰지 않는다(`EmotionDot` 주석).
        // 크기를 안 받았으면(부모를 채우는 자리) 반지름도 못 셈하므로 자리 크기의
        // 절반이 될 만큼 큰 값을 주지 않고, 부모가 정사각인 것을 믿고 절반을 쓴다
        style={[styles.blank, box, size == null ? styles.blankFill : { borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <Image
      source={STICKERS[id]}
      style={box}
      // 정사각 원본이라 늘어날 일이 없지만, 원본이 갈릴 때를 대비해 비율을 지킨다
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/**
 * 감정 id → 그림. **`require` 는 정적이어야 한다** — Metro 가 번들에 넣을 파일을
 * 빌드 때 정하므로 `require(\`.../${key}.png\`)` 같은 조립은 못 쓴다. 그래서 열 줄을
 * 손으로 적는다. 파일 이름은 서버 감정 키(`EMOTION_KEYS`)와 같다.
 *
 * `Record<EmotionId, …>` 라서 감정이 늘면 컴파일러가 빠진 칸을 잡는다.
 */
const STICKERS: Record<EmotionId, number> = {
  1: require("../../../assets/emotion/happy.png"),
  2: require("../../../assets/emotion/proud.png"),
  3: require("../../../assets/emotion/calm.png"),
  4: require("../../../assets/emotion/tired.png"),
  5: require("../../../assets/emotion/stuck.png"),
  6: require("../../../assets/emotion/lethargic.png"),
  7: require("../../../assets/emotion/anxious.png"),
  8: require("../../../assets/emotion/depressed.png"),
  9: require("../../../assets/emotion/angry.png"),
  10: require("../../../assets/emotion/frustrated.png"),
};

/** 크기를 안 받았을 때 — 부모(달력의 그림 자리)를 그대로 채운다 */
const FILL = { width: "100%", height: "100%" } as const;

const styles = StyleSheet.create({
  blank: { backgroundColor: fill.alternative, borderWidth: 1.5, borderColor: line.alternative },
  // 부모를 채우는 자리는 지름을 모른다 — 달력 칸(≤34)에서 원이 되는 값이면 충분하다
  blankFill: { borderRadius: 17 },
});
