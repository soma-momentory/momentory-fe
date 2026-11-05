import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { ConceptPicker } from "@/components/rest/meditation/ConceptPicker";
import { MeditationCueText } from "@/components/rest/meditation/MeditationCueText";
import { MeditationInfoSheet } from "@/components/rest/meditation/MeditationInfoSheet";
import { MeditationLoadError } from "@/components/rest/meditation/MeditationLoadError";
import {
  PauseMark,
  PlayMark,
  StopMark,
  VoiceMark,
} from "@/components/rest/meditation/MeditationMarks";
import { MeditationScene } from "@/components/rest/meditation/MeditationScene";
import { MeditationStopConfirm } from "@/components/rest/meditation/MeditationStopConfirm";
import { GuideCard } from "@/components/rest/scene/GuideCard";
import { MoodExit } from "@/components/rest/scene/MoodExit";
import {
  SceneBackButton,
  SceneCornerButton,
  SceneGuideButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import {
  meditation,
  meditationLayout,
  meditationMotion,
  meditationSize,
  restScene,
  restSceneSize,
  space,
} from "@/design/ds";
import { track } from "@/features/analytics";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { useDiary } from "@/features/diary/model/diary";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useTodayContext } from "@/features/home/model/day";
import {
  createMeditationClock,
  formatMeditationClock,
  MEDITATION_DURATION_MS,
  MEDITATION_LEAVE,
  MEDITATION_START,
  MEDITATION_VOICE_LABEL,
  meditationConcept,
  type MeditationConceptId,
  visibleCueAt,
} from "@/features/rest/model/meditation";
import { createMeditationAudio, type MeditationAudio } from "@/features/rest/model/meditationAudio";
import { REST_GUIDE_MEDITATION_INFO } from "@/features/rest/model/restGuide";
import { REST_RECORDS_LINK } from "@/features/rest/model/restRecord";
import { useRestGuide } from "@/features/rest/model/useRestGuide";
import { useRestRecord } from "@/features/rest/model/useRestRecord";
import { onForeground, onLeaveForeground } from "@/lib/appState";

const TOTAL = formatMeditationClock(MEDITATION_DURATION_MS);

/**
 * 쉼터 · 3분 명상 (2026-11-04) — 풍경을 고르고 최대 3분 머문다.
 *
 * - **준비** — 풍경 이름 · 부제 · 동그라미 다섯 · 「시작하기」
 * - **불러오기** — 소리가 준비되면 시계가 간다. 음성을 못 불러오면 「다시 시도 / 자막으로 시작」을 묻는다
 * - **재생** — 시계 · 자막 · 음성 · 배경음 · 조작. 일시정지 · 멈춤 확인 · 설명 카드 · 정보 시트 · 앱이 뒤로 간 시간은
 *   흐르지 않고 음성과 배경음도 함께 멈춘다(`meditationAudio.ts`)
 * - **마침** — 3분이 차거나 「여기서 멈추기」를 누르면 기분 쪽지가 뜬다. 일찍 멈춰도 같은 쪽지다
 *
 * 시스템 뒤로가기는 가로채지 않는다 — 소리를 남기지 않고 「중간에 나감」으로 남는다(`useRestRecord`).
 */
export default function MeditationScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [sessionHeight, setSessionHeight] = useState<number | null>(null);
  const [conceptId, setConceptId] = useState<MeditationConceptId>("wave");
  const [stage, setStage] = useState<"ready" | "loading" | "failed" | "session" | "ended">("ready");
  const [paused, setPaused] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceLoaded, setVoiceLoaded] = useState(true);
  const [asking, setAsking] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clock] = useState(() => createMeditationClock());
  const ended = useRef(false);
  const audio = useRef<MeditationAudio | null>(null);

  const concept = meditationConcept(conceptId);
  const guide = useRestGuide("meditation");
  const running = stage === "session" && !paused && !asking && !infoOpen && !guide.open;

  const { date: today } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, today));
  const rest = useRestContentAnalytics(
    "meditation",
    stage === "session" ? "meditating" : stage === "ended" ? null : "ready",
    diaryToday,
  );
  const record = useRestRecord("meditation", stage === "session" || stage === "ended");

  // 끝은 한 번뿐이다 — 3분이 차는 순간과 「여기서 멈추기」가 겹쳐도 먼저 온 쪽만 남는다
  const finish = useCallback(
    (reason: "natural" | "user_stop") => {
      if (ended.current) return;
      ended.current = true;
      clock.pause();
      const stayed = Math.min(clock.elapsed(), MEDITATION_DURATION_MS);
      setElapsed(stayed);
      setAsking(false);
      setInfoOpen(false);
      setStage("ended");
      audio.current?.fadeOut();
      track("meditation_ended", {
        concept: conceptId,
        reason,
        duration_ms: Math.round(stayed),
        voice_enabled: voiceOn,
      });
      // 일찍 멈춰도 같은 기분 쪽지까지 갔으니 끝까지 한 판이다 — 이용 기록과 같은 기준(3분을 채웠는지는 reason 으로 본다)
      rest.complete();
    },
    [clock, conceptId, rest, voiceOn],
  );

  useEffect(() => {
    if (!running) {
      clock.pause();
      return;
    }
    clock.resume();
    const tick = setInterval(() => {
      const now = clock.elapsed();
      setElapsed(now);
      if (now >= MEDITATION_DURATION_MS) finish("natural");
    }, meditationMotion.tick);
    return () => clearInterval(tick);
  }, [running, clock, finish]);

  // 음성은 시계를 따른다 — 멈춘 동안에는 나지 않고, 이어하거나 다시 켜면 시계가 가리키는 자리부터 난다
  useEffect(() => {
    audio.current?.sync({ elapsedMs: elapsed, running, voiceOn });
  }, [elapsed, running, voiceOn]);

  // 앱이 뒤로 가면 저절로 멈추고 소리도 멈춘다. 돌아와도 사용자가 이어하기를 누른다
  useEffect(() => {
    const offLeave = onLeaveForeground(() => {
      clock.pause();
      setPaused(true);
      audio.current?.setAway(true);
    });
    const offBack = onForeground(() => audio.current?.setAway(false));
    return () => {
      offLeave();
      offBack();
    };
  }, [clock]);

  // 이용 기록을 보러 가면 앱이 뒤로 갈 때와 같다 — 시간과 소리가 멈추고, 돌아와도 이어하기를 누를 때까지 조용하다
  useFocusEffect(
    useCallback(() => {
      audio.current?.setAway(false);
      return () => {
        clock.pause();
        setPaused(true);
        audio.current?.setAway(true);
      };
    }, [clock]),
  );

  // 어떻게 떠나든 소리를 남기지 않는다
  useEffect(
    () => () => {
      audio.current?.release();
      audio.current = null;
    },
    [],
  );

  const beginSession = (withVoice: boolean) => {
    setVoiceLoaded(withVoice);
    setVoiceOn(withVoice);
    setPaused(false);
    setStage("session");
    track("meditation_started", { concept: conceptId });
  };

  const start = async () => {
    audio.current?.release();
    const next = createMeditationAudio(concept);
    audio.current = next;
    setStage("loading");
    const loaded = await next.start();
    // 기다리는 사이에 화면을 떠났다
    if (audio.current !== next) return;
    if (loaded.voice) {
      beginSession(true);
      return;
    }
    setStage("failed");
    track("meditation_audio_failed", { concept: conceptId });
  };

  // 배경음을 못 불러왔으면 재생을 불러도 나지 않는다 — 자막만으로 간다
  const startWithCaptions = () => beginSession(false);

  const closeLoadError = () => {
    audio.current?.release();
    audio.current = null;
    setStage("ready");
  };

  const top = insets.top + space.sm;
  const inSession = stage === "session";
  // 자막의 첫 줄 — 그림과 같이 화면 높이를 따른다. 조작에 닿을 것 같으면 그만큼 올라간다
  const screenHeight = sessionHeight ?? windowHeight;
  const controlsTop =
    screenHeight -
    (insets.bottom +
      meditationLayout.controlsBottom +
      meditationSize.mainControl +
      restSceneSize.vintage.depth);
  const cueTop = Math.min(
    screenHeight * meditationLayout.cueTopRatio,
    controlsTop - meditationLayout.cueMaxHeight,
  );
  const choosing = stage === "ready" || stage === "loading";

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <StatusBar style={stage === "ended" ? "dark" : "light"} />
      <MeditationScene concept={conceptId} />

      {choosing ? (
        <View style={[styles.fill, { paddingTop: top + meditationLayout.titleBelowTop }]}>
          <View style={styles.title}>
            <Text
              variant="meditationName"
              color={meditation.onScene}
              accessibilityRole="header"
              style={styles.onScene}
            >
              {concept.name}
            </Text>
            <Text variant="meditationSub" color={meditation.onSceneSub} style={styles.onScene}>
              {concept.sub}
            </Text>
          </View>
          <View style={styles.fill} />
          <ConceptPicker
            value={conceptId}
            onChange={(id) => {
              if (stage === "ready") setConceptId(id);
            }}
          />
          <View style={[styles.startBar, { paddingBottom: insets.bottom + space.lg }]}>
            <ScenePillButton
              tone="accent"
              label={MEDITATION_START}
              disabled={stage === "loading"}
              onPress={() => void start()}
            />
          </View>
        </View>
      ) : null}

      {inSession ? (
        <>
          {paused ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dimPaused]} />
          ) : null}
          <View
            testID="meditation-session"
            onLayout={(e) => setSessionHeight(e.nativeEvent.layout.height)}
            style={[styles.fill, { paddingTop: top + meditationLayout.clockBelowTop }]}
          >
            <Text
              testID="meditation-clock"
              variant="meditationClock"
              color={meditation.onScene}
              style={[styles.onScene, styles.clock]}
            >
              {`${formatMeditationClock(elapsed)} / ${TOTAL}`}
            </Text>
            <View style={styles.fill} />
            <View testID="meditation-cue-zone" style={[styles.cueZone, { top: cueTop }]}>
              <MeditationCueText
                text={visibleCueAt(concept, elapsed)?.text ?? null}
                paused={paused}
              />
            </View>
            <View
              style={[
                styles.controls,
                { paddingBottom: insets.bottom + meditationLayout.controlsBottom },
              ]}
            >
              <View style={styles.sideSlot}>
                <VintagePressable
                  accessibilityLabel={MEDITATION_VOICE_LABEL}
                  selected={voiceOn}
                  muted={!voiceOn}
                  disabled={!voiceLoaded}
                  onPress={() => setVoiceOn((on) => !on)}
                  radius={meditationSize.sideControl / 2}
                  style={styles.side}
                  faceStyle={styles.sideFace}
                >
                  <VoiceMark
                    size={meditationSize.voiceGlyph}
                    color={voiceOn ? restScene.ink : restScene.mutedInk}
                    off={!voiceOn}
                  />
                </VintagePressable>
              </View>
              <VintagePressable
                accessibilityLabel={paused ? "이어하기" : "일시정지"}
                onPress={() => setPaused((p) => !p)}
                face={restScene.accent}
                radius={meditationSize.mainControl / 2}
                style={styles.main}
                faceStyle={styles.mainFace}
              >
                {paused ? (
                  <PlayMark size={meditationSize.mainGlyph} color={restScene.ink} />
                ) : (
                  <PauseMark size={meditationSize.mainGlyph} color={restScene.ink} />
                )}
              </VintagePressable>
              <View style={styles.sideSlot}>
                <VintagePressable
                  accessibilityLabel="멈추기"
                  onPress={() => setAsking(true)}
                  radius={meditationSize.sideControl / 2}
                  style={styles.side}
                  faceStyle={styles.sideFace}
                >
                  <StopMark size={meditationSize.sideGlyph} color={restScene.ink} />
                </VintagePressable>
              </View>
            </View>
          </View>
        </>
      ) : null}

      {stage === "failed" ? (
        <MeditationLoadError
          concept={concept}
          onRetry={() => void start()}
          onCaptions={startWithCaptions}
          onClose={closeLoadError}
        />
      ) : null}

      {choosing || inSession ? (
        <>
          <SceneBackButton
            top={top}
            onPress={() => (inSession ? setAsking(true) : router.back())}
          />
          <SceneGuideButton top={top} onPress={guide.show} />
          {/* 불러오는 중에는 막는다 — 다른 화면에 있는 동안 세션이 시작되면 안 된다 */}
          {stage !== "loading" ? (
            <SceneCornerButton
              top={top}
              label={REST_RECORDS_LINK}
              icon="clock"
              onPress={() => router.push("/rest/records?content=meditation")}
            />
          ) : null}
        </>
      ) : null}

      {asking ? (
        <MeditationStopConfirm
          onResume={() => {
            setPaused(false);
            setAsking(false);
          }}
          onStop={() => finish("user_stop")}
        />
      ) : null}
      {guide.open ? (
        <GuideCard
          content="meditation"
          first={guide.first}
          onClose={guide.close}
          lastPageLink={{
            label: REST_GUIDE_MEDITATION_INFO,
            onPress: () => {
              guide.close();
              setInfoOpen(true);
            },
          }}
        />
      ) : null}
      {infoOpen ? (
        <MeditationInfoSheet concept={concept} onClose={() => setInfoOpen(false)} />
      ) : null}
      {stage === "ended" ? (
        <MoodExit
          leaveLabel={MEDITATION_LEAVE}
          onPick={record.pick}
          onLeave={() => router.replace("/(tabs)/rest")}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  title: { alignItems: "center", gap: space.xs, paddingHorizontal: space.xl3 },
  onScene: {
    textAlign: "center",
    textShadowColor: meditation.textShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  startBar: { paddingHorizontal: space.xl, paddingTop: meditationLayout.pickerGap },
  dimPaused: { backgroundColor: meditation.dimPaused },
  clock: { fontVariant: ["tabular-nums"] },
  cueZone: { position: "absolute", left: 0, right: 0, paddingHorizontal: space.xl3 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: meditationSize.controlGap,
  },
  sideSlot: { width: meditationSize.sideSlot, alignItems: "center" },
  main: { width: meditationSize.mainControl },
  mainFace: {
    height: meditationSize.mainControl,
    alignItems: "center",
    justifyContent: "center",
  },
  side: { width: meditationSize.sideControl },
  sideFace: {
    height: meditationSize.sideControl,
    alignItems: "center",
    justifyContent: "center",
  },
});
