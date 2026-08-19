import { StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { SectionLabel } from "@/components/common/SectionLabel";
import { CloudIcon, MoonIcon, RainIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import { type EmotionId } from "@/features/emotion/model/emotion";
import type { Diary } from "@/features/diary/model/diary";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `A3-b` · 바바가 함께 본 오늘 — **회고를 마친 당시의 고정 스냅샷**이다.
 *
 * - **다시 만들기 버튼을 두지 않는다** — 스냅샷이 다시 생성되면 그때의 말이 사라진다.
 *   고정임을 화면이 먼저 말한다
 * - 근거는 **사용자가 실제로 쓴 말만** 인용한다 — 요약해 바꿔 말하지 않는다
 * - 그날의 기록은 감정을 **두 줄로 나눈다** — 「이야기 속 감정」과 「회고 시작
 *   감정」. 한 줄로 합치면 어느 시점의 감정인지 알 수 없다
 *
 * 새 디자인에서도 본문 카드의 짜임은 내 면과 같다(반투명 흰 면 · 14px/1.75) —
 * **두 면은 같은 하루의 두 시선**이지 위계가 다른 두 종류의 글이 아니다.
 */
const WEATHER_ICONS: Record<string, typeof SunIcon> = {
  맑음: SunIcon,
  흐림: CloudIcon,
  비: RainIcon,
  밤: MoonIcon,
};

export function DiaryBabaFace({ diary }: { diary: Diary }) {
  const WeatherIcon = WEATHER_ICONS[diary.weather?.split(" · ")[0] ?? ""] ?? SunIcon;

  return (
    <>
      <Card variant="paperSoft" style={styles.card}>
        <AppText style={styles.body}>
          {diary.babaView ?? "이 일기에는 바바가 함께 본 오늘이 없어요."}
        </AppText>

        {/* 다시 만들기 버튼을 두지 않는다 — 스냅샷이 다시 생성되면 그때의 말이 사라진다 */}
        <View style={styles.note}>
          <AppText style={styles.noteText}>
            회고를 마친 당시의 대화를 바탕으로 작성됐어요. 이후 수정한 내 문장과 내용이 다를 수
            있어요.
          </AppText>
        </View>

        <AppText style={styles.footnote}>
          {`${formatKoreanDateShort(diary.date)} 회고를 마친 당시 작성된 기록이에요.`}
        </AppText>
      </Card>

      {diary.babaViewBasis != null ? (
        <Card variant="paperSoft" style={styles.card}>
          <SectionLabel variant="paper">이 문장을 쓴 근거</SectionLabel>
          {/* 사용자가 실제로 쓴 말만 인용한다 — 요약해 바꿔 말하지 않는다 */}
          <AppText style={styles.basis}>{diary.babaViewBasis}</AppText>
        </Card>
      ) : null}

      <Card variant="paperSoft" style={styles.card}>
        <SectionLabel variant="paper">그날의 기록</SectionLabel>
        {/* 감정을 두 줄로 나눈다 — 한 줄로 합치면 어느 시점의 감정인지 알 수 없다 */}
        <RecordRow label="이야기 속 감정" emotion={diary.storyEmotion} />
        <View style={styles.divider} />
        <RecordRow label="회고 시작 감정" emotion={diary.startEmotion} />
        {diary.weather != null ? (
          <>
            <View style={styles.divider} />
            {/* 읽기 전용 표시 — 히트 영역을 넓히지 않는다 */}
            <View style={styles.recordRow}>
              <WeatherIcon size={13} color={paperColors.text.green} />
              <AppText style={styles.recordLabel}>날씨</AppText>
              <AppText weight="700" style={styles.recordValue}>
                {diary.weather}
              </AppText>
            </View>
          </>
        ) : null}
      </Card>
    </>
  );
}

function RecordRow({ label, emotion }: { label: string; emotion: EmotionId | null }) {
  return (
    <View style={styles.recordRow}>
      <AppText style={styles.recordLabel}>{label}</AppText>
      {emotion != null ? <EmotionPill id={emotion} variant="paper" /> : null}
    </View>
  );
}

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  card: { gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  // 시안의 본문 — 14px · 1.75 · 자간 -.2 (내 면과 같은 짜임)
  body: {
    fontSize: type.body.fontSize,
    lineHeight: Math.round(type.body.fontSize * 1.75),
    letterSpacing: -0.2,
    color: paperColors.text.primary,
  },
  basis: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
  divider: { height: 1, backgroundColor: paperColors.line.soft },

  note: {
    borderRadius: paperRadius.field,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: paperColors.bg.field,
  },
  // 반드시 읽혀야 하는 줄이라 장식용 `muted`(2.9) 가 아니라 `green`(5.5) 이다
  noteText: {
    fontSize: type.caption.fontSize,
    lineHeight: Math.round(type.caption.fontSize * 1.55),
    color: paperColors.text.green,
  },
  footnote: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  recordRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 30 },
  recordLabel: {
    flex: 1,
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },
  recordValue: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.text.primary,
  },
});
