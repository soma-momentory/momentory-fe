import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  background,
  elevation,
  label as labelColor,
  layout,
  line,
  fill,
  overlay,
  primary,
  radius,
  sheetMotion,
  space,
  zIndex,
} from "@/design/ds";

import { IconButton } from "./IconButton";
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
 * **손잡이를 쓸어내려도 닫힌다**(2026-10-12 · 쉼 추천 시트에서 정함). 끌 수 있는 자리는
 * **손잡이와 제목 줄뿐이다** — 시트 전체에 붙이면 안의 휠 · 목록 스크롤과 손짓을 다툰다.
 * 덜 내리면 제자리로 돌아가고, 충분히 내리면 `onDismiss` 다. 딤 · ✕ ·
 * 쓸어내리기 셋이 **같은 `onDismiss`** 를 부른다 — 닫는 길이 늘어도 닫기는 하나다.
 *
 * ## 아래에서 올라온다
 *
 * 열리면 화면 아래에서 올라오고 딤이 같은 시간에 짙어진다(`sheetMotion.rise`). 화면 사이의
 * 전환(fade 하나)과는 다른 것이다 — 시트는 화면이 아니라 화면 위에 뜨는 것이다.
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
  /** 제목 위의 작은 한 줄 — 왜 이 시트가 떴는지 짧게 말한다(쉼 추천의 「바바가 하나 골라 봤어요」) */
  eyebrow?: string;
  /** 제목 줄 오른쪽에 ✕ 를 둔다 — 누르면 딤과 같은 `onDismiss` 다 */
  closable?: boolean;
  onDismiss: () => void;
};

/**
 * 화면 바닥에서 **키보드 윗변까지의 거리**. 닫혀 있으면 0 이다 (위 머리말).
 *
 * ⚠ **`endCoordinates.height` 를 쓰지 않는다.** 그 값은 안드로이드 edge-to-edge 에서
 * **내비게이션 바를 뺀 높이**로 온다. 그런데 이 시트는 화면 전체를 덮는 절대 배치
 * 안에 있어 **내비 바 뒤까지** 뻗어 있으므로, 그 높이를 그대로 바닥 여백으로 쓰면
 * 딱 내비 바만큼(약 48dp) 모자라 **마지막 버튼이 키보드에 잘린다.**
 * 실기기(Galaxy S25 · 3버튼 내비)에서 실제로 그렇게 잘렸다.
 *
 * 그래서 높이가 아니라 **좌표**로 잰다: 키보드 윗변의 화면 좌표(`screenY`)에서
 * 화면 높이까지가 곧 우리가 비워야 할 자리다 — **무엇이 포함되고 빠졌는지 짐작할
 * 필요가 없어진다.** 내비 바가 있든 없든, 제스처든 3버튼이든 같은 식이다.
 *
 * `screen` 을 쓰는 것도 같은 이유다(`window` 가 아니다) — edge-to-edge 에서 창은
 * 시스템 바 뒤까지 가고, 시트도 거기까지 간다.
 *
 * iOS 는 `Will` 로 듣는다 — 애니메이션과 함께 올라와 시트가 같이 움직인다.
 * 안드로이드는 `Will` 이벤트가 없어 `Did` 뿐이다.
 */
const useKeyboardInset = (): number => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const shown = Keyboard.addListener(showEvent, (e) => {
      const end = e.endCoordinates;
      if (end == null) return;
      // 좌표가 없거나 말이 안 되면 높이로 물러선다 — 못 재는 것보다 낫다
      const fromCoordinate = Dimensions.get("screen").height - end.screenY;
      setInset(fromCoordinate > 0 ? fromCoordinate : (end.height ?? 0));
    });
    const hidden = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return inset;
};

export function BottomSheet({ children, title, eyebrow, closable = false, onDismiss }: Props) {
  // 시트는 화면 아래에 붙으므로 **실제 하단 inset** 을 자기가 맡는다
  // (`Screen` 안에 들어가지 않는다). `layout.safeArea`(34)는 iOS 시안 값이라
  // 그대로 쓰면 Android·제스처 내비에서 여백이 뜨거나 시스템 UI 와 겹친다
  // (`metrics.ts` `layout` 주석 · `EXPORT_MANIFEST` §7).
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardInset();

  // 키보드가 올라와 있으면 **그 자리가 바닥 여백을 대신한다** — 이미 화면 바닥까지의
  // 거리라 inset 을 더하면 그만큼 붕 뜬다(위 머리말). 얹는 `layout.keyboardGap` 은
  // 마지막 버튼이 키보드에 딱 붙지 않게 하는 숨이다 — 독을 든 넷이 같은 값을 쓴다.
  const bottomPad =
    keyboard > 0 ? keyboard + layout.keyboardGap : Math.max(insets.bottom, space.xl);

  // 0 → 1 로 올라온다 · 끄는 동안은 손가락만큼 내려간다
  const [rise] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const [lift] = useState(() =>
    Animated.add(
      rise.interpolate({ inputRange: [0, 1], outputRange: [Dimensions.get("window").height, 0] }),
      drag,
    ),
  );
  useEffect(() => {
    const it = Animated.timing(rise, {
      toValue: 1,
      duration: sheetMotion.rise,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    it.start();
    return () => it.stop();
  }, [rise]);

  // 끌기는 `PanResponder` 가 아니라 **RN 의 responder 속성**이다 — 이벤트가 날 때 그 순간의
  // `onDismiss` 를 읽어 끄는 도중에도 낡은 콜백을 부르지 않는다(`features/home/ui/ScheduleList` 와 같다)
  const grabFrom = useRef(0);
  const settle = () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();

  return (
    <View testID="ds-bottom-sheet-overlay" style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.dim, { opacity: rise }]} />
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={onDismiss}
      />
      {/* inset 이 0 인 기기(버튼 내비 Android 등)에서도 내용이 바닥에 붙지 않게
          최소 여백을 둔다 — 시안의 34 는 iOS 홈 인디케이터 높이 그 자체다 */}
      <Animated.View
        testID="ds-bottom-sheet"
        style={[styles.sheet, { paddingBottom: bottomPad, transform: [{ translateY: lift }] }]}
      >
        {/* 끌 수 있는 자리 — 손잡이와 제목 줄. 시트 위 여백까지 잡히게 위로 넓힌다 */}
        <View
          testID="ds-bottom-sheet-grab"
          style={styles.grab}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            grabFrom.current = e.nativeEvent.pageY;
          }}
          onResponderMove={(e) =>
            drag.setValue(Math.max(0, e.nativeEvent.pageY - grabFrom.current))
          }
          onResponderRelease={(e) => {
            if (e.nativeEvent.pageY - grabFrom.current > sheetMotion.dismissDrag) onDismiss();
            else settle();
          }}
          onResponderTerminate={settle}
        >
          <View style={styles.handle} />
          {title != null || eyebrow != null || closable ? (
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                {eyebrow != null ? (
                  <Text variant="label1" color={primary.heavy}>
                    {eyebrow}
                  </Text>
                ) : null}
                {title != null ? (
                  <Text variant="heading1" color={labelColor.strong}>
                    {title}
                  </Text>
                ) : null}
              </View>
              {closable ? (
                <IconButton
                  name="close"
                  size={20}
                  accessibilityLabel="닫기"
                  onPress={onDismiss}
                  hitSlop={(layout.minTouch - CLOSE_SIZE) / 2}
                  style={styles.close}
                />
              ) : null}
            </View>
          ) : null}
        </View>
        {children}
      </Animated.View>
    </View>
  );
}

/** ✕ 원의 지름 — 손끝이 닿는 자리는 `hitSlop` 이 44 까지 넓힌다 */
const CLOSE_SIZE = 36;

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
  },
  // 딤은 따로 깐다 — 시트가 올라오는 동안 함께 짙어지게
  dim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
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
  // 시트 위 여백(`paddingTop`)까지 끌 자리로 쓴다 — 자리는 그대로, 잡히는 면만 넓어진다.
  // 손잡이와 제목 사이는 시트의 다른 줄 사이와 같다(`sheet.gap`)
  grab: { marginTop: -space.md, paddingTop: space.md, gap: space.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  titleText: { flex: 1, gap: space.xs },
  // ✕ 는 옅은 원 안에 선다 — 눌리는 자리(44)는 그대로, 보이는 원만 작게
  close: { width: CLOSE_SIZE, height: CLOSE_SIZE, backgroundColor: fill.normal },
  handle: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: line.neutral,
    alignSelf: "center",
  },
});
