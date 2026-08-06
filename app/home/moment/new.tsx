import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from "react-native";

import { Sheet, SheetHeader } from "@/components/common/Sheet";
import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { useDay } from "@/features/home/model/day";
import { formatKoreanTime, toHHMM } from "@/lib/time";

/**
 * `12-d` · 순간 입력
 *
 * **한 줄이면 충분하다고 화면이 말한다.** 제목·태그·감정 선택을 붙이면 순간이
 * 일기가 되고, 일기가 되면 낮에 적히지 않는다.
 *
 * - **시각을 함께 보여준다** — 저장되는 순간이 곧 그 시각이지만, 밤에 되읽을 때
 *   낮의 어느 지점이었는지가 순간의 절반이다(2026-08-05 에 뺐던 줄을 상류가
 *   되살렸다)
 * - **감정을 함께 묻지 않는다** — 순간은 감정 기록이 아니다. 감정은 `C3` 의
 *   시작 감정과 일정별 감정에서만 정해진다
 * - **저장은 상단 우측 한 곳**이고 `[취소]` 는 좌측이다 — 하단에 큰 버튼을 두면
 *   키보드와 겹친다
 * - 순간은 **개수를 세지 않는다**
 * - **그랩 핸들을 두지 않는다** — 키보드가 바로 올라와 시트가 끝까지 찬다
 */
export default function NewMoment() {
  const addMoment = useDay((s) => s.addMoment);
  const [text, setText] = useState("");
  // 열린 시각을 고정한다 — 적는 동안 분이 넘어가도 화면의 시각이 바뀌지 않게
  const [openedAt] = useState(() => toHHMM(new Date()));

  const save = () => {
    addMoment(text);
    router.back();
  };

  return (
    <Sheet grab={false}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <SheetHeader title="순간 남기기" onSave={save} saveDisabled={text.trim().length === 0} />

        <AppText variant="caption" tone="caption" style={styles.time}>
          {formatKoreanTime(openedAt)}
        </AppText>

        <TextInput
          value={text}
          onChangeText={setText}
          // placeholder 를 두지 않는다 — 각주가 이미 무엇을 적는지 말한다
          multiline
          autoFocus
          selectionColor={theme.colors.semantic.accentInk}
          style={styles.body}
          accessibilityLabel="순간"
        />

        <AppText variant="footnote" tone="caption">
          정리하지 않아도 괜찮아요 · 한 줄이면 충분해요
        </AppText>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  time: { fontSize: 12, lineHeight: 18 },
  body: {
    fontFamily: "Pretendard-Regular",
    fontSize: 15.5,
    lineHeight: 26.35,
    color: semantic.textPrimary,
    // 한 줄로 시작하되 길어지면 늘어난다 — 높이를 미리 크게 잡으면 "많이 쓰라"가 된다
    minHeight: 26.35,
    padding: 0,
    textAlignVertical: "top",
  },
});
