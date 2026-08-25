import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  background,
  elevation,
  label as labelColor,
  layout,
  line,
  overlay,
  radius,
  space,
  zIndex,
} from "@/design/ds";

import { Text } from "./Text";

/**
 * 바텀 시트 — `DESIGN.md` §11.
 *
 * 딤 `overlay.dimmer` · 상단 radius 20 · Elevated 면 · handle · 제목 Heading 1.
 *
 * **시트에는 설정 요소를 늘리지 않는다 — 하나의 결정만 담는다**(§11 마지막 줄).
 * 시트 안에 두 번째 선택지가 생기면 그건 시트가 아니라 화면이다.
 *
 * ## 어디에 놓든 화면 전체를 덮는다
 *
 * 루트가 **절대 배치 + z 3**(§11)이라 라우트로 열든 화면 트리 안에서
 * `{open && <BottomSheet/>}` 로 그리든 같게 동작한다. `flex: 1` 만 두면 후자에서
 * 형제와 자리를 나눠 가져 딤이 콘텐츠를 못 덮는다.
 *
 * ## 닫는 길
 *
 * 딤을 누르면 닫힌다. 이 컴포넌트는 **닫는 방법을 정하지 않고** `onDismiss` 로
 * 올려보낸다 — 시트가 라우트로 열려 있으면 `router.back()` 이 닫기이고, 그래야
 * 기기 뒤로가기·스와이프백이 그대로 닫기가 된다. **닫는 길을 두 벌 만들지 않는다.**
 *
 * 그랩 핸들은 **잡아끌라는 표시가 아니다** — 제스처를 붙이지 않았다. 시트의 성격을
 * 알리는 표식이고, 닫는 길은 딤과 각 시트의 버튼이다.
 *
 * ## 키보드를 시트가 직접 피한다
 *
 * ⚠ **매니페스트의 `adjustResize` 를 믿을 수 없다.** edge-to-edge(Expo SDK 54+)에서
 * 안드로이드 창은 키보드에 밀려 줄지 않고, 키보드가 그 위를 **덮는다** — 앱이 IME
 * 를 inset 으로 직접 소비해야 한다(`features/home/ui/ScheduleEditBar.tsx` 가 같은
 * 사실을 적어 두었다). 그리고 `useSafeAreaInsets()` 에는 키보드가 들어오지 않는다.
 *
 * 그래서 시트가 키보드 높이를 재서 **자기 바닥 여백에 얹는다.** 시트는 화면 바닥에
 * 붙어 있으므로(`justifyContent: "flex-end"`) 바닥 여백이 늘면 그만큼 위로 선다.
 *
 * **`KeyboardAvoidingView` 를 쓰지 않는다.** 그것은 `onLayout` 이 주는 **부모 기준
 * 좌표**로 키보드와의 거리를 재는데, 이 루트는 화면 전체를 덮는 절대 배치라 그
 * 전제가 성립하지 않는다. 또 `behavior="padding"` 은 넘긴 style **뒤에** 자기
 * `paddingBottom` 을 합성해서 아래 `paddingBottom` 과 부딪힌다(`ScheduleEditBar`
 * 가 `keyboardVerticalOffset` 으로 상쇄하는 그 함정이다).
 *
 * ⚠ **키보드 높이를 inset 에 더하지 않고 대신한다.** 키보드는 내비게이션 바 자리를
 * 덮으므로, 둘을 더하면 그만큼 시트가 붕 뜬다.
 */
type Props = {
  children: ReactNode;
  /** Heading 1. 없으면 제목 줄을 두지 않는다 */
  title?: string;
  onDismiss: () => void;
};

/**
 * 지금 키보드가 가리는 높이. 닫혀 있으면 0 이다 (위 머리말).
 *
 * iOS 는 `Will` 로 듣는다 — 애니메이션과 함께 올라와 시트가 같이 움직인다.
 * 안드로이드는 `Will` 이벤트가 없어 `Did` 뿐이다.
 */
const useKeyboardInset = (): number => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const shown = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hidden = Keyboard.addListener(hideEvent, () => setHeight(0));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return height;
};

export function BottomSheet({ children, title, onDismiss }: Props) {
  // 시트는 화면 아래에 붙으므로 **실제 하단 inset** 을 자기가 맡는다
  // (`Screen` 안에 들어가지 않는다). `layout.safeArea`(34)는 iOS 시안 값이라
  // 그대로 쓰면 Android·제스처 내비에서 여백이 뜨거나 시스템 UI 와 겹친다
  // (`metrics.ts` `layout` 주석 · `EXPORT_MANIFEST` §7).
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();

  // 키보드가 올라와 있으면 **그 높이가 바닥 여백을 대신한다** — 키보드가 내비게이션
  // 바를 덮으므로 둘을 더하면 시트가 붕 뜬다(위 머리말). 위에 얹는 `space.md` 는
  // 마지막 줄이 키보드에 딱 붙지 않게 하는 숨이다.
  const bottomPad = keyboard > 0 ? keyboard + space.md : Math.max(insets.bottom, space.xl);

  return (
    <View testID="ds-bottom-sheet-overlay" style={styles.root}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onDismiss}
      />
      {/* inset 이 0 인 기기(버튼 내비 Android 등)에서도 내용이 바닥에 붙지 않게
          최소 여백을 둔다 — 시안의 34 는 iOS 홈 인디케이터 높이 그 자체다 */}
      <View testID="ds-bottom-sheet" style={[styles.sheet, { paddingBottom: bottomPad }]}>
        <View style={styles.handle} />
        {title != null ? (
          <Text variant="heading1" color={labelColor.strong}>
            {title}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // **스스로 화면 전체를 덮는다.** `flex: 1` 만 두면 일반 화면 트리 안에서
  // 조건부로 그렸을 때 형제와 자리를 나눠 가져, 딤이 기존 콘텐츠를 못 덮고
  // 시트가 화면 하단이 아니라 「할당된 칸」 하단에 붙는다.
  // z 값은 `DESIGN.md` §11 —— 시트·모달은 콘텐츠보다 위(3)다.
  // 네 변을 직접 적는다 — `StyleSheet.absoluteFillObject` 를 펼치면 값이 남지 않는 환경이 있다
  root: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: zIndex.overlay,
    justifyContent: "flex-end",
    backgroundColor: overlay.dimmer,
  },
  sheet: {
    backgroundColor: background.elevated,
    borderTopLeftRadius: radius.xlarge,
    borderTopRightRadius: radius.xlarge,
    paddingHorizontal: layout.screenPadding,
    paddingTop: space.md,
    // paddingBottom 은 실제 inset 이라 컴포넌트에서 넣는다 (위 주석)
    gap: space.lg,
    ...elevation.overlay,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: line.neutral,
    alignSelf: "center",
  },
});
