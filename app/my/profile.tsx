import { router } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Card, ListCell, ListDivider, Screen, TopNavigation } from "@/components/ds";
import { space } from "@/design/ds";
import { ageText, labelsOf, summarize, NOT_CHOSEN } from "@/features/my/model/basicInfo";
import { useProfile } from "@/features/my/model/settings";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `M3` · 기본 정보 수정 — **목록이다.**
 *
 * ## 한 화면 일괄 편집에서 항목별 편집으로
 *
 * 옛 화면(`M2` 회고 프로필)은 닉네임·관심 분야·쉬는 방법·나이·성별 **다섯을 한
 * 화면에서 고치고 한 번에 저장**했다. 새 디자인은 **현재 값 목록 → 항목 선택 →
 * 그 항목만 수정 → 저장 → 여기로 복귀**다(`DESIGN.md` 「마이」).
 *
 * 그래서 이 화면에는 **저장도 이탈 확인도 없다** — 고치는 자리가 아니라 지금
 * 값을 읽고 어디로 갈지 고르는 자리다. 「고치고 저장하지 않은 채 나가면 묻는다」는
 * 규칙(`my.invariants`)은 각 상세 화면으로 옮겨 갈 이유가 없어졌다: 상세는 항목이
 * 하나뿐이라 저장하지 않고 나가면 잃는 것도 하나이고, `저장` 이 화면의 유일한 CTA 다.
 *
 * **닉네임도 여기 안에 있다** — 시안이 마이 상단의 진입점을 없앴다(`My.dc.html`
 * 「판단이 필요한 부분」). 온보딩에서 답한 것은 전부 이 목록에 있다(`my.invariants`).
 *
 * 값은 **한 줄로 자른다.** 관심 분야·쉬는 방법처럼 여러 개인 것은
 * 「일·직장생활 외 1개」로 접는다(`summarize`).
 */
export default function BasicInfoList() {
  const profile = useProfile();
  const genders = useOnboardingOptions((s) => s.genders);
  const interestAreas = useOnboardingOptions((s) => s.interestAreas);
  const restMethods = useOnboardingOptions((s) => s.restMethods);

  // 온보딩을 거치지 않고 여기로 바로 올 수 있다 — 그때도 서버 목록을 쓴다.
  // 이미 받았으면 아무 일도 하지 않는다
  useEffect(() => {
    void useOnboardingOptions.getState().load();
  }, []);

  const genderLabel =
    profile.gender == null
      ? NOT_CHOSEN
      : (genders.find((o) => o.id === profile.gender)?.label ?? NOT_CHOSEN);

  return (
    <Screen>
      <TopNavigation
        leading="arrow-left"
        title="기본 정보 수정"
        onLeadingPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 줄 여백은 각 줄이 만든다 — 카드는 면과 라운드만 준다 */}
        <Card padding="none" style={styles.rows}>
          <ListCell
            title="닉네임"
            value={profile.nickname}
            onPress={() => router.push("/my/nickname")}
            chevron
          />
          <ListDivider />
          <ListCell
            title="나이"
            value={ageText(profile.age)}
            onPress={() => router.push("/my/age")}
            chevron
          />
          <ListDivider />
          <ListCell
            title="성별"
            value={genderLabel}
            onPress={() => router.push("/my/gender")}
            chevron
          />
          <ListDivider />
          <ListCell
            title="관심 분야"
            value={summarize(labelsOf(interestAreas, profile.interests))}
            onPress={() => router.push("/my/interests")}
            chevron
          />
          <ListDivider />
          <ListCell
            title="쉬는 방법"
            value={summarize(labelsOf(restMethods, profile.restMethods))}
            onPress={() => router.push("/my/rest")}
            chevron
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: space.md, paddingBottom: space.xl },
  rows: { paddingHorizontal: space.lg, paddingVertical: space.xs },
});
