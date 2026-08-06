import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Avatar } from "@/components/chat/Avatar";
import { BabaBubble } from "@/components/chat/BabaBubble";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ChipFlow } from "@/components/chat/ChipFlow";
import { OnboardingTopBar } from "@/components/onboarding/OnboardingTopBar";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `07` · 쉬는 방법 (온보딩 4/6 · 필수 · 복수)
 *
 * **MVP 에서 이 답이 쓰이는 화면은 없다. 그래도 묻는다** — 답은
 * `User.restMethods` 로 저장만 하고 쉼터가 열릴 때 추천의 근거가 된다.
 * 나중에 다시 물으면 사용자는 같은 질문을 두 번 받는다(`07.md`).
 * 2026-08-05 판에서 뺐던 화면을 상류가 되살렸다(`DECISIONS.md` 0.36-r).
 *
 * - **"쉬고 싶을 때"가 아니라 "지치거나 스트레스를 받을 때"** — 앞의 말은
 *   상황이 아니라 성향을 묻는 것으로 읽힌다
 * - **선택지 15개를 한 화면에 다 보인다.** "더 보기"로 접으면 뒤쪽은 사실상
 *   선택되지 않는다 — 칩을 13.5 · gap 7 로 좁혀 다 들어가게 한다
 * - **칩의 이모지는 선택지 라벨의 일부다** — 이모지를 선 아이콘으로 바꾼
 *   규칙의 유일한 예외(`07.md` · `RULES.md` 「아이콘」)
 * - `[그때마다 달라요]` 는 회피가 아니라 유효한 답이고, `[멍하니 쉬기]` 도
 *   하나의 방법이다
 * - 복수 선택 · **상한 없음** · 다시 누르면 취소
 * - 작은 기기에서는 **대화 영역만 스크롤**되고 시작 높이는 다른 질문과 같다
 */
const METHODS = [
  "😴 잠자기",
  "🧘 명상하기",
  "🍰 맛있는 음식 먹기",
  "🎵 음악 듣기",
  "🎬 영화·드라마 보기",
  "📖 독서하기",
  "✍️ 글쓰기",
  "☕ 카페 가기",
  "🚶 산책하기",
  "👥 가까운 사람과 대화하기",
  "🏃 운동하기",
  "🎮 게임하기",
  "🔄 그때마다 달라요",
  "😶 멍하니 쉬기",
  "기타",
].map((label) => ({ id: label, label }));

export default function Rest() {
  const picked = useDraft((s) => s.restMethods);
  const set = useDraft((s) => s.set);

  const toggle = (id: string) =>
    set(
      "restMethods",
      picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id],
    );

  return (
    <ScreenBackground>
      <OnboardingTopBar step={3} onBack={() => router.back()} />

      <ChatLayout>
        <Avatar />
        <BabaBubble index={0}>
          마음이 지치거나 스트레스를 받을 때, 어떤 방법이 가장 도움이 되나요?
        </BabaBubble>
        <BabaBubble index={1}>나중에 지쳐 보이는 날, 이걸 기억해뒀다 먼저 권해줄게요.</BabaBubble>
      </ChatLayout>

      <View style={styles.bottom}>
        {/* 15개를 한 화면에 — 칩 13.5 · gap 7 (9-mvp.mjs) */}
        <ChipFlow items={METHODS} selected={picked} onToggle={toggle} chipSize={13.5} gap={7} />

        <AppText variant="caption" tone="legal">
          {picked.length === 0
            ? "하나 이상 골라주세요"
            : `${picked.length}개 선택됨 · 다시 누르면 취소돼요`}
        </AppText>

        <AppButton label="다음" disabled={picked.length === 0} onPress={goNext} />
      </View>
    </ScreenBackground>
  );
}

const goNext = () => router.push("/retro-time");

const styles = StyleSheet.create({
  // 칩 → 안내 → 버튼. 시안 간격 11
  bottom: { gap: 11 },
});
