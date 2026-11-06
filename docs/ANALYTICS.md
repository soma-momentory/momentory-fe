# Amplitude 파일럿 계측

> ✅ **2026-09-12 — main 에 들어가 있다**(`src/features/analytics/` · PR #127).
> ⛔ **남은 것은 운영 값 둘**: 실제 프로젝트 키(`EXPO_PUBLIC_AMPLITUDE_API_KEY`) 설정과,
> 그 키가 들어간 **새 네이티브 빌드**에서 실기기 이벤트 도착 확인.
> ⚠ **Play 데이터 보안 양식도 함께 고쳐야 한다** — 「앱 상호작용」과 「기기 또는 기타 ID」가
> 수집으로 바뀐다([`PLAY-DATA-SAFETY.md`](PLAY-DATA-SAFETY.md) 「분석 도구」).

2026-09-05 사용자 승인: **FE만 구현, 하나의 PR**. 기존 API와 화면 동작은 유지한다.
페이지 체류 시간과 알림 설정·예약 계측은 제외한다. 캘린더 접근 권한은 알림 권한과 별개다.

2026-09-28 추가 승인: **감각연못은 단계별 소요 시간을 수집한다.** 앱이 전면에 있던 시간만 세고,
사용자에게는 보이지 않는다. 같은 날 범위를 넓혀 **모든 화면의 체류 시간**(screen_left ·
onboarding_step_left)과 **알림 권한 허용 여부**(notify_permission_result)도 수집한다.
알림 설정 시각·예약 성공은 여전히 수집하지 않는다.

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

| 이벤트                        | 발생 지점/의미                                                   | 이벤트 속성                                                                                               |
| ----------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| app_opened                    | 앱의 JS 실행 시작, 한 번                                         | 없음                                                                                                      |
| app_foregrounded              | 실제 background를 거친 active 복귀                               | 없음                                                                                                      |
| screen_viewed                 | 허용된 라우트의 화면 진입                                        | screen: 고정 화면명                                                                                       |
| screen_left                   | 화면을 떠남 또는 백그라운드 전환                                 | screen, duration_ms, exit                                                                                 |
| login_started                 | 소셜 로그인 중복 실행 가드 통과                                  | provider: kakao/apple/google                                                                              |
| login_succeeded               | 서버 세션을 기기에 저장하고 채택                                 | provider, onboarding_required                                                                             |
| login_not_completed           | 로그인 취소 또는 실패                                            | provider, outcome: cancelled/failed                                                                       |
| onboarding_step_viewed        | 해당 온보딩 화면 진입(v2 · 로그인 전 소개 장 포함)               | step: 고정 단계명(아래)                                                                                   |
| onboarding_step_completed     | ⛔ 폐기(2026-10-25) — 옛 대화형 온보딩만 보냈다                  | step                                                                                                      |
| onboarding_step_left          | 온보딩 단계를 떠남 또는 백그라운드 전환                          | step, duration_ms, exit                                                                                   |
| notify_permission_result      | 온보딩 08·마이 M2 의 알림 권한 결과                              | source: onboarding/my, granted                                                                            |
| onboarding_question_answered  | 온보딩 v2 질문에 답하거나 건너뜀                                 | question, answer(서버 enum · SKIPPED)                                                                     |
| onboarding_completed          | v2 완료 API가 onboardingRequired=false로 응답                    | version, is_reonboarding, mood_change, know_why, day_end, diary_history, goals, first_retro               |
| onboarding_options_selected   | ⛔ 폐기(2026-10-25) — 새 온보딩은 관심사·쉬는 방법을 묻지 않는다 | step: interests/rest, count                                                                               |
| onboarding_submit_failed      | 완료 API 실패 또는 아직 온보딩 필요 응답                         | code (아래)                                                                                               |
| calendar_permission_result    | 온보딩 캘린더 연결 요청 결과                                     | granted                                                                                                   |
| calendar_link_chosen          | 캘린더 연결 여부를 고름                                          | source: onboarding/my, choice                                                                             |
| calendar_sync_succeeded       | 캘린더 동기화 성공 응답                                          | created, updated, deleted 개수                                                                            |
| calendar_sync_failed          | 캘린더를 읽거나 보내지 못함 (아래)                               | outcome: unreadable/failed                                                                                |
| schedule_created              | 직접 일정 추가 성공                                              | schedule_id, source                                                                                       |
| schedule_updated              | 일정 제목 편집 성공                                              | schedule_id                                                                                               |
| schedule_deleted              | 일정 삭제 성공                                                   | schedule_id                                                                                               |
| schedule_visibility_changed   | 캘린더 일정 숨김/표시 성공                                       | schedule_id, hidden                                                                                       |
| schedule_completion_changed   | 일정 완료 상태 저장 성공                                         | schedule_id, completed, source                                                                            |
| retrospect_started            | 회고 시작 API 성공                                               | retrospect_id                                                                                             |
| retrospect_turn_succeeded     | 대화 턴 API 성공                                                 | retrospect_id, input_kind: text/selection                                                                 |
| retrospect_turn_timed         | 대화 턴 성공, 화면에서 잰 시간                                   | retrospect_id, phase, turn_no 외 (아래)                                                                   |
| retrospect_exited             | 회고가 끝나기 전에 ✕ 또는 안드로이드 뒤로 가기로 나감            | retrospect_id, phase, turn_no                                                                             |
| retro_cta_clicked             | 홈의 지금 하루 돌아보기 · 리포트의 오늘 일기 쓰기 클릭           | source: home/report                                                                                       |
| voice_input_started           | 회고 입력창의 마이크로 음성 인식이 시작됨                        | retrospect_id                                                                                             |
| voice_permission_result       | 마이크 권한 팝업의 응답                                          | granted                                                                                                   |
| voice_input_failed            | 음성 인식 실패 (아래)                                            | code: no_speech/network/unavailable/other                                                                 |
| reminder_opened               | 예약한 알림을 눌러 앱을 엶                                       | reminder: retro/daily/weekly/letter/letter_action                                                         |
| retrospect_completed          | done=true이면서 phase=complete인 정상 응답                       | retrospect_id                                                                                             |
| retrospect_request_failed     | 시작/턴 API 실패 또는 응답 검증 실패                             | operation: start/turn, 고정 code                                                                          |
| wish_card_created             | 정상 완료 응답에 실제 wishCardId가 있음                          | retrospect_id, wish_card_id                                                                               |
| archive_view_changed          | 달력/목록 모드 전환                                              | view: calendar/list                                                                                       |
| archive_date_selected         | 보관함 달력 날짜 선택                                            | days_from_today, has_diary                                                                                |
| archive_month_changed         | 보관함 달력 이전/다음 월                                         | direction: previous/next                                                                                  |
| archive_period_changed        | 보관함 목록 조회 기간 선택                                       | period: all/month                                                                                         |
| diary_open_clicked            | 보관함에서 일기 열기 클릭                                        | diary_id, source: calendar/list                                                                           |
| diary_viewed                  | 일기 상세 데이터가 실제 표시됨                                   | diary_id                                                                                                  |
| diary_deleted                 | 일기 삭제 성공                                                   | diary_id                                                                                                  |
| diary_updated                 | 회고 완료 화면에서 일기 본문 편집 성공                           | retrospect_id                                                                                             |
| diary_edit_started            | 회고 완료 화면에서 직접 고치기 시작                              | retrospect_id                                                                                             |
| diary_edit_finished           | 직접 고치기를 마치고 읽기로 돌아감                               | retrospect_id, duration_ms, chars_delta                                                                   |
| wish_card_open_clicked        | 쉼터의 바람카드 보기 클릭                                        | source: rest                                                                                              |
| wish_card_viewed              | 선택 카드 데이터가 실제 표시됨                                   | wish_card_id, source: cards/trail                                                                         |
| wish_card_completion_changed  | 해봤어요/되돌리기 API 성공                                       | wish_card_id, completed                                                                                   |
| wish_card_deleted             | 바람카드 삭제 성공                                               | wish_card_id                                                                                              |
| sense_pond_step_completed     | 감각연못 한 단계의 목표를 채움                                   | step, duration_ms 외 2개 (아래)                                                                           |
| sense_pond_finished           | 감각연못 마지막 단계의 목표를 채움                               | duration_ms                                                                                               |
| sense_pond_exited             | 끝내지 않고 감각연못 화면을 떠남                                 | step, found, hold_cancels, duration_ms                                                                    |
| rest_recommendation_shown     | 일기를 쓴 날 쉼터에서 쉼 추천 시트가 올라옴                      | content, basis (아래)                                                                                     |
| rest_recommendation_accepted  | 추천 시트의 「해볼게요」 · 「오늘 추천」 칸을 누름               | content, basis, form: sheet/hint (아래)                                                                   |
| rest_content_opened           | 쉼 콘텐츠 화면을 엶                                              | content, entry, diary_today (아래)                                                                        |
| rest_content_completed        | 쉼 콘텐츠를 끝까지 함                                            | content, duration_ms                                                                                      |
| rest_content_exited           | 끝내지 않고 쉼 콘텐츠 화면을 떠남                                | content, stage, duration_ms                                                                               |
| wish_rules_agreed             | 소원 연못 이용 규칙에 동의                                       | 없음                                                                                                      |
| wish_joined                   | 소원 한 장을 꾸욱 눌러 같이 빎                                   | position(묶음 안 자리), author(user, baba)                                                                |
| wish_join_cancelled           | 다 채우기 전에 손을 뗌                                           | 없음                                                                                                      |
| wish_batch_finished           | 묶음의 마지막 장까지 넘김(묶음마다 한 번)                        | joined(그 묶음에서 같이 빈 수)                                                                            |
| wish_submitted                | 쓴 소원을 심사에 보냄                                            | chars                                                                                                     |
| wish_review_result            | 심사 결과를 받음                                                 | result(pass, edited, rejected, crisis, failed)                                                            |
| wish_posted                   | 소원을 연못에 띄움                                               | chars                                                                                                     |
| wish_deleted                  | 내 소원을 지움                                                   | 없음                                                                                                      |
| wish_reported                 | 소원을 신고함                                                    | 없음                                                                                                      |
| wish_report_undone            | 신고를 되돌림                                                    | 없음                                                                                                      |
| wish_followup_answered        | 지나간 소원에 답함                                               | outcome(came_true, not_yet)                                                                               |
| rest_guide_opened             | 쉼터의 「?」 원을 눌러 설명 카드를 다시 엶                       | content                                                                                                   |
| rest_records_viewed           | 쉼터의 이용 기록 화면을 엶                                       | content                                                                                                   |
| worry_box_handed              | 걱정상자에 걱정을 맡김                                           | chars (글자 수만)                                                                                         |
| worry_box_choice_selected     | 걱정상자의 맡겨두기/흘려보내기 선택                              | choice: keep/release                                                                                      |
| treasure_box_tucked           | 오늘의 보물함에 보물을 담음                                      | chars (글자 수만)                                                                                         |
| meditation_started            | 3분 명상을 시작함                                                | concept (wave, forest, sunlight, rain, lantern)                                                           |
| meditation_ended              | 3분을 마쳤거나 「여기서 멈추기」를 누름                          | concept, reason (natural, user_stop), duration_ms (실제로 머문 시간), voice_enabled                       |
| meditation_audio_failed       | 음성을 불러오지 못함                                             | concept                                                                                                   |
| store_review_requested        | 쉼터를 「나아졌어요」로 마치고 나와 별점 창을 요청               | 없음 (창이 떴는지는 알 수 없음)                                                                           |
| inquiry_submitted             | 마이 「문의하기」에서 문의를 보냄                                | category: bug/suggestion/account/etc                                                                      |
| letter_entry_shown            | 홈에서 편지 목록을 받아 편지 아이콘의 점을 정함                  | has_unread                                                                                                |
| letter_opened                 | 바바의 편지를 엶(연 날짜 한 통만 · 넘겨 본 편지는 안 셈)         | source: notification/home_icon/diary_detail · status: ready/fallback/quiet · wait_ms · days_after: 0/1/2+ |
| letter_action_chosen          | 편지의 작은 일과 「언제」를 고름                                 | position · source: catalog/fallback · when: schedule/lunch/commute/bedtime/none · changed                 |
| letter_time_chosen            | 처음 일기 저장 뒤 편지 시각을 고름                               | time: 7:30/8:30/10:00/custom · notify                                                                     |
| letter_notification_scheduled | 편지 알림을 새로 예약                                            | kind: morning/action/unread_night                                                                         |
| report_week_selected          | 다른 주 선택                                                     | week_start                                                                                                |
| weekly_report_viewed          | 선택 주와 일치하는 리포트가 ready로 표시됨                       | week_start                                                                                                |
| logout_clicked                | 마이 로그아웃 클릭                                               | 없음                                                                                                      |
| logout_completed              | 기기의 로그인 상태를 비움                                        | 없음                                                                                                      |
| withdrawal_opened             | 탈퇴 확인 시트 열기                                              | 없음                                                                                                      |
| withdrawal_cancelled          | 제출 중이 아닐 때 시트를 닫음                                    | 없음                                                                                                      |
| withdrawal_submitted          | 탈퇴 중복 실행 가드를 통과해 요청 시작                           | 없음                                                                                                      |
| withdrawal_completed          | 서버 계정 삭제 성공 응답                                         | 없음                                                                                                      |
| withdrawal_failed             | 서버 계정 삭제 실패 응답                                         | 없음                                                                                                      |

화면명은 login, home, archive, rest, report, my, onboarding, schedule_new,
schedule_detail, retro_talk, retro_draft, retro_confirm, retro_done, diary_detail,
wish_cards, wish_card_trail, sense_pond, body_release, worry_box, worry_list, treasure_box, meditation, wish_pond, wish_mine, treasure_list, rest_records, profile 및 고정 프로필 편집 화면명이다.
온보딩 단계명은 welcome, nickname, age, gender, interests, rest, retroTime, calendar, done이다.
retroTime 단계에서는 진행 여부와 알림 권한 허용 여부(notify_permission_result)를 알 수 있다.
설정 시각·예약 성공은 수집하지 않는다. 마이 M2 에서는 꺼진 알림을 켤 때 묻는 결과만 남는다.

**체류 시간**(screen_left · onboarding_step_left)은 앱이 전면에 있던 **구간마다** 한 번씩 보낸다.
화면을 떠나면 exit=navigate, 백그라운드로 가면 그때까지를 exit=background 로 보내고 멈춘다. 돌아오면
같은 화면을 처음부터 다시 잰다. 모아 두었다가 떠날 때 보내면 백그라운드에서 종료될 때 통째로 잃기
때문이다. 그래서 한 방문이 여러 구간으로 갈릴 수 있으므로, 화면별 체류는 세션 안에서 합친 뒤 본다.
iOS 의 inactive(알림 센터 등)는 끊지 않는다. 화면을 켜 둔 채 손을 뗀 시간은 가를 수 없으므로
분석에서는 상한(예: 10분)을 두고 넘는 구간을 따로 센다. 온보딩은 화면명이 하나라 단계로 보낸다.

**회고 턴 시간**(retrospect_turn_timed, 2026-09-28)은 턴마다 한 번, 서버 답이 온 뒤에 보낸다.
think_ms 는 질문이 화면에 선 때부터 첫 입력(첫 글자 또는 선택지 탭)까지, compose_ms 는 첫 입력부터
보내기까지, wait_ms 는 보낸 뒤 답이 오기까지다. 모두 전면 시계로 잰다. 생각이 길면 질문이 어렵고
쓰기가 길면 할 말이 많다 — 합치면 둘을 가를 수 없어 나눈다. input_chars 는 보낸 글자 수이고
선택지는 0 이다. 내용은 보내지 않는다. phase 는 사용자가 답하던 단계(diary_chat,
await_branch(2026-10-27 부터 사건 고르기), emotion_exploration, other)이고, turn_no 는 그 회고에서 성공한 턴의 순번이다. retrospect_exited 의
turn_no 는 나가기 전까지 성공한 턴 수다. voice_used 는 그 턴에서 음성 입력을 한 번이라도 켰는지다
(2026-09-29 · 선택지 턴은 늘 false).
⚠ 위기 안내 단계(safety_hold)는 **이름으로 보내지 않는다.** 정신 건강 상태를 추정할 수 있는 민감
정보라 외부 분석 도구로 내보내지 않고 other 에 섞는다.

**음성 입력**(2026-09-29)은 OS 음성 인식기를 쓰고, 인식한 글자는 입력창에 채울 뿐 보내지 않는다.
voice_input_started 는 인식기가 실제로 듣기 시작했을 때 보낸다(버튼을 누른 것만으로는 아니다).
voice_permission_result 는 팝업이 **실제로 떴을 때만** 보낸다. 이미 허용했거나 다시 물을 수 없는
상태(이때는 설정을 연다)는 보내지 않는다. voice_input_failed 의 code 는 인식기 오류를 넷으로 묶은
것이고(no_speech 는 말이 없었음 · unavailable 은 인식기나 한국어를 쓸 수 없음), 사용자가 멈춘 것은
실패로 세지 않는다. 인식된 글과 오류 원문은 보내지 않는다. 말로 답한 턴의 비율은
retrospect_turn_timed 의 voice_used 로 본다.

**reminder_opened** 는 우리가 예약한 알림을 눌러 앱을 열었을 때 한 번 보낸다. 앱이 꺼져 있다가
알림으로 켜진 경우도 센다. 알림을 받은 것만으로는 보내지 않는다(로컬 알림이라 도착을 알 수 없다).
2026-10-12 부터는 누른 뒤 그 알림이 부른 화면으로 간다 — 회고 알림은 오늘 일기가 있으면 그 일기,
없으면 회고(`/retro/confirm`)다. 그래서 바로 뒤의 screen_viewed 가 홈이 아닐 수 있다. 보내는 곳도
`features/my/ui/ReminderRoute` 로 옮겼다. weekly 는 같은 날 없앤 주간 알림이라 그 전 기록에만 있다.

감각연못의 step은 see, hear, feel이고, 시간은 모두 전면 시계로 잰다. sense_pond_step_completed는
step, duration_ms, longest_gap_ms, hold_cancels를 싣는다. duration_ms는 단계가 보인 때부터 목표를 채운
손짓까지, longest_gap_ms는 그 단계 안에서 단계 시작 또는 직전 손짓부터 다음 손짓까지 가장 길었던 간격이다.
간격이 고르면 천천히 둘러본 것이고, 한 번 길게 멈췄다가 몰아 누르면 어디를 눌러야 할지 몰랐던 것에
가깝다. hold_cancels는 감각 단계에서 잠시 누르기를 다 채우기 전에 손을 뗀 횟수이며 톡 단계에서는 0이다.
손짓마다 이벤트를 보내지 않는다. 바바가 건너가는 동안(1.3초)의 손짓과 목표를 넘긴 손짓은 화면처럼 세지 않는다.

2026-11-04 새 화면부터 `sense_pond_*` 는 「시작하기」를 누른 뒤의 일만 잰다. 시작 화면에서 나가면 sense_pond_exited 를
보내지 않고, 시작 화면에 머문 시간은 duration_ms 에 넣지 않는다. 한 번 누를 때마다 바바가 건너가는 1.3초가
더해지므로, 단계별 duration_ms 와 longest_gap_ms 는 이전 앱과 곧바로 비교하지 않고 앱 버전을 나눠서 본다.

**쉼 콘텐츠 공통 계측**(2026-10-05 · `rest_content_*`)은 모든 쉼 콘텐츠가 같이 쓴다 — 얼마나 들어오고,
얼마나 끝까지 가고, 못 끝내면 어디서 나가는지를 같은 이벤트로 보고 content(sense_pond, body_release,
worry_box, treasure_box, meditation, wish)로 가른다. 시간은 모두 전면 시계로 잰다.

- rest_content_opened 의 entry 는 쉼터에 **어떻게 들어왔나**다. 회고 완료 화면(retro_done)에서 쉼터
  묶음(쉼터 탭 · 바람카드 · 쉼 콘텐츠 · 그 안의 이용 기록과 지난 목록)으로 들어온 방문은 after_diary 이고(2026-10-12 부터 바람카드가 없는
  회고는 retro_done 을 거치지 않으므로 일기 확인 retro_draft 에서 곧장 온 방문도 after_diary 다), 그 묶음 안에서 옮겨 다니는
  동안 이어진다. 묶음 밖으로 나갔다 다시 들어오면 direct 다. diary_today 는 그 날(04:00 경계) 쓴 일기가
  이미 있는지다 — 일기를 쓰고 곧장 온 것(after_diary)과, 일기를 쓴 날 나중에 따로 온 것(direct · true)과,
  쉼터만 쓴 날(direct · false)을 가른다. 둘 다 화면에 들어온 순간의 값이다.
- rest_content_completed 는 끝까지 한 때 한 번이다 — 감각연못은 마지막 감각을 찾은 순간(sense_pond_finished
  와 같은 때), 몸에 힘 빼기는 네 부위를 다 한 순간, 걱정상자는 맡겨두기/흘려보내기를 고른 순간이다.
  오늘의 보물함은 보물함이 닫히는 연출이 끝난 순간이다(저장 성공 여부와 상관없이).
  소원 연꽃은 처음 같이 빌거나 소원을 띄운 순간이다. 3분 명상은 3분이 다 차거나 「여기서 멈추기」를 누른
  순간이다(meditation_ended 와 같은 때) — 일찍 멈춰도 같은 기분 쪽지로 가므로 끝까지 한 것으로 센다(이용 기록의
  completed 와 같은 기준 · 2026-11-05 사용자 결정). 3분을 채웠는지는 meditation_ended 의 reason 으로 가른다.
  끝까지 간 판은 떠나도 rest_content_exited 를 보내지 않는다.
- rest_content_exited 의 stage 는 **나간 자리**다. 감각연못 intro(시작 전)/see/hear/feel(2026-11-04 부터 시작 화면이 생겨 intro 가 있다. 그 전에는 들어오자마자 나가도 see 였으므로, 예전 see 와 비교할 때는 새 앱의 intro + see 를 합쳐 본다), 몸에 힘 빼기 intro(시작 전)/
  hands/shoulders/face/legs(하던 부위), 걱정상자 write(쓰다가)/handing(건네는 연출 중)/boxed(고르기 전),
  오늘의 보물함 write(쓰다가)/tucking(담는 연출 중), 3분 명상 ready(풍경 고르기 · 시작 전)/meditating(시작한 뒤
  마치기 전 — 시스템 뒤로가기 등), 소원 연꽃 pond(연못)/wish_card(소원 한 장)/rules(이용 규칙)/write(쓰다가)/confirm(띄우기 전 확인).
  화면이 닫힐 때 보내므로, 쉼 콘텐츠 화면에서 앱을 강제 종료하면 빠질 수 있다 — 그때는 screen_left
  (exit=background)의 마지막 화면으로 본다.
- 걱정상자는 쓴 걱정을 **계측으로 보내지 않는다.** worry_box_handed 는 글자 수(chars)만 싣는다. 걱정 원문은
  속성 허용 목록에 없다. 「잠시 맡겨둘게요」를 고른 걱정은 서버(`/api/v1/worries`)에 남지만 계측과는 무관하다.
- 오늘의 보물함은 쓴 보물을 서버에 저장하지만 **계측으로는 보내지 않는다.** treasure_box_tucked 는 글자
  수(chars)만 싣는다.
- 감각연못의 `sense_pond_*` 는 그대로 함께 보낸다(단계 시간 · 멈춘 간격 · 꾹 누르기).

**쉼 추천**(2026-10-12 · `rest_recommendation_*`)은 일기를 쓴 날 쉼터에 들어오면 0.6초 뒤 올라오는 시트다
(`features/rest/model/useRestRecommendation.ts`). 묻는 것은 「감정으로 고른 추천을 사람들이 해 보는가」다.

- shown 은 시트가 올라온 때 한 번이다. 하루 한 번만 뜨므로 사람 · 날 기준으로 센다. 닫은 수는 shown 에서
  accepted 를 뺀 것이라 이벤트를 따로 두지 않는다(✕ · 쓸어내리기 · 바깥 누르기를 가르지 않는다).
- basis 는 무엇으로 골랐나다 — emotion(오늘 일기의 첫 감정) · preference(온보딩 쉬는 방법이 함께 맞았거나,
  감정이 없어 쉬는 방법으로 고름) · random(둘 다 없어 그날의 무작위).
- form 은 어디서 눌렀나다 — sheet(시트의 「해볼게요」) · hint(세 번 연달아 닫은 뒤 시트 대신 2×2 칸에 붙는
  「오늘 추천」을 누름). hint 는 shown 을 보내지 않는다(조용히 붙어 있는 한 줄이라 「보였다」를 셀 수 없다).
- 추천을 따라 끝까지 했는지는 accepted → rest_content_opened → rest_content_completed 를 같은 content 로
  잇는다. 기분 답(「나아졌어요」)은 서버 이용 기록(`rest_records`)에만 있어 여기서는 완료율까지 본다.
- ⚠ **content 는 감정에서 나온 값이다** — 추천 쉼터로 그날의 첫 감정을 거슬러 짐작할 수 있다(감각연못 ←
  우울함 · 무기력). 알고 싣기로 했다(2026-10-12 · 사용자 결정). 감정 코드 · 이름 자체는 여전히 싣지 않는다.

**설명 카드**(2026-10-12 · `rest_guide_opened`)는 쉼터에 처음 들어가면 저절로 뜨고, 그 뒤로는 뒤로가기 원 옆
「?」 원으로 다시 여는 카드다(`features/rest/model/useRestGuide.ts` · `DESIGN.md` 「쉼 콘텐츠 공통 규칙」 7-2).
묻는 것은 「한 번 읽고도 다시 찾아보는 쉼터가 있나」다 — 많이 열리는 쉼터는 카드나 화면 안내가 모자라다는 뜻이다.

- **「?」를 누른 것만 보낸다.** 처음 저절로 뜬 것은 보내지 않는다 — 쉼터마다 rest_content_opened 의 그 사람 첫
  번째와 같아서 따로 셀 것이 없다(기기를 바꾸거나 다시 깔면 한 번 더 뜬다).
- 카드가 떠 있는 동안도 rest_content_* 의 시계는 그대로 간다 — 카드를 읽은 시간이 duration_ms 에 들어간다.

회고 실패 code는 invalid_request, already_today, session_not_found, unauthenticated,
network, server, malformed, unconfigured 중 하나다. 오류 원문/응답 본문은 전송하지 않는다.
캘린더 동기화는 자동으로도 실행된다. 해당 이벤트 수를 사용자의 클릭 수로 해석하지 않는다.
calendar_link_chosen의 choice는 link(연결하기), later(온보딩 「나중에 할게요」 또는 마이 시트 닫기),
settings(마이에서 기기 설정 열기)다. 권한 결과는 뒤따르는 calendar_permission_result로 보며,
2026-09-28부터 마이 「캘린더 연동」에서도 기록한다. 진입점별 연결률은 source로 가른다.
기기 설정에서 직접 켠 경우(choice=settings 뒤)는 iOS 가 설정 변경 때 앱을 종료시키므로
calendar_permission_result 가 남지 않는다. 다시 열린 마이가 기기 권한을 보고 서버의 캘린더 연동
값을 맞추므로, 이 경로의 최종 연결 여부는 DB(user_profiles.calendar_integration_enabled)로 본다.
일정 완료 이벤트도 저장 성공 횟수이며 서버의 상태 변경 이력에 대한 보장은 아니다.
2026-09-28부터 일정 완료에 source(manual/calendar)를 싣는다. 캘린더에서 온 일정이 실제로 체크되는지를
직접 넣은 일정과 비교한다.

2026-09-28 계측 보강:

- 온보딩 v2 단계명(2026-10-25): 로그인 전 start, feelings, blur, ruminate, blank, help, talk, diary, rest, report
  (schedule · letter 는 기능이 나오면 보인다) · 로그인 뒤 mood, why, day_end, diary_history, goal, reading, name, about,
  calendar, notify, research, now. 옛 welcome · nickname · age · gender · interests · retroTime · done 은 더 오지 않는다.
- onboarding_completed 의 is_reonboarding 은 **기존 사용자가 새 판을 다시 한 것**이다 — 새 가입자와 퍼널을 섞지 않는다.
  질문 답 · 목표는 **사용자 속성이 아니라 이 이벤트의 속성**으로 보낸다(답 묶음별 재방문은 「onboarding_completed 의
  day_end = X」로 시작 이벤트를 걸러 본다). 정본은 서버 `user_onboarding_responses` 다. goals 는 코드를 쉼표로 이은 문자열이다.
- onboarding_options_selected 는 고른 **개수만** 보낸다. 무엇을 골랐는지는 보내지 않는다. 기타 입력도 한 개로 센다.
- onboarding_submit_failed 의 code 는 invalid, unauthorized, no_session, network, server, malformed,
  unconfigured 중 하나이고, 서버가 받았는데 아직 온보딩이 필요하다고 답하면 still_required 다.
- calendar_sync_failed 는 기기 캘린더를 읽지 못했거나(unreadable) 서버로 보내지 못했을 때(failed)만 보낸다.
  권한이 없는 것(denied)은 캘린더를 잇지 않은 사람에게는 앱을 열 때마다 나오는 정상이라 세지 않는다.
  동기화는 앞으로 돌아올 때마다 돌아서 같은 실패가 되풀이되므로 앱 실행당 종류별로 한 번만 보내고,
  로그아웃하면 다시 센다.
- diary_edit_finished 의 duration_ms 는 전면 시계로 잰 고친 시간이고, chars_delta 는 고친 뒤 글자 수에서
  고치기 전 글자 수를 뺀 값이다(줄이면 음수). 본문은 보내지 않는다. 뒤로가기로 읽기로 돌아가도 같다.
  바람카드의 느낀 점 저장은 완료 변경으로 세지 않는다.

## 발표용 차트

| 질문                             | 차트 구성                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| 온보딩 어디서 이탈하는가?        | step별 viewed → completed의 고유 사용자 퍼널. 같은 전환 기간을 적용                   |
| 첫 회고까지 도달하는가?          | onboarding_completed → 사용자의 최초 retrospect_started → retrospect_completed        |
| AI 대화를 얼마나 쓰는가?         | retrospect_turn_succeeded의 고유 사용자/턴 수, retrospect_id별 분포                   |
| 어느 질문에서 오래 걸리는가?     | retrospect_turn_timed의 think_ms 중앙값을 phase·turn_no별로                           |
| 알림이 회고로 이어지는가?        | reminder_opened → 같은 날 retrospect_started 퍼널                                     |
| 회고 이후 카드로 이어지는가?     | retrospect_completed → wish_card_created → wish_card_viewed                           |
| 어떤 기능이 많이 쓰이는가?       | screen_viewed를 screen별 고유 사용자/이벤트 수로 구분                                 |
| 어느 화면에 오래 머무는가?       | screen_left를 세션 안에서 screen별로 합친 뒤 중앙값·p90                               |
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
- 쉼 콘텐츠는 화면이 있는 여섯(감각연못 · 몸에 힘 빼기 · 걱정상자 · 오늘의 보물함 · 3분 명상 · 소원 연꽃)을 `rest_content_*` 로 계측한다.
  쉼 추천의 content 는 감정에서 나온 값이다(위 「쉼 추천」 — 감정 코드 · 이름 대신 실은 유일한 파생값). 새 쉼 콘텐츠는 화면을 만들 때 `useRestContentAnalytics` 를 붙이고 content · stage 값을 더한다.
- 자동 수집/세션 리플레이를 쓰지 않는다. 이메일, 닉네임, SNS ID, 인증 토큰, 일기·일정·대화·바람 원문, 감정/욕구 코드·이름, 검색어, 알림 설정 시각은 속성 허용 목록에 없다. 알림은 권한 허용 여부와, 예약한 알림을 눌러 연 사실(종류만)만 보낸다.
- 신원 복원 전 이벤트는 최대 50개, SDK 초기화 전 작업은 최대 200개만 메모리에 둔다. 넘치는 이벤트는 버리되 신원 변경은 보존한다. SDK 초기화가 실패하면 그 실행의 analytics만 비활성화한다.
- SDK의 배치 전송/재시도를 사용한다. 서비스 DB에는 로그 테이블을 만들지 않는다. SDK는 기기에 전송 대기 이벤트와 임의 기기 ID를 저장할 수 있다.
- 같은 화면의 재렌더는 중복 조회가 아니다. 다시 들어오거나 다른 카드를 보면 새 조회다. 앱 복귀는 별도 이벤트다. 화면 체류는 screen_left 가 전면 구간마다 따로 보낸다(위 「체류 시간」).
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
7. 실제 전송 속성에 민감 원문·감정·알림 설정 시각이 없는지 확인하고, 테스트 계정을 발표 차트에서 제외한 뒤 릴리스 빌드를 배포한다.

SDK 설정 근거: [공식 React Native SDK 문서](https://amplitude.com/docs/sdks/analytics/react-native/react-native-sdk).
