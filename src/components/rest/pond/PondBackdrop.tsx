import { Image, StyleSheet } from "react-native";

/**
 * 연못 배경 — **일러스트 한 장**(`assets/sensory-pond/pond-background.png` · 2026-09-03).
 *
 * 2026-09-06 부터 이 그림은 **대비책**이다 — 눈에 보이는 물은 그 위에 겹치는
 * `PondAmbient`(움직이는 수면)이고, 이 층은 그것이 뜨기 전과 못 뜰 때를 받친다.
 * 그래서 지우지 않는다: 연못이 한 프레임도 비지 않아야 한다.
 *
 * 처음에는 물·연잎·갈대·돌·꽃을 SVG 로 직접 그렸다(옛 `PondScene`). 일러스트가
 * 들어오면서 그 장면은 지웠고, 이제 배경은 그림 한 장이 전부다 — 그림 속 연잎·돌·
 * 갈대는 **장식**이고, 사용자가 남기는 흔적(`TraceLeaf`·`TraceRing`·`TraceWarm`)은
 * 이 위에 따로 얹힌다. 그림은 움직이지 않는다 — 영상처럼 다루지 않는다.
 *
 * ## 채우되 비율은 지킨다
 *
 * 연못 영역(폭 335 · 높이 420~460)은 그림(2:3)보다 조금 납작하다. `cover` 로 폭을
 * 맞추면 위·아래가 각 7% 남짓 잘린다 — 잘리는 곳은 나무 그늘과 아래 풀숲이고, 물과
 * 왼쪽 아래 모래 물가(카피바라 자리)는 다 보인다. `contain` 이면 양옆에 둑 색 띠가
 * 남아 그림이 카드 안에 「붙어 있는」 느낌이 된다.
 *
 * ⚠ 크기는 **잰 값으로 명시한다.** `absoluteFill` 만 주면 안드로이드(Fabric)에서 그림이
 * 원본 크기(1023×1537dp)로 놓여 왼쪽 위 귀퉁이만 보였다(2026-09-03 에뮬레이터).
 *
 * 장식이라 낭독기에 읽히지 않는다 — 연못이 「연못」 하나로 읽힌다.
 */
type Props = {
  width: number;
  height: number;
};

/**
 * 연못 그림 — **이 파일 하나만 든다.** 여러 곳에서 각자 `require` 하면 그림을 바꿀 때
 * 한쪽만 바뀐다. (옛 수면 울렁임 `SurfaceWarp` 이 같은 그림을 오려 썼다 —
 * 2026-09-05 손짓 구조 개편으로 사라졌고, 지금 이 그림을 쓰는 곳은 여기뿐이다.)
 */
export const POND_BACKGROUND = require("../../../../assets/sensory-pond/pond-background.png");

export function PondBackdrop({ width, height }: Props) {
  return (
    <Image
      source={POND_BACKGROUND}
      resizeMode="cover"
      style={[styles.image, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID="pond-backdrop"
    />
  );
}

const styles = StyleSheet.create({
  image: { position: "absolute", left: 0, top: 0 },
});
