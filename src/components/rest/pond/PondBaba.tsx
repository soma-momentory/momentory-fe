import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, View } from "react-native";

import { GroundShadow } from "@/components/rest/scene/GroundShadow";
import { pondScene, pondSceneMotion, restScene } from "@/design/ds";

import type { BabaSpot } from "./layout";
import { useReducedMotion } from "./useReducedMotion";
import { hopRange, LAND, TAKEOFF, useWave, waveRange } from "./wave";

/**
 * 감각연못의 **바바** — 홈의 부위 그림 아홉 장을 겹치고, 단계마다 조금씩 움직인다.
 *
 * ⚠ 쉼터 규칙 「손짓은 그림이 한다」와 다르게 코드가 움직인다(2026-11-04 · 시안 v7 그대로 · 사용자 확인).
 * 몸을 갈라 그린 그림이 없어 귀는 한 장을 반으로 잘라 쓰고, 웃는 눈 · 감은 눈은 꾸미기 표정을 쓴다.
 */
export type BabaMood = "idle" | "listen" | "done";

const L = {
  tail: require("../../../../assets/home/v2/baba/base-tail.webp"),
  body: require("../../../../assets/home/v2/baba/base-body.webp"),
  feet: require("../../../../assets/home/v2/baba/base-feet.webp"),
  arms: require("../../../../assets/home/v2/baba/base-arms.webp"),
  muzzle: require("../../../../assets/home/v2/baba/base-muzzle.webp"),
  mouth: require("../../../../assets/home/v2/baba/base-mouth.webp"),
  cheeks: require("../../../../assets/home/v2/baba/base-cheeks.webp"),
  eyes: require("../../../../assets/home/v2/baba/base-eyes.webp"),
  ears: require("../../../../assets/home/v2/baba/base-ears.webp"),
  calm: require("../../../../assets/sensory-pond/eyes-face-calm.webp"),
  smile: require("../../../../assets/sensory-pond/eyes-face-smile.webp"),
};

const MOVE = Easing.bezier(0.37, 0, 0.63, 1);
const native = { useNativeDriver: true } as const;

function drawn(spot: BabaSpot, box: number) {
  const h = box * pondScene.babaAspect;
  const scale = spot.width / box;
  return { x: spot.x - box / 2, y: spot.y - h / 2 - (h * scale) / 2, scale };
}

export function PondBaba({
  spot,
  box,
  mood,
  smile,
  calm,
  hop,
}: {
  spot: BabaSpot;
  /** 그리는 상자의 폭 — 크기는 이 상자를 줄여 만든다 */
  box: number;
  mood: BabaMood;
  /** 찾아서 건너가는 동안 · 끝 화면에서 웃는다 */
  smile: boolean;
  /** 꾸욱 누르는 동안 눈을 감는다 */
  calm: boolean;
  /** 오를 때마다 한 번 뛰어오른다 */
  hop: number;
}) {
  const reduced = useReducedMotion();
  const h = box * pondScene.babaAspect;
  const [to] = useState(() => drawn(spot, box));
  const [x] = useState(() => new Animated.Value(to.x));
  const [y] = useState(() => new Animated.Value(to.y));
  const [size] = useState(() => new Animated.Value(to.scale));
  const [turn] = useState(() => new Animated.Value(1));
  const [jump] = useState(() => new Animated.Value(0));
  const [tilt] = useState(() => new Animated.Value(0));
  const breath = useWave(pondSceneMotion.breath, reduced);
  const [ear] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);
  const lastX = useRef(spot.x);

  // 다음 자리로 건너간다 — 왼쪽으로 가면 몸을 돌린다
  useEffect(() => {
    if (spot.x !== lastX.current) {
      Animated.timing(turn, {
        toValue: spot.x < lastX.current ? -1 : 1,
        duration: pondSceneMotion.turn,
        ...native,
      }).start();
      lastX.current = spot.x;
    }
    const next = drawn(spot, box);
    // 웅크린 뒤에 떠나서 내려앉는 순간에 닿는다 — 곡선(`hopAt`)의 나는 구간과 맞춘다
    const go = (v: Animated.Value, toValue: number) =>
      Animated.timing(v, {
        toValue,
        delay: pondSceneMotion.hop * TAKEOFF,
        duration: pondSceneMotion.hop * (LAND - TAKEOFF),
        easing: MOVE,
        ...native,
      });
    Animated.parallel([go(x, next.x), go(y, next.y), go(size, next.scale)]).start();
  }, [spot, box, x, y, size, turn]);

  useEffect(() => {
    if (hop === 0) return;
    jump.setValue(0);
    Animated.timing(jump, {
      toValue: 1,
      duration: pondSceneMotion.hop,
      easing: Easing.linear, // 곡선은 `hopRange` 의 표가 그린다
      ...native,
    }).start();
  }, [hop, jump]);

  // 들을 때 — 고개를 갸웃하고 귀를 쫑긋한다
  useEffect(() => {
    const listening = mood === "listen";
    Animated.timing(tilt, {
      toValue: listening ? 1 : 0,
      duration: pondSceneMotion.lean,
      ...native,
    }).start();
    if (!listening || reduced) {
      ear.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(ear, {
        toValue: 1,
        duration: pondSceneMotion.ear,
        easing: Easing.linear,
        ...native,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [mood, reduced, tilt, ear]);

  // 숨쉬기 · 눈 깜빡임 — 가만히 있어도 살아 있게
  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const wait = () => {
      const { every, jitter, shut } = pondSceneMotion.blink;
      t = setTimeout(
        () => {
          setBlink(true);
          t = setTimeout(() => {
            setBlink(false);
            wait();
          }, shut);
        },
        every + (Math.random() - 0.5) * jitter,
      );
    };
    wait();
    return () => clearTimeout(t);
  }, [reduced]);

  const face = blink || calm ? "calm" : smile || mood === "done" ? "smile" : "open";
  const earAngle = (sign: number) =>
    ear.interpolate({
      inputRange: [0, 0.62, 0.72, 0.82, 0.9, 1],
      outputRange: [0, 0, 14, 3, 10, 0].map((d) => `${d * sign}deg`),
    });

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        {
          width: box,
          height: h,
          transform: [{ translateX: x }, { translateY: y }, { scale: size }],
        },
      ]}
    >
      {/* 뛰어오르면 그림자는 물 위에 남아 작고 옅어진다 */}
      <Animated.View
        style={[
          styles.fill,
          {
            opacity: jump.interpolate(hopRange((a) => 1 - a.height * 0.6)),
            transform: [{ scale: jump.interpolate(hopRange((a) => 1 - a.height * 0.3)) }],
          },
        ]}
      >
        <GroundShadow
          id="pond-v2-baba-shadow"
          width={box * 0.92}
          height={h * 0.16}
          color={restScene.ink}
          opacity={0.34}
          style={{ left: box * 0.04, bottom: -h * 0.05 }}
        />
      </Animated.View>
      <Animated.View style={[styles.fill, { transform: [{ scaleX: turn }] }]}>
        <Animated.View
          style={[
            styles.fill,
            styles.feetOrigin,
            {
              transform: [
                {
                  // 날 때는 위로, 내려앉을 때는 연잎과 함께 조금 잠긴다
                  translateY: jump.interpolate(
                    hopRange((a) => -a.height * pondScene.hopHeight * h + a.squash * h * 0.025),
                  ),
                },
                {
                  rotate: jump.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: ["0deg", "3deg", "0deg"],
                  }),
                },
                { scaleX: jump.interpolate(hopRange((a) => 1 + a.squash * 0.05)) },
                { scaleY: jump.interpolate(hopRange((a) => 1 - a.squash * 0.07)) },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.canvas,
              {
                transform: [
                  {
                    rotate: tilt.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "-5deg"],
                    }),
                  },
                  { scaleX: breath.interpolate(waveRange(1, 1.012)) },
                  { scaleY: breath.interpolate(waveRange(1, 1.018)) },
                ],
              },
            ]}
          >
            <Image source={L.tail} style={styles.fill} />
            <Image source={L.body} style={styles.fill} />
            <Image source={L.feet} style={styles.fill} />
            <Image source={L.arms} style={styles.fill} />
            <Image source={L.muzzle} style={styles.fill} />
            <Image source={L.mouth} style={styles.fill} />
            <Image source={L.cheeks} style={styles.fill} />
            <Image source={L.eyes} style={[styles.fill, face !== "open" && styles.off]} />
            <Image source={L.calm} style={[styles.fill, face !== "calm" && styles.off]} />
            <Image source={L.smile} style={[styles.fill, face !== "smile" && styles.off]} />
            <Animated.View
              style={[styles.fill, styles.earLeft, { transform: [{ rotate: earAngle(-1) }] }]}
            >
              <View style={styles.halfLeft}>
                <Image source={L.ears} style={styles.imageLeft} />
              </View>
            </Animated.View>
            <Animated.View
              style={[styles.fill, styles.earRight, { transform: [{ rotate: earAngle(1) }] }]}
            >
              <View style={styles.halfRight}>
                <Image source={L.ears} style={styles.imageRight} />
              </View>
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

/** 1200 × 1600 캔버스에서 실제 몸은 x185~1011 · y218~1356 이다 — 상자가 몸에 꼭 맞게 캔버스를 키운다 */
const CANVAS = { width: 1.4528, height: 1.406, left: -0.224, top: -0.1915 };

const pct = (n: number) => `${n * 100}%` as const;

const styles = StyleSheet.create({
  root: { position: "absolute", left: 0, top: 0 },
  fill: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  off: { opacity: 0 },
  // 눌릴 때 발이 떠 보이지 않게 발밑을 축으로 삼는다
  feetOrigin: { transformOrigin: "50% 100%" },
  canvas: {
    position: "absolute",
    width: pct(CANVAS.width),
    height: pct(CANVAS.height),
    left: pct(CANVAS.left),
    top: pct(CANVAS.top),
    transformOrigin: "50% 85%",
  },
  earLeft: { transformOrigin: "36% 27%" },
  earRight: { transformOrigin: "62% 23%" },
  halfLeft: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    overflow: "hidden",
  },
  halfRight: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: "50%",
    overflow: "hidden",
  },
  imageLeft: { position: "absolute", left: 0, top: 0, width: "200%", height: "100%" },
  imageRight: { position: "absolute", left: "-100%", top: 0, width: "200%", height: "100%" },
});
