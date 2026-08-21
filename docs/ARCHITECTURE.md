# momentory-fe 설계

> 범위: **MVP 40화면** (2026-08-06 상류 v2 개정) · 기준 문서는 [`docs/spec/`](spec/SNAPSHOT.md) 3종 —
> [`momentory.states.mvp.json`](spec/momentory.states.mvp.json)(상태 기계 7개) ·
> [`momentory.schema.mvp.json`](spec/momentory.schema.mvp.json)(엔티티 7개) ·
> [`momentory.css`](spec/momentory.css)(값)
> 전체 설계(136화면)는 상류 `01_화면설계/` 에만 있고, 쉼터를 되살릴 때 돌아온다(담당자 경유).
> **MVP가 원본을 대체하지 않는다.**

## 0. 무엇을 만드는가

| 파트   | 화면                                                                     | 장수 |
| ------ | ------------------------------------------------------------------------ | ---- |
| 진입   | `S0` `S1`                                                                | 2    |
| 온보딩 | `03` `04` `05-b` `06` `06-b` `06-c` `07` `08` `09` `10` `10-b`           | 11   |
| 홈     | `12-b` `12` `12-e` `12-c` `12-d`                                         | 5    |
| 회고   | `C1` `C2` `C3` `C4` `C4-b` `C4-c` `C4-c2` `C4-d` `C4-e` `C6` `C6-b` `C7` | 12   |
| 보관함 | `A1` `A2` `A3` `A3-b` `A3-c` `A4`                                        | 6    |
| 리포트 | `W1`                                                                     | 1    |
| 마이   | `M1` `M2` `M3`                                                           | 3    |

하단 탭 **4칸** — 홈 · 보관함 · 리포트 · 마이 (쉼터 없음).

**개발 단위는 화면이 아니라 컴포넌트다** ([`docs/spec/COMPONENTS.md`](spec/COMPONENTS.md) — ⚠ 값은 원본 기준, 배너 참조).
온보딩 채팅 컴포넌트군 = 회고 채팅과 같은 틀 — 한 번 만들면 앱의 두 축을 다 덮는다.

---

## 1. 기술 스택

> **이 절은 두 부분이다** — 아래 표는 **지금 `package.json` 에 있는 것**이고, 그 다음 표는 **아직 없는 것**이다.
> 섞어 적으면 새로 온 사람이 `import { useQuery }` 를 쓰고 나서야 없다는 걸 안다.

### 지금 쓰는 것

| 영역            | 선택                                               | 이유                                                                                                                                                                            |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 런타임          | **Expo SDK 57** + Dev Client + CNG                 | 카카오/애플/구글 로그인·캘린더·알림·생체인증이 전부 config plugin으로 해결된다. `ios/` `android/` 는 커밋하지 않고 `expo prebuild` 로 생성(CNG) — 네이티브 수정은 plugin 으로만 |
| 언어            | TypeScript 6 `strict` + `noUncheckedIndexedAccess` | 상류 스키마를 타입으로 고정                                                                                                                                                     |
| 네비게이션      | **expo-router** (파일 기반)                        | `states.mvp.json` 의 machine → 라우트 그룹이 1:1. 회고 알림 → 딥링크가 공짜                                                                                                     |
| 스타일          | **StyleSheet + `theme` 객체**                      | 다크모드 없음(RULES: 크림 배경 유지), 토큰이 고정 상수 — 런타임 테마 엔진이 필요 없다. NativeWind/Tamagui 는 12.5px·자간 .145em 같은 값을 우회하게 만들어 오히려 손해           |
| 그라디언트      | **react-native-svg** `RadialGradient`              | `.scr` 은 radial. `expo-linear-gradient` 로는 못 그린다                                                                                                                         |
| 폰트            | expo-font + Pretendard 4 weight                    | 파일 이름으로 굵기 지정 (Android 는 `fontWeight` 로 OTF 굵기가 안 바뀐다)                                                                                                       |
| 품질            | ESLint 9 + Prettier + Jest + RNTL + GitHub Actions | CI 단계의 정본은 [`CONTRIBUTING.md` 「품질 게이트」](CONTRIBUTING.md)                                                                                                           |
| 보안 저장       | expo-secure-store                                  | M2-0 개발 세션과 인증 hydration. 읽기가 비동기라 진입 라우팅을 규정한다(§3)                                                                                                     |
| 클라이언트 상태 | Zustand (작게)                                     | 온보딩 초안 · 인증 판정 · 화면용 로컬 상태                                                                                                                                      |
| OS 시간 선택    | @react-native-community/datetimepicker             | `08` 회고 시간. 네이티브 모듈이라 dev client 재빌드 필요                                                                                                                        |
| OS 알림         | expo-notifications                                 | `08`·`M3` 의 로컬 알림(회고·낮·주간). 경계는 `lib/notifications.ts` 하나이고 무엇을 예약할지는 `features/my/model/reminders.ts` 가 정한다. 네이티브라 dev client 재빌드 필요    |

### 도입 예정 — 필요해지는 마일스톤에

아래 항목은 아직 설치하지 않았다. **쓸 화면이 생길 때 넣는다** — 미리 깔면 쓰지도 않는
의존성이 락파일에 굳는다.

| 영역            | 선택                    | 언제 | 왜 그때인가                                                                                                                                                                                       |
| --------------- | ----------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 애니메이션      | react-native-reanimated | M3   | 채팅 밀림 모션이 MVP 에 없음이 확인돼(`R-41`) 바텀시트·제스처가 필요한 시점으로 미뤘다 — [spec/OPEN-ISSUES-요약.md](spec/OPEN-ISSUES-요약.md)                                                     |
| 서버 상태       | TanStack Query v5       | M3-3 | ~~첫 API 호출~~ → **API 21개가 이미 붙었는데 안 넣었다.** 어댑터가 `lib/http.ts` 로 직접 부르고 store 가 상태를 든다. 실제로 필요해지는 것은 **아웃박스(persisted mutation)** 라 M3-3 으로 옮긴다 |
| ~~목 서버~~ MSW | **넣지 않는다**         | —    | ~~BE 미확정 구간을 화면 개발이 기다리지 않게~~ → **서버가 계약을 먼저 냈다**(§4). 붙일 엔드포인트가 이미 있어 목 서버를 거칠 이유가 없다                                                          |
| 로컬 저장       | react-native-mmkv       | M3   | 첫 로컬 쓰기. **데이터 보안 정책이 선행**(§4)                                                                                                                                                     |
| 계측            | 얇은 `track()` 파사드   | M3   | 이름 규칙은 확정(`R-05`) — 단 `reflection_*`→`retro_*` 통일(`R-38`)이 미결                                                                                                                        |
| 이미지          | expo-image              | M2   | 바바 아바타가 처음 나오는 온보딩                                                                                                                                                                  |
| E2E             | Maestro                 | M6   | 흐름이 다 연결된 뒤                                                                                                                                                                               |
| 배포            | EAS Build / Update      | M6   |                                                                                                                                                                                                   |

### 네이티브 기능 — dev client는 현재, 앱 기능은 M2 이후 도입 예정

`expo-dev-client` 는 M1부터 공식 개발 환경으로 사용한다. 아래 앱 기능 패키지는 **✅ 표시가
없으면 아직 설치하지 않았고**, 필요한 기능과 함께 추가한다. Expo Go 는 지원하지 않는다.

| 기능             | 패키지                                      | 비고                                                                                                                                                                                             |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 카카오 로그인 ✅ | `@react-native-seoul/kakao-login`           | **설치·연결 완료(2026-08-07).** Expo config plugin 필요 (prebuild)                                                                                                                               |
| 애플 로그인      | `expo-apple-authentication`                 | iOS 전용. 이름 비공개해도 온보딩 `04`에서 호칭을 받으므로 빈 이름 없음                                                                                                                           |
| 구글 로그인      | `@react-native-google-signin/google-signin` |                                                                                                                                                                                                  |
| 캘린더           | `expo-calendar`                             | **읽기 전용**. 직접 추가한 일정은 캘린더에 쓰지 않는다                                                                                                                                           |
| 알림 ✅          | `expo-notifications`                        | **설치·연결 완료(2026-08-11).** MVP는 전부 로컬 알림 — 회고 시각(매일) · 낮 리마인드 · 주간(일요일). 서버 푸시 없음이라 「새로운 소식」만 예약 대상이 아니다. 경계는 `lib/notifications.ts` 하나 |
| 앱 잠금          | `expo-local-authentication`                 | **토글을 켰으면 실제로 잠근다** — 게이트는 MVP에 포함. 커스텀 잠금 화면(`M5`)만 다음 마일스톤 (§8)                                                                                               |

---

## 2. 폴더 구조

**`app/` 은 저장소 루트다** — `src/app/` 이 아니다. expo-router 가 루트 `app/` 을 라우트 트리로 잡고,
`src/` 는 라우트가 아닌 코드만 담는다. 경계가 이름으로 드러난다.

### 지금 있는 것 (2026-08-07 · 정적 40화면 완료)

화면 ID 와 라우트 파일의 1:1 매핑은 [`PRODUCT.md`](PRODUCT.md) 표가 정본이다. 구조만 본다:

```
app/                         # 라우트만 — 로직을 두지 않는다
  _layout.tsx                # Stack · StatusBar (Provider 는 여기가 아니다)
  index.tsx                  # S0 진입 분기
  (auth)/login.tsx           # S1
  (onboarding)/              # 03~10-b (9파일 + _layout)
  (tabs)/                    # home archive report my + _layout (TabBar 4칸)
  home/                      # schedule/[id] schedule/new moment/new — 투명 모달 시트
  retro/                     # intro confirm emotion talk draft done + _layout — 회고 12장
  diary/[id]/                # index (A3·A3-b·A3-c) · edit (A4)
  my/                        # profile (M2) · notify (M3)
src/
  design/
    theme.ts                 # 생성물 — 직접 수정 금지 (§5)
    tokens.mvp.ts            # 상류 반영 전까지의 이름 매핑 (§5)
  components/
    primitives/              # ScreenBackground AppText AppButton Card InputRow ProgressDots BackChevron
    chat/                    # ChatLayout BabaBubble AnswerBubble Avatar TypingDots ChipFlow DirectionChip ChatInput
    common/                  # TabBar TabScreen EmotionPill EmotionGrid Sheet SegBar Toggle RetroNav
                             # DirectionSheet SectionLabel ConfirmCard
    onboarding/ my/ icons/   # OnboardingTopBar · SettingRow · LineIcons
    archive/ diary/ report/  # 화면 조각 — CalendarMonth · ActionCardSection · WeeklyEmotionGrid 등
  features/                  # 도메인별 — auth onboarding home retro diary archive report my
    <도메인>/model/          # 타입(types.ts)·store(Zustand)·selector
    <도메인>/data/           # 서버↔store 경계 — scheduleApi·diaryApi·retroApi·meApi 등
    <도메인>/ui/             # 화면 조각 (home/ScheduleRow)
  testing/fixtures.ts        # **테스트 전용** 고정값 — 앱 코드가 import 하면 린터가 막는다.
                             # 옆 mocks/sample.ts 자리다(2026-08-21 삭제 — 화면 값은 서버에서만 온다)
  lib/
    providers.tsx            # Provider 스택 — 늘릴 때 여기만 고친다
    clock.ts                 # 시각의 단일 공급자 — 04:00 하루 경계 · SampleClock (§4)
    day.ts  time.ts          # 날짜·시각 표기
```

**Provider 를 `app/_layout.tsx` 에 두지 않는다.** 축 A·B 두 사람이 같은 줄에서
부딪히기 때문이다(`TASKS.md` 「둘이 부딪히는 곳」). 삽입 순서와 그 이유는
`src/lib/providers.tsx` 주석에 있다 — **`GestureHandlerRootView` 가 최상단**이어야
하고(RNGH 요구), **`AuthGate` 가 최하단**이어야 한다(갱신에 Query 가 필요하고
라우트를 막아야 하므로).

### 목표 구조

**빈 폴더를 미리 만들지 않는다.** 아래는 화면이 생길 때 도달할 모양이지 지금 만들 것이 아니다 —
빈 껍데기가 먼저 있으면 어디에 뭐가 있는지가 아니라 어디가 비었는지를 먼저 읽게 된다.

```
app/                         # expo-router — 라우트만, 로직 없음
    _layout.tsx              # Stack · StatusBar (Provider 는 src/lib/providers.tsx)
    index.tsx                # S0 스플래시 = entry machine 의 route 판정
    (auth)/login.tsx         # S1
    (onboarding)/
      _layout.tsx            # Stack · ProgressDots · BackChevron
      welcome.tsx            # 03
      nickname.tsx           # 04
      profile.tsx            # 05-b
      interests.tsx          # 06 (+ 06-b·06-c 기타 입력은 같은 화면의 상태)
      rest.tsx               # 07 쉬는 방법 (v2 복원 · 필수·복수)
      retro-time.tsx         # 08
      calendar.tsx           # 09
      done.tsx               # 10 (+ 10-b 건너뛴 경우는 같은 화면의 변형)
    (tabs)/
      _layout.tsx            # TabBar 4칸
      home.tsx               # 12 / 12-b
      archive.tsx            # A1 / A2 (SegBar)
      report.tsx             # W1
      my.tsx                 # M1
    home/
      schedule/[id].tsx      # 12-c  (bottom sheet)
      schedule/new.tsx       # 12-e  (bottom sheet)
      moment/new.tsx         # 12-d  (bottom sheet)
    retro/                   # 전체화면 모달 스택 = retro machine
      intro.tsx  confirm.tsx  emotion.tsx  talk.tsx  draft.tsx  done.tsx
                             # talk = C4~C4-e (방향 시트 C4-c·C4-c2 는 talk 위의 하단 시트)
                             # draft = C6 / C6-b (일기 두 면)
    diary/[id]/
      index.tsx              # A3 / A3-b (SegBar) · A3-c 는 A3 의 행동-완료 상태
      edit.tsx               # A4
    my/
      profile.tsx            # M2
      notify.tsx             # M3

src/
  design/
    theme.ts                 # 생성물 — 02_디자인시스템/theme.ts 를 복사 (직접 수정 금지)
    tokens.mvp.ts            # MVP 전용 이름 매핑 — §5 참조
  components/                # COMPONENTS.md 인벤토리와 1:1
    primitives/              # AppText AppButton Card ScreenBackground InputRow ...
    chat/                    # ChatLayout BabaBubble AnswerBubble Avatar TypingDots ChipFlow
    common/                  # TabBar ScrollArea EmotionPill EmotionGrid Sheet SegBar ...
  features/
    auth/ onboarding/ home/ retro/ diary/ archive/ report/ my/
      api/ model/ data/ ui/  # 쿼리 훅 · 도메인 로직 · mock/API 경계 · 화면 조각
                             # 도메인 8종 전부 존재. mocks/ 는 data/(repository·adapter)만 읽고
                             # 화면·model 은 data/ 를 지난다 — api/ 는 BE 연결 때 data/ 안쪽을 대체
  lib/
    api/                     # 클라이언트 · 생성된 타입 · 오프라인 아웃박스
    analytics/               # track() 파사드 + 이벤트 상수
    clock.ts                 # 시각의 단일 공급자 — 04:00 하루 경계 (BE 전환 시 SystemClock 으로)
    day.ts                   # 날짜 표기
    a11y.ts                  # Reduce Motion 훅
  mocks/                     # MSW 핸들러 + 샘플 데이터(schema meta.sampleData)
```

---

## 3. 라우팅 = 상태 기계

`states.mvp.json` 의 `machines.<name>.states` 키 하나 = 라우트 하나. 전이는 `on` 그대로.

- **entry** — `S0` 에서 `max(0.8s, 준비완료)` 후 판정: 토큰 없음 → `(auth)/login` · 온보딩 미완료 → `(onboarding)` · 완료 → `(tabs)/home`.
  1.5초를 넘기면 `S0-b`(진행 바 + 대기 문구) — MVP 화면에는 없지만 규칙은 살아 있다.

  **인증 부트스트랩은 비동기다.** SecureStore 읽기는 동기가 아니므로 "첫 프레임에 판정"은 성립하지 않는다. 대신 명시적인 hydration 상태를 둔다:

  ```
  auth = 'hydrating' | 'anonymous' | 'authenticated'
  ```

  `hydrating` 동안 보이는 것이 곧 `S0` 다 — 스플래시의 0.8초 하한이 이 비동기 읽기를 이미 덮는다(하한이 있어서 깜빡임도 없다). 규칙:

  1. SecureStore 에서 토큰을 읽는다. **손상된 세션은 `anonymous`로 닫는다. 만료된
     access token 은 먼저 갱신을 시도하고**(`POST /api/v1/auth/reissue` ·
     `reissueApi.ts`), 갱신마저 실패해야 `anonymous`다 — 만료된 토큰으로 `(tabs)`에
     들어가 첫 401을 보고 튕겨 나오지 않는다.
  2. **MMKV 에 로그인 여부를 미러링하지 않는다.** 미러 플래그는 로그아웃·만료·저장소 오류 뒤에 남아 인증되지 않은 사용자를 인증된 트리로 보낸다. MMKV 가 갖는 것은 `onboardingCompleted` 같은 비민감 플래그뿐이고, 그것도 인증 이후에만 읽는다.
  3. **라우트 가드가 최종 권한을 갖는다.** `(onboarding)`에는 구현됐다. 홈을 연결할 때
     `(tabs)`에도 같은 가드를 두어 `auth !== 'authenticated'`이면 무조건 `(auth)/login`으로
     되돌린다 — 진입 판정 한 번으로 끝내지 않는다.
  4. **실패는 닫는 쪽으로 넘어진다.** SecureStore 읽기 오류·복호화 실패·갱신 실패는 전부 `anonymous` 다. 판단이 안 서면 로그인 화면이다.
  5. 로그아웃·계정 삭제는 SecureStore 토큰 · MMKV 캐시 · Query 캐시 · **아웃박스 큐**를 함께 비운다. 큐를 남기면 다음 사용자의 세션으로 이전 사용자의 쓰기가 재생된다.
     지금 실제로 비우는 것은 **SecureStore 세션 + 사용자에게 묶인 store 여섯**(온보딩
     초안·완료 플래그·회고 대화·일기·프로필·알림 설정)이고, 목록의 단일 지점은
     `auth.ts` 의 `clearUserScopedStores` 다. MMKV·Query 캐시·아웃박스는 도입 전이라
     비울 것이 없다 — 생기는 마일스톤에서 그 함수에 합류한다.

  현재 테스트로 고정한 경로: 만료 토큰 · **만료 후 갱신 성공/실패** · 동시 호출의 갱신
  중복 방지 · SecureStore 오류 · 로그아웃 후 재진입 · 앱 킬 후 콜드 스타트.

  **로그인 (M2-1 · 2026-08-07)** — `S1` 의 카카오 버튼이 실제 흐름에 닿았다:
  **카카오 SDK → `POST /api/v1/auth/kakao` → SecureStore** 세 단계이고, 경계는
  `features/auth/data/`(SDK 래퍼 · API) 와 `model/auth.ts`(판정·저장)로 갈라져 있다.

  1. **카카오 토큰은 앱 세션이 아니다.** 서버 교환 요청에 한 번 실려 나가고 버린다 —
     SecureStore 에 눕는 것은 서버가 준 모멘토리 access/refresh 뿐이다.
  2. **응답을 런타임에 검사한다.** 필드가 빠진 200 을 그대로 세션으로 만들면
     「반쯤 로그인된 상태」가 기기에 눕는다. 하나라도 어긋나면 로그인 실패다.
  3. **만료는 절대 시각으로 저장한다.** 서버가 주는 `accessTokenExpiresIn` 은 초 단위
     잔여 시간이라 그대로 두면 앱이 꺼져 있던 동안이 셈에서 빠진다.
  4. **다음 화면은 서버가 정한다** — `onboardingRequired` 가 온보딩과 홈을 가르고,
     로컬 완료 플래그도 그 답에 맞춰 덮는다(로컬이 정본이 아니다).
  5. **저장에 실패하면 로그인으로 치지 않는다.** 메모리에만 있는 세션은 앱을 끄면
     사라지고, 다음 부트에서 어차피 로그아웃이다 — 그 사실을 그 자리에서 말한다.
  6. **갱신 (2026-08-09)** — `refreshToken` 은 만료된 access token 을 조용히 새 쌍으로
     바꾸는 데 쓰인다(위 1번). **회전한다**(한 번 쓰면 서버가 폐기) — 동시 호출은
     `auth.ts` 의 `refreshInFlight` 로 합류해 재발급을 한 번만 보낸다. HTTPS 는 아직
     비었다(`DISCUSSION.md` §1-6).
  7. **로그아웃 (2026-08-10)** — `POST /api/v1/auth/logout` 이 **제출한 refresh token
     하나만 멱등적으로 폐기한다**(다른 기기는 살아 있다). 순서가 규칙이다: 세션을 읽어
     토큰을 든 뒤 → 로컬을 비우고 → `anonymous` 로 닫고 → **폐기는 기다리지 않고
     배웅한다.** 서버가 죽어 있어도 로그아웃은 끝난다 — **실패할 수 없는 동작**이라
     화면에 안내 한 줄조차 띄우지 않는다. `logoutApi.ts` 는 Bearer 를 쓰지 않으므로
     `lib/http.ts` 를 지나지 않는다(파일 주석에 근거 있음).

- **onboarding** — 질문 여섯: 닉네임(`04`) · 기본 정보(`05-b`) · 관심 분야(`06`, 기타 입력 `06-b`/`06-c`) · 쉬는 방법(`07`, 필수·복수 — 답은 `User.restMethods` 로 **저장만**, MVP 에 보여주는 화면은 없음) · 회고 시간(`08`) · 캘린더(`09`). 진행 점 6칸이 이 여섯을 가리킨다. 완료는 `10`, 캘린더·알림을 건너뛰면 `10-b`. 답은 화면마다 서버로 보내지 않고 Zustand 초안에 쌓는다. **현재는 메모리 전용**이라 앱을 종료하면 사라지고, 데이터 보안 정책과 MMKV 도입 뒤 중간 이탈 복원을 붙인다.
- **home** — 한 상태(`day`). `12-b`(빈 상태)는 별도 레이아웃이 아니라 **같은 카드가 초대로 바뀌는 변형**이므로 같은 컴포넌트의 prop.
- **retro** — 전체화면 모달 스택. `C7` 에서 홈으로 pop, `Diary` 생성. `diaryCount >= 7` 이면 `Report.unlocked`.
- **archive / report / my** — 탭 내부 스택.

`invariants` 배열의 각 문장은 테스트 파일로 옮긴다. 예:
"세 칸의 순서는 어떤 상태에서도 바뀌지 않는다" → 홈 렌더 스냅샷 순서 테스트.

---

## 4. 데이터 레이어

> **2026-08-10 — 이 절의 전제가 바뀌었다.** 아래 1~4 는 「BE 가 없으니 FE 가
> 계약을 먼저 제안한다」는 계획이었는데, **BE 가 계약을 먼저 냈다.** 실제로는
> `docs/api/openapi.json`(서버에서 반입 · `npm run sync:api`)이 정본이고
> `openapi-typescript`·MSW 는 도입하지 않았다 — 붙일 엔드포인트가 이미 있어
> 목 서버를 거칠 이유가 없었다. 기록으로 남긴다.

1. ~~`schema.mvp.json` 의 엔티티 7개 + `states.mvp.json` 의 `effect(s)` 를 그대로 옮겨 **OpenAPI 계약 초안**을 쓴다.~~ → 서버가 낸 것을 반입한다.
2. ~~`openapi-typescript` 로 타입을 생성 → `src/lib/api/schema.d.ts` (생성물).~~ → 어댑터가 손으로 쓴 DTO 타입 + **런타임 검증**을 든다. 생성 타입은 컴파일만 통과시킬 뿐 200 응답의 형태를 보장하지 않는다.
3. ~~**MSW 핸들러**가 그 계약을 구현한다.~~ → 도입하지 않았고, **샘플도 2026-08-21 에 지웠다.**
   **서버에서 오지 않는 화면은 리포트(`W1`)의 해석 문장뿐이다** — 주간 해석의
   엔드포인트가 계약에 없어서다([`DISCUSSION.md`](DISCUSSION.md) §1-3 · §1-8).
   그 자리는 샘플로 메우지 않고 **비워 둔다** — 지어낸 값을 화면에 두면 그것이 기록으로 남는다.
4. 계약이 어긋나면 그 차이가 곧 BE 팀과의 논의 항목이 된다 — [`DISCUSSION.md`](DISCUSSION.md) §1.

> **2026-08-21 — BE 코드와 스냅샷을 직접 대조했다** (BE `40da034`). `openapi.json` 은
> 서버와 정확히 같고(엔드포인트 26 · 스키마 41), **21개가 붙어 있다.** 어댑터 ↔
> 엔드포인트 표 · 오류 코드 표 · 경계가 갈리는 자리는 [`api/README.md`](api/README.md) 에 있다.

### 서버가 목록의 주인인 값은 **코드를 그대로 든다** (2026-08-10)

관심 분야·성별처럼 **선택지를 서버가 내려주는 값**(`GET /api/v1/onboarding/options`)은
`draft`·`useProfile` 이 **서버 코드 그대로** 든다 — `RELATIONSHIP` · `UNSPECIFIED`.
우리 id(`relations` · `none`)로 옮기지 않는다.

「화면은 서버 모양을 보지 않는다」는 원칙의 **예외이고, 근거가 있다**: 매핑표를 두면
**서버가 새로 넣은 코드에 옮길 이름이 없어 그 항목만 조용히 사라진다.** 사용자에게는
칩 하나가 안 보이는 것으로 끝나지 않는다 — `M2` 에서 저장을 누르는 순간, 화면이
읽지 못한 그 답이 지워진 채로 서버에 덮인다.

원칙이 지켜지는 자리는 그대로다. **값의 뜻을 아는 코드는 둘뿐**이고 둘 다
`features/onboarding/model/draft.ts` 에 있다 — `OTHER_INTEREST`(기타 입력 줄이
매인 칩) · `UNSPECIFIED_GENDER`(「선택 안 함」과 미선택 `null` 의 구분).
화면은 그 외의 코드를 문자열로 적지 않는다.

**적용 범위는 「서버가 목록을 주는 값」뿐이다.** 감정 9종처럼 디자인 토큰과 묶인
것(`theme.emotions`)은 여전히 FE 어휘를 쓴다.

### local-first 쓰기 — 아웃박스

스키마가 요구한다 — `Moment.syncState: local|uploading|synced`, "항상 기기에 먼저 저장하고 연결되면 올린다. **실패로 표시하지 않고 '올리는 중'**".

```
사용자 저장 → MMKV 즉시 반영 + optimistic update
           → 아웃박스 큐에 mutation 적재 (TanStack Query persisted mutation)
           → 온라인 복귀 시 자동 재생 · 실패해도 사용자에게 오류를 띄우지 않는다
```

**자동 재생에는 계약이 필요하다.** 서버가 커밋한 뒤 응답이 오기 전에 타임아웃이 나면 클라이언트는 성공 여부를 모르고 재시도한다 — 계약 없이 재생하면 일기·순간·일정이 **중복 생성**된다. 사용자에게 오류를 띄우지 않는 설계라 중복은 조용히 쌓인다. 아래를 **OpenAPI 계약에 먼저 넣고** 구현한다.

> ⛔ **2026-08-21 — 서버에 아래가 하나도 없다.** BE 전체에 `Idempotency-Key`·`If-Match`·
> `ETag` 를 읽는 자리가 없고, id 는 전부 서버 채번(`@GeneratedValue(IDENTITY)` · `Long`)이라
> **1번(클라이언트 ULID)부터 어긋난다.** 지금 붙어 있는 쓰기는 전부 화면이 기다리는 동기
> 호출이라 재시도를 사용자가 하고 있어 드러나지 않는다 — **아웃박스를 만드는 순간
> 실제 문제가 된다.** 그래서 M3-3 은 §1-1 의 답 없이 시작하지 않는다.

1. **ID 는 클라이언트가 만든다.** `conventions.id` 가 ULID 이고 ULID 는 클라이언트 생성이 가능하다. 서버가 채번하지 않으므로 생성 요청은 자연히 멱등해진다 — 같은 `id` 로 두 번 오면 두 번째는 기존 리소스를 그대로 돌려준다(201 대신 200).
2. **mutation 마다 `Idempotency-Key`.** 큐 항목이 만들어질 때 한 번 발급하고 재시도해도 **바꾸지 않는다**. 서버는 키별 결과를 최소 24시간 보관하고 재요청에 같은 응답을 돌려준다. 삭제·토글처럼 ID 만으로는 멱등하지 않은 동작이 이 키를 필요로 한다.
3. **엔티티 단위 순서 보장.** 큐는 전역 FIFO 가 아니라 `(entityType, entityId)` 별 직렬 처리다. 같은 일정의 "생성 → 마침 토글 → 감정 추가"가 뒤집히면 안 되고, 서로 다른 일정끼리는 막을 이유가 없다. 선행 항목이 실패하면 **같은 엔티티의 후속만** 보류한다.
4. **갱신은 선행조건을 건다.** `PATCH` 는 `If-Match: <version>`(또는 본문의 `expectedVersion`)을 보내고, 서버는 어긋나면 409 를 준다. 없으면 오래된 아웃박스 항목이 나중 편집을 덮어쓴다 — 특히 `A4` 일기 수정은 "고친 뒤 원문을 보관하지 않는다"는 규칙 때문에 덮어쓰면 복구가 불가능하다.
5. **충돌(409) 처리는 화면별로 정한다.**
   - `Diary.body`·`Moment.text` — 서버 값을 받아들이고 로컬 편집을 버리지 않는다. 다음 편집 화면 진입 시 로컬 초안을 그대로 보여준다(사용자 문장을 조용히 버리지 않는다).
   - `Schedule.done`·`Schedule.emotions` — 토글이므로 **서버 상태를 정답으로 삼고 재조회**한다. 마지막 의도만 남으면 된다.
   - 어느 경우에도 모달·경고 아이콘을 띄우지 않는다(규칙 5).
6. **재시도는 유한하다.** 지수 백오프 + 상한. 4xx(멱등/충돌 제외)는 재시도하지 않고 큐에서 내린다 — 무한 재시도 큐는 배터리와 서버를 같이 태운다. 내려간 항목은 로컬에 남겨두고 다음 앱 실행에서 한 번만 더 시도한다.
7. **큐는 계정에 묶인다.** 로그아웃 시 비운다(§3-5).

`Schedule` 편집도 동일. `source=calendar` 인 일정의 삭제는 `hidden=true` 만 켜고 캘린더 원본은 건드리지 않는다.
**서버도 그렇게 굳었다**(2026-08-21 확인): 캘린더 일정에 `DELETE`·`PATCH …/{id}` 를 부르면
`404` 이고, 숨기기는 `PATCH /api/v1/schedules/{id}/visibility` 전용 통로로 간다.

**테스트로 고정할 것**: 응답 유실 후 재생(중복 없음) · 같은 항목 3회 재생 · 같은 엔티티 순서 뒤집힘 · 동시 편집 409 · 로그아웃 시 큐 비움.

### 파생값

`diaryCount` · `recordedDays` · `emotionRecords` · `monthTopEmotion` · `monthChange` · `reportUnlock` —
**현재는 전부 FE 가 계산한다** (`features/{archive,report,my}/model/` 의 순수 함수 · 테스트로 고정).
같은 값이 여러 화면에 쓰이고 기간마다 다른 값이라 이중 계산은 어긋나기 쉽다는 우려가 근거다.
[`PRODUCT.md` 「상류와 차이」](PRODUCT.md) 3번 · [`DISCUSSION.md`](DISCUSSION.md) §1-3 · §1-8 에
결정 대기로 있다.

> **2026-08-21 — 서버에 집계 엔드포인트가 하나도 없다**(BE 코드 대조). 일기·행동 카드는
> **월별 목록**으로만 오고, 주간·전체 기간 집계도 리포트 잠금 판정도 계약에 없다.
> 그래서 **재결정은 「계약 확정 시」가 아니라 「BE 가 `W1`·`M1` 을 낼 때」**다.
> 지금 `reportUnlock`(일기 7편)이 FE 판정이라 **기기 간 어긋난다**는 것도 그대로다.

**시각은 `src/lib/clock.ts` 를 지난다** — 하루 경계 **04:00**, 샘플 하루(2026-07-27)의
`SampleClock` 이 기본값이고 BE·실제 날짜 전환 시 `SystemClock` 으로 바꾸는 곳이 이 한 파일이다.
`day.ts` 는 날짜 **표기**만 담당한다.

> ⚠ **서버의 하루는 04:00 이 아니라 KST 자정이다**(BE `TimeZonePolicy` · 2026-08-21 확인).
> 월 조회 창과 회고 「하루 한 번」 가드가 그 경계를 쓴다. 그래서 이 저장소 안에 경계가
> **둘** 있다 — `clock.ts` 의 04:00(앱-하루)과 `features/diary/data/diaryApi.ts` 의
> `kstDate`(서버에 맞춘 것). **월 묶음은 어긋나지 않고, 갈리는 것은 회고 가드 하나다**
> ([`DISCUSSION.md`](DISCUSSION.md) §1-9 · [`api/README.md`](api/README.md) 「경계가 갈리는 자리」).
> 새 날짜 계산을 더할 때 **어느 경계를 쓰는지 먼저 정한다.**

---

## 5. 디자인 시스템 연동

상류 `02_디자인시스템/theme.ts` 가 토큰 정본이고, FE 는 **복사본(`src/design/theme.ts`)을 커밋해서 쓴다**.
~~재생성(`npm run sync:theme`)은 상류 로컬 폴더를 가진 담당자 전용이다 —
절차와 검증은 [`docs/spec/SNAPSHOT.md`](spec/SNAPSHOT.md). `npm run check:theme` 는 상류 없이 돈다.~~
→ **둘 다 삭제됐다**(2026-08-20 · `PLAN.md` A-16). 토큰 정본은 `src/design/ds/` 하나이고
값·규칙의 SSOT 는 [`docs/DESIGN.md`](DESIGN.md) 다 — 상류 재반입은 전제하지 않는다.

색·크기·시간을 하드코딩하지 않는다. 어기면 ESLint 커스텀 룰(리터럴 hex 금지)이 잡는다.
값을 찾는 순서는 [`PRODUCT.md`](PRODUCT.md) — 화면 스펙 → [`spec/momentory.css`](spec/momentory.css) → (담당자 경유) 상류 도구.

### ⚠ 지금 있는 토큰 불일치 (상류 확인 필요)

MVP 리팩토링본 `momentory.css` 에는 있는데 `lib.mjs` → `theme.ts` 에는 **아직 없는** 값들:

| 토큰                                                                                    | css 값                                      | theme.ts                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--textStrong` `--textBody` `--textCaption` `--textLegal` `--textAccent` `--textOnDark` | 글자색 6종 체계                             | 다른 이름 체계(`textPrimary`/`textMuted`/`textSlogan`/`textLegalInk`)                                                                                                 |
| `--primaryDeepPress`                                                                    | `#9E5626`                                   | 없음                                                                                                                                                                  |
| ~~`--dangerInk`~~                                                                       | `#9B3B2F`                                   | ✅ **해결됨 (2026-08-05 · `R-40`)** — `lib.mjs` 등록 완료, `theme.ts` 에 `colors.dangerInk` 로 나온다. 오버라이드 불필요. **글자·테두리 전용이고 면을 채우지 않는다** |
| `.scr` 배경                                                                             | `120% 90% at 50% 18%` (S0·S1 만 구 값 유지) | `gradients.screen` 은 구 값만                                                                                                                                         |

**대응**: 상류 `lib.mjs` 에 위 값이 반영되는 것이 정공법이다(담당자가 상류에 요청 —
[`PRODUCT.md` 「상류와 차이」](PRODUCT.md) #1). 그때까지 FE 는 `src/design/tokens.mvp.ts` 에
오버라이드를 모아 두고, 반영되면 그 파일을 지운다. (오버라이드를 화면 코드에 흩지 않는다.)

### 자산

- **Pretendard 4 weight 는 `assets/fonts/` 에 커밋돼 있다** — 출처·해시·라이선스는
  [`assets/fonts/README.md`](../assets/fonts/README.md).
- 바바 이미지는 상류 `04_자산/캐릭터/` 에서 필요한 것만 가져온다(담당자 경유) —
  MVP 사용분: 얼굴 클로즈업 `01_기본표정`, 전체모습 `01_앉아서_인사`, 표정 `01_기쁨`. 투명 배경은 `.PNG`.

---

## 6. 계측

이름 규칙(`<파트>_<대상>_<동작>`)은 확정(`R-05`)이라 그대로 심는다 — 이벤트 이름의 정본은
상류 `ANALYTICS.md`(담당자 경유), 화면별 이벤트는 [`spec/screens/<ID>.md`](spec/screens/) 의 「계측」 절.
공통 속성 `screen_id`(필수) · `day_no` · `is_offline` 는 파사드가 자동으로 붙인다.

```ts
track("home_memo_add", { char_bucket: bucket(text.length) });
```

**보내지 않는 것**: 일기 본문 · 순간 본문 · 회고 대화 내용 · 감정 이름을 제외한 모든 자유 텍스트. 감정은 `emotion_id`(1~9) 숫자로만. 이 금지는 파사드에서 타입으로 막는다(자유 텍스트 필드를 받지 않는 이벤트 타입).

---

## 7. 마일스톤

| #         | 내용                                                                                             | 산출                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M0** ✅ | 프로젝트 셋업 — Expo + TS strict + expo-router + lint/CI + ~~`sync:theme`~~(삭제됨) + Pretendard | 앱이 뜨고 폰트·배경 그라디언트가 시안과 같음                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **M1** ✅ | **P0 컴포넌트 13종** + **테스트 기반**                                                           | `ScreenBackground` `AppText` `AppButton` `Card` `ChatLayout` `BabaBubble` `AnswerBubble` `Avatar` `TypingDots` `ChipFlow` `InputRow` `ProgressDots` `BackChevron` · Jest + RNTL + CI 에 `test` 추가                                                                                                                                                                                                                                                                                                                                                                   |
| **M2** △  | 진입 + 온보딩 13상태 (`S0` `S1` `03`~`10-b`)                                                     | 화면 정렬·인증 부트스트랩 완료. 소셜 로그인 3종 · 알림/캘린더 실제 권한은 대기                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **M3** △  | 공용 컴포넌트(P1.5) + 홈 5화면                                                                   | **화면 완료** — `12`·`12-b` + 시트 3종(`12-c`·`12-d`·`12-e`)과 일정/순간 쓰기 경로. 남은 것은 **M3-3 아웃박스**(멱등 키·409)이고 BE 연결과 함께 간다                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **M4** ✅ | 회고 12화면 (2026-08-07)                                                                         | 채팅 · 감정 필수 · 방향 선택 시트(`C4-c`·`C4-c2`) · 일기 두 면 + 행동 카드 생성. ~~스트리밍과 실제 응답 생성은 BE 연결과 함께 — 지금 바바의 말은 고정 문장이다~~ → **대화는 서버가 주도한다**(2026-08-11 · 고정 대사 `FOLLOW_UPS`·`DRAFT_DEMO` 는 사라졌다). **스트리밍은 오지 않았다** — 서버는 턴마다 `ReplyDto` 하나를 주는 요청/응답 방식이라 타이핑 연출이 계속 FE 몫이다. **재개는 아직 못 한다**(`DISCUSSION.md` §1-2)                                                                                                                                         |
| **M5** △  | 보관함 6 + 리포트 1 + 마이 3 (2026-08-07)                                                        | **화면 완료** — 달력/목록/일기/행동 완료(`A3-c`) · 주간 리포트 · 설정. ⚠ **일기 두 면과 저장 뒤 수정(`A4`)은 없어졌다**(2026-08-20 · `PRODUCT.md` 22·24) — 서버도 본문(`original`)만 받는다. **보관함은 서버에서 오고, 서버에서 오지 않는 것은 리포트·마이의 집계·해석뿐이다**(계약에 그 엔드포인트가 없다 · `DISCUSSION.md` §1-8). **앱 잠금 게이트는 여기서 뺐다** — §8 의 「토글과 잠금을 떼지 않는다」는 그대로이고, MVP 에 잠금 **토글 자체가 없어서**(상류가 `M1`·`M3` 에서 내렸다) 지금은 지킬 것이 없다. 토글이 돌아오면 같은 마일스톤에서 게이트도 함께 온다 |
| **M6**    | `invariants` 전수 테스트 · Maestro E2E · EAS 내부 배포                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**테스트는 M6 에 몰지 않는다.** 기반은 M1 에 세우고, 인증 부트스트랩·아웃박스처럼 **틀리면 조용히 데이터가 깨지는 것**은 그 기능을 만드는 마일스톤에서 함께 쓴다. M6 에 남는 것은 `states.mvp.json` 의 `invariants` 전수 검사와 E2E 뿐이다.

> 왜 그런가 — 아웃박스 중복 생성과 인증 폴백은 **화면에 오류를 띄우지 않는 설계**다(규칙 5). 테스트가 없으면 잘못돼도 아무도 모른다. 나중에 붙이려면 그때는 테스트하기 어려운 구조가 이미 굳어 있다.

M1 이 병목이자 지렛대다 — 여기서 만든 채팅 컴포넌트군이 온보딩과 회고를 동시에 덮는다.

---

## 8. 앱 잠금 — 토글과 잠금을 떼지 않는다

> **현재 상태 (2026-08-07): 미착수이고, 지금은 어길 것이 없다.**
> 상류가 2026-08-06 에 **앱 잠금 토글 자체를 `M1`·`M3` 에서 내렸다**(`M1.md`
> 「앱 잠금과 내보내기 줄을 두지 않는다」 · `M3.md` 「앱 잠금을 두지 않는다」).
> 아래 규칙의 핵심은 **"토글만 두고 잠그지 않는 선택지는 없다"** 인데 토글이
> 없으므로 지킨 상태다. 토글이 돌아오면 **같은 마일스톤에서 게이트도 함께** 온다.
> 상류 승인 대기 항목은 이 절 끝에 있다.

상류 MVP 범위는 "`M3` 토글까지만, 잠금 화면(`M5`)은 다음 마일스톤"이다. **이 부분만 상류 범위에서 벗어난다.** 이유:

일기와 감정 기록을 담는 앱에서 "앱 잠금" 토글은 사용자가 켜는 순간 보호를 약속한다. 잠금이 실제로 걸리지 않으면 사용자는 폰을 잠깐 넘겨주거나 자리를 비울 때 **보호받는다고 착각한 채** 그렇게 한다. 아무 보호가 없는 것보다 나쁘다 — 없으면 조심하기라도 한다.

**하지만 상류가 미룬 것은 화면이지 기능이 아니다.** `M5`(Face ID 실패 후 화면)는 커스텀 UI 고, 잠금 자체는 OS 다이얼로그만으로 완결된다. 그리고 `COMPONENTS.md` 「만들지 않는 것」이 이미 말한다 — **권한·인증 팝업은 OS 가 그리고 커스텀은 금지**다. 즉 커스텀 화면 없이 게이트를 넣는 쪽이 오히려 설계 원칙에 맞는다.

구현:

- `appLockEnabled` 이면 **콜드 스타트와 포그라운드 복귀 모두**에서 `expo-local-authentication` 프롬프트를 띄운다. 백그라운드 전환 시 앱 스위처 스냅샷을 가리는 것까지 포함한다(iOS `blurEffect`, Android `FLAG_SECURE`).
- **잠금 해제 전에는 보호 라우트를 렌더하지 않는다** — 딤 처리나 오버레이가 아니라 렌더 자체를 막는다. 오버레이는 스크린샷·접근성 트리로 새어나간다.
- `disableDeviceFallback: false` — 생체 실패·미등록·하드웨어 없음은 전부 **OS 기기 암호**로 떨어진다. 커스텀 화면이 없어도 잠기지 않고, 사용자가 갇히지도 않는다.
- 기기에 어떤 인증 수단도 등록되어 있지 않으면 **토글을 켤 수 없게** 한다(비활성 + 한 줄 안내). 켜자마자 무력해지는 스위치를 두지 않는다.
- 딥링크(회고 알림 → `retro/intro`)도 게이트를 통과한 뒤에 열린다.

다음 마일스톤에 남는 것은 `M5` 커스텀 화면 하나뿐이다.

**상류에 확인할 것**: 이 범위 확장을 승인할지, 아니면 토글 자체를 `M3` 에서 내릴지. 둘 중 하나여야 하고 — **토글만 두고 잠그지 않는 선택지는 없다.**

---

## 9. 지키는 규칙 (전 컴포넌트 · [`spec/COMPONENTS.md`](spec/COMPONENTS.md) §공통 규칙)

1. 감정은 `theme.emotions` 9종만. 이모지 척도로 대체하지 않는다.
2. 색·크기·시간을 하드코딩하지 않는다.
3. 탭 대상 44pt+, 선택지·칩 행 52pt, 칩 간격 8pt.
4. 모든 모션은 `theme.motion.spec.*`. Reduce Motion 시 opacity 120ms 만.
5. 오류·거부·실패는 한 줄 안내로 흡수 — 모달·재시도 버튼·경고 아이콘 금지.
6. 숫자로 압박하지 않는다 — 진행률·연속 일수·점수·배지 금지.
7. **선택 상태를 색만으로 표시하지 않는다** — 테두리 색과 굵기(2px)를 동시에 바꾼다.
8. 시안은 절대좌표 375×812지만 **구현은 flex**. 다른 폭에서 비율 스케일하지 않고 여백만 유지한다.
