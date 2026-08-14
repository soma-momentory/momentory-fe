import { useRef, type ReactNode } from "react";
import { ScrollView, StyleSheet, type ViewProps } from "react-native";

import { chat } from "@/design/tokens.mvp";

/**
 * 대화가 쌓이는 자리. `momentory.css` `.conv` + `.convTop`.
 *
 * ```css
 * .conv{flex:1;display:flex;flex-direction:column;gap:11px}
 * .convTop{justify-content:flex-start;padding-top:8px;overflow-y:auto}
 * ```
 *
 * **상단 정렬 스택**이다 — v2(2026-08-06)가 하단 고정을 뒤집었다. 아래로 몰면
 * 키보드가 올라올 때 바바의 말이 가려졌고, 화면마다 시작 높이가 제각각이라
 * 전환 때 대화가 튀었다(`RULES.md` 「원본과 다른 것」 `04`~`09` · `04.md`).
 * 시작 높이는 `04`~`09` 전부가 공유한다 — 같은 `OnboardingTopBar` 아래에서
 * 같은 paddingTop 으로 시작하면 통일된다.
 *
 * **넘치면 대화 영역만 스크롤된다**(`overflow-y:auto`). 선택지가 많은 `07` 과
 * 작은 기기의 키보드 상황이 이 스크롤을 쓴다 — 상단 제목과 하단 CTA 는
 * 고정이고 대화만 움직인다(`RULES.md` 「812 프레임에서 좁힌 것」).
 *
 * **단계가 바뀌면 비운다**(`RULES.md`). 질문이 넘어갈 때 앞 대화를 남기면
 * 화면이 기록처럼 보이고, 그 기록은 보관함이 할 일이다. 비우는 것은 이 컴포넌트가
 * 아니라 화면 쪽 몫이다 — `key` 를 단계마다 바꾸면 자식이 통째로 새로 그려진다.
 *
 * ⚠ 앞 풍선을 **애니메이션으로 밀지 않는다**. `MOTION.md` 의 `motion.bubble` 이
 * "앞 풍선은 움직이지 않음" 이라고 못박는다. 새 풍선만 220ms 동안 등장한다
 * (`BabaBubble`).
 */
type Props = Omit<ViewProps, "children"> & {
  children: ReactNode;
  /**
   * 새 말이 들어오면 아래로 따라간다 — 회고처럼 대화가 길어지는 화면용.
   * **지난 버블을 지우지는 않는다** — 위로 올리면 그대로 있다(`C4-b.md`).
   * 온보딩은 질문마다 대화를 비우므로 필요 없다.
   */
  stickToEnd?: boolean;
  /**
   * 새 디자인 — 말풍선 사이가 **9** 로 좁다(`회고.dc.html` `gap:9px`).
   * 온보딩도 이 컴포넌트를 쓰므로 기본값(11)은 그대로 두고 회고만 켠다.
   */
  variant?: "default" | "paper";
};

export function ChatLayout({
  children,
  stickToEnd = false,
  variant = "default",
  style,
  ...rest
}: Props) {
  const ref = useRef<ScrollView>(null);

  return (
    <ScrollView
      ref={ref}
      {...rest}
      style={[styles.area, style]}
      contentContainerStyle={[styles.conv, variant === "paper" ? styles.convPaper : null]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        if (stickToEnd) ref.current?.scrollToEnd({ animated: true });
      }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  conv: {
    flexDirection: "column",
    justifyContent: "flex-start", // .convTop — 위에서부터 쌓는다
    gap: chat.gap,
    paddingTop: chat.convTop.paddingTop,
    paddingBottom: chat.convTop.paddingBottom,
  },
  // ── 새 디자인 — 시안 `gap:9px` ─────────────────────────────────────
  convPaper: { gap: 9 },
});
