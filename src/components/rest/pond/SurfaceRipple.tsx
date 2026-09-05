import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

import { pond, pondLayout, pondMotion, surfaceRippleMs } from "@/design/ds";
import type { SensePondStepId } from "@/features/rest/model/sensePond";

/**
 * **수면을 건드린 자리**에서 퍼지는 물결 — 이 콘텐츠의 반응은 이것 하나다
 * (2026-09-06).
 *
 * 손끝이 닿은 곳에서 얇은 링 둘이 천천히 번지다 사라진다. 다 퍼지면 `onDone` 을
 * 한 번 부른다 — 연못이 그때 이 물결을 지운다.
 *
 * ## 단계마다 결이 다르다
 *
 * 크기·시간·짙기는 **지금 단계**가 정한다(`pondMotion.surfaceRipple.step`) —
 * 보기는 또렷하고, 듣기는 더 넓고 느리고, 감각은 가장 크고 느리다. 감각 단계의
 * 물결이 이 콘텐츠의 **마무리**이기도 하다(따로 완료 파동을 두지 않는다).
 *
 * ## 장면을 가리지 않는다
 *
 * 그림 한 장(큰 PNG)을 얹지 않고 **테두리만 있는 원 둘**을 애니메이션으로 그린다.
 * 면이 없으니 배경·연잎·카피바라가 이 위로 비쳐 보이고, 「수면이 한 번 움직였다」
 * 이상으로 읽히지 않는다.
 *
 * 색은 물이 밝게 튕기는 **흰빛**(`pond.surface`)이다 — 물마루에 빛이 걸린 것처럼
 * 읽힌다. 풀빛(`pond.ripple`)을 1px 로 얹던 처음 값은 밝은 물빛 위에서 **보이지
 * 않았다**(2026-09-06). 채워진 흰 원이었다면 UI 배지가 됐겠지만, 가는 선 둘이라
 * 장면 안에 잠긴다.
 *
 * ## 원이 아니라 타원이다
 *
 * 수면을 비스듬히 보고 있어(배경 일러스트) 파동은 세로로 눌린다
 * (`pondLayout.flatten`) — 정원으로 그리면 물 위가 아니라 **화면 위에 얹힌 UI 원**이
 * 된다 — 그림 속 돌 주위의 잔물결에서 잰 눌림이다(`pondLayout.flatten`).
 *
 * ## 끝은 시계가 말한다
 *
 * `onDone` 은 애니메이션의 완료 콜백이 아니라 **같은 길이의 타이머**가 부른다 —
 * 네이티브 드라이버의 완료는 jest 에 오지 않고, 앱이 뒤로 갔다 오면 늦게 올 수 있다.
 */
type Props = {
  /** 건드린 자리 — 장면 안의 픽셀 */
  x: number;
  y: number;
  /** 어느 단계의 손짓이었나 — 물결의 결을 정한다 */
  step: SensePondStepId;
  onDone: () => void;
};

/** 링 둘의 공통 규격 — 모듈 상수라 렌더가 몇 번 돌아도 같은 값이다 */
const RIPPLE = pondMotion.surfaceRipple;

export function SurfaceRipple({ x, y, step, onDone }: Props) {
  const spec = RIPPLE.step[step];
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [progress] = useState(() =>
    Array.from({ length: RIPPLE.rings }, () => new Animated.Value(0)),
  );

  useEffect(() => {
    // ⚠ 규격은 **효과 안에서** 표를 다시 읽는다. 렌더에서 만든 객체를 의존성에 넣으면
    // 참조가 매번 달라져, 물결이 하나 늘 때마다(부모가 다시 그린다) **이미 퍼지던
    // 물결의 애니메이션과 지우는 타이머가 처음부터 다시 시작된다** — 빠르게 여러 번
    // 건드리면 앞선 물결이 제 수명보다 오래 남는다.
    const it = RIPPLE.step[step];
    const rings = progress.map((v, i) =>
      Animated.timing(v, {
        toValue: 1,
        duration: it.duration,
        delay: i * it.stagger,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    rings.forEach((r) => r.start());
    const t = setTimeout(onDone, surfaceRippleMs(step));
    return () => {
      rings.forEach((r) => r.stop());
      clearTimeout(t);
    };
    // onDone 은 부모가 매 렌더 새로 만든다 — 물결 하나의 수명은 여기서 한 번만 잰다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, step]);

  const half = spec.size / 2;
  const flat = pondLayout.flatten;
  return (
    <>
      {progress.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          testID="pond-surface-ripple"
          style={[
            styles.ring,
            {
              left: x - half,
              top: y - half,
              width: spec.size,
              height: spec.size,
              borderRadius: half,
              borderWidth: RIPPLE.strokeWidth,
              opacity: v.interpolate({
                inputRange: [0, 0.1, 1],
                outputRange: [0, spec.peakOpacity, 0],
              }),
              transform: [
                {
                  scaleX: v.interpolate({ inputRange: [0, 1], outputRange: [RIPPLE.fromScale, 1] }),
                },
                {
                  scaleY: v.interpolate({
                    inputRange: [0, 1],
                    outputRange: [RIPPLE.fromScale * flat, flat],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  ring: { position: "absolute", borderColor: pond.surface },
});
