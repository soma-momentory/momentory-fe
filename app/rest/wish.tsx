import { Image } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Keyboard, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Screen, Text } from "@/components/ds";
import { artPoint, artScale } from "@/components/rest/pond/layout";
import { PondBaba } from "@/components/rest/pond/PondBaba";
import { useReducedMotion } from "@/components/rest/pond/useReducedMotion";
import { GuideCard } from "@/components/rest/scene/GuideCard";
import { MoodExit } from "@/components/rest/scene/MoodExit";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCornerButton,
  SceneGuideButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import { WishCard } from "@/components/rest/wish/WishCard";
import { WishCare } from "@/components/rest/wish/WishCare";
import { WishConfirmSheet } from "@/components/rest/wish/WishConfirmSheet";
import { WishFlower } from "@/components/rest/wish/WishFlower";
import { WishNote } from "@/components/rest/wish/WishNote";
import { WishRules } from "@/components/rest/wish/WishRules";
import { WishWrite } from "@/components/rest/wish/WishWrite";
import { pondScene, radius, restScene, space, wishScene, wishSceneMotion } from "@/design/ds";
import { track } from "@/features/analytics";
import { useRestContentAnalytics } from "@/features/analytics/useRestContentAnalytics";
import { hasDiaryOn } from "@/features/diary/model/selectors";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import {
  type PondWish,
  type WishPond,
  agreeWishRules,
  fetchPond,
  joinWish,
  postWish,
  reportWish,
  reviewWish,
  undoReportWish,
} from "@/features/rest/data/wishApi";
import { useRestGuide } from "@/features/rest/model/useRestGuide";
import { useRestRecord } from "@/features/rest/model/useRestRecord";
import {
  WISH_JOIN_ON_NOTE,
  WISH_LOAD_FAILED,
  WISH_PILL,
  WISH_POSTED,
  WISH_POST_FAILED,
  WISH_REPORT,
  wishIntent,
  wishSign,
} from "@/features/rest/model/wish";

const POND = require("../../assets/wish/pond-night.webp");

type Stage = "pond" | "card" | "rules" | "write" | "care";
type Reviewed = { content: string; reviewToken: string; edited: boolean };

/**
 * 소원 빌기 (2026-11-04) — 밤 연못에 남의 소원이 떠 있고, 같이 빌거나 내 소원을 하루에 하나 띄운다.
 *
 * 한 화면 안에서 넘어간다: 연못 → 소원 10장 → 연못 / 연못 → 이용 규칙(처음 한 번) → 쓰기 → AI 심사
 * → 띄우기 전 확인 → 연못에 내 꽃. 귤이 없고 숫자도 없다. 쓴 글은 계측에 넣지 않는다.
 */
export default function WishScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [view, setView] = useState<Stage>("pond");
  const [pond, setPond] = useState<WishPond | null>(null);
  const [failed, setFailed] = useState(false);
  const [batch, setBatch] = useState<PondWish[]>([]);
  const [position, setPosition] = useState(0);
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [posting, setPosting] = useState(false);
  const [justPosted, setJustPosted] = useState(false);
  const [touched, setTouched] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reportedId, setReportedId] = useState<number | null>(null);
  const [hop, setHop] = useState(0);
  const [noteAt, setNoteAt] = useState<number | null>(null);
  const [memoOpacity] = useState(() => new Animated.Value(1));
  const joinedInBatch = useRef(0);
  const batchFinished = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const { date: today } = useTodayContext();
  const diaryToday = useDiary((s) => hasDiaryOn(s.diaries, today));
  const rest = useRestContentAnalytics(
    "wish",
    view === "pond"
      ? "pond"
      : view === "card"
        ? "wish_card"
        : view === "rules"
          ? "rules"
          : reviewed != null
            ? "confirm"
            : "write",
    diaryToday,
  );
  const record = useRestRecord("wish", touched);
  const guide = useRestGuide("wish");

  const load = useCallback(() => {
    void fetchPond().then((r) => {
      if (r.ok) {
        setPond(r.data);
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
  }, []);

  // 돌아올 때마다 새로 받는다 — 내 소원에서 지웠을 수 있고, 들어갈 때마다 다른 소원이 나온다
  useFocusEffect(
    useCallback(() => {
      if (viewRef.current === "pond") load();
    }, [load]),
  );

  const wishes = pond?.wishes ?? [];
  // 쪽지에 뜬 소원의 자리 — 연꽃을 누르면 그 꽃의 소원으로 바뀐다. 앞 다섯 자리가 큰 꽃 다섯 송이다
  const firstLight = wishes.findIndex((w) => w.light);
  const noteIndex = noteAt != null && noteAt < wishes.length ? noteAt : firstLight;
  const noted = noteIndex >= 0 ? wishes[noteIndex]! : null;

  const showNote = useCallback(
    (index: number) => {
      Animated.timing(memoOpacity, {
        toValue: 0,
        duration: wishSceneMotion.memoFade / 2,
        useNativeDriver: true,
      }).start(() => {
        setNoteAt(index);
        Animated.timing(memoOpacity, {
          toValue: 1,
          duration: wishSceneMotion.memoFade / 2,
          useNativeDriver: true,
        }).start();
      });
    },
    [memoOpacity],
  );

  const pickFlower = (index: number) => {
    setJustPosted(false);
    showNote(index);
  };

  // 가만히 두면 가벼운 소원만 차례로 돈다. 꽃을 누르면 그 자리부터 다시 잰다
  const nextLight = wishes.findIndex((w, i) => i > noteIndex && w.light);
  const following = nextLight >= 0 ? nextLight : firstLight;
  useEffect(() => {
    if (reduced || view !== "pond" || following < 0 || following === noteIndex) return;
    const id = setTimeout(() => showNote(following), wishSceneMotion.memoTurn);
    return () => clearTimeout(id);
  }, [reduced, view, following, noteIndex, showNote]);

  useEffect(
    () => () => {
      if (toastTimer.current != null) clearTimeout(toastTimer.current);
    },
    [],
  );

  const enter = (first?: PondWish) => {
    if (pond == null || pond.wishes.length === 0) return;
    const others = pond.wishes.filter((w) => w.id !== first?.id);
    setBatch(first != null ? [first, ...others] : pond.wishes);
    setPosition(0);
    joinedInBatch.current = 0;
    batchFinished.current = false;
    setJustPosted(false);
    setView("card");
  };

  const backToPond = () => {
    setView("pond");
    load();
  };

  const turnPage = (delta: 1 | -1) => {
    const next = position + delta;
    if (next < 0 || next >= batch.length) return;
    setPosition(next);
    if (next === batch.length - 1 && !batchFinished.current) {
      batchFinished.current = true;
      track("wish_batch_finished", { joined: joinedInBatch.current });
    }
  };

  const join = () => {
    const wish = batch[position];
    if (wish == null || wish.joined) return;
    joinedInBatch.current += 1;
    setBatch((list) => list.map((w) => (w.id === wish.id ? { ...w, joined: true } : w)));
    setTouched(true);
    rest.complete();
    track("wish_joined", { position, author: wish.author });
    // 바바의 소원은 서버에 없다. 실패해도 화면은 그대로 흐른다(`RULES.md` 4)
    if (wish.author === "user") void joinWish(wish.id);
  };

  const report = () => {
    const wish = batch[position];
    if (wish == null || wish.author !== "user") return;
    track("wish_reported", {});
    void reportWish(wish.id);
    setReportedId(wish.id);
    if (toastTimer.current != null) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setReportedId(null), wishSceneMotion.toast);
    const left = batch.filter((w) => w.id !== wish.id);
    setBatch(left);
    if (position >= left.length) {
      if (left.length === 0 || position === 0) backToPond();
      else setPosition(left.length - 1);
    }
  };

  const undoReport = () => {
    if (reportedId == null) return;
    track("wish_report_undone", {});
    void undoReportWish(reportedId);
    setReportedId(null);
  };

  const startWriting = (agreed: boolean | undefined) => {
    setJustPosted(false);
    setView(agreed ? "write" : "rules");
  };

  // 내 소원 화면의 「내 소원 빌기」로 돌아왔다
  useFocusEffect(
    useCallback(() => {
      if (!wishIntent.write) return;
      wishIntent.write = false;
      void fetchPond().then((r) => {
        if (r.ok) setView(r.data.rulesAgreed ? "write" : "rules");
      });
    }, []),
  );

  const agree = () => {
    track("wish_rules_agreed", {});
    void agreeWishRules();
    setPond((p) => (p == null ? p : { ...p, rulesAgreed: true }));
    setView("write");
  };

  const changeText = (next: string) => {
    setText(next);
    setWarning(null);
  };

  const submit = () => {
    const content = text.trim();
    Keyboard.dismiss();
    setReviewing(true);
    setWarning(null);
    track("wish_submitted", { chars: content.length });
    void reviewWish(content).then((r) => {
      setReviewing(false);
      if (!r.ok) {
        track("wish_review_result", { result: "failed" });
        if (r.code === "rules_required") setView("rules");
        else if (r.code === "daily_limit") backToPond();
        else setWarning(WISH_POST_FAILED);
        return;
      }
      track("wish_review_result", { result: r.data.result });
      if (r.data.result === "crisis") {
        setText("");
        setView("care");
      } else if (r.data.result === "rejected") {
        setWarning(r.data.message);
      } else {
        setReviewed({
          content: r.data.content,
          reviewToken: r.data.reviewToken,
          edited: r.data.result === "edited",
        });
      }
    });
  };

  const post = () => {
    if (reviewed == null) return;
    setPosting(true);
    void postWish(reviewed.content, reviewed.reviewToken).then((r) => {
      setPosting(false);
      if (r.ok) {
        track("wish_posted", { chars: reviewed.content.length });
        rest.complete();
        setReviewed(null);
        setText("");
        setTouched(true);
        setJustPosted(true);
        setHop((n) => n + 1);
        backToPond();
      } else {
        setReviewed(null);
        if (r.code === "daily_limit") backToPond();
        else setWarning(WISH_POST_FAILED);
      }
    });
  };

  const leave = () => {
    if (touched) setAsking(true);
    else router.back();
  };

  const k = artScale(width, height);
  const top = insets.top + space.sm;
  const babaSpot = {
    ...artPoint(wishScene.baba.x, wishScene.baba.y, width, height),
    width: wishScene.baba.width * k,
  };
  const hasMine = pond?.hasFloatingWish === true || justPosted;
  const mine = artPoint(wishScene.mine.x, wishScene.mine.y, width, height);
  const flowerCount = Math.min(wishes.length, wishScene.spots.length);

  return (
    <Screen grid={false} padded={false} edges={[]}>
      <View style={styles.scene}>
        <Image source={POND} contentFit="cover" transition={0} style={StyleSheet.absoluteFill} />

        {view === "pond" || view === "rules" ? (
          <>
            {tinyFlowers(pond?.floatingCount ?? 0).map((t, i) => {
              const at = artPoint(t.x, t.y, width, height);
              return (
                <WishFlower
                  key={i}
                  x={at.x}
                  y={at.y}
                  width={t.width * k}
                  still
                  onPress={() => pickFlower((flowerCount + i) % wishes.length)}
                  label="소원 보기"
                />
              );
            })}
            {wishScene.spots.slice(0, flowerCount).map((s, i) => {
              const at = artPoint(s.x, s.y, width, height);
              return (
                <WishFlower
                  key={i}
                  x={at.x}
                  y={at.y}
                  width={s.width * k}
                  glow={i === noteIndex ? "bright" : "soft"}
                  onPress={() => pickFlower(i)}
                  label="소원 보기"
                />
              );
            })}
            {hasMine ? (
              <>
                <WishFlower
                  x={mine.x}
                  y={mine.y}
                  width={wishScene.mine.width * k}
                  glow="bright"
                  onPress={() => router.push("/rest/wish-mine")}
                  label="내 소원 보기"
                />
                <View style={[styles.mineLabel, { left: mine.x - 40, top: mine.y + 38 * k }]}>
                  <Text variant="caption1" color={restScene.ink}>
                    내 소원
                  </Text>
                </View>
              </>
            ) : null}
            <PondBaba
              spot={babaSpot}
              box={wishScene.baba.width * k}
              mood={justPosted ? "done" : "idle"}
              smile={justPosted}
              calm={false}
              hop={hop}
            />

            {noted != null && !justPosted ? (
              <Animated.View
                style={[
                  styles.noteWrap,
                  { top: top + SCENE_BACK_SIZE + space.xl, opacity: memoOpacity },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${noted.content} 소원 보기`}
                  onPress={() => enter(noted)}
                >
                  <WishNote style={styles.lineNote}>
                    <Text
                      variant="title1Hand"
                      color={restScene.ink}
                      numberOfLines={2}
                      style={styles.lineText}
                    >
                      {noted.content}
                    </Text>
                    <Text variant="label1Hand" color={restScene.mutedInk} style={styles.center}>
                      {wishSign(noted.author)}
                    </Text>
                    <VintagePressable
                      accessibilityLabel={WISH_JOIN_ON_NOTE}
                      onPress={() => enter(noted)}
                      face={restScene.accent}
                      radius={radius.full}
                      style={styles.joinChip}
                      faceStyle={styles.joinFace}
                    >
                      <Text variant="label1Hand" color={restScene.ink}>
                        {WISH_JOIN_ON_NOTE}
                      </Text>
                    </VintagePressable>
                  </WishNote>
                </Pressable>
              </Animated.View>
            ) : null}

            {justPosted ? (
              <View
                style={[styles.bubble, { top: artPoint(0, wishScene.spots[0].y, width, height).y }]}
              >
                <Text variant="title3Hand" color={restScene.ink} style={styles.center}>
                  {WISH_POSTED}
                </Text>
              </View>
            ) : null}

            {failed && pond == null ? (
              <Text variant="headline1" color={restScene.surface} style={styles.failed}>
                {WISH_LOAD_FAILED}
              </Text>
            ) : null}

            <SceneBackButton top={top} onPress={leave} />
            <SceneGuideButton top={top} onPress={guide.show} />
            <SceneCornerButton
              top={top}
              icon="list"
              label="내 소원"
              onPress={() => router.push("/rest/wish-mine")}
            />

            {pond != null ? (
              <View
                style={[
                  styles.pill,
                  { bottom: Math.max(insets.bottom, space.md) + pondScene.pillBottom },
                ]}
              >
                <ScenePillButton
                  label={pond.postedToday || justPosted ? WISH_PILL.postedToday : WISH_PILL.write}
                  disabled={pond.postedToday || justPosted}
                  onPress={() => startWriting(pond.rulesAgreed)}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {view === "card" && batch[position] != null ? (
          <WishCard
            wish={batch[position]}
            position={position}
            total={batch.length}
            onTurn={turnPage}
            onBack={backToPond}
            onJoin={join}
            onJoinCancelled={() => track("wish_join_cancelled", {})}
            onReport={report}
          />
        ) : null}

        {view === "write" ? (
          <WishWrite
            text={text}
            onChange={changeText}
            warning={warning}
            reviewing={reviewing}
            onBack={backToPond}
            onSubmit={submit}
          />
        ) : null}

        {view === "rules" ? <WishRules onAgree={agree} onLater={() => setView("pond")} /> : null}

        {view === "care" ? <WishCare onLeave={() => router.replace("/(tabs)/rest")} /> : null}

        {reportedId != null ? (
          <View style={[styles.toast, { bottom: insets.bottom + 150 }]}>
            <Text variant="label1" color={wishScene.toast.ink}>
              {WISH_REPORT.done}
            </Text>
            <Pressable accessibilityRole="button" onPress={undoReport} hitSlop={11}>
              <Text variant="label1" color={wishScene.toast.ink} style={styles.undo}>
                {WISH_REPORT.undo}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {reviewed != null ? (
        <WishConfirmSheet
          content={reviewed.content}
          edited={reviewed.edited}
          posting={posting}
          onPost={post}
          onEdit={() => setReviewed(null)}
        />
      ) : null}
      {asking ? (
        <MoodExit
          leaveLabel={WISH_PILL.leave}
          onPick={record.pick}
          onLeave={() => router.replace("/(tabs)/rest")}
        />
      ) : null}
      {guide.open ? <GuideCard content="wish" first={guide.first} onClose={guide.close} /> : null}
    </Screen>
  );
}

/** 소원이 많을수록 뒤쪽 물 위에 작은 꽃이 늘어난다 — 숫자 없이 규모만 보인다 */
function tinyFlowers(count: number) {
  const T = wishScene.tiny;
  const n = Math.min(T.max, Math.max(0, count - wishScene.spots.length));
  const list: { x: number; y: number; width: number }[] = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const t = rnd();
    const y = T.top + t * t * T.depth;
    const x = T.left + rnd() * T.span;
    // 바바가 앉은 돌과 왼쪽 풀섬은 비운다
    if ((y > 520 && x > 250) || (y > 540 && x < 175)) continue;
    list.push({ x, y, width: T.minWidth + t * T.grow });
  }
  return list;
}

const styles = StyleSheet.create({
  scene: { flex: 1, overflow: "hidden", backgroundColor: restScene.veil },
  noteWrap: { position: "absolute", left: 0, right: 0 },
  lineNote: {
    position: "relative",
    marginHorizontal: wishScene.memo.side,
    left: 0,
    right: 0,
    minHeight: wishScene.memo.line.minHeight,
    paddingTop: space.xl,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    alignItems: "center",
    gap: space.xs,
  },
  lineText: {
    textAlign: "center",
    fontSize: wishScene.memo.line.fontSize,
    lineHeight: wishScene.memo.line.lineHeight,
  },
  center: { textAlign: "center" },
  joinChip: { marginTop: space.xs },
  joinFace: { paddingHorizontal: space.xl, paddingVertical: space.xs },
  mineLabel: {
    position: "absolute",
    width: 80,
    alignItems: "center",
    paddingVertical: 2,
    borderRadius: radius.medium,
    backgroundColor: restScene.surface,
  },
  bubble: {
    position: "absolute",
    right: space.lg,
    width: 262,
    padding: space.md,
    borderRadius: wishScene.bubble.radius,
    backgroundColor: wishScene.bubble.color,
  },
  failed: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    top: "38%",
    textAlign: "center",
  },
  pill: { position: "absolute", left: space.xl, right: space.xl },
  toast: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.medium,
    backgroundColor: wishScene.toast.face,
  },
  undo: { textDecorationLine: "underline" },
});
