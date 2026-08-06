import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ChipFlow } from "@/components/chat/ChipFlow";
import { RetroNav } from "@/components/common/RetroNav";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { home } from "@/design/tokens.mvp";
import { MAX_INTERESTS } from "@/features/onboarding/model/draft";
import { useProfile } from "@/features/my/model/settings";

/**
 * `M2` · 회고 프로필
 *
 * **바꾼 것이 없으면 `[저장하기]` 가 잠긴다**(`M2.md`) — 누를 수 있는 저장
 * 버튼은 "뭔가 바뀌었다"는 신호라, 아무것도 안 고친 화면에서 켜져 있으면 매번
 * 눌러 확인하게 된다.
 *
 * - **온보딩에서 묻지 않은 것을 여기서 편집하게 두지 않는다.** 반대로 물은 것은
 *   전부 여기 또는 `M1` 의 다른 줄에 있어야 한다 — 쉬는 방법(`07`) 섹션이 그래서 있다
 * - 선택 칩은 색·굵기만이 아니라 **테두리 굵기**로도 표시한다(`ChipFlow`)
 * - **`[변경하지 않고 나가기]` 를 두지 않는다** — 나가는 길은 상단 뒤로가기
 *   하나로 통일한다. 나가기 버튼이 둘이면 어느 쪽이 저장인지 매번 읽어야 한다
 * - 관심 분야는 **최대 3개**(온보딩 `06` 과 같은 규칙)
 * - 쉬는 방법은 **고른 것 + 대표 몇 개**만 보이고 나머지는 `[＋ 더 고르기]` 로
 *   편다 — 15개를 다 펴는 곳은 온보딩 `07` 이다
 */
const INTERESTS = [
  { id: "study", label: "학업" },
  { id: "career", label: "취업·진로" },
  { id: "work", label: "일·직장생활" },
  { id: "relations", label: "인간관계" },
  { id: "family", label: "가족" },
  { id: "self", label: "나 자신" },
  { id: "health", label: "건강" },
  { id: "etc", label: "기타" },
] as const;

/** 대표 여섯 — 나머지는 `[＋ 더 고르기]` 로 편다 */
const REST_PREVIEW = [
  "😴 잠자기",
  "🎵 음악 듣기",
  "🚶 산책하기",
  "☕ 카페 가기",
  "🏃 운동하기",
  "📖 독서하기",
];

const REST_ALL = [
  "😴 잠자기", "🧘 명상하기", "🍰 맛있는 음식 먹기", "🎵 음악 듣기", "🎬 영화·드라마 보기",
  "📖 독서하기", "✍️ 글쓰기", "☕ 카페 가기", "🚶 산책하기", "👥 가까운 사람과 대화하기",
  "🏃 운동하기", "🎮 게임하기", "🔄 그때마다 달라요", "😶 멍하니 쉬기", "기타",
];

export default function ProfileEdit() {
  const saved = useProfile();

  const [nickname, setNickname] = useState(saved.nickname);
  const [interests, setInterests] = useState<string[]>(saved.interests);
  const [restMethods, setRestMethods] = useState<string[]>(saved.restMethods);
  const [restExpanded, setRestExpanded] = useState(false);

  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  // 바꾼 것이 없으면 잠긴다
  const changed =
    nickname.trim() !== saved.nickname ||
    !same(interests, saved.interests) ||
    !same(restMethods, saved.restMethods);

  const toggleInterest = (id: string) => {
    if (interests.includes(id)) {
      setInterests(interests.filter((x) => x !== id));
      return;
    }
    // 온보딩 06 과 같은 규칙 — 넷째부터는 눌러도 켜지지 않는다
    if (interests.length >= MAX_INTERESTS) return;
    setInterests([...interests, id]);
  };

  const toggleRest = (id: string) =>
    setRestMethods(
      restMethods.includes(id) ? restMethods.filter((x) => x !== id) : [...restMethods, id],
    );

  const save = () => {
    saved.set({ nickname: nickname.trim(), interests, restMethods });
    router.back();
  };

  // 고른 것은 항상 보이고, 접혀 있을 때는 대표 몇 개가 함께 보인다
  const restItems = (restExpanded
    ? REST_ALL
    : Array.from(new Set([...restMethods, ...REST_PREVIEW]))
  ).map((label) => ({ id: label, label }));

  return (
    <ScreenBackground>
      <RetroNav title="회고 프로필" rest={false} />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <AppText variant="caption" tone="caption">
          여기서 고친 값은 바바의 다음 대화부터 반영돼요
        </AppText>

        <Card style={styles.card}>
          <AppText tone="accent" weight="600" style={styles.section}>
            닉네임
          </AppText>
          <InputRow
            value={nickname}
            onChangeText={setNickname}
            maxLength={10}
            showCounter
            accessibilityLabel="닉네임"
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.head}>
            <AppText tone="accent" weight="600" style={styles.section}>
              관심 분야
            </AppText>
            <AppText tone="caption" style={styles.count}>
              {`최대 ${MAX_INTERESTS}개 · ${interests.length}개 선택`}
            </AppText>
          </View>
          <ChipFlow items={INTERESTS} selected={interests} onToggle={toggleInterest} />
        </Card>

        {/* 온보딩 07 에서 물은 것이라 편집 경로가 여기 있어야 한다 */}
        <Card style={styles.card}>
          <View style={styles.head}>
            <AppText tone="accent" weight="600" style={styles.section}>
              쉬는 방법
            </AppText>
            <AppText tone="caption" style={styles.count}>
              {`${restMethods.length}개 선택`}
            </AppText>
          </View>
          <ChipFlow
            items={restItems}
            selected={restMethods}
            onToggle={toggleRest}
            chipSize={13.5}
            gap={7}
          />
          {!restExpanded ? (
            <AppButton
              label="＋ 더 고르기"
              variant="ghost"
              onPress={() => setRestExpanded(true)}
            />
          ) : null}
        </Card>

        {/* 나가는 길은 상단 뒤로가기 하나 — [변경하지 않고 나가기] 를 두지 않는다 */}
        <AppButton label="저장하기" disabled={!changed} onPress={save} />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingVertical: theme.layout.gap.element,
  },
  card: { gap: 10 },
  head: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  section: {
    fontSize: home.sectionLabel.fontSize,
    lineHeight: home.sectionLabel.fontSize,
    letterSpacing: home.sectionLabel.letterSpacing,
  },
  count: { flex: 1, textAlign: "right", fontSize: 11.5, lineHeight: 14 },
});
