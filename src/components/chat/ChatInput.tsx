import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { chatInput, fill } from "@/design/tokens.mvp";

/**
 * 회고 답변 입력 — `momentory.css` `.inp` · `.inpt` · `.send`.
 *
 * ```css
 * .inp{gap:9px;padding:7px 7px 7px 16px;background:#FBF6EC;
 *      border:1px solid rgba(36,31,25,.12);border-radius:999px}
 * .send{width:40px;height:40px;border-radius:50%;background:var(--primaryDeep)}
 * ```
 *
 * **빠른 답변 칩·예시 placeholder 를 두지 않는다**(`C4.md`) — 보기를 주면
 * 사용자는 자기 말 대신 보기 중 하나를 고른다. placeholder 는 예시가 아니라
 * 권유 한 줄("편하게 이야기해주세요")이다.
 *
 * 보내기는 **비어 있으면 잠긴다** — 빈 버블을 만들지 않는다. 잠긴 채로도
 * 사라지지 않아 무엇을 하면 되는지가 계속 보인다.
 */
type Props = {
  onSend: (text: string) => void;
  /** 바바가 답을 쓰는 동안 · 방향을 기다리는 동안 잠근다 */
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "편하게 이야기해주세요",
}: Props) {
  const [text, setText] = useState("");
  const ready = text.trim().length > 0 && !disabled;

  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={semantic.textSlogan}
        editable={!disabled}
        multiline
        returnKeyType="send"
        onSubmitEditing={send}
        selectionColor={semantic.accentInk}
        style={styles.input}
        accessibilityLabel="답변"
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="보내기"
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        hitSlop={chatInput.send.hitSlop}
        onPress={send}
        style={[styles.send, ready ? null : styles.sendOff]}
      >
        <AppText tone="onDark" style={styles.sendMark}>
          ↑
        </AppText>
      </Pressable>
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: chatInput.gap,
    paddingVertical: chatInput.paddingVertical,
    paddingLeft: chatInput.paddingLeft,
    paddingRight: chatInput.paddingRight,
    backgroundColor: semantic.surface,
    borderWidth: 1,
    borderColor: chatInput.border,
    borderRadius: theme.radius.pill,
  },
  input: {
    flex: 1,
    fontFamily: "Pretendard-Regular",
    fontSize: chatInput.fontSize,
    lineHeight: chatInput.fontSize * 1.4,
    color: semantic.textPrimary,
    // 알약 안이라 세로 가운데가 어긋나면 바로 보인다
    padding: 0,
    // 여러 줄이 되어도 알약이 지나치게 자라지 않게
    maxHeight: chatInput.fontSize * 1.4 * 4,
  },
  send: {
    width: chatInput.send.size,
    height: chatInput.send.size,
    borderRadius: chatInput.send.size / 2,
    backgroundColor: fill.primaryDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  // 잠겨도 사라지지 않는다 — 흐려질 뿐이다
  sendOff: { opacity: 0.36 },
  sendMark: { fontSize: 14, lineHeight: 18 },
});
