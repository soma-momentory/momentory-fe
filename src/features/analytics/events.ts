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
  login_started: { provider },
  login_succeeded: { provider, onboarding_required: bool },
  login_not_completed: { provider, outcome: choice("cancelled", "failed") },
  onboarding_step_viewed: { step },
  onboarding_step_completed: { step },
  onboarding_completed: {},
  calendar_permission_result: { granted: bool },
  calendar_link_chosen: { source: linkSource, choice: linkChoice },
  calendar_sync_succeeded: { created: count, updated: count, deleted: count },
  schedule_created: { schedule_id: id, source: choice("manual", "calendar") },
  schedule_updated: { schedule_id: id },
  schedule_deleted: { schedule_id: id },
  schedule_visibility_changed: { schedule_id: id, hidden: bool },
  schedule_completion_changed: { schedule_id: id, completed: bool },
  retrospect_started: { retrospect_id: id },
  retrospect_turn_succeeded: { retrospect_id: id, input_kind: choice("text", "selection") },
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
  wish_card_open_clicked: { source: choice("rest") },
  wish_card_viewed: { wish_card_id: id, source: choice("cards") },
  wish_card_completion_changed: { wish_card_id: id, completed: bool },
  wish_card_deleted: { wish_card_id: id },
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
