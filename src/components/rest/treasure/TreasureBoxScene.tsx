import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";

import { Text } from "@/components/ds";
import {
  label as labelColor,
  radius,
  space,
  treasureBox,
  treasureBoxFinish,
  treasureBoxLayout,
  treasureBoxMotion,
  treasureBoxSize,
} from "@/design/ds";
import type { TreasureBoxStage } from "@/features/rest/model/treasureBox";

import { GroundShadow } from "../scene/GroundShadow";
import { RisingMotes } from "../scene/RisingMotes";
import { SceneTopVeil } from "../scene/SceneVeil";

/**
 * 오늘의 보물함의 **장면** — 풀밭의 카피바라와 보물함 (2026-10-05).
 *
 * 화면이 하는 일(단계 · 문안 · 입력 · 저장)과 나뉘어 있어서, 이 파일은 **무엇이 어떻게
 * 움직이는가**만 안다. 걱정상자의 「글 → 카드 → 카피바라가 옮김 → 상자」 연출과 뼈대가 같다.
 *
 * ## 층 (아래에서 위로)
 *
 * 1. 배경 · 2. 번지는 빛 · 3. **열린 보물함 뒤판** · 4. 작은 보물 카드 · 5. **열린 보물함 앞판** ·
 * 6. 닫힌 보물함 · 7. 카피바라 · 8. 반짝임 · 알갱이 · 9. 입력에서 변한 보물 카드
 *
 * 카드가 뒤판과 앞판 **사이**로 내려가 앞판에 가려지는 순간 보물함 안에 들어간 것으로 읽힌다.
 *
 * ## 담기 (`tucking`) — 천천히
 *
 * 입력한 문장이 작은 보물 카드가 되어 카피바라 손으로 날아간다(`fly`) → 카피바라가 받아 들고
 * 잠시 읽는다(`hold`) → 뚜껑이 열리고 안에서 은은한 빛이 번진다(`open`) → 카드가 손끝에서
 * 입구 위로 **살짝만** 들렸다가 안으로 쏙 들어간다(`put` · 2026-10-08 · 하늘로 솟구치며 한 바퀴
 * 돌던 것이 날아가는 것처럼 어색했다) → 뚜껑이 닫히며 톡 튀고 네 갈래 반짝임이 차례로
 * 핀다(`close`) → 잠시 뒤 `onTucked`. 카드에는 표식을 붙이지 않는다 — 표식은 기록을 볼 때만
 * 보인다(2026-10-08 · 사용자 피드백).
 *
 * ⚠ 카피바라는 **처음부터 보물함 곁에 앉아** 있고 자리를 옮기지 않는다. 앉은 채 통통 세 번
 * 뛰어 옮겨 가던 것이 튀어 보였다(2026-10-08 · 실기기 피드백) — 걱정상자와 같은 결이다.
 *
 * ## 끝 (`done`)
 *
 * 카피바라가 보물함에 손을 얹고 쉬고, 보물함 둘레에서 빛 알갱이가 떠오른다 — 조용히, 한 번.
 *
 * 위쪽에는 크림빛 한 겹(`SceneTopVeil`)이 깔린다 — 노란 잎과 밝은 노을 하늘 위에서 머리글이
 * 묻혔다(2026-10-08 · 실기기 피드백).
 *
 * 끝은 시계가 말한다 — 네이티브 드라이버의 완료 콜백은 jest 에 오지 않는다.
 * 그림이 바뀌면 `ART` 표만 갈아 끼운다. 장식이라 낭독기에 읽히지 않는다.
 */
type Props = {
  stage: TreasureBoxStage;
  /** 보물 카드에 적힐 문장 — 담는 동안만 보인다 */
  text: string;
  /** 보물함이 닫히고 잠시 뒤 — 끝맺음 판을 보일 때다 */
  onTucked: () => void;
};

/** 담기 안의 순간. 시작 직후(`null`)가 카드가 날아가는 때다 */
type Step = "hold" | "open" | "put" | "close";

type Pose = "sit" | "hold" | "put" | "rest";

/**
 * 그림 표 — **그림이 바뀔 때 고치는 곳은 여기다.** 배경 · 보물함은 `scripts/keyout-treasure-box.py`
 * 가 만든다. 카피바라 포즈는 걱정상자 것을 그대로 쓴다(쪽지가 곧 보물 카드다).
 */
const ART = {
  background: require("../../../../assets/treasure-box/meadow.webp"),
  poses: {
    sit: require("../../../../assets/worry-box/capybara-sit.webp"),
    hold: require("../../../../assets/worry-box/capybara-hold.webp"),
    put: require("../../../../assets/worry-box/capybara-put.webp"),
    rest: require("../../../../assets/worry-box/capybara-rest.webp"),
  } satisfies Record<Pose, number>,
  chest: {
    back: require("../../../../assets/treasure-box/chest-back.webp"),
    front: require("../../../../assets/treasure-box/chest-front.webp"),
    closed: require("../../../../assets/treasure-box/chest-closed.webp"),
  },
};

const M = treasureBoxMotion;
const F = treasureBoxFinish;
const L = treasureBoxLayout;
const S = treasureBoxSize;
const CAPY_W = S.capybara;
const CAPY_H = CAPY_W / L.capybaraAspect;
const CHEST_W = S.chest;
const CHEST_H = CHEST_W * S.chestAspect;
const NOTE = S.note;
const SHADOW = S.shadow;

const timing = (v: Animated.Value, toValue: number, duration: number) =>
  Animated.timing(v, {
    toValue,
    duration,
    easing: Easing.inOut(Easing.sin),
    useNativeDriver: true,
  });

export function TreasureBoxScene({ stage, text, onTucked }: Props) {
  const { width, height } = useWindowDimensions();
  const ground = height * L.ground;

  const [step, setStep] = useState<Step | null>(null);
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [card] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));
  const [note] = useState(() => new Animated.Value(0));
  const [closed] = useState(() => new Animated.Value(0));
  const [bump] = useState(() => new Animated.Value(0));

  // 담기 — 카드가 날아가고, 받아 들고 읽고, 열고, 넣고, 닫는다
  useEffect(() => {
    if (stage !== "tucking") return;
    const anims: Animated.CompositeAnimation[] = [];
    const run = (it: Animated.CompositeAnimation) => {
      anims.push(it);
      it.start();
    };
    run(timing(card, 1, M.fly));
    const at = (ms: number, fn: () => void) => setTimeout(fn, ms);
    const t1 = M.fly;
    const t2 = t1 + M.hold;
    const t3 = t2 + M.open;
    const t4 = t3 + M.put;
    const timers = [
      at(t1, () => setStep("hold")),
      at(t2, () => {
        setStep("open");
        run(timing(glow, 1, M.open));
      }),
      at(t3, () => {
        setStep("put");
        run(timing(note, 1, M.put));
      }),
      at(t4, () => {
        setStep("close");
        run(
          Animated.parallel([
            timing(closed, 1, M.close),
            timing(glow, 0, M.close),
            Animated.sequence([timing(bump, 1, M.close / 2), timing(bump, 0, M.close / 2)]),
          ]),
        );
      }),
      at(t4 + M.close + M.settle, onTucked),
    ];
    return () => {
      timers.forEach(clearTimeout);
      anims.forEach((a) => a.stop());
    };
    // onTucked 는 화면이 매 렌더 새로 준다 — 연출은 단계가 바뀔 때 한 번만 돈다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, card, glow, note, closed, bump]);

  const tucking = stage === "tucking";
  const pose: Pose =
    stage === "done"
      ? "rest"
      : step === "put" || step === "close"
        ? "put"
        : tucking && step != null
          ? "hold"
          : "sit";

  const capyX = width * L.capybaraX;
  const chestX = width * L.chestX;
  const feet = ground - S.sink;
  // 카드를 받아 든 자리(가슴 앞) · 보물함 쪽으로 뻗은 손끝 — 포즈 그림에서 잰 자리
  const holdX = capyX + CAPY_W * L.holdNote.x;
  const holdY = feet + CAPY_H * L.holdNote.y;
  const pawX = capyX + CAPY_W * L.putPaw.x;
  const pawY = feet + CAPY_H * L.putPaw.y;
  const open = tucking && (step === "open" || step === "put");
  const showCard = tucking && step == null;
  const showNote = tucking && step === "put";
  // 닫힌 보물함 뚜껑 꼭대기 — 반짝임과 알갱이가 여기서 핀다
  const chestTop = ground + CHEST_H * S.closedTop;

  return (
    <View
      testID="treasure-box-scene"
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
      {/* 머리글 뒤의 크림빛 한 겹 — 위에서 짙고 아래로 사라진다(카피바라에는 닿지 않는다) */}
      <SceneTopVeil />

      {/* 보물함 — 닫힐 때의 톡(`bump`). 빛은 뒤판보다 뒤, 카드는 뒤판과 앞판 사이 */}
      <Animated.View
        testID="treasure-box-chest"
        style={[
          styles.chest,
          {
            left: chestX - CHEST_W / 2,
            bottom: ground,
            transform: [
              { scale: bump.interpolate({ inputRange: [0, 1], outputRange: [1, M.bump] }) },
            ],
          },
        ]}
      >
        <GroundShadow
          id="treasure-chest-shadow"
          width={CHEST_W * SHADOW.chest}
          height={SHADOW.height}
          color={treasureBox.shadow}
          opacity={SHADOW.opacity}
          style={styles.chestShadow}
        />
        {/* 열린 보물함 안에서 번지는 은은한 빛 — 위쪽 가운데가 중심 */}
        <Animated.View
          testID={open ? "treasure-box-glow" : undefined}
          style={[
            styles.glow,
            {
              opacity: glow,
              transform: [
                { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              ],
            },
          ]}
        >
          <Svg width={F.glow.size} height={F.glow.size}>
            <Defs>
              <RadialGradient id="treasure-glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={treasureBox.glow} stopOpacity={1} />
                <Stop offset="1" stopColor={treasureBox.glow} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={F.glow.size / 2}
              cy={F.glow.size / 2}
              rx={F.glow.size / 2}
              ry={F.glow.size / 2}
              fill="url(#treasure-glow)"
            />
          </Svg>
        </Animated.View>
        {open ? (
          <Image source={ART.chest.back} contentFit="fill" transition={0} style={styles.layer} />
        ) : null}
        {showNote ? (
          // 손끝에서 떠나 보물함 위로 둥실 → 한 바퀴 돌며 뒤판과 앞판 사이로
          <Animated.View
            testID="treasure-box-note"
            style={[
              styles.note,
              {
                transform: [
                  {
                    // 손끝에서 보물함 입구 위로 옮겨 간 뒤 그 자리에서 곧게 내려간다
                    translateX: note.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [pawX - chestX, 0, 0],
                    }),
                  },
                  {
                    // 입구(앞판 윗변)보다 **살짝만** 들렸다가 앞판 뒤로 쏙 — 하늘로 솟지 않는다
                    translateY: note.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [
                        -(pawY - ground),
                        -(CHEST_H * S.frontTop + M.lift),
                        -CHEST_H * S.frontTop * 0.3,
                      ],
                    }),
                  },
                  {
                    // 손에서 떠날 때 살짝 기울었다가 들어가며 바로 선다 — 돌지 않는다
                    rotate: note.interpolate({
                      inputRange: [0, 0.6, 1],
                      outputRange: [`${-M.tilt}deg`, "0deg", "0deg"],
                    }),
                  },
                ],
              },
            ]}
          ></Animated.View>
        ) : null}
        {open ? (
          <Image source={ART.chest.front} contentFit="fill" transition={0} style={styles.layer} />
        ) : null}
        <Animated.View
          style={[styles.layer, { opacity: open ? 0 : tucking && step === "close" ? closed : 1 }]}
        >
          <Image source={ART.chest.closed} contentFit="fill" transition={0} style={styles.fill} />
        </Animated.View>
      </Animated.View>

      {/* 카피바라 — 처음부터 보물함 곁에 앉아 있고 자리를 옮기지 않는다 */}
      <Animated.View style={[styles.capybara, { left: capyX - CAPY_W / 2, bottom: feet }]}>
        <GroundShadow
          id="treasure-capybara-shadow"
          width={CAPY_W * SHADOW.width}
          height={SHADOW.height}
          color={treasureBox.shadow}
          opacity={SHADOW.opacity}
          style={styles.capyShadow}
        />
        <Image
          testID={`treasure-box-pose-${pose}`}
          source={ART.poses[pose]}
          contentFit="contain"
          transition={M.poseSwap}
          style={styles.fill}
        />
      </Animated.View>

      {/* 닫힐 때 — 보물함 위에서 네 갈래 반짝임이 차례로 핀다 */}
      {tucking && step === "close" ? (
        <View
          testID="treasure-box-sparkles"
          style={[styles.origin, { left: chestX, bottom: chestTop }]}
        >
          {F.sparkles.map((s, i) => (
            <Sparkle key={i} {...s} delay={i * F.sparkle.stagger} />
          ))}
        </View>
      ) : null}

      {/* 끝 — 보물함 둘레의 빛 알갱이 */}
      {stage === "done" ? (
        <RisingMotes
          testID="treasure-box-motes"
          left={chestX}
          bottom={chestTop}
          motes={F.motes}
          duration={F.mote.duration}
          stagger={F.mote.stagger}
          color={treasureBox.mote}
        />
      ) : null}

      {/* 입력한 문장이 작은 보물 카드가 되어 카피바라 손으로 날아간다 */}
      {showCard ? (
        <Animated.View
          testID="treasure-box-card"
          style={[
            styles.card,
            {
              left: width / 2 - S.card.width / 2,
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
          <Text variant="body1" color={labelColor.strong} numberOfLines={3} style={styles.cardText}>
            {text}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** 네 갈래 별 하나 — 커지며 돌다가 사라진다(한 번) */
function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const [life] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const it = Animated.sequence([
      Animated.delay(delay),
      Animated.timing(life, {
        toValue: 1,
        duration: F.sparkle.duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    it.start();
    return () => it.stop();
  }, [life, delay]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        opacity: life.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] }),
        transform: [
          { scale: life.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.2, 1, 0.6] }) },
          { rotate: life.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "45deg"] }) },
        ],
      }}
    >
      <Svg width={size} height={size} viewBox="-1 -1 2 2">
        <Path
          d="M0 -1 C0.12 -0.12 0.12 -0.12 1 0 C0.12 0.12 0.12 0.12 0 1 C-0.12 0.12 -0.12 0.12 -1 0 C-0.12 -0.12 -0.12 -0.12 0 -1Z"
          fill={treasureBox.sparkle}
        />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chest: { position: "absolute", width: CHEST_W, height: CHEST_H },
  // 보물함 세 장(뒤판 · 앞판 · 닫힌 것)은 같은 상자에서 잘려 정확히 겹친다
  layer: { position: "absolute", left: 0, top: 0, width: CHEST_W, height: CHEST_H },
  fill: { width: "100%", height: "100%" },
  chestShadow: { left: (CHEST_W - CHEST_W * SHADOW.chest) / 2, bottom: -SHADOW.height / 2 },
  capyShadow: { left: (CAPY_W - CAPY_W * SHADOW.width) / 2, bottom: S.sink - SHADOW.height / 2 },
  // 빛의 가운데가 열린 입구(앞판 윗변) 가운데에 온다
  glow: {
    position: "absolute",
    left: CHEST_W / 2 - F.glow.size / 2,
    bottom: CHEST_H * S.frontTop - F.glow.size / 2,
    width: F.glow.size,
    height: F.glow.size,
  },
  note: {
    position: "absolute",
    left: CHEST_W / 2 - NOTE / 2,
    bottom: 0,
    width: NOTE,
    height: NOTE * 0.75,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: treasureBox.paper,
    borderWidth: 1,
    borderColor: treasureBox.paperEdge,
    borderRadius: radius.small / 2,
  },
  capybara: { position: "absolute", width: CAPY_W, height: CAPY_H },
  origin: { position: "absolute", width: 0, height: 0 },
  card: {
    position: "absolute",
    width: S.card.width,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: S.card.radius,
    backgroundColor: treasureBox.paper,
    borderWidth: 1,
    borderColor: treasureBox.paperEdge,
  },
  cardText: { flex: 1 },
});
