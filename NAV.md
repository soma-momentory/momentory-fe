# NAV — 코드를 읽는 목차

**지금 있는 코드의 지도**다. 어디서부터 읽고, 무엇이 어디에 있는지만 적는다.
규칙은 [`CLAUDE.md`](CLAUDE.md) · [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md), 화면 스펙은 [`docs/spec/`](docs/spec/SNAPSHOT.md),
시각 값과 화면 흐름은 [`docs/DESIGN.md`](docs/DESIGN.md), 남은 일은 [`docs/TASKS.md`](docs/TASKS.md) 가 정본이다.

> ⚠ **이 파일은 `scripts/__tests__/navMap.test.ts` 가 지킨다** — `src/lib/` 에 파일을, `src/features/` ·
> `src/components/` 에 폴더를 새로 만들거나 라우트 수가 바뀌면 여기를 고치기 전까지 테스트가 깨진다.
> 설명이 틀려진 것은 테스트가 못 본다 — 동작을 바꾼 PR 이 이 파일의 그 줄도 고친다.

## 0. 처음 읽는 순서

| 순서 | 파일                                             | 무엇을 알게 되나                                                                                                                                                                                                             |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `app/_layout.tsx`                                | 라우트 설정(Stack · StatusBar)뿐이다. Provider 는 여기 두지 않는다                                                                                                                                                           |
| 2    | `src/lib/providers.tsx`                          | 앱 전체를 감싸는 것 — 폰트 · 안전 영역 · 토스트 · 계측 관찰 · 캘린더 화해 · 04:00 하루 넘김 · 알림 화해 · 배경음악                                                                                                           |
| 3    | `app/index.tsx`                                  | 진입 분기 — 세션 없음 → 소개(`intro/start`) · 최신 판 온보딩 전 → 소개(로그인 건너뜀) · 완료 → 홈. **완료 여부의 정본은 서버**(`GET /api/v1/users/me`). 서버에 못 물으면 「모른다」(`null`) — 스플래시가 3초마다 다시 묻는다 |
| 4    | `src/features/auth/model/auth.ts`                | 부트스트랩(hydrate · 가드 · fail-closed) · `syncMe`                                                                                                                                                                          |
| 5    | `app/(tabs)/_layout.tsx` → `app/(tabs)/home.tsx` | 탭 다섯. 홈은 `src/features/home/ui/v2/HomeV2View` 를 그린다                                                                                                                                                                 |
| 6    | 아무 도메인 하나 — 예: `src/features/diary/`     | 아래 「1. 한 바퀴」의 모양이 모든 도메인에서 같다                                                                                                                                                                            |

## 1. 한 바퀴 — 데이터가 흐르는 길

```
app/<라우트>.tsx                 화면 — 라우트 파라미터를 읽고 조립만 한다
  └ src/features/<도메인>/ui/    그 도메인 전용 화면 조각     ·  src/components/  여러 도메인이 쓰는 조각
  └ src/features/<도메인>/model/ Zustand store · 순수 계산 · 제품 규칙(숫자 · 글자 수 · 접기)
       └ src/features/<도메인>/data/   서버 어댑터(*Api.ts) — 응답 형태 검증 · 스키마 모양으로 변환
            └ src/lib/http.ts          인증이 필요한 서버 호출의 단일 통로 — 던지지 않고 { ok, error }
```

- **화면이 그리는 값은 서버에서 온 것뿐이다.** 목 데이터는 없다 — 테스트 재료는 `src/testing/fixtures.ts`(앱 코드가 import 하면 린터가 막는다).
- 시각 · 날짜는 `src/lib/clock.ts` 를 지난다(04:00 하루 경계 — 서버 `DayBoundary` 와 같다).
- 기기 경계(알림 · 캘린더 · 위치 · 소리 · 웹 문서 · 앱 복귀)는 `src/lib/` 의 단일 통로 하나씩을 지난다 — 아래 6.
- 색 · 크기 · 시간 값은 `src/design/` 에서 온다. `features/**` 는 `ui/` 를 빼고 `@/design/` 을 import 하지 않는다.
- 서버 계약은 [`docs/api/openapi.json`](docs/api/README.md)(반입 스냅샷 · `npm run sync:api`) — 어댑터 ↔ 엔드포인트 표는 `docs/api/README.md`.

## 2. 라우트 — `app/`

**라우트 57개** — 진입 2 · 소개 10 · 온보딩 12 · 탭 5 · 홈 시트 2 · 회고 5 · 편지 3 · 일기 1 · 쉼터 12 · 마이 5
(`_layout` · `+native-intent` · `__tests__` 제외 · Lab 의 `expo-lab/src/shell/routes.generated.ts` 와 같다).
화면 ID ↔ 라우트 매핑의 정본은 [`docs/PRODUCT.md`](docs/PRODUCT.md) 표다.

```
app/index.tsx (S0)  app/(auth)/login.tsx (S1)  app/+native-intent.ts(카카오 `oauth` 복귀 주소를 버린다)
app/intro/{start, feelings, blur, ruminate, blank, help, talk, diary, rest, report}.tsx
                  = 온보딩 v2 로그인 전 — 시작 · 문제 다섯 · 소개 넷. 인증 없이 열린다
app/(onboarding)/{_layout, mood, why, day-end, diary-history, goal, reading, name, about, calendar, notify, research, now}.tsx
                  = 온보딩 v2 로그인 뒤 — 순서 · 문구 · 기능 스위치는 `src/features/onboarding/model/flow.ts` 하나다.
                    다시 온보딩 판정은 서버 `onboardingVersion < latestOnboardingVersion`(`meApi.ts` `needsOnboarding`)
app/(tabs)/{_layout, home, rest, archive, report, my}.tsx
                  = 홈 · 쉼터(R1) · 보관함(A1 · A2) · 리포트(W1) · 마이(M1 + 알림 설정 시트)
                    탭바는 레이아웃이 아니라 화면이 그린다(`components/ds/TabScreen`) — 배경이 탭바 뒤까지 이어져서다.
                    탭은 루트 스택의 바닥이다 — `(tabs)/_layout` 이 들어올 때 그 아래(소개 · 로그인 · 온보딩)를 걷는다
app/home/{_layout, schedule/[id], schedule/new}.tsx
                  = 12-c · 12-e — 일정 보기 · 새 일정(투명 모달 시트)
app/retro/{_layout, confirm, talk, write, draft, done}.tsx
                  = 회고 채팅 v2 — confirm(C2) → talk(일기 작성 → 감정 탐색 · 무엇을 그릴지는 서버 `phase`) →
                    draft → done. write = 「직접 쓰기」(AI 세션 없이 빈 일기장 · 오늘 일정을 옆에 둔다)
app/letter/{_layout, index, [date], time}.tsx
                  = 바바의 편지 — 편지함 · 편지(좌우 넘기기 · 작은 일 고르기) · 처음 일기 뒤 편지 시각
app/diary/{_layout, [id]/index}.tsx
                  = 일기 상세(A3 · A3-c). 수정은 상세 안에서 한다
app/rest/{_layout, cards/index, sense-pond, worry-box, worries, treasure-box, treasures, body-release, meditation,
          weekly-happiness, wish, wish-mine, records}.tsx
                  = 날짜별 바람카드(R2) · 쉼 콘텐츠 일곱(감각연못 · 걱정상자 + 맡겨둔 걱정 · 보물함 + 지난 보물 ·
                    몸에 힘 빼기 · 3분 명상 · 주간 행복 · 소원 연꽃 + 내 소원) · 쉼터별 이용 기록(`?content=`)
app/my/{_layout, profile, nickname, age, gender, inquiry}.tsx
                  = 기본 정보 목록 + 항목별 수정 · 문의하기(`POST /api/v1/inquiries`).
                    ⚠ 코드 주석의 `M3`~`M8` 은 스펙 번호가 아니다 — 구현이 나눈 번호다
```

## 3. 도메인 — `src/features/`

모두 `model/`(store · 계산) · `data/`(서버 어댑터 · 기기 기억) · `ui/`(그 도메인 전용 조각) 모양이다.

```
src/features/auth/{model/auth.ts,
                   data/{kakaoSdk,kakaoAuthApi,appleSdk,appleAuthApi,googleSdk,googleAuthApi,
                         loginSession,reissueApi,logoutApi,meApi,withdrawApi}.ts}
                  ← 소셜 셋(카카오 · 애플 iOS 전용 · 구글) · 조용한 갱신(refresh 회전) · 로그아웃 · 탈퇴 ·
                    `GET /users/me`(온보딩 완료의 정본). 소셜 토큰은 서버로 한 번 보내고 버린다 —
                    SecureStore 에는 모멘토리 토큰만. loginSession = 셋의 공통 전송 · 응답 검증 · adoptSession.
                    애플은 nonce(해시는 애플 · 원문은 서버) · 탈퇴 revoke 는 `.p8` 대기.
                    구글은 nonce 가 없다(서버가 aud + azp 로 조인다) · 탈퇴 시 연결 해제는 앱이 한다
src/features/onboarding/{model/{flow,draft,completion,options,submit}.ts, data/{optionsApi,completeOnboardingApi}.ts}
                  ← 온보딩 v2 순서 · 문구(flow) · 답안 초안 · 완료 플래그 · 선택지(서버 코드를 그대로 든다) ·
                    서버 커밋(온보딩과 마이가 같은 PUT 을 지난다)
src/features/home/{model/{day,dayRollover,presentation,types,weather,useHomeWeather}.ts,
                   data/{scheduleApi,weatherApi,weatherIntroMemory}.ts, ui/v2/*, ui/*}
                  ← 홈 · 일정. **홈은 `ui/v2/HomeV2View`** — `ui/` 에 남은 것은 v2 가 함께 쓰는 일정 조각
                    (`ScheduleList` · `ScheduleItem` · `ScheduleEditBar` · `CheckBurst`)이다(옛 `HomeView` 계열은 2026-11-09 삭제).
                    day.ts 의 MAX_VISIBLE_SCHEDULES(5) 는 제품 규칙. dayRollover = 04:00 에 하루가 넘어갈 때 하는 일.
                    날씨 = `POST /api/v1/weather/current`(좌표는 본문에만) — 실패는 전부 「스티커 없음」
src/features/calendar/{model/*, data/{calendarSyncApi,syncStateStore}.ts}
                  ← 기기 캘린더 ↔ 서버 화해(`POST /schedules/sync`). 읽어 펴고(expand) 좁히고(normalize)
                    해시로 「보낼 것이 있나」를 판정한다. 언제 도는지는 `model/foregroundSync.ts` 하나가 안다
src/features/retro/{model/retro.ts, data/retroApi.ts,
                    ui/{RetroBaba,RetroBabaPeek,RetroDiaryBackground,RetroMethodChoices,
                        RetroStickerChoices,RetroScheduleSticker}.tsx}
                  ← **대화는 서버가 주도한다** — store 는 세션 id · 버블 · 서버의 마지막 응답 · 완료 시 일기와 바람카드만
src/features/diary/{model/{diary,types,selectors,deleteToast,useDiaryWeather}.ts, data/{diaryApi,diaryWeather}.ts}
                  ← 일기 + 바람카드(ActionCard) — 월별 목록 · 수정 · 삭제 · 카드 완료 · `GET /diaries/all`(전체 날짜).
                    deleteToast = 일기 · 바람카드가 같은 삭제 문안을 쓴다. diaryWeather = 오늘 일기에 날씨를 남긴다
src/features/emotion/model/emotion.ts
                  ← **감정 10종의 도메인 정본** — id · 이름 · EmotionId. 색은 두지 않는다(디자인 몫).
                    번호는 서버 enum 두 벌과 맞물린다 — retro `EMOTION_KEYS`(소문자) · home `SCHEDULE_EMOTIONS`(대문자).
                    ⚠ 일정 enum 은 아직 `ANGRY_FRUSTRATED` 하나라 9 · 10 이 같은 코드다
src/features/letter/{model/{letter,actionReminder}.ts, data/letterApi.ts, ui/{LetterPaper,LetterPreviewCard}.tsx}
                  ← 바바의 편지(`/api/v1/letters`) · 작은 일 고르기와 그 알림 한 번(고른 순간 예약)
src/features/archive/{model/{archive,monthSchedules}.ts, ui/ArchiveView.tsx}
                  ← 보관함 — 세는 것만. 연속 일수를 세지 않는다
src/features/report/{model/{report,weeklyBook}.ts, data/{weeklyBookApi,hintMemory}.ts, ui/book/*}
                  ← 주간 리포트 공책 — `GET /api/v2/reports/weekly` 한 번이 표지 · 안쪽 장 · AI 글을 한 벌로 준다.
                    화면은 **아무것도 세지 않는다**. 끝난 주만 열고, 일기 3일 미만인 주는 표지 한 장.
                    ui/book/{WeeklyBookView, Notebook, BookPages, parts, NotebookPickerSheet}.tsx.
                    report.ts 에 남은 것은 홈의 이번 주 감정 줄 계산뿐
src/features/rest/{model/{cards,contents,recommend,restRecord,restGuide,sensePond,worryBox,treasureBox,
                           bodyRelease,meditation,meditationAudio,weeklyHappiness,wish}.ts + use*.ts,
                   data/{treasureApi,worryApi,wishApi,weeklyHappinessApi,restRecordApi,storeReview,recommendMemory,
                         guideMemory,deviceStorage}.ts, ui/RestHubView.tsx}
                  ← 쉼터 — 바람카드 · 쉼 콘텐츠 일곱(목록 정본 `contents.ts`) · 쉼 추천 · 이용 기록 · 콘텐츠별 진행.
                    서버에 남는 것: 보물 · 맡겨둔 걱정 · 소원(심사 뒤 띄운다) · 주간 행복(이번 주만 쓴다) · 이용 기록.
                    storeReview = 별점 창(「나아졌어요」로 마칠 때 · 120일 간격).
                    deviceStorage = AsyncStorage 를 부르는 **기기 기억의 단일 통로**(앱 전체가 이걸 지난다)
src/features/music/{model/{tracks,music,musicPlayer}.ts, data/musicMemory.ts, ui/MusicDialog.tsx}
                  ← 홈 배경음악 — store 는 고른 곡과 재생 중인가 둘. 소리는 `providers.tsx` 에 건 musicPlayer 가 낸다
src/features/my/{model/{settings,reminders,basicInfo,calendarLink,recordedDays}.ts, data/inquiryApi.ts,
                 ui/{MyMainView,ReminderRoute}.tsx}
                  ← 알림 · 프로필 설정 · 설정 ↔ OS 예약 화해 · 기본 정보(한 항목만 고쳐도 통째로 보낸다 — 덮어쓰는 PUT) ·
                    캘린더 잇기 · 문의 · 「일기 N일 기록」(전체 기간). ReminderRoute = 알림을 누르면 부른 화면으로 옮긴다
src/features/analytics/{index,client,amplitude,events,observation,activeClock,restContent,sensePond,
                        useRestContentAnalytics,useSensePondAnalytics,AnalyticsObserver,AnalyticsResource}.tsx
                  ← **계측의 단일 통로**(Amplitude). 키가 비면 꺼진다 · 개발 빌드는 기본 차단.
                    본문 · 감정 · 이름을 보내지 않는다 — 허용 목록을 타입과 런타임 둘로 막는다(`events.ts`).
                    사전은 `docs/ANALYTICS.md`
```

## 4. 공용 UI — `src/components/`

```
src/components/ds/                ← **공용 컴포넌트.** 새 화면은 여기서 조립한다(`index.ts`)
  Text Screen GridBackground Button IconButton SocialButton Card TextField SearchField
  Chip ChoiceGrid ListCell SectionHeader TopNavigation BottomNavigation TabScreen
  BottomSheet Modal Menu Toast ToastHost Spinner Slider WheelPicker Calendar
  ViewSwitcher SelectLift EmotionDot EmotionPebble EmotionSticker WeekEmptyDot
  ChatBubble ChatDock ChatScaffold MaskingTape NotchedTapeLabel TabPaperBackground DesignViewport
  PaperGroup(+ PaperRow — 마이의 종이 묶음 · 기본 정보 · 온보딩 입력) TimeSheet(마이 · 온보딩 알림 시각 휠 시트)
  (+ voiceInput · scrollLock · singleLineInput · columnWidth — 컴포넌트가 아닌 도우미)
  icons/{Icon.tsx, paths.ts, GoogleMark.tsx}
                                  ← 아이콘은 Wanted 세트를 그대로 옮긴 것 — 없는 글리프를 만들지 않는다.
                                    WheelPicker 는 자체 3열 구현(외부 피커 모듈 없음).
                                    voiceInput = 회고 음성 입력(OS 인식기 · expo-speech-recognition)
src/components/onboarding/{OnboardingParts, IntroScreen, IntroArt, QuestionScreen, QuickReplies}.tsx
                          + startQuestions.ts
                                  ← 온보딩 v2 껍데기 · 그림. QuickReplies 는 마이 성별 편집도 쓴다.
                                    주 버튼은 홈의 천 라벨(`features/home/ui/v2/HeroCard` 의 `ReflectionButton`)을 빌려 쓴다
src/components/my/BasicInfoEditor.tsx  ← 기본 정보 수정 화면들이 공유하는 껍데기(상단바 · 저장 · 실패 한 줄)
src/components/archive/{DayScheduleList, DiaryPreviewCard, EmotionFilter}.tsx
src/components/diary/{ActionCardSection, WishCardFields, DiaryPaper,
                      WeatherCredit}.tsx + diaryPhotos.ts
                                  ← WishCardFields = 쉼터(R2)와 일기 상세가 같은 항목 · 같은 말로 바람카드를 그린다.
                                    DiaryPaper = 회고 · 직접 쓰기 · 일기 상세의 줄 공책
src/components/weather/{WeatherIntroSheet, WeatherCreditSheet}.tsx   ← 날씨 첫 안내 · 출처 시트
src/components/entry/{SplashLoader, SplashLogo}.tsx  src/components/RouteStatusBar.tsx
src/components/rest/{RestActionCard, RestPaperSheet, RestCardPressable, RestPolaroid,
                      RestRecommendSheet, RestThemeCard, RestThemeGrid, RestWishPreview}.tsx + restThemes.ts
                    + {pond, scene, worry, treasure, body, meditation, weekly, wish}/
                                  ← 쉼 콘텐츠마다 장면 조각 폴더 하나. scene/ 은 공통(상단 단추 · 설명 카드 ·
                                    나갈 때 기분 쪽지 `MoodExit`). 판정은 그리지 않는다(model 몫)
```

## 5. 디자인 값 — `src/design/`

```
src/design/ds/{color,typography,metrics,index}.ts + 화면별 값 파일(pond · homeV2 · diaryPaper · reportBook … 20여 개)
                                  ← **토큰 정본 — hex 는 여기만 든다**(린터가 밖을 막는다). 다크 없음.
                                    대비 보정 값은 `__tests__/contrast.test.ts` 가 고정한다(`color.ts` 머리말)
src/design/tabBackgrounds.ts      ← 탭 종이 배경 매핑
src/design/{studioDesign.ts, studioApproved.json}
                                  ← 홈 v2 · 쉼터 · 보관함 · 마이가 읽는 승인된 장식 값 · 그림 표(Expo Lab 과 함께 쓴다)
```

## 6. 단일 통로 — `src/lib/`

그 일을 하는 곳은 **여기 하나다.** 새로 같은 일을 하는 코드를 만들지 않는다. 대부분 던지지 않는다.

| 파일                       | 무엇                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/lib/providers.tsx`    | Provider 스택 — 앱 전체를 감싸는 것은 여기만 고친다                                                    |
| `src/lib/http.ts`          | 인증이 필요한 서버 호출 — Bearer 주입 · 타임아웃 · 안전 파싱 · `{ ok, error }`. 형태 검증은 `data/` 몫 |
| `src/lib/config.ts`        | 서버 주소 · 앱 키(`.env` → `app.config.ts` extra). 화면 · 어댑터에 주소를 적지 않는다                  |
| `src/lib/clock.ts`         | 시각 — SystemClock(04:00 하루 경계) · fixedClock(테스트)                                               |
| `src/lib/day.ts`           | 날짜 표기(계산은 clock.ts)                                                                             |
| `src/lib/time.ts`          | `"21:30"` ↔ `"밤 9:30"`                                                                                |
| `src/lib/dayChange.ts`     | 하루가 넘어간 순간(04:00) — `onDayChange`. 타이머 + 복귀 둘 다로 잡는다. 날짜는 들고 있지 않다         |
| `src/lib/appState.ts`      | 앱이 앞으로 돌아온 순간 — `onForeground`                                                               |
| `src/lib/notifications.ts` | OS 알림 — 권한 · 예약 화해. 문안을 모른다 · 배지 숫자 없음 · 전부 로컬 알림                            |
| `src/lib/calendar.ts`      | 기기 캘린더 — 권한 · 범위 조회 · externalId 정규화. 읽기만 한다. 플랫폼 차이는 여기서만                |
| `src/lib/location.ts`      | 기기 위치(`expo-location` · 사용 중에만) — 좌표는 소수 둘째 자리까지 · 로그에 남기지 않는다            |
| `src/lib/audio.ts`         | 소리(`expo-audio`) — 명상 음성 · 배경음악                                                              |
| `src/lib/audioClaim.ts`    | 「지금은 내가 소리를 쓴다」 표시 — 명상 · 마이크가 쓰면 배경음악이 비켜 선다                           |
| `src/lib/toast.ts`         | 토스트 — 끝난 일을 알리는 한 줄. `components/ds/ToastHost` 가 그린다. 문안을 모른다 · 큐 없음          |
| `src/lib/links.ts`         | 앱 밖 웹 문서(약관 · 개인정보 처리방침) — 주소는 여기 하나 · 앱 안 브라우저로 연다                     |
| `src/lib/keepWords.ts`     | 한글을 어절 단위로만 줄바꿈(단어 결합 문자) — 공용 `Text` 가 모든 글자에 건다 · 두 번 걸어도 같다      |

## 7. 그 밖의 폴더

| 어디                                 | 무엇                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins/`                           | Expo config plugin — 개발 서버 평문 HTTP 예외 · 릴리스 서명(+ 출시 빌드 API 주소 검사) · 투명 내비게이션 바 · 출시 빌드에서 dev launcher 네트워크 · 오버레이 권한 제거                       |
| `app.config.ts`                      | 앱 이름 · 버전 · 권한 · 플러그인. `ios/` `android/` 는 여기서 `npx expo prebuild` 로 만든다(직접 고치지 않음)                                                                                |
| `expo-lab/`                          | Expo Lab — 웹에서 실제 앱 전 화면을 가짜 서버로 띄운다(`npm run lab:web`). 앱 → Lab import 금지                                                                                              |
| `scripts/`                           | `sync-api.mjs`(계약 재반입) · `check-ios-release-plist.mjs`(출시 prebuild 뒤 iOS 권한 문구 검사) · `screen-sweep.sh`(화면 크기 훑기) · `keyout-*.py` `make-*.py`(자산 만들기 · 빌드에 안 낌) |
| `.claude/hooks/` · `.claude/skills/` | Claude Code 훅(보호 경로 · 저장 후 서식 · Stop 게이트 + Codex 리뷰) · 검수 스킬. `.agents/skills/` 가 Codex 사본                                                                             |
| `harness/`                           | 작업 하네스 — `tasks/` 의 Task 를 `node harness/run.mjs` 로 돌린다(`harness/README.md` · `docs/HARNESS_NAV.md`)                                                                              |
| `docs/api/openapi.json`              | 서버 계약 스냅샷 — 직접 고치지 않는다                                                                                                                                                        |
| `assets/`                            | 폰트 · 일러스트 · 소리. 폴더마다 README 가 출처를 적는다                                                                                                                                     |

## 8. 의존성 — 구조를 이해하는 데 필요한 것만

설치 여부와 버전의 정본은 [`package.json`](package.json) 이다. 네이티브 모듈이 섞여 있어 **dev client** 로 돌린다(Expo Go 미지원).

- 골격 — expo-router · **Zustand** · react-native-svg · expo-image · expo-font(교보손글씨 하나)
- 로그인 — `@react-native-seoul/kakao-login` · `expo-apple-authentication` + `expo-crypto` · `@react-native-google-signin/google-signin`
- 기기 — expo-secure-store(토큰) · expo-notifications · expo-calendar · expo-location · expo-audio ·
  expo-speech-recognition · expo-web-browser · expo-store-review
- 계측 — `@amplitude/analytics-react-native` + AsyncStorage(앱 코드는 `deviceStorage.ts` 를 지난다)
- **아직 없는 것**: TanStack Query · MMKV · Reanimated · MSW — 도입 시점은 `docs/ARCHITECTURE.md` §1

## 9. 문서 — 무엇이 어디에 있나

| 문서                                                                                                      | 정본인 것                                                             |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md) · [`AGENTS.md`](AGENTS.md)                                                       | AI 도구가 지킬 규칙 · 작업 방식 · 스킬                                |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md)                                                            | 커밋 · 브랜치 · PR · 품질 게이트 · 시크릿 · 의존성 · 생성물           |
| [`docs/spec/`](docs/spec/SNAPSHOT.md)                                                                     | 상류 스펙 동결 스냅샷(`RULES.md` 1순위 · 상태 기계 · 스키마 · 화면별) |
| [`docs/DESIGN.md`](docs/DESIGN.md)                                                                        | 디자인 SSOT — 스펙과 부딪히면 문안까지 이긴다                         |
| [`docs/PRODUCT.md`](docs/PRODUCT.md)                                                                      | 화면 ID ↔ 라우트 · 「상류와 차이」                                    |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)                                                            | 기술 설계 · 도입 예정                                                 |
| [`docs/TASKS.md`](docs/TASKS.md)                                                                          | 남은 일                                                               |
| [`docs/DISCUSSION.md`](docs/DISCUSSION.md)                                                                | BE 와 열린 안건                                                       |
| [`docs/api/README.md`](docs/api/README.md)                                                                | 어댑터 ↔ 엔드포인트 · 오류 코드                                       |
| [`docs/ANALYTICS.md`](docs/ANALYTICS.md)                                                                  | 이벤트 사전                                                           |
| [`docs/DATA-SECURITY.md`](docs/DATA-SECURITY.md) · [`docs/PLAY-DATA-SAFETY.md`](docs/PLAY-DATA-SAFETY.md) | 기기 저장 · 전송 데이터 · 스토어 데이터 안전 답변                     |
| [`docs/SETUP.md`](docs/SETUP.md)                                                                          | 개발 환경 · 빌드 · 출시 이력                                          |
| [`expo-lab/README.md`](expo-lab/README.md) · [`HANDOFF.md`](expo-lab/HANDOFF.md)                          | Lab 사용법 · Lab 에서 맡긴 작업의 AI 절차                             |
| `PLAN.md` · `docs/redesign/` · `tasks/` · `work-items/` · `docs/archive/`                                 | **기록** — 그때의 계획 · 결정. 지금 코드의 정본이 아니다              |
