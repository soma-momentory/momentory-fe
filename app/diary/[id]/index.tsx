import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { RetroNav } from "@/components/common/RetroNav";
import { SegBar } from "@/components/common/SegBar";
import { CheckCircleIcon, SunIcon } from "@/components/icons/LineIcons";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { actionCard, doneButton, home, warnRow } from "@/design/tokens.mvp";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import { formatKoreanDate, formatKoreanDateShort } from "@/lib/day";

/**
 * `A3` 내가 남긴 오늘 + 행동 카드 · `A3-b` 바바가 함께 본 오늘 · `A3-c` 해본 뒤
 *
 * **일기 한 장은 두 면을 가진다**(`A3.md`) — 내가 쓴 문장과 바바가 함께 본 오늘.
 * **두 면을 한 화면에 섞지 않는다.** 행동 카드는 **그 일기 아래**에 붙고 따로
 * 목록을 만들지 않는다.
 *
 * `A3-c` 는 별도 화면이 아니라 **행동 카드가 완료된 상태**다 — 버튼이 채워지고
 * 해본 날짜가 붙으며 느낀 점 한 줄이 자리에 들어온다. **빈 줄로 미리 열어두지
 * 않는다**: 쓰지 않은 칸이 먼저 보이면 안 한 일이 된다.
 *
 * - **`[해봤어요]` 는 토글이 아니라 버튼**이다 — 필요한 것은 "했다"는 사실 하나다
 * - **되돌릴 때만 확인을 묻는다** — 완료 기록과 느낀 점이 함께 지워지므로
 * - **실행 횟수·연속 일수를 세지 않는다**
 * - 바바의 면은 **고정 스냅샷**이라 다시 만들기 버튼을 두지 않는다
 * - 그날의 기록은 감정을 **두 줄로 나눈다** — 「이야기 속 감정」과 「회고 시작
 *   감정」. 한 줄로 합치면 어느 시점의 감정인지 알 수 없다
 * - 이 면의 본문만 `A4` 에서 고칠 수 있다
 */
const FACES: readonly [string, string] = ["내가 남긴 오늘", "바바가 함께 본 오늘"];

export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const card = useDiary((s) => actionCardOf(s.actionCards, id ?? ""));
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);

  const [face, setFace] = useState<0 | 1>(0);
  const [confirmUndo, setConfirmUndo] = useState(false);

  // 지워진 일기를 열고 있었다면 보관함으로 — 오류 화면을 만들지 않는다
  if (diary == null) return <Redirect href="/archive" />;

  return (
    <ScreenBackground>
      <RetroNav title={`${formatKoreanDate(diary.date)}의 일기`} rest={false} />

      <View style={styles.head}>
        <AppText variant="caption" tone="caption" style={styles.date}>
          {`${formatKoreanDate(diary.date)} · 그날의 회고`}
        </AppText>
        {diary.emotions.map((e, i) => (
          <EmotionPill key={`${e}-${i}`} id={e} />
        ))}
      </View>

      <SegBar items={FACES} activeIndex={face} onChange={setFace} />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        {face === 0 ? (
          <>
            <Card style={styles.card}>
              <AppText tone="strong" style={styles.body}>
                {diary.body}
              </AppText>
              {/* 고친 뒤에는 언제 고쳤는지까지 말한다 — 「수정함」은 언제인지를 말하지 못한다 */}
              <AppText variant="caption" tone="caption">
                {diary.editedAt != null
                  ? `회고 대화에서 작성 · ${formatKoreanDateShort(diary.editedAt.slice(0, 10))} 수정`
                  : "회고 대화에서"}
              </AppText>
            </Card>

            {card != null ? (
              <Card style={styles.card}>
                <AppText tone="accent" weight="600" style={styles.section}>
                  이 일기의 행동 카드
                </AppText>
                <ActionRow label="상황" value={card.situation} />
                <ActionRow label="목표 행동" value={card.targetAction} />
                <View style={styles.divider} />

                {card.done ? (
                  <>
                    {/* 채워진 상태 + 해본 날짜. 실행 횟수를 세지 않는다 */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="해봤어요 되돌리기"
                      onPress={() => setConfirmUndo(true)}
                      style={[styles.doneButton, styles.doneButtonOn]}
                    >
                      <CheckCircleIcon size={15} />
                      <AppText tone="onDark" weight="600" style={styles.doneLabel}>
                        {`해봤어요 · ${card.doneAt == null ? "" : formatKoreanDateShort(card.doneAt.slice(0, 10))}`}
                      </AppText>
                    </Pressable>

                    {/* 느낀 점은 **선택**이다 — 완료한 뒤에야 자리가 열린다 */}
                    <ActionRow label="느낀 점" value={card.reflection ?? ""}>
                      <TextInput
                        value={card.reflection ?? ""}
                        onChangeText={(t) => setReflection(card.id, t)}
                        placeholder="한 줄 남겨도 좋아요"
                        placeholderTextColor={semantic.textSlogan}
                        multiline
                        selectionColor={semantic.accentInk}
                        style={styles.reflection}
                        accessibilityLabel="느낀 점"
                      />
                    </ActionRow>

                    <AppText variant="caption" tone="caption">
                      {`${formatKoreanDateShort(diary.date)} 회고에서 만들어졌어요`}
                    </AppText>
                  </>
                ) : (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => markDone(card.id)}
                      style={styles.doneButton}
                    >
                      <AppText tone="body" weight="600" style={styles.doneLabel}>
                        해봤어요
                      </AppText>
                    </Pressable>
                    <AppText variant="caption" tone="caption">
                      {`${formatKoreanDateShort(diary.date)} 회고에서 만들어졌어요 · 해본 뒤에 한 줄 남길 수 있어요`}
                    </AppText>
                  </>
                )}
              </Card>
            ) : null}

            {/* 되돌릴 때만 확인을 묻는다 — 완료 기록과 느낀 점이 함께 사라진다 */}
            {confirmUndo && card != null ? (
              <Card style={styles.confirm}>
                <AppText tone="strong" weight="600" style={styles.confirmTitle}>
                  해본 기록을 지울까요?
                </AppText>
                <AppText variant="caption" tone="caption">
                  해본 날짜와 느낀 점이 함께 지워져요.
                </AppText>
                <View style={styles.confirmActions}>
                  <AppButton
                    label="그대로 두기"
                    variant="ghost"
                    style={styles.confirmButton}
                    onPress={() => setConfirmUndo(false)}
                  />
                  <AppButton
                    label="지우기"
                    variant="ghost"
                    style={styles.confirmButton}
                    onPress={() => {
                      undoDone(card.id);
                      setConfirmUndo(false);
                    }}
                  />
                </View>
              </Card>
            ) : null}
          </>
        ) : (
          <BabaFace diary={diary} />
        )}
      </ScrollView>

      {/* 이 면의 본문만 고칠 수 있다 — 바바의 면에서는 수정으로 가지 않는다 */}
      {face === 0 ? (
        <AppButton
          label="수정하기"
          variant="ghost"
          onPress={() => router.push(`/diary/${diary.id}/edit`)}
        />
      ) : null}
    </ScreenBackground>
  );
}

/** `A3-b` — 고정 스냅샷임을 화면이 먼저 말한다 */
function BabaFace({ diary }: { diary: NonNullable<ReturnType<typeof useDiary.getState>["diaries"][number]> }) {
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
          <AppText tone="accent" weight="600" style={styles.section}>
            이 문장을 쓴 근거
          </AppText>
          {/* 사용자가 실제로 쓴 말만 인용한다 — 요약해 바꿔 말하지 않는다 */}
          <AppText tone="body" style={styles.basis}>
            {diary.babaViewBasis}
          </AppText>
        </Card>
      ) : null}

      <AppText tone="accent" weight="600" style={styles.section}>
        그날의 기록
      </AppText>

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

function RecordRow({ label, emotion }: { label: string; emotion: number | null }) {
  return (
    <View style={styles.recordRow}>
      <AppText variant="caption" tone="caption" style={styles.recordLabel}>
        {label}
      </AppText>
      {emotion != null ? <EmotionPill id={emotion as never} /> : null}
    </View>
  );
}

/** `.acrow` — 라벨 열 62 + 값. 값 자리에 입력을 넣을 수도 있다(느낀 점) */
function ActionRow({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.acRow}>
      <AppText tone="caption" weight="500" style={styles.acLabel}>
        {label}
      </AppText>
      {children ?? (
        <AppText tone="body" style={styles.acValue}>
          {value}
        </AppText>
      )}
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingTop: 10,
    paddingBottom: theme.layout.gap.element,
  },
  date: { flex: 1, fontSize: 12.5, lineHeight: 15 },

  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: theme.layout.gap.element,
    paddingHorizontal: theme.layout.screenMargin,
    paddingVertical: theme.layout.gap.element,
  },

  card: { gap: 10 },
  babaCard: { gap: 10, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  body: { fontSize: 15, lineHeight: 27 },
  basis: { fontSize: 13, lineHeight: 22.1 },
  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  divider: { height: 1, backgroundColor: `${semantic.textPrimary}1A` },

  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: `${semantic.surface}B3`,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },

  acRow: { flexDirection: "row", alignItems: "flex-start", gap: actionCard.gap },
  acLabel: {
    width: actionCard.labelWidth,
    fontSize: actionCard.labelSize,
    lineHeight: actionCard.labelSize * actionCard.lineHeight,
  },
  acValue: {
    flex: 1,
    fontSize: actionCard.valueSize,
    lineHeight: actionCard.valueSize * actionCard.lineHeight,
  },
  reflection: {
    flex: 1,
    fontFamily: "Pretendard-Regular",
    fontSize: actionCard.valueSize,
    lineHeight: actionCard.valueSize * actionCard.lineHeight,
    color: semantic.textBody,
    padding: 0,
  },

  doneButton: {
    minHeight: doneButton.minHeight,
    borderRadius: theme.radius.pill,
    borderWidth: doneButton.borderWidth,
    borderColor: doneButton.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  doneButtonOn: {
    backgroundColor: semantic.accentFill, // primaryDeep — 흰 글자가 얹히는 면
    borderColor: "transparent",
  },
  doneLabel: { fontSize: doneButton.fontSize, lineHeight: doneButton.fontSize },

  confirm: { gap: 8, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  confirmTitle: { fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 9, paddingTop: 4 },
  confirmButton: { flex: 1 },

  recordRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 22 },
  recordLabel: { flex: 1 },
  recordValue: { fontSize: 12.5, lineHeight: 18 },
});
