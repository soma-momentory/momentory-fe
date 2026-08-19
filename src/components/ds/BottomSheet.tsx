import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
 * 바텀 시트 — `design.md` §11.
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
 */
type Props = {
  children: ReactNode;
  /** Heading 1. 없으면 제목 줄을 두지 않는다 */
  title?: string;
  onDismiss: () => void;
};

export function BottomSheet({ children, title, onDismiss }: Props) {
  // 시트는 화면 아래에 붙으므로 **실제 하단 inset** 을 자기가 맡는다
  // (`Screen` 안에 들어가지 않는다). `layout.safeArea`(34)는 iOS 시안 값이라
  // 그대로 쓰면 Android·제스처 내비에서 여백이 뜨거나 시스템 UI 와 겹친다
  // (`metrics.ts` `layout` 주석 · `EXPORT_MANIFEST` §7).
  const insets = useSafeAreaInsets();

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
      <View
        testID="ds-bottom-sheet"
        style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.xl) }]}
      >
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
  // z 값은 `design.md` §11 —— 시트·모달은 콘텐츠보다 위(3)다.
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
