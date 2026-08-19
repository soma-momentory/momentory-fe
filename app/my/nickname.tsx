import { useState } from "react";

import { Text, TextField } from "@/components/ds";
import { BasicInfoEditor } from "@/components/my/BasicInfoEditor";
import { label as labelColor, status } from "@/design/ds";
import { useProfile } from "@/features/my/model/settings";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `M4` · 닉네임 수정
 *
 * 온보딩 `04` 의 **답장 pill 입력**을 그대로 쓴다 — 같은 것을 묻는 자리라
 * 마이 전용 입력을 새로 만들지 않는다(`My.dc.html` 「온보딩 입력 컴포넌트는 재사용,
 * 온보딩 플로우는 재사용하지 않음」).
 *
 * `04` 의 규칙도 그대로다:
 *
 * - 상한은 서버가 준다(`model/options.ts`). 상한에 닿으면 **오류 문구 없이 카운터만** 말한다
 * - **금지어는 바바 · 모멘토리 둘뿐**이고 이때만 한 줄이 붙는다(`04.md`)
 * - **앞뒤 공백은 저장할 때 잘라낸다** — 그래서 「지현 」은 「지현」과 같은 답이고
 *   저장이 열리지 않는다
 */
const FORBIDDEN = ["바바", "모멘토리"];

export default function NicknameEdit() {
  const saved = useProfile((s) => s.nickname);
  const maxLength = useOnboardingOptions((s) => s.nickname.maxLength);
  const [nickname, setNickname] = useState(saved);

  const trimmed = nickname.trim();
  const forbidden = FORBIDDEN.includes(trimmed);
  // 되돌리면 다시 잠긴다 — 「건드렸는가」가 아니라 「값이 다른가」다
  const changed = trimmed !== saved;
  const ready = trimmed.length > 0 && !forbidden;

  return (
    <BasicInfoEditor title="닉네임" changed={changed} ready={ready} patch={{ nickname: trimmed }}>
      <TextField
        variant="pill"
        value={nickname}
        onChangeText={setNickname}
        placeholder="이름 또는 별명"
        maxLength={maxLength}
        showCounter
        accessibilityLabel="닉네임"
        returnKeyType="done"
      />

      {/* 금지어일 때만 붙는 한 줄 (04.md). 모달·경고 아이콘을 만들지 않는다 */}
      {forbidden ? (
        <Text variant="caption1" color={status.negative}>
          바바와 모멘토리는 이미 있는 이름이에요. 다른 이름을 알려주세요.
        </Text>
      ) : (
        <Text variant="caption1" color={labelColor.alternative}>
          같은 이름을 사용하는 분이 있어도 괜찮아요.
        </Text>
      )}
    </BasicInfoEditor>
  );
}
