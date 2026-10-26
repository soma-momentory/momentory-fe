import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import {
  bodyRelease,
  bodyReleaseFinish,
  bodyReleaseLayout,
  bodyReleaseMotion,
  bodyReleaseRing,
  bodyReleaseSize,
} from "@/design/ds";

import { RisingMotes } from "../scene/RisingMotes";

/**
 * 몸에 힘 빼기의 **장면** — 노을 지는 언덕 위의 카피바라와 그 뒤의 해 (2026-10-05).
 *
 * ## 층 (아래에서 위로)
 *
 * 1. 하늘(`sky.webp`) · 2. **해**(코드) · 3. 언덕(`hill.webp`) · 4. **시간 링**(코드) ·
 * 5. 카피바라
 *
 * 해가 하늘과 언덕 **사이**에 있어야 아래쪽이 언덕 뒤로 숨는다 — 그래서 배경을 한 장으로
 * 두지 않는다. 해와 링은 카피바라 몸의 한가운데를 함께 중심으로 삼는다.
 *
 * ## 카피바라는 화면 가운데에 앉는다 (2026-10-05 · 실기기 피드백)
 *
 * 몸의 한가운데를 화면 높이의 `bodyReleaseLayout.center` 에 먼저 정하고, 언덕을 **그
 * 발밑에 꼭대기가 오도록 키워서** 깐다. 언덕이 화면 폭보다 넓어지면 양옆이 잘린다
 * (가운데 기준). 폭에 맞춰 바닥에만 깔면 꼭대기가 화면 아래 4분의 1 에 머물러
 * 카피바라가 아래로 처졌다.
 *
 * ## 셋이 시간을 말한다 (2026-10-05 · 실기기 피드백)
 *
 * - **링**(`progress` 0 → 1) — 박자 하나마다 위에서부터 시계 방향으로 한 바퀴 차오른다
 * - **해**(`breath`) — 들숨(힘주기)에 커지고 날숨(풀기)에 작아진다
 * - **카피바라** — 같은 `breath` 로 가슴이 부풀었다 가라앉고, 힘을 푸는 동안에는
 *   느긋하게 좌우로 흔들리고(`sway`), 언제나 제자리에서 작게 숨을 쉰다. 그림 한 장이
 *   할 수 있는 움직임을 층으로 나눠 겹친다 — 흔들림(바깥) → 숨(가운데) → 늘 하는 작은
 *   숨(안쪽), 셋 다 **발밑이 축**이다. 전부 느리다 — 빠른 잔떨림은 정신 사나웠다.
 *
 * 그림은 전부 ChatGPT 로 생성해 `scripts/keyout-body-release.py` 로 다듬은 것이다.
 * 장식이라 낭독기에 읽히지 않는다 — 할 일은 위 안내와 아래 판이 말한다.
 */
export type BodyReleasePose =
  "neutral" | "hands" | "shoulders" | "face" | "legs" | "release" | "calm";

type Props = {
  /** 0 = 숨을 다 내쉼 · 1 = 숨을 다 들이마심 */
  breath: Animated.Value;
  /** 지금 박자가 얼마나 지났나(0 → 1) — 링이 이만큼 차 있다 */
  progress: Animated.Value;
  pose: BodyReleasePose;
  /** 힘을 푸는 중 — 느긋하게 좌우로 흔들린다 */
  sway: boolean;
  /** 네 부위를 다 마쳤다 — 링이 퍼져 사라지고 빛 알갱이가 떠오른다(`bodyReleaseFinish`) */
  finished: boolean;
};

const SKY = require("../../../../assets/body-release/sky.webp");
const HILL = require("../../../../assets/body-release/hill.webp");

/** 포즈 → 그림. 일곱 장이 같은 상자(480 × 600)에서 발밑·머리 가운데가 맞춰져 있다 */
const POSES: Record<BodyReleasePose, number> = {
  neutral: require("../../../../assets/body-release/capybara-neutral.webp"),
  hands: require("../../../../assets/body-release/capybara-hands.webp"),
  shoulders: require("../../../../assets/body-release/capybara-shoulders.webp"),
  face: require("../../../../assets/body-release/capybara-face.webp"),
  legs: require("../../../../assets/body-release/capybara-legs.webp"),
  release: require("../../../../assets/body-release/capybara-release.webp"),
  calm: require("../../../../assets/body-release/capybara-calm.webp"),
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SUN = bodyReleaseSize.sun;
const CAPY_W = bodyReleaseSize.capybara;
const CAPY_H = CAPY_W / bodyReleaseLayout.capybaraAspect;
const RING_R = bodyReleaseRing.radius;
const RING_D = RING_R * 2 + bodyReleaseRing.stroke;
const RING_C = 2 * Math.PI * RING_R;

const MOTION = bodyReleaseMotion;

/** -1 ↔ 1 을 한 번 오가는 고리 — 0 에서 시작해 0 으로 돌아온다 */
const rocking = (v: Animated.Value, period: number) =>
  Animated.loop(
    Animated.sequence(
      [1, -1, 0].map((toValue, i) =>
        Animated.timing(v, {
          toValue,
          duration: i === 1 ? period / 2 : period / 4,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ),
    ),
  );

export function BodyReleaseScene({ breath, progress, pose, sway, finished }: Props) {
  const { width, height } = useWindowDimensions();
  // 카피바라 몸의 한가운데 — 해와 링이 여기를 중심으로 선다(바닥에서의 높이)
  const center = height * (1 - bodyReleaseLayout.center);
  // 카피바라 발밑 = 언덕 꼭대기. 언덕은 꼭대기가 여기 오도록 키운다(폭보다 작아지지는 않는다)
  const crest = center - CAPY_H / 2 + bodyReleaseSize.sink;
  const hillWidth = Math.max(width, crest / bodyReleaseLayout.crest);

  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [idle] = useState(() => new Animated.Value(0));
  const [rock] = useState(() => new Animated.Value(0));
  // 끝맺음 — 0 → 1 로 한 번. 링이 퍼져 사라진다
  const [finish] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!finished) return;
    const it = Animated.timing(finish, {
      toValue: 1,
      duration: bodyReleaseFinish.ringBloom.duration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [finished, finish]);

  // 늘 하는 작은 숨 — 화면에 있는 동안 멈추지 않는다
  useEffect(() => {
    const half = MOTION.idle.period / 2;
    const it = Animated.loop(
      Animated.sequence(
        [1, 0].map((toValue) =>
          Animated.timing(idle, {
            toValue,
            duration: half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ),
      ),
    );
    it.start();
    return () => it.stop();
  }, [idle]);

  // 힘을 푸는 동안만 느긋하게 흔들리고, 그 밖에는 천천히 바로 선다
  useEffect(() => {
    const it = sway
      ? rocking(rock, MOTION.sway.period)
      : Animated.timing(rock, {
          toValue: 0,
          duration: MOTION.poseSwap,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        });
    it.start();
    return () => it.stop();
  }, [sway, rock]);

  const angle = MOTION.sway.angle;

  return (
    <View
      testID="body-release-scene"
      pointerEvents="none"
      {...decorativeAccessibilityProps}
      style={StyleSheet.absoluteFill}
    >
      <Image source={SKY} contentFit="cover" transition={0} style={StyleSheet.absoluteFill} />

      <Animated.View
        testID="body-release-sun"
        style={[
          styles.sun,
          {
            bottom: center - SUN / 2,
            transform: [
              {
                scale: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, MOTION.sunGrow],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={SUN} height={SUN}>
          <Defs>
            <RadialGradient id="body-sun" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={bodyRelease.sunCore} stopOpacity={1} />
              <Stop offset="0.42" stopColor={bodyRelease.sunCore} stopOpacity={1} />
              <Stop offset="0.6" stopColor={bodyRelease.sunGlow} stopOpacity={0.8} />
              <Stop offset="1" stopColor={bodyRelease.sunGlow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={SUN / 2} cy={SUN / 2} r={SUN / 2} fill="url(#body-sun)" />
        </Svg>
      </Animated.View>

      <Image
        source={HILL}
        contentFit="fill"
        transition={0}
        style={[
          styles.hill,
          {
            width: hillWidth,
            height: hillWidth * bodyReleaseLayout.hillAspect,
            left: (width - hillWidth) / 2,
            // 폭에 막혀 더 작아지지 못하면 꼭대기가 발밑보다 높아진다 — 그만큼 내려 깐다
            bottom: crest - hillWidth * bodyReleaseLayout.crest,
          },
        ]}
      />

      {/* 끝나면 다 찬 링이 바깥으로 살짝 커지며 사라진다 — 한 바퀴를 다 돌았다 */}
      <Animated.View
        testID="body-release-ring"
        style={[
          styles.ring,
          {
            bottom: center - RING_D / 2,
            opacity: finish.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
            transform: [
              {
                scale: finish.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, bodyReleaseFinish.ringBloom.scale],
                }),
              },
            ],
          },
        ]}
      >
        <Svg width={RING_D} height={RING_D}>
          <Circle
            cx={RING_D / 2}
            cy={RING_D / 2}
            r={RING_R}
            stroke={bodyRelease.ring}
            strokeOpacity={bodyReleaseRing.trackOpacity}
            strokeWidth={bodyReleaseRing.stroke}
            fill="none"
          />
          {/* 위(12시)에서 시작해 시계 방향으로 차오른다 */}
          <AnimatedCircle
            cx={RING_D / 2}
            cy={RING_D / 2}
            r={RING_R}
            stroke={bodyRelease.ring}
            strokeWidth={bodyReleaseRing.stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${RING_C} ${RING_C}`}
            strokeDashoffset={progress.interpolate({
              inputRange: [0, 1],
              outputRange: [RING_C, 0],
            })}
            transform={`rotate(-90 ${RING_D / 2} ${RING_D / 2})`}
          />
        </Svg>
      </Animated.View>

      {finished ? (
        <RisingMotes
          testID="body-release-motes"
          left="50%"
          bottom={center}
          motes={bodyReleaseFinish.motes}
          duration={bodyReleaseFinish.mote.duration}
          stagger={bodyReleaseFinish.mote.stagger}
          color={bodyRelease.mote}
        />
      ) : null}

      {/* 꼭대기에 앉는다 — 발은 풀에 조금 묻힌다. 흔들림 → 숨 → 작은 숨, 셋 다 발밑이 축 */}
      <Animated.View
        style={[
          styles.capybara,
          {
            bottom: crest - bodyReleaseSize.sink,
            transform: [
              {
                rotate: rock.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [`-${angle}deg`, `${angle}deg`],
                }),
              },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              transform: [
                {
                  scaleX: breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, MOTION.inhale.scaleX],
                  }),
                },
                {
                  scaleY: breath.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, MOTION.inhale.scaleY],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                transform: [
                  {
                    scale: idle.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, MOTION.idle.scale],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image
              testID={`body-release-pose-${pose}`}
              source={POSES[pose]}
              contentFit="contain"
              // 포즈가 바뀔 때 툭 갈리지 않고 겹쳐 바뀐다
              transition={MOTION.poseSwap}
              style={styles.fill}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sun: { position: "absolute", left: "50%", width: SUN, height: SUN, marginLeft: -SUN / 2 },
  hill: { position: "absolute" },
  ring: {
    position: "absolute",
    left: "50%",
    width: RING_D,
    height: RING_D,
    marginLeft: -RING_D / 2,
  },
  capybara: {
    position: "absolute",
    left: "50%",
    width: CAPY_W,
    height: CAPY_H,
    marginLeft: -CAPY_W / 2,
    transformOrigin: "bottom",
  },
  fill: { width: "100%", height: "100%", transformOrigin: "bottom" },
});
