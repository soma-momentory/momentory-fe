import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { EmotionPebble, Text } from "@/components/ds";
import { RestThemeGrid } from "@/components/rest/RestThemeGrid";
import {
  background,
  elevation,
  label as labelColor,
  line,
  onboardingArt,
  primary,
  secondary,
  space,
  status,
} from "@/design/ds";
import type { EmotionId } from "@/features/emotion/model/emotion";
import type { IntroId } from "@/features/onboarding/model/flow";
import { REST_CONTENTS } from "@/features/rest/model/contents";

import { Baba } from "./OnboardingParts";

/**
 * 소개 장마다 가운데 그림(`proto-v2.html` 의 HTML 그림을 RN 으로 옮겼다).
 * 카피바라 · 조약돌은 앱 자산을 그대로 쓴다. **장식이라 낭독기는 읽지 않는다** —
 * 뜻은 아래 제목 · 설명이 글로 말한다.
 */
export function IntroArt({ id }: { id: IntroId }) {
  return (
    <View
      style={styles.art}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ART[id]()}
    </View>
  );
}

/** 시작 · 「도와줄게요」 장의 원 — 바바를 크게 두고 조약돌이 그 둘레를 돈다 */
const RING = 296;

const P = {
  happy: 1,
  proud: 2,
  calm: 3,
  tired: 4,
  stuck: 5,
  anxious: 7,
  angry: 9,
} as const satisfies Record<string, EmotionId>;

/** 원 둘레에 조약돌을 고르게 놓는다 — 0° 가 위쪽이다 */
function Orbit({
  ids,
  radius,
  size,
  box,
}: {
  ids: EmotionId[];
  radius: number;
  size: number;
  box: number;
}) {
  return (
    <>
      {ids.map((pid, i) => {
        const a = (i / ids.length) * 2 * Math.PI;
        const x = box / 2 + radius * Math.sin(a) - size / 2;
        const y = box / 2 - radius * Math.cos(a) - size / 2;
        return (
          <View key={i} style={{ position: "absolute", left: x, top: y }}>
            <EmotionPebble id={pid} size={size} />
          </View>
        );
      })}
    </>
  );
}

function Mark({ children }: { children: string }) {
  return <Text style={styles.mark}>{children}</Text>;
}

function Say({
  children,
  me,
  large,
}: {
  children: React.ReactNode;
  me?: boolean;
  large?: boolean;
}) {
  return (
    <View style={[styles.say, me ? styles.sayMe : styles.sayBaba]}>
      <Text variant={large ? "body1" : "body2"} color={labelColor.strong}>
        {children}
      </Text>
    </View>
  );
}

function BabaSays({ children, large }: { children: string; large?: boolean }) {
  return (
    <View style={[styles.babaSays, large && styles.babaSaysLarge]}>
      <Baba size={large ? 64 : 44} />
      <Say large={large}>{children}</Say>
    </View>
  );
}

// 한 줄 둘만 — 칸이 「언제 좋은지」까지 적으면서 두 줄이면 아래 제목 · 설명이 화면 밖으로 밀렸다(2026-11-08)
const REST_PREVIEW = REST_CONTENTS.slice(0, 2).map((c) => ({ ...c, route: undefined }));

function RestPreview() {
  return (
    <View style={styles.restWrap}>
      <RestThemeGrid items={REST_PREVIEW} />
    </View>
  );
}

const WEEK: { day: string; pebble?: EmotionId; note?: string }[] = [
  { day: "월", pebble: P.anxious, note: "자소서" },
  { day: "화" },
  { day: "수" },
  { day: "목", pebble: P.calm, note: "산책" },
  { day: "금" },
  { day: "토", pebble: P.happy, note: "친구 저녁" },
  { day: "일" },
];

const WAVE: { left: number; top: number; pebble: EmotionId; time: string }[] = [
  { left: 24, top: 150, pebble: P.anxious, time: "9시" },
  { left: 76, top: 70, pebble: P.calm, time: "11시" },
  { left: 128, top: 150, pebble: P.tired, time: "13시" },
  { left: 180, top: 60, pebble: P.angry, time: "15시" },
  { left: 232, top: 120, pebble: P.proud, time: "18시" },
];

const ART: Record<IntroId, () => React.ReactNode> = {
  start: () => (
    <View style={styles.ring}>
      <Orbit
        ids={[P.anxious, P.calm, P.tired, P.proud, P.angry, P.happy]}
        radius={124}
        size={52}
        box={RING}
      />
      <View style={styles.centerFill}>
        <Baba size={170} />
      </View>
    </View>
  ),

  feelings: () => (
    <View style={styles.wave}>
      <Svg width={256} height={220} viewBox="0 0 256 220" style={StyleSheet.absoluteFill}>
        <Path
          d="M0,150 C30,150 50,70 76,70 S105,150 128,150 S155,60 180,60 S215,120 256,120"
          fill="none"
          stroke={line.normal}
          strokeWidth={3}
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      </Svg>
      {WAVE.map((w) => (
        <View key={w.time} style={[styles.waveDot, { left: w.left - 22, top: w.top - 22 }]}>
          <EmotionPebble id={w.pebble} size={44} />
          <Text variant="caption1" color={labelColor.alternative}>
            {w.time}
          </Text>
        </View>
      ))}
    </View>
  ),

  blur: () => (
    <View style={styles.fade}>
      <View style={styles.fadeRow}>
        {[
          { when: "아침", pebble: P.anxious, opacity: 1 },
          { when: "낮", pebble: P.tired, opacity: 0.6 },
          { when: "저녁", pebble: P.angry, opacity: 0.3 },
        ].map((d) => (
          <View key={d.when} style={[styles.fadeCol, { opacity: d.opacity }]}>
            <Text variant="label1" color={labelColor.neutral}>
              {d.when}
            </Text>
            <EmotionPebble id={d.pebble} size={54} />
          </View>
        ))}
      </View>
      <View style={styles.why}>
        <Baba size={96} />
        <Say>왜였더라?</Say>
      </View>
    </View>
  ),

  ruminate: () => (
    <View style={styles.ring240}>
      <Svg width={240} height={240} viewBox="0 0 240 240" style={StyleSheet.absoluteFill}>
        <Circle
          cx={120}
          cy={120}
          r={104}
          fill="none"
          stroke={onboardingArt.ruminationSoft}
          strokeWidth={3}
          strokeDasharray="5 10"
          strokeLinecap="round"
        />
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * 2 * Math.PI;
          return (
            <Circle
              key={i}
              cx={120 + 104 * Math.sin(a)}
              cy={120 - 104 * Math.cos(a)}
              r={6}
              fill={onboardingArt.rumination}
              opacity={0.35}
            />
          );
        })}
      </Svg>
      <View style={styles.centerFill}>
        <EmotionPebble id={P.stuck} size={110} />
        <Text variant="title3Hand" color={onboardingArt.rumination} style={styles.tenTimes}>
          10번
        </Text>
      </View>
    </View>
  ),

  blank: () => (
    <View style={styles.blank}>
      <View style={styles.page}>
        <Text variant="body1ReadingHand" color={labelColor.strong}>
          10월 14일
        </Text>
        <View style={styles.cursor} />
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.pageLine} />
        ))}
      </View>
      <View style={styles.blankPebble}>
        <EmotionPebble id={P.tired} size={64} />
      </View>
    </View>
  ),

  help: () => (
    <View style={styles.ring}>
      <Orbit ids={[P.calm, P.happy, P.proud, P.calm, P.happy]} radius={124} size={46} box={RING} />
      <View style={styles.centerFill}>
        <Baba size={180} />
      </View>
    </View>
  ),

  schedule: () => (
    <View style={styles.list}>
      {[
        { title: "아침 산책", pebble: P.calm, done: true },
        { title: "프젝 회의", note: "생각보다 괜찮았어", pebble: P.proud, done: true, hl: true },
        { title: "저녁 장보기", done: false },
      ].map((r) => (
        <View key={r.title} style={[styles.row, r.hl && styles.rowHl]}>
          <View style={[styles.check, r.done && styles.checkOn]} />
          <View style={styles.rowText}>
            <Text variant="body1" color={labelColor.strong}>
              {r.title}
            </Text>
            {r.note != null ? (
              <Text variant="caption1" color={labelColor.neutral}>
                {r.note}
              </Text>
            ) : null}
          </View>
          {r.pebble != null ? (
            <EmotionPebble id={r.pebble} size={28} />
          ) : (
            <View style={styles.emptyDot} />
          )}
        </View>
      ))}
    </View>
  ),

  talk: () => (
    <View style={styles.chat}>
      <BabaSays large>오늘 「프젝 회의」는 어땠어요?</BabaSays>
      <Say me large>
        긴장했는데 준비한 말은 했어
      </Say>
      <BabaSays large>그 순간, 어떤 마음이었어요?</BabaSays>
      <Say me large>
        <Mark>생각보다 괜찮았어</Mark>. 좀 뿌듯했어
      </Say>
    </View>
  ),

  diary: () => (
    <View style={styles.diaryPage}>
      <View style={styles.diaryHead}>
        <Text variant="body1ReadingHand" color={labelColor.strong}>
          10월 14일 화요일
        </Text>
        <View style={styles.diaryPebbles}>
          <EmotionPebble id={P.proud} size={22} />
          <EmotionPebble id={P.anxious} size={22} />
        </View>
      </View>
      <Text variant="body1ReadingHand" color={labelColor.normal}>
        회의 전에는 손이 차가울 만큼 떨렸다. 막상 시작하니 준비한 첫 문장이 자연스럽게 나왔다.
        끝나고 나니 <Mark>「생각보다 괜찮았어」</Mark>라는 말이 먼저 나왔다.
      </Text>
      <View style={styles.diaryFoot}>
        <View style={styles.aiTag}>
          <Text variant="caption2" color={primary.heavy}>
            AI가 쓴 글
          </Text>
        </View>
        <Text variant="caption1" color={labelColor.alternative}>
          고칠 수 있어요
        </Text>
      </View>
    </View>
  ),

  // 지금 쉼터 탭의 테마 카드를 그대로 쓴다 — 누를 수 없게 갈 곳(route)만 뺀다
  rest: () => <RestPreview />,

  letter: () => (
    <View style={styles.diaryPage}>
      <Text variant="caption1" color={labelColor.alternative}>
        10월 15일 아침 · 바바의 편지는 AI가 써요
      </Text>
      <Text variant="body1ReadingHand" color={labelColor.normal}>
        하늘님에게,{"\n"}어제 「프젝 회의」를 마치고 <Mark>「생각보다 괜찮았어」</Mark>라고 남겼죠.
        준비한 만큼 말이 나온 날이었네요.
      </Text>
      <View style={styles.task}>
        <Text variant="caption1" color={labelColor.neutral}>
          오늘 해 볼 작은 일 하나 고를래요?
        </Text>
        <Text variant="body2" color={labelColor.strong}>
          회의 끝나고 도와준 동료에게 고맙다고 말하기
        </Text>
      </View>
      <View style={styles.sign}>
        <Baba size={36} />
        <Text variant="body1ReadingHand" color={labelColor.strong}>
          바바가
        </Text>
      </View>
    </View>
  ),

  report: () => (
    <View style={styles.week}>
      <View style={styles.exampleTag}>
        <Text variant="caption2" color={status.cautionary}>
          예시
        </Text>
      </View>
      <Text variant="body1ReadingHand" color={labelColor.strong}>
        이번 주 마음
      </Text>
      <View style={styles.weekRow}>
        {WEEK.map((d) => (
          <View key={d.day} style={styles.weekDay}>
            <Text variant="caption1" color={labelColor.alternative}>
              {d.day}
            </Text>
            {d.pebble != null ? (
              <EmotionPebble id={d.pebble} size={26} />
            ) : (
              <View style={styles.weekEmpty} />
            )}
            <Text variant="caption2" color={labelColor.neutral} style={styles.weekNote}>
              {d.note ?? " "}
            </Text>
          </View>
        ))}
      </View>
      <BabaSays>
        쓴 날을 보니, 자소서 쓴 날엔 마음이 무거웠고 걷거나 친구를 만난 날은 가벼웠어요.
      </BabaSays>
    </View>
  ),
};

const styles = StyleSheet.create({
  art: { alignItems: "center", justifyContent: "center", minHeight: 240 },
  centerFill: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  ring: { width: RING, height: RING },
  ring240: { width: 240, height: 240 },
  tenTimes: { marginTop: space.xs },
  mark: { backgroundColor: secondary.normal },

  wave: { width: 256, height: 220 },
  waveDot: { position: "absolute", alignItems: "center", width: 44 },

  fade: { width: 280, alignItems: "center", gap: space.xl },
  fadeRow: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
  fadeCol: { alignItems: "center", gap: space.xs },
  why: { flexDirection: "row", alignItems: "center", gap: space.sm },

  blank: { width: 240, height: 250, alignItems: "center", justifyContent: "center" },
  page: {
    width: 200,
    height: 220,
    backgroundColor: onboardingArt.paper,
    borderRadius: 14,
    paddingVertical: space.lg,
    paddingHorizontal: 18,
    gap: 26,
    ...elevation.floating,
  },
  cursor: { width: 2, height: 20, backgroundColor: labelColor.strong, marginBottom: -26 },
  pageLine: { height: 1.5, backgroundColor: line.neutral },
  blankPebble: { position: "absolute", right: 10, bottom: -6 },

  list: { alignSelf: "stretch", gap: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: background.elevated,
    borderWidth: 1.5,
    borderColor: line.neutral,
    borderRadius: 14,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  rowHl: { borderWidth: 2, borderColor: labelColor.strong },
  rowText: { flex: 1 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: line.normal },
  checkOn: { backgroundColor: primary.heavy, borderColor: primary.heavy },
  emptyDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: line.normal,
  },

  chat: { alignSelf: "stretch", gap: space.md },
  babaSays: { flexDirection: "row", alignItems: "flex-start", gap: 6, alignSelf: "stretch" },
  babaSaysLarge: { alignItems: "center", gap: space.sm },
  say: { flexShrink: 1, paddingVertical: 6, paddingHorizontal: 10, ...elevation.floating },
  sayBaba: {
    backgroundColor: background.elevated,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  sayMe: {
    alignSelf: "flex-end",
    backgroundColor: onboardingArt.sageSoft,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  diaryPage: {
    alignSelf: "stretch",
    backgroundColor: onboardingArt.paper,
    borderRadius: 14,
    paddingVertical: space.md,
    paddingHorizontal: 14,
    gap: space.sm,
    ...elevation.floating,
  },
  diaryHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  diaryPebbles: { flexDirection: "row", gap: 2 },
  diaryFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  aiTag: { borderWidth: 1.5, borderColor: primary.heavy, borderRadius: 8, paddingHorizontal: 6 },
  task: { backgroundColor: onboardingArt.sageSoft, borderRadius: 10, padding: space.sm, gap: 2 },
  sign: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end" },

  restWrap: { alignSelf: "stretch", paddingTop: space.md },

  week: {
    alignSelf: "stretch",
    backgroundColor: background.elevated,
    borderWidth: 1.5,
    borderColor: line.neutral,
    borderRadius: 16,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  exampleTag: {
    position: "absolute",
    top: space.md,
    right: space.md,
    borderWidth: 1.5,
    borderColor: status.cautionary,
    borderRadius: 6,
    paddingHorizontal: 5,
  },
  weekRow: { flexDirection: "row" },
  weekDay: { flex: 1, alignItems: "center", gap: 2 },
  weekEmpty: {
    width: 22,
    height: 22,
    marginVertical: 2,
    borderRadius: 11,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: line.normal,
  },
  weekNote: { textAlign: "center" },
});
