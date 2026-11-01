/**
 * 라우트마다 **손으로 적는** 제목 · 묶음 · 순서 · 주의 — `routes.generated.ts`(자동)와 짝이다.
 *
 * 제목은 각 라우트 파일 머리 주석 · `docs/PRODUCT.md` 「화면 ID ↔ 라우트 매핑」 ·
 * `features/onboarding/model/flow.ts`(온보딩 순서)에서 왔다. 새 라우트가 `app/` 에 생기면
 * `routes.test.ts` 가 「제목 없음」으로 깨진다 — 여기에 한 줄을 더한다.
 *
 * 순서 = 앱에서 만나는 순서. 묶음 안의 배열 순서가 그대로 왼쪽 목록 순서다.
 */
export type RouteSectionId =
  | "entry"
  | "intro"
  | "onboarding"
  | "tabs"
  | "home-sheets"
  | "retro"
  | "letter"
  | "diary"
  | "rest"
  | "my";

export type RouteMeta = {
  path: string;
  title: string;
  /** 스펙 화면 ID(있으면) */
  specId?: string;
  /**
   * 바로 열었을 때의 주의 — 흐름으로만 닿는 화면 · 다른 화면으로 넘기는 가드 등.
   * 셸이 프레임 위에 한 줄로 보여 준다
   */
  hint?: string;
  /** 바로 열 때 붙일 검색 조건(예: `?content=sense_pond`) */
  query?: Record<string, string>;
};

export type RouteSection = { id: RouteSectionId; title: string; routes: readonly RouteMeta[] };

export const routeSections: readonly RouteSection[] = [
  {
    id: "entry",
    title: "진입",
    routes: [
      {
        path: "/",
        title: "스플래시",
        specId: "S0",
        hint: "0.8초 뒤 판정해 넘어간다 — 로그인 전이면 소개(/intro/start)",
      },
      {
        path: "/login",
        title: "로그인",
        specId: "S1",
        hint: "소셜 로그인은 가짜 서버가 받는다 — 워드마크 길게 누르기는 개발 통로",
      },
    ],
  },
  {
    id: "intro",
    title: "소개 (로그인 전)",
    routes: [
      { path: "/intro/start", title: "시작" },
      { path: "/intro/feelings", title: "문제 1 · 수많은 감정" },
      { path: "/intro/blur", title: "문제 2 · 흐려지는 이유" },
      { path: "/intro/ruminate", title: "문제 3 · 혼자 되새김" },
      { path: "/intro/blank", title: "문제 4 · 첫 줄이 막힘" },
      { path: "/intro/help", title: "문제 5 · 바바가 도와줄게요" },
      {
        path: "/intro/schedule",
        title: "소개 · 일정마다 마음",
        hint: "흐름에서는 감춘 장이다(LETTER_AND_SCHEDULE_EMOTION_READY = false) — 주소로만 열린다",
      },
      { path: "/intro/talk", title: "소개 · 밤 5분 대화" },
      { path: "/intro/diary", title: "소개 · 일기 완성" },
      { path: "/intro/rest", title: "소개 · 쉼터" },
      {
        path: "/intro/letter",
        title: "소개 · 다음 날 편지",
        hint: "흐름에서는 감춘 장이다(LETTER_AND_SCHEDULE_EMOTION_READY = false) — 주소로만 열린다",
      },
      { path: "/intro/report", title: "소개 · 리포트" },
    ],
  },
  {
    id: "onboarding",
    title: "온보딩 (로그인 뒤)",
    routes: [
      { path: "/mood", title: "질문 1 · 기분 변화" },
      { path: "/why", title: "질문 2 · 이유를 아나요" },
      { path: "/day-end", title: "질문 3 · 하루의 끝" },
      { path: "/diary-history", title: "질문 4 · 일기 경험" },
      { path: "/goal", title: "목표" },
      { path: "/reading", title: "답 정리", hint: "약 5초 뒤 이름(/name)으로 넘어간다" },
      { path: "/name", title: "이름" },
      { path: "/about", title: "나이 · 성별" },
      { path: "/calendar", title: "캘린더 연결" },
      { path: "/notify", title: "알림" },
      { path: "/research", title: "연구 그래프" },
      { path: "/now", title: "지금 첫 회고" },
    ],
  },
  {
    id: "tabs",
    title: "탭",
    routes: [
      { path: "/home", title: "홈", specId: "12 · 12-b" },
      { path: "/rest", title: "쉼터", specId: "R1" },
      { path: "/archive", title: "보관함", specId: "A1 · A2" },
      { path: "/report", title: "리포트", specId: "W1" },
      { path: "/my", title: "마이", specId: "M1 · 알림 시트" },
    ],
  },
  {
    id: "home-sheets",
    title: "홈 시트",
    routes: [
      {
        path: "/home/schedule/new",
        title: "일정 추가",
        specId: "12-e",
        hint: "홈 위에 뜨는 투명 시트 — 바로 열면 뒤가 비어 보인다. 홈에서 여는 편이 실제와 같다",
      },
      {
        path: "/home/schedule/[id]",
        title: "일정 수정",
        specId: "12-c",
        hint: "홈 위에 뜨는 투명 시트 · 일정 id 는 데이터 세트의 것을 쓴다",
      },
    ],
  },
  {
    id: "retro",
    title: "회고",
    routes: [
      {
        path: "/retro/confirm",
        title: "오늘 일정 확인",
        specId: "C2",
        hint: "오늘 일기가 이미 있으면 /retro/talk 로 넘어간다 — 「하루 넘기기」로 새 날에서 연다",
      },
      { path: "/retro/talk", title: "회고 대화", specId: "C4" },
      {
        path: "/retro/write",
        title: "직접 쓰기",
        hint: "오늘 일기가 이미 있으면 /retro/talk 로 넘어간다 — 「하루 넘기기」로 새 날에서 연다",
      },
      {
        path: "/retro/draft",
        title: "완성된 일기",
        specId: "C6",
        hint: "흐름으로만 닿는다 — 대화를 끝내야 열린다(없으면 /retro/talk 로 돌아간다)",
      },
      {
        path: "/retro/done",
        title: "저장 완료",
        specId: "C7",
        hint: "바람카드는 회고를 끝낸 흐름에서만 보인다 — 바로 열면 안내만 나온다",
      },
    ],
  },
  {
    id: "letter",
    title: "편지",
    routes: [
      { path: "/letter", title: "편지함" },
      { path: "/letter/[date]", title: "바바의 편지" },
      {
        path: "/letter/time",
        title: "편지 받을 시각",
        query: { next: "done" },
        hint: "처음 일기를 저장한 직후 한 번 나오는 화면",
      },
    ],
  },
  {
    id: "diary",
    title: "일기",
    routes: [
      {
        path: "/diary/[id]",
        title: "일기 상세",
        specId: "A3 · A3-c",
        hint: "데이터 세트에 그 id 의 일기가 없으면 보관함으로 넘어간다",
      },
    ],
  },
  {
    id: "rest",
    title: "쉼터 콘텐츠",
    routes: [
      { path: "/rest/cards", title: "날짜별 바람카드", specId: "R2" },
      { path: "/rest/sense-pond", title: "감각연못" },
      { path: "/rest/worry-box", title: "걱정상자" },
      { path: "/rest/worries", title: "맡겨둔 걱정" },
      { path: "/rest/treasure-box", title: "오늘의 보물함" },
      { path: "/rest/treasures", title: "지난 보물" },
      { path: "/rest/body-release", title: "몸에 힘 빼기" },
      { path: "/rest/records", title: "쉼터 이용 기록", query: { content: "sense_pond" } },
    ],
  },
  {
    id: "my",
    title: "마이 세부",
    routes: [
      { path: "/my/profile", title: "기본 정보", specId: "M2" },
      { path: "/my/nickname", title: "닉네임 수정" },
      { path: "/my/age", title: "나이 수정" },
      { path: "/my/gender", title: "성별 수정" },
      { path: "/my/interests", title: "관심 분야 수정" },
      { path: "/my/rest", title: "쉬는 방법 수정" },
      { path: "/my/inquiry", title: "문의하기" },
    ],
  },
];
