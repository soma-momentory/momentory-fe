import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { SendIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { paperChat, paperColors, paperShadows } from "@/design/paper";
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
  /**
   * 새 디자인의 **입력 독**(`회고.dc.html`) — 둥근 반투명 입력 칸(`paperChat.dock`)
   * + **42 원형 전송 버튼**. 초점이 오면 테두리가 초록으로 바뀐다.
   *
   * 전송 글리프는 시안의 `↑` 문자가 아니라 선 아이콘(`SendIcon`)이다 —
   * 이모지·특수문자를 쓰지 않는다(`RULES.md` 「아이콘」).
   *
   * 회고 전용 컴포넌트지만 기본값을 남겨 둔다 — chat 폴더의 다른 컴포넌트와
   * 같은 규약이라, 켜는 자리를 화면 코드에서 바로 읽을 수 있다.
   */
  variant?: "default" | "paper";
};

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = "편하게 이야기해주세요",
  variant = "default",
}: Props) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const paper = variant === "paper";
  const ready = text.trim().length > 0 && !disabled;

  const send = () => {
    if (!ready) return;
    onSend(text.trim());
    setText("");
  };

  const field = (
    <TextInput
      value={text}
      onChangeText={setText}
      placeholder={placeholder}
      placeholderTextColor={paper ? paperColors.text.faint : semantic.textSlogan}
      editable={!disabled}
      multiline
      returnKeyType="send"
      onSubmitEditing={send}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      selectionColor={paper ? paperColors.brand.greenDark : semantic.accentInk}
      style={[styles.input, paper ? styles.inputPaper : null]}
      accessibilityLabel="답변"
    />
  );

  return (
    <View style={[styles.row, paper ? styles.rowPaper : styles.rowDefault]}>
      {paper ? (
        <View style={[styles.dock, focused ? styles.dockFocused : null]}>{field}</View>
      ) : (
        field
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="보내기"
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        hitSlop={chatInput.send.hitSlop}
        onPress={send}
        style={[
          styles.send,
          paper ? styles.sendPaper : styles.sendDefault,
          ready ? null : paper ? styles.sendOffPaper : styles.sendOff,
        ]}
      >
        {paper ? (
          <SendIcon />
        ) : (
          <AppText tone="onDark" style={styles.sendMark}>
            ↑
          </AppText>
        )}
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
  },
  rowDefault: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  sendDefault: {
    width: chatInput.send.size,
    height: chatInput.send.size,
    borderRadius: chatInput.send.size / 2,
    backgroundColor: fill.primaryDeep,
  },
  // 잠겨도 사라지지 않는다 — 흐려질 뿐이다
  sendOff: { opacity: 0.36 },
  sendMark: { fontSize: 14, lineHeight: 18 },

  // ── 새 디자인 — 독 ──────────────────────────────────────────────────
  // 독 자체는 면이 없다. 둥근 입력 칸과 원형 버튼 둘만 떠 있다
  rowPaper: { backgroundColor: "transparent" },
  dock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: paperChat.dock.background,
    borderRadius: paperChat.dock.radius,
    // 초점 테두리가 켜질 때 칸 크기가 흔들리지 않게 꺼진 상태도 같은 두께다
    borderWidth: 1.5,
    borderColor: "transparent",
    paddingVertical: 11,
    paddingHorizontal: 16,
    ...paperShadows.flat,
  },
  dockFocused: { borderColor: paperColors.brand.greenBorder },
  inputPaper: { color: paperColors.text.primary },
  sendPaper: {
    width: paperChat.dock.send,
    height: paperChat.dock.send,
    borderRadius: paperChat.dock.send / 2,
    // 흰 글리프가 얹히므로 `brand.green`(2.7)이 아니라 `greenDark` 다 (paper.ts 대비 보정)
    backgroundColor: paperColors.brand.greenDark,
  },
  // 시안은 잠긴 전송을 회색 면으로 바꾼다 — 흐리기만 하면 초록이 남아 눌릴 것처럼 보인다
  sendOffPaper: { backgroundColor: paperColors.neutral.grey },
});
