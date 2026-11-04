import { Image } from "expo-image";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { pondLayout } from "@/design/ds";

/**
 * 연못가의 카피바라 — **움직이는 그림 한 장**
 * (`expo-image` 로 그리는 알파 있는 animated WebP · 2026-09-05).
 *
 * ## 마주 보지 않고, 같이 본다
 *
 * 정면으로 사용자를 보던 선화 캐릭터에서 **연못 쪽으로 앉은** 그림으로 바꿨다.
 * 이 화면에서 카피바라는 말을 거는 안내자가 아니라 **같은 곳을 보고 있는 동반자**다 —
 * 눈이 마주치면 「나를 보고 있다」가 되고, 옆에 앉아 있으면 「함께 있다」가 된다.
 * 그림이 오른쪽을 보고 있어 **왼쪽 아래 물가**에 두면 시선이 물 쪽으로 간다
 *
 *
 * ## 층을 따로 둔다 — 연못은 「어디에 얼마나 크게」만 안다
 *
 * 배경에 합치지 않고 컴포넌트 하나로 떼어 뒀다. 무엇이 그려지는지는
 * 여기만 알기 때문에 **포즈가 늘어도 이 파일만 바뀐다**(`POSES`) — 나중에
 * `react`(작은 반응) · `relax`(완료)가 오면 표에 줄을 더하고 `pose` 를 받으면 된다.
 * 지금 부르는 곳은 포즈를 넘기지 않는다 — 갈 곳 없는 값을 미리 만들지 않는다.
 *
 * ## 왜 비디오가 아니라 WebP 인가
 *
 * 카피바라는 수채 배경 **위에** 앉아야 해서 알파가 필요하다. mp4(H.264)는 알파를
 * 담지 못하고(2026-09-05 에 받은 `baba-idle.mp4` 는 검정 사각형 배경이었다),
 * 알파 비디오는 Android(VP9-알파 WebM)와 iOS(HEVC-알파)가 서로 다른 벌을 요구한다.
 * animated WebP 는 한 벌로 두 플랫폼이 같고, 재생·정지 상태를 우리가 들지 않아도 된다 —
 * `expo-image` 가 붙자마자 스스로 돌고(`autoplay` 기본값 true) 무한 반복한다.
 * 화면을 나가면 뷰가 사라지면서 디코더도 함께 정리된다 — 우리가 멈출 것이 없다.
 *
 * ⚠ **받은 WebP 도 검정 매트 위에 합성돼 있었다**(알파는 있지만 전 픽셀 불투명 ·
 * 2026-09-05). 검정 위에 합성된 그림은 색이 이미 알파로 곱해진 상태라, 밝기에서
 * 알파를 만들고 색을 그 알파로 나눠 **원래 그림을 되살렸다**(테두리를 잘라 내지 않고
 * 부분 알파로 넘겨서 검은 띠가 없다). 피사체에 맞춰 자르고 384 폭 · 15fps 로 줄였다.
 * 받은 원본은 `assets/sensory-pond/source/baba-idle-blackmatte.webp` 에 그대로 있다
 * (`source/` 는 이력에 담지 않는다). **알파를 담은 export 를 받으면 그걸로 갈아 끼운다.**
 *
 * ## 못 그리면 정지 그림으로 앉는다
 *
 * 에셋이 없거나 디코딩에 실패해도 **자리가 비지 않는다** — 정지 PNG 로 물러난다.
 * 카피바라는 이 화면의 「함께 있음」이라 비면 연못만 남는다.
 *
 * 색은 일러스트의 것이라 토큰으로 옮기지 않는다(구글 마크와 같은 판단 ·
 * `ds/color.ts` `social`). 장식이라 낭독기에 읽히지 않는다 — 연못이 「연못」 하나로
 * 읽힌다. 손짓도 받지 않는다(`pointerEvents="none"`) — 카피바라를 눌러도 그 탭은
 * 연못의 것이다.
 */
type Props = {
  /** 그림의 폭 — 높이는 그림의 비율(세로가 조금 길다)이 정한다 */
  size: number;
};

/**
 * 가로 ÷ 세로 — 그림에서 잰 값(`pondLayout.capybaraAspect`). 정지 PNG 가
 * 290 × 384(0.755), 움직이는 그림이 384 × 510(0.753)이라 **둘이 같은 비율**이다.
 * 물러날 때 카피바라가 커지거나 작아지지 않는 것이 중요해서, 새 포즈도 이 비율로
 * 잘라 받는다. 정본은 `ds/pond.ts` 에 있다.
 */
const ASPECT = pondLayout.capybaraAspect;

/** 움직이는 그림을 못 그릴 때 앉는 정지 그림 */
const STILL = require("../../../../assets/sensory-pond/baba-idle-base.png");

/**
 * 포즈 → 그림. **여기 한 표만 바뀌면 포즈가 바뀐다.**
 *
 * `react`(작은 반응) · `relax`(완료)가 오면 줄을 더하고 `pose` 를 받는다. 지금
 * 부르는 곳은 포즈를 넘기지 않는다 — 갈 곳 없는 값을 미리 만들지 않는다.
 *
 * ⚠ 새 포즈는 **피사체에 맞춰 자른 알파 WebP** 여야 한다(`ASPECT`). 프레임에 여백이
 * 있으면 `contentFit` 이 그 여백까지 담느라 **카피바라만 작아지고**, 배경이 불투명하면
 * 수채 위에 사각형이 그대로 보인다.
 */
const POSES = {
  idle: require("../../../../assets/sensory-pond/baba-idle.webp"),
} as const;

export function CapybaraFigure({ size }: Props) {
  // 움직이는 그림이 실패한 뒤에만 true — 한 번 물러나면 그대로 둔다(껌뻑이지 않게)
  const [failed, setFailed] = useState(false);

  return (
    <View
      testID="pond-capybara"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, { width: size, height: size / ASPECT }]}
    >
      <Image
        source={failed ? STILL : POSES.idle}
        contentFit="contain"
        // 단계가 넘어가도 이 뷰는 그대로 산다 — 재생이 처음부터 다시 시작하거나
        // 한 칸 비었다 돌아오지 않게, 그림이 바뀔 때만 뷰를 새로 만든다
        recyclingKey="capybara-idle"
        // 페이드로 들어오면 단계가 바뀔 때마다 카피바라가 깜빡인 것처럼 보인다
        transition={0}
        onError={() => setFailed(true)}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "flex-end" },
  image: { width: "100%", height: "100%" },
});
