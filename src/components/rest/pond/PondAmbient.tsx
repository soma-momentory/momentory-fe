import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet } from "react-native";

/**
 * 연못의 **살아 있는 수면** — 배경 그림 위에 겹치는 움직이는 한 장
 * (2026-09-06 · `pond-ambient.webp` 720×1280 · 73프레임 · 12fps · 6.0초 · 9:16).
 *
 * ## 정지한 그림 위에 움직이는 그림을 겹친다
 *
 * 배경을 이 파일로 **바꾸지 않고** 위에 얹는다. 그래야 못 그렸을 때(에셋 손상 ·
 * 디코딩 실패 · 메모리 부족) 아래의 `pond-background.png` 가 그대로 보이고, 연못이
 * 비는 순간이 없다 — `onError` 가 오면 이 층은 조용히 사라진다(`failed`).
 * 두 그림은 비율이 사실상 같고(0.5625 : 0.5628) 같은 상자에 `cover` 로 앉으므로
 * **잘리는 곳도 같다** — 물러나도 화면이 움직이지 않는다.
 *
 * ## 받은 그림은 그대로 쓰지 않는다
 *
 * 디자이너 원본은 **24fps · 145프레임 · 거의 무손실(30.5MB)** 이다. 그대로 담으면
 * 저장소 이력에 30MB 가 영영 남고 앱도 그만큼 무거워진다 — 잔잔하게 흔들리는 물은
 * 그 정도 정보를 필요로 하지 않는다. 그래서 **프레임을 반으로(24 → 12fps · 원본
 * 프레임의 재생 시간을 합쳐 전체 길이 6.0초는 그대로) 줄이고 손실 압축(q70)** 해서
 * 3.8MB 로 담는다. 폭은 줄이지 않았다 — 화면(1080)이 이미 720 을 1.5배로 늘려 쓰고
 * 있어서 더 줄이면 흐려진다.
 *
 * 원본은 `assets/sensory-pond/source/`(이력에 담지 않는다)에 둔다.
 * **새 그림을 받으면 같은 방법으로 줄여서 담는다.**
 *
 * ## 스스로 돌고, 우리는 멈추지 않는다
 *
 * animated WebP 는 `expo-image` 가 붙자마자 스스로 재생하고(`autoplay` 기본값)
 * **무한 반복**한다 — 재생·정지 상태를 우리가 들지 않는다(카피바라 `baba-idle.webp`
 * 와 같은 판단). 화면을 나가면 뷰가 사라지면서 디코더도 함께 정리된다.
 *
 * ## 단계가 바뀌어도 다시 시작하지 않는다
 *
 * `PondScene` 이 이 층을 단계와 무관하게 그리고(`key` 를 갈지 않는다),
 * `recyclingKey` 가 고정이라 뷰가 재사용된다. `transition={0}` 이라 페이드도 없다 —
 * 보기 → 듣기 → 감각 → 완료를 지나는 동안 물은 **끊기지 않고 계속 흐른다.**
 *
 * ## 자연의 움직임이지 사용자의 반응이 아니다
 *
 * 이 층은 연못이 원래 하고 있는 일(물빛·바람)이다. 사용자가 만든 파문
 * (`SurfaceRipple`)은 **다른 층**에 따로 그린다 — 둘이 한 그림에 섞이면 「내가
 * 건드려서 움직였다」가 물빛에 묻힌다.
 *
 * 장식이라 낭독기에 읽히지 않고 손짓도 받지 않는다 — 위를 눌러도 수면의 몫이다.
 */
type Props = {
  width: number;
  height: number;
};

/**
 * 움직이는 수면 — **그림을 바꿀 때 고치는 곳은 이 한 줄이다.**
 * 표로 두는 이유는 `require` 가 없는 파일을 가리키면 번들러가 멈추기 때문이다:
 * 에셋이 아직 없을 때는 이 줄을 지우면 층 전체가 조용히 물러난다.
 */
const AMBIENT: Partial<Record<"pond", number>> = {
  pond: require("../../../../assets/sensory-pond/pond-ambient.webp"),
};

export function PondAmbient({ width, height }: Props) {
  // 한 번 실패하면 그대로 물러난다 — 껌뻑이며 다시 시도하지 않는다
  const [failed, setFailed] = useState(false);
  const source = AMBIENT.pond;

  if (source == null || failed) return null;

  return (
    <Image
      testID="pond-ambient"
      source={source}
      contentFit="cover"
      // 단계가 넘어가도 재생이 처음부터 다시 시작하지 않게(카피바라와 같은 이유)
      recyclingKey="pond-ambient"
      transition={0}
      onError={() => setFailed(true)}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.layer, { width, height }]}
    />
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, top: 0 },
});
