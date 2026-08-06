import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";


import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChipFlow } from "@/components/chat/ChipFlow";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { MAX_INTERESTS, useDraft } from "@/features/onboarding/model/draft";

/**
 * `06` · 관심 분야 (온보딩 3/6 · 필수 · 복수)
 *
 * **칩 8개를 한 화면에 다 보인다.** 스크롤로 감추면 뒤쪽은 선택되지 않는다 —
 * 「기타」까지 두 줄에 들어가도록 개수를 8로 고정한 이유다. 그래서 이 화면에는
 * `ScrollView` 를 두지 않는다.
 *
 * **최대 3개.** 상한을 넘기면 새 선택이 **들어가지 않고 안내 한 줄로 알린다** —
 * 모달·경고 아이콘을 띄우지 않는다(`RULES.md` 「오류는 한 줄로 흡수」).
 *
 * 「기타」 직접 입력(원본 `06-b`~`06-d`)은 MVP 범위 밖이라 평범한 칩으로 둔다.
 *
 * 원본 `07`(쉬는 방법)은 다음 질문이 아니다 — 그 답이 쓰이는 곳이 쉼터뿐이라
 * MVP 는 묻지 않는다. 진행점 4번째 자리는 `08` 이 가져간다.
 */
const MAX = MAX_INTERESTS;

const ITEMS = [
  { id: "study", label: "학업" },
  { id: "career", label: "취업·진로" },
  { id: "work", label: "일·직장생활" },
  { id: "relations", label: "인간관계" },
  { id: "family", label: "가족" },
  { id: "self", label: "나 자신" },
  { id: "health", label: "건강" },
  { id: "etc", label: "기타" },
] as const;

export default function Interests() {
  const picked = useDraft((s) => s.interests);
  const set = useDraft((s) => s.set);
  // 상한 안내는 화면에 머무는 순간의 상태다 — 초안에 담지 않는다
  const [overCap, setOverCap] = useState(false);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      setOverCap(false);
      set(
        "interests",
        picked.filter((x) => x !== id),
      );
      return;
    }
    if (picked.length >= MAX) {
      // 넘치는 선택은 **삼키고** 안내로만 알린다. 고른 것을 밀어내지 않는다 —
      // 무엇이 빠졌는지 모른 채 목록이 바뀌면 되돌릴 수가 없다.
      setOverCap(true);
      return;
    }
    setOverCap(false);
    set("interests", [...picked, id]);
  };

  return (
    <ScreenBackground>
      <OnboardingTopBar step={2} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>요즘 마음이 가장 자주 머무는 곳은 어디인가요?</BabaBubble>
        <BabaBubble index={1}>
          관심 있는 이야기를 골라주시면, 당신의 하루와 가까운 질문을 건넬게요.
        </BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        <ChipFlow items={ITEMS} selected={picked} onToggle={toggle} />

        <AppText variant="caption" tone="legal">
          {hintOf(picked.length, overCap)}
        </AppText>

        <AppButton label="다음" disabled={picked.length === 0} onPress={goNext} />
      </View>
    </ScreenBackground>
  );
}

/**
 * 한 줄이 세 가지를 다 말한다 — 무엇을 해야 하는지 · 지금 몇 개인지 · 왜 안 들어갔는지.
 * 줄을 늘리지 않는 것이 「한 줄로 흡수」다.
 *
 * ⚠ 상한 초과 문구는 **MVP 스펙에 없다.** 규칙만 "안내 한 줄로 알린다" 이고 문안이
 * 없어서, 같은 칩을 쓰는 `M2` 의 "최대 3개 · N개 선택" 형식에 맞춰 지었다.
 * 상류가 문안을 정하면 그걸로 바꾼다.
 */
function hintOf(count: number, overCap: boolean) {
  if (overCap) return `최대 ${MAX}개까지 고를 수 있어요`;
  if (count === 0) return "하나 이상 골라주세요";
  return `최대 ${MAX}개 · ${count}개 선택`;
}

const goNext = () => router.push("/retro-time");

const styles = StyleSheet.create({
  // 칩 → 안내 → 버튼. 시안 간격 11
  bottom: { gap: 11 },
});
