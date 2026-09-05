import { track } from "@/features/analytics";
import { router } from "expo-router";

import { Button, TextField } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { SkipButton } from "@/components/onboarding/SkipButton";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `05-a`·`05-b` · 나이 (**선택**)
 *
 * ## 옛 `05-b` 가 두 화면으로 갈렸다
 *
 * 옛 화면은 나이와 성별을 **한 화면의 폼 두 칸**으로 받았다. 새 디자인은 대화형이라
 * 질문 하나에 답 하나가 원칙이고, 시안도 `05-a·b`(나이) / `05-c·d`(성별)로 나눠
 * 그린다. 한 버블로 두 가지를 물으면 답 버블이 무엇에 대한 답인지 읽히지 않는다.
 * ⚠ 시안 스스로 「한 화면에 몰아도 되면 되돌릴 수 있어요」라고 적어 둔 자리다.
 *
 * ## 선택 항목이라는 것을 말하는 방식이 바뀌었다
 *
 * 옛 화면은 「선택사항」 **배지**로 말했다. 새 디자인은 **우상단 건너뛰기**로 말한다
 * (`DESIGN.md` 「온보딩」 — 「선택사항 항목은 우상단 건너뛰기」). 배지는 사라진다.
 *
 * - **비워둔 것과 값을 넣은 것을 구별한다** — 건너뛰면 `age` 가 빈 문자열로 남고
 *   대화에는 「괜찮아요」로 남는다(`model/conversation.ts`)
 * - 답변은 질문을 조금 더 잘 맞추는 데만 쓰인다 — 그 말을 질문 버블이 이미 한다
 */
export default function Age() {
  const age = useDraft((s) => s.age);
  const set = useDraft((s) => s.set);
  const ready = age.trim().length > 0;

  const goNext = () => {
    track("onboarding_step_completed", { step: "age" });
    router.push("/gender");
  };

  const skip = () => {
    // 건너뛰면 적던 값도 지운다 — 안 고른 것이 답이다
    set("age", "");
    goNext();
  };

  return (
    <OnboardingChat
      step="age"
      onBack={() => router.back()}
      trailing={<SkipButton onPress={skip} />}
    >
      <TextField
        variant="pill"
        value={age}
        onChangeText={(v) => set("age", v.replace(/[^0-9]/g, ""))}
        placeholder="나이"
        keyboardType="number-pad"
        maxLength={3}
        suffix="세"
        returnKeyType="done"
        onSubmitEditing={() => ready && goNext()}
      />

      <Button label="다음" fill disabled={!ready} onPress={goNext} />
    </OnboardingChat>
  );
}
