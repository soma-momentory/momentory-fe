import { StyleSheet } from "react-native";

import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperTypography } from "@/design/paper";
import { home } from "@/design/tokens.mvp";

/**
 * `.sec` — 카드 안 섹션 라벨. accent 색 · 자간 .04em.
 *
 * 홈·회고 확인·일기 초안·일기 상세·프로필이 전부 같은 라벨을 쓴다 —
 * 화면마다 스타일을 다시 적으면 한 값이 다섯 곳에 생긴다.
 *
 * `paper` 변형은 새 디자인의 **카드 제목**(16px/700 · 잉크색)이다
 * (`docs/design/design-system.md` §2). 리스킨된 화면만 opt-in 한다 —
 * 한 화면 안에서 두 체계를 섞지 않는다(`PLAN.md` §5).
 */
type Props = {
  children: string;
  center?: boolean;
  variant?: "default" | "paper";
};

export function SectionLabel({ children, center, variant = "default" }: Props) {
  const paper = variant === "paper";
  return (
    <AppText
      tone={paper ? "strong" : "accent"}
      weight={paper ? "700" : "600"}
      style={[paper ? styles.paper : styles.label, center ? styles.center : null]}
    >
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
  paper: {
    fontSize: paperTypography.styles.cardTitle.fontSize,
    lineHeight: paperTypography.styles.cardTitle.lineHeight,
    color: paperColors.text.primaryHome,
  },
  center: { textAlign: "center" },
});
