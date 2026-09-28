import type { Track } from "./client";
import type { ScreenName, OnboardingStepName } from "./events";

const routes: Record<string, ScreenName> = {
  "(auth)/login": "login",
  "(tabs)/home": "home",
  "(tabs)/archive": "archive",
  "(tabs)/rest": "rest",
  "(tabs)/report": "report",
  "(tabs)/my": "my",
  "home/schedule/new": "schedule_new",
  "home/schedule/[id]": "schedule_detail",
  "retro/talk": "retro_talk",
  "retro/draft": "retro_draft",
  "retro/confirm": "retro_confirm",
  "retro/done": "retro_done",
  "diary/[id]": "diary_detail",
  "rest/cards": "wish_cards",
  "rest/sense-pond": "sense_pond",
  "my/profile": "profile",
  "my/nickname": "profile_nickname",
  "my/age": "profile_age",
  "my/gender": "profile_gender",
  "my/interests": "profile_interests",
  "my/rest": "profile_rest",
};
const steps: Record<string, OnboardingStepName> = {
  welcome: "welcome",
  nickname: "nickname",
  age: "age",
  gender: "gender",
  interests: "interests",
  rest: "rest",
  "retro-time": "retroTime",
  calendar: "calendar",
  done: "done",
};

export function describeRoute(
  route: string,
): { screen: ScreenName; step?: OnboardingStepName } | null {
  const normalized = route.replace(/\/index$/, "");
  const parts = normalized.split("/");
  if (parts[0] === "(onboarding)" && parts.length === 2) {
    const step = steps[parts[1]!];
    return step ? { screen: "onboarding", step } : null;
  }
  const screen = routes[normalized];
  return screen ? { screen } : null;
}

export function createScreenObserver(track: Track) {
  let previous: string | null = null;
  return (route: string) => {
    if (route === previous) return;
    previous = route;
    const description = describeRoute(route);
    if (description == null) return;
    track("screen_viewed", { screen: description.screen });
    if (description.step) track("onboarding_step_viewed", { step: description.step });
  };
}

export function createForegroundObserver(onForeground: () => void) {
  let wasBackgrounded = false;
  return (state: string) => {
    if (state === "background") wasBackgrounded = true;
    if (state === "active" && wasBackgrounded) {
      wasBackgrounded = false;
      onForeground();
    }
  };
}
