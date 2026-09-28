# Amplitude 파일럿 계측

> ✅ **2026-09-12 — main 에 들어가 있다**(`src/features/analytics/` · PR #127).
> ⛔ **남은 것은 운영 값 둘**: 실제 프로젝트 키(`EXPO_PUBLIC_AMPLITUDE_API_KEY`) 설정과,
> 그 키가 들어간 **새 네이티브 빌드**에서 실기기 이벤트 도착 확인.
> ⚠ **Play 데이터 보안 양식도 함께 고쳐야 한다** — 「앱 상호작용」과 「기기 또는 기타 ID」가
> 수집으로 바뀐다([`PLAY-DATA-SAFETY.md`](PLAY-DATA-SAFETY.md) 「분석 도구」).

2026-09-05 사용자 승인: **FE만 구현, 하나의 PR**. 기존 API와 화면 동작은 유지한다.
페이지 체류 시간과 알림 설정·예약 계측은 제외한다. 캘린더 접근 권한은 알림 권한과 별개다.

2026-09-28 추가 승인: **감각연못은 단계별 소요 시간을 수집한다.** 앱이 전면에 있던 시간만 세고,
사용자에게는 보이지 않는다. 일반 화면의 체류 시간은 여전히 수집하지 않는다.

## 활성화

1. Amplitude에 US 리전 프로젝트를 만들고 프로젝트의 **API Key**를 받는다. SDK 기본 수집 서버는 US다. EU 프로젝트를 사용한다면 먼저 SDK의 serverZone을 EU로 맞춰야 한다.
2. 빌드 환경에 EXPO_PUBLIC_AMPLITUDE_API_KEY를 지정한다. 키가 비면 계측만 꺼진다. 클라이언트 수집용 키는 번들에 포함되는 공개 키이며 Amplitude **Secret Key**를 넣으면 안 된다. 실제 .env는 커밋하지 않는다.
3. 개발 빌드에서 확인할 때만 EXPO_PUBLIC_AMPLITUDE_ALLOW_DEVELOPMENT=true로 둔다. 기본값은 개발 수집 차단이다. 배포 빌드는 API Key가 있으면 수집한다.
4. 새 네이티브 SDK/AsyncStorage가 포함되므로 기존 개발 앱을 **다시 빌드**한다. 저장소의 [SETUP.md](SETUP.md)에 따라 Expo prebuild와 기존 iOS/Android 빌드 절차를 사용한다. 기존 바이너리에 JS만 전달하는 방식으로 검증을 대신하지 않는다.
5. 키가 들어간 새 앱으로 아래 시나리오를 실행하고 Amplitude의 사용자 이벤트 스트림에서 확인한다. 테스트용 계정은 발표용 차트에서 제외한다.

FE는 main 기준이다. MOMENTORY_BUILD_ENV=production은 기존 네이티브 빌드 설정이고,
개발용 develop 브랜치를 의미하지 않는다. analytics 개발 수집 여부는 런타임의 __DEV__와
위 명시적 허용 값으로 판단한다. Amplitude 프로젝트를 두 개 만들 필요는 없다.

이번 코드 검증에는 실제 프로젝트 키로 전송하는 작업과 실기기 네이티브 실행은 포함하지 않았다.
키 설정과 배포 빌드 후 실제 도착 확인이 필요하다. 앱스토어 사용자는 업데이트한 버전부터 관찰된다.

## 이벤트 사전

모든 사용자 식별은 SecureStore 세션의 **서비스 내부 사용자 ID 문자열**이다.
이메일·SNS ID를 사용하지 않는다. 아래 속성 외에는 런타임에서 버린다.
SDK 공통 메타데이터는 발생 시각, 임의 기기 ID, 세션 ID, 앱 버전, OS/플랫폼 등이다.
자동 화면/클릭/네트워크 수집과 세션 리플레이는 사용하지 않는다.

| 이벤트                       | 발생 지점/의미                              | 이벤트 속성                               |
| ---------------------------- | ------------------------------------------- | ----------------------------------------- |
| app_opened                   | 앱의 JS 실행 시작, 한 번                    | 없음                                      |
| app_foregrounded             | 실제 background를 거친 active 복귀          | 없음                                      |
| screen_viewed                | 허용된 라우트의 화면 진입                   | screen: 고정 화면명                       |
| login_started                | 소셜 로그인 중복 실행 가드 통과             | provider: kakao/apple/google              |
| login_succeeded              | 서버 세션을 기기에 저장하고 채택            | provider, onboarding_required             |
| login_not_completed          | 로그인 취소 또는 실패                       | provider, outcome: cancelled/failed       |
| onboarding_step_viewed       | 해당 온보딩 화면 진입                       | step: 고정 단계명                         |
| onboarding_step_completed    | 다음 단계로 이동, 선택 항목 건너뛰기도 포함 | step                                      |
| onboarding_completed         | 완료 API가 onboardingRequired=false로 응답  | 없음                                      |
| calendar_permission_result   | 온보딩 캘린더 연결 요청 결과                | granted                                   |
| calendar_sync_succeeded      | 캘린더 동기화 성공 응답                     | created, updated, deleted 개수            |
| schedule_created             | 직접 일정 추가 성공                         | schedule_id, source                       |
| schedule_updated             | 일정 제목 편집 성공                         | schedule_id                               |
| schedule_deleted             | 일정 삭제 성공                              | schedule_id                               |
| schedule_visibility_changed  | 캘린더 일정 숨김/표시 성공                  | schedule_id, hidden                       |
| schedule_completion_changed  | 일정 완료 상태 저장 성공                    | schedule_id, completed                    |
| retrospect_started           | 회고 시작 API 성공                          | retrospect_id                             |
| retrospect_turn_succeeded    | 대화 턴 API 성공                            | retrospect_id, input_kind: text/selection |
| retrospect_branch_selected   | 고정 분기 선택 제출                         | branch: diary/explore                     |
| retrospect_completed         | done=true이면서 phase=complete인 정상 응답  | retrospect_id                             |
| retrospect_request_failed    | 시작/턴 API 실패 또는 응답 검증 실패        | operation: start/turn, 고정 code          |
| wish_card_created            | 정상 완료 응답에 실제 wishCardId가 있음     | retrospect_id, wish_card_id               |
| archive_view_changed         | 달력/목록 모드 전환                         | view: calendar/list                       |
| archive_date_selected        | 보관함 달력 날짜 선택                       | days_from_today, has_diary                |
| archive_month_changed        | 보관함 달력 이전/다음 월                    | direction: previous/next                  |
| archive_period_changed       | 보관함 목록 조회 기간 선택                  | period: all/month                         |
| diary_open_clicked           | 보관함에서 일기 열기 클릭                   | diary_id, source: calendar/list           |
| diary_viewed                 | 일기 상세 데이터가 실제 표시됨              | diary_id                                  |
| diary_deleted                | 일기 삭제 성공                              | diary_id                                  |
| diary_updated                | 회고 완료 화면에서 일기 본문 편집 성공      | retrospect_id                             |
| wish_card_open_clicked       | 쉼터의 바람카드 보기 클릭                   | source: rest                              |
| wish_card_viewed             | 선택 카드 데이터가 실제 표시됨              | wish_card_id, source: cards/trail         |
| wish_card_completion_changed | 해봤어요/되돌리기 API 성공                  | wish_card_id, completed                   |
| wish_card_deleted            | 바람카드 삭제 성공                          | wish_card_id                              |
| sense_pond_step_completed    | 감각연못 한 단계의 목표를 채움              | step, duration_ms 외 2개 (아래)           |
| sense_pond_finished          | 감각연못 마지막 단계의 목표를 채움          | duration_ms                               |
| sense_pond_exited            | 끝내지 않고 감각연못 화면을 떠남            | step, found, hold_cancels, duration_ms    |
| report_week_selected         | 다른 주 선택                                | week_start                                |
| weekly_report_viewed         | 선택 주와 일치하는 리포트가 ready로 표시됨  | week_start                                |
| logout_clicked               | 마이 로그아웃 클릭                          | 없음                                      |
| logout_completed             | 기기의 로그인 상태를 비움                   | 없음                                      |
| withdrawal_opened            | 탈퇴 확인 시트 열기                         | 없음                                      |
| withdrawal_cancelled         | 제출 중이 아닐 때 시트를 닫음               | 없음                                      |
| withdrawal_submitted         | 탈퇴 중복 실행 가드를 통과해 요청 시작      | 없음                                      |
| withdrawal_completed         | 서버 계정 삭제 성공 응답                    | 없음                                      |
| withdrawal_failed            | 서버 계정 삭제 실패 응답                    | 없음                                      |

화면명은 login, home, archive, rest, report, my, onboarding, schedule_new,
schedule_detail, retro_talk, retro_draft, retro_confirm, retro_done, diary_detail,
wish_cards, wish_card_trail, sense_pond, profile 및 고정 프로필 편집 화면명이다.
온보딩 단계명은 welcome, nickname, age, gender, interests, rest, retroTime, calendar, done이다.
retroTime 단계에서는 **진행 여부만** 알 수 있고 알림 허용/거부·설정 시각·예약 성공은 수집하지 않는다.

감각연못의 step은 see, hear, feel이고, 시간은 모두 전면 시계로 잰다. sense_pond_step_completed는
step, duration_ms, longest_gap_ms, hold_cancels를 싣는다. duration_ms는 단계가 보인 때부터 목표를 채운
손짓까지, longest_gap_ms는 그 단계 안에서 단계 시작 또는 직전 손짓부터 다음 손짓까지 가장 길었던 간격이다.
간격이 고르면 천천히 둘러본 것이고, 한 번 길게 멈췄다가 몰아 누르면 어디를 눌러야 할지 몰랐던 것에
가깝다. hold_cancels는 감각 단계에서 잠시 누르기를 다 채우기 전에 손을 뗀 횟수이며 톡 단계에서는 0이다.
손짓마다 이벤트를 보내지 않는다. 물이 아닌 자리의 손짓과 목표를 넘긴 손짓은 화면처럼 세지 않는다.

회고 실패 code는 invalid_request, already_today, session_not_found, unauthenticated,
network, server, malformed, unconfigured 중 하나다. 오류 원문/응답 본문은 전송하지 않는다.
캘린더 동기화는 자동으로도 실행된다. 해당 이벤트 수를 사용자의 클릭 수로 해석하지 않는다.
일정 완료 이벤트도 저장 성공 횟수이며 서버의 상태 변경 이력에 대한 보장은 아니다.
바람카드의 느낀 점 저장은 완료 변경으로 세지 않는다.

## 발표용 차트

| 질문                             | 차트 구성                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| 온보딩 어디서 이탈하는가?        | step별 viewed → completed의 고유 사용자 퍼널. 같은 전환 기간을 적용                   |
| 첫 회고까지 도달하는가?          | onboarding_completed → 사용자의 최초 retrospect_started → retrospect_completed        |
| AI 대화를 얼마나 쓰는가?         | retrospect_turn_succeeded의 고유 사용자/턴 수, retrospect_id별 분포                   |
| 회고 이후 카드로 이어지는가?     | retrospect_completed → wish_card_created → wish_card_viewed                           |
| 어떤 기능이 많이 쓰이는가?       | screen_viewed를 screen별 고유 사용자/이벤트 수로 구분                                 |
| 보관함에서 일기를 실제로 여는가? | diary_open_clicked → diary_viewed, source별 비교                                      |
| 리포트를 다시 보는가?            | weekly_report_viewed의 고유 사용자와 주차별 조회                                      |
| 재방문하는가?                    | 식별된 사용자의 app_opened/app_foregrounded로 일 단위 Retention                       |
| 로그아웃 비율은?                 | 기간 내 logout_completed 고유 사용자 ÷ 같은 기간 식별된 활성 사용자                   |
| 탈퇴 비율은?                     | 기간 내 withdrawal_completed 고유 사용자 ÷ 같은 기간 식별된 활성 사용자               |
| 탈퇴 시트에서 취소하는가?        | withdrawal_opened → withdrawal_submitted → withdrawal_completed 퍼널과 cancelled 비교 |

프로젝트 시간대를 Asia/Seoul로 맞추고 같은 사용자 집계·기간을 사용한다.
재방문은 복귀 이벤트 횟수 자체와 구분한다. 같은 날 앱을 여러 번 여는 것도 복귀 이벤트다.
탈퇴 완료율(제출자 중 완료자)과 활성 사용자 대비 탈퇴율은 분모가 다른 지표다.
모든 분석은 **계측 버전 설치 이후 관찰된 사용자 집단**에 대한 것이며 전체 가입자 모수와 다르다.

## 수집 경계와 한계

- 로그인 응답에는 신규 가입 여부가 없다. onboarding_required=true에는 미완료 재로그인도 포함되므로 signup_completed를 만들지 않았다. 발표에서는 “온보딩이 필요한 로그인/온보딩 완료”라고 표기한다.
- 날짜 관련 이벤트는 **보관함 조회 날짜·월·기간 변경**이다. 현재 없는 일기 작성일 수정 기능은 추가하지 않았다.
- 쉼 콘텐츠 중 화면이 있는 것은 감각연못뿐이라 감각연못만 계측한다. 나머지 셋은 화면을 만들 때 함께 계측을 추가한다.
- 자동 수집/세션 리플레이를 쓰지 않는다. 이메일, 닉네임, SNS ID, 인증 토큰, 일기·일정·대화·바람 원문, 감정/욕구 코드·이름, 검색어, 알림 값은 속성 허용 목록에 없다.
- 신원 복원 전 이벤트는 최대 50개, SDK 초기화 전 작업은 최대 200개만 메모리에 둔다. 넘치는 이벤트는 버리되 신원 변경은 보존한다. SDK 초기화가 실패하면 그 실행의 analytics만 비활성화한다.
- SDK의 배치 전송/재시도를 사용한다. 서비스 DB에는 로그 테이블을 만들지 않는다. SDK는 기기에 전송 대기 이벤트와 임의 기기 ID를 저장할 수 있다.
- 같은 화면의 재렌더는 중복 조회가 아니다. 다시 들어오거나 다른 카드를 보면 새 조회다. 앱 복귀는 별도 이벤트이며 화면 체류 시간은 계산하지 않는다.
- 일정 생성, 회고 시작/완료, 바람카드 생성, 온보딩 완료는 사용자·리소스 기반 insert_id와 제한된 메모리 집합으로 반복 관찰을 줄인다. 일반 클릭/조회는 새 UUID다.
- Amplitude의 insert_id 중복 제거 기간/기기 범위를 넘어선 재전송이나 여러 기기 간 완전한 중복 제거는 보장하지 않는다. 집계는 고유 사용자/리소스 기준도 함께 확인한다.
- 서버가 성공했어도 응답 유실·오프라인·앱 강제 종료로 FE 이벤트가 빠질 수 있다. 실패 응답/낙관적 UI 변경만으로 성공을 기록하지 않는다.
- 요청 시작 후 계정이 바뀌면 늦게 도착한 응답의 analytics는 버린다. 로그아웃/탈퇴 성공은 이전 ID로 기록하고 SDK 신원을 초기화한다. 계측은 서비스 요청에서 기다리지 않는다.
- logout_completed는 로컬 로그아웃이며 서버 토큰 폐기 성공을 의미하지 않는다. withdrawal_completed는 서버 계정 삭제 성공이다. Amplitude에 이미 전송한 이벤트의 삭제는 별도 데이터 관리 작업이다.

## 실기기 확인 순서

1. 키 없이 앱 실행/로그인/일정/회고가 동작하고 analytics 전송이 없는지 확인한다.
2. 테스트 수집을 켠 새 개발 빌드에서 로그인하고 user_id가 내부 ID인지 확인한다.
3. 온보딩 다음/건너뛰기, 일정 생성·편집·완료·삭제, 회고 텍스트·선택지·완료·바람카드 생성을 한 번씩 실행한다.
4. 보관함 달력/목록/월/날짜, 일기 상세, 쉼터 카드와 수행 변경, 주간 리포트를 확인한다. 화면 재렌더와 카드 수행 변경이 조회 횟수를 늘리지 않는지 본다.
5. 탈퇴 시트 취소, 로그아웃 후 다른 계정 로그인, 별도 테스트 계정 탈퇴를 확인한다. 앞 계정의 지연 응답이 뒤 계정으로 붙지 않아야 한다.
6. 네트워크를 끊고 기능을 사용해 analytics 오류 때문에 앱이 멈추지 않는지 확인한다.
7. 실제 전송 속성에 민감 원문·감정·알림 값이 없는지 확인하고, 테스트 계정을 발표 차트에서 제외한 뒤 릴리스 빌드를 배포한다.

SDK 설정 근거: [공식 React Native SDK 문서](https://amplitude.com/docs/sdks/analytics/react-native/react-native-sdk).
