import { StyleSheet } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { home } from "@/design/tokens.mvp";

/**
 * `.sec` — 카드 안 섹션 라벨. accent 색 · 자간 .04em.
 *
 * 홈·회고 확인·일기 초안·일기 상세·프로필이 전부 같은 라벨을 쓴다 —
 * 화면마다 스타일을 다시 적으면 한 값이 다섯 곳에 생긴다.
 */
export function SectionLabel({ children, center }: { children: string; center?: boolean }) {
  return (
    <AppText tone="accent" weight="600" style={[styles.label, center ? styles.center : null]}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  center: { textAlign: "center" },
});
