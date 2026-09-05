import { track } from "@/features/analytics";
import { router } from "expo-router";

import { Button, Text } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { label as labelColor } from "@/design/ds";

/**
 * `03` · 첫 메시지
 *
 * **질문 전에 누가 묻는지 먼저 밝힌다.** 다만 새 디자인에서는 그 「누구」가 앱이다 —
 * 반입 패키지가 캐릭터를 전부 뺐고(`EXPORT_MANIFEST` §5) 브랜드를 텍스트로 정했다.
 * 문안 근거는 `features/onboarding/model/conversation.ts` 머리말에 있다.
 *
 * - **뒤로가 없다** — 온보딩의 첫 화면이라 돌아갈 곳이 없다
 * - **진행 표시를 두지 않는다**(`DESIGN.md` 「온보딩」) — 옛 `ProgressDots` 가 빠졌다
 * - **초 단위로 재촉하지 않는다** — "30초면 끝나요"가 아니라 "금방 끝나요".
 *   숫자를 적으면 그 숫자가 지켜지지 않을 때 신뢰가 깎인다(`03.md`)
 * - "마이에서 언제든 바꿀 수 있어요"는 **약속**이다 — 여섯 항목 전부가
 *   마이에 편집 경로를 가져야 한다(`M1`·`M2`·`M3`)
 */
export default function Welcome() {
  return (
    <OnboardingChat step="welcome">
      <Text variant="caption1" color={labelColor.alternative} style={{ textAlign: "center" }}>
        금방 끝나요 · 답변은 마이에서 언제든 바꿀 수 있어요
      </Text>
      <Button
        label="시작하기"
        fill
        onPress={() => {
          track("onboarding_step_completed", { step: "welcome" });
          router.push("/nickname");
        }}
      />
    </OnboardingChat>
  );
}
