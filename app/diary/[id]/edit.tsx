import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { EmotionGrid } from "@/components/common/EmotionGrid";
import { CloseIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import { useDiary } from "@/features/diary/model/diary";
import { DIARY_BODY_MAX_LENGTH } from "@/features/diary/model/types";
import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * `A4` · 일기 수정 · 본문 + 감정 태그
 *
 * **고칠 수 있는 것과 없는 것을 화면에서 가른다.** 고치는 것은 「내가 남긴
 * 오늘」의 본문과 **이 일기의 감정 태그**뿐이다.
 *
 * | 고칠 수 있는 것 | 고칠 수 없는 것 |
 * |---|---|
 * | 「내가 남긴 오늘」 본문 | 원본 회고 대화 |
 * | 이 일기의 감정 태그 | 바바가 함께 본 오늘 · 행동 카드 · 그날의 일정·날씨·원본 감정 |
 *
 * - 제목이 **"이날의 감정"이 아니라 "이 일기의 감정 태그"** 인 이유 — 원본 감정을
 *   고치는 것처럼 보이면 안 된다. 고쳐지는 것은 목록·필터에 쓰는 값뿐이다
 * - 고른 칩은 **면이 진해지고 잉크 2px 테두리 + 굵기**로 함께 바뀐다(`EmotionGrid`
 *   `paper`) — 선택을 색만으로 표시하지 않는다
 * - **`[이 회고 삭제]` 는 무엇이 사라지는지 먼저 말한다.** 라벨이 「이 일기
 *   삭제」가 아닌 것은 지워지는 것이 일기 한 면이 아니라 **회고 한 벌**이기 때문
 * - **위험색은 글자에만** 얹고 면을 채우지 않는다(`R-40`). 테두리는
 *   `[취소]` 와 같은 중립이다 — 되돌릴 수 없는 동작이 누르기 쉬워지면 안 된다
 */
export default function DiaryEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const edit = useDiary((s) => s.edit);
  const remove = useDiary((s) => s.remove);

  const [body, setBody] = useState<string>(diary?.body ?? "");
  const [emotions, setEmotions] = useState<EmotionId[]>(diary?.emotions ?? []);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (diary == null) return <Redirect href="/archive" />;

  const toggle = (e: EmotionId) =>
    setEmotions((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const save = () => {
    edit(diary.id, { body, emotions });
    router.back();
  };

  const confirmRemove = () => {
    remove(diary.id);
    // 일기가 사라졌으므로 상세로 돌아가지 않는다
    router.replace("/archive");
  };

  return (
    <ScreenBackground variant="paperFlat">
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
          일기 수정
        </AppText>
        <View style={styles.headerSide} />
      </View>

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="paperSoft" style={styles.card}>
          {/* 「이날의 감정」이 아니다 — 원본 감정을 고치는 것처럼 보이면 안 된다 */}
          <AppText weight="700" style={styles.section}>
            이 일기의 감정 태그
          </AppText>
          <AppText style={styles.caption}>
            목록과 필터에 표시할 감정이에요 · 여러 개 선택할 수 있어요
          </AppText>
          <EmotionGrid selected={emotions} onToggle={toggle} variant="paper" />
        </Card>

        <Card variant="paperSoft" style={styles.card}>
          <AppText weight="700" style={styles.section}>
            일기 내용
          </AppText>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={DIARY_BODY_MAX_LENGTH}
            selectionColor={paperColors.brand.greenDark}
            style={styles.body}
            accessibilityLabel="일기 내용"
          />
        </Card>

        {/* 무엇이 안 바뀌는지를 먼저 말한다 */}
        <View style={styles.note}>
          <AppText style={styles.noteText}>
            {
              "수정한 내용은 '내가 남긴 오늘'에만 반영돼요. 바바의 문장과 행동 카드는 회고를 마친 당시 내용 그대로 남아요."
            }
          </AppText>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.action, styles.quiet]}
          >
            <AppText weight="700" style={styles.actionLabel}>
              취소
            </AppText>
          </Pressable>
          {/* 채운 면에는 흰 글자가 얹히므로 `green`(2.7)이 아니라 `greenDark`(4.52) 다 */}
          <Pressable
            accessibilityRole="button"
            onPress={save}
            style={[styles.action, styles.primary]}
          >
            <AppText weight="700" style={[styles.actionLabel, styles.primaryLabel]}>
              저장
            </AppText>
          </Pressable>
        </View>

        {/* 위험색은 글자에만 — 면도 테두리도 채우지 않는다 */}
        {!confirmDelete ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => setConfirmDelete(true)}
            style={styles.deleteButton}
          >
            <AppText weight="700" style={styles.deleteLabel}>
              이 회고 삭제
            </AppText>
          </Pressable>
        ) : (
          <Card variant="paperSoft" style={styles.confirm}>
            <AppText weight="700" style={styles.confirmTitle}>
              이 회고를 삭제할까요?
            </AppText>
            {/* 무엇이 사라지는지 먼저 말한다 */}
            <AppText style={styles.caption}>
              내 문장, 바바의 문장, 행동 카드가 함께 삭제돼요.
            </AppText>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmDelete(false)}
                style={[styles.action, styles.quiet]}
              >
                <AppText weight="700" style={styles.actionLabel}>
                  취소
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={confirmRemove}
                // 중립 테두리 — [취소] 와 같다. 색으로 구분하지 않는다
                style={[styles.action, styles.quiet]}
              >
                <AppText weight="700" style={[styles.actionLabel, styles.deleteLabel]}>
                  회고 삭제
                </AppText>
              </Pressable>
            </View>
          </Card>
        )}
      </ScrollView>
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
  headerSide: { width: 28, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 21,
    lineHeight: 28,
    color: paperColors.text.primary,
  },

  stack: { flex: 1, marginHorizontal: FULL_BLEED },
  stackContent: {
    gap: 11,
    paddingHorizontal: theme.layout.screenMargin,
    paddingTop: 12,
    paddingBottom: 24,
  },

  card: { gap: 10, paddingVertical: 16, paddingHorizontal: 18 },
  section: {
    fontSize: type.cardTitle.fontSize,
    lineHeight: type.cardTitle.lineHeight,
    color: paperColors.text.primary,
  },
  caption: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.mutedWarmText,
  },

  // 본문이 길면 함께 늘어난다 — min-height 150 (A4.md)
  body: {
    minHeight: 150,
    padding: 12,
    borderRadius: paperRadius.field,
    backgroundColor: paperColors.bg.field,
    borderWidth: 1,
    borderColor: paperColors.line.soft,
    fontFamily: paperTypography.fontFamily.regular,
    fontSize: type.body.fontSize,
    lineHeight: Math.round(type.body.fontSize * 1.75),
    color: paperColors.text.primary,
    textAlignVertical: "top",
  },

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

  actions: { flexDirection: "row", gap: 9 },
  action: {
    flex: 1,
    minHeight: theme.touch.minTarget,
    borderRadius: paperRadius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  quiet: {
    borderWidth: 1,
    borderColor: paperColors.line.detail,
    backgroundColor: paperColors.bg.cardOpaque,
  },
  primary: { backgroundColor: paperColors.brand.greenDark },
  actionLabel: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
  primaryLabel: { color: paperColors.text.onFill },

  // 면도 테두리도 없다 — 되돌릴 수 없는 동작이 누르기 쉬워지면 안 된다
  deleteButton: {
    alignSelf: "center",
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  deleteLabel: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    color: paperColors.accent.dangerFill,
  },

  confirm: { gap: 8, paddingVertical: 16, paddingHorizontal: 18 },
  confirmTitle: {
    fontSize: type.bodyLg.fontSize,
    lineHeight: type.bodyLg.lineHeight,
    color: paperColors.text.primary,
  },
  confirmActions: { flexDirection: "row", gap: 9, alignItems: "center", paddingTop: 4 },
});
