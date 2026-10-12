import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { BodyReleaseScene, type BodyReleasePose } from "@/components/rest/body/BodyReleaseScene";
import type { RestStageName } from "@/features/analytics/events";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { StepHeading } from "@/components/rest/pond/StepHeading";
import { GuideNote } from "@/components/rest/scene/GuideNote";
import { MoodExit } from "@/components/rest/scene/MoodExit";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCard,
  SceneCornerButton,
  SceneGuideButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { REST_RECORDS_LINK } from "@/features/rest/model/restRecord";
import { useRestGuide } from "@/features/rest/model/useRestGuide";
import { useRestRecord } from "@/features/rest/model/useRestRecord";
import {
  bodyReleaseFinish,
  bodyReleaseMotion,
  bodyReleaseSize,
  elevation,
  fill,
  label as labelColor,
  radius,
  restScene,
  space,
} from "@/design/ds";
import {
  BODY_RELEASE_BREATH,
  BODY_RELEASE_DONE,
  BODY_RELEASE_INTRO,
  BODY_RELEASE_PARTS,
  BODY_RELEASE_PHASE_LABEL,
  BODY_RELEASE_SECONDS,
  type BodyReleasePhase,
  beatAt,
} from "@/features/rest/model/bodyRelease";

/**
 * 몸에 힘 빼기 — 손과 팔 → 어깨와 목 → 얼굴 → 다리와 발, 부위마다 힘주기 5초 →
 * 풀기 10초 (2026-10-05).
 *
 * 쉼터 `R1` 의 「몸에 힘 빼기」 카드가 여는 화면. 감각연못처럼 **장면 하나가 화면을
 * 채우고** 그 위에 위 안내 · 아래 판이 뜬다(`BodyReleaseScene`).
 *
 * ## 셋 중 하나다
 *
 * - **시작 전** — 「몸에 힘 빼기」 + 첫 부위 미리보기 + 「따라 해보기」
 * - **진행** — 시간이 끌고 간다. 위는 지금 할 일과 숨 한 줄, 아래는 「1 / 4 손과 팔」과
 *   두 박자(5초 힘주기 · 10초 풀기). 해가 들숨에 커지고 날숨에 작아진다
 * - **완료** — 위에 「천천히 몸의 힘을 풀어봤어요」와 그 아래 한 줄이 크게 서고
 *   (`StepHeading` `close`), 잠시 뒤(`bodyReleaseMotion.doneHold`) 아래에 「마치기」
 *
 * 남은 초를 깎지 않고 시작 시각과의 차이로 매번 계산한다(`beatAt`) — 앱이 잠깐 뒤로
 * 갔다 와도 박자가 어긋나지 않는다. 어디에도 저장하지 않는다.
 */
export default function BodyReleaseScreen() {
  const insets = useSafeAreaInsets();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  // 완료 뒤 정적이 지났다 — 한 줄과 「마치기」가 붙는다
  const [settled, setSettled] = useState(false);
  // 저장소 관례(`ChatBubble`) — ref 는 렌더 중 읽지 않는다(react-hooks/refs)
  const [breath] = useState(() => new Animated.Value(0));
  // 지금 박자가 얼마나 지났나 — 시간 링이 이만큼 차 있다
  const [progress] = useState(() => new Animated.Value(0));

  const beat = startedAt == null ? null : beatAt(now - startedAt);
  const done = beat?.done === true;
  const running = beat != null && !beat.done ? beat : null;

  // 쉼 콘텐츠 공통 계측 — 나간 자리는 시작 전(intro) 또는 그때의 부위다
  const { date: today } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, today));
  const rest = useRestContentAnalytics(
    "body_release",
    startedAt == null ? "intro" : running != null ? PART_STAGES[running.part]! : null,
    diaryToday,
  );
  useEffect(() => {
    if (done) rest.complete();
  }, [done, rest]);
  // 이용 기록 — 「따라 해보기」를 누른 판부터 남긴다. 기분을 골라야 「마치기」가 붙는다
  const record = useRestRecord("body_release", startedAt != null);
  // 「돌아가기」를 눌렀다 — 장면 위에 기분 쪽지가 뜨고, 고른 뒤에야 실제로 나간다
  const [asking, setAsking] = useState(false);
  // 처음 들어오면 설명 쪽지가 뜬다 — 「?」 원이 다시 연다
  const guide = useRestGuide("body_release");

  // 시계 — 진행 중에만 돈다
  useEffect(() => {
    if (startedAt == null || done) return;
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, [startedAt, done]);

  // 숨 — 박자가 바뀔 때마다 해가 그 박자의 길이에 걸쳐 커지거나(들숨) 작아진다(날숨)
  const phase: BodyReleasePhase | "done" | null = done ? "done" : (running?.phase ?? null);
  const part = running?.part ?? null;
  useEffect(() => {
    if (phase == null) return;
    if (phase === "done") {
      // 끝맺음 — 숨을 한 번 깊게 들이쉬었다 길게 내쉰다(해도 같이 부풀었다 가라앉는다)
      const sigh = Animated.sequence([
        Animated.timing(breath, {
          toValue: bodyReleaseFinish.sigh.depth,
          duration: bodyReleaseFinish.sigh.inhale,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: bodyReleaseMotion.settle,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]);
      sigh.start();
      return () => sigh.stop();
    }
    const it = Animated.timing(breath, {
      toValue: phase === "tense" ? 1 : 0,
      duration: BODY_RELEASE_SECONDS[phase] * 1000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: true,
    });
    it.start();
    // 링은 박자마다 비우고 다시 한 바퀴 — 시간이 흐르는 것이 보이게 고르게(linear) 돈다.
    // SVG 속성이라 네이티브 드라이버를 못 쓴다
    progress.setValue(0);
    const ring = Animated.timing(progress, {
      toValue: 1,
      duration: BODY_RELEASE_SECONDS[phase] * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    ring.start();
    return () => {
      it.stop();
      ring.stop();
    };
  }, [phase, part, breath, progress]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setSettled(true), bodyReleaseMotion.doneHold);
    return () => clearTimeout(t);
  }, [done]);

  const start = () => {
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  };

  // 진행 · 마침도 소개의 「몸에 힘 빼기」와 같은 크기로 선다(2026-10-06 · 사용자 요청)
  const heading = done
    ? {
        tone: "closeLead" as const,
        title: BODY_RELEASE_DONE.title,
        description: BODY_RELEASE_DONE.description,
      }
    : running != null
      ? {
          tone: "stepLead" as const,
          title:
            running.phase === "tense"
              ? BODY_RELEASE_PARTS[running.part]!.tense
              : BODY_RELEASE_PARTS[running.part]!.release,
          description: BODY_RELEASE_BREATH[running.phase],
        }
      : {
          tone: "intro" as const,
          title: BODY_RELEASE_INTRO.title,
          description: BODY_RELEASE_INTRO.description,
        };

  const shownPart = running?.part ?? 0;

  // 카피바라는 지금 박자를 따라 한다 — 힘주기는 그 부위의 포즈, 풀기는 늘어진 포즈
  const pose: BodyReleasePose = done
    ? "calm"
    : running == null
      ? "neutral"
      : running.phase === "tense"
        ? TENSE_POSES[running.part]!
        : "release";

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <View style={styles.scene}>
        <BodyReleaseScene
          breath={breath}
          progress={progress}
          pose={pose}
          sway={running?.phase === "release"}
          finished={done}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            { paddingTop: insets.top + space.sm + SCENE_BACK_SIZE + space.xs },
          ]}
        >
          <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
          <SceneGuideButton top={insets.top + space.sm} onPress={guide.show} />
          <SceneCornerButton
            top={insets.top + space.sm}
            label={REST_RECORDS_LINK}
            icon="clock"
            onPress={() => router.push("/rest/records?content=body_release")}
          />
          <View style={styles.words}>
            <StepHeading
              center
              tone={heading.tone}
              title={heading.title}
              description={heading.description}
              halo={restScene.surface}
            />
          </View>
        </View>

        {/* 아래 정보는 반투명 크림 카드에 담는다 — 풀밭의 잔결에 글이 흐려졌다(실기기).
            버튼은 카드 밖, 장면 위에 바로 선다 */}
        <View style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]}>
          {done ? (
            // 끝의 한마디는 위에서 제목 아래 크게 말한다 — 아래에는 버튼 하나만(실기기 ·
            // 2026-10-05 · 카드와 버튼 두 상자가 나뉘어 어색했다)
            !settled ? null : (
              <ScenePillButton label={BODY_RELEASE_DONE.cta} onPress={() => setAsking(true)} />
            )
          ) : (
            <>
              <SceneCard>
                {/* 순서와 부위를 두 줄로 — 크기가 다른 글자를 한 줄에 섞으면 기준선이 어긋났다
                    (실기기 · 2026-10-05). 부위 이름이 먼저 읽히게 크다 */}
                <View style={styles.part}>
                  <Text variant="body1" color={labelColor.alternative}>
                    {`${shownPart + 1} / ${BODY_RELEASE_PARTS.length}`}
                  </Text>
                  <Text variant="heading1" color={labelColor.strong}>
                    {BODY_RELEASE_PARTS[shownPart]!.name}
                  </Text>
                </View>
                {running != null ? (
                  // 박자 둘을 한 홈 안의 두 칸으로 두고 **지금 박자만 떠오른다**(세그먼트 결 ·
                  // 실기기 · 2026-10-05). 색만으로 가르지 않는다 — 면 · 그림자 · 글자 굵기가
                  // 함께 바뀐다. 살구빛 면 + 주황 테두리는 어색했다
                  <View style={styles.beats}>
                    {(["tense", "release"] as const).map((p) => {
                      const on = p === running.phase;
                      return (
                        // 박자가 바뀌면 칸을 **새로 만든다**(key 에 on). 안드로이드는 투명 면으로
                        // 태어난 칸에 나중에 면 색을 주면 둥근 모서리가 그 면에 다시 입혀지지
                        // 않아 네모가 됐다(2026-10-06 · 실기기). 처음부터 떠 있는 칸은 멀쩡했다
                        <View
                          key={`${p}-${on ? "on" : "off"}`}
                          accessibilityState={{ selected: on }}
                          style={[styles.beat, on ? styles.beatOn : styles.beatOff]}
                        >
                          <Text
                            variant="title2"
                            color={on ? labelColor.strong : labelColor.alternative}
                          >
                            {/* 지금 박자는 남은 초를, 다른 박자는 제 길이를 — 셈은 여기 하나다 */}
                            {`${on ? running.secondsLeft : BODY_RELEASE_SECONDS[p]}초`}
                          </Text>
                          <Text
                            variant={on ? "headline1" : "body1"}
                            color={on ? labelColor.strong : labelColor.alternative}
                          >
                            {BODY_RELEASE_PHASE_LABEL[p]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text variant="body1" color={labelColor.normal} style={styles.mid}>
                    {BODY_RELEASE_INTRO.preview}
                  </Text>
                )}
              </SceneCard>
              {running == null ? (
                <ScenePillButton label={BODY_RELEASE_INTRO.cta} onPress={start} />
              ) : null}
            </>
          )}
        </View>
      </View>
      {asking ? (
        <MoodExit
          leaveLabel={BODY_RELEASE_DONE.cta}
          onPick={record.pick}
          onLeave={() => router.replace("/(tabs)/rest")}
        />
      ) : null}
      {guide.open ? <GuideNote content="body_release" onClose={guide.close} /> : null}
    </Screen>
  );
}

/** 계측의 나간 자리 — 부위 순서(`BODY_RELEASE_PARTS`)대로 */
const PART_STAGES: readonly RestStageName[] = ["hands", "shoulders", "face", "legs"];

/** 부위 순서(`BODY_RELEASE_PARTS`)대로 — 손과 팔 · 어깨와 목 · 얼굴 · 다리와 발 */
const TENSE_POSES: readonly BodyReleasePose[] = ["hands", "shoulders", "face", "legs"];

const styles = StyleSheet.create({
  scene: { flex: 1, minHeight: 0 },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    alignItems: "center",
    paddingHorizontal: space.xl,
  },
  words: { alignSelf: "center", maxWidth: 320, alignItems: "center" },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  mid: { textAlign: "center" },
  // 두 칸을 담는 홈 — 카드보다 한 단 짙은 면
  beats: {
    flexDirection: "row",
    gap: space.xs,
    padding: space.xs,
    borderRadius: radius.large,
    backgroundColor: fill.normal,
  },
  beat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: bodyReleaseSize.beatCard,
    paddingVertical: space.md,
    borderRadius: radius.medium,
  },
  // 지금 박자 — 불투명 크림 면이 홈 위로 살짝 떠 있다
  beatOn: {
    backgroundColor: restScene.surface,
    ...elevation.floating,
  },
  // 다른 박자 — 면도 테두리도 없이 홈에 가라앉는다
  beatOff: { backgroundColor: "transparent" },
  part: { alignItems: "center", gap: space.xs2 },
});
