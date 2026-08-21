import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, zIndex } from "@/design/ds";
import { useToast } from "@/lib/toast";

import { Toast } from "./Toast";

/**
 * 앱에 하나뿐인 토스트 자리 — `lib/toast.ts` 가 담은 한 줄을 그린다.
 *
 * `AppProviders` 가 라우트 위에 얹는다. 화면 안에 두면 그 화면이 사라질 때
 * 알림도 함께 사라진다 — 일기 삭제처럼 **결과가 늦게 오는** 일이 있어서 통로를
 * 화면 밖에 뒀다(`lib/toast.ts`).
 *
 * ## 자리
 *
 * 탭바(56)와 그 아래 인셋 위에 뜬다 — 탭이 없는 화면에서는 조금 높이 뜨지만,
 * **어느 화면에서든 같은 자리**인 편이 화면마다 높이가 다른 것보다 낫다.
 * 눌리지 않으므로(`Toast` 가 `pointerEvents="none"`) 가리는 것도 없다.
 *
 * `seq` 를 `key` 로 준다 — 같은 문장이 연달아 와도 새로 마운트돼 타이머가
 * 처음부터 다시 돈다.
 */
export function ToastHost() {
  const current = useToast((s) => s.current);
  const dismiss = useToast((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (current == null) return null;

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Toast
        key={current.seq}
        message={current.message}
        variant={current.variant}
        onDismiss={dismiss}
        offsetBottom={layout.scrollClearance + Math.max(insets.bottom, layout.minBottomInset)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: zIndex.overlay },
});
