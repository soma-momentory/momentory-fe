import { useEffect, useState } from "react";

import { BasicInfoEditor } from "@/components/my/BasicInfoEditor";
import { QuickReplies } from "@/components/onboarding/QuickReplies";
import { useProfile } from "@/features/my/model/settings";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `M6` · 성별 수정
 *
 * 온보딩 `05-c` 와 같은 칩이다(`My.dc.html` — 시안도 `ChipFilter` 를 쓴다).
 *
 * - **하나만 고른다.** 다른 것을 누르면 옮겨가고, 같은 것을 다시 누르면 풀린다 —
 *   고른 뒤 무를 길이 없으면 선택이 아니다
 * - **비워둔 것과 「선택 안 함」을 구별한다.** 앞은 묻지 않기를 고른 것이고 뒤는
 *   해당 없음을 고른 것이다 — `null` 과 `UNSPECIFIED` 가 서로 다른 답이다
 * - **칩 목록은 서버가 준다**(`model/options.ts`). 못 받았으면 대역으로 그린다
 */
export default function GenderEdit() {
  const saved = useProfile((s) => s.gender);
  const genders = useOnboardingOptions((s) => s.genders);
  const [gender, setGender] = useState<string | null>(saved);

  useEffect(() => {
    void useOnboardingOptions.getState().load();
  }, []);

  return (
    <BasicInfoEditor title="성별" changed={gender !== saved} patch={{ gender }}>
      <QuickReplies
        items={genders}
        selected={gender == null ? [] : [gender]}
        onToggle={(id) => setGender(gender === id ? null : id)}
      />
    </BasicInfoEditor>
  );
}
