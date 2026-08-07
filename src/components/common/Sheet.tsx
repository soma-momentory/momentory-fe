import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import theme from "@/design/theme";
import { sheet } from "@/design/tokens.mvp";

/**
 * 하단 시트 — `momentory.css` `.scrim` · `.scrimS` · `.sheet` · `.grab`.
 *
 * ```css
 * .scrimS{background:rgba(36,31,25,.38)}
 * .sheet{border-radius:26px 26px 0 0;padding:14px 20px 22px;gap:16px;
 *        box-shadow:0 -8px 34px rgba(36,31,25,.22)}
 * ```
 *
 * 홈의 세 시트(`12-c` · `12-d` · `12-e`)가 이 껍데기를 쓴다. 시트가 열려도
 * **뒤의 홈은 그대로 보인다** — 스크림이 .38 인 이유이고, 어디서 왔는지가
 * 화면에 남아 있어야 닫고 나서 길을 잃지 않는다.
 *
 * **그랩 핸들은 잡아끌라는 표시가 아니다** — 아직 제스처를 붙이지 않았으므로
 * 닫는 길은 스크림 탭과 각 시트의 `[취소]`·`[닫기]` 다. `12-d` 는 핸들을 두지
 * 않는다(키보드가 바로 올라와 시트가 끝까지 차므로).
 *
 * ⚠ **닫기는 `router.back()` 이다.** 시트가 라우트라서 뒤로가기·스와이프백이
 * 그대로 닫기가 된다 — 닫는 길을 두 벌 만들지 않는다.
 */
type Props = {
  children: ReactNode;
  /** 위쪽 그랩 핸들. `12-d` 는 `false` */
  grab?: boolean;
  /** 스크림을 눌렀을 때. 기본은 닫기 */
  onDismiss?: () => void;
};

export function Sheet({ children, grab = true, onDismiss }: Props) {
  const dismiss = onDismiss ?? (() => router.back());

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.scrim}
        accessibilityRole="button"
        accessibilityLabel="닫기"
        onPress={dismiss}
      />
      <View style={styles.sheet}>
        {grab ? <View style={styles.grab} /> : null}
        {children}
      </View>
    </View>
  );
}

/**
 * 시트 상단 — `.shtop` · `.shx` · `.shttl` · `.shsave`.
 *
 * **저장은 상단 우측 한 곳뿐이고 `[취소]` 는 좌측이다**(`12-d.md` · `12-e.md`) —
 * 하단에 큰 버튼을 두면 키보드와 겹친다. 그래서 이 헤더가 두 시트의 유일한
 * 확정 경로다.
 */
export function SheetHeader({
  title,
  onCancel,
  onSave,
  saveDisabled = false,
}: {
  title: string;
  onCancel?: () => void;
  onSave: () => void;
  /** 제목이 비면 저장이 잠긴다(`12-e.md`) */
  saveDisabled?: boolean;
}) {
  return (
    <View style={styles.top}>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onCancel ?? (() => router.back())}>
        <AppText tone="caption" style={styles.action}>
          취소
        </AppText>
      </Pressable>

      <AppText tone="strong" weight="600" style={styles.title}>
        {title}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saveDisabled }}
        disabled={saveDisabled}
        hitSlop={8}
        onPress={onSave}
      >
        {/* 잠긴 저장은 흐려질 뿐 사라지지 않는다 — 다음이 있다는 사실은 남는다 */}
        <AppText
          tone="accent"
          weight="600"
          style={[styles.action, saveDisabled ? styles.disabled : null]}
        >
          저장
        </AppText>
      </Pressable>
    </View>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: sheet.scrim,
  },
  sheet: {
    backgroundColor: semantic.surface,
    borderTopLeftRadius: sheet.radius,
    borderTopRightRadius: sheet.radius,
    paddingTop: sheet.paddingTop,
    paddingHorizontal: theme.layout.screenMargin,
    paddingBottom: sheet.paddingBottom,
    gap: sheet.gap,
  },
  grab: {
    width: sheet.grab.width,
    height: sheet.grab.height,
    borderRadius: theme.radius.pill,
    backgroundColor: sheet.grab.color,
    alignSelf: "center",
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // 44 트랙이라 히트 영역을 따로 깔지 않는다
  action: { minHeight: theme.touch.minTarget, fontSize: 15, lineHeight: theme.touch.minTarget },
  title: { fontSize: 14, lineHeight: 14 },
  disabled: { opacity: 0.36 },
});
