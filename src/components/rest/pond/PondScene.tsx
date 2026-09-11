import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";

import { isWaterSpot, pond, pondLayout, pondMotion, pondSize, type PondSpot } from "@/design/ds";
import {
  SENSE_LABEL,
  type PondInput,
  type SensePointKind,
  type SensePondStepId,
} from "@/features/rest/model/sensePond";

import { CapybaraFigure } from "./CapybaraFigure";
import { HoldGlow } from "./HoldGlow";
import { PondAmbient } from "./PondAmbient";
import { PondBackdrop } from "./PondBackdrop";
import { PondDecor } from "./PondDecor";
import { SurfaceRipple } from "./SurfaceRipple";

/**
 * 감각연못의 **장면** — 연못 하나가 화면을 채운다
 * (2026-09-05 · 층 정리와 수면 터치 2026-09-06 · 표시·결과물 걷어내기 2026-09-06 ·
 * 옛 이름 `SensePond`).
 *
 * 카드가 아니라 사용자가 들어와 있는 곳이다. 화면이 하는 일(단계·셈·문안)과 나뉘어
 * 있어서, 이 파일은 **무엇이 어떤 층에 그려지는가**만 안다.
 *
 * ## 층 (아래에서 위로)
 *
 * 1. **정지 배경(대비책)** `PondBackdrop` — `pond-background.png`. 언제나 여기 있다
 * 2. **움직이는 수면** `PondAmbient` — `pond-ambient.webp`(무한 반복). 지금 보이는
 *    물은 이 층이고, 못 그리면 조용히 물러나 1번이 그대로 보인다
 * 3. **떠 있는 것** `PondDecor` — 수련 꽃 하나. 배경 그림 속 연잎·연꽃은 그대로
 *    **자연 풍경**이고, 우리가 새로 띄우는 것은 없다(2026-09-06)
 * 4. **손짓** — 장면을 덮는 투명한 면 하나. 눈에 보이지 않고 아무것도 가리지 않는다
 * 5. **반응** `SurfaceRipple`(건드린 자리의 물결) · `HoldGlow`(누르고 있는 동안의 빛)
 * 6. **카피바라** `CapybaraFigure` — 왼쪽 물가의 동반자
 *
 * 층을 나눠 두는 이유는 **하나가 바뀌어도 나머지가 그대로**이기 위해서다.
 * ⚠ **마지막 단계의 은은한 마무리**(배경의 연꽃이나 `touch-flower` 가 한 번 조용히
 * 피는 정도)를 나중에 넣는다면 자리는 3번 층이다 — `finished` 가 이미 여기까지
 * 와 있으므로 층을 더하지 않고 그 층 안에서 끝낼 수 있다. **지금은 넣지 않는다**:
 * 무언가 새로 생기는 순간 쉼이 보상이 된다.
 *
 * ## 연못은 표시 없이 손짓을 받는다
 *
 * 눈·음표·손 표시를 찾아 누르는 방식은 사라졌다(2026-09-06). 세 단계 모두 **연못의
 * 물 아무 데나** 건드리면 되고, 다른 것은 손짓의 결뿐이다 — 보기·듣기는 톡(`tap`),
 * 감각은 **잠시 누르고 있기**(`hold` · `pondMotion.hold`). 물인지 아닌지는
 * `isWaterSpot` 이 판정한다: 위쪽 글·뒤로가기·아래 판은 이 면 밖이고, **카피바라
 * 칸도 물이 아니다**(그 위를 눌러도 셈이 오르지 않는다).
 *
 * 반응은 그 자리에서 퍼지는 **물결 하나**뿐이다. 단계가 안쪽으로 갈수록 얇고 넓고
 * 느려지고(`pondMotion.surfaceRipple.step`), 감각 단계의 마지막 물결이 이 콘텐츠의
 * 마무리다 — 따로 완료 파동을 두지 않는다(옛 `FinishWave` 는 지웠다).
 *
 * ## 셈은 연못이 들지 않는다
 *
 * 몇 개를 찾았는지는 화면이 센다 — 연못은 `onFound` 를 부를 뿐이다.
 *
 * ## 크기를 재서 놓는다
 *
 * 자리는 전부 잰 폭·높이의 **비율**이다 — `onLayout` 전에는 배경만 있다.
 * 그림이 바뀌면 `pondLayout` 의 비율을 다시 잰다.
 */
type Props = {
  /** 지금 단계 — 물결의 결을 정한다 */
  step: SensePondStepId;
  /** 지금 단계의 감각 — 낭독기가 수면을 무엇이라 읽을지 정한다 */
  point: SensePointKind;
  /** 지금 단계의 손짓 — 톡 · 잠시 누르기 */
  input: PondInput;
  onFound: () => void;
  /** 잠시 누르기를 다 채우기 전에 손을 뗐다 — 화면이 「조금 더 오래」를 한 번 더 말한다 */
  onHoldCancel?: () => void;
  /** 3·2·1 을 다 지났다 — 손짓을 그만 받고 연못만 남는다 */
  finished?: boolean;
};

type Ripple = { id: number; x: number; y: number; step: SensePondStepId };
type Size = { width: number; height: number };

export function PondScene({ step, point, input, onFound, onHoldCancel, finished = false }: Props) {
  const [size, setSize] = useState<Size | null>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [holdAt, setHoldAt] = useState<PondSpot | null>(null);
  const nextId = useRef(0);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bow] = useState(() => new Animated.Value(0));

  // 완료 — 카피바라가 살짝 내려앉았다 돌아온다
  useEffect(() => {
    if (!finished) return;
    const nod = Animated.sequence([
      Animated.timing(bow, {
        toValue: 1,
        duration: pondMotion.capybaraBow,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(bow, {
        toValue: 0,
        duration: pondMotion.capybaraBow,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    nod.start();
    return () => nod.stop();
  }, [finished, bow]);

  const clearHold = () => {
    if (holdTimer.current != null) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  // 화면을 떠나면 재던 시간을 버린다
  useEffect(() => clearHold, []);

  /**
   * 손끝이 닿은 자리 — 장면 폭·높이에 대한 비율. **물이 아니면 `null`.**
   *
   * 낭독기·스위치 제어의 활성화는 **좌표 없이** 온다(클릭 하나라 손끝이 없다).
   * 자리 칸이 아예 없기도 하고 0 으로 채워져 오기도 하는데, 장면의 맨 왼쪽 위
   * 한 점은 어차피 물이 아니라 0,0 을 「좌표 없음」으로 봐도 잃는 손짓이 없다 —
   * 대신 손가락 없이도 단계를 지날 수 있다.
   */
  const waterSpot = (e?: GestureResponderEvent): PondSpot | null => {
    if (size == null) return null;
    const touch = e?.nativeEvent;
    const blind =
      touch == null ||
      !Number.isFinite(touch.locationX) ||
      !Number.isFinite(touch.locationY) ||
      (touch.locationX === 0 && touch.locationY === 0);
    const spot: PondSpot = blind
      ? pondLayout.waterCenter
      : { x: touch.locationX / size.width, y: touch.locationY / size.height };
    return isWaterSpot(spot, size.height / size.width) ? spot : null;
  };

  /** 하나 찾았다 — 그 자리에서 물결이 퍼지고 셈이 오른다 */
  const found = (spot: PondSpot) => {
    if (size == null) return;
    setRipples((rs) => [
      ...rs,
      { id: nextId.current++, x: size.width * spot.x, y: size.height * spot.y, step },
    ]);
    setHoldAt(null);
    onFound();
  };

  /** 톡 — 보기·듣기 */
  const press = (e?: GestureResponderEvent) => {
    if (finished) return;
    const spot = waterSpot(e);
    if (spot != null) found(spot);
  };

  /** 잠시 누르고 있기(감각) — 누르는 동안 따뜻한 빛이 차오르고, 다 차면 세어진다 */
  const pressIn = (e?: GestureResponderEvent) => {
    if (finished) return;
    const spot = waterSpot(e);
    if (spot == null) return;
    setHoldAt(spot);
    clearHold();
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      found(spot);
    }, pondMotion.hold);
  };

  /** 누르다 말았다 — 세지 않는다. 빛은 사그라들고, 화면이 더 오래 누르라고 한 번 더 말한다 */
  const pressOut = () => {
    if (holdTimer.current == null) return;
    clearHold();
    setHoldAt(null);
    onHoldCancel?.();
  };

  /** 낭독기·스위치 제어의 활성화 — 잠시 누르기를 대신한다 */
  const activate = () => {
    if (finished) return;
    clearHold();
    const spot = waterSpot();
    if (spot != null) found(spot);
  };

  const hold = input === "hold";
  const capybara = size == null ? 0 : Math.round(size.width * pondLayout.capybaraSize);

  return (
    <View
      accessibilityLabel="연못"
      onLayout={(e) => setSize(e.nativeEvent.layout)}
      style={styles.pond}
    >
      {/* 1·2 — 정지 배경 위에 움직이는 수면 */}
      {size != null ? <PondBackdrop width={size.width} height={size.height} /> : null}
      {size != null ? <PondAmbient width={size.width} height={size.height} /> : null}

      {/* 3 — 물 위에 뜬 것. 손짓을 받지 않으므로 아래 수면이 그대로 받는다 */}
      {size != null ? <PondDecor width={size.width} height={size.height} /> : null}

      {/* 4 — 손짓을 받는 면. 보이지 않고 아무것도 가리지 않는다 */}
      {size != null && !finished ? (
        <Pressable
          testID="pond-surface"
          accessibilityRole="button"
          accessibilityLabel={SENSE_LABEL[point]}
          onPress={hold ? undefined : press}
          onPressIn={hold ? pressIn : undefined}
          onPressOut={hold ? pressOut : undefined}
          accessibilityActions={hold ? HOLD_ACTIONS : undefined}
          onAccessibilityAction={hold ? activate : undefined}
          style={styles.surface}
        />
      ) : null}

      {/* 5 — 반응. 얇은 선이라 아래 층을 가리지 않는다 */}
      {ripples.map((r) => (
        <SurfaceRipple
          key={r.id}
          x={r.x}
          y={r.y}
          step={r.step}
          onDone={() => setRipples((rs) => rs.filter((it) => it.id !== r.id))}
        />
      ))}
      {holdAt != null && size != null ? (
        <HoldGlow
          x={size.width * holdAt.x}
          y={size.height * holdAt.y}
          released={false}
          onGone={() => setHoldAt(null)}
        />
      ) : null}

      {/* 6 — 왼쪽 물가에 앉은 동반자. 손짓을 받지 않는다 */}
      {size != null ? (
        <Animated.View
          style={[
            styles.capybara,
            {
              left: size.width * pondLayout.capybaraLeft,
              bottom: size.height * pondLayout.capybaraBottom,
              transform: [
                {
                  translateY: bow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, pondSize.capybaraBow],
                  }),
                },
              ],
            },
          ]}
        >
          <CapybaraFigure size={capybara} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/** 낭독기·스위치 제어가 보는 활성화 하나 — 감각 단계에만 있다(톡은 `onPress` 가 받는다) */
const HOLD_ACTIONS = [{ name: "activate" as const }];

const styles = StyleSheet.create({
  pond: {
    flex: 1,
    // **카드가 아니다** — 둥근 모서리도 여백도 없다(2026-09-05). 장면이 화면
    // 전체를 채워야 「연못 그림을 보고 있다」가 아니라 「연못 안에 있다」가 된다
    backgroundColor: pond.bank,
    overflow: "hidden",
  },
  // 보이지 않는 면 — 물인지 아닌지는 자리로 가린다(`isWaterSpot`)
  surface: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  capybara: { position: "absolute" },
});
