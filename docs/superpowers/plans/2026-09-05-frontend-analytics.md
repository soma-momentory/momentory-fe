# FE Amplitude 파일럿 구현 계획

**Goal:** 기능 이용·온보딩 이탈·재방문을 FE에서 관찰하고, 하나의 기능 브랜치와 PR로 전달한다.
**Architecture:** 허용한 이벤트/속성만 받는 공통 클라이언트 → Amplitude React Native SDK. 화면 노출은 라우트의 고정 이름, 작업 성공은 기존 API 결과/인증 상태 전환에서 기록한다.
**Tech Stack:** Expo 57, React Native, TypeScript, Zustand, Jest, Amplitude React Native SDK.
**Spec:** 2026-09-05 사용자 승인 범위. 아래 제약이 기존 analytics 문서보다 우선한다.

## 제약과 결정

- FE만 변경. API 계약, UI, 비즈니스 결과를 변경하지 않는다. 브랜치는 `feat/frontend-analytics`, 기준은 `main`, PR 하나. 이번 작업에서 main 병합은 하지 않는다.
- 페이지 체류 시간과 모든 알림 설정·예약 계측은 제외한다. 온보딩 단계 도달 여부만 기록하며 알림 답변은 읽지 않는다.
- 이메일, SNS ID, 닉네임, 일기·채팅·일정·바람 텍스트, 감정·욕구 값, 오류 원문, 검색어는 전송하지 않는다. 서비스 내부 사용자 ID만 사용한다.
- 자동 수집/세션 리플레이 없이 명시적 이벤트만 기록한다. 런타임 속성 허용 목록으로 추가 필드 유출도 막는다.
- 키 미설정 시 비활성. 개발 빌드는 명시적 테스트 허용 없이는 비활성. 별도 develop 브랜치나 Amplitude 프로젝트는 요구하지 않는다.
- 분석 초기화/전송 실패를 서비스 호출로 전파하지 않는다. 계정 전환 전에 시작된 응답은 이전 사용자로 고정하거나 폐기한다. 로그아웃·탈퇴 이벤트를 기록하고 신원을 초기화한다.
- 사용자 클릭/조회는 관찰마다 새 insert_id, 생성 완료는 내부 리소스 ID에 기반한 insert_id를 사용한다. SDK 재전송 시 같은 insert_id를 유지한다. FE 수집의 유실·중복 가능성을 0으로 보장하지 않는다.
- 신규 회원 여부가 없는 로그인 응답으로 회원가입 이벤트를 만들지 않는다. `login_succeeded`의 `onboarding_required`와 온보딩 완료로 파일럿 퍼널을 만든다.
- 보관함 날짜 변경은 조회 날짜/월/기간 이동을 의미한다. 존재하지 않는 일기 작성일 수정 기능은 만들지 않는다.

## 순서

### 1. 기반과 보호 장치

- [x] main의 로컬 변경 없음 확인, 기능 브랜치 생성, 기존 테스트 62 suites / 1,022 tests 통과 확인.
- [x] `src/features/analytics/events.ts`: 고정 이름, enum·숫자·boolean·내부 ID 속성 검증. 임의 속성을 버린다.
- [x] `src/features/analytics/client.ts`: `track`, `identifyAnalytics`, `resetAnalytics`, `captureAnalytics` 제공. 모든 외부 효과는 비동기 실패 격리. 초기 신원 복원 전 이벤트는 제한된 메모리 큐에 보관한다.
- [x] `src/features/analytics/amplitude.ts`: SDK 설정, 광고·IP 등 불필요한 기본 속성 비활성, minIdLength 1, 환경 키와 개발 수집 제어.
- [x] `src/features/analytics/AnalyticsObserver.tsx`, `AnalyticsResource.tsx`, `observation.ts`: 고정 라우트 화면 노출, 앱 시작/실제 background→active 이벤트. 시간 계산 없음. `src/lib/providers.tsx`에 연결.
- [x] SDK와 Expo 호환 AsyncStorage 의존성 및 `.env.example` 추가. 네이티브 빌드가 필요한 점 문서화.
- [x] 먼저 테스트로 민감 속성 차단, 키 미설정, 전송 예외, 계정 전환, 초기화 전 이벤트, 중복 완료를 재현하고 구현한다.

### 2. 인증·온보딩

- [x] `src/features/auth/model/auth.ts`: 기존 세션 복원/채택 시 내부 ID 지정, 무효화 시 초기화. 소셜 로그인 시작·성공·취소/실패, 로컬 로그아웃 완료, 서버 탈퇴 성공/실패를 정확한 분기에서 기록.
- [x] `app/(onboarding)/*.tsx`: 실제 다음 단계로 진행할 때 step_completed, 공통 관찰자에서 step_viewed. done의 성공 응답에서 onboarding_completed. 답변 속성 없음.
- [x] 인증 통합 테스트로 성공/실패와 로그아웃 전 ID 보존을 확인하고, 기존 온보딩 화면 테스트로 다음/건너뛰기 동작을 검증.

### 3. 기능 이용과 보관함·계정 UI

- [x] `src/features/home/data/scheduleApi.ts`, `src/features/calendar/data/calendarSyncApi.ts`: 일정 생성/편집/삭제/완료/숨김과 캘린더 동기화 성공의 ID·개수만 기록. 조회 프리페치는 화면 조회로 세지 않는다.
- [x] `src/features/retro/data/retroApi.ts`, `app/retro/talk.tsx`: 회고 시작, 턴 성공(text/selection만), 고정 분기 선택, 정상 complete, 실제 바람카드 ID 생성, 고정 실패 코드. done만으로 완료 판정하지 않는다.
- [x] `app/(tabs)/archive.tsx`, `app/diary/[id]/index.tsx`: 보관함 모드/날짜/월/기간 이동, 일기 열기 클릭과 실제 조회. 검색어·감정 필터는 전송하지 않는다.
- [x] `app/(tabs)/rest.tsx`, `app/rest/cards/*.tsx`, `src/features/diary/data/diaryApi.ts`: 쉼터→카드 클릭, 실제 카드 노출, 완료 변경, 일기/카드 삭제 성공.
- [x] `app/(tabs)/report.tsx`: 주간 선택, 데이터가 실제 표시되는 조회. 포커스/동일 데이터 재렌더 중복 방지.
- [x] `app/(tabs)/my.tsx`: 로그아웃 클릭, 탈퇴 열기/취소/제출. 탈퇴 성공은 auth의 단일 지점.
- [x] 관련 API·화면 테스트에서 성공/실패, 중복 렌더, 본문 미전송을 검증.

### 4. 검증과 한 PR

- [x] `docs/ANALYTICS.md`: 실제 이벤트 사전, 설치/키/기기 검증 순서, 퍼널과 비율 분모, 측정 한계. `docs/TASKS.md`에 진행 상태 연결.
- [x] typecheck, lint, format:check, 전체 Jest, 비밀 파일 추적 방지, diff 검토. 백엔드 변경 없음 확인.
- [x] 독립 코드 리뷰로 신원·중복·개인정보·UI 회귀 점검 후 필요한 수정.
- [ ] 기능 브랜치 커밋/push, 저장소 템플릿으로 PR 하나 생성. 실제 키/기기 미확인 항목은 PR과 최종 응답에 남긴다.

## 수집 해석

첫 회고는 사용자별 최초 `retrospect_started`, 재방문은 식별 사용자별 다른 날의 `app_opened`/`app_foregrounded`로 분석한다. 서버 처리 후 응답 유실/앱 강제 종료는 일부 성공 수집을 누락시킬 수 있다. 페이지별 시간/푸시 알림 지표는 이번 범위 밖이다.

## 검증 기록

- 기존 기준: 62 suites / 1,022 tests 통과.
- 최종: 67 suites / 1,048 tests 통과. typecheck, lint, format:check, diff 공백 검사 통과.
- iOS/Android Hermes 번들 export 성공. 네이티브 autolinking 검증 성공.
- 독립 리뷰: 초기화 대기 큐의 신원 전환 보존, AsyncStorage 중복 해소, 갱신 토큰 폐기 시 analytics 신원 초기화를 보완했고 재검토 완료.
- 실제 Amplitude 프로젝트 키를 통한 도착 확인/실기기 네이티브 실행은 배포 전 수동 검증으로 남는다.
