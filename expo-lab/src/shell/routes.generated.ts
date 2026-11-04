/**
 * 자동 생성 — `npm run lab:routes`(`expo-lab/scripts/gen-routes.mjs`)가 `app/` 에서 만든다.
 * 직접 고치지 않는다. 제목·순서·프리셋은 `routeMeta.ts` 에 손으로 적는다.
 */
export type GeneratedRoute = {
  /** expo-router 주소 — 그룹 `(…)` 은 빠지고 `index` 는 부모가 된다 */
  path: string;
  file: string;
  /** 라우트 그룹 이름(예: `(tabs)`) — 없으면 null */
  group: string | null;
  /** 동적 조각 이름(`[id]` → `id`) */
  params: readonly string[];
};

export const generatedRoutes: readonly GeneratedRoute[] = [
  { path: "/login", file: "app/(auth)/login.tsx", group: "(auth)", params: [] },
  { path: "/about", file: "app/(onboarding)/about.tsx", group: "(onboarding)", params: [] },
  { path: "/calendar", file: "app/(onboarding)/calendar.tsx", group: "(onboarding)", params: [] },
  { path: "/day-end", file: "app/(onboarding)/day-end.tsx", group: "(onboarding)", params: [] },
  {
    path: "/diary-history",
    file: "app/(onboarding)/diary-history.tsx",
    group: "(onboarding)",
    params: [],
  },
  { path: "/goal", file: "app/(onboarding)/goal.tsx", group: "(onboarding)", params: [] },
  { path: "/mood", file: "app/(onboarding)/mood.tsx", group: "(onboarding)", params: [] },
  { path: "/name", file: "app/(onboarding)/name.tsx", group: "(onboarding)", params: [] },
  { path: "/notify", file: "app/(onboarding)/notify.tsx", group: "(onboarding)", params: [] },
  { path: "/now", file: "app/(onboarding)/now.tsx", group: "(onboarding)", params: [] },
  { path: "/reading", file: "app/(onboarding)/reading.tsx", group: "(onboarding)", params: [] },
  { path: "/research", file: "app/(onboarding)/research.tsx", group: "(onboarding)", params: [] },
  { path: "/why", file: "app/(onboarding)/why.tsx", group: "(onboarding)", params: [] },
  { path: "/archive", file: "app/(tabs)/archive.tsx", group: "(tabs)", params: [] },
  { path: "/home", file: "app/(tabs)/home.tsx", group: "(tabs)", params: [] },
  { path: "/my", file: "app/(tabs)/my.tsx", group: "(tabs)", params: [] },
  { path: "/report", file: "app/(tabs)/report.tsx", group: "(tabs)", params: [] },
  { path: "/rest", file: "app/(tabs)/rest.tsx", group: "(tabs)", params: [] },
  { path: "/diary/[id]", file: "app/diary/[id]/index.tsx", group: null, params: ["id"] },
  { path: "/home/schedule/[id]", file: "app/home/schedule/[id].tsx", group: null, params: ["id"] },
  { path: "/home/schedule/new", file: "app/home/schedule/new.tsx", group: null, params: [] },
  { path: "/", file: "app/index.tsx", group: null, params: [] },
  { path: "/intro/blank", file: "app/intro/blank.tsx", group: null, params: [] },
  { path: "/intro/blur", file: "app/intro/blur.tsx", group: null, params: [] },
  { path: "/intro/diary", file: "app/intro/diary.tsx", group: null, params: [] },
  { path: "/intro/feelings", file: "app/intro/feelings.tsx", group: null, params: [] },
  { path: "/intro/help", file: "app/intro/help.tsx", group: null, params: [] },
  { path: "/intro/letter", file: "app/intro/letter.tsx", group: null, params: [] },
  { path: "/intro/report", file: "app/intro/report.tsx", group: null, params: [] },
  { path: "/intro/rest", file: "app/intro/rest.tsx", group: null, params: [] },
  { path: "/intro/ruminate", file: "app/intro/ruminate.tsx", group: null, params: [] },
  { path: "/intro/schedule", file: "app/intro/schedule.tsx", group: null, params: [] },
  { path: "/intro/start", file: "app/intro/start.tsx", group: null, params: [] },
  { path: "/intro/talk", file: "app/intro/talk.tsx", group: null, params: [] },
  { path: "/letter/[date]", file: "app/letter/[date].tsx", group: null, params: ["date"] },
  { path: "/letter", file: "app/letter/index.tsx", group: null, params: [] },
  { path: "/letter/time", file: "app/letter/time.tsx", group: null, params: [] },
  { path: "/my/age", file: "app/my/age.tsx", group: null, params: [] },
  { path: "/my/gender", file: "app/my/gender.tsx", group: null, params: [] },
  { path: "/my/inquiry", file: "app/my/inquiry.tsx", group: null, params: [] },
  { path: "/my/interests", file: "app/my/interests.tsx", group: null, params: [] },
  { path: "/my/nickname", file: "app/my/nickname.tsx", group: null, params: [] },
  { path: "/my/profile", file: "app/my/profile.tsx", group: null, params: [] },
  { path: "/my/rest", file: "app/my/rest.tsx", group: null, params: [] },
  { path: "/rest/body-release", file: "app/rest/body-release.tsx", group: null, params: [] },
  { path: "/rest/cards", file: "app/rest/cards/index.tsx", group: null, params: [] },
  { path: "/rest/records", file: "app/rest/records.tsx", group: null, params: [] },
  { path: "/rest/sense-pond", file: "app/rest/sense-pond.tsx", group: null, params: [] },
  { path: "/rest/treasure-box", file: "app/rest/treasure-box.tsx", group: null, params: [] },
  { path: "/rest/treasures", file: "app/rest/treasures.tsx", group: null, params: [] },
  { path: "/rest/wish-mine", file: "app/rest/wish-mine.tsx", group: null, params: [] },
  { path: "/rest/wish", file: "app/rest/wish.tsx", group: null, params: [] },
  { path: "/rest/worries", file: "app/rest/worries.tsx", group: null, params: [] },
  { path: "/rest/worry-box", file: "app/rest/worry-box.tsx", group: null, params: [] },
  { path: "/retro/confirm", file: "app/retro/confirm.tsx", group: null, params: [] },
  { path: "/retro/done", file: "app/retro/done.tsx", group: null, params: [] },
  { path: "/retro/draft", file: "app/retro/draft.tsx", group: null, params: [] },
  { path: "/retro/talk", file: "app/retro/talk.tsx", group: null, params: [] },
  { path: "/retro/write", file: "app/retro/write.tsx", group: null, params: [] },
];
