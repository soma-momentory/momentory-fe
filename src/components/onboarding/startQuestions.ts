import { router } from "expo-router";

import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";
import { QUESTIONS } from "@/features/onboarding/model/flow";

/**
 * 로그인 뒤 질문을 연다 — 소개 마지막 장(이미 로그인한 사람)과 로그인 화면(막 로그인한 사람)
 * 두 곳이 부른다. 다시 온보딩하는 사람은 여기서 지금 값을 미리 채운다(`draft.prefill`).
 */
export function startQuestions(how: "push" | "replace") {
  useDraft.getState().prefill();
  router[how](QUESTIONS[0].href);
}

/** 막 로그인했다 — 최신 판 온보딩을 마친 사람은 홈, 아니면 질문으로 */
export function routeAfterSignIn() {
  const completed = useOnboardingCompletion.getState().completed;
  if (completed === true) router.replace("/home");
  // 서버에 못 물어봤다 — 스플래시가 답을 기다렸다가 보낸다(`app/index.tsx`)
  else if (completed == null) router.replace("/");
  else startQuestions("replace");
}
