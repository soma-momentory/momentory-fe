import { Pressable, StyleSheet, View } from "react-native";

import {
  background,
  fill,
  hairline,
  interaction,
  label as labelColor,
  radius,
  space,
} from "@/design/ds";

import { Icon, type IconName } from "./icons/Icon";

/**
 * 뷰 스위처 — 같은 내용을 **다른 방식으로 보는** 두세 갈래를 제목 옆에서 바꾼다
 * (`Archive.dc.html` 「캘린더/리스트 전환은 제목 우측의 작은 아이콘 스위처」).
 *
 * 탭이 아니다 — 다른 화면으로 가지 않고 **같은 화면의 표현만** 바뀐다.
 * 그래서 하단 탭(`BottomNavigation`)과 생김새를 나누지 않았다.
 *
 * ## 선택을 색만으로 표시하지 않는다
 *
 * 글자가 없는 스위처라 굵기로 말할 수 없다 → **면 + hairline + 아이콘 색** 셋을
 * 함께 바꾼다(`RULES.md` 「색만으로 선택 표시 금지」). 낭독기에는
 * `accessibilityState.selected` 로 같은 것을 말한다.
 *
 * 아이콘만 있는 버튼이라 **이름이 필수다** — 「달력으로 보기」처럼 **행동**을 적는다.
 */
export type ViewOption<T extends string> = {
  name: T;
  icon: IconName;
  /** 낭독기가 읽을 이름 — 「달력으로 보기」 */
  accessibilityLabel: string;
};

type Props<T extends string> = {
  options: readonly ViewOption<T>[];
  active: T;
  onChange: (name: T) => void;
};

export function ViewSwitcher<T extends string>({ options, active, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const on = option.name === active;
        return (
          <Pressable
            key={option.name}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={option.accessibilityLabel}
            // 시각 32 · 히트 44 — (44 - 32) / 2
            hitSlop={6}
            onPress={() => onChange(option.name)}
            style={[styles.button, on ? styles.buttonOn : null]}
          >
            <Icon
              name={option.icon}
              size={20}
              color={on ? labelColor.normal : interaction.inactive}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const BUTTON = 32;

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs2,
    padding: space.xs2,
    borderRadius: radius.small,
    backgroundColor: fill.alternative,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.small,
  },
  // 고른 쪽만 면이 올라온다 — 면·테두리·아이콘 색 셋이 함께 바뀐다
  buttonOn: { backgroundColor: background.elevated, ...hairline.neutral },
});
