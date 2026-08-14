import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { RetroButton } from "@/components/chat/RetroButton";
import { RetroScene } from "@/components/chat/RetroScene";
import { EmotionPill } from "@/components/common/EmotionPill";
import { RetroNav } from "@/components/common/RetroNav";
import { SectionLabel } from "@/components/common/SectionLabel";
import { PencilIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import { home } from "@/design/tokens.mvp";
import {
  doneCountLabel,
  useDay,
  useTodayContext,
  visibleSchedules,
} from "@/features/home/model/day";
import { ScheduleRow } from "@/features/home/ui/ScheduleRow";

/**
 * `C2` · 오늘 정리 확인
 *
 * **홈과 같은 카드·버튼·문구를 쓴다.** 회고 직전에 새 컴포넌트를 배우게 하지
 * 않는다 — 낮에 담던 그 화면을 그대로 다시 보여주고 탭해서 고치게 한다.
 * 그래서 `ScheduleRow` 와 `[＋ 일정 추가하기]` 가 홈의 것 그대로다.
 *
 * - **여기서 고친 것은 곧바로 홈에도 반영된다** — 같은 `Schedule`·`Moment` 다.
 *   store 를 공유하므로 별도 동기화가 없다
 * - **`[감정 추가]` 점선 칩은 감정이 비어 있는 줄에 붙는다**(`.addemo`).
 *   마침과 감정은 서로를 요구하지 않으므로 **마치기 전에도** 감정을 남길 수 있다
 * - 순간은 **시각을 붙이지 않고** 「오늘의 순간」 라벨 아래 모은다
 * - 카드가 다 들어가지 않으면 **위쪽이 스크롤된다** — 고정된 것은 제목과 `[다음]`
 *
 * ⚠ 시안은 「밤 3/4 마침」이고 홈(`12`)은 「오후 2/4」다 — **같은 하루의 다른
 * 시각**이라 값이 다른 것이 맞다. 구현은 같은 store 를 보므로 사용자가 낮에
 * 무엇을 체크했는지가 그대로 나온다. 숫자를 화면에 박지 않는다.
 */
export default function RetroConfirm() {
  const schedules = useDay((s) => s.schedules);
  const moments = useDay((s) => s.moments);
  const toggleDone = useDay((s) => s.toggleDone);
  // 홈과 같은 「오늘」을 본다 — 날씨도 같은 공급자에서 온다
  const { weather } = useTodayContext();

  const shown = visibleSchedules(schedules);
  // 「오늘 기록한 감정」 — 줄에 달린 감정을 순서대로 모은다. 개수를 세지 않는다
  const emotions = shown.flatMap((s) => s.emotions);

  const openDetail = (id: string) => router.push(`/home/schedule/${id}`);

  return (
    <ScreenBackground variant="paperFlat">
      <RetroScene />
      <RetroNav variant="paper" title="오늘 정리" />

      <View style={styles.head}>
        <AppText weight="700" style={styles.title}>
          오늘 하루를 정리해봤어요.
        </AppText>
        <AppText style={styles.sub}>탭해서 고치고, 회고를 시작해볼까요?</AppText>
      </View>

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 날씨 — 오늘이 어떤 날이었는지의 가장 바깥 테두리 */}
        <Card variant="paperSoft" style={styles.weatherCard}>
          <SunIcon size={16} color={paperColors.text.greenStrong} />
          <AppText weight="700" style={styles.weatherLabel}>
            오늘 날씨
          </AppText>
          <AppText style={styles.weatherValue}>{`${weather.label} · ${weather.celsius}℃`}</AppText>
        </Card>

        {/* 오늘 일정 — 홈과 같은 카드 */}
        <Card variant="paperSoft" style={styles.card}>
          <View style={styles.dayHead}>
            <SectionLabel variant="paper">오늘 일정</SectionLabel>
            <AppText style={styles.count}>{doneCountLabel(schedules)}</AppText>
          </View>

          <View style={styles.list}>
            {shown.map((s) => (
              <ScheduleRow
                key={s.id}
                schedule={s}
                variant="paper"
                onToggleDone={toggleDone}
                onOpen={openDetail}
                // 비어 있는 줄을 밤에 한 번 훑어 채우는 자리다
                addEmotion
              />
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            style={styles.addButton}
            onPress={() => router.push("/home/schedule/new")}
          >
            <AppText weight="700" style={styles.addLabel}>
              ＋ 일정 추가하기
            </AppText>
          </Pressable>
        </Card>

        {/* 오늘의 순간 — 시각을 붙이지 않는다 */}
        <Card variant="paperSoft" style={styles.card}>
          <SectionLabel variant="paper">오늘의 순간</SectionLabel>

          {moments.map((m) => (
            <View key={m.id} style={styles.momentRow}>
              <View style={styles.momentIcon}>
                <PencilIcon size={14} color={paperColors.text.greenStrong} />
              </View>
              <AppText style={styles.momentText}>{m.text}</AppText>
            </View>
          ))}

          {/*
            ⚠ 「지금 떠오른 걸 한 줄로 적어요」 줄을 뺐다 — 순간 입력(`12-d`)이
            2026-08-14 에 사라져(`PLAN.md` D9) 갈 곳이 없어졌다. 눌리는데 아무 일도
            없는 줄을 두지 않는다(`CLAUDE.md`). **읽기는 그대로** 남는다 —
            순간을 만들 길이 생기면 이 자리에 다시 붙인다.
          */}
        </Card>

        {/* 오늘 기록한 감정 — 줄에 달린 것을 그대로 모은다 */}
        {emotions.length > 0 ? (
          <Card variant="paperSoft" style={styles.card}>
            <SectionLabel variant="paper">오늘 기록한 감정</SectionLabel>
            <View style={styles.emotionRow}>
              {emotions.map((e, i) => (
                <EmotionPill key={`${e}-${i}`} id={e} variant="paper" />
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <RetroButton label="다음" onPress={() => router.push("/retro/emotion")} />
    </ScreenBackground>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  head: { paddingTop: 10, paddingBottom: theme.layout.gap.section, gap: 4 },
  title: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
  sub: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.greenStrong,
  },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  // 카드 넷이 다 들어가지 않으면 이 안만 스크롤된다 (RULES 「812 프레임」)
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: theme.layout.gap.section,
  },

  weatherCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  weatherLabel: {
    flex: 1,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
  weatherValue: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  card: { gap: 10 },
  dayHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  count: {
    flex: 1,
    textAlign: "right",
    fontSize: type.label.fontSize,
    lineHeight: type.label.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  list: { gap: home.list.gap },

  // 흰 글자가 얹히는 초록 면은 `greenDark` 다 — `brand.green` 은 2.7 (paper.ts)
  addButton: {
    minHeight: home.addButton.minHeight,
    borderRadius: paperRadius.pill,
    backgroundColor: paperColors.brand.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.onFill,
  },

  // .mr1 — 아이콘 자리를 22 로 고정해 본문 시작점이 줄마다 흔들리지 않게
  momentRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  momentIcon: { width: 22, alignItems: "center" },
  momentText: {
    flex: 1,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },

  emotionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
});
