import { Stack } from "expo-router";

import theme from "@/design/theme";

/**
 * 온보딩 스택. 상단 조각(`BackChevron`·`ProgressDots`)은 **여기서 그리지 않는다** —
 * 화면마다 있고 없고가 다르기 때문이다:
 *
 * - `03` 환영 — 진행점 **없음**(아직 질문이 시작되지 않았다), 뒤로 **없음**
 * - `04` 닉네임 — 진행점 1/6, 뒤로 **없음**(첫 질문이라 돌아갈 곳이 없다)
 * - `05-b` 부터 — 진행점 + 뒤로
 *
 * 레이아웃에 올려두고 화면마다 끄면 「없음」이 세 종류로 갈려 조건문이 화면과
 * 레이아웃 양쪽에 생긴다. 화면이 자기 상단을 그리는 편이 읽기 쉽다.
 * 대신 `OnboardingTopBar` 가 자리를 고정한다.
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        animationDuration: theme.motion.spec.screen.duration,
        contentStyle: { backgroundColor: theme.colors.semantic.background },
      }}
    />
  );
}
