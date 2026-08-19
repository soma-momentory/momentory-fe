import { router } from "expo-router";
import { StyleSheet } from "react-native";

import { Button, Text, TextField } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { label as labelColor, status } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `04` · 닉네임 (필수)
 *
 * 새 디자인에서 입력은 **답장 pill** 이다(`Onboarding.dc.html` 「설문형에서 바뀐 것」 —
 * 「닉네임 Text Field → 답장 입력 pill」). 대화 아래에 붙어 답을 적는 자리다.
 *
 * - **1~10자.** 11자부터는 더 입력되지 않고 **오류 문구 없이 카운터 색만**
 *   바뀐다(`04.md`) — 막힌 이유는 글자 수 표시가 이미 말하고 있다.
 *   상한은 서버가 준다(`model/options.ts`)
 * - **중복 검사를 하지 않는다.** 닉네임은 식별자가 아니라 부르는 말이라
 *   "이미 사용 중" 이라는 실패를 만들 이유가 없다
 * - **금지어는 바바 · 모멘토리 둘뿐**이고 이때만 한 줄이 붙는다(`04.md`)
 * - **앞뒤 공백은 저장할 때 잘라낸다**
 * - 입력 전에도 버튼을 **사라지게 하지 않는다** — 비활성으로 남겨 다음에
 *   무엇이 오는지 보이게 한다
 * - **뒤로가 없다.** 첫 질문이라 돌아갈 곳이 없다
 */
const FORBIDDEN = ["바바", "모멘토리"];

export default function Nickname() {
  const maxLength = useOnboardingOptions((s) => s.nickname.maxLength);
  // 화면 로컬 state 로 두면 다음 화면으로 넘어가는 순간 사라진다 — 초안에 쌓는다
  const name = useDraft((s) => s.nickname);
  const set = useDraft((s) => s.set);
  const trimmed = name.trim();
  const forbidden = FORBIDDEN.includes(trimmed);
  const ready = trimmed.length > 0 && !forbidden;

  const goNext = () => {
    // 앞뒤 공백은 저장할 때 잘라낸다 (04.md)
    set("nickname", trimmed);
    router.push("/age");
  };

  return (
    <OnboardingChat step="nickname">
      <TextField
        variant="pill"
        value={name}
        onChangeText={(v) => set("nickname", v)}
        placeholder="이름 또는 별명"
        maxLength={maxLength}
        showCounter
        returnKeyType="done"
        onSubmitEditing={() => ready && goNext()}
      />

      {/* 금지어일 때만 붙는 한 줄 (04.md). 모달·경고 아이콘을 만들지 않는다 */}
      {forbidden ? (
        <Text variant="caption1" color={status.negative} style={styles.centered}>
          바바와 모멘토리는 이미 있는 이름이에요. 다른 이름을 알려주세요.
        </Text>
      ) : (
        // 실패를 만들지 않겠다는 약속이라 입력 전에 미리 말한다
        <Text variant="caption1" color={labelColor.alternative} style={styles.centered}>
          같은 이름을 사용하는 분이 있어도 괜찮아요.
        </Text>
      )}

      <Button label="이렇게 불러주세요" fill disabled={!ready} onPress={goNext} />
    </OnboardingChat>
  );
}

const styles = StyleSheet.create({
  centered: { textAlign: "center" },
});
