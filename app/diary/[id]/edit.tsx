import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { EmotionGrid } from "@/components/common/EmotionGrid";
import { RetroNav } from "@/components/common/RetroNav";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme, { type EmotionId } from "@/design/theme";
import { diaryBody, home, text as textColor, warnRow } from "@/design/tokens.mvp";
import { useDiary } from "@/features/diary/model/diary";

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
 * - 고른 칩에는 **체크**를 붙여 색에 기대지 않게 한다
 * - **`[이 회고 삭제]` 는 무엇이 사라지는지 먼저 말한다.** 라벨이 「이 일기
 *   삭제」가 아닌 것은 지워지는 것이 일기 한 면이 아니라 **회고 한 벌**이기 때문
 * - **`dangerInk` 는 글자에만** 얹고 면을 채우지 않는다(`R-40`). 테두리는
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
    <ScreenBackground>
      <RetroNav title="일기 수정" rest={false} />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          {/* 「이날의 감정」이 아니다 — 원본 감정을 고치는 것처럼 보이면 안 된다 */}
          <AppText tone="accent" weight="600" style={styles.section}>
            이 일기의 감정 태그
          </AppText>
          <AppText variant="caption" tone="caption">
            목록과 필터에 표시할 감정이에요 · 여러 개 선택할 수 있어요
          </AppText>
          <EmotionGrid selected={emotions} onToggle={toggle} showCheck />
        </Card>

        <Card style={styles.card}>
          <AppText tone="accent" weight="600" style={styles.section}>
            일기 내용
          </AppText>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={diaryBody.maxLength}
            selectionColor={semantic.accentInk}
            style={styles.body}
            accessibilityLabel="일기 내용"
          />
        </Card>

        {/* 무엇이 안 바뀌는지를 먼저 말한다 */}
        <View style={styles.warn}>
          <AppText tone="accent" weight="500" style={styles.warnText}>
            {
              "수정한 내용은 '내가 남긴 오늘'에만 반영돼요. 바바의 문장과 행동 카드는 회고를 마친 당시 내용 그대로 남아요."
            }
          </AppText>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="취소"
            variant="ghost"
            style={styles.action}
            onPress={() => router.back()}
          />
          <AppButton label="저장" style={styles.action} onPress={save} />
        </View>

        {/* dangerInk 는 글자에만 — 면도 테두리도 채우지 않는다 */}
        {!confirmDelete ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => setConfirmDelete(true)}
            style={styles.deleteButton}
          >
            <AppText weight="500" style={styles.deleteLabel}>
              이 회고 삭제
            </AppText>
          </Pressable>
        ) : (
          <Card style={styles.confirm}>
            <AppText tone="strong" weight="600" style={styles.confirmTitle}>
              이 회고를 삭제할까요?
            </AppText>
            {/* 무엇이 사라지는지 먼저 말한다 */}
            <AppText variant="caption" tone="caption">
              내 문장, 바바의 문장, 행동 카드가 함께 삭제돼요.
            </AppText>
            <View style={styles.confirmActions}>
              <AppButton
                label="취소"
                variant="ghost"
                style={styles.action}
                onPress={() => setConfirmDelete(false)}
              />
              <Pressable
                accessibilityRole="button"
                onPress={confirmRemove}
                style={styles.deleteConfirm}
              >
                <AppText weight="600" style={styles.deleteLabel}>
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

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: theme.layout.gap.element,
    paddingHorizontal: theme.layout.screenMargin,
    paddingVertical: theme.layout.gap.element,
  },

  card: { gap: 10 },
  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  // 본문이 길면 함께 늘어난다 — min-height 150 (A4.md)
  body: {
    minHeight: 150,
    fontFamily: "Pretendard-Regular",
    fontSize: diaryBody.fontSize,
    lineHeight: diaryBody.lineHeight,
    color: semantic.textPrimary,
    padding: 0,
    textAlignVertical: "top",
  },

  warn: {
    borderRadius: warnRow.radius,
    paddingVertical: warnRow.paddingVertical,
    paddingHorizontal: warnRow.paddingHorizontal,
    backgroundColor: warnRow.background,
  },
  warnText: { fontSize: warnRow.fontSize, lineHeight: warnRow.fontSize * 1.55 },

  actions: { flexDirection: "row", gap: 9 },
  action: { flex: 1 },

  // 면도 테두리도 없다 — 되돌릴 수 없는 동작이 누르기 쉬워지면 안 된다
  deleteButton: {
    alignSelf: "center",
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  deleteConfirm: {
    flex: 1,
    minHeight: 48,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    // 중립 테두리 — [취소] 와 같다. 색으로 구분하지 않는다
    borderColor: `${semantic.textPrimary}2E`,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: { fontSize: 13.5, lineHeight: 13.5, color: textColor.danger },

  confirm: { gap: 8, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  confirmTitle: { fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 9, alignItems: "center", paddingTop: 4 },
});
