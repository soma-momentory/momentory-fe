import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { RetroNav } from "@/components/common/RetroNav";
import { PencilIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { fill, home } from "@/design/tokens.mvp";
import { doneCountLabel, useDay, visibleSchedules } from "@/features/home/model/day";
import { ScheduleRow } from "@/features/home/ui/ScheduleRow";
import { SAMPLE_WEATHER } from "@/mocks/sample";

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

  const shown = visibleSchedules(schedules);
  // 「오늘 기록한 감정」 — 줄에 달린 감정을 순서대로 모은다. 개수를 세지 않는다
  const emotions = shown.flatMap((s) => s.emotions);

  const openDetail = (id: string) => router.push(`/home/schedule/${id}`);

  return (
    <ScreenBackground>
      <RetroNav title="오늘 정리" />

      <View style={styles.head}>
        <AppText tone="strong" weight="600" style={styles.title}>
          오늘 하루를 정리해봤어요.
        </AppText>
        <AppText tone="caption" style={styles.sub}>
          탭해서 고치고, 회고를 시작해볼까요?
        </AppText>
      </View>

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 날씨 — 오늘이 어떤 날이었는지의 가장 바깥 테두리 */}
        <Card style={styles.weatherCard}>
          <SunIcon size={16} />
          <AppText tone="strong" weight="500" style={styles.weatherLabel}>
            오늘 날씨
          </AppText>
          <AppText variant="caption" tone="caption">
            {`${SAMPLE_WEATHER.label} · ${SAMPLE_WEATHER.celsius}℃`}
          </AppText>
        </Card>

        {/* 오늘 일정 — 홈과 같은 카드 */}
        <Card style={styles.card}>
          <View style={styles.dayHead}>
            <AppText tone="accent" weight="600" style={styles.section}>
              오늘 일정
            </AppText>
            <AppText tone="caption" weight="500" style={styles.count}>
              {doneCountLabel(schedules)}
            </AppText>
          </View>

          <View style={styles.list}>
            {shown.map((s) => (
              <ScheduleRow
                key={s.id}
                schedule={s}
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
            <AppText tone="onDark" weight="700" style={styles.addLabel}>
              ＋ 일정 추가하기
            </AppText>
          </Pressable>
        </Card>

        {/* 오늘의 순간 — 시각을 붙이지 않는다 */}
        <Card style={styles.card}>
          <AppText tone="accent" weight="600" style={styles.section}>
            오늘의 순간
          </AppText>

          {moments.map((m) => (
            <View key={m.id} style={styles.momentRow}>
              <View style={styles.momentIcon}>
                <PencilIcon size={14} color={semantic.textMuted} />
              </View>
              <AppText tone="strong" weight="500" style={styles.momentText}>
                {m.text}
              </AppText>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            style={styles.momentButton}
            onPress={() => router.push("/home/moment/new")}
          >
            <PencilIcon size={14} />
            <AppText tone="caption" weight="500" style={styles.momentLabel}>
              지금 떠오른 걸 한 줄로 적어요
            </AppText>
          </Pressable>
        </Card>

        {/* 오늘 기록한 감정 — 줄에 달린 것을 그대로 모은다 */}
        {emotions.length > 0 ? (
          <Card style={styles.card}>
            <AppText tone="accent" weight="600" style={styles.section}>
              오늘 기록한 감정
            </AppText>
            <View style={styles.emotionRow}>
              {emotions.map((e, i) => (
                <EmotionPill key={`${e}-${i}`} id={e} />
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>

      <AppButton label="다음" onPress={() => router.push("/retro/emotion")} />
    </ScreenBackground>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  head: { paddingTop: 10, paddingBottom: theme.layout.gap.section },
  title: { fontSize: 15.5, lineHeight: 23.25 },
  sub: { fontSize: 13, lineHeight: 19.5 },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  // 카드 넷이 다 들어가지 않으면 이 안만 스크롤된다 (RULES 「812 프레임」)
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: theme.layout.gap.section,
  },

  weatherCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  weatherLabel: { flex: 1, fontSize: 13.5, lineHeight: 18.9 },

  card: { gap: 10 },
  dayHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  count: { flex: 1, textAlign: "right", fontSize: 11.5, lineHeight: 11.5 },
  list: { gap: home.list.gap },

  addButton: {
    minHeight: home.addButton.minHeight,
    borderRadius: home.addButton.radius,
    backgroundColor: fill.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: { fontSize: home.addButton.fontSize, lineHeight: home.addButton.fontSize },

  // .mr1 — 아이콘 자리를 22 로 고정해 본문 시작점이 줄마다 흔들리지 않게
  momentRow: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  momentIcon: { width: 22, alignItems: "center" },
  momentText: { flex: 1, fontSize: 13.5, lineHeight: 19.6 },

  momentButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: home.momentButton.gap,
    minHeight: home.momentButton.minHeight,
    paddingHorizontal: home.momentButton.paddingHorizontal,
    borderRadius: home.momentButton.radius,
    backgroundColor: home.momentButton.background,
    borderWidth: 1,
    borderColor: home.momentButton.border,
  },
  momentLabel: { flex: 1, fontSize: home.momentButton.fontSize, lineHeight: 18.9 },

  emotionRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
});
