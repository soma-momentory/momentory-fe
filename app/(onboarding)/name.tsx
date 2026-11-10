import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { PaperGroup, TextField } from "@/components/ds";
import { Baba, Bubble, OnboardingFrame, SetupBar } from "@/components/onboarding/OnboardingParts";
import { space } from "@/design/ds";
import { useDraft } from "@/features/onboarding/model/draft";
import { SETUP_STEPS } from "@/features/onboarding/model/flow";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/** 이름 — 필수. 다시 온보딩하는 사람은 지금 이름이 미리 들어 있다 */
export default function Name() {
  const nickname = useDraft((s) => s.nickname);
  const maxLength = useOnboardingOptions((s) => s.nickname.maxLength);
  const ready = nickname.trim().length > 0;

  return (
    <OnboardingFrame
      progress={<SetupBar index={SETUP_STEPS.indexOf("name")} count={SETUP_STEPS.length} />}
      primary={{ label: "다음", disabled: !ready, onPress: () => router.push("/about") }}
    >
      <View style={styles.talk}>
        <Baba size={84} />
        <Bubble large style={styles.bubble}>
          {"반가워요!\n뭐라고 부를까요?"}
        </Bubble>
      </View>
      <PaperGroup padded style={styles.field}>
        <TextField
          variant="paper"
          value={nickname}
          onChangeText={(v) => useDraft.getState().set("nickname", v)}
          placeholder="이름 또는 별명"
          maxLength={maxLength}
          showCounter
          accessibilityLabel="이름"
          returnKeyType="done"
          autoFocus={nickname.length === 0}
        />
      </PaperGroup>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  talk: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.xl2 },
  bubble: { flexShrink: 1, borderBottomLeftRadius: 6 },
  field: { marginTop: space.xl2 },
});
