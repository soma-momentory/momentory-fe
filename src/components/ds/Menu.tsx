import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  background,
  elevation,
  hairline,
  label as labelColor,
  layout,
  overlay,
  radius,
  size,
  space,
  status,
  zIndex,
} from "@/design/ds";

import { Icon, type IconName } from "./icons/Icon";
import { Text } from "./Text";

/**
 * ⋮ 메뉴 — `01 Core Components.dc.html` 의 `Menu` · `MenuItem`.
 *
 * `DESIGN.md` 「일정」: 「⋮ 메뉴: **바깥 탭하면 닫힘**, ⋮ 다시 누르면 열림.
 * 수정 / 삭제(negative)」. 두세 줄짜리 행동 목록이고 **설정을 담지 않는다** —
 * 담아야 하면 그건 메뉴가 아니라 시트다(`BottomSheet`).
 *
 * ## 시트가 아니라서 라우트가 아니다
 *
 * 홈의 입력 바(`12-c`·`12-e`)는 **라우트**다 — 뒤로가기가 닫기여야 하기 때문이다.
 * 메뉴는 다르다: 누른 자리에 잠깐 떠서 **행동 하나를 고르면 사라지는** 것이라
 * 이력에 남을 것이 없다. 여는 화면이 상태로 들고, 여기서는 그리기만 한다.
 *
 * ## 자리
 *
 * 시안은 ⋮ 아래에 **오른쪽 정렬**로 붙인다. 가로는 늘 화면의 좌우 여백(20)에
 * 맞추고, 세로만 `top` 으로 받는다 — ⋮ 는 언제나 줄의 오른쪽 끝이라 가로를
 * 매번 재는 것은 같은 값을 다시 구하는 일이다.
 *
 * **스스로 화면 전체를 덮는다**(`BottomSheet` 와 같은 이유) — 바깥 탭을 받으려면
 * 딤 없는 레이어가 콘텐츠 전체 위에 있어야 한다.
 */
export type MenuAction = {
  label: string;
  icon?: IconName;
  /** 되돌릴 수 없는 행동 — 글자와 아이콘이 `status.negative` 가 된다 */
  negative?: boolean;
  onPress: () => void;
};

type Props = {
  actions: readonly MenuAction[];
  /** 패널 위쪽 y — 보통 ⋮ 를 누른 지점 바로 아래 */
  top: number;
  /** 하단에서 뒤집어 띄울 때 사용할 ⋮ 버튼의 위쪽 y */
  anchorTop?: number;
  /** 패널이 침범하지 않을 탭바·홈 인디케이터 높이 */
  bottomInset?: number;
  onDismiss: () => void;
};

/** 시안의 메뉴 폭 (`Schedule.dc.html` 4-2 `menuWidth`) */
const MENU_WIDTH = 168;

/** 공간이 부족하면 행 위로 뒤집고, 어느 쪽도 부족하면 가용 높이 안에 고정한다. */
export function anchoredMenuTop(
  desiredTop: number,
  anchorTop: number,
  viewportHeight: number,
  bottomInset: number,
  actionCount: number,
) {
  const menuHeight = actionCount * space.xl4 + space.xs * 2;
  const lowerEdge = viewportHeight - bottomInset - space.sm;
  if (desiredTop + menuHeight <= lowerEdge) return desiredTop;
  const above = anchorTop - space.sm - menuHeight;
  if (above >= space.sm) return above;
  return Math.max(space.sm, Math.min(desiredTop, lowerEdge - menuHeight));
}

export function Menu({ actions, top, anchorTop, bottomInset = 0, onDismiss }: Props) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const panelTop =
    anchorTop != null && viewportHeight > 0
      ? anchoredMenuTop(top, anchorTop, viewportHeight, bottomInset, actions.length)
      : top;
  return (
    <View
      testID="ds-menu-overlay"
      style={styles.root}
      onLayout={
        anchorTop == null
          ? undefined
          : (event) => setViewportHeight(event.nativeEvent.layout.height)
      }
    >
      {/* 딤이 없다 — 뒤가 계속 보여야 무엇에 대한 메뉴인지 잃지 않는다 */}
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="메뉴 닫기"
        onPress={onDismiss}
      />
      <View
        testID="ds-menu-panel"
        style={[
          styles.panel,
          { top: panelTop, opacity: anchorTop != null && !viewportHeight ? 0 : 1 },
        ]}
      >
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="menuitem"
            onPress={action.onPress}
            style={styles.item}
          >
            {({ pressed }) => (
              <>
                {action.icon != null ? (
                  <Icon
                    name={action.icon}
                    size={size.icon.md}
                    color={action.negative === true ? status.negative : labelColor.neutral}
                  />
                ) : null}
                <Text
                  variant="body2"
                  color={action.negative === true ? status.negative : labelColor.normal}
                >
                  {action.label}
                </Text>
                {pressed ? (
                  <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
                ) : null}
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: zIndex.overlay },
  panel: {
    position: "absolute",
    right: layout.screenPadding,
    width: MENU_WIDTH,
    paddingVertical: space.xs,
    backgroundColor: background.elevated,
    borderRadius: radius.medium,
    ...hairline.neutral,
    ...elevation.overlay,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: space.xl4,
    paddingHorizontal: space.md,
  },
  scrim: { backgroundColor: overlay.pressLight },
});
