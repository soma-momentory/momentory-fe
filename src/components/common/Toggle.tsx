import { Pressable, StyleSheet, View } from "react-native";

import theme from "@/design/theme";
import { toggle } from "@/design/tokens.mvp";

/**
 * 토글 스위치 — `momentory.css` `.sw` · `.swk` · `.swOff` · `.swkOff`.
 *
 * 48×28 트랙에 22 손잡이. 트랙 켜짐은 `primary` 인데 **장식 전용 색이 맞는
 * 자리**다(글자가 얹히지 않는다 — `RULES.md` 「접근성」).
 *
 * **되돌릴 수 있게 만든다** — 토글은 확인 모달 없이 즉시 반영되고 다시 누르면
 * 돌아온다. 이 컴포넌트에 `onConfirm` 류가 없는 이유다.
 *
 * 손잡이가 좌우로 움직이는 것이 상태를 말하므로 **색만으로 표시하지 않는다**.
 */
type Props = {
  value: boolean;
  onChange: (next: boolean) => void;
  accessibilityLabel: string;
};

export function Toggle({ value, onChange, accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      // 28 이라 44 를 hitSlop 으로 채운다
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={[styles.track, value ? styles.trackOn : styles.trackOff]}
    >
      <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: toggle.width,
    height: toggle.height,
    borderRadius: toggle.height / 2,
    justifyContent: "center",
  },
  trackOn: { backgroundColor: toggle.trackOn },
  trackOff: { backgroundColor: toggle.trackOff },
  knob: {
    position: "absolute",
    width: toggle.knob,
    height: toggle.knob,
    borderRadius: toggle.knob / 2,
    // .swk 는 card 색 — 트랙 위에서 항상 밝다
    backgroundColor: theme.colors.semantic.surface,
  },
  knobOn: { right: toggle.inset },
  knobOff: { left: toggle.inset },
});
