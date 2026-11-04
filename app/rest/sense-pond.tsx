import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { Appear, Pop } from "@/components/rest/pond/Appear";
import { HoldPill } from "@/components/rest/pond/HoldPill";
import { artScale, spotAt, spotOnPad } from "@/components/rest/pond/layout";
import { type BabaMood, PondBaba } from "@/components/rest/pond/PondBaba";
import { PondPath } from "@/components/rest/pond/PondPath";
import { PondWater } from "@/components/rest/pond/PondWater";
import { SENSE_COLOR, SenseMark } from "@/components/rest/pond/SenseMark";
import { GuideCard } from "@/components/rest/scene/GuideCard";
import { MoodExit } from "@/components/rest/scene/MoodExit";
import { RisingMotes } from "@/components/rest/scene/RisingMotes";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCornerButton,
  SceneGuideButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { SceneTopVeil } from "@/components/rest/scene/SceneVeil";
import { homeV2, pondScene, pondSceneMotion, restScene, space } from "@/design/ds";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { useSensePondAnalytics } from "@/features/analytics/useSensePondAnalytics";
import { useDiary } from "@/features/diary/model/diary";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useTodayContext } from "@/features/home/model/day";
import { REST_RECORDS_LINK } from "@/features/rest/model/restRecord";
import {
  isStepDone,
  nextFound,
  progressText,
  SENSE_POND_DONE,
  SENSE_POND_STEPS,
  SENSE_POND_TITLE,
  SENSE_POND_INTRO,
} from "@/features/rest/model/sensePond";
import { useRestGuide } from "@/features/rest/model/useRestGuide";
import { useRestRecord } from "@/features/rest/model/useRestRecord";

const POND = require("../../assets/sensory-pond/pond.webp");

/**
 * 감각연못 — 보이는 것 3개 → 들리는 소리 2개 → 몸에 닿는 느낌 1개 → 끝
 * (2026-09-03 도입 · 2026-11-04 그림과 화면을 다시 짰다 · 시안 `analysis/2026-11-03-rest-list-pond/v7.html`).
 *
 * 찾은 수가 곧 바바가 앉은 연잎 번호라, 하나 찾아 버튼을 누를 때마다 한 장 건너가고 끝까지 가면 길을
 * 다 건넌다. 화면을 옮기지 않고 한 장면 안에서 시작 → 단계 → 끝이 갈린다.
 *
 * 남는 것은 2026-11-04 전과 **같다** — 이용 기록(`useRestRecord("sense_pond", …)` · 서버
 * `/api/v1/rest-records` · 기록 화면 `?content=sense_pond`) · 계측 두 벌 · 설명 카드 · 기분 쪽지.
 */
export default function SensePondScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [found, setFound] = useState(0);
  const [finished, setFinished] = useState(false);
  // 건너가는 중 — 버튼을 끄고 바바가 웃는다
  const [landing, setLanding] = useState(false);
  const [holding, setHolding] = useState(false);
  const [hop, setHop] = useState(0);
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = SENSE_POND_STEPS[stepIndex]!;
  const done = isStepDone(step, found);
  const hasNext = stepIndex + 1 < SENSE_POND_STEPS.length;

  // 기록 · 계측의 이름은 도입 때부터 같다 — 쌓인 값이 이어지려면 바꾸지 않는다
  const pond = useSensePondAnalytics(step.id);
  const { date: today } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, today));
  // 시작 화면에서는 나간 자리를 남기지 않는다 — 연 수에서 끝낸 수와 나간 수를 빼면 시작 화면에서 나간 수다
  const rest = useRestContentAnalytics("sense_pond", started ? step.id : null, diaryToday);
  const record = useRestRecord("sense_pond", stepIndex > 0 || found > 0 || finished);
  const guide = useRestGuide("sense_pond");

  useEffect(() => {
    if (done && !hasNext) rest.complete();
  }, [done, hasNext, rest]);

  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current);
    },
    [],
  );

  const start = () => {
    setStarted(true);
    setHop((n) => n + 1);
    // 시작 화면에 머문 시간을 첫 단계 시간에 넣지 않는다
    pond.show(step.id);
  };

  const find = () => {
    // 건너가는 동안의 손짓은 세지 않는다. 버튼을 잿빛으로 바꾸면 누를 때마다 깜빡여 끄지 않는다
    if (landing) return;
    const full = found + 1 >= step.goal;
    setHolding(false);
    pond.find(step.goal, full && !hasNext);
    setFound((n) => nextFound(step, n));
    setLanding(true);
    setHop((n) => n + 1);
    timer.current = setTimeout(() => {
      setLanding(false);
      if (!full) return;
      if (hasNext) {
        setStepIndex((i) => i + 1);
        setFound(0);
      } else {
        setFinished(true);
        setHop((n) => n + 1); // 피어난 연꽃 옆으로 한 번 더 건너간다
      }
    }, pondSceneMotion.landing);
  };

  const k = artScale(width, height);
  const passed = SENSE_POND_STEPS.slice(0, stepIndex).reduce((n, s) => n + s.goal, 0) + found;
  const spot = finished
    ? spotAt(pondScene.bloom.baba, width, height)
    : started
      ? spotOnPad(passed, width, height)
      : spotAt(pondScene.shore, width, height);
  const mood: BabaMood = finished ? "done" : step.id === "hear" ? "listen" : "idle";
  const heading = finished ? SENSE_POND_DONE : started ? null : SENSE_POND_INTRO;
  const chromeTop = insets.top + space.sm;
  const belowChrome = chromeTop + SCENE_BACK_SIZE;

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <View testID="pond-v2" style={styles.scene}>
        <Image source={POND} style={StyleSheet.absoluteFill} contentFit="cover" />
        <PondWater />
        <SceneTopVeil veil={pondScene.veil} testID="pond-v2-veil" />
        <PondPath
          width={width}
          height={height}
          finished={finished}
          landingPad={started ? passed : -1}
          landed={hop}
        />

        {started && !finished ? (
          <Appear key={step.id} style={[styles.bubble, { top: belowChrome + pondScene.bubbleGap }]}>
            <Pop from={0.6} style={styles.badge}>
              <SenseMark kind={step.point} size={pondScene.mark.bubble} />
            </Pop>
            <Text variant="title3Hand" color={homeV2.color.ink} style={styles.question}>
              {step.question}
            </Text>
            <Text variant="body1ReadingHand" color={homeV2.color.muted} style={styles.mid}>
              {`예) ${step.example}`}
            </Text>
            {step.goal > 1 ? (
              <View
                accessible
                accessibilityLabel={progressText(step, found)}
                style={[styles.count, { borderColor: SENSE_COLOR[step.point] }]}
              >
                <Pop key={found} from={1.25}>
                  <Text
                    accessibilityElementsHidden
                    variant="tapeHand"
                    color={SENSE_COLOR[step.point]}
                  >
                    {`${found} / ${step.goal}`}
                  </Text>
                </Pop>
              </View>
            ) : null}
            <View style={styles.tail} />
          </Appear>
        ) : null}

        <PondBaba
          spot={spot}
          box={pondScene.shore.width * k}
          mood={mood}
          smile={landing}
          calm={holding}
          hop={hop}
        />

        {finished ? (
          <RisingMotes
            left={spot.x}
            bottom={height - spot.y + spot.width}
            motes={pondScene.mote.list}
            duration={pondSceneMotion.mote.duration}
            stagger={pondSceneMotion.mote.stagger}
            color={pondScene.mote.color}
          />
        ) : null}

        {heading != null ? (
          <Appear
            key={finished ? "done" : "intro"}
            style={[styles.heading, { top: belowChrome + space.xs }]}
          >
            <Text variant="title1Hand" color={homeV2.color.ink} style={styles.headingTitle}>
              {finished ? SENSE_POND_DONE.title : SENSE_POND_TITLE}
            </Text>
            <Text variant="body1ReadingHand" style={styles.headingBody}>
              {heading.description}
            </Text>
            {!finished ? (
              <View style={styles.marks}>
                {SENSE_POND_STEPS.map((s) => (
                  <SenseMark key={s.id} kind={s.point} size={pondScene.mark.cover} />
                ))}
              </View>
            ) : null}
          </Appear>
        ) : null}

        <SceneBackButton top={chromeTop} onPress={() => router.back()} />
        <SceneGuideButton top={chromeTop} onPress={guide.show} />
        <SceneCornerButton
          top={chromeTop}
          label={REST_RECORDS_LINK}
          icon="clock"
          onPress={() => router.push("/rest/records?content=sense_pond")}
        />

        <View
          style={[
            styles.pill,
            { bottom: Math.max(insets.bottom, space.md) + pondScene.pillBottom },
          ]}
        >
          {finished ? (
            <ScenePillButton
              tone="accent"
              label={SENSE_POND_DONE.cta}
              onPress={() => setAsking(true)}
            />
          ) : !started ? (
            <ScenePillButton tone="accent" label={SENSE_POND_INTRO.cta} onPress={start} />
          ) : step.input === "hold" ? (
            <HoldPill
              label={step.button}
              locked={landing}
              onHoldStart={() => setHolding(true)}
              onHoldCancel={() => {
                setHolding(false);
                pond.holdCancel();
              }}
              onDone={find}
            />
          ) : (
            <ScenePillButton tone="accent" label={step.button} onPress={find} />
          )}
        </View>
      </View>

      {asking ? (
        <MoodExit
          leaveLabel={SENSE_POND_DONE.cta}
          onPick={record.pick}
          onLeave={() => router.replace("/(tabs)/rest")}
        />
      ) : null}
      {guide.open ? (
        <GuideCard content="sense_pond" first={guide.first} onClose={guide.close} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: "hidden", backgroundColor: restScene.veil },
  bubble: {
    position: "absolute",
    left: pondScene.bubble.side,
    right: pondScene.bubble.side,
    paddingTop: pondScene.mark.bubble / 2 + space.sm,
    paddingBottom: space.md,
    paddingHorizontal: space.lg,
    alignItems: "center",
    gap: space.xs,
    borderRadius: pondScene.bubble.radius,
    backgroundColor: pondScene.bubble.color,
  },
  badge: { position: "absolute", top: -pondScene.mark.bubble / 2 },
  question: {
    textAlign: "center",
    fontSize: pondScene.question.fontSize,
    lineHeight: pondScene.question.lineHeight,
  },
  mid: { textAlign: "center" },
  count: {
    paddingHorizontal: space.md,
    borderRadius: 999,
    borderWidth: 1.5,
    backgroundColor: restScene.surface,
  },
  tail: {
    position: "absolute",
    bottom: -pondScene.bubble.tail - 3,
    width: 0,
    height: 0,
    borderLeftWidth: pondScene.bubble.tail,
    borderRightWidth: pondScene.bubble.tail,
    borderTopWidth: pondScene.bubble.tail + 3,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: pondScene.bubble.color,
  },
  heading: { position: "absolute", left: space.xl, right: space.xl, alignItems: "center" },
  headingTitle: {
    textAlign: "center",
    textShadowColor: restScene.surface,
    textShadowRadius: 10,
  },
  headingBody: {
    textAlign: "center",
    color: homeV2.color.ink,
    fontSize: pondScene.description.fontSize,
    lineHeight: pondScene.description.lineHeight,
    textShadowColor: restScene.surface,
    textShadowRadius: 10,
  },
  marks: { flexDirection: "row", gap: space.md, marginTop: space.md },
  pill: { position: "absolute", left: pondScene.pillSide, right: pondScene.pillSide },
});
