import { useEffect, useState } from "react";

import { Text } from "@/components/ds";
import { BasicInfoEditor } from "@/components/my/BasicInfoEditor";
import { OtherReplyInput } from "@/components/onboarding/OtherReplyInput";
import { QuickReplies } from "@/components/onboarding/QuickReplies";
import { label as labelColor } from "@/design/ds";
import { sameChoices } from "@/features/my/model/basicInfo";
import { useProfile } from "@/features/my/model/settings";
import { MAX_INTERESTS, OTHER_INTEREST } from "@/features/onboarding/model/draft";
import { choiceHint, useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `M7` · 관심 분야 수정
 *
 * 온보딩 `06` 과 같은 칩·같은 규칙이다 — **최대 3개**, 넷째부터는 눌러도 켜지지
 * 않는다(`06.md`). 제한 경고를 미리 띄우지 않고 안내는 몇 개를 골랐는지 **사실만**
 * 말한다(`design.md` §9).
 *
 * **「기타」 입력 줄은 시안에 없다.** 서버가 `OTHER` 와 함께 직접 입력 값을
 * 요구하고(`DISCUSSION.md` §1-7) 온보딩 `06-b` 에서 물은 답이라 고칠 자리가 여기
 * 있어야 한다(`my.invariants`) — 온보딩과 **같은 컴포넌트**를 그대로 쓴다.
 *
 * 저장은 **하나라도 다르면** 열린다 — 칩 하나를 껐다 다시 켜면 순서가 달라져도
 * 같은 답이므로 잠긴 채다(`sameChoices`).
 */
export default function InterestsEdit() {
  const savedPicked = useProfile((s) => s.interests);
  const savedOther = useProfile((s) => s.interestOther);
  const items = useOnboardingOptions((s) => s.interestAreas);

  const [picked, setPicked] = useState<string[]>(savedPicked);
  const [other, setOther] = useState(savedOther);

  useEffect(() => {
    void useOnboardingOptions.getState().load();
  }, []);

  const etcOn = picked.includes(OTHER_INTEREST);
  const otherTrimmed = other.trim();
  const changed = !sameChoices(picked, savedPicked) || otherTrimmed !== savedOther;
  // 기타를 켠 채 비워 두면 잠긴다 — 서버가 400 으로 거절하는 모양이다
  const ready = picked.length > 0 && (!etcOn || otherTrimmed.length > 0);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      setPicked(picked.filter((x) => x !== id));
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 남기지 않는다
      if (id === OTHER_INTEREST) setOther("");
      return;
    }
    // 넷째부터는 눌러도 켜지지 않는다 — 경고를 미리 띄우지 않는다 (06.md)
    if (picked.length >= MAX_INTERESTS) return;
    setPicked([...picked, id]);
  };

  /** 「기타」 확정 — 공백뿐이면 확정하지 않고 기타 선택을 취소한다(`06-c.md`) */
  const commitOther = () => {
    if (otherTrimmed.length === 0) {
      setPicked(picked.filter((x) => x !== OTHER_INTEREST));
      setOther("");
      return;
    }
    setOther(otherTrimmed);
  };

  return (
    <BasicInfoEditor
      title="관심 분야"
      changed={changed}
      ready={ready}
      // 기타를 끈 채 저장하면 적던 값도 함께 지운다 — 꺼진 답을 서버에 남기지 않는다
      patch={{ interests: picked, interestOther: etcOn ? otherTrimmed : "" }}
    >
      <QuickReplies
        items={items}
        selected={picked}
        onToggle={toggle}
        full={picked.length >= MAX_INTERESTS}
      />

      {etcOn ? (
        <OtherReplyInput value={other} onChangeText={setOther} onCommit={commitOther} />
      ) : null}

      <Text variant="caption1" color={labelColor.alternative}>
        {choiceHint(picked.length, etcOn, otherTrimmed.length > 0)}
      </Text>
    </BasicInfoEditor>
  );
}
