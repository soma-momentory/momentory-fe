import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { label as labelColor, space } from "@/design/ds";
import { myPaper as paper } from "@/design/ds/myPaper";

import { Icon, type IconName } from "./icons/Icon";
import { MaskingTape } from "./MaskingTape";
import { Text } from "./Text";

/**
 * 종이 묶음 — 형광펜 제목 + 테이프 붙은 흰 종이 + 점선으로 나뉜 줄(`PaperRow`).
 * 마이(M1)에서 처음 만들었고, 기본 정보 수정 · 온보딩 입력이 같은 종이를 쓴다(2026-11-10 · 사용자 요청).
 * 묶음마다 다른 것은 형광펜 · 테이프 · 아이콘 점 색과 기울기뿐이다(`DESIGN.md` 「마이」).
 */
export type PaperTone = "settings" | "support" | "account";

export function PaperGroup({
  label,
  tone = "settings",
  note,
  children,
  padded = false,
  style,
}: {
  /** 형광펜 제목. 없으면 종이만 둔다 — 말풍선이 이미 물었을 때 */
  label?: string;
  tone?: PaperTone;
  /** 종이 아래 한 줄 — 안내 · 실패 */
  note?: ReactNode;
  children: ReactNode;
  /** 줄(`PaperRow`)이 아니라 입력 · 칩을 담을 때 — 위아래 숨을 준다 */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.group, style]}>
      {label != null ? (
        <View style={styles.heading}>
          <View style={[styles.highlight, HIGHLIGHTS[tone]]} />
          <Text variant="body1ReadingHandLg" color={labelColor.strong}>
            {label}
          </Text>
        </View>
      ) : null}
      <View style={[styles.card, CARDS[tone], padded ? styles.cardPadded : null]}>
        <View pointerEvents="none" style={[styles.tape, TAPES[tone]]}>
          <MaskingTape color={TAPE_COLORS[tone]} />
        </View>
        {children}
      </View>
      {typeof note === "string" ? (
        <Text variant="caption1" color={labelColor.alternative} style={styles.note}>
          {note}
        </Text>
      ) : (
        note
      )}
    </View>
  );
}

/** 종이 묶음 안의 한 줄. 갈 곳이 없으면(`onPress` 없음) 눌리지 않고 꺾쇠도 없다 */
export function PaperRow({
  title,
  icon,
  value,
  tone = "settings",
  onPress,
  divided = false,
  accessibilityLabel,
}: {
  title: string;
  icon?: IconName;
  value?: string;
  tone?: PaperTone;
  onPress?: () => void;
  /** 위 줄과 점선으로 나눈다 — 묶음의 첫 줄은 두지 않는다 */
  divided?: boolean;
  accessibilityLabel?: string;
}) {
  const content = (
    <>
      {icon != null ? (
        <View style={[styles.iconDot, DOTS[tone]]}>
          <Icon name={icon} size={16} color={labelColor.neutral} />
        </View>
      ) : null}
      <Text variant="body1ReadingHandLg" color={labelColor.normal} style={styles.rowTitle}>
        {title}
      </Text>
      {value != null ? (
        <Text
          variant="body1ReadingHand"
          color={labelColor.neutral}
          style={styles.rowValue}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {onPress != null ? (
        <Icon name="chevron-right" size={16} color={labelColor.alternative} />
      ) : null}
    </>
  );
  const rowStyle = [styles.row, divided ? styles.rowDivided : null];

  if (onPress == null) return <View style={rowStyle}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={rowStyle}
    >
      {content}
    </Pressable>
  );
}

const CARDS = {
  settings: { transform: [{ rotate: "-0.8deg" }] },
  support: { transform: [{ rotate: "0.7deg" }] },
  account: { transform: [{ rotate: "-0.5deg" }] },
} as const;

const DOTS = {
  settings: { backgroundColor: paper.settingsDot },
  support: { backgroundColor: paper.supportDot },
  account: { backgroundColor: paper.accountDot },
} as const;

const HIGHLIGHTS = {
  settings: { backgroundColor: paper.settingsDot },
  support: { backgroundColor: paper.supportTape },
  account: { backgroundColor: paper.accountTape },
} as const;

const TAPE_COLORS = {
  settings: paper.settingsDot,
  support: paper.supportTape,
  account: paper.accountTape,
} as const;

const TAPES = {
  settings: { transform: [{ rotate: "-4deg" }] },
  support: { transform: [{ rotate: "3deg" }] },
  account: { transform: [{ rotate: "-2deg" }] },
} as const;

const styles = StyleSheet.create({
  group: { gap: 8 },
  heading: { alignSelf: "flex-start", marginLeft: 4, paddingHorizontal: 2 },
  highlight: { position: "absolute", left: 0, right: 0, bottom: 4, height: 9 },
  card: {
    backgroundColor: paper.group,
    borderRadius: 9,
    paddingHorizontal: 12,
    shadowColor: paper.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPadded: { paddingVertical: space.md, gap: space.md },
  tape: { position: "absolute", top: -7, right: 17, width: 46, height: 14, opacity: 0.8 },
  note: { marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingVertical: 8 },
  rowDivided: { borderTopWidth: 1, borderColor: paper.rule, borderStyle: "dashed" },
  iconDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { flex: 1, minWidth: 0 },
  rowValue: { maxWidth: "42%", textAlign: "right", flexShrink: 1 },
});
