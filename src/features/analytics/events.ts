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
/** 온보딩 v2 단계(2026-10-25) — 로그인 전 소개 장 + 로그인 뒤 화면. 옛 대화형 단계는 보내지 않는다 */
const step = choice(
  "start",
  "feelings",
  "blur",
  "ruminate",
  "blank",
  "help",
  "talk",
  "diary",
  "rest",
  "report",
  "mood",
  "why",
  "day_end",
  "diary_history",
  "goal",
  "reading",
  "name",
  "about",
  "calendar",
  "notify",
  "research",
  "now",
);
const question = choice("moodChange", "knowWhy", "dayEnd", "diaryHistory");
/** 질문 답 코드 — 서버 enum 과 같다. 건너뛰면 SKIPPED */
const answer = choice(
  "RARELY",
  "FEW_TIMES",
  "VERY_OFTEN",
  "MOSTLY",
  "SOMETIMES",
  "NOT_SURE",
  "TIRED_SLEEP",
  "OVERTHINK",
  "OKAY",
  "REGULARLY",
  "STOPPED",
  "SKIPPED",
);
const GOAL_CODES = [
  "KNOW_WHEN_TIRED",
  "FIND_TIRED_REASON",
  "WRAPUP_HABIT",
  "DIARY_HABIT",
  "REST_ON_HARD_DAYS",
];
/** 고른 목표 — 코드를 쉼표로 이은 것(빈 문자열은 고르지 않음). 목록 밖 코드가 섞이면 버린다 */
const goals: Field<string> = (v) =>
  typeof v === "string" && (v === "" || v.split(",").every((g) => GOAL_CODES.includes(g)))
    ? v
    : undefined;
const provider = choice("kakao", "apple", "google");
const pondStep = choice("see", "hear", "feel");
/** 쉼 콘텐츠 — 화면이 있는 것만(2026-10-05) */
const restContent = choice(
  "sense_pond",
  "body_release",
  "worry_box",
  "treasure_box",
  "meditation",
  "weekly_happiness",
  "wish",
);
/**
 * 쉼 콘텐츠를 **어디까지** 했는가 — 끝내지 않고 나간 자리. 콘텐츠마다 단계가 달라 한 목록에 모은다.
 * 감각연못 see/hear/feel · 몸에 힘 빼기 intro(시작 전)/hands/shoulders/face/legs · 걱정상자
 * write/handing(건네는 연출 중)/boxed(둘 중 하나를 고르기 전) · 오늘의 보물함 write/tucking(담는 연출 중) ·
 * 3분 명상 ready(시작 전)/meditating(시작한 뒤 · 마치기 전) ·
 * 소원 연꽃 pond/wish_card/rules/write/confirm
 */
const restStage = choice(
  "see",
  "hear",
  "feel",
  "intro",
  "hands",
  "shoulders",
  "face",
  "legs",
  "write",
  "handing",
  "boxed",
  "tucking",
  "ready",
  "meditating",
  "pond",
  "wish_card",
  "rules",
  "confirm",
);
const meditationConcept = choice("wave", "forest", "sunlight", "rain", "lantern");
/** 쉼터에 어떻게 들어왔나 — 회고(일기)를 마친 화면에서 곧장 / 그 밖에서 따로 */
const restEntry = choice("after_diary", "direct");
/**
 * 일기를 쓴 날의 쉼 추천(2026-10-12) — 무엇으로 골랐나(오늘 감정 · 쉬는 방법 · 무작위)와
 * 어디서 권했나(시트 · 세 번 연달아 닫은 뒤 격자 칸의 「오늘 추천」).
 * ⚠ 추천 쉼터(`content`)는 **감정에서 나온 값**이다 — 알고 싣기로 했다(2026-10-12 · 사용자 결정).
 */
const restRecommendBasis = choice("emotion", "preference", "random");
const restRecommendForm = choice("sheet", "hint");
const leaveKind = choice("navigate", "background");
const notificationSource = choice("onboarding", "my");
/**
 * 사용자가 답하던 회고 단계. 그 밖의 단계는 other 로 모은다.
 * ⚠ 위기 안내(safety_hold)는 **일부러 이름으로 보내지 않는다** — 정신 건강 상태를 추정할 수 있는
 * 민감 정보라 외부 분석 도구로 내보내지 않는다(2026-09-28). 그 단계도 other 에 섞인다.
 */
const retroPhase = choice("diary_chat", "await_branch", "emotion_exploration", "other");
const reminderKey = choice("retro", "daily", "weekly", "letter", "letter_action", "report");
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
  "retro_write",
  "retro_confirm",
  "retro_done",
  "diary_detail",
  "wish_cards",
  "sense_pond",
  "body_release",
  "worry_box",
  "treasure_box",
  "meditation",
  "treasure_list",
  "wish_pond",
  "wish_mine",
  "worry_list",
  "rest_records",
  "profile",
  "profile_nickname",
  "profile_age",
  "profile_gender",
);
const linkSource = choice("onboarding", "my");
const linkChoice = choice("link", "later", "settings");
export type ScreenName = NonNullable<ReturnType<typeof screen>>;
export type OnboardingStepName = NonNullable<ReturnType<typeof step>>;
export type RestContentName = NonNullable<ReturnType<typeof restContent>>;
export type RestStageName = NonNullable<ReturnType<typeof restStage>>;
export type RestEntryName = NonNullable<ReturnType<typeof restEntry>>;

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
  onboarding_question_answered: { question, answer },
  /**
   * 새 온보딩을 마쳤다. 답 묶음별 재방문을 이 이벤트의 속성으로 가른다(정본은 서버 응답 기록).
   * `is_reonboarding` — 기존 사용자가 다시 한 것. 새 가입자와 퍼널을 섞지 않는다
   */
  onboarding_completed: {
    version: count,
    is_reonboarding: bool,
    mood_change: answer,
    know_why: answer,
    day_end: answer,
    diary_history: answer,
    goals,
    first_retro: choice("now", "later"),
  },
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
  retrospect_resumed: { retrospect_id: id },
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
    voice_used: bool,
  },
  retrospect_exited: { retrospect_id: id, phase: retroPhase, turn_no: count },
  retro_cta_clicked: { source: choice("home", "report") },
  voice_input_started: { retrospect_id: id },
  voice_permission_result: { granted: bool },
  voice_input_failed: { code: choice("no_speech", "network", "unavailable", "other") },
  reminder_opened: { reminder: reminderKey },
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
  rest_recommendation_shown: { content: restContent, basis: restRecommendBasis },
  rest_recommendation_accepted: {
    content: restContent,
    basis: restRecommendBasis,
    form: restRecommendForm,
  },
  rest_content_opened: { content: restContent, entry: restEntry, diary_today: bool },
  rest_content_completed: { content: restContent, duration_ms: millis },
  rest_content_exited: { content: restContent, stage: restStage, duration_ms: millis },
  /** 쉼터의 「?」 원을 눌러 설명 카드를 다시 열었다 — 처음 저절로 뜬 것은 보내지 않는다 */
  rest_guide_opened: { content: restContent },
  /** 어느 쉼터의 이용 기록을 열었나 — `screen_viewed` 에는 쉼터 이름이 없다. 기록 내용 · 기분은 싣지 않는다 */
  rest_records_viewed: { content: restContent },
  /** 소원 연꽃(2026-11-04) — 글은 보내지 않는다. 글자 수와 결과만 싣는다 */
  wish_rules_agreed: {},
  wish_joined: { position: count, author: choice("user", "baba") },
  wish_join_cancelled: {},
  wish_batch_finished: { joined: count },
  wish_submitted: { chars: count },
  wish_review_result: { result: choice("pass", "edited", "rejected", "crisis", "failed") },
  wish_posted: { chars: count },
  wish_deleted: {},
  wish_reported: {},
  wish_report_undone: {},
  wish_followup_answered: { outcome: choice("came_true", "not_yet") },
  worry_box_handed: { chars: count },
  worry_box_choice_selected: { choice: choice("keep", "release") },
  /** 보물을 담았다 — 쓴 글은 보내지 않고 길이만 */
  treasure_box_tucked: { chars: count },
  /** 3분 명상을 시작했다 — 어느 풍경인지 */
  meditation_started: { concept: meditationConcept },
  /** 3분을 마쳤거나(natural) 「여기서 멈추기」를 눌렀다(user_stop) — 시간은 실제로 머문 만큼 */
  meditation_ended: {
    concept: meditationConcept,
    reason: choice("natural", "user_stop"),
    duration_ms: millis,
    voice_enabled: bool,
  },
  /** 3분 명상의 음성을 불러오지 못했다 */
  meditation_audio_failed: { concept: meditationConcept },
  /** 별점 창을 요청했다 — 떴는지 · 남겼는지는 스토어가 알려 주지 않는다(`storeReview.ts`) */
  store_review_requested: {},
  /** 문의를 보냈다 — 내용은 보내지 않는다 */
  inquiry_submitted: { category: choice("bug", "suggestion", "account", "etc") },
  /** 바바의 편지(2026-10-27 · PRD 10-1). 편지 본문 · 작은 일 문장은 보내지 않는다 */
  letter_entry_shown: { has_unread: bool },
  letter_opened: {
    source: choice("notification", "home_icon", "diary_detail"),
    status: choice("ready", "fallback", "quiet"),
    wait_ms: millis,
    days_after: choice("0", "1", "2+"),
  },
  letter_action_chosen: {
    position: count,
    source: choice("catalog", "fallback"),
    when: choice("schedule", "lunch", "commute", "bedtime", "none"),
    changed: bool,
  },
  letter_time_chosen: { time: choice("7:30", "8:30", "10:00", "custom"), notify: bool },
  letter_notification_scheduled: { kind: choice("morning", "action", "unread_night") },
  report_week_selected: { week_start: week },
  weekly_report_viewed: { week_start: week },
  report_page_viewed: {
    week_start: week,
    page: choice(
      "cover",
      "review",
      "words",
      "feelEvents",
      "okMoments",
      "restMoods",
      "done",
      "closing",
    ),
  },
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
