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
  "rest/body-release": "body_release",
  "rest/worry-box": "worry_box",
  "rest/treasure-box": "treasure_box",
  "rest/treasures": "treasure_list",
  "rest/records": "rest_records",
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

/**
 * 화면 진입과 **머문 시간**을 기록한다(2026-09-28).
 *
 * 체류는 앱이 **전면에 있던 구간마다** 한 번씩 보낸다. 백그라운드로 가면 그때까지를
 * `exit: "background"` 로 보내고 멈췄다가, 돌아오면 같은 화면을 처음부터 다시 잰다.
 * 한 번 모아 두었다가 떠날 때 보내면 앱이 백그라운드에서 종료될 때 통째로 잃는다 —
 * 그래서 한 방문이 여러 구간으로 갈릴 수 있고, 분석에서 합친다.
 *
 * 온보딩 아홉 단계는 화면명이 모두 `onboarding` 이라 `screen_left` 로는 단계를 가를 수
 * 없다. 온보딩에서는 대신 `onboarding_step_left` 를 보낸다.
 *
 * `inactive` 는 멈추지 않는다 — 알림 센터를 잠깐 내리는 것까지 끊으면 구간이 잘게 쪼개진다.
 */
export function createScreenObserver(
  track: Track,
  now: () => number = Date.now,
  /** 화면이 옮겨 갔다 — 쉼터 방문이 어디서 왔는지(`restVisit`) 같은 것이 듣는다 */
  onMove?: (from: ScreenName | null, to: ScreenName | null) => void,
) {
  let previous: string | null = null;
  let current: { screen: ScreenName; step?: OnboardingStepName } | null = null;
  let enteredAt = 0;
  let paused = false;

  const leave = (exit: "navigate" | "background") => {
    if (current == null || paused) return;
    const duration_ms = now() - enteredAt;
    if (current.step) track("onboarding_step_left", { step: current.step, duration_ms, exit });
    else track("screen_left", { screen: current.screen, duration_ms, exit });
  };

  return {
    /** 라우트가 바뀌었다. 모르는 라우트로 가도 떠난 화면의 시간은 닫는다 */
    route(route: string) {
      if (route === previous) return;
      previous = route;
      leave("navigate");
      const from = current?.screen ?? null;
      current = describeRoute(route);
      onMove?.(from, current?.screen ?? null);
      enteredAt = now();
      paused = false;
      if (current == null) return;
      track("screen_viewed", { screen: current.screen });
      if (current.step) track("onboarding_step_viewed", { step: current.step });
    },
    /** 앱 상태가 바뀌었다. 백그라운드에서 구간을 닫고, 돌아오면 다시 잰다 */
    appState(state: string) {
      if (state === "background" && !paused) {
        leave("background");
        paused = true;
      } else if (state === "active" && paused) {
        paused = false;
        enteredAt = now();
      }
    },
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
