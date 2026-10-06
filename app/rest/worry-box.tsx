import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Keyboard, KeyboardAvoidingView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName, Screen, Text, TextField } from "@/components/ds";
import { StepHeading } from "@/components/rest/pond/StepHeading";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCard,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { RisingMotes } from "@/components/rest/scene/RisingMotes";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import { WorryBoxScene } from "@/components/rest/worry/WorryBoxScene";
import { track } from "@/features/analytics";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import {
  label as labelColor,
  layout,
  radius,
  restScene,
  restSceneSize,
  space,
  worryBox,
  worryBoxFinish,
  worryBoxSize,
} from "@/design/ds";
import {
  WORRY_BOX_BOXED,
  WORRY_BOX_CHOICES,
  WORRY_BOX_DONE_CTA,
  WORRY_BOX_ENDINGS,
  WORRY_BOX_INPUT,
  WORRY_BOX_INTRO,
  WORRY_BOX_RELEASED,
  WORRY_BOX_RELEASE_DONE,
  WORRY_BOX_RELEASED_SIGN,
  WORRY_BOX_GUIDE,
  WORRY_MAX_LENGTH,
  type WorryBoxStage,
  canHandOver,
} from "@/features/rest/model/worryBox";

/**
 * 걱정상자 — 걱정 한 줄을 적어 카피바라에게 건네고, 상자에 넣고, 맡겨두거나 흘려보낸다
 * (2026-10-05).
 *
 * 쉼터 `R1` 의 「걱정상자」 카드가 여는 화면. 몸에 힘 빼기처럼 **장면 하나가 화면을
 * 채우고** 그 위에 위 안내 · 아래 판이 뜬다(`WorryBoxScene`). 단계는 한 화면 안에서
 * 넘어간다: 쓰기 → 건네기(연출) → 상자에 들어감(둘 중 하나 고르기) → 맡겨두기 | 흘려보내기.
 *
 * 쓴 걱정은 이 화면의 상태에만 있다 — 저장하지 않고 어디로도 보내지 않는다
 * (`features/rest/model/worryBox.ts`).
 */
export default function WorryBoxScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<WorryBoxStage>("write");
  const [worry, setWorry] = useState("");
  // 고른 끝의 연출이 다 끝났다 — 돌아가는 길이 붙는다
  const [ended, setEnded] = useState(false);
  // 「흘려보낼게요」 — 카피바라의 쪽지가 다 내려앉았다. 돌아가는 길은 그 **뒤**다
  // (버튼이 쪽지보다 먼저 뜨니 어색했다 · 2026-10-05 · 피드백)
  const [noteLanded, setNoteLanded] = useState(false);

  // 쉼 콘텐츠 공통 계측 — 나간 자리는 쓰기 · 건네는 중 · 고르기 전. 고르면 끝까지 간 것이다
  const { date: today } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, today));
  const rest = useRestContentAnalytics(
    "worry_box",
    stage === "write" || stage === "handing" || stage === "boxed" ? stage : null,
    diaryToday,
  );

  const handOver = () => {
    if (!canHandOver(worry)) return;
    Keyboard.dismiss();
    // 쓴 걱정은 보내지 않는다 — 길이만(`docs/ANALYTICS.md`)
    track("worry_box_handed", { chars: worry.trim().length });
    setStage("handing");
  };

  const choose = (choice: "keep" | "release") => {
    track("worry_box_choice_selected", { choice });
    rest.complete();
    setStage(choice);
  };

  // 판 아래 숨 — 쓰기는 판을 낮춰 장면을 가리지 않게 한 단 줄인다
  const bottomPad = insets.bottom + (stage === "write" ? space.md : space.lg);

  const heading =
    stage === "release" && ended
      ? // 걷는 동안 「걱정이 멀어지고 있어요」 → 사라진 뒤 「이제 걱정에서 잠시 멀어졌어요」
        { tone: "close" as const, ...WORRY_BOX_RELEASE_DONE }
      : stage === "keep" || stage === "release"
        ? { tone: "close" as const, ...WORRY_BOX_ENDINGS[stage] }
        : stage === "boxed"
          ? { tone: "step" as const, ...WORRY_BOX_BOXED }
          : // 소개 한 줄이 숲 그림 위에서 묻혀 한 단 크게(`lead` · 2026-10-05 · 사용자 피드백)
            { tone: "lead" as const, ...WORRY_BOX_INTRO };

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <View style={styles.scene}>
        <WorryBoxScene
          stage={stage}
          worry={worry.trim()}
          onBoxed={() => setStage("boxed")}
          onEnded={() => setEnded(true)}
        />

        {/* 「흘려보낼게요」 — 카피바라가 사라진 빈자리에 건네는 한마디 */}
        {stage === "release" && ended ? (
          <ReleasedMessage onLanded={() => setNoteLanded(true)} />
        ) : null}

        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            { paddingTop: insets.top + space.sm + SCENE_BACK_SIZE + space.xs },
          ]}
        >
          <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
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

        {/* 키보드가 올라오면 아래 판이 그 위로 비켜 선다 — 쓰는 줄이 가려지지 않게.
            **안드로이드도 피한다** — edge-to-edge 에서는 창이 `adjustResize` 로 줄지 않고
            키보드가 판을 덮었다(2026-10-06 · 실기기). 여백은 `ScheduleEditBar` 와 같은
            셈이다: 열린 동안의 바닥 숨은 안쪽 여백(`bottomPad`)이 아니라 `keyboardGap` */}
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={layout.keyboardGap - bottomPad}
          style={styles.panelWrap}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.panel,
              stage === "write" ? styles.writePanel : null,
              { paddingBottom: bottomPad },
            ]}
          >
            {stage === "write" ? (
              <>
                {/* 판이 카피바라 발밑을 가렸다 — 여백 · 입력칸 · 버튼을 한 단씩 낮춘다
                    (2026-10-06 · 실기기 피드백) */}
                <SceneCard style={styles.writeCard}>
                  {/* 무엇이 일어날지 — 절차가 아니라 건네는 말로(매번) */}
                  {/* 판에서 가장 먼저 읽혀야 할 말이라 한 단 크게(2026-10-06 · 사용자 요청) */}
                  <Text variant="headline1" color={labelColor.normal} style={styles.mid}>
                    {WORRY_BOX_GUIDE}
                  </Text>
                  {/* 100자까지라 여러 줄로 쓴다 — 줄바꿈 대신 「완료」가 맡기기다 */}
                  {/* 칸 위 라벨은 두지 않는다 — 안내 두 줄이 이미 묻고, 판이 장면을 덜 가리게
                      (2026-10-06 · 사용자 요청). 낭독기에는 그 말을 이름으로 준다 */}
                  <TextField
                    accessibilityLabel={WORRY_BOX_INPUT.label}
                    placeholder={WORRY_BOX_INPUT.placeholder}
                    value={worry}
                    onChangeText={setWorry}
                    maxLength={WORRY_MAX_LENGTH}
                    variant="medium"
                    accentColor={worryBox.inputAccent}
                    showCounter
                    multiline
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={handOver}
                  />
                </SceneCard>
                <ScenePillButton
                  tone="accent"
                  compact
                  label={WORRY_BOX_INPUT.cta}
                  disabled={!canHandOver(worry)}
                  onPress={handOver}
                />
              </>
            ) : stage === "boxed" ? (
              // 두 칸은 빈티지 카드 버튼이다 — 아이콘과 그 둘레의 빛깔로 갈린다(맡겨두기는
              // 상자 · 나무빛, 흘려보내기는 물결 · 저녁 하늘빛). 제목이 먼저 크게 읽힌다
              // (2026-10-05 · 피드백)
              WORRY_BOX_CHOICES.map((c) => (
                <VintagePressable
                  key={c.id}
                  accessibilityLabel={`${c.title} — ${c.description}`}
                  onPress={() => choose(c.id)}
                  radius={radius.xlarge}
                  faceStyle={styles.choice}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: CHOICE_LOOK[c.id].tint }]}>
                    <Icon name={CHOICE_LOOK[c.id].icon} size={24} color={restScene.ink} />
                  </View>
                  <View style={styles.choiceWords}>
                    <Text variant="heading1" color={restScene.ink}>
                      {c.title}
                    </Text>
                    <Text variant="body1" color={labelColor.normal}>
                      {c.description}
                    </Text>
                  </View>
                </VintagePressable>
              ))
            ) : ended && (stage !== "release" || noteLanded) ? (
              <ScenePillButton
                label={WORRY_BOX_DONE_CTA}
                onPress={() => router.replace("/(tabs)/rest")}
              />
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

/** 선택지 두 칸의 얼굴 — 아이콘과 그 둘레의 빛깔 */
const CHOICE_LOOK: Record<"keep" | "release", { icon: IconName; tint: string }> = {
  keep: { icon: "box", tint: worryBox.keepTint },
  release: { icon: "wave", tint: worryBox.releaseTint },
};

/**
 * 「흘려보낼게요」 — 카피바라가 길 끝으로 사라진 **뒤** 장면 가운데에 천천히 떠오르는 한마디.
 * 카피바라가 사라지면 화면이 텅 비었다(2026-10-05 · 사용자 피드백).
 */
function ReleasedMessage({ onLanded }: { onLanded: () => void }) {
  const [appear] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const it = Animated.sequence([
      Animated.delay(worryBoxFinish.message.delay),
      Animated.timing(appear, {
        toValue: 1,
        duration: worryBoxFinish.message.duration,
        useNativeDriver: true,
      }),
    ]);
    it.start();
    // 다 내려앉은 때는 시계가 말한다 — 네이티브 드라이버의 완료 콜백은 테스트에 오지 않는다
    const landed = setTimeout(
      onLanded,
      worryBoxFinish.message.delay + worryBoxFinish.message.duration,
    );
    return () => {
      it.stop();
      clearTimeout(landed);
    };
    // onLanded 는 화면이 매 렌더 새로 준다 — 쪽지는 한 번만 내려앉는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appear]);

  return (
    <View pointerEvents="none" style={styles.released}>
      {/*
        카피바라가 남기고 간 **쪽지** — 걱정을 적어 건넨 종이에 대한 답장이다. 둥근 크림
        상자를 허공에 띄우니 장면과 따로 놀았다(2026-10-05 · 피드백). 걱정을 적던 종이색에
        빈티지 버튼과 같은 잉크 선 · 단단한 그림자를 두르고, 살짝 비스듬히 내려앉는다.
      */}
      <Animated.View
        style={{
          opacity: appear,
          transform: [
            { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-space.xl, 0] }) },
            {
              rotate: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [`${NOTE_TILT * 3}deg`, `${NOTE_TILT}deg`],
              }),
            },
          ],
        }}
      >
        <View style={styles.noteShadow} />
        <View style={styles.note}>
          <Text variant="title3Hand" color={restScene.ink} style={styles.noteText}>
            {WORRY_BOX_RELEASED}
          </Text>
          <Text variant="label1Hand" color={labelColor.alternative} style={styles.noteSign}>
            {WORRY_BOX_RELEASED_SIGN}
          </Text>
        </View>
      </Animated.View>
      {/* 카드가 뜨면 빛 알갱이가 카드 폭만큼 퍼져 떠오른다 — 끝났다는 표시 */}
      <RisingMotes
        testID="worry-box-card-motes"
        left="50%"
        bottom={0}
        motes={worryBoxFinish.cardMotes}
        duration={worryBoxFinish.mote.duration}
        stagger={worryBoxFinish.mote.stagger}
        color={worryBox.mote}
        delay={worryBoxFinish.message.delay}
      />
    </View>
  );
}

/** 쪽지가 놓이는 기울기(도) — 내려앉으며 세 배에서 이만큼으로 바로 선다 */
const NOTE_TILT = -2;

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
  panelWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  panel: { paddingHorizontal: space.xl, gap: space.md },
  writePanel: { gap: space.sm },
  writeCard: { paddingVertical: space.sm, paddingHorizontal: space.lg, gap: space.xs },
  mid: { textAlign: "center" },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
  },
  choiceIcon: {
    width: worryBoxSize.choiceIcon,
    height: worryBoxSize.choiceIcon,
    borderRadius: worryBoxSize.choiceIcon / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceWords: { flex: 1, gap: space.xs2 },
  // 장면 가운데 — 카피바라와 상자가 있던 빈자리
  released: {
    position: "absolute",
    left: space.xl2,
    right: space.xl2,
    top: "36%",
    alignItems: "center",
  },
  // 장면 폭을 거의 다 쓰는 쪽지 — 작은 상자는 허공에 뜬 것처럼 보였다(2026-10-05 · 피드백)
  note: {
    alignSelf: "stretch",
    paddingVertical: space.xl4,
    paddingHorizontal: space.xl2,
    gap: space.sm,
    borderRadius: radius.large,
    backgroundColor: worryBox.paper,
    borderWidth: restSceneSize.vintage.stroke,
    borderColor: restScene.ink,
  },
  // 쪽지 아래 단단한 그림자 — 빈티지 버튼과 같은 결(번지지 않는다)
  noteShadow: {
    position: "absolute",
    left: 0,
    right: 0,
    top: restSceneSize.vintage.depth,
    bottom: -restSceneSize.vintage.depth,
    borderRadius: radius.large,
    backgroundColor: restScene.shadow,
  },
  noteText: { textAlign: "center" },
  noteSign: { textAlign: "right" },
});
