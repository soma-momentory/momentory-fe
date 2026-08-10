import { router } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import { CheckCircleIcon, MoonIcon } from "@/components/icons/LineIcons";
import { AppButton } from "@/components/primitives/AppButton";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { ScreenBackground } from "@/components/primitives/ScreenBackground";
import theme from "@/design/theme";
import { adoptProfile } from "@/features/my/model/settings";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";
import { formatKoreanTime } from "@/lib/time";

/**
 * `10` · 완료 + `10-b` · 캘린더·알림을 건너뛴 경우
 *
 * **정한 것만 보여준다.** 완료 카드는 성적표가 아니라 "이렇게 맞춰뒀어요"라는
 * 확인이다 — 고른 항목만 줄로 남고, 고르지 않은 것은 **자리째 사라진다**(`10.md`).
 *
 * - **고르지 않은 것을 부정형으로 강조하지 않는다** — "연결 안 함" 줄과 점선
 *   원은 안 한 일을 결과처럼 보이게 한다(`10-b.md`)
 * - `10-b` 는 별도 레이아웃이 아니라 **카드 안의 줄만** 다르다 — 캘린더·알림을
 *   모두 건너뛰면 안내 한 줄만 남고, 부분 건너뜀은 남은 줄 + 맨 아래 한 줄
 * - **아이콘은 17px 벡터 한 벌**(`.ico17`)이고 이모지를 섞지 않는다. 체크는
 *   `primaryDeep` 채운 원 + 흰 체크 — primary 는 장식 전용이라 면이 아니다
 * - **쉬는 방법 줄이 없다** — `07` 은 묻지만 답은 저장만 하고, `10` 요약 줄은
 *   쉼터 연쇄라 그대로 제외다(`RULES.md` · `07.md`)
 * - 점수·연속·배지·축하 연출 없음. 진행점도 없다 — 끝났으므로 남은 분량이 없다
 *
 * ## `[시작하기]` 는 서버에 답을 남기고서야 홈으로 간다
 *
 * **온보딩 완료의 정본은 서버다** — `syncMe` 가 `onboardingRequired` 를 보고
 * 진입을 가른다(`auth.ts`). 보내지 못한 채 홈으로 보내면 앱을 다시 열었을 때
 * **처음부터 다시 묻게 된다.** 열한 화면을 두 번 답하게 하느니 여기서 한 번
 * 더 누르는 편이 낫다.
 *
 * 실패는 **버튼 아래 한 줄**로만 말한다(`RULES.md` 4 · `S1` 과 같은 자리).
 * 모달도 재시도 버튼도 없다 — 다시 누를 곳은 이미 있는 CTA 하나다.
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
    <ScreenBackground>
      <View style={styles.center}>
        <Image source={require("../../assets/baba/face-joy.png")} style={styles.baba} />

        <View style={styles.copy}>
          <AppText variant="heading" tone="strong" weight="600" style={styles.title}>
            고마워요.
          </AppText>
          <AppText style={styles.body}>
            당신에게 편안한 방식으로{"\n"}하루를 함께 기억해볼게요.
          </AppText>
        </View>

        <Card style={styles.summary}>
          {showCalendar ? (
            <View style={styles.doneRow}>
              <CheckCircleIcon />
              <View style={styles.doneCopy}>
                <AppText variant="bodySm" tone="accent" weight="600">
                  캘린더 연결 완료
                </AppText>
                <AppText variant="caption" tone="legal">
                  오늘 일정을 함께 기억할게요.
                </AppText>
              </View>
            </View>
          ) : null}

          {showCalendar && showTime ? <View style={styles.divider} /> : null}

          {showTime ? (
            <View style={styles.kv}>
              <MoonIcon />
              <AppText variant="caption" tone="legal" style={styles.kvLabel}>
                돌아보는 시간
              </AppText>
              <AppText tone="strong" weight="600" style={styles.kvValue}>
                {formatKoreanTime(retroTime)}
              </AppText>
            </View>
          ) : null}

          {nothingSet ? (
            // 10-b — 없는 줄을 지운 자리에 흐린 한 줄로 길만 알려준다
            <AppText variant="caption" tone="legal" style={styles.skipNote}>
              캘린더 연결과 돌아보는 시간은 마이에서 언제든 설정할 수 있어요.
            </AppText>
          ) : (
            // 안내는 항상 카드 맨 아래 한 줄 (10.md 각주 · 10-b.md)
            <AppText variant="footnote" tone="legal">
              마이에서 언제든 바꿀 수 있어요.
            </AppText>
          )}
        </Card>
      </View>

      {/* 건너뛴 사람에게 다른 문을 만들지 않는다 — CTA 는 두 화면이 같다 (10-b.md) */}
      <AppButton label="모멘토리 시작하기" disabled={submitting} onPress={() => void start()} />

      {/* 실패는 버튼 아래 한 줄 — 모달도 재시도 버튼도 없다 (RULES.md 4) */}
      {error != null ? (
        <AppText variant="caption" tone="accent" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </ScreenBackground>
  );
}

const { semantic } = theme.colors;

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", gap: 20 },
  baba: { width: 104, height: 104, borderRadius: 52, alignSelf: "center" },
  copy: { gap: 10 },
  title: { fontSize: 21, lineHeight: 31.5, textAlign: "center" },
  body: { fontSize: 15, lineHeight: 24.75, textAlign: "center", color: semantic.textPrimary },
  summary: { gap: 14 },
  doneRow: { flexDirection: "row", gap: 9 },
  doneCopy: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: `${semantic.textPrimary}1A` }, // ink 10%
  kv: { flexDirection: "row", alignItems: "center", gap: 10 },
  kvLabel: { flex: 1 },
  kvValue: { fontSize: 13.5, lineHeight: 19 },
  skipNote: { lineHeight: 20 },
  error: { textAlign: "center", lineHeight: 20 },
});
