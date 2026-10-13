import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";

import { Button, Chip, Screen, Text, TextField, TopNavigation } from "@/components/ds";
import { label as labelColor, layout, space, status } from "@/design/ds";
import { track } from "@/features/analytics";
import {
  INQUIRY_CATEGORIES,
  INQUIRY_MAX_LENGTH,
  sendInquiry,
  type InquiryCategory,
} from "@/features/my/data/inquiryApi";
import { showToast } from "@/lib/toast";

/**
 * 마이 · 문의하기 (2026-10-13 · 시안 없음 — 기본 정보 수정 화면들과 같은 결로 만들었다).
 *
 * 그 전에는 Notion 폼을 앱 안 브라우저로 열었다. 종류 넷 중 하나 + 내용 + 답변 받을 이메일(선택)을 받고,
 * 운영체제 · 앱 버전은 보낼 때 앱이 붙인다(`inquiryApi.ts`). 보내면 토스트 한 줄과 함께 마이로 돌아간다.
 * 실패는 버튼 아래 한 줄로 흡수한다(`RULES.md` 4) — 쓴 글은 그대로 남아 다시 누르면 된다.
 */
// 형식만 거른다 — 정확한 판정은 서버(`@Email`)가 한다
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Inquiry() {
  const [category, setCategory] = useState<InquiryCategory | null>(null);
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const emailInvalid = email.trim().length > 0 && !EMAIL.test(email.trim());
  const ready = category != null && content.trim().length > 0 && !emailInvalid;

  const send = async () => {
    if (sending || category == null) return;
    setSending(true);
    setFailed(false);
    const ok = await sendInquiry({ category, content, replyEmail: email });
    setSending(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    track("inquiry_submitted", { category: category.toLowerCase() as Lowercase<InquiryCategory> });
    showToast("문의를 보냈어요. 꼼꼼히 읽어 볼게요.", "positive");
    router.back();
  };

  return (
    <Screen>
      <TopNavigation leading="arrow-left" title="문의하기" onLeadingPress={() => router.back()} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior="padding"
        keyboardVerticalOffset={layout.keyboardGap}
      >
        <ScrollView
          style={styles.fill}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.group}>
            <Text variant="label1" color={labelColor.neutral}>
              어떤 문의인가요?
            </Text>
            <View style={styles.chips}>
              {INQUIRY_CATEGORIES.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  selected={category === c.id}
                  onPress={() => setCategory(c.id)}
                />
              ))}
            </View>
          </View>

          <TextField
            fieldLabel="내용"
            multiline
            value={content}
            onChangeText={setContent}
            placeholder="불편했던 점이나 바라는 점을 편하게 적어 주세요."
            maxLength={INQUIRY_MAX_LENGTH}
            showCounter
            accessibilityLabel="문의 내용"
          />

          <TextField
            fieldLabel="답변 받을 이메일 (선택)"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            helper={
              emailInvalid
                ? "이메일 주소를 다시 확인해 주세요."
                : "적지 않으면 답변을 드리기 어려울 수 있어요."
            }
            accessibilityLabel="답변 받을 이메일"
          />
        </ScrollView>

        <View style={styles.dock}>
          <Button label="보내기" fill disabled={!ready || sending} onPress={() => void send()} />
          {failed ? (
            <Text variant="caption1" color={status.negative}>
              문의를 보내지 못했어요. 잠시 뒤에 다시 시도해 주세요.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  body: { gap: space.xl2, paddingTop: space.lg, paddingBottom: space.lg },
  group: { gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  dock: { gap: space.sm, paddingTop: space.md },
});
