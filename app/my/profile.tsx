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
import { useProfile } from "@/features/my/model/settings";
import { MAX_INTERESTS, type Gender } from "@/features/onboarding/model/draft";

/**
 * `M2` · 회고 프로필
 *
 * **바꾼 것이 없으면 `[저장하기]` 가 잠긴다**(`M2.md`) — 누를 수 있는 저장
 * 버튼은 "뭔가 바뀌었다"는 신호라, 아무것도 안 고친 화면에서 켜져 있으면 매번
 * 눌러 확인하게 된다.
 *
 * - **`[변경하지 않고 나가기]` 를 두지 않는다** — 나가는 길은 상단 뒤로가기
 *   하나다. 대신 **고치고 저장하지 않은 채 나가면 확인을 묻는다**
 *   (`my.invariants`). 바꾼 것이 없으면 바로 나간다
 * - 선택 칩에 **체크를 붙인다** — 색·테두리·굵기만으로 표시하지 않는다
 * - 관심 분야는 **최대 3개**(온보딩 `06` 과 같은 규칙)
 * - 쉬는 방법은 **고른 것 + 대표 몇 개**만 보이고 나머지는 `[＋ 더 고르기]` 로
 *   편다 — 15개를 다 펴는 곳은 온보딩 `07` 이다
 *
 * ⚠ **「기본 정보」(나이·성별) 섹션이 여기 있다.** `M1` 은 별도 줄로 두지만
 * 상류 상태 기계에 그 줄이 갈 화면이 없다 — 화면을 새로 만들지 않고 여기
 * 담았다(`settings.ts` 주석 · `TASKS.md` 「상류 확인」).
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

const GENDERS: readonly { id: Gender; label: string }[] = [
  { id: "male", label: "남성" },
  { id: "female", label: "여성" },
  { id: "none", label: "선택 안 함" },
];

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
  const [age, setAge] = useState(saved.age);
  const [gender, setGender] = useState<Gender | null>(saved.gender);
  const [restExpanded, setRestExpanded] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  // 바꾼 것이 없으면 저장이 잠기고, 뒤로가기도 묻지 않는다
  const changed =
    nickname.trim() !== saved.nickname ||
    !same(interests, saved.interests) ||
    !same(restMethods, saved.restMethods) ||
    age !== saved.age ||
    gender !== saved.gender;

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
    saved.set({ nickname: nickname.trim(), interests, restMethods, age, gender });
    router.back();
  };

  // 나가는 길은 이 하나뿐이다 — 고쳤으면 묻고, 아니면 그대로 나간다
  const leave = () => {
    if (changed) {
      setConfirmLeave(true);
      return;
    }
    router.back();
  };

  // 고른 것은 항상 보이고, 접혀 있을 때는 대표 몇 개가 함께 보인다
  const restItems = (restExpanded
    ? REST_ALL
    : Array.from(new Set([...restMethods, ...REST_PREVIEW]))
  ).map((label) => ({ id: label, label }));

  return (
    <ScreenBackground>
      <RetroNav title="회고 프로필" rest={false} onBack={leave} />

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
          <ChipFlow items={INTERESTS} selected={interests} onToggle={toggleInterest} showCheck />
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
            showCheck
          />
          {!restExpanded ? (
            <AppButton label="＋ 더 고르기" variant="ghost" onPress={() => setRestExpanded(true)} />
          ) : null}
        </Card>

        {/* 온보딩 05-b 에서 물은 것 — M1 의 「기본 정보」 줄이 여기로 온다 */}
        <Card style={styles.card}>
          <AppText tone="accent" weight="600" style={styles.section}>
            기본 정보
          </AppText>
          <AppText variant="caption" tone="caption">
            답변은 질문을 조금 더 잘 맞추는 데만 사용하며, 다른 사람에게 공개되지 않아요.
          </AppText>
          <InputRow
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            maxLength={3}
            onClear={() => setAge("")}
            accessibilityLabel="나이"
          />
          <ChipFlow
            items={GENDERS}
            selected={gender == null ? [] : [gender]}
            // 같은 것을 다시 누르면 미선택으로 — 선택 항목이라 무를 길이 있어야 한다
            onToggle={(id) => setGender(gender === id ? null : (id as Gender))}
            showCheck
          />
        </Card>

        <AppButton label="저장하기" disabled={!changed} onPress={save} />

        {/* 고치고 저장하지 않은 채 나가려 할 때만 — 나가기 버튼을 따로 두지 않는다 */}
        {confirmLeave ? (
          <Card style={styles.confirm}>
            <AppText tone="strong" weight="600" style={styles.confirmTitle}>
              고친 내용을 저장하지 않고 나갈까요?
            </AppText>
            <AppText variant="caption" tone="caption">
              저장하지 않으면 바꾼 값이 사라져요.
            </AppText>
            <View style={styles.confirmActions}>
              <AppButton
                label="계속 고치기"
                variant="ghost"
                style={styles.confirmButton}
                onPress={() => setConfirmLeave(false)}
              />
              <AppButton
                label="나가기"
                variant="ghost"
                style={styles.confirmButton}
                onPress={() => router.back()}
              />
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const { semantic } = theme.colors;

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

  confirm: { gap: 8, backgroundColor: semantic.surfaceTone, borderColor: "transparent" },
  confirmTitle: { fontSize: 14, lineHeight: 20 },
  confirmActions: { flexDirection: "row", gap: 9, paddingTop: 4 },
  confirmButton: { flex: 1 },
});
