import { router } from "expo-router";

import { useAuth } from "@/features/auth/model/auth";
import {
  introCard,
  introHref,
  introProgress,
  nextIntro,
  skipIntro,
  type IntroId,
} from "@/features/onboarding/model/flow";

import { IntroArt } from "./IntroArt";
import { OnboardingFrame, Segments } from "./OnboardingParts";
import { startQuestions } from "./startQuestions";

/**
 * 로그인 전 한 장 — 시작 · 문제 다섯 · 소개(`app/intro/*`). 인증 없이 열린다.
 * 마지막 장 다음은 로그인이고, 이미 로그인한 사람(다시 온보딩)은 로그인을 건너뛰고 질문으로 간다.
 */
export function IntroScreen({ id }: { id: IntroId }) {
  const card = introCard(id);
  const progress = introProgress(id);
  const authenticated = useAuth((s) => s.status === "authenticated");

  const go = (next: IntroId | null) => {
    if (next != null) router.push(introHref(next));
    else if (authenticated) startQuestions("push");
    else router.push("/login");
  };

  return (
    <OnboardingFrame
      progress={progress != null ? <Segments {...progress} /> : undefined}
      onSkip={progress != null ? () => go(skipIntro(id)) : undefined}
      art={<IntroArt id={id} />}
      title={card.title}
      body={card.body}
      emphasis={card.emphasis}
      cite={card.cite}
      primary={{ label: card.button, onPress: () => go(nextIntro(id)) }}
      turn={id === "help"}
    />
  );
}
