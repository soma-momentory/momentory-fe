import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";

import {
  interaction,
  label as labelColor,
  line,
  overlay,
  radius,
  size,
  space,
  layout,
} from "@/design/ds";

import { Icon } from "./icons/Icon";
import { Text } from "./Text";

/**
 * 목록 한 줄 — `01 Core Components.dc.html` 의 `ListCell`.
 *
 * 카탈로그가 보여 주는 조합이 그대로 이 컴포넌트의 면이다:
 * 「알림 설정 + `chevron`」 · 「회고 리마인더 + `description` + 스위치(`trailing`)」 ·
 * 「주 시작 요일 + `value` + `chevron`」 · 「데이터 내보내기 + `disabled`」.
 * **없는 조합을 미리 만들지 않는다** — 필요한 화면이 생길 때 늘린다.
 *
 * ## 제목을 노드로도 받는다
 *
 * 기본은 문자열이고 그때는 `body1`(16/24 500) 로 그린다. 홈의 일정 줄처럼
 * **상태가 글자 자체를 바꾸는**(완료 = 취소선 + `label.neutral`) 자리는 제목을
 * 노드로 넘긴다 — 시안도 같은 방식이다(`Home Sample.dc.html` 의 `title` 이
 * `<span>` 이다). 그 대신 여기에 `done` 같은 도메인 상태를 들이지 않는다.
 *
 * ## `compact` — 행 높이를 내용에 맡긴다
 *
 * 기본 줄은 최소 56 이고 스스로 상하 여백을 든다(설정 목록). 홈의 일정 목록은
 * **줄 간격 20 이 리듬을 만들기 때문에**(`design.md` §3 「리스트 행 간(일정) 20」)
 * 줄이 자기 여백을 들면 간격이 두 번 더해진다. 시안이 일정 줄에만
 * `minHeight:0 · paddingTop/Bottom:0 · alignItems:flex-start` 를 얹는 이유다.
 */
export type ListCellProps = {
  /** 문자열이면 `body1` 로 그린다. 상태가 글자를 바꾸는 자리는 노드로 넘긴다 */
  title: ReactNode;
  /** 제목 아래 한 줄 — 설명·메타 */
  description?: string;
  /** 오른쪽에 붙는 **현재 값**(「월요일」). 행동이 아니라 상태다 */
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** 들어가는 줄임을 알리는 `›`. `trailing` 과 함께 쓰지 않는다 */
  chevron?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  /** 줄 간격이 바깥에 있는 목록(홈 일정) — 위아래 여백과 최소 높이를 버린다 */
  compact?: boolean;
  style?: ViewStyle;
};

export function ListCell({
  title,
  description,
  value,
  leading,
  trailing,
  chevron = false,
  disabled = false,
  onPress,
  compact = false,
  style,
}: ListCellProps) {
  const body = (
    <>
      {leading}
      <View style={styles.body}>
        {typeof title === "string" ? (
          <Text variant="body1" color={disabled ? labelColor.disabled : labelColor.normal}>
            {title}
          </Text>
        ) : (
          title
        )}
        {description != null ? (
          <Text variant="caption1" color={labelColor.alternative}>
            {description}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        <Text variant="body2" color={labelColor.neutral} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? (
        <Icon name="chevron-right" size={size.icon.md} color={interaction.inactive} />
      ) : null}
    </>
  );

  const row = [styles.row, compact ? styles.compact : null, style];

  // 누를 수 없는 줄은 Pressable 로 감싸지 않는다 — 낭독기에 「버튼」으로 읽힌다
  if (onPress == null) return <View style={row}>{body}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={row}
    >
      {({ pressed }) => (
        <>
          {body}
          {pressed && !disabled ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/**
 * 줄 사이 — **카드 안에서만** 쓴다.
 *
 * 목록의 경계는 카드가 이미 그린다. 줄마다 선을 두르면 카드 안에 카드가 생긴다 —
 * 그래서 첫 줄 위와 마지막 줄 아래에는 두지 않는다.
 */
export function ListDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    minHeight: layout.minTouch + space.md,
    paddingVertical: space.md,
  },
  // 간격을 바깥이 들 때 — 줄은 내용 높이 그대로다
  compact: { minHeight: 0, paddingVertical: 0, alignItems: "flex-start" },
  // 제목이 남은 폭을 쓴다 — 값·꼬리가 먼저 자리를 잡는다
  body: { flex: 1, minWidth: 0, gap: space.xs2 },
  scrim: { backgroundColor: overlay.pressLight, borderRadius: radius.small },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: line.alternative },
});
