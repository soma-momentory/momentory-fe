import { type ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { chat } from "@/design/tokens.mvp";

/**
 * 내가 고른 답. `momentory.css` `.bubme`.
 *
 * ```css
 * .bubme{background:#241F19;border-radius:20px 20px 6px 20px;padding:12px 16px;
 *        font:500 14.5px/1.5;color:var(--textOnDark);align-self:flex-end;max-width:280px}
 * ```
 *
 * 꼬리가 **오른쪽 아래**(bottomRight 6)라 바바 풍선과 좌우로 마주 본다.
 * 면이 잉크색이라 글자는 `textOnDark` 하나뿐이다.
 *
 * **답하지 않아도 버블은 남긴다** — "알려주고 싶지 않아요" 도 하나의 답이다(`RULES.md`).
 * 그래서 빈 상태를 위한 별도 변형을 두지 않는다. 문구를 넣어 부르면 된다.
 */
type Props = Omit<ViewProps, "children"> & {
  children: ReactNode;
};

export function AnswerBubble({ children, style, ...rest }: Props) {
  return (
    <View accessibilityRole="text" {...rest} style={[styles.bubble, style]}>
      <AppText tone="onDark" weight="500" style={styles.text}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: "flex-end",
    maxWidth: chat.answer.maxWidth,
    backgroundColor: theme.colors.semantic.textPrimary, // #241F19 — 면으로 쓰는 잉크
    borderTopLeftRadius: chat.answer.radius.topLeft,
    borderTopRightRadius: chat.answer.radius.topRight,
    borderBottomRightRadius: chat.answer.radius.bottomRight,
    borderBottomLeftRadius: chat.answer.radius.bottomLeft,
    paddingVertical: chat.answer.paddingVertical,
    paddingHorizontal: chat.answer.paddingHorizontal,
  },
  // css 14.5px/1.5 = 21.75. typography 에 없는 조합.
  text: { fontSize: 14.5, lineHeight: 21.75 },
});
