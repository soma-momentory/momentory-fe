import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { Text } from "@/components/ds";
import {
  label as labelColor,
  radius,
  restScene,
  space,
  worryBox,
  worryBoxFinish,
  worryBoxLayout,
  worryBoxMotion,
  worryBoxSize,
} from "@/design/ds";
import type { WorryBoxStage } from "@/features/rest/model/worryBox";

import { RisingMotes } from "../scene/RisingMotes";

/**
 * 걱정상자의 **장면** — 숲속 오솔길의 카피바라와 나무 상자 (2026-10-05).
 *
 * 화면이 하는 일(단계 · 문안 · 입력)과 나뉘어 있어서, 이 파일은 **무엇이 어떻게
 * 움직이는가**만 안다. 단계(`stage`)를 받아 연출을 돌리고, 연출이 끝나면 화면에 알린다.
 *
 * ## 층 (아래에서 위로)
 *
 * 1. 배경 · 2. **열린 상자 뒤판** · 3. 접힌 쪽지 · 4. **열린 상자 앞판** · 5. 닫힌 상자 ·
 * 6. 카피바라 · 7. 종이 카드
 *
 * 쪽지가 뒤판과 앞판 **사이**로 내려가서, 앞판에 가려지는 순간 상자 안에 들어간 것으로
 * 읽힌다 — 가리개(mask) 없이 층 순서만으로 만든다. 카피바라와 상자 밑에는 옅은 그림자가
 * 깔려 땅에 앉아 보인다.
 *
 * ## 건네기 (`handing`) — 천천히
 *
 * 종이 카드(쓴 걱정 그대로)가 입력창 자리에서 카피바라 손으로 날아가 작아지며 사라지고
 * (`fly`) → 카피바라가 쪽지를 받아 들고 읽는다 — 머리 위에 생각 말풍선이 뜨고 점 셋이
 * 차례로 통통 튄다(`hold`) → 상자 쪽으로 몸을 돌리고, 쪽지가 **한 바퀴 돌며** 상자 위로
 * 둥실 떠올랐다 안으로 내려간다(`put`) → 뚜껑이 닫히며 상자가 톡 튄다(`close`) →
 * 잠시 뒤 `onBoxed`.
 *
 * ## 두 끝
 *
 * - `keep` — 닫힌 상자가 카피바라 곁으로 옮겨 앉고 카피바라가 손을 얹고 쉰다. 그 뒤 상자가
 *   한 번 끄덕이고, 따뜻한 빛이 번지고, 빛 알갱이가 떠오른다(`worryBoxFinish`)
 * - `release` — 카피바라가 상자를 집어 들고(바닥의 상자가 사라지며 뒷모습으로 바뀐다)
 *   **오솔길을 따라** 걸어 들어간다(`worryBoxLayout.walkPath`). 걸음마다 몸이 살짝
 *   오르내리고 좌우로 기울며, 멀어질수록 작아지고 노을빛 안개에 섞인다. 사라진 길 끝에서
 *   반딧불 같은 알갱이가 떠오른다(화면은 그 빈자리에 한마디를 띄운다)
 *
 * 둘 다 끝나면 `onEnded`. 끝은 시계가 말한다 — 네이티브 드라이버의 완료 콜백은 jest 에
 * 오지 않는다(`SurfaceRipple` 과 같은 판단).
 *
 * 그림은 ChatGPT 로 생성해 `scripts/keyout-worry-box.py` 로 다듬은 것이다(숲 · 앉은 포즈 ·
 * 상자를 인 뒷모습 둘 · 상자 셋 — 처음 자세만 따로 받은 흰 바탕 그림이다). 그림이 바뀌면
 * `ART` 표만 갈아 끼운다.
 *
 * 장식이라 낭독기에 읽히지 않는다 — 할 일은 위 안내와 아래 판이 말한다.
 */
type Props = {
  stage: WorryBoxStage;
  /** 종이 카드에 적힐 걱정 — 건네기 동안만 보인다 */
  worry: string;
  /** 상자가 닫히고 잠시 뒤 — 선택지를 보일 때다 */
  onBoxed: () => void;
  /** 고른 끝의 연출이 다 끝났다 — 돌아가는 길을 붙일 때다 */
  onEnded: () => void;
};

/**
 * 건네기 안의 순간 — 포즈와 무엇이 보이는지를 정한다. 건네기가 시작된 직후(아직 아무
 * 순간도 지나지 않은 `null`)가 카드가 날아가는 때다 — 효과 안에서 상태를 바로 바꾸지 않는다
 */
type HandStep = "hold" | "put" | "close";

type Pose = "sit" | "hold" | "put" | "rest" | "walk1" | "walk2";

/** 그림 표 — **그림이 바뀔 때 고치는 곳은 여기다.** 포즈 · 상자는 각자 같은 상자에 맞춰 잘렸다 */
const ART = {
  background: require("../../../../assets/worry-box/forest.webp"),
  poses: {
    sit: require("../../../../assets/worry-box/capybara-sit.webp"),
    hold: require("../../../../assets/worry-box/capybara-hold.webp"),
    put: require("../../../../assets/worry-box/capybara-put.webp"),
    rest: require("../../../../assets/worry-box/capybara-rest.webp"),
    walk1: require("../../../../assets/worry-box/capybara-walk1.webp"),
    walk2: require("../../../../assets/worry-box/capybara-walk2.webp"),
  } satisfies Record<Pose, number>,
  box: {
    back: require("../../../../assets/worry-box/box-back.webp"),
    front: require("../../../../assets/worry-box/box-front.webp"),
    closed: require("../../../../assets/worry-box/box-closed.webp"),
  },
};

const M = worryBoxMotion;
const F = worryBoxFinish;
const L = worryBoxLayout;
const CAPY_W = worryBoxSize.capybara;
/** 앉은 포즈 · 상자를 인 뒷모습의 높이 — 폭은 같고 뒷모습이 더 높다 */
const SIT_H = CAPY_W / L.capybaraAspect.sit;
const WALK_H = CAPY_W / L.capybaraAspect.walk;
const BOX_W = worryBoxSize.box;
const BOX_H = BOX_W * worryBoxSize.boxAspect;
const NOTE = worryBoxSize.note;
const SHADOW = worryBoxSize.shadow;
const TH = worryBoxSize.thought;
const [PUFF_SMALL, PUFF_MID] = TH.puffs;
const SINK = worryBoxSize.sink;
const PATH = L.walkPath;
const PATH_T = PATH.map((p) => p.t);

const timing = (v: Animated.Value, toValue: number, duration: number) =>
  Animated.timing(v, {
    toValue,
    duration,
    easing: Easing.inOut(Easing.sin),
    useNativeDriver: true,
  });

/** 0 → 1 → 0 을 `period` 동안 한 번 — 고리로 돈다 */
const pulse = (v: Animated.Value, period: number) =>
  Animated.loop(Animated.sequence([timing(v, 1, period / 2), timing(v, 0, period / 2)]));

export function WorryBoxScene({ stage, worry, onBoxed, onEnded }: Props) {
  const { width, height } = useWindowDimensions();
  const ground = height * L.ground;

  const [step, setStep] = useState<HandStep | null>(null);
  // 고른 끝의 연출이 다 끝났다 — 끝맺음(빛 · 알갱이)이 핀다
  const [finished, setFinished] = useState(false);
  const [walkFrame, setWalkFrame] = useState<"walk1" | "walk2">("walk1");
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [card] = useState(() => new Animated.Value(0));
  const [note] = useState(() => new Animated.Value(0));
  const [closed] = useState(() => new Animated.Value(0));
  const [bump] = useState(() => new Animated.Value(0));
  const [slide] = useState(() => new Animated.Value(0));
  // 「흘려보낼게요」 — 바닥의 상자가 집혀 사라지고(1 → 0), 길을 따라 걷고, 걸음마다 오르내리고 기운다
  const [boxLeft] = useState(() => new Animated.Value(1));
  const [walk] = useState(() => new Animated.Value(0));
  const [bob] = useState(() => new Animated.Value(0));
  const [waddle] = useState(() => new Animated.Value(0));
  // 「맡겨둘게요」의 끝 — 상자에서 번지는 빛
  const [glow] = useState(() => new Animated.Value(0));

  // 건네기 — 카드가 날아가고, 받아 들고 읽고, 넣고, 닫는다
  useEffect(() => {
    if (stage !== "handing") return;
    const fly = timing(card, 1, M.fly);
    fly.start();
    const anims: Animated.CompositeAnimation[] = [fly];
    const at = (ms: number, run: () => void) => setTimeout(run, ms);
    const timers = [
      at(M.fly, () => setStep("hold")),
      at(M.fly + M.hold, () => {
        setStep("put");
        const it = timing(note, 1, M.put);
        anims.push(it);
        it.start();
      }),
      at(M.fly + M.hold + M.put, () => {
        setStep("close");
        const it = Animated.parallel([
          timing(closed, 1, M.close),
          Animated.sequence([timing(bump, 1, M.close / 2), timing(bump, 0, M.close / 2)]),
        ]);
        anims.push(it);
        it.start();
      }),
      at(M.fly + M.hold + M.put + M.close + M.settle, onBoxed),
    ];
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.stop());
    };
    // onBoxed 는 화면이 매 렌더 새로 준다 — 연출은 단계가 바뀔 때 한 번만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, card, note, closed, bump]);

  // 두 끝 — 곁으로 옮겨 앉기 · 집어 들고 길을 따라 걸어가기
  useEffect(() => {
    if (stage !== "keep" && stage !== "release") return;
    if (stage === "keep") {
      const it = timing(slide, 1, M.keepSlide);
      it.start();
      const anims: Animated.CompositeAnimation[] = [it];
      // 곁에 앉은 뒤 — 상자가 한 번 끄덕이고 따뜻한 빛이 번진다
      const settle = setTimeout(() => {
        setFinished(true);
        const end = Animated.parallel([
          Animated.sequence([timing(bump, 1, M.close / 2), timing(bump, 0, M.close / 2)]),
          timing(glow, 1, F.glow.duration),
        ]);
        anims.push(end);
        end.start();
      }, M.keepSlide);
      const done = setTimeout(onEnded, M.keepSlide + F.glow.duration);
      return () => {
        anims.forEach((a) => a.stop());
        clearTimeout(settle);
        clearTimeout(done);
      };
    }
    const anims = [
      timing(boxLeft, 0, M.pickUp),
      Animated.sequence([
        Animated.delay(M.pickUp),
        // 길의 굽이와 원근은 `walkPath` 의 점들이 이미 그린다 — 걸음은 고르게
        Animated.timing(walk, {
          toValue: 1,
          duration: M.walk,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
      pulse(bob, M.step),
      pulse(waddle, M.step * 2),
    ];
    anims.forEach((a) => a.start());
    const steps = setInterval(
      () => setWalkFrame((f) => (f === "walk1" ? "walk2" : "walk1")),
      M.step,
    );
    const done = setTimeout(() => {
      clearInterval(steps);
      setFinished(true);
      onEnded();
    }, M.pickUp + M.walk);
    return () => {
      anims.forEach((a) => a.stop());
      clearInterval(steps);
      clearTimeout(done);
    };
    // onEnded 는 화면이 매 렌더 새로 준다 — 연출은 단계가 바뀔 때 한 번만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, slide, boxLeft, walk, bob, waddle, bump, glow]);

  const walking = stage === "release";
  const pose: Pose = walking
    ? walkFrame
    : stage === "keep" || stage === "boxed"
      ? "rest"
      : step === "hold"
        ? "hold"
        : step === "put"
          ? "put"
          : "sit";

  const capyX = width * L.capybaraX;
  const boxX = width * L.boxX;
  // 받아 든 쪽지(가슴 앞)와 상자 쪽으로 뻗은 손끝 — 포즈 그림에서 잰 자리(`worryBoxLayout`)
  const feet = ground - SINK;
  const holdX = capyX + CAPY_W * L.holdNote.x;
  const holdY = feet + SIT_H * L.holdNote.y;
  const pawX = capyX + CAPY_W * L.putPaw.x;
  const pawY = feet + SIT_H * L.putPaw.y;
  // 상자가 열려 있는가 — 건네기의 닫힘 전까지만(그 뒤로는 닫힌 상자 하나다)
  const open = stage === "write" || (stage === "handing" && step !== "close");
  const showCard = stage === "handing" && step == null;
  const showNote = stage === "handing" && step === "put";
  const keepX = width * L.keepBoxX;
  const pathEnd = PATH[PATH.length - 1]!;
  const along = <T extends number | string>(pick: (p: (typeof PATH)[number]) => T) =>
    walk.interpolate({ inputRange: PATH_T, outputRange: PATH.map(pick) as number[] | string[] });

  return (
    <View
      testID="worry-box-scene"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <Image
        source={ART.background}
        contentFit="cover"
        transition={0}
        style={StyleSheet.absoluteFill}
      />

      {/* 「맡겨둘게요」의 끝 — 곁에 옮겨 앉은 상자 뒤에서 따뜻한 빛이 번진다 */}
      {stage === "keep" && finished ? (
        <Animated.View
          testID="worry-box-glow"
          pointerEvents="none"
          style={[
            styles.glow,
            {
              left: keepX - F.glow.size / 2,
              bottom: ground + BOX_H / 2 - F.glow.size / 2,
              opacity: glow.interpolate({
                inputRange: [0, 0.35, 1],
                outputRange: [0, 0.95, 0.55],
              }),
              transform: [
                {
                  scale: glow.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0.4, 1.1, 1] }),
                },
              ],
            },
          ]}
        >
          <Svg width={F.glow.size} height={F.glow.size}>
            <Defs>
              <RadialGradient id="worry-box-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={worryBox.glow} stopOpacity={1} />
                <Stop offset="1" stopColor={worryBox.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={F.glow.size / 2}
              cy={F.glow.size / 2}
              rx={F.glow.size / 2}
              ry={F.glow.size / 2}
              fill="url(#worry-box-glow)"
            />
          </Svg>
        </Animated.View>
      ) : null}

      {/* 상자 — 옮겨 앉기(`slide`) · 닫힐 때의 톡(`bump`) · 집혀 사라지기(`boxLeft`) */}
      <Animated.View
        testID="worry-box-box"
        style={[
          styles.box,
          {
            left: boxX - BOX_W / 2,
            bottom: ground,
            opacity: walking ? boxLeft : 1,
            transform: [
              {
                translateX: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, width * (L.keepBoxX - L.boxX)],
                }),
              },
              {
                scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, M.bump] }),
              },
            ],
          },
        ]}
      >
        <GroundShadow id="worry-box-shadow" width={BOX_W * SHADOW.box} style={styles.boxShadow} />
        {open ? (
          <Image source={ART.box.back} contentFit="fill" transition={0} style={styles.layer} />
        ) : null}
        {showNote ? (
          // 쪽지는 손에서 상자 위로 옮겨 간 뒤 뒤판과 앞판 사이로 내려간다
          <Animated.View
            testID="worry-box-note"
            style={[
              styles.note,
              {
                transform: [
                  {
                    translateX: note.interpolate({
                      inputRange: [0, 0.55, 1],
                      // 뻗은 손끝에서 떠나 상자 위로
                      outputRange: [pawX - boxX, (pawX - boxX) * 0.15, 0],
                    }),
                  },
                  {
                    translateY: note.interpolate({
                      inputRange: [0, 0.55, 1],
                      // 손끝 높이 → 상자 위로 둥실 → 앞판 윗변보다 아래(앞판에 가려진다)
                      outputRange: [
                        -(pawY - ground),
                        -BOX_H * M.arc,
                        -BOX_H * worryBoxSize.frontTop * 0.3,
                      ],
                    }),
                  },
                  {
                    // 떠오르며 한 바퀴 — 내려갈 때는 바로 선다
                    rotate: note.interpolate({
                      inputRange: [0, 0.7, 1],
                      outputRange: ["0deg", `${360 * M.spin}deg`, `${360 * M.spin}deg`],
                    }),
                  },
                  {
                    scale: note.interpolate({
                      inputRange: [0, 0.45, 1],
                      outputRange: [1, 1.35, 0.9],
                    }),
                  },
                ],
              },
            ]}
          />
        ) : null}
        {open ? (
          <Image source={ART.box.front} contentFit="fill" transition={0} style={styles.layer} />
        ) : null}
        <Animated.View
          style={[styles.layer, { opacity: open ? 0 : stage === "handing" ? closed : 1 }]}
        >
          <Image source={ART.box.closed} contentFit="fill" transition={0} style={styles.fill} />
        </Animated.View>
      </Animated.View>

      {/* 카피바라 — 바깥은 길을 따라가는 자리 · 크기, 안쪽은 걸음의 오르내림 · 기울기 */}
      <Animated.View
        style={[
          styles.capybara,
          {
            left: capyX - CAPY_W / 2,
            bottom: ground - SINK,
            height: walking ? WALK_H : SIT_H,
            // 길이 사라지는 곳에 다다르면 안개 속으로 사라진다
            opacity: walk.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: along((p) => (p.x - L.capybaraX) * width) },
              { translateY: along((p) => -(p.ground - L.ground) * height) },
              { scale: along((p) => p.scale) },
            ],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            walking
              ? {
                  transform: [
                    {
                      translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -M.bob] }),
                    },
                    {
                      rotate: waddle.interpolate({
                        inputRange: [0, 1],
                        outputRange: [`-${M.waddle}deg`, `${M.waddle}deg`],
                      }),
                    },
                  ],
                }
              : null,
          ]}
        >
          <GroundShadow
            id="worry-capybara-shadow"
            width={CAPY_W * SHADOW.width}
            style={styles.capyShadow}
          />
          <Image
            testID={`worry-box-pose-${pose}`}
            source={ART.poses[pose]}
            contentFit="contain"
            transition={walking ? M.stepBlend : M.poseSwap}
            style={styles.fill}
          />
          {/* 노을빛 안개 — 같은 그림을 빛의 색으로 칠해 멀어질수록 짙게 덮는다 */}
          {walking ? (
            <Animated.View style={[styles.haze, { opacity: along((p) => p.haze) }]}>
              <Image
                source={ART.poses[pose]}
                contentFit="contain"
                tintColor={worryBox.haze}
                transition={M.stepBlend}
                style={styles.fill}
              />
            </Animated.View>
          ) : null}
        </Animated.View>
      </Animated.View>

      {/* 쪽지를 읽는 동안 — 머리 위의 생각 말풍선 */}
      {stage === "handing" && step === "hold" ? (
        <ThoughtBubble left={capyX + CAPY_W * 0.16} bottom={ground + SIT_H * 0.9} />
      ) : null}

      {/* 끝맺음의 빛 알갱이 — 맡겨둔 상자 둘레 · 카피바라가 사라진 길 끝 */}
      {finished ? (
        <RisingMotes
          testID="worry-box-motes"
          left={stage === "keep" ? keepX : width * pathEnd.x}
          bottom={
            stage === "keep"
              ? ground + BOX_H
              : height * pathEnd.ground + WALK_H * pathEnd.scale * 0.5
          }
          motes={stage === "keep" ? F.keepMotes : F.releaseMotes}
          duration={F.mote.duration}
          stagger={F.mote.stagger}
          color={worryBox.mote}
        />
      ) : null}

      {/* 종이 카드 — 입력창 자리에서 카피바라 손으로 날아가 작아지며 사라진다 */}
      {showCard ? (
        <Animated.View
          testID="worry-box-card"
          style={[
            styles.card,
            {
              left: width / 2 - worryBoxSize.card.width / 2,
              bottom: height * L.cardFrom,
              opacity: card.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
              transform: [
                {
                  translateX: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, holdX - width / 2],
                  }),
                },
                {
                  translateY: card.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -(holdY - height * L.cardFrom)],
                  }),
                },
                { scale: card.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) },
                {
                  rotate: card.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-8deg"] }),
                },
              ],
            },
          ]}
        >
          <Text variant="body1" color={labelColor.strong} numberOfLines={4}>
            {worry}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/**
 * 쪽지를 읽는 동안 카피바라 머리 위에 뜨는 **생각 말풍선** — 작은 원 둘이 머리에서
 * 이어지고, 말풍선 안의 점 셋이 차례로 통통 튄다(읽고 있다). 글은 넣지 않는다 —
 * 무엇을 생각하는지 말하면 걱정을 평가하는 것이 된다.
 */
function ThoughtBubble({ left, bottom }: { left: number; bottom: number }) {
  const [appear] = useState(() => new Animated.Value(0));
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0)));

  useEffect(() => {
    const quarter = M.bubble.dots / 4;
    const it = Animated.parallel([
      timing(appear, 1, M.bubble.in),
      Animated.loop(
        Animated.stagger(
          quarter,
          dots.map((d) => Animated.sequence([timing(d, 1, quarter), timing(d, 0, quarter)])),
        ),
      ),
    ]);
    it.start();
    return () => it.stop();
  }, [appear, dots]);

  return (
    <Animated.View
      testID="worry-box-thought"
      pointerEvents="none"
      style={[
        styles.thought,
        {
          left,
          bottom,
          opacity: appear,
          transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        },
      ]}
    >
      <View style={[styles.puff, styles.puffSmall]} />
      <View style={[styles.puff, styles.puffMid]} />
      <View style={styles.bubble}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                transform: [
                  { translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -TH.hop] }) },
                ],
              },
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

/** 땅에 깔리는 옅은 그림자 — 가운데가 짙고 가장자리로 사라지는 납작한 타원 */
function GroundShadow({ id, width, style }: { id: string; width: number; style: object }) {
  const h = SHADOW.height;
  return (
    <View pointerEvents="none" style={[{ position: "absolute", width, height: h }, style]}>
      <Svg width={width} height={h}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={worryBox.shadow} stopOpacity={SHADOW.opacity} />
            <Stop offset="1" stopColor={worryBox.shadow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={width / 2} cy={h / 2} rx={width / 2} ry={h / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: "absolute", width: BOX_W, height: BOX_H },
  // 상자 세 장(뒤판 · 앞판 · 닫힌 상자)은 같은 상자에서 잘려 정확히 겹친다
  layer: { position: "absolute", left: 0, top: 0, width: BOX_W, height: BOX_H },
  // 그림자 가운데가 상자 바닥 선 · 카피바라 발밑 선에 온다
  boxShadow: { left: (BOX_W - BOX_W * SHADOW.box) / 2, bottom: -SHADOW.height / 2 },
  capyShadow: {
    left: (CAPY_W - CAPY_W * SHADOW.width) / 2,
    bottom: SINK - SHADOW.height / 2,
  },
  note: {
    position: "absolute",
    left: BOX_W / 2 - NOTE / 2,
    bottom: 0,
    width: NOTE,
    height: NOTE * 0.7,
    backgroundColor: worryBox.paper,
    borderWidth: 1,
    borderColor: worryBox.paperEdge,
    borderRadius: radius.small / 2,
  },
  capybara: {
    position: "absolute",
    width: CAPY_W,
    transformOrigin: "bottom",
  },
  fill: { width: "100%", height: "100%", transformOrigin: "bottom" },
  haze: { ...StyleSheet.absoluteFill },
  glow: { position: "absolute", width: F.glow.size, height: F.glow.size },
  // 생각 말풍선 — 왼쪽 아래(머리 쪽)를 축으로 떠오른다. 작은 원 둘이 머리에서 말풍선으로 잇는다
  thought: {
    position: "absolute",
    width: PUFF_MID + PUFF_SMALL + TH.bubble.width,
    height: PUFF_MID + PUFF_SMALL + TH.bubble.height,
    transformOrigin: "left bottom",
  },
  puff: {
    position: "absolute",
    backgroundColor: restScene.surface,
    borderWidth: 1,
    borderColor: worryBox.paperEdge,
  },
  puffSmall: {
    left: 0,
    bottom: 0,
    width: PUFF_SMALL,
    height: PUFF_SMALL,
    borderRadius: PUFF_SMALL / 2,
  },
  puffMid: {
    left: PUFF_SMALL,
    bottom: PUFF_SMALL,
    width: PUFF_MID,
    height: PUFF_MID,
    borderRadius: PUFF_MID / 2,
  },
  bubble: {
    position: "absolute",
    left: PUFF_SMALL + PUFF_MID / 2,
    bottom: PUFF_SMALL + PUFF_MID - space.xs2,
    width: TH.bubble.width,
    height: TH.bubble.height,
    borderRadius: radius.full,
    backgroundColor: restScene.surface,
    borderWidth: 1,
    borderColor: worryBox.paperEdge,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  dot: {
    width: TH.dot,
    height: TH.dot,
    borderRadius: TH.dot / 2,
    backgroundColor: labelColor.alternative,
  },
  card: {
    position: "absolute",
    width: worryBoxSize.card.width,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: worryBoxSize.card.radius,
    backgroundColor: worryBox.paper,
    borderWidth: 1,
    borderColor: worryBox.paperEdge,
  },
});
