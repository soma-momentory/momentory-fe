export type AppScreen = {
  id: string;
  title: string;
  route: string;
  kind: string;
  capture?: string;
  fixture?: boolean;
};

export const SCREEN_GROUPS: { id: string; title: string; screens: AppScreen[] }[] = [
  {
    id: "entry",
    title: "진입 · 로그인",
    screens: [
      {
        id: "splash",
        title: "스플래시",
        route: "/",
        kind: "splash",
        capture: "app-captures/splash.png",
      },
      {
        id: "login",
        title: "로그인",
        route: "/login",
        kind: "login",
        capture: "app-captures/login.png",
      },
    ],
  },
  {
    id: "onboarding",
    title: "온보딩",
    screens: [
      {
        id: "welcome",
        title: "첫 메시지",
        route: "/welcome",
        kind: "onboarding",
        capture: "app-captures/welcome.png",
      },
      {
        id: "nickname",
        title: "닉네임",
        route: "/nickname",
        kind: "onboarding",
        capture: "app-captures/nickname.png",
      },
      {
        id: "age",
        title: "나이",
        route: "/age",
        kind: "onboarding",
        capture: "app-captures/age.png",
      },
      {
        id: "gender",
        title: "성별",
        route: "/gender",
        kind: "onboarding",
        capture: "app-captures/gender.png",
      },
      {
        id: "interests",
        title: "관심 분야",
        route: "/interests",
        kind: "onboarding",
        capture: "app-captures/interests.png",
      },
      {
        id: "onboarding-rest",
        title: "쉬는 방법",
        route: "/(onboarding)/rest",
        kind: "onboarding",
        capture: "app-captures/onboarding-rest.png",
      },
      {
        id: "retro-time",
        title: "회고 시간",
        route: "/retro-time",
        kind: "onboarding",
        capture: "app-captures/retro-time.png",
      },
      {
        id: "calendar",
        title: "캘린더 연결",
        route: "/calendar",
        kind: "onboarding",
        capture: "app-captures/calendar.png",
      },
      {
        id: "done",
        title: "온보딩 완료",
        route: "/done",
        kind: "onboarding",
        capture: "app-captures/done.png",
      },
    ],
  },
  {
    id: "home",
    title: "홈 · 일정",
    screens: [
      {
        id: "home-main",
        title: "홈",
        route: "/home",
        kind: "home",
        capture: "app-captures/home-main.png",
      },
      {
        id: "schedule-new",
        title: "일정 추가",
        route: "/home/schedule/new",
        kind: "schedule-new",
        capture: "app-captures/schedule-new.png",
      },
      {
        id: "schedule-edit",
        title: "일정 수정",
        route: "/home/schedule/[id]",
        kind: "schedule-edit",
        capture: "app-captures/schedule-edit.png",
        fixture: true,
      },
    ],
  },
  {
    id: "retro",
    title: "회고 · 일기",
    screens: [
      {
        id: "retro-confirm",
        title: "일정 확인",
        route: "/retro/confirm",
        kind: "retro",
        capture: "app-captures/retro-confirm.png",
      },
      {
        id: "retro-talk",
        title: "회고 대화",
        route: "/retro/talk",
        kind: "retro",
        capture: "app-captures/retro-talk.png",
        fixture: true,
      },
      {
        id: "retro-draft",
        title: "일기 확인·편집",
        route: "/retro/draft",
        kind: "retro",
        capture: "app-captures/retro-draft.png",
        fixture: true,
      },
      {
        id: "retro-done",
        title: "저장 완료",
        route: "/retro/done",
        kind: "retro",
        capture: "app-captures/retro-done.png",
      },
      {
        id: "diary-detail",
        title: "일기 상세",
        route: "/diary/[id]",
        kind: "diary",
        capture: "app-captures/diary-detail.png",
        fixture: true,
      },
    ],
  },
  {
    id: "rest",
    title: "쉼터",
    screens: [
      {
        id: "rest-hub",
        title: "쉼터 홈",
        route: "/(tabs)/rest",
        kind: "rest",
        capture: "app-captures/rest-hub.png",
      },
      {
        id: "wish-cards",
        title: "바람카드",
        route: "/rest/cards",
        kind: "rest",
        capture: "app-captures/wish-cards.png",
      },
      {
        id: "sense-pond",
        title: "감각연못",
        route: "/rest/sense-pond",
        kind: "rest",
        capture: "app-captures/sense-pond.png",
      },
      {
        id: "worry-box",
        title: "걱정상자",
        route: "/rest/worry-box",
        kind: "rest",
        capture: "app-captures/worry-box.png",
      },
      {
        id: "treasure-box",
        title: "오늘의 보물함",
        route: "/rest/treasure-box",
        kind: "rest",
        capture: "app-captures/treasure-box.png",
      },
      {
        id: "body-release",
        title: "몸에 힘 빼기",
        route: "/rest/body-release",
        kind: "rest",
        capture: "app-captures/body-release.png",
      },
      {
        id: "treasures",
        title: "지난 보물",
        route: "/rest/treasures",
        kind: "rest",
        capture: "app-captures/treasures.png",
      },
      {
        id: "worries",
        title: "걱정 기록",
        route: "/rest/worries",
        kind: "rest",
        capture: "app-captures/worries.png",
      },
      {
        id: "rest-records",
        title: "쉼 이용 기록",
        route: "/rest/records",
        kind: "rest",
        capture: "app-captures/rest-records.png",
      },
    ],
  },
  {
    id: "records",
    title: "보관함 · 리포트",
    screens: [
      {
        id: "archive",
        title: "보관함",
        route: "/archive",
        kind: "archive",
        capture: "app-captures/archive.png",
      },
      {
        id: "report",
        title: "주간 리포트",
        route: "/report",
        kind: "report",
        capture: "app-captures/report.png",
        fixture: true,
      },
    ],
  },
  {
    id: "my",
    title: "마이 · 기본 정보",
    screens: [
      {
        id: "my-main",
        title: "마이",
        route: "/my",
        kind: "my",
        capture: "app-captures/my-main.png",
      },
      {
        id: "profile",
        title: "기본 정보",
        route: "/my/profile",
        kind: "my",
        capture: "app-captures/profile.png",
      },
      {
        id: "my-nickname",
        title: "닉네임 수정",
        route: "/my/nickname",
        kind: "my",
        capture: "app-captures/my-nickname.png",
      },
      {
        id: "my-age",
        title: "나이 수정",
        route: "/my/age",
        kind: "my",
        capture: "app-captures/my-age.png",
      },
      {
        id: "my-gender",
        title: "성별 수정",
        route: "/my/gender",
        kind: "my",
        capture: "app-captures/my-gender.png",
      },
      {
        id: "my-interests",
        title: "관심 분야 수정",
        route: "/my/interests",
        kind: "my",
        capture: "app-captures/my-interests.png",
      },
      {
        id: "my-rest",
        title: "쉬는 방법 수정",
        route: "/my/rest",
        kind: "my",
        capture: "app-captures/my-rest.png",
      },
      {
        id: "inquiry",
        title: "문의하기",
        route: "/my/inquiry",
        kind: "my",
        capture: "app-captures/inquiry.png",
      },
    ],
  },
];

export const SCREEN_COUNT = SCREEN_GROUPS.reduce((total, group) => total + group.screens.length, 0);

export function screenSourceLabel(screen: AppScreen): string {
  if (screen.fixture) return "실제 앱 캡처 · 예시 데이터";
  if (screen.capture?.startsWith("app-captures/")) return "실제 앱 캡처";
  if (screen.capture) return "기존 원본 캡처";
  return "코드 재현";
}
