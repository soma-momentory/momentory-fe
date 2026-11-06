/**
 * 가짜 서버의 DB 모양. **서버 응답 모양(DTO)과 거의 같다** — 응답을 만들 때 옮겨 적기만 한다.
 * localStorage 에 JSON 그대로 남으므로 `Date` 객체가 아니라 ISO 문자열 · 날짜 문자열만 든다.
 */

/** 회고·일기·리포트의 감정 키(소문자) — 앱 `EMOTION_BY_KEY` 와 같은 번호 순서 */
export const EMOTION_KEYS = [
  "happy",
  "proud",
  "calm",
  "tired",
  "stuck",
  "lethargic",
  "anxious",
  "depressed",
  "angry",
  "frustrated",
] as const;
export type EmotionKey = (typeof EMOTION_KEYS)[number];

export const EMOTION_NAMES: Record<EmotionKey, string> = {
  happy: "행복함",
  proud: "뿌듯함",
  calm: "평온함",
  tired: "피곤함",
  stuck: "막막함",
  lethargic: "무기력",
  anxious: "불안함",
  depressed: "우울함",
  angry: "화남",
  frustrated: "답답함",
};

/** 일정 완료 감정(대문자) — 화남·답답함이 아직 한 코드다(`scheduleApi.ts`) */
export const SCHEDULE_EMOTIONS = [
  "HAPPY",
  "PROUD",
  "CALM",
  "TIRED",
  "STUCK",
  "LETHARGIC",
  "ANXIOUS",
  "DEPRESSED",
  "ANGRY_FRUSTRATED",
] as const;
export type ScheduleEmotion = (typeof SCHEDULE_EMOTIONS)[number];

export const scheduleEmotionOf = (key: EmotionKey): ScheduleEmotion =>
  key === "angry" || key === "frustrated"
    ? "ANGRY_FRUSTRATED"
    : (key.toUpperCase() as ScheduleEmotion);

export type Profile = {
  nickname: string;
  age: number | null;
  gender: "MALE" | "FEMALE" | "UNSPECIFIED";
  interestAreas: string[];
  otherInterestDetail: string | null;
  restMethods: string[];
  otherRestMethodDetail: string | null;
  reflectionTime: string;
  calendarIntegrationEnabled: boolean;
  notificationEnabled: boolean;
  letterNotificationEnabled: boolean;
  letterTime: string | null;
};

export type UserRow = {
  userId: number;
  onboardingRequired: boolean;
  onboardingVersion: number | null;
  profile: Profile | null;
  /** v2 온보딩 설문 답(그대로 보관만 한다) */
  onboardingAnswers: Record<string, unknown> | null;
};

export type ScheduleRow = {
  id: number;
  date: string;
  title: string;
  source: "MANUAL" | "CALENDAR";
  hidden: boolean;
  completed: boolean;
  emotion: ScheduleEmotion | null;
  displayOrder: number;
  externalId: string | null;
};

export type DiaryRow = {
  id: number;
  /** 회고 세션 id — 있으면 바바와 쓴 일기, `null` 이면 직접 쓴 일기 */
  retrospectId: number | null;
  primaryEmotion: EmotionKey | null;
  emotions: EmotionKey[];
  original: string;
  createdAt: string;
  weather: string | null;
  /** 이 일기의 편지를 아직 만들지 않았다 — 다음 날이 되면 만든다 */
  letterPending: boolean;
};

export type Need = { word: string; meaning?: string };

export type ActionCardRow = {
  id: number;
  retrospectId: number;
  situation: string;
  emotions: EmotionKey[];
  needs: Need[];
  desiredState: string | null;
  targetAction: string | null;
  sentiment: "uncomfortable" | "positive";
  done: boolean;
  doneAt: string | null;
  reflection: string | null;
  createdAt: string;
};

export type LetterAction = {
  position: number;
  title: string;
  source: "CATALOG" | "FALLBACK";
  chosen: boolean;
  whenLabel: string | null;
  scheduleId: number | null;
  remindAt: string | null;
};

export type LetterRow = {
  id: number;
  date: string;
  status: "READY" | "FALLBACK" | "QUIET";
  quote: string | null;
  insight: string;
  tonightQuestion: string | null;
  actions: LetterAction[];
  helplines: string[];
  openedAt: string | null;
};

export type RestContent =
  | "SENSE_POND"
  | "WORRY_BOX"
  | "TREASURE_BOX"
  | "BODY_RELEASE"
  | "MEDITATION"
  | "WISH"
  | "WEEKLY_HAPPINESS";
export type RestMood = "BETTER" | "SAME" | "UNSURE";

export type RestRecordRow = {
  id: number;
  content: RestContent;
  date: string;
  completed: boolean;
  mood: RestMood | null;
  createdAt: string;
};

export type WishRow = {
  id: number;
  mine: boolean;
  content: string;
  daysLeft: number;
  light: boolean;
  joined: boolean;
  joinedByOthers: boolean;
  endReason: "EXPIRED" | "REPORTED" | null;
  outcome: "CAME_TRUE" | "NOT_YET" | null;
  hidden: boolean;
};

export type NoteRow = { id: number; date: string; content: string; createdAt: string };

export type InquiryRow = {
  id: number;
  category: string;
  content: string;
  replyEmail: string | null;
  createdAt: string;
};

/** 회고 대화의 단계 — `retro.ts` 의 대본 순서 */
export type RetroStep = "chat1" | "chat2" | "branch" | "emotion" | "needs" | "complete" | "ended";

export type RetroSessionRow = {
  id: number;
  day: string;
  step: RetroStep;
  nickname: string | null;
  schedules: { name: string; id?: number; completed?: boolean }[];
  /** 사용자가 자유 입력으로 남긴 말 */
  texts: string[];
  /** 사건 고르기 후보 */
  events: string[];
  event: string | null;
  emotionCandidates: EmotionKey[];
  emotions: EmotionKey[];
  customEmotion: string | null;
  needCandidates: Need[];
  needs: Need[];
  diaryId: number | null;
  actionCardId: number | null;
};

export type FakeDb = {
  /** 모양이 바뀌면 올린다 — 옛 모양의 저장본은 버리고 새로 심는다 */
  schema: number;
  datasetId: string;
  /** 다음 id */
  seq: number;
  user: UserRow;
  schedules: ScheduleRow[];
  diaries: DiaryRow[];
  actionCards: ActionCardRow[];
  letters: LetterRow[];
  restRecords: RestRecordRow[];
  treasures: NoteRow[];
  worries: NoteRow[];
  /** 주간 행복 — 주(일요일) → 칸(서버 대문자 코드) → 글 */
  weeklyHappiness: Record<string, Record<string, string>>;
  wishes: WishRow[];
  wishRulesAgreed: boolean;
  wishPostedToday: boolean;
  inquiries: InquiryRow[];
  retroSessions: RetroSessionRow[];
};

export const DB_SCHEMA = 3;

export const nextId = (db: FakeDb): number => db.seq++;

export const emptyDb = (datasetId: string, user: UserRow): FakeDb => ({
  schema: DB_SCHEMA,
  datasetId,
  seq: 1,
  user,
  schedules: [],
  diaries: [],
  actionCards: [],
  letters: [],
  restRecords: [],
  treasures: [],
  worries: [],
  weeklyHappiness: {},
  wishes: [],
  wishRulesAgreed: false,
  wishPostedToday: false,
  inquiries: [],
  retroSessions: [],
});
