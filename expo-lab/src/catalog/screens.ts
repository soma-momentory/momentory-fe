import type { CaptureId } from "./captures";

export type CatalogScreen = {
  id: CaptureId;
  title: string;
  route: string;
  fixture?: boolean;
};
export type ScreenGroup = { id: string; title: string; screens: readonly CatalogScreen[] };

const screen = (id: CaptureId, title: string, route: string, fixture = false): CatalogScreen => ({
  id,
  title,
  route,
  fixture,
});

/** One-time migration of the Vite Lab's capture inventory; future variants attach by screen id. */
export const screenGroups: readonly ScreenGroup[] = [
  {
    id: "entry",
    title: "진입 · 로그인",
    screens: [screen("splash", "스플래시", "/"), screen("login", "로그인", "/login")],
  },
  {
    id: "onboarding",
    title: "온보딩",
    screens: [
      screen("welcome", "첫 메시지", "/welcome"),
      screen("nickname", "닉네임", "/nickname"),
      screen("age", "나이", "/age"),
      screen("gender", "성별", "/gender"),
      screen("interests", "관심 분야", "/interests"),
      screen("onboarding-rest", "쉬는 방법", "/(onboarding)/rest"),
      screen("retro-time", "회고 시간", "/retro-time"),
      screen("calendar", "캘린더 연결", "/calendar"),
      screen("done", "온보딩 완료", "/done"),
    ],
  },
  {
    id: "home",
    title: "홈 · 일정",
    screens: [
      screen("home-main", "홈", "/home"),
      screen("schedule-new", "일정 추가", "/home/schedule/new"),
      screen("schedule-edit", "일정 수정", "/home/schedule/[id]", true),
    ],
  },
  {
    id: "retro",
    title: "회고 · 일기",
    screens: [
      screen("retro-confirm", "일정 확인", "/retro/confirm"),
      screen("retro-talk", "회고 대화", "/retro/talk", true),
      screen("retro-draft", "일기 확인·편집", "/retro/draft", true),
      screen("retro-done", "저장 완료", "/retro/done"),
      screen("diary-detail", "일기 상세", "/diary/[id]", true),
    ],
  },
  {
    id: "rest",
    title: "쉼터",
    screens: [
      screen("rest-hub", "쉼터 홈", "/(tabs)/rest"),
      screen("wish-cards", "바람카드", "/rest/cards"),
      screen("sense-pond", "감각연못", "/rest/sense-pond"),
      screen("worry-box", "걱정상자", "/rest/worry-box"),
      screen("treasure-box", "오늘의 보물함", "/rest/treasure-box"),
      screen("body-release", "몸에 힘 빼기", "/rest/body-release"),
      screen("treasures", "지난 보물", "/rest/treasures"),
      screen("worries", "걱정 기록", "/rest/worries"),
      screen("rest-records", "쉼 이용 기록", "/rest/records"),
    ],
  },
  {
    id: "records",
    title: "보관함 · 리포트",
    screens: [
      screen("archive", "보관함", "/archive"),
      screen("report", "주간 리포트", "/report", true),
    ],
  },
  {
    id: "my",
    title: "마이 · 기본 정보",
    screens: [
      screen("my-main", "마이", "/my"),
      screen("profile", "기본 정보", "/my/profile"),
      screen("my-nickname", "닉네임 수정", "/my/nickname"),
      screen("my-age", "나이 수정", "/my/age"),
      screen("my-gender", "성별 수정", "/my/gender"),
      screen("my-interests", "관심 분야 수정", "/my/interests"),
      screen("my-rest", "쉬는 방법 수정", "/my/rest"),
      screen("inquiry", "문의하기", "/my/inquiry"),
    ],
  },
];

export const screens = screenGroups.flatMap((group) => group.screens);
export const screenCount = screens.length;
export const findScreen = (id: string) => screens.find((item) => item.id === id);
