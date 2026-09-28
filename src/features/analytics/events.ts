/** 임의 문자열/응답 객체를 받지 않는다. 타입 검사와 런타임 검사를 함께 적용한다. */
type Field<T> = (value: unknown) => T | undefined;
const choice =
  <T extends string>(...values: T[]): Field<T> =>
  (value) =>
    typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
const id: Field<string> = (v) => (typeof v === "string" && /^[1-9]\d*$/.test(v) ? v : undefined);
const count: Field<number> = (v) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : undefined;
const integer: Field<number> = (v) =>
  typeof v === "number" && Number.isSafeInteger(v) ? v : undefined;
const bool: Field<boolean> = (v) => (typeof v === "boolean" ? v : undefined);
const week: Field<string> = (v) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
/** 밀리초 길이 — 음수·무한은 버리고 정수로 반올림한다 */
const millis: Field<number> = (v) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : undefined;
const step = choice(
  "welcome",
  "nickname",
  "age",
  "gender",
  "interests",
  "rest",
  "retroTime",
  "calendar",
  "done",
);
const provider = choice("kakao", "apple", "google");
const pondStep = choice("see", "hear", "feel");
const leaveKind = choice("navigate", "background");
const notificationSource = choice("onboarding", "my");
/**
 * 사용자가 답하던 회고 단계. 그 밖의 단계는 other 로 모은다.
 * ⚠ 위기 안내(safety_hold)는 **일부러 이름으로 보내지 않는다** — 정신 건강 상태를 추정할 수 있는
 * 민감 정보라 외부 분석 도구로 내보내지 않는다(2026-09-28). 그 단계도 other 에 섞인다.
 */
const retroPhase = choice("diary_chat", "await_branch", "emotion_exploration", "other");
const reminderKey = choice("retro", "daily", "weekly");
const inputKind = choice("text", "selection");
const scheduleSource = choice("manual", "calendar");
const onboardingFailure = choice(
  "invalid",
  "unauthorized",
  "no_session",
  "network",
  "server",
  "malformed",
  "unconfigured",
  "still_required",
);
const screen = choice(
  "login",
  "home",
  "archive",
  "rest",
  "report",
  "my",
  "onboarding",
  "schedule_new",
  "schedule_detail",
  "retro_talk",
  "retro_draft",
  "retro_confirm",
  "retro_done",
  "diary_detail",
  "wish_cards",
  "sense_pond",
  "profile",
  "profile_nickname",
  "profile_age",
  "profile_gender",
  "profile_interests",
  "profile_rest",
);
const linkSource = choice("onboarding", "my");
const linkChoice = choice("link", "later", "settings");
export type ScreenName = NonNullable<ReturnType<typeof screen>>;
export type OnboardingStepName = NonNullable<ReturnType<typeof step>>;

export const events = {
  app_opened: {},
  app_foregrounded: {},
  screen_viewed: { screen },
  screen_left: { screen, duration_ms: millis, exit: leaveKind },
  login_started: { provider },
  login_succeeded: { provider, onboarding_required: bool },
  login_not_completed: { provider, outcome: choice("cancelled", "failed") },
  onboarding_step_viewed: { step },
  onboarding_step_completed: { step },
  onboarding_step_left: { step, duration_ms: millis, exit: leaveKind },
  notify_permission_result: { source: notificationSource, granted: bool },
  onboarding_completed: {},
  onboarding_options_selected: { step: choice("interests", "rest"), count },
  onboarding_submit_failed: { code: onboardingFailure },
  calendar_permission_result: { granted: bool },
  calendar_link_chosen: { source: linkSource, choice: linkChoice },
  calendar_sync_succeeded: { created: count, updated: count, deleted: count },
  calendar_sync_failed: { outcome: choice("unreadable", "failed") },
  schedule_created: { schedule_id: id, source: choice("manual", "calendar") },
  schedule_updated: { schedule_id: id },
  schedule_deleted: { schedule_id: id },
  schedule_visibility_changed: { schedule_id: id, hidden: bool },
  schedule_completion_changed: { schedule_id: id, completed: bool, source: scheduleSource },
  retrospect_started: { retrospect_id: id },
  retrospect_turn_succeeded: { retrospect_id: id, input_kind: inputKind },
  retrospect_turn_timed: {
    retrospect_id: id,
    phase: retroPhase,
    turn_no: count,
    input_kind: inputKind,
    think_ms: millis,
    compose_ms: millis,
    wait_ms: millis,
    input_chars: count,
  },
  retrospect_exited: { retrospect_id: id, phase: retroPhase, turn_no: count },
  retro_cta_clicked: { source: choice("home") },
  reminder_opened: { reminder: reminderKey },
  retrospect_branch_selected: { branch: choice("diary", "explore") },
  retrospect_completed: { retrospect_id: id },
  retrospect_request_failed: {
    operation: choice("start", "turn"),
    code: choice(
      "invalid_request",
      "already_today",
      "session_not_found",
      "unauthenticated",
      "network",
      "server",
      "malformed",
      "unconfigured",
    ),
  },
  wish_card_created: { wish_card_id: id, retrospect_id: id },
  archive_view_changed: { view: choice("calendar", "list") },
  archive_date_selected: { days_from_today: integer, has_diary: bool },
  archive_month_changed: { direction: choice("previous", "next") },
  archive_period_changed: { period: choice("all", "month") },
  diary_open_clicked: { diary_id: id, source: choice("calendar", "list") },
  diary_viewed: { diary_id: id },
  diary_deleted: { diary_id: id },
  diary_updated: { retrospect_id: id },
  diary_edit_started: { retrospect_id: id },
  diary_edit_finished: { retrospect_id: id, duration_ms: millis, chars_delta: integer },
  wish_card_open_clicked: { source: choice("rest") },
  wish_card_viewed: { wish_card_id: id, source: choice("cards") },
  wish_card_completion_changed: { wish_card_id: id, completed: bool },
  wish_card_deleted: { wish_card_id: id },
  sense_pond_step_completed: {
    step: pondStep,
    duration_ms: millis,
    longest_gap_ms: millis,
    hold_cancels: count,
  },
  sense_pond_finished: { duration_ms: millis },
  sense_pond_exited: { step: pondStep, found: count, hold_cancels: count, duration_ms: millis },
  report_week_selected: { week_start: week },
  weekly_report_viewed: { week_start: week },
  logout_clicked: {},
  logout_completed: {},
  withdrawal_opened: {},
  withdrawal_cancelled: {},
  withdrawal_submitted: {},
  withdrawal_completed: {},
  withdrawal_failed: {},
} as const;

export type EventName = keyof typeof events;
export type EventProperties<K extends EventName> = {
  [P in keyof (typeof events)[K]]: (typeof events)[K][P] extends Field<infer T> ? T : never;
};

export function sanitizeEvent(
  name: EventName,
  properties: unknown,
): Record<string, string | number | boolean> | null {
  if (!Object.hasOwn(events, name) || properties == null || typeof properties !== "object")
    return null;
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, validate] of Object.entries(events[name])) {
    const value = validate((properties as Record<string, unknown>)[key]);
    if (value === undefined) return null;
    clean[key] = value;
  }
  return clean;
}
