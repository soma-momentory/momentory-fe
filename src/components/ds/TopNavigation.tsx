import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { label as labelColor, layout, space } from "@/design/ds";

import { IconButton } from "./IconButton";
import { Text } from "./Text";
import type { IconName } from "./icons/Icon";

/**
 * 상단 내비 — `DESIGN.md` §10.
 *
 * **높이 44 · 투명 배경 · divider 없다.** 배경을 칠하면 뒤의 32px 격자가 거기서
 * 끊긴다 — 격자가 프레임에 고정돼 이어지는 것이 이 디자인의 바닥이다(§5).
 *
 * - leading: 뒤로 `arrow-left` / 닫기 `close` — **44×44 히트 영역**
 * - trailing: Text Button(건너뛰기·저장) 또는 Icon Button
 * - 제목: **하위 화면만** 표시한다. 탭 루트는 본문의 Title 3 가 제목 노릇을 한다
 *
 * 뒤로와 닫기는 뜻이 다르다(`DESIGN.md` 공통) — **뒤로는 플로우 안에서 한 단계**,
 * **닫기는 플로우를 끝내고 홈으로**. 그래서 `leading` 을 아이콘 이름으로 받는다.
 */
type Props = {
  /** `arrow-left` 뒤로 · `close` 닫기. 없으면 좌측을 비운다 */
  leading?: Extract<IconName, "arrow-left" | "close">;
  onLeadingPress?: () => void;
  /** 하위 화면만. 탭 루트에서는 넘기지 않는다 */
  title?: string;
  /** 우측 — Text Button 이나 IconButton 을 그대로 넣는다 */
  trailing?: ReactNode;
};

export function TopNavigation({ leading, onLeadingPress, title, trailing }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {leading != null ? (
          <IconButton
            name={leading}
            accessibilityLabel={leading === "close" ? "닫기" : "뒤로"}
            onPress={onLeadingPress}
            style={styles.leadingButton}
          />
        ) : null}
      </View>

      {title != null ? (
        <Text variant="headline1" color={labelColor.strong} numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      ) : (
        <View style={styles.title} />
      )}

      <View style={[styles.side, styles.trailing]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 배경을 칠하지 않는다 — 격자가 이어져야 한다
  bar: {
    height: layout.topNav,
    flexDirection: "row",
    alignItems: "center",
  },
  // 좌우를 같은 폭으로 잡아 제목이 가운데에 온다
  side: { minWidth: layout.minTouch, justifyContent: "center" },
  // 히트 영역 44 는 유지하되 화면 좌측 패딩(20) 안쪽에서 시작하도록 당긴다
  leadingButton: { marginLeft: -space.md },
  title: { flex: 1, textAlign: "center" },
  trailing: { alignItems: "flex-end" },
});
