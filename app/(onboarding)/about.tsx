import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Chip, PaperGroup, Text, TextField } from "@/components/ds";
import { Baba, Bubble, OnboardingFrame, SetupBar } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, space } from "@/design/ds";
import { UNSPECIFIED_GENDER, useDraft } from "@/features/onboarding/model/draft";
import { isValidAge, SETUP_STEPS } from "@/features/onboarding/model/flow";

/** 성별 칩 — 서버 코드 그대로 보낸다(`GET /onboarding/options` 의 코드와 같다) */
const GENDERS = [
  { code: "FEMALE", label: "여성" },
  { code: "MALE", label: "남성" },
  { code: UNSPECIFIED_GENDER, label: "선택 안 함" },
] as const;

/**
 * 나이 · 성별 — 프로토타입에 없어 새로 만든 화면(10/25). 둘 다 선택이고, 숫자 나이는 지금 DB ·
 * 마이페이지와 같은 정수다. 건너뛰면 지금 값을 그대로 두고 넘어간다 — 처음 가입한 사람은 나이 없음 ·
 * 성별 「선택 안 함」으로 저장된다. 쓰임은 회고 질문을 맞추는 데뿐이다(`DATA-SECURITY.md` §5-1).
 */
export default function About() {
  const nickname = useDraft((s) => s.nickname);
  const age = useDraft((s) => s.age);
  const gender = useDraft((s) => s.gender);
  const set = useDraft((s) => s.set);
  const next = () => router.push("/calendar");

  return (
    <OnboardingFrame
      onBack={() => router.back()}
      progress={<SetupBar index={SETUP_STEPS.indexOf("about")} count={SETUP_STEPS.length} />}
      onSkip={next}
      primary={{ label: "다음", disabled: !isValidAge(age), onPress: next }}
    >
      <View style={styles.talk}>
        <Baba size={84} />
        <Bubble large style={styles.bubble}>
          {`${nickname.trim()}님, 나이랑 성별도 물어봐도 될까요?`}
        </Bubble>
      </View>
      <Text variant="body2Reading" color={labelColor.neutral} style={styles.desc}>
        바바가 말을 건넬 때만 참고할게요
      </Text>

      <PaperGroup label="나이" padded style={styles.group}>
        <TextField
          variant="paper"
          value={age}
          onChangeText={(v) => set("age", v.replace(/[^0-9]/g, ""))}
          placeholder="나이"
          keyboardType="number-pad"
          maxLength={3}
          suffix="세"
          accessibilityLabel="나이"
          returnKeyType="done"
        />
      </PaperGroup>

      <PaperGroup label="성별" tone="support" padded style={styles.group}>
        <View style={styles.chips}>
          {GENDERS.map((g) => (
            <Chip
              key={g.code}
              label={g.label}
              selected={gender === g.code}
              onPress={() => set("gender", gender === g.code ? null : g.code)}
            />
          ))}
        </View>
      </PaperGroup>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  talk: { flexDirection: "row", alignItems: "flex-end", gap: space.sm, marginTop: space.xl2 },
  bubble: { flexShrink: 1, borderBottomLeftRadius: 6 },
  desc: { marginTop: space.md },
  group: { marginTop: space.xl },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
});
