import { captureAnalytics } from "@/features/analytics";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Icon, Text } from "@/components/ds";
import { Baba, Bubble, OnboardingFrame } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, onboardingArt, primary, space } from "@/design/ds";
import { adoptProfile, useProfile } from "@/features/my/model/settings";
import { completeOnboardingV2 } from "@/features/onboarding/data/completeOnboardingApi";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";
import { defaultRetroTime, FIRST_RETRO } from "@/features/onboarding/model/flow";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";

/**
 * 지금 첫 회고 — 온보딩의 끝. 두 버튼 모두 여기서 답을 서버에 보낸다(`PUT /api/v2/…`).
 * 「지금 이야기하기」는 기존 회고를 바로 열고, 「밤에 할게요」는 홈으로 간다.
 * 저장에 실패하면 버튼 아래 한 줄만 띄운다(`RULES.md` 4).
 */
export default function Now() {
  const notify = useDraft((s) => s.notifyRetro);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (talkNow: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const record = captureAnalytics();
    const draft = useDraft.getState();
    const retroTime = draft.retroTime ?? defaultRetroTime(draft.answers.dayEnd);
    const result = await completeOnboardingV2({
      nickname: draft.nickname,
      age: draft.age,
      gender: draft.gender,
      retroTime,
      notifyRetro: draft.notifyRetro,
      calendarLinked: draft.calendarLinked,
      answers: draft.answers,
      goals: draft.goals,
    });
    setSubmitting(false);

    // 서버가 아직 「온보딩 필요」라면 받은 것이 아니다 — 홈으로 보내면 다음 실행에 다시 뜬다
    if (!result.ok || result.data.onboardingRequired) {
      record("onboarding_submit_failed", { code: result.ok ? "still_required" : result.code });
      setError(
        result.ok ? ONBOARDING_FAILURE_MESSAGES.server : ONBOARDING_FAILURE_MESSAGES[result.code],
      );
      return;
    }

    record(
      "onboarding_completed",
      {
        version: 2,
        is_reonboarding: draft.reonboarding,
        mood_change: draft.answers.moodChange ?? "SKIPPED",
        know_why: draft.answers.knowWhy ?? "SKIPPED",
        day_end: draft.answers.dayEnd ?? "SKIPPED",
        diary_history: draft.answers.diaryHistory ?? "SKIPPED",
        goals: [...draft.goals].sort().join(","),
        first_retro: talkNow ? "now" : "later",
      },
      "onboarding",
    );

    // 답을 실사용 store 로 옮긴 **뒤에** 초안을 비운다. 관심사는 새 온보딩이 묻지 않아 지금 값을 둔다
    adoptProfile({
      nickname: draft.nickname.trim(),
      age: draft.age.trim(),
      gender: draft.gender,
      interests: useProfile.getState().interests,
      retroTime,
      notifyRetro: draft.notifyRetro,
      calendarLinked: draft.calendarLinked,
    });
    draft.reset();
    useOnboardingCompletion.getState().complete();

    router.replace("/home");
    if (talkNow) router.push("/retro/confirm");
  };

  return (
    <OnboardingFrame
      art={
        <View style={styles.art}>
          <Bubble large style={styles.bubble}>
            {FIRST_RETRO.bubble}
          </Bubble>
          <View style={styles.pair}>
            <Baba size={200} />
            <View style={styles.book}>
              <View style={styles.cover}>
                <Icon name="document" size={24} color={primary.heavy} />
              </View>
              <Text variant="caption2" color={labelColor.neutral}>
                오늘 일기
              </Text>
            </View>
          </View>
        </View>
      }
      title={FIRST_RETRO.title}
      body={FIRST_RETRO.body}
      primary={{ label: FIRST_RETRO.now, disabled: submitting, onPress: () => void finish(true) }}
      secondary={{ label: FIRST_RETRO.later(notify), onPress: () => void finish(false) }}
      error={error}
    />
  );
}

const styles = StyleSheet.create({
  art: { alignItems: "center" },
  bubble: { marginBottom: space.md },
  pair: { flexDirection: "row", alignItems: "flex-end" },
  book: { alignItems: "center", gap: 2, marginLeft: -space.md, transform: [{ rotate: "8deg" }] },
  cover: {
    width: 48,
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: onboardingArt.paper,
    borderWidth: 2,
    borderColor: primary.heavy,
  },
});
