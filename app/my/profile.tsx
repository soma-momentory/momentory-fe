import { router, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ChipFlow } from "@/components/chat/ChipFlow";
import { ConfirmCard } from "@/components/common/ConfirmCard";
import { RetroNav } from "@/components/common/RetroNav";
import { SectionLabel } from "@/components/common/SectionLabel";
import { OtherRow } from "@/components/onboarding/OtherRow";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { InputRow } from "@/components/primitives/InputRow";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import { paperColors, paperTypography } from "@/design/paper";
import theme from "@/design/theme";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import {
  MAX_INTERESTS,
  OTHER_INTEREST,
  OTHER_REST_METHOD,
} from "@/features/onboarding/model/draft";
import { useOnboardingOptions } from "@/features/onboarding/model/options";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";

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
 * **칩 목록 넷을 전부 서버가 준다** — 관심사·성별·닉네임 상한에 이어 **쉬는
 * 방법 15종도** 온보딩과 같은 목록을 본다(`model/options.ts`). 전에는 화면이
 * 배열을 각자 들고 있어서, 한쪽만 고치면 온보딩에서 고른 칩이 여기서 사라졌다.
 *
 * **「기타」 두 줄이 여기 있다.** 관심 분야와 쉬는 방법 각각의 직접 입력 값은
 * 온보딩 `06-b`·`07` 에서 물은 답인데 고칠 자리가 없었다 — `my.invariants`
 * (「온보딩에서 답한 항목은 빠짐없이 편집 경로가 있어야 한다」)가 비어 있던
 * 자리이자, 서버가 `OTHER` 와 함께 요구하는 값이라 없으면 저장이 400 이다
 * (`DISCUSSION.md` §1-7).
 *
 * **저장은 서버까지 간다** — `PUT /api/v1/users/me/onboarding`(온보딩 완료와
 * 같은 엔드포인트). 그전에는 이 화면의 저장이 기기 메모리에만 남아서, 앱을
 * 껐다 켜면 고친 값이 사라졌다. 실패하면 **닫지 않고** 버튼 아래 한 줄로 말한다.
 *
 * ## 새 디자인 (2026-08-14 · `PLAN.md` Phase 3-7)
 *
 * 종이 배경 + 상단 · 카드 · 확인을 새 톤으로 바꿨다(`variant="paper"` opt-in).
 * ⚠ **아직 옛 톤인 것 셋** — 칩(`ChipFlow`) · 입력 줄(`InputRow`) · 저장 버튼
 * (`AppButton`). 셋 다 온보딩과 공유하는 컴포넌트라 여기서 기본값을 바꾸면
 * 리스킨 전 화면이 함께 바뀐다(`PLAN.md` Phase 2 — 아직 변형이 없다).
 */

/** 접혀 있을 때 함께 보이는 개수 — 나머지는 `[＋ 더 고르기]` 로 편다 */
const REST_PREVIEW_COUNT = 6;

export default function ProfileEdit() {
  const saved = useProfile();
  const navigation = useNavigation();
  const interestItems = useOnboardingOptions((s) => s.interestAreas);
  const genderItems = useOnboardingOptions((s) => s.genders);
  const restItemsAll = useOnboardingOptions((s) => s.restMethods);
  const maxNickname = useOnboardingOptions((s) => s.nickname.maxLength);
  // 이 화면은 회고 시각·알림을 묻지 않는다 — 서버가 통째로 덮으므로 지금 값을 함께 보낸다
  const retroTime = useSettings((s) => s.notify.retro.time);
  const notifyRetro = useSettings((s) => s.notify.retro.enabled);

  // 온보딩을 거치지 않고 여기로 바로 올 수 있다(마이 → 회고 프로필) — 그때도
  // 서버 목록을 쓴다. 이미 받았으면 아무 일도 하지 않는다
  useEffect(() => {
    void useOnboardingOptions.getState().load();
  }, []);

  const [nickname, setNickname] = useState(saved.nickname);
  const [interests, setInterests] = useState<string[]>(saved.interests);
  const [interestOther, setInterestOther] = useState(saved.interestOther);
  const [restMethods, setRestMethods] = useState<string[]>(saved.restMethods);
  const [restMethodOther, setRestMethodOther] = useState(saved.restMethodOther);
  const [age, setAge] = useState(saved.age);
  const [gender, setGender] = useState<string | null>(saved.gender);
  const [restExpanded, setRestExpanded] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 확인을 거친 이탈 — beforeRemove 가 같은 이탈을 다시 막지 않게 한다
  const allowLeave = useRef(false);
  // OS 뒤로가기(하드웨어 back·스와이프)가 막아 둔 네비게이션 — [나가기]가 이어서 실행한다
  const resumeLeave = useRef<(() => void) | null>(null);

  const same = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((x) => b.includes(x));
  // 바꾼 것이 없으면 저장이 잠기고, 뒤로가기도 묻지 않는다
  const etcInterestOn = interests.includes(OTHER_INTEREST);
  const etcRestOn = restMethods.includes(OTHER_REST_METHOD);
  const changed =
    nickname.trim() !== saved.nickname ||
    !same(interests, saved.interests) ||
    !same(restMethods, saved.restMethods) ||
    interestOther.trim() !== saved.interestOther ||
    restMethodOther.trim() !== saved.restMethodOther ||
    age !== saved.age ||
    gender !== saved.gender;

  // 기타를 켠 채 비워 두면 저장이 잠긴다 — 서버가 400 으로 거절하는 모양이고
  // 온보딩 `06-b`·`07` 과도 같은 규칙이다
  const ready =
    (!etcInterestOn || interestOther.trim().length > 0) &&
    (!etcRestOn || restMethodOther.trim().length > 0);

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
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 남기지 않는다 (06-b 와 같다)
      if (id === OTHER_INTEREST) setInterestOther("");
      return;
    }
    // 온보딩 06 과 같은 규칙 — 넷째부터는 눌러도 켜지지 않는다
    if (interests.length >= MAX_INTERESTS) return;
    setInterests([...interests, id]);
  };

  const toggleRest = (id: string) => {
    if (restMethods.includes(id)) {
      setRestMethods(restMethods.filter((x) => x !== id));
      if (id === OTHER_REST_METHOD) setRestMethodOther("");
      return;
    }
    setRestMethods([...restMethods, id]);
  };

  /**
   * **서버까지 갔다 와야 저장이다.** 기기에만 남기면 앱을 껐다 켤 때
   * `syncMe` 가 서버 값으로 덮어서 고친 것이 조용히 사라진다.
   */
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    const next = {
      nickname: nickname.trim(),
      interests,
      interestOther: interestOther.trim(),
      restMethods,
      restMethodOther: restMethodOther.trim(),
      age,
      gender,
    };
    // 온보딩과 같은 엔드포인트다 — 시각·알림·캘린더는 이 화면이 묻지 않으므로
    // 지금 값을 그대로 다시 보낸다(서버가 통째로 덮어쓴다)
    const result = await completeOnboarding({
      ...next,
      retroTime: retroTime ?? "",
      notifyRetro,
      calendarLinked: saved.calendarLinked,
    });
    setSaving(false);

    if (!result.ok) {
      setError(ONBOARDING_FAILURE_MESSAGES[result.code]);
      return;
    }

    saved.set(next);
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

  // 고른 것은 항상 보이고, 접혀 있을 때는 목록 앞쪽 몇 개가 함께 보인다.
  // **대표를 우리가 고르지 않는다** — 목록의 순서도 서버가 정한다
  const restItems = restExpanded
    ? restItemsAll
    : restItemsAll.filter((item, i) => i < REST_PREVIEW_COUNT || restMethods.includes(item.id));

  return (
    <ScreenBackground variant="paperFlat">
      <RetroNav title="회고 프로필" rest={false} variant="paper" onBack={leave} />

      <ScrollView
        style={styles.stack}
        contentContainerStyle={styles.stackContent}
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.hint}>여기서 고친 값은 바바의 다음 대화부터 반영돼요</AppText>

        <Card variant="paperOpaque" style={styles.card}>
          <SectionLabel variant="paper">닉네임</SectionLabel>
          <InputRow
            value={nickname}
            onChangeText={setNickname}
            maxLength={maxNickname}
            showCounter
            accessibilityLabel="닉네임"
          />
        </Card>

        <Card variant="paperOpaque" style={styles.card}>
          <View style={styles.head}>
            <SectionLabel variant="paper">관심 분야</SectionLabel>
            <AppText style={styles.count}>
              {`최대 ${MAX_INTERESTS}개 · ${interests.length}개 선택`}
            </AppText>
          </View>
          <ChipFlow
            items={interestItems}
            selected={interests}
            onToggle={toggleInterest}
            showCheck
          />
          {/* 온보딩 06-b 에서 물은 답 — 여기 없으면 고칠 길이 없다 (my.invariants) */}
          {etcInterestOn ? (
            <OtherRow
              label="관심 분야 기타"
              value={interestOther}
              onChangeText={setInterestOther}
              onCommit={() => setInterestOther(interestOther.trim())}
            />
          ) : null}
        </Card>

        {/* 온보딩 07 에서 물은 것이라 편집 경로가 여기 있어야 한다 */}
        <Card variant="paperOpaque" style={styles.card}>
          <View style={styles.head}>
            <SectionLabel variant="paper">쉬는 방법</SectionLabel>
            <AppText style={styles.count}>{`${restMethods.length}개 선택`}</AppText>
          </View>
          <ChipFlow
            items={restItems}
            selected={restMethods}
            onToggle={toggleRest}
            chipSize={13.5}
            gap={7}
            showCheck
          />
          {/* 온보딩 07 에서 물은 답 — 서버가 OTHER 와 함께 요구한다 (DISCUSSION §1-7) */}
          {etcRestOn ? (
            <OtherRow
              label="쉬는 방법 기타"
              value={restMethodOther}
              onChangeText={setRestMethodOther}
              onCommit={() => setRestMethodOther(restMethodOther.trim())}
            />
          ) : null}
          {!restExpanded ? (
            <AppButton label="＋ 더 고르기" variant="ghost" onPress={() => setRestExpanded(true)} />
          ) : null}
        </Card>

        {/* 온보딩 05-b 에서 물은 것 — M1 의 「기본 정보」 줄이 여기로 온다 */}
        <Card variant="paperOpaque" style={styles.card}>
          <SectionLabel variant="paper">기본 정보</SectionLabel>
          <AppText style={styles.hint}>
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

        <AppButton
          label="저장하기"
          disabled={!changed || !ready || saving}
          onPress={() => void save()}
        />

        {/* 실패는 버튼 아래 한 줄 — 화면을 닫지 않는다. 다시 누를 곳은 CTA 하나다 */}
        {error != null ? <AppText style={styles.error}>{error}</AppText> : null}

        {/* 고치고 저장하지 않은 채 나가려 할 때만 — 나가기 버튼을 따로 두지 않는다 */}
        {confirmLeave ? (
          <ConfirmCard
            variant="paper"
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

const { styles: type } = paperTypography;

const styles = StyleSheet.create({
  stack: { flex: 1, marginHorizontal: -theme.layout.screenMargin },
  stackContent: {
    gap: 10,
    paddingHorizontal: theme.layout.screenMargin,
    paddingVertical: theme.layout.gap.element,
  },
  card: { gap: 10 },
  head: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  hint: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.green,
  },
  count: {
    flex: 1,
    textAlign: "right",
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.green,
  },
  // 실패는 경고 아이콘도 모달도 없이 **글자 한 줄**이다 — 면을 채우지 않는다
  error: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight * 1.2,
    color: paperColors.accent.dangerFill,
  },
});
