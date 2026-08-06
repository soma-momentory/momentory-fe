import { type ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";

import { chat } from "@/design/tokens.mvp";

/**
 * 대화가 쌓이는 자리. `momentory.css` `.conv`.
 *
 * ```css
 * .conv{flex:1;display:flex;flex-direction:column;gap:11px;
 *       justify-content:flex-end;padding-bottom:4px;overflow:hidden}
 * ```
 *
 * **하단 고정 스택**이다 — `justify-content:flex-end` 라 대화가 아래에 붙고,
 * 새 풍선이 들어오면 앞의 것이 위로 밀려 올라가며 넘치는 만큼 **위가 잘린다**
 * (`overflow:hidden`). 스크롤이 아니다. 지난 말을 다시 읽는 화면이 아니라
 * 지금 묻는 말에 답하는 화면이라, 위로 올려 되짚는 동작을 만들지 않는다.
 *
 * **단계가 바뀌면 비운다**(`RULES.md`). 질문이 넘어갈 때 앞 대화를 남기면
 * 화면이 기록처럼 보이고, 그 기록은 보관함이 할 일이다. 비우는 것은 이 컴포넌트가
 * 아니라 화면 쪽 몫이다 — `key` 를 단계마다 바꾸면 자식이 통째로 새로 그려진다.
 *
 * ⚠ 앞 풍선을 **애니메이션으로 밀지 않는다**. `MOTION.md` 의 `motion.bubble` 이
 * "앞 풍선은 움직이지 않음" 이라고 못박는다. 새 풍선만 220ms 동안 등장한다
 * (`BabaBubble`). `COMPONENTS.md` 의 "위로 밀려 올라감(160ms)" 은 근거가 없다
 * (`OPEN-ISSUES.md` `R-41`·`R-43`).
 */
type Props = Omit<ViewProps, "children"> & {
  children: ReactNode;
};

export function ChatLayout({ children, style, ...rest }: Props) {
  return (
    <View {...rest} style={[styles.conv, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  conv: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-end", // 하단 고정
    gap: chat.gap,
    paddingBottom: 4,
    overflow: "hidden", // 넘치면 위가 잘린다
  },
});
