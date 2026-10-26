# Momentory 코드 탐색 목차

> 이 문서는 **찾아갈 곳**만 가리킨다. 실제 동작은 현재 코드, 제품·디자인 판단은 `docs/DESIGN.md`와 `docs/PRODUCT.md`, 저장소 규칙은 `AGENTS.md`와 `docs/CONTRIBUTING.md`에서 확인한다. `docs/spec/`은 동결 스냅샷이다. 경로가 바뀌면 해당 행만 갱신한다.
>
> 읽는 순서: 이 표의 **라우트 → 화면 뷰 → model/data → 직접 참조하는 컴포넌트**. 위치가 이미 명확한 작은 수정은 해당 파일부터 읽는다. 디렉터리 경로는 파일 목록이 아니라 추가 검색의 시작점이다.

## 1. 구조와 진입점

| 기능      | 역할                                         | 핵심 파일 경로                                                                                        | 관련 문서                                              |
| --------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 앱 시작   | Expo Router 진입, Provider, 인증·온보딩 분기 | `package.json`, `app/_layout.tsx`, `app/index.tsx`, `src/lib/providers.tsx`                           | `docs/ARCHITECTURE.md`, `docs/SETUP.md`                |
| 화면 경계 | 파일 기반 라우트와 5개 주 탭                 | `app/(tabs)/_layout.tsx`, `src/components/ds/TabScreen.tsx`, `src/components/ds/BottomNavigation.tsx` | `docs/PRODUCT.md`, `docs/redesign/SCREEN_INVENTORY.md` |
| 기능 코드 | 도메인별 `ui/`·`model/`·`data/` 진입         | `src/features/`                                                                                       | `docs/ARCHITECTURE.md`                                 |
| 공통 기반 | 화면 조각·디자인 시스템·OS/HTTP 어댑터       | `src/components/`, `src/design/`, `src/lib/`                                                          | `docs/ARCHITECTURE.md`, `docs/DESIGN.md`               |
| 화면 자산 | 앱 그림·서체 원본                            | `assets/`                                                                                             | `docs/DESIGN.md`                                       |

## 2. 기능별 코드 위치

| 기능         | 역할                                        | 핵심 파일 경로                                                                                                                                                                           | 관련 문서                                       |
| ------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 홈           | 운영 라우트·데이터/이동 연결, v2 화면 조립  | `app/(tabs)/home.tsx`, `src/features/home/ui/v2/HomeV2View.tsx`                                                                                                                          | `docs/redesign/HOME_V2_ROLLOUT_PLAN.md`         |
| 홈 세부      | 히어로·일정·감정 도크, 일정 편집 시트       | `src/features/home/ui/v2/HeroCard.tsx`, `src/features/home/ui/v2/ScheduleSection.tsx`, `src/features/home/ui/v2/WeekDock.tsx`, `app/home/schedule/new.tsx`, `app/home/schedule/[id].tsx` | `docs/DESIGN.md`                                |
| 홈 데이터    | 오늘 일정·날씨 상태와 API                   | `src/features/home/model/day.ts`, `src/features/home/model/useHomeWeather.ts`, `src/features/home/data/scheduleApi.ts`, `src/features/home/data/weatherApi.ts`                           | `docs/ARCHITECTURE.md`                          |
| 홈 알림함    | 읽지 않은 알림·팝오버                       | `src/features/notifications/model/inbox.ts`, `src/features/notifications/ui/InboxPopover.tsx`                                                                                            | `docs/ANALYTICS.md`                             |
| 쉼터         | 허브·추천 시트·콘텐츠 목록                  | `app/(tabs)/rest.tsx`, `src/features/rest/ui/RestHubView.tsx`, `src/components/rest/RestRecommendSheet.tsx`, `src/features/rest/model/contents.ts`                                       | `docs/PRODUCT.md`, `docs/DESIGN.md`             |
| 쉼 콘텐츠    | 감각연못·걱정상자·보물함·몸에 힘 빼기       | `app/rest/sense-pond.tsx`, `app/rest/worry-box.tsx`, `app/rest/treasure-box.tsx`, `app/rest/body-release.tsx`                                                                            | `docs/PRODUCT.md`                               |
| 쉼 기록·카드 | 바람카드, 콘텐츠 기록과 저장                | `app/rest/cards/index.tsx`, `app/rest/records.tsx`, `src/features/rest/model/useRestRecord.ts`, `src/features/rest/data/restRecordApi.ts`                                                | `docs/PRODUCT.md`                               |
| 기록 보관함  | 달력/목록, 월별 일정, 일기 상세             | `app/(tabs)/archive.tsx`, `src/features/archive/ui/ArchiveView.tsx`, `src/features/archive/model/monthSchedules.ts`, `app/diary/[id]/index.tsx`                                          | `docs/DESIGN.md`, `docs/spec/SNAPSHOT.md`       |
| 일기 데이터  | 일기 상태·저장·날씨·감정 모델               | `src/features/diary/model/diary.ts`, `src/features/diary/data/diaryApi.ts`, `src/features/diary/model/useDiaryWeather.ts`, `src/features/emotion/model/emotion.ts`                       | `docs/ARCHITECTURE.md`                          |
| 회고         | 오늘 확인 → 대화 → 일기 초안 → 완료         | `app/retro/confirm.tsx`, `app/retro/talk.tsx`, `app/retro/draft.tsx`, `app/retro/done.tsx`                                                                                               | `docs/retro-chat-v2-plan.md`                    |
| 회고 데이터  | 회고 상태·서버 호출·바바 장면               | `src/features/retro/model/retro.ts`, `src/features/retro/data/retroApi.ts`, `src/features/retro/ui/RetroBaba.tsx`                                                                        | `docs/retro-chat-v2-plan.md`                    |
| 주간 리포트  | 주 선택·화면·서버 데이터                    | `app/(tabs)/report.tsx`, `src/features/report/ui/ReportView.tsx`, `src/features/report/model/weeklyReport.ts`, `src/features/report/data/weeklyReportApi.ts`                             | `docs/DESIGN.md`, `docs/spec/SNAPSHOT.md`       |
| 온보딩       | 라우트 가드, 대화 화면, 완료 제출           | `app/(onboarding)/_layout.tsx`, `app/(onboarding)/welcome.tsx`, `app/(onboarding)/done.tsx`, `src/components/onboarding/OnboardingChat.tsx`                                              | `docs/PRODUCT.md`, `docs/spec/SNAPSHOT.md`      |
| 온보딩 상태  | 임시 입력·선택지·완료 API                   | `src/features/onboarding/model/draft.ts`, `src/features/onboarding/model/options.ts`, `src/features/onboarding/data/completeOnboardingApi.ts`                                            | `docs/ARCHITECTURE.md`                          |
| 온보딩 단계  | 닉네임·나이·성별·관심사·쉼·회고 시각·캘린더 | `app/(onboarding)/nickname.tsx`, `app/(onboarding)/age.tsx`, `app/(onboarding)/interests.tsx`, `app/(onboarding)/retro-time.tsx`, `app/(onboarding)/calendar.tsx`                        | `docs/PRODUCT.md`                               |
| 로그인       | 소셜 로그인·세션                            | `app/(auth)/login.tsx`, `src/features/auth/model/auth.ts`, `src/features/auth/data/loginSession.ts`                                                                                      | `docs/ARCHITECTURE.md`, `docs/DATA-SECURITY.md` |
| 마이         | 설정·프로필·문의                            | `app/(tabs)/my.tsx`, `src/features/my/ui/MyMainView.tsx`, `app/my/profile.tsx`, `app/my/inquiry.tsx`                                                                                     | `docs/DESIGN.md`, `docs/PRODUCT.md`             |
| 마이 데이터  | 설정·프로필·알림 시간·문의 API              | `src/features/my/model/settings.ts`, `src/features/my/model/basicInfo.ts`, `src/features/my/data/inquiryApi.ts`                                                                          | `docs/ARCHITECTURE.md`                          |
| 프로필 수정  | 기본 정보 개별 편집 화면                    | `app/my/nickname.tsx`, `app/my/age.tsx`, `app/my/gender.tsx`, `app/my/interests.tsx`, `app/my/rest.tsx`                                                                                  | `docs/PRODUCT.md`                               |

## 3. 공통 컴포넌트와 디자인 토큰

| 기능             | 역할                              | 핵심 파일 경로                                                                                                                            | 관련 문서                                   |
| ---------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 공통 UI          | 내보내기 진입점, 화면 셸, 하단 탭 | `src/components/ds/index.ts`, `src/components/ds/Screen.tsx`, `src/components/ds/TabScreen.tsx`, `src/components/ds/BottomNavigation.tsx` | `docs/DESIGN.md`, `docs/spec/COMPONENTS.md` |
| 입력·대화        | 버튼·입력·채팅 틀                 | `src/components/ds/Button.tsx`, `src/components/ds/TextField.tsx`, `src/components/ds/ChatScaffold.tsx`                                   | `docs/DESIGN.md`                            |
| 디자인 토큰      | 색·글자·치수의 코드 진입점        | `src/design/ds/index.ts`, `src/design/ds/color.ts`, `src/design/ds/typography.ts`, `src/design/ds/metrics.ts`                             | `docs/DESIGN.md`                            |
| 홈 v2·Studio     | 홈 전용 값과 승인된 Studio 설정   | `src/design/ds/homeV2.ts`, `src/design/studioDesign.ts`, `src/design/studioApproved.json`                                                 | `docs/DESIGN.md`, `expo-lab/README.md`      |
| 기능별 화면 조각 | 보관함·일기·리포트·쉼터           | `src/components/archive/`, `src/components/diary/`, `src/components/report/`, `src/components/rest/`                                      | `docs/DESIGN.md`                            |

## 4. 상태·API·데이터 모델

| 기능             | 역할                                                              | 핵심 파일 경로                                                                                                                                                       | 관련 문서                                        |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 상태 관리        | Zustand store는 도메인 model에 분산; 시작점은 인증·오늘·일기·회고 | `src/features/auth/model/auth.ts`, `src/features/home/model/day.ts`, `src/features/diary/model/diary.ts`, `src/features/retro/model/retro.ts`                        | `docs/ARCHITECTURE.md`                           |
| HTTP 공통        | 서버 주소·인증 요청·재발급                                        | `src/lib/config.ts`, `src/lib/http.ts`, `src/features/auth/data/reissueApi.ts`                                                                                       | `docs/ARCHITECTURE.md`, `docs/api/README.md`     |
| 기능 API         | 도메인별 `data/` 호출; 일정·일기·회고·리포트부터 추적             | `src/features/home/data/scheduleApi.ts`, `src/features/diary/data/diaryApi.ts`, `src/features/retro/data/retroApi.ts`, `src/features/report/data/weeklyReportApi.ts` | `docs/api/README.md`, `docs/api/openapi.json`    |
| 데이터 타입      | 기능별 모델·DTO 확인                                              | `src/features/home/model/types.ts`, `src/features/diary/model/types.ts`, `src/features/calendar/model/types.ts`, `src/features/report/model/weeklyReport.ts`         | `docs/ARCHITECTURE.md`                           |
| 계측·알림        | 이벤트 허용 목록, 알림함 상태·API                                 | `src/features/analytics/events.ts`, `src/features/analytics/client.ts`, `src/features/notifications/model/inbox.ts`, `src/features/notifications/data/inboxApi.ts`   | `docs/ANALYTICS.md`                              |
| 외부 캘린더·시간 | 캘린더 동기화, 04:00 하루 경계                                    | `src/features/calendar/model/calendarSync.ts`, `src/features/calendar/data/calendarSyncApi.ts`, `src/lib/calendar.ts`, `src/lib/clock.ts`                            | `docs/ARCHITECTURE.md`, `docs/CALENDAR-PROBE.md` |

## 5. 이동과 핵심 흐름

| 기능           | 역할                                             | 핵심 파일 경로                                                                              | 관련 문서                           |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| 첫 진입        | 시작 → 로그인/온보딩/홈 분기; 온보딩 완료 → 홈   | `app/index.tsx`, `app/(auth)/login.tsx`, `app/(onboarding)/done.tsx`                        | `docs/PRODUCT.md`                   |
| 주 탭          | 홈·쉼터·보관함·리포트·마이 이동                  | `app/(tabs)/_layout.tsx`, `src/components/ds/TabScreen.tsx`                                 | `docs/redesign/SCREEN_INVENTORY.md` |
| 오늘의 기록    | 홈 회고 진입 → 대화 → 일기 초안 → 완료/쉼터      | `app/(tabs)/home.tsx`, `app/retro/confirm.tsx`, `app/retro/talk.tsx`, `app/retro/draft.tsx` | `docs/retro-chat-v2-plan.md`        |
| 기록 다시 보기 | 보관함 선택 → 일기 상세; 리포트 → 해당 주 보관함 | `app/(tabs)/archive.tsx`, `app/diary/[id]/index.tsx`, `app/(tabs)/report.tsx`               | `docs/PRODUCT.md`                   |
| 쉼터 진입      | 쉼터 허브 → 콘텐츠/바람카드 → 콘텐츠 기록        | `app/(tabs)/rest.tsx`, `src/features/rest/model/contents.ts`, `app/rest/records.tsx`        | `docs/PRODUCT.md`                   |

## 6. Expo Web Design Lab

| 기능           | 역할                                | 핵심 파일 경로                                                                                                                                                                                                | 관련 문서                                                  |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Lab 시작       | 별도 Expo Web 진입·비교 화면        | `expo-lab/index.ts`, `expo-lab/src/App.tsx`, `expo-lab/package.json`                                                                                                                                          | `expo-lab/README.md`                                       |
| 화면·시안 등록 | 캡처 목록, 변형, 기기 프레임        | `expo-lab/src/catalog/screens.ts`, `expo-lab/src/catalog/variants.tsx`, `expo-lab/src/catalog/PhonePreview.tsx`                                                                                               | `expo-lab/README.md`                                       |
| 운영 뷰 Mock   | 홈·쉼터·보관함·리포트·마이 미리보기 | `expo-lab/src/claude-home/HomeV2Preview.tsx`, `expo-lab/src/rest/RestHubPreview.tsx`, `expo-lab/src/archive/ArchivePreview.tsx`, `expo-lab/src/report/ReportPreview.tsx`, `expo-lab/src/my/MyMainPreview.tsx` | `expo-lab/README.md`                                       |
| Studio         | 편집 가능한 항목·초안·비교          | `expo-lab/src/studio/Studio.tsx`, `expo-lab/src/studio/registry.ts`, `expo-lab/src/studio/model.ts`, `expo-lab/src/studio/StateComparison.tsx`                                                                | `expo-lab/STUDIO_VALIDATION.md`                            |
| 이전 Vite Lab  | 보존된 정적 화면/캡처 비교 자료     | `design-lab/src/App.tsx`, `design-lab/src/screens/currentAppScreens.ts`                                                                                                                                       | `design-lab/README.md`, `docs/EXPO_WEB_DESIGN_LAB_PLAN.md` |

## 7. 테스트·검수·Codex 문서

| 기능             | 역할                                              | 핵심 파일 경로                                                                                                             | 관련 문서                                                        |
| ---------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 단위/화면 테스트 | Jest 설정, 라우트 및 기능 인접 테스트             | `jest.config.js`, `jest.setup.ts`, `app/(tabs)/__tests__/home.test.tsx`, `src/features/home/__tests__/homeV2View.test.tsx` | `docs/CONTRIBUTING.md`                                           |
| 테스트 데이터    | 고정 fixture; 운영 코드와 분리                    | `src/testing/fixtures.ts`                                                                                                  | `docs/ARCHITECTURE.md`                                           |
| Lab 회귀         | Playwright 설정, 홈 배치/접근성, Studio           | `playwright.config.ts`, `expo-lab/e2e/home-accessibility-layout.spec.ts`, `expo-lab/e2e/studio.spec.ts`                    | `expo-lab/VISUAL_VALIDATION.md`, `expo-lab/STUDIO_VALIDATION.md` |
| 도메인 검수      | 제품 여정·화면 QA·문구·디자인·계측·diff 리뷰 스킬 | `.agents/skills/`, `docs/CODEX_SKILLS.md`, `AGENTS.md`                                                                     | `docs/CONTRIBUTING.md`                                           |
| 제품·구조 문서   | 구현 조사 뒤 판단 기준과 화면 목록                | `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/redesign/SCREEN_INVENTORY.md`                           | `docs/spec/SNAPSHOT.md`                                          |

## 8. 자주 하는 작업: 먼저 열 파일

| 기능                | 역할                                          | 핵심 파일 경로                                                                                                                                                                                        | 관련 문서                                 |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 홈 히어로/도크 수정 | 운영 뷰 → 전용 토큰 → Lab 경계 검사           | `src/features/home/ui/v2/HomeV2View.tsx`, `src/features/home/ui/v2/HeroCard.tsx`, `src/features/home/ui/v2/WeekDock.tsx`, `src/design/ds/homeV2.ts`, `expo-lab/e2e/home-accessibility-layout.spec.ts` | `docs/DESIGN.md`                          |
| 일정 저장/표시 수정 | 라우트 → store → API → 일정 UI                | `app/(tabs)/home.tsx`, `src/features/home/model/day.ts`, `src/features/home/data/scheduleApi.ts`, `src/features/home/ui/v2/ScheduleSection.tsx`                                                       | `docs/ARCHITECTURE.md`                    |
| 회고·일기 흐름 수정 | 대화/초안 라우트 → 상태 → API                 | `app/retro/talk.tsx`, `app/retro/draft.tsx`, `src/features/retro/model/retro.ts`, `src/features/diary/data/diaryApi.ts`                                                                               | `docs/retro-chat-v2-plan.md`              |
| 쉼 콘텐츠 수정      | 허브 항목 → 해당 라우트 → 기록/API            | `src/features/rest/model/contents.ts`, `app/(tabs)/rest.tsx`, `src/features/rest/model/useRestRecord.ts`, `src/features/rest/data/restRecordApi.ts`                                                   | `docs/PRODUCT.md`                         |
| 화면 문구/서체 수정 | 해당 라우트·뷰에서 문구 위치 확인 → 토큰/정본 | `src/features/home/ui/v2/HomeV2View.tsx`, `src/design/ds/typography.ts`, `src/design/ds/homeV2.ts`                                                                                                    | `docs/DESIGN.md`, `docs/spec/SNAPSHOT.md` |
| Lab 시안 추가       | 화면 등록 → Mock 미리보기 → Studio 설정       | `expo-lab/src/catalog/variants.tsx`, `expo-lab/src/studio/registry.ts`, `src/design/studioDesign.ts`                                                                                                  | `expo-lab/README.md`                      |

이 목차는 앱·기능·Lab의 주요 진입점만 다룬다. 네이티브 플러그인, 빌드·배포, 자산 생성 스크립트의 개별 파일은 여기서 세분화하지 않았다. 해당 작업은 `plugins/`, `scripts/`, `android/`에서 범위를 정해 검색한다.
