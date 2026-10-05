import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Screen, Text, TextField } from "@/components/ds";
import { StepHeading } from "@/components/rest/pond/StepHeading";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCard,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import { TreasureBoxScene } from "@/components/rest/treasure/TreasureBoxScene";
import { TreasureRow } from "@/components/rest/treasure/TreasureRow";
import { track } from "@/features/analytics";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { addTreasure, fetchTreasures, type Treasure } from "@/features/rest/data/treasureApi";
import {
  TREASURE_BOX_DONE,
  TREASURE_BOX_INPUT,
  TREASURE_BOX_INTRO,
  TREASURE_BOX_TUCKING,
  TREASURE_DONE_CTA,
  TREASURE_MAX_LENGTH,
  TREASURE_SAVE_FAILED,
  TREASURE_TODAY_TITLE,
  canTuck,
  markAt,
  type TreasureBoxStage,
} from "@/features/rest/model/treasureBox";
import {
  label as labelColor,
  restScene,
  space,
  treasureBoxFinish,
  treasureBoxSize,
} from "@/design/ds";

/**
 * 오늘의 보물함 — 오늘의 소중한 순간 한 줄을 보물 카드로 만들어 카피바라가 보물함에 넣는다
 * (2026-10-05).
 *
 * 쉼터 `R1` 의 「오늘의 보물함」 카드가 여는 화면. 걱정상자처럼 **장면 하나가 화면을 채우고**
 * 그 위에 위 안내 · 아래 판이 뜬다(`TreasureBoxScene`). 단계: 쓰기 → 담기(연출) → 끝.
 *
 * ## 쓴 글은 서버에 남는다 — 쉼 콘텐츠의 예외
 *
 * 「보물함에 담기」를 누르는 순간 저장을 보내고 연출은 그대로 흐른다. 끝에서 저장이 됐으면
 * 아래 「오늘의 보물」에 방금 카드가 떠오르고, 실패했으면 한 줄로 알린다(재시도 버튼을 두지
 * 않는다 · `RULES.md` 4). 쌓인 보물은 오른쪽 위 원에서 「지난 보물」로 다시 본다.
 */
type Saved = { status: "pending" } | { status: "ok"; treasure: Treasure } | { status: "failed" };

/** 「오늘의 보물」에 보이는 최근 줄 수 — 판이 카피바라를 덮지 않게. 나머지는 「지난 보물」 */
const TODAY_ROWS = 3;

export default function TreasureBoxScreen() {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<TreasureBoxStage>("write");
  const [text, setText] = useState("");
  const [today, setToday] = useState<Treasure[]>([]);
  const [saved, setSaved] = useState<Saved>({ status: "pending" });
  // 끝맺음 판의 돌아가는 길은 새 줄이 떠오른 **뒤**에 붙는다
  const [ctaReady, setCtaReady] = useState(false);

  const { date: todayDate } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, todayDate));
  const rest = useRestContentAnalytics(
    "treasure_box",
    stage === "write" || stage === "tucking" ? stage : null,
    diaryToday,
  );

  // 오늘 이미 담은 보물 — 못 받아 와도 화면은 그대로다(빈 목록)
  useEffect(() => {
    let alive = true;
    void fetchTreasures(todayDate).then((r) => {
      if (alive && r.ok) setToday(r.data);
    });
    return () => {
      alive = false;
    };
  }, [todayDate]);

  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(() => setCtaReady(true), treasureBoxFinish.cta);
    return () => clearTimeout(t);
  }, [stage]);

  const tuck = () => {
    if (!canTuck(text)) return;
    Keyboard.dismiss();
    const content = text.trim();
    // 쓴 글은 보내지 않는다 — 길이만(`docs/ANALYTICS.md`)
    track("treasure_box_tucked", { chars: content.length });
    setStage("tucking");
    void addTreasure(content).then((r) =>
      setSaved(r.ok ? { status: "ok", treasure: r.data } : { status: "failed" }),
    );
  };

  const heading =
    stage === "done"
      ? { tone: "close" as const, ...TREASURE_BOX_DONE }
      : stage === "tucking"
        ? { tone: "step" as const, ...TREASURE_BOX_TUCKING }
        : { tone: "lead" as const, ...TREASURE_BOX_INTRO };

  const fresh = saved.status === "ok" ? saved.treasure : null;
  // 방금 것은 그날 몇 번째인가로 표식이 정해진다 — 장면의 카드와 목록이 같은 표식이다
  const all = fresh == null ? today : [...today, fresh];
  const shown = all.slice(-TODAY_ROWS);
  const offset = all.length - shown.length;

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <View style={styles.scene}>
        <TreasureBoxScene
          stage={stage}
          text={text.trim()}
          mark={markAt(today.length)}
          onTucked={() => {
            rest.complete();
            setStage("done");
          }}
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.overlay,
            { paddingTop: insets.top + space.sm + SCENE_BACK_SIZE + space.xs },
          ]}
        >
          <SceneBackButton top={insets.top + space.sm} onPress={() => router.back()} />
          {stage !== "tucking" ? (
            <VintagePressable
              accessibilityLabel="지난 보물 모두 보기"
              onPress={() => router.push("/rest/treasures")}
              radius={treasureBoxSize.corner / 2}
              style={[styles.corner, { top: insets.top + space.sm }]}
              faceStyle={styles.cornerFace}
            >
              <Icon name="list" size={20} color={restScene.ink} />
            </VintagePressable>
          ) : null}
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

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.panelWrap}
          pointerEvents="box-none"
        >
          <View style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]}>
            {stage === "write" ? (
              <>
                <SceneCard>
                  <TextField
                    fieldLabel={TREASURE_BOX_INPUT.label}
                    placeholder={TREASURE_BOX_INPUT.placeholder}
                    value={text}
                    onChangeText={setText}
                    maxLength={TREASURE_MAX_LENGTH}
                    showCounter
                    multiline
                    returnKeyType="done"
                    submitBehavior="blurAndSubmit"
                    onSubmitEditing={tuck}
                  />
                </SceneCard>
                <ScenePillButton
                  tone="accent"
                  label={TREASURE_BOX_INPUT.cta}
                  disabled={!canTuck(text)}
                  onPress={tuck}
                />
              </>
            ) : stage === "done" ? (
              <>
                <SceneCard>
                  <Text variant="headline1" color={restScene.ink}>
                    {TREASURE_TODAY_TITLE}
                  </Text>
                  {shown.map((t, i) =>
                    t === fresh ? (
                      <Rising key={t.id}>
                        <TreasureRow treasure={t} mark={markAt(offset + i)} />
                      </Rising>
                    ) : (
                      <TreasureRow key={t.id} treasure={t} mark={markAt(offset + i)} />
                    ),
                  )}
                  {saved.status === "failed" ? (
                    <Text variant="body2" color={labelColor.neutral}>
                      {TREASURE_SAVE_FAILED}
                    </Text>
                  ) : null}
                </SceneCard>
                {ctaReady ? (
                  <ScenePillButton
                    label={TREASURE_DONE_CTA}
                    onPress={() => router.replace("/(tabs)/rest")}
                  />
                ) : null}
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

/** 방금 담은 줄 — 아래에서 천천히 떠오르며 짙어진다(한 번) */
function Rising({ children }: { children: React.ReactNode }) {
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const it = Animated.timing(rise, {
      toValue: 1,
      duration: treasureBoxFinish.rowRise,
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [rise]);
  return (
    <Animated.View
      testID="treasure-fresh-row"
      style={{
        opacity: rise,
        transform: [
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [space.md, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

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
  // 오른쪽 위 「지난 보물」 원 — 왼쪽 위 뒤로가기 원과 마주 선다
  corner: { position: "absolute", right: space.lg, width: treasureBoxSize.corner },
  cornerFace: {
    height: treasureBoxSize.corner,
    alignItems: "center",
    justifyContent: "center",
  },
  words: { alignSelf: "center", maxWidth: 320, alignItems: "center" },
  panelWrap: { position: "absolute", left: 0, right: 0, bottom: 0 },
  panel: { paddingHorizontal: space.xl, gap: space.md },
});
