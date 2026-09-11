import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  background,
  elevation,
  hairline,
  interaction,
  label as labelColor,
  layout,
  primary,
  radius,
  size,
  space,
  text,
} from "@/design/ds";

import { Icon } from "./icons/Icon";

/**
 * Momentory DS — 대화 입력 독 (`Diary.dc.html` ③ 「자유 입력」).
 *
 * 알약 하나 안에 **여러 줄 입력 + 보내기**가 들어간다. 시안:
 * r22 · 면 `background.elevated` · hairline + 옅은 그림자 · 왼쪽 여백 18 ·
 * 입력은 최대 3줄까지 자라고 그 뒤로는 안에서 스크롤된다.
 *
 * ## 비어 있으면 보내지 못한다
 *
 * `DESIGN.md` §7 「전송/확인 — 값이 비면 비활성」. 빈 턴을 보내면 서버가
 * 되물을 말이 없다. **공백만 적은 것도 빈 것으로 본다.**
 *
 * ## 보내기는 44 다
 *
 * 시안의 원 버튼은 40 인데 **44 로 올렸다** — `metrics.layout.minTouch` 가
 * 44 이고(`ds.test` 가 고정한다), 대화 중 가장 자주 눌리는 버튼을 최소 히트
 * 영역 아래로 내릴 이유가 없다. 알약 높이가 4 커지는 것이 대가다.
 */
/**
 * 한 줄일 때 독의 높이 — 보내기(44) + 위아래 여백 + 테두리. 대화 화면이 그림을 **입력창 위에**
 * 앉힐 때 이 값만큼 띄운다(`ChatScaffold` 의 `companionLift`). 여러 줄로 자라도 그림은 따라 뜨지 않는다.
 */
export const CHAT_DOCK_HEIGHT = layout.minTouch + space.xs * 2 + StyleSheet.hairlineWidth * 2;

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  /** 낭독기가 읽을 이름. 무엇을 적는 자리인지가 화면마다 다르다 */
  accessibilityLabel?: string;
  /** 보낸 뒤 응답을 기다리는 동안 — 입력은 살리고 보내기만 잠근다 */
  disabled?: boolean;
};

export function ChatDock({
  value,
  onChangeText,
  onSend,
  placeholder = "답을 적어 주세요",
  accessibilityLabel = "답변",
  disabled = false,
}: Props) {
  const [focused, setFocused] = useState(false);
  const ready = value.trim().length > 0 && !disabled;

  return (
    <View style={[styles.dock, focused ? styles.docked : null]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={labelColor.assistive}
        accessibilityLabel={accessibilityLabel}
        multiline
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.input}
        // 여러 줄 입력이라 return 은 줄바꿈이다 — 보내기는 버튼이 한다
        blurOnSubmit={false}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="보내기"
        accessibilityState={{ disabled: !ready }}
        disabled={!ready}
        onPress={onSend}
        style={[styles.send, ready ? styles.sendReady : styles.sendIdle]}
      >
        <Icon name="send" size={20} color={ready ? labelColor.onFill : labelColor.disabled} />
      </Pressable>
    </View>
  );
}

/** 입력 칸(44) 안에서 body1(26) 을 가운데 두는 위아래 여백 */
const INPUT_PADDING_Y = (layout.minTouch - text.body1.lineHeight) / 2;

const styles = StyleSheet.create({
  dock: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    paddingLeft: space.lg,
    padding: space.xs,
    // §7 이 채팅 입력의 반경을 따로 정해 뒀다 — 카드(16)도 필(999)도 아니다
    borderRadius: size.input.chatRadius,
    backgroundColor: background.elevated,
    ...hairline.neutral,
    ...elevation.floating,
  },
  // 포커스는 테두리 색으로만 말한다 — 면을 바꾸면 글자 대비가 함께 흔들린다
  docked: { borderColor: primary.normal },
  input: {
    flex: 1,
    minWidth: 0,
    /**
     * **한 줄일 때 보내기 버튼과 세로 중심이 맞는다.** 칸을 44(버튼과 같은 높이)로
     * 잡고 위아래 9 씩 나눠 준다 — 26(lineHeight) + 9 + 9 = 44.
     *
     * 안드로이드는 여러 줄 입력의 글자를 **위에 붙이므로** `textAlignVertical` 로
     * 한 번 더 가운데로 당긴다(iOS 는 이 속성이 없고 위 패딩이 그 일을 한다).
     * 플레이스홀더가 칸 위쪽에 떠 보이던 것이 이 자리였다.
     */
    minHeight: layout.minTouch,
    textAlignVertical: "center",
    // 세 줄까지 자라고 그 뒤로는 안에서 스크롤된다 (§7 `maxLines`)
    maxHeight: text.body1.lineHeight * size.input.maxLines + INPUT_PADDING_Y * 2,
    paddingVertical: INPUT_PADDING_Y,
    paddingHorizontal: 0,
    ...text.body1,
    color: labelColor.normal,
  },
  send: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendReady: { backgroundColor: primary.heavy },
  sendIdle: { backgroundColor: interaction.disabled },
});
