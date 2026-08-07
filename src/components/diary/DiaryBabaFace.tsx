import { StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { SectionLabel } from "@/components/common/SectionLabel";
import { SunIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import theme, { type EmotionId } from "@/design/theme";
import { warnRow } from "@/design/tokens.mvp";
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
 */
export function DiaryBabaFace({ diary }: { diary: Diary }) {
  return (
    <>
      <Card style={styles.babaCard}>
        <AppText tone="strong" style={styles.body}>
          {diary.babaView ?? "이 일기에는 바바가 함께 본 오늘이 없어요."}
        </AppText>

        {/* 다시 만들기 버튼을 두지 않는다 — 스냅샷이 다시 생성되면 그때의 말이 사라진다 */}
        <View style={styles.warn}>
          <AppText tone="accent" weight="500" style={styles.warnText}>
            회고를 마친 당시의 대화를 바탕으로 작성됐어요. 이후 수정한 내 문장과 내용이 다를 수
            있어요.
          </AppText>
        </View>

        <AppText variant="caption" tone="caption">
          {`${formatKoreanDateShort(diary.date)} 회고를 마친 당시 작성된 기록이에요.`}
        </AppText>
      </Card>

      {diary.babaViewBasis != null ? (
        <Card style={styles.card}>
          <SectionLabel>이 문장을 쓴 근거</SectionLabel>
          {/* 사용자가 실제로 쓴 말만 인용한다 — 요약해 바꿔 말하지 않는다 */}
          <AppText tone="body" style={styles.basis}>
            {diary.babaViewBasis}
          </AppText>
        </Card>
      ) : null}

      <SectionLabel>그날의 기록</SectionLabel>

      <Card style={styles.card}>
        {/* 감정을 두 줄로 나눈다 — 한 줄로 합치면 어느 시점의 감정인지 알 수 없다 */}
        <RecordRow label="이야기 속 감정" emotion={diary.storyEmotion} />
        <View style={styles.divider} />
        <RecordRow label="회고 시작 감정" emotion={diary.startEmotion} />
        {diary.weather != null ? (
          <>
            <View style={styles.divider} />
            {/* 읽기 전용 표시 — 히트 영역을 넓히지 않는다 */}
            <View style={styles.recordRow}>
              <SunIcon size={13} />
              <AppText variant="caption" tone="caption" style={styles.recordLabel}>
                날씨
              </AppText>
              <AppText tone="body" weight="500" style={styles.recordValue}>
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
      <AppText variant="caption" tone="caption" style={styles.recordLabel}>
        {label}
      </AppText>
      {emotion != null ? <EmotionPill id={emotion} /> : null}
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  card: { gap: 10 },
  babaCard: { gap: 10, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  body: { fontSize: 15, lineHeight: 27 },
  basis: { fontSize: 13, lineHeight: 22.1 },
  divider: { height: 1, backgroundColor: `${semantic.textPrimary}1A` },

  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: `${semantic.surface}B3`,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },

  recordRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 22 },
  recordLabel: { flex: 1 },
  recordValue: { fontSize: 12.5, lineHeight: 18 },
});
