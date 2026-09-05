import { captureAnalytics } from "@/features/analytics";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Card, Text } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { label as labelColor, line, space, status } from "@/design/ds";
import { adoptProfile } from "@/features/my/model/settings";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";
import { formatKoreanTime } from "@/lib/time";

/**
 * `10` · 완료 (+ `10-b` 캘린더·알림을 건너뛴 경우)
 *
 * **정한 것만 보여준다.** 완료 카드는 성적표가 아니라 "이렇게 맞춰뒀어요"라는
 * 확인이다 — 고른 항목만 줄로 남고, 고르지 않은 것은 **자리째 사라진다**(`10.md`).
 *
 * - **고르지 않은 것을 부정형으로 강조하지 않는다** — "연결 안 함" 줄은 안 한 일을
 *   결과처럼 보이게 한다(`10-b.md`)
 * - `10-b` 는 별도 레이아웃이 아니라 **카드 안의 줄만** 다르다
 * - **쉬는 방법 줄이 없다** — `07` 은 묻지만 답은 저장만 한다(`RULES.md` · `07.md`)
 * - 점수·연속·배지·축하 연출 없음. **뒤로가기도 없다** — 끝났으므로 돌아갈 곳이 없다
 *
 * ## `[시작하기]` 는 서버에 답을 남기고서야 홈으로 간다
 *
 * **온보딩 완료의 정본은 서버다** — `syncMe` 가 `onboardingRequired` 를 보고
 * 진입을 가른다(`auth.ts`). 보내지 못한 채 홈으로 보내면 앱을 다시 열었을 때
 * **처음부터 다시 묻게 된다.** 아홉 화면을 두 번 답하게 하느니 여기서 한 번
 * 더 누르는 편이 낫다.
 *
 * 실패는 **버튼 아래 한 줄**로만 말한다(`RULES.md` 4 · `S1` 과 같은 자리).
 */
export default function Done() {
  const calendarLinked = useDraft((s) => s.calendarLinked);
  const notifyRetro = useDraft((s) => s.notifyRetro);
  const retroTime = useDraft((s) => s.retroTime);
  const complete = useOnboardingCompletion((s) => s.complete);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 알림만 끄면 캘린더 줄이 남고, 캘린더만 건너뛰면 시간 줄이 남는다 (10-b.md)
  const showCalendar = calendarLinked;
  const showTime = notifyRetro;
  const nothingSet = !showCalendar && !showTime;

  const start = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const record = captureAnalytics();
    const draft = useDraft.getState();
    const result = await completeOnboarding({
      nickname: draft.nickname,
      age: draft.age,
      gender: draft.gender,
      interests: draft.interests,
      interestOther: draft.interestOther,
      restMethods: draft.restMethods,
      restMethodOther: draft.restMethodOther,
      retroTime: draft.retroTime,
      notifyRetro: draft.notifyRetro,
      calendarLinked: draft.calendarLinked,
    });
    setSubmitting(false);

    // 서버가 아직 「온보딩 필요」라면 받은 것이 아니다 — 홈으로 보내면 다음
    // 실행에 온보딩이 다시 뜬다
    if (!result.ok || result.data.onboardingRequired) {
      setError(
        result.ok ? ONBOARDING_FAILURE_MESSAGES.server : ONBOARDING_FAILURE_MESSAGES[result.code],
      );
      return;
    }

    record("onboarding_step_completed", { step: "done" });
    record("onboarding_completed", {}, "onboarding");

    // 답을 실사용 store 로 옮긴 **뒤에** 초안을 비운다. 순서가 바뀌면 빈 값이 넘어간다
    adoptProfile({
      nickname: draft.nickname,
      age: draft.age,
      gender: draft.gender,
      interests: draft.interests,
      restMethods: draft.restMethods,
      retroTime: draft.retroTime,
      notifyRetro: draft.notifyRetro,
      calendarLinked: draft.calendarLinked,
    });
    // 초안은 여기까지가 수명이다. 남기면 다음 사람의 온보딩에 앞 답이 섞인다
    draft.reset();
    // 다시 열었을 때 온보딩을 되풀이하지 않게 — S0 의 진입 판정이 이 값을 본다
    complete();
    // 온보딩의 끝은 홈이다 — 완료 화면을 허브로 만들지 않는다
    router.replace("/home");
  };

  return (
    <OnboardingChat
      step="done"
      inline={
        <Card testID="onboarding-summary" style={styles.summary} padding="none">
          {/* 문안은 정본(`10.md`)을 쓴다 — 시안의 「일정 참고」가 아니라
              「캘린더 연결 완료」다. 두 곳에 다 있는 슬롯이라 정본이 이긴다 */}
          {showCalendar ? (
            <SummaryRow title="캘린더 연결 완료" description="오늘 일정을 함께 기억할게요." />
          ) : null}

          {showCalendar && showTime ? <View style={styles.divider} /> : null}

          {showTime ? (
            <SummaryRow title="돌아보는 시간" value={formatKoreanTime(retroTime)} />
          ) : null}

          {nothingSet ? (
            // 10-b — 없는 줄을 지운 자리에 한 줄로 길만 알려준다
            <View style={styles.row}>
              <Text variant="body2Reading" color={labelColor.neutral}>
                캘린더 연결과 돌아보는 시간은 마이에서 언제든 설정할 수 있어요.
              </Text>
            </View>
          ) : null}
        </Card>
      }
    >
      <Text variant="caption1" color={labelColor.alternative} style={styles.centered}>
        마이에서 언제든 바꿀 수 있어요.
      </Text>

      {/* 건너뛴 사람에게 다른 문을 만들지 않는다 — CTA 는 두 화면이 같다 (10-b.md) */}
      <Button label="모멘토리 시작하기" fill disabled={submitting} onPress={() => void start()} />

      {/* 실패는 버튼 아래 한 줄 — 모달도 재시도 버튼도 없다 (RULES.md 4) */}
      {error != null ? (
        <Text
          variant="caption1"
          color={status.negative}
          style={styles.centered}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          {error}
        </Text>
      ) : null}
    </OnboardingChat>
  );
}

/** 요약 한 줄 — 제목 + (설명 | 값). 시안의 ListCell 자리다 */
function SummaryRow({
  title,
  description,
  value,
}: {
  title: string;
  description?: string;
  value?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text variant="body1" color={labelColor.strong}>
          {title}
        </Text>
        {description != null ? (
          <Text variant="caption1" color={labelColor.alternative}>
            {description}
          </Text>
        ) : null}
      </View>
      {value != null ? (
        <Text variant="body2" color={labelColor.neutral}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { alignSelf: "flex-start", width: 288 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  rowCopy: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: line.alternative, marginHorizontal: space.lg },
  centered: { textAlign: "center" },
});
