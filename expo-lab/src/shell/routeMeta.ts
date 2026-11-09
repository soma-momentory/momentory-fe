/**
 * 라우트마다 **손으로 적는** 제목 · 묶음 · 순서 · 주의 — `routes.generated.ts`(자동)와 짝이다.
 *
 * 제목은 각 라우트 파일 머리 주석 · `docs/PRODUCT.md` 「화면 ID ↔ 라우트 매핑」 ·
 * `features/onboarding/model/flow.ts`(온보딩 순서)에서 왔다. 새 라우트가 `app/` 에 생기면
 * `routes.test.ts` 가 「제목 없음」으로 깨진다 — 여기에 한 줄을 더한다.
 *
 * 순서 = 앱에서 만나는 순서. 묶음 안의 배열 순서가 그대로 왼쪽 목록 순서다.
 */
import type { DatasetId } from "../lab-contract";

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
  /**
   * **라우트가 아니라 그 라우트 위에 뜨는 모습**(시트)이다 — 목록 줄만 따로이고 앱 파일은 `screenOf` 의 것이다.
   * `path` 는 목록의 열쇠이자 실제로 여는 주소(`/rest?afterDiary=1`)다. 프레임은 라우트 주소(`/rest`)만 알리므로
   * 셸은 그 주소에 머무는 동안 이 줄을 지금 화면으로 둔다
   */
  screenOf?: string;
  /** 고칠 자리가 라우트 파일이 아닐 때(`screenOf`) — 「AI에게 맡기기」와 `lab:verify` 가 쓴다 */
  file?: string;
  /** 바로 열 때 붙일 검색 조건(예: `?content=sense_pond`) */
  query?: Record<string, string>;
  /**
   * **두 단계로 연다** — 차갑게 열면 앱이 스스로 다른 곳으로 보내는 화면이다. 먼저 `path` 를 열고,
   * 프레임이 `afterRequest` 응답을 받은 뒤(그 화면이 쓸 데이터가 스토어에 들어온 뒤)
   * `lab:navigate` 로 목적지로 옮긴다(갈래 A 확인 · 2026-11-02)
   */
  openVia?: { path: string; afterRequest: string };
  /** 묶음 프리셋을 이 화면만 바꾼다 */
  presetOverride?: {
    signedIn?: boolean;
    dataset?: DatasetId;
    failPaths?: readonly string[];
    todayDiary?: boolean;
  };
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
        // 스플래시는 0.8초 뒤 곧바로 넘어간다 — 붙잡아 두려고 로그인한 채 /users/me 를 실패시킨다
        presetOverride: { signedIn: true, failPaths: ["/api/v1/users/me"] },
        hint: "스플래시에 머물도록 /api/v1/users/me 를 실패시켜 「인터넷 연결을 기다리고 있어요」를 띄운다 — 조작 패널에서 실패 주소를 끄면 3초 안에 흐름대로 넘어간다",
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
      { path: "/intro/talk", title: "소개 · 밤 5분 대화" },
      { path: "/intro/diary", title: "소개 · 일기 완성" },
      { path: "/intro/rest", title: "소개 · 쉼터" },
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
      {
        path: "/reading",
        title: "답 정리",
        hint: "답을 읽는 약 5초짜리 화면 — 막대가 다 차면 스스로 /name 으로 넘어간다. 다시 보려면 조건 패널의 「폰 화면 새로 불러오기」",
      },
      { path: "/name", title: "이름" },
      {
        path: "/about",
        title: "나이 · 성별",
        hint: "이름 단계(/name)에서 쓴 이름이 첫 문장에 들어간다 — 바로 열면 「님」만 남는다. /name 부터 흐름으로 오면 보인다",
      },
      { path: "/calendar", title: "캘린더 연결" },
      {
        path: "/notify",
        title: "알림",
        hint: "알림 미리보기에 이름 단계(/name)에서 쓴 이름이 들어간다 — 바로 열면 「님」만 남는다. /name 부터 흐름으로 오면 보인다",
      },
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
        openVia: { path: "/home", afterRequest: "/api/v1/schedules" },
        hint: "홈 위에 뜨는 투명 시트 — 홈을 먼저 열고 시트로 옮긴다",
      },
      {
        path: "/home/schedule/[id]",
        title: "일정 수정",
        specId: "12-c",
        openVia: { path: "/home", afterRequest: "/api/v1/schedules" },
        hint: "홈 위에 뜨는 투명 시트 — 홈을 먼저 열고 데이터 세트의 일정 id 로 옮긴다",
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
        // 오늘 일정은 홈이 받아 둔다 — 바로 열면 「적어둔 일정이 없네요」로 보인다
        openVia: { path: "/home", afterRequest: "/api/v1/schedules" },
        hint: "홈을 먼저 열어 오늘 일정을 받은 뒤 옮긴다 · 오늘 일기가 이미 있으면 /retro/talk 로 넘어간다 — 「하루 넘기기」로 새 날에서 연다",
      },
      {
        path: "/retro/talk",
        title: "회고 대화",
        specId: "C4",
        // 첫 인사가 닉네임 · 오늘 일정을 부른다 — 바로 열면 둘 다 빠진 인사가 된다
        openVia: { path: "/home", afterRequest: "/api/v1/schedules" },
        hint: "홈을 먼저 열어 닉네임 · 오늘 일정을 받은 뒤 옮긴다(첫 인사가 둘을 부른다)",
      },
      {
        path: "/retro/write",
        title: "직접 쓰기",
        openVia: { path: "/home", afterRequest: "/api/v1/schedules" },
        hint: "홈을 먼저 열어 오늘 일정을 받은 뒤 옮긴다 · 오늘 일기가 이미 있으면 /retro/talk 로 넘어간다 — 「하루 넘기기」로 새 날에서 연다",
      },
      {
        path: "/retro/draft",
        title: "완성된 일기",
        specId: "C6",
        hint: "흐름으로만 닿는다 — 바로 열면 /retro/talk 로 간다. 회고를 끝까지 진행하면 열린다(가짜 서버 대본: 자유 입력 → 사건 고르기 → 감정 → 바람 → 완료)",
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
      {
        path: "/letter",
        title: "편지함",
        // 편지마다 그날 일기 첫 줄이 붙는다 — 일기는 탭 묶음이 받아 두므로 홈을 거친다
        openVia: { path: "/home", afterRequest: "/api/v1/action-cards" },
        hint: "홈을 먼저 열어 일기를 받은 뒤 옮긴다(편지마다 그날 일기 첫 줄이 붙는다)",
      },
      { path: "/letter/[date]", title: "바바의 편지" },
      {
        path: "/letter/time",
        title: "편지 받을 시각",
        query: { next: "done" },
        // 지금 고른 편지 시각(서버 프로필)으로 시작한다 — 바로 열면 프로필이 오기 전이라 기본값이다
        openVia: { path: "/home", afterRequest: "/api/v1/schedules" },
        hint: "처음 일기를 저장한 직후 한 번 나오는 화면 — 홈을 먼저 열어 지금 편지 시각을 받은 뒤 옮긴다",
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
        openVia: { path: "/archive", afterRequest: "/api/v1/diaries" },
        hint: "보관함을 먼저 열어 일기를 받은 뒤 데이터 세트의 최근 일기로 옮긴다(바로 열면 보관함으로 돌아간다)",
      },
    ],
  },
  {
    id: "rest",
    title: "쉼터 콘텐츠",
    routes: [
      {
        path: "/rest?afterDiary=1",
        screenOf: "/rest",
        title: "쉼 추천 시트",
        file: "src/components/rest/RestRecommendSheet.tsx",
        // 앱이 일기 완료 뒤에 쓰는 표시 그대로다 — 오늘 일기만 있으면 기기 기억과 관계없이 매번 뜬다
        presetOverride: { todayDiary: true },
        hint: "오늘 쓴 일기를 심고 일기 완료 진입(afterDiary=1)으로 쉼터를 연다 — 0.6초 뒤 시트가 올라온다 · 닫은 뒤 다시 보려면 목록에서 한 번 더 누른다",
      },
      {
        path: "/rest/cards",
        title: "날짜별 바람카드",
        specId: "R2",
        // 바람카드는 탭 묶음이 받아 둔다 — 바로 열면 빈 목록이다
        openVia: { path: "/rest", afterRequest: "/api/v1/action-cards" },
        hint: "쉼터를 먼저 열어 바람카드를 받은 뒤 옮긴다",
      },
      { path: "/rest/wish", title: "소원 연꽃" },
      { path: "/rest/wish-mine", title: "내 소원" },
      { path: "/rest/sense-pond", title: "감각연못" },
      { path: "/rest/worry-box", title: "걱정상자" },
      { path: "/rest/worries", title: "맡겨둔 걱정" },
      { path: "/rest/treasure-box", title: "오늘의 보물함" },
      { path: "/rest/treasures", title: "지난 보물" },
      { path: "/rest/body-release", title: "몸에 힘 빼기" },
      { path: "/rest/meditation", title: "3분 명상" },
      { path: "/rest/weekly-happiness", title: "주간 행복" },
      { path: "/rest/records", title: "쉼터 이용 기록", query: { content: "sense_pond" } },
    ],
  },
  {
    id: "my",
    title: "마이 세부",
    routes: [
      { path: "/my/profile", title: "기본 정보", specId: "M2" },
      {
        path: "/my/nickname",
        title: "닉네임 수정",
        openVia: { path: "/my/profile", afterRequest: "/api/v1/onboarding/options" },
        hint: "기본 정보를 먼저 열어 프로필 · 선택지를 받은 뒤 옮긴다(바로 열면 지금 값이 비어 보인다)",
      },
      {
        path: "/my/age",
        title: "나이 수정",
        openVia: { path: "/my/profile", afterRequest: "/api/v1/onboarding/options" },
        hint: "기본 정보를 먼저 열어 프로필 · 선택지를 받은 뒤 옮긴다(바로 열면 지금 값이 비어 보인다)",
      },
      {
        path: "/my/gender",
        title: "성별 수정",
        openVia: { path: "/my/profile", afterRequest: "/api/v1/onboarding/options" },
        hint: "기본 정보를 먼저 열어 프로필 · 선택지를 받은 뒤 옮긴다(바로 열면 지금 값이 비어 보인다)",
      },
      { path: "/my/inquiry", title: "문의하기" },
    ],
  },
];
