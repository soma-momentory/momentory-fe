import { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, motion, overlay, size, space } from "@/design/ds";

/**
 * 홈 「지금 하루 돌아보기」 버튼 — **위가 구름처럼 봉긋한 Solid Primary**
 * (2026-09-10 · 사용자 시안).
 *
 * ## 모양은 받은 그림 그대로다
 *
 * 구름 윤곽을 코드로 계산하지 않고 **시안 PNG 를 그대로 깐다**(사용자 요청).
 * 봉우리 넷의 크기와 간격, 끝이 옆으로 흘러내리는 결까지 그림이 가진 것이 정본이고,
 * 코드가 다시 그리면 **그림과 미묘하게 다른 것이 하나 더 생긴다.**
 *
 * ⚠ 폭에 맞춰 **늘여서 쓴다**(`resizeMode="stretch"`). 원본이 3.92:1 인데 이 버튼은
 * 2.8:1 이라 봉우리가 가로로 조금 눌린다 — 눈에 띄지 않는 정도라 그대로 둔다.
 * 라벨이 길어지면 눌린 정도가 줄어들 뿐 **모양이 깨지지는 않는다.**
 *
 * ⚠⚠ **색을 다시 칠하지 않는다.** 받은 초록이 `(88,116,96)` 으로 `primary.heavy`
 * (`#56755F`)와 사실상 같아서, 그림의 색이 곧 토큰의 색이다
 * (`scripts/keyout-home-cta.py` 머리말).
 *
 * ## DS 버튼이 아니라 홈의 장식이다
 *
 * `components/ds/Button` 을 고치지 않고 여기 따로 뒀다. 그 버튼은 **화면 40장이 함께
 * 쓰는 것**이라 모양을 바꾸면 온보딩·회고·모달의 확인까지 전부 구름이 된다.
 * 지금 이 모양을 원하는 자리는 **홈 카드 하나**다.
 *
 * ⚠ **두 번째 화면이 같은 모양을 원하면 그때 `components/ds/` 로 올린다.** 그 전에
 * 미리 올려 두면 「DS 에 있으니 써도 되는 것」이 되어 조용히 퍼진다.
 *
 * ⚠⚠ **폭을 재서 그림에 명시한다.** `StyleSheet.absoluteFill` 만으로는 안 된다 —
 * `require` 한 그림은 **자기 픽셀 크기를 그대로 dp 로 들고** 있어서, 폭·높이를 적어
 * 주지 않으면 768 × 196 짜리 초록 덩어리가 화면을 덮는다(실기기에서 그렇게 드러났다).
 *
 * 지키는 것은 그대로다 — 높이는 `size.button.large`, 좌우 여백도 DS 버튼과 같아
 * **같은 라벨이면 같은 폭이 나온다.** 누름은 **면 색을 바꾸지 않고 스크림을 얹는다**
 * (`DESIGN.md` §6) — 사각형 스크림을 덮으면 구름 밖까지 어두워지므로 **같은 그림을
 * 스크림 색으로 tint 해서** 겹친다. 화면의 유일한 solid 라는 규칙도 그대로다.
 *
 * ## 누름은 **눌린다** (2026-09-10 · 사용자 요청)
 *
 * 스크림 하나로는 반응이 약했다 — 구름은 면이 넓고 색이 짙어서, 그 위에 12% 를 얹어
 * 봐야 눈에 거의 안 들어온다. 그래서 둘을 함께 쓴다: **스크림을 한 단 올리고
 * (`pressStrong`) 버튼을 살짝 줄인다**(`PRESS_SCALE`).
 *
 * 크기가 줄어드는 것은 DS 에 없는 표현이지만, **§6 의 「면 색을 바꾸지 않는다」는
 * 지킨다** — 면은 그대로고 상자가 잠깐 작아질 뿐이다. 줄이는 값은 **잰 폭이 아니라
 * 비율**이라(`transform`) 자리 계산에 영향이 없다 — `onLayout` 이 재는 것은 변형
 * 전의 상자다.
 *
 * **둘 다 부드럽게 오간다**(2026-09-10 · 사용자 요청). 값 하나(`press` · 0→1)가
 * 크기와 스크림 짙기를 함께 끌고, 시간은 토큰(`motion.duration` · 120ms)을 쓴다 —
 * 이 화면에서 다른 것들이 움직이는 속도와 같다. 손을 떼면 같은 시간에 되돌아온다.
 *
 * ⚠ 스크림은 **늘 붙어 있고 짙기만 0 에서 오른다.** 누를 때 붙이면 그 순간 그림을
 * 한 장 더 그리게 되고, 카피바라에서 겪은 **첫 손짓 깜빡임**과 같은 일이 난다
 * (`HomeCapybara` 「처음부터 둘 다 붙여 둔다」).
 */
type Props = {
  label: string;
  onPress: () => void;
  /** 카드 안에서의 자리 보정 — 여백은 카드가 알고 있으므로 밖에서 받는다 */
  style?: StyleProp<ViewStyle>;
};

const HEIGHT = size.button.large;

/**
 * 라벨을 버튼 한가운데에서 아래로 내리는 양(dp) — **아주 조금**이다
 * (2026-09-10 · 사용자 요청).
 *
 * 구름은 위가 파여 있어서 면의 무게가 아래쪽에 쏠린다. 상자의 기하학적 중앙에
 * 두면 글자가 그 무게보다 위에 떠 보인다. 계곡선 아래의 정중앙(≈14)까지 내리면
 * 이번엔 바닥에 붙어 보여서, **그 절반쯤**에서 멈춘다.
 */
const LABEL_DROP = 8;

/**
 * 누르는 동안 줄어드는 비율. 3% 는 **눈으로 보이지만 덜컹거리지는 않는** 폭이다 —
 * 더 줄이면 넓은 면이 통째로 튀어 보인다.
 */
const PRESS_SCALE = 0.97;

const ART = require("../../../../assets/home/cta-scallop.png");

/** 누름이 들어오고 나가는 시간 — 화면의 다른 움직임과 같은 박자(`DESIGN.md` §12) */
const PRESS_MS = motion.duration;

export function ScallopButton({ label, onPress, style }: Props) {
  /**
   * 잰 폭. **0 인 동안에는 면을 그리지 않는다** — 크기를 모르는 채로 그리면 첫
   * 프레임에 원본 크기(768)의 초록 덩어리가 스친다. 라벨은 그 프레임에도 제자리에
   * 있으므로 버튼이 사라져 보이지는 않는다.
   */
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const face = { position: "absolute" as const, left: 0, top: 0, width, height: HEIGHT };

  const [down, setDown] = useState(false);
  // 저장소 관례(`ChatBubble`·`SurfaceRipple`) — ref 는 렌더 중 읽지 않는다
  const [press] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const run = Animated.timing(press, {
      toValue: down ? 1 : 0,
      duration: PRESS_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    run.start();
    return () => run.stop();
  }, [down, press]);

  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, PRESS_SCALE] });

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onLayout={onLayout}
      style={[styles.base, style]}
    >
      {/* 줄어드는 것은 **안쪽 판**이다 — 바깥 상자가 그대로여야 자리가 안 밀린다 */}
      <Animated.View style={[styles.face, { transform: [{ scale }] }]}>
        {width > 0 ? (
          <>
            <Image source={ART} style={face} resizeMode="stretch" />
            {/* 누름 스크림 — 같은 그림을 스크림 색으로 칠해 덮는다(구름 밖은 그대로).
                ⚠ 늘 붙어 있고 짙기만 오간다(⚠ 위 머리말) */}
            <Animated.Image
              source={ART}
              style={[face, { opacity: press }]}
              resizeMode="stretch"
              tintColor={overlay.pressStrong}
            />
          </>
        ) : null}
        <Text variant="label1" color={labelColor.onFill}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /**
   * 바깥 상자 — **높이만 정하고 폭은 글자 칸을 다 쓴다**
   * (2026-09-10 · 사용자 요청 「오른쪽으로 더 늘려줘」). hug 이던 것을 늘린 이유가
   * 둘이다: 시안이 옆으로 긴 모양이라 좁으면 봉우리가 눌려 뾰족해지고, 오른쪽에 남던
   * 빈 자리가 카피바라와 버튼 사이에서 어정쩡했다. 늘리면 폭÷높이가 시안(3.92)에
   * 가까워져 **봉우리가 그림 그대로 선다.**
   *
   * ⚠ `alignSelf` 를 적지 않는다 — 세로 칸(`ctaBody`)의 기본이 stretch 라 가만두면
   * 칸을 다 쓴다. 카피바라 자리는 그 칸 **밖**이라 침범하지 않는다.
   *
   * ⚠ 여백과 정렬은 **안쪽 판**(`face`)이 든다 — 눌릴 때 줄어드는 것이 그쪽이라
   * 바깥 상자는 자리를 지키는 일만 한다.
   */
  base: { height: HEIGHT },
  // 눌리는 판 — 상자를 꽉 채우고 이 안에서 그림과 글자가 함께 줄어든다
  face: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    // 글자는 한가운데에서 **아주 조금** 내려앉는다(⚠ `LABEL_DROP`)
    paddingTop: LABEL_DROP,
  },
});
