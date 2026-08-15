import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { Hill } from "@/components/common/Hill";
import { SegBar } from "@/components/common/SegBar";
import { ActionCardSection } from "@/components/diary/ActionCardSection";
import { DiaryBabaFace } from "@/components/diary/DiaryBabaFace";
import { CloseIcon, CloudIcon, MoonIcon, RainIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperEmotionColor, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import { useDay, visibleSchedules } from "@/features/home/model/day";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `A3` 내가 남긴 오늘 + 행동 카드 · `A3-b` 바바가 함께 본 오늘 · `A3-c` 해본 뒤
 *
 * **일기 한 장은 두 면을 가진다**(`A3.md`) — 내가 쓴 문장과 바바가 함께 본 오늘.
 * **두 면을 한 화면에 섞지 않는다.**
 *
 * 이 파일은 **면 전환과 조합만** 한다 — 행동 카드의 규칙(`A3-c` 는 상태다 ·
 * 되돌릴 때만 확인)은 `ActionCardSection`, 바바 면의 규칙(고정 스냅샷 · 근거
 * 인용 · 그날의 기록 두 줄)은 `DiaryBabaFace` 에 있다.
 *
 * - 이 면(내가 남긴 오늘)의 본문만 `A4` 에서 고칠 수 있다
 *
 * ## 새 디자인 (`PLAN.md` Phase 3-8 · `docs/design/prototype/일기.dc.html`)
 *
 * ✕ + 날짜 + 날씨 머리 → 감정 태그 칩 → 두 면 세그먼트 → 반투명 일기 카드 →
 * 그날 일정 → 곡선 언덕 위의 `[수정하기]`.
 *
 * **면의 이름은 시안이 아니라 스펙 문안이다** — 시안의 「내 시선 / 다른 시선」이
 * 아니라 「내가 남긴 오늘 / 바바가 함께 본 오늘」이다(`A3.md` · 문안은 `docs/spec`
 * 우선 — `PLAN.md` §0). 시안의 **페이지 넘김(점 2개)** 도 두지 않았다 — 본문
 * 길이가 사람마다 달라 두 쪽으로 자를 기준이 없고, 스크롤이 이미 그 일을 한다.
 */
const FACES: readonly [string, string] = ["내가 남긴 오늘", "바바가 함께 본 오늘"];

/** 「맑음 · 27℃」 → 아이콘. 모르는 날씨는 해로 떨어진다 (`paperWeatherOf` 와 같은 태도) */
const WEATHER_ICONS: Record<string, typeof SunIcon> = {
  맑음: SunIcon,
  흐림: CloudIcon,
  비: RainIcon,
  밤: MoonIcon,
};

export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const card = useDiary((s) => actionCardOf(s.actionCards, id ?? ""));
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);
  /**
   * 그날 일정 — **그 날짜의 줄만** 골라 온다(`app-flow.md` §2.3). 지금 일정
   * store 는 서버에서 **오늘 하루치**만 받아 두므로, 지난 일기를 열면 고를 줄이
   * 없어 카드가 통째로 숨는다 — 그것이 「일정이 없는 날」과 같은 처리다.
   * 날짜별 조회가 붙으면 이 selector 안쪽만 바뀐다.
   */
  const schedules = useDay((s) => s.schedules);

  const [face, setFace] = useState<0 | 1>(0);

  // 지워진 일기를 열고 있었다면 보관함으로 — 오류 화면을 만들지 않는다
  if (diary == null) return <Redirect href="/archive" />;

  const daySchedules = visibleSchedules(schedules).filter((s) => s.date === diary.date);
  // 「맑음 · 27℃」의 앞머리만 칩에 쓴다 — 온도까지 넣으면 칩이 줄을 밀어낸다
  const weatherLabel = diary.weather?.split(" · ")[0] ?? null;
  const WeatherIcon = (weatherLabel == null ? null : WEATHER_ICONS[weatherLabel]) ?? SunIcon;

  return (
    <ScreenBackground variant="paperFlat">
      {/* 머리 — ✕ · 날짜 · 날씨. 이모지 ✕ 대신 선 아이콘이다(`RULES.md` 「아이콘」) */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="닫기"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.headerSide}
        >
          <CloseIcon size={18} color={paperColors.text.primary} />
        </Pressable>
        <AppText weight="700" style={styles.title}>
          {`${formatKoreanDateShort(diary.date)}의 일기`}
        </AppText>
        {/* 날씨는 읽기 전용 표시다 — 누를 수 있는 요소가 아니다 */}
        <View style={styles.headerSide}>
          {diary.weather != null ? <WeatherIcon size={16} color={paperColors.text.green} /> : null}
        </View>
      </View>

      {/* 감정 태그 — 그 감정색 칩이다(`design-system.md` §4.4) */}
      {diary.emotions.length > 0 ? (
        <View style={styles.tags}>
          {diary.emotions.map((e, i) => (
            <EmotionPill key={`${e}-${i}`} id={e} variant="paper" />
          ))}
        </View>
      ) : null}

      <SegBar items={FACES} activeIndex={face} onChange={setFace} variant="paper" />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {face === 0 ? (
          <>
            <Card variant="paperSoft" style={styles.diaryCard}>
              <View style={styles.captionRow}>
                {/* 고친 뒤에는 언제 고쳤는지까지 말한다 — 「수정함」은 언제인지를 말하지 못한다 */}
                <AppText style={styles.caption}>
                  {diary.editedAt != null
                    ? `회고 대화에서 작성 · ${formatKoreanDateShort(diary.editedAt.slice(0, 10))} 수정`
                    : "회고 대화에서"}
                </AppText>
                {weatherLabel != null ? (
                  <View style={styles.weatherChip}>
                    <WeatherIcon size={12} color={paperColors.text.green} />
                    <AppText style={styles.weatherChipText}>{weatherLabel}</AppText>
                  </View>
                ) : null}
              </View>
              <AppText style={styles.body}>{diary.body}</AppText>
            </Card>

            {card != null ? (
              <ActionCardSection
                card={card}
                diaryDate={diary.date}
                onMarkDone={markDone}
                onUndoDone={undoDone}
                onSetReflection={setReflection}
              />
            ) : null}
          </>
        ) : (
          <DiaryBabaFace diary={diary} />
        )}

        {/* 그날 일정 — **일정이 없는 날은 카드 자체를 숨긴다**(`app-flow.md` §2.3).
            두 면 어느 쪽에서 보든 같은 하루의 사실이라 면 밖에 둔다 */}
        {daySchedules.length > 0 ? (
          <Card variant="paperSoft" style={styles.scheduleCard}>
            <AppText weight="700" style={styles.scheduleTitle}>
              오늘 일정
            </AppText>
            {daySchedules.map((s, i) => {
              const color = paperEmotionColor(s.emotions[0]);
              return (
                <View key={s.id} style={[styles.scheduleRow, i > 0 ? styles.divider : null]}>
                  {/* 완료 점은 그날 감정색 · 미완료는 빈 원이다 — 색만으로 가르지 않는다 */}
                  <View
                    style={[
                      styles.dot,
                      {
                        borderColor: s.done ? color : paperColors.neutral.tabInactiveBorder,
                        backgroundColor: s.done ? color : "transparent",
                      },
                    ]}
                  />
                  <AppText style={[styles.scheduleItem, s.done ? null : styles.scheduleItemOpen]}>
                    {s.title}
                  </AppText>
                </View>
              );
            })}
          </Card>
        ) : null}
      </ScrollView>

      {/* 곡선 언덕이 아래 칸을 가른다 — 그 위에 이 면의 동작 하나만 앉는다 */}
      <View style={styles.footer}>
        <Hill color={paperColors.bg.hill} height="md" />
        <View style={styles.footerBody}>
          {/* 이 면의 본문만 고칠 수 있다 — 바바의 면에서는 수정으로 가지 않는다 */}
          {face === 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/diary/${diary.id}/edit`)}
              style={styles.editButton}
            >
              <AppText weight="700" style={styles.editLabel}>
                수정하기
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScreenBackground>
  );
}

const { styles: type } = paperTypography;
const FULL_BLEED = -theme.layout.screenMargin;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: theme.touch.minTarget,
  },
  // 양쪽 칸의 폭을 맞춰 날짜가 가운데에 선다
  headerSide: { width: 28, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 21,
    lineHeight: 28,
    color: paperColors.text.primary,
  },

  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingTop: 4, paddingBottom: 10 },

  stack: { flex: 1, marginHorizontal: FULL_BLEED },
  stackContent: {
    gap: 11,
    paddingHorizontal: theme.layout.screenMargin,
    paddingTop: 12,
    paddingBottom: 20,
  },

  diaryCard: { gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  captionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  caption: {
    flex: 1,
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  weatherChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: paperColors.line.soft,
    borderRadius: paperRadius.field - 2,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  weatherChipText: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.green,
  },
  // 시안의 본문 — 14px · 1.75 · 자간 -.2
  body: {
    fontSize: type.body.fontSize,
    lineHeight: Math.round(type.body.fontSize * 1.75),
    letterSpacing: -0.2,
    color: paperColors.text.primary,
  },

  scheduleCard: { gap: 0, paddingVertical: 13, paddingHorizontal: 16 },
  scheduleTitle: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primary,
    paddingBottom: 4,
  },
  scheduleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9 },
  divider: { borderTopWidth: 1, borderTopColor: paperColors.line.soft },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  scheduleItem: {
    flex: 1,
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
  // 시안은 아직 안 한 일을 `faint` 로 흐리는데 카드 위 2.1 이라 AA 미달이다 —
  // 같은 「덜 진한」 자리를 지키면서 읽히는 톤으로 올렸다 (PLAN.md Phase 1 대비 보정)
  scheduleItemOpen: { color: paperColors.text.mutedWarmText },

  footer: { marginHorizontal: FULL_BLEED },
  footerBody: {
    backgroundColor: paperColors.bg.hill,
    paddingHorizontal: theme.layout.screenMargin,
    paddingTop: 6,
    paddingBottom: 14,
  },
  editButton: {
    minHeight: theme.touch.minTarget,
    borderRadius: paperRadius.pill,
    backgroundColor: paperColors.bg.cardOpaque,
    borderWidth: 1,
    borderColor: paperColors.line.detail,
    alignItems: "center",
    justifyContent: "center",
  },
  editLabel: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
});
