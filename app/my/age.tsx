import { useState } from "react";

import { Text, TextField } from "@/components/ds";
import { BasicInfoEditor } from "@/components/my/BasicInfoEditor";
import { label as labelColor } from "@/design/ds";
import { useProfile } from "@/features/my/model/settings";

/**
 * `M5` · 나이 수정
 *
 * 온보딩 `05-a` 와 같은 입력이다 — **숫자만 · 최대 세 자리 · 단위 「세」는 칸 안**.
 *
 * **선택 항목이라 비울 수 있다.** 비우고 저장하면 「묻지 않기」로 돌아간다
 * (`05-b.md` — 「선택을 되돌릴 길이 없으면 선택이 아니다」). 그래서 `ready` 로
 * 빈 값을 막지 않고, 지우기(`onClear`)도 함께 둔다.
 */
export default function AgeEdit() {
  const saved = useProfile((s) => s.age);
  const [age, setAge] = useState(saved);

  const trimmed = age.trim();
  // 되돌리면 다시 잠긴다. 비우는 것도 하나의 답이라 「달라졌는가」로만 본다
  const changed = trimmed !== saved;

  return (
    <BasicInfoEditor title="나이" changed={changed} patch={{ age: trimmed }}>
      <TextField
        variant="paper"
        value={age}
        // 숫자 아닌 것은 붙여넣어도 들어오지 않는다
        onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
        placeholder="나이"
        keyboardType="number-pad"
        maxLength={3}
        suffix="세"
        onClear={() => setAge("")}
        clearLabel="나이 지우기"
        accessibilityLabel="나이"
        returnKeyType="done"
      />

      <Text variant="caption1" color={labelColor.alternative}>
        답변은 질문을 조금 더 잘 맞추는 데만 사용하며, 다른 사람에게 공개되지 않아요.
      </Text>
    </BasicInfoEditor>
  );
}
