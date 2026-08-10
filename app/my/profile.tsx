import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ChipFlow } from "@/components/chat/ChipFlow";
import { ConfirmCard } from "@/components/common/ConfirmCard";
import { RetroNav } from "@/components/common/RetroNav";
import { SectionLabel } from "@/components/common/SectionLabel";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { useProfile } from "@/features/my/model/settings";
import { MAX_INTERESTS } from "@/features/onboarding/model/draft";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

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
 * - 확인은 **라우트 수준**(`beforeRemove`)에서도 지킨다 — 상단 뒤로가기만이
 *   아니라 **Android 하드웨어 back·스와이프 제스처**도 같은 정책을 지난다
 * - 선택 칩에 **체크를 붙인다** — 색·테두리·굵기만으로 표시하지 않는다
 * - 관심 분야는 **최대 3개**(온보딩 `06` 과 같은 규칙)
 * - 쉬는 방법은 **고른 것 + 대표 몇 개**만 보이고 나머지는 `[＋ 더 고르기]` 로
 *   편다 — 15개를 다 펴는 곳은 온보딩 `07` 이다
 *
 * ⚠ **「기본 정보」(나이·성별) 섹션이 여기 있다.** `M1` 은 별도 줄로 두지만
 * 상류 상태 기계에 그 줄이 갈 화면이 없다 — 화면을 새로 만들지 않고 여기
 * 담았다(`settings.ts` 주석 · `TASKS.md` 「상류 확인」).
 *
 * **관심사·성별 칩은 온보딩 `06`·`05-b` 와 같은 목록이고 서버가 준다**
 * (`model/options.ts`). 전에는 두 화면이 배열을 각자 들고 있어서, 한쪽만
 * 고치면 온보딩에서 고른 칩이 여기서 사라지는 구조였다.
 * 쉬는 방법 15종은 **서버에 없어** 아래에 남는다.
 */

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
];

export default function ProfileEdit() {
  const saved = useProfile();
  const navigation = useNavigation();
  const interestItems = useOnboardingOptions((s) => s.interestAreas);
  const genderItems = useOnboardingOptions((s) => s.genders);
  const maxNickname = useOnboardingOptions((s) => s.nickname.maxLength);

  // 온보딩을 거치지 않고 여기로 바로 올 수 있다(마이 → 회고 프로필) — 그때도
  // 서버 목록을 쓴다. 이미 받았으면 아무 일도 하지 않는다
  useEffect(() => {
    void useOnboardingOptions.getState().load();
  }, []);

  const [nickname, setNickname] = useState(saved.nickname);
  const [interests, setInterests] = useState<string[]>(saved.interests);
  const [restMethods, setRestMethods] = useState<string[]>(saved.restMethods);
  const [age, setAge] = useState(saved.age);
  const [gender, setGender] = useState<string | null>(saved.gender);
  const [restExpanded, setRestExpanded] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // 확인을 거친 이탈 — beforeRemove 가 같은 이탈을 다시 막지 않게 한다
  const allowLeave = useRef(false);
  // OS 뒤로가기(하드웨어 back·스와이프)가 막아 둔 네비게이션 — [나가기]가 이어서 실행한다
  const resumeLeave = useRef<(() => void) | null>(null);

  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  // 바꾼 것이 없으면 저장이 잠기고, 뒤로가기도 묻지 않는다
  const changed =
    nickname.trim() !== saved.nickname ||
    !same(interests, saved.interests) ||
    !same(restMethods, saved.restMethods) ||
    age !== saved.age ||
    gender !== saved.gender;

  // 상단 뒤로가기만이 아니라 Android back·스와이프도 같은 확인을 지난다 (my.invariants)
  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      if (!changed || allowLeave.current) return;
      e.preventDefault();
      const action = e.data.action;
      resumeLeave.current = () => navigation.dispatch(action);
      setConfirmLeave(true);
    });
  }, [navigation, changed]);

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
    // 저장한 이탈은 잃는 것이 없다 — beforeRemove 가 묻지 않게 한다
    allowLeave.current = true;
    router.back();
  };

  // 상단 뒤로가기 — 고쳤으면 묻고, 아니면 그대로 나간다. OS 뒤로가기와 같은 정책이다
  const leave = () => {
    if (changed) {
      setConfirmLeave(true);
      return;
    }
    router.back();
  };

  // 확인의 [나가기] — OS 뒤로가기가 막혀 있었다면 그 네비게이션을 이어서 실행한다
  const confirmedLeave = () => {
    allowLeave.current = true;
    const resume = resumeLeave.current;
    if (resume != null) {
      resume();
      return;
    }
    router.back();
  };

  // 고른 것은 항상 보이고, 접혀 있을 때는 대표 몇 개가 함께 보인다
  const restItems = (
    restExpanded ? REST_ALL : Array.from(new Set([...restMethods, ...REST_PREVIEW]))
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
          <SectionLabel>닉네임</SectionLabel>
          <InputRow
            value={nickname}
            onChangeText={setNickname}
            maxLength={maxNickname}
            showCounter
            accessibilityLabel="닉네임"
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.head}>
            <SectionLabel>관심 분야</SectionLabel>
            <AppText tone="caption" style={styles.count}>
              {`최대 ${MAX_INTERESTS}개 · ${interests.length}개 선택`}
            </AppText>
          </View>
          <ChipFlow
            items={interestItems}
            selected={interests}
            onToggle={toggleInterest}
            showCheck
          />
        </Card>

        {/* 온보딩 07 에서 물은 것이라 편집 경로가 여기 있어야 한다 */}
        <Card style={styles.card}>
          <View style={styles.head}>
            <SectionLabel>쉬는 방법</SectionLabel>
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
          <SectionLabel>기본 정보</SectionLabel>
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
            items={genderItems}
            selected={gender == null ? [] : [gender]}
            // 같은 것을 다시 누르면 미선택으로 — 선택 항목이라 무를 길이 있어야 한다
            onToggle={(id) => setGender(gender === id ? null : id)}
            showCheck
          />
        </Card>

        <AppButton label="저장하기" disabled={!changed} onPress={save} />

        {/* 고치고 저장하지 않은 채 나가려 할 때만 — 나가기 버튼을 따로 두지 않는다 */}
        {confirmLeave ? (
          <ConfirmCard
            title="고친 내용을 저장하지 않고 나갈까요?"
            caption="저장하지 않으면 바꾼 값이 사라져요."
            cancelLabel="계속 고치기"
            confirmLabel="나가기"
            onCancel={() => {
              resumeLeave.current = null;
              setConfirmLeave(false);
            }}
            onConfirm={confirmedLeave}
          />
        ) : null}
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
  count: { flex: 1, textAlign: "right", fontSize: 11.5, lineHeight: 14 },
});
