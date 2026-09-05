import { track } from "@/features/analytics";
import { router } from "expo-router";

import { Button } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { QuickReplies } from "@/components/onboarding/QuickReplies";
import { SkipButton } from "@/components/onboarding/SkipButton";
import { useDraft } from "@/features/onboarding/model/draft";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `05-c`·`05-d` · 성별 (**선택**)
 *
 * **Segmented 가 아니라 빠른 답장 칩이다**(`Onboarding.dc.html` 「설문형에서 바뀐 것」).
 * 칩은 질문 바로 아래 왼쪽, **대화 영역 안**에 붙는다 — 하단 독이 아니다.
 * 답을 고르는 자리가 대화의 일부라야 「내가 한 말」로 이어진다.
 *
 * - **하나만 고른다.** 다른 것을 누르면 옮겨가고, 같은 것을 다시 누르면 풀린다 —
 *   고른 뒤 무를 길이 없으면 선택이 아니다
 * - **비워둔 것과 「선택 안 함」을 구별한다.** 앞은 묻지 않기를 고른 것이고 뒤는
 *   해당 없음을 고른 것이다 — `gender` 가 `null` 과 `UNSPECIFIED_GENDER` 를 따로 든다
 * - **성별 칩은 서버가 준다**(`model/options.ts`). 못 받았으면 대역으로 그린다
 */
export default function Gender() {
  const genders = useOnboardingOptions((s) => s.genders);
  const gender = useDraft((s) => s.gender);
  const set = useDraft((s) => s.set);

  const goNext = () => {
    track("onboarding_step_completed", { step: "gender" });
    router.push("/interests");
  };

  const skip = () => {
    // 건너뛰면 고른 것도 지운다 — 「선택 안 함」과 다른 답이다
    set("gender", null);
    goNext();
  };

  return (
    <OnboardingChat
      step="gender"
      onBack={() => router.back()}
      trailing={<SkipButton onPress={skip} />}
      inline={
        <QuickReplies
          items={genders}
          selected={gender == null ? [] : [gender]}
          // 하나만 고른다 — 다른 것을 누르면 옮겨가고, 같은 것을 다시 누르면 풀린다
          onToggle={(id) => set("gender", gender === id ? null : id)}
        />
      }
    >
      <Button label="다음" fill disabled={gender == null} onPress={goNext} />
    </OnboardingChat>
  );
}
