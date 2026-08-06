import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from "react-native";

import { Sheet, SheetHeader } from "@/components/common/Sheet";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { toneBox } from "@/design/tokens.mvp";
import { useDay } from "@/features/home/model/day";

/**
 * `12-e` · 일정 직접 추가 · 입력 시트
 *
 * **제목 하나만 받는다.** 시간·장소·반복을 받으면 캘린더 앱이 된다 — 여기서
 * 필요한 것은 밤에 "그런 일이 있었지"를 떠올릴 실마리뿐이다.
 *
 * - **`Schedule.time` 은 MVP 에서 항상 `null`** — 시간 입력이 없으므로 홈 목록도
 *   시간순이 아니라 들어온 순서다
 * - 안내는 **양방향을 다 말한다** — 여기서 만든 일정은 캘린더로 나가지 않고,
 *   캘린더에서 온 일정은 여기서 고칠 수 없다(`12-c`)
 * - **저장은 상단 우측 한 곳.** 제목이 비면 저장이 잠긴다
 */
export default function NewSchedule() {
  const addSchedule = useDay((s) => s.addSchedule);
  const [title, setTitle] = useState("");
  const ready = title.trim().length > 0;

  const save = () => {
    if (!ready) return;
    addSchedule(title);
    router.back();
  };

  return (
    <Sheet>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SheetHeader title="일정 추가" onSave={save} saveDisabled={!ready} />

        <View style={styles.field}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={save}
            selectionColor={theme.colors.semantic.accentInk}
            style={styles.input}
            accessibilityLabel="일정 제목"
          />
          {/* 밑줄만 강조한다 — 사각 입력칸을 두면 시트 안에 카드가 하나 더 생긴다 */}
          <View style={styles.underline} />
        </View>

        <AppText variant="caption" tone="caption">
          한 단어여도 괜찮아요 · 제목만 적어도 저장돼요
        </AppText>

        {/* 양방향을 다 말한다 — 나가지도 않고, 들어온 것을 고치지도 않는다 */}
        <View style={styles.notice}>
          <AppText tone="body" weight="500" style={styles.noticeText}>
            이 일정은 <AppText tone="strong" weight="700">모멘토리에만</AppText> 저장돼요.
            {"\n"}캘린더에는 추가되지 않아요.
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  field: { gap: 8 },
  input: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15.5,
    lineHeight: 23.25,
    color: semantic.textPrimary,
    minHeight: 34,
    padding: 0,
  },
  // primary 45% — 장식 전용 색이 맞는 자리(글자가 얹히지 않는다)
  underline: { height: 1.5, backgroundColor: `${semantic.accent}73` },
  notice: {
    paddingVertical: 13,
    paddingHorizontal: 15,
    backgroundColor: semantic.surfaceTone,
    borderRadius: toneBox.radius - 2,
  },
  noticeText: { fontSize: 12.5, lineHeight: 18.75 },
});
