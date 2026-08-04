# momentory-fe 설계

> 범위: **MVP 30화면** (`../09_MVP/json/`) · 기준 문서는 상류 3종
> `momentory.states.mvp.json`(상태 기계 6개) · `momentory.schema.mvp.json`(엔티티 6개) · `momentory.css`(값)
> 전체 설계(136화면)는 `01_화면설계/`에 그대로 있고, 쉼터를 되살릴 때 돌아온다. **MVP가 원본을 대체하지 않는다.**

## 0. 무엇을 만드는가

| 파트 | 화면 | 장수 |
|---|---|---|
| 진입 | `S0` `S1` | 2 |
| 온보딩 | `03` `04` `05-b` `06` `08` `09` `10` | 7 |
| 홈 | `12` `12-b` `12-c` `12-d` `12-e` | 5 |
| 회고 | `C1` `C2` `C3` `C4` `C4-b` `C6` `C7` | 7 |
| 보관함 | `A1` `A2` `A3` `A3-b` `A4` | 5 |
| 리포트 | `W1` | 1 |
| 마이 | `M1` `M2` `M3` | 3 |

하단 탭 **4칸** — 홈 · 보관함 · 리포트 · 마이 (쉼터 없음).

**개발 단위는 화면이 아니라 컴포넌트다** (`02_디자인시스템/COMPONENTS.md`).
온보딩 채팅 컴포넌트군 = 회고 채팅과 같은 틀 — 한 번 만들면 앱의 두 축을 다 덮는다.

---

## 1. 기술 스택

> **이 절은 두 부분이다** — 아래 표는 **지금 `package.json` 에 있는 것**이고, 그 다음 표는 **아직 없는 것**이다.
> 섞어 적으면 새로 온 사람이 `import { useQuery }` 를 쓰고 나서야 없다는 걸 안다.

### 지금 쓰는 것 (M0 기준)

| 영역 | 선택 | 이유 |
|---|---|---|
| 런타임 | **Expo SDK 57** + Dev Client + CNG | 카카오/애플/구글 로그인·캘린더·알림·생체인증이 전부 config plugin으로 해결된다. `ios/` `android/` 는 커밋하지 않고 `expo prebuild` 로 생성(CNG) — 네이티브 수정은 plugin 으로만 |
| 언어 | TypeScript 6 `strict` + `noUncheckedIndexedAccess` | 상류 스키마를 타입으로 고정 |
| 네비게이션 | **expo-router** (파일 기반) | `states.mvp.json` 의 machine → 라우트 그룹이 1:1. 회고 알림 → 딥링크가 공짜 |
| 스타일 | **StyleSheet + `theme` 객체** | 다크모드 없음(RULES: 크림 배경 유지), 토큰이 고정 상수 — 런타임 테마 엔진이 필요 없다. NativeWind/Tamagui 는 12.5px·자간 .145em 같은 값을 우회하게 만들어 오히려 손해 |
| 그라디언트 | **react-native-svg** `RadialGradient` | `.scr` 은 radial. `expo-linear-gradient` 로는 못 그린다 |
| 폰트 | expo-font + Pretendard 4 weight | 파일 이름으로 굵기 지정 (Android 는 `fontWeight` 로 OTF 굵기가 안 바뀐다) |
| 품질 | ESLint 9 + Prettier + GitHub Actions | **현재 CI = `check:theme` · `typecheck` · `lint` · 시크릿 추적 검사.** 테스트는 아직 없다 |

### 도입 예정 — 필요해지는 마일스톤에

아직 설치하지 않았다. **쓸 화면이 생길 때 넣는다** — 미리 깔면 쓰지도 않는 의존성이 락파일에 굳는다.

| 영역 | 선택 | 언제 | 왜 그때인가 |
|---|---|---|---|
| 테스트 | Jest + @testing-library/react-native | **M1** | 첫 공용 컴포넌트와 함께. 뒤로 미루면 테스트하기 어려운 구조가 먼저 굳는다 |
| 애니메이션 | react-native-reanimated | M1 | `theme.motion.spec.*` 를 쓰는 첫 컴포넌트(`AppButton` press)부터 |
| 보안 저장 | expo-secure-store | M2 | 로그인 토큰이 처음 생기는 시점. 읽기가 **비동기**라는 점이 진입 라우팅을 규정한다(§3) |
| 서버 상태 | TanStack Query v5 | M2 | 첫 API 호출. **OpenAPI 계약 합의가 선행**(§4) |
| 클라이언트 상태 | Zustand (작게) | M2 | 온보딩 답안 초안 |
| 목 서버 | MSW | M2 | BE 미확정 구간을 화면 개발이 기다리지 않게 |
| 로컬 저장 | react-native-mmkv | M3 | 첫 로컬 쓰기. **데이터 보안 정책이 선행**(§4) |
| 계측 | 얇은 `track()` 파사드 | M3 | `06_운영문서/ANALYTICS.md` 이름 규칙은 이미 확정 |
| 이미지 | expo-image | M2 | 바바 아바타가 처음 나오는 온보딩 |
| E2E | Maestro | M6 | 흐름이 다 연결된 뒤 |
| 배포 | EAS Build / Update | M6 | |

### 네이티브 기능 — 전부 M2 이후 도입 예정

**하나도 설치돼 있지 않다.** 아래는 어떤 패키지를 쓸지 정해둔 것이지 지금 쓸 수 있는 것이 아니다.
이것들이 들어오는 순간 Expo Go 로는 실행할 수 없다 — 그때 `expo-dev-client` 를 설치하고
dev client 로 전환한다.

| 기능 | 패키지 | 비고 |
|---|---|---|
| 카카오 로그인 | `@react-native-seoul/kakao-login` | Expo config plugin 필요 (prebuild) |
| 애플 로그인 | `expo-apple-authentication` | iOS 전용. 이름 비공개해도 온보딩 `04`에서 호칭을 받으므로 빈 이름 없음 |
| 구글 로그인 | `@react-native-google-signin/google-signin` | |
| 캘린더 | `expo-calendar` | **읽기 전용**. 직접 추가한 일정은 캘린더에 쓰지 않는다 |
| 알림 | `expo-notifications` | **MVP는 전부 로컬 알림으로 충분** — 회고 시각(매일 반복) · 낮 리마인드 · 주간. 서버 푸시 인프라 없이 시작 |
| 앱 잠금 | `expo-local-authentication` | **토글을 켰으면 실제로 잠근다** — 게이트는 MVP에 포함. 커스텀 잠금 화면(`M5`)만 다음 마일스톤 (§8) |

---

## 2. 폴더 구조

**`app/` 은 저장소 루트다** — `src/app/` 이 아니다. expo-router 가 루트 `app/` 을 라우트 트리로 잡고,
`src/` 는 라우트가 아닌 코드만 담는다. 경계가 이름으로 드러난다.

### 지금 있는 것

```
app/
  _layout.tsx                # 폰트 로딩 · SafeAreaProvider · Stack
  index.tsx                  # M0 검수 화면 (M2 에서 S0 스플래시가 된다)
src/
  design/
    theme.ts                 # 생성물 — 직접 수정 금지 (§5)
    tokens.mvp.ts            # 상류 반영 전까지의 이름 매핑 (§5)
  components/primitives/
    ScreenBackground.tsx
```

### 목표 구조

**빈 폴더를 미리 만들지 않는다.** 아래는 화면이 생길 때 도달할 모양이지 지금 만들 것이 아니다 —
빈 껍데기가 먼저 있으면 어디에 뭐가 있는지가 아니라 어디가 비었는지를 먼저 읽게 된다.

```
app/                         # expo-router — 라우트만, 로직 없음
    _layout.tsx              # Provider 스택 (Query · 폰트 · SafeArea · 테마)
    index.tsx                # S0 스플래시 = entry machine 의 route 판정
    (auth)/login.tsx         # S1
    (onboarding)/
      _layout.tsx            # Stack · ProgressDots · BackChevron
      welcome.tsx            # 03
      nickname.tsx           # 04
      profile.tsx            # 05-b
      interests.tsx          # 06
      retro-time.tsx         # 08
      calendar.tsx           # 09
      done.tsx               # 10
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
    diary/[id]/
      index.tsx              # A3 / A3-b (SegBar)
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
    onboarding/ home/ retro/ archive/ report/ my/
      api/ model/ ui/        # 쿼리 훅 · 도메인 로직 · 화면 조각
  lib/
    api/                     # 클라이언트 · 생성된 타입 · 오프라인 아웃박스
    analytics/               # track() 파사드 + 이벤트 상수
    day.ts                   # 04:00 하루 경계
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

  1. SecureStore 에서 토큰을 읽고, **보호 라우트에 들어가기 전에 검증/갱신한다.** 만료된 토큰으로 `(tabs)` 에 들어가 첫 401 을 보고 튕겨 나오지 않는다.
  2. **MMKV 에 로그인 여부를 미러링하지 않는다.** 미러 플래그는 로그아웃·만료·저장소 오류 뒤에 남아 인증되지 않은 사용자를 인증된 트리로 보낸다. MMKV 가 갖는 것은 `onboardingCompleted` 같은 비민감 플래그뿐이고, 그것도 인증 이후에만 읽는다.
  3. **라우트 가드가 최종 권한을 갖는다.** `(tabs)`·`(onboarding)` 레이아웃이 `auth !== 'authenticated'` 이면 무조건 `(auth)/login` 으로 되돌린다 — 진입 판정 한 번으로 끝내지 않는다.
  4. **실패는 닫는 쪽으로 넘어진다.** SecureStore 읽기 오류·복호화 실패·갱신 실패는 전부 `anonymous` 다. 판단이 안 서면 로그인 화면이다.
  5. 로그아웃·계정 삭제는 SecureStore 토큰 · MMKV 캐시 · Query 캐시 · **아웃박스 큐**를 함께 비운다. 큐를 남기면 다음 사용자의 세션으로 이전 사용자의 쓰기가 재생된다.

  테스트로 고정할 경로: 만료 토큰 · 갱신 실패 · SecureStore 오류 · 로그아웃 후 재진입 · 앱 킬 후 콜드 스타트.
- **onboarding** — 질문 다섯. `05-b` 만 skip 가능, `06`·`08` 필수. 답은 화면마다 서버로 보내지 않고 Zustand 초안에 쌓았다가 `09`/`10` 에서 한 번에 커밋한다(중간 이탈 시 초안은 MMKV 에 남음).
- **home** — 한 상태(`day`). `12-b`(빈 상태)는 별도 레이아웃이 아니라 **같은 카드가 초대로 바뀌는 변형**이므로 같은 컴포넌트의 prop.
- **retro** — 전체화면 모달 스택. `C7` 에서 홈으로 pop, `Diary` 생성. `diaryCount >= 7` 이면 `Report.unlocked`.
- **archive / report / my** — 탭 내부 스택.

`invariants` 배열의 각 문장은 테스트 파일로 옮긴다. 예:
"세 칸의 순서는 어떤 상태에서도 바뀌지 않는다" → 홈 렌더 스냅샷 순서 테스트.

---

## 4. 데이터 레이어 (BE 미확정 대응)

BE 팀의 API 가 확정되지 않았으므로 **FE 가 계약을 먼저 제안한다.**

1. `schema.mvp.json` 의 엔티티 6개 + `states.mvp.json` 의 `effect(s)` 를 그대로 옮겨 **OpenAPI 계약 초안**(`docs/api/openapi.yaml`)을 쓴다. 화면에 없는 필드는 만들지 않는다.
2. `openapi-typescript` 로 타입을 생성 → `src/lib/api/schema.d.ts` (생성물).
3. **MSW 핸들러**가 그 계약을 구현한다. 샘플 값은 `schema.mvp.json` 의 `meta.sampleData` 그대로 (오늘 2026-07-27 · 일기 12편 · 닉네임 지현 · 이번 주 회고 5회).
4. BE 가 나오면 base URL 만 바꾼다. 계약이 어긋나면 그 차이가 곧 BE 팀과의 논의 항목이 된다.

### local-first 쓰기 — 아웃박스

스키마가 요구한다 — `Moment.syncState: local|uploading|synced`, "항상 기기에 먼저 저장하고 연결되면 올린다. **실패로 표시하지 않고 '올리는 중'**".

```
사용자 저장 → MMKV 즉시 반영 + optimistic update
           → 아웃박스 큐에 mutation 적재 (TanStack Query persisted mutation)
           → 온라인 복귀 시 자동 재생 · 실패해도 사용자에게 오류를 띄우지 않는다
```

**자동 재생에는 계약이 필요하다.** 서버가 커밋한 뒤 응답이 오기 전에 타임아웃이 나면 클라이언트는 성공 여부를 모르고 재시도한다 — 계약 없이 재생하면 일기·순간·일정이 **중복 생성**된다. 사용자에게 오류를 띄우지 않는 설계라 중복은 조용히 쌓인다. 아래를 **OpenAPI 계약에 먼저 넣고** 구현한다.

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

**테스트로 고정할 것**: 응답 유실 후 재생(중복 없음) · 같은 항목 3회 재생 · 같은 엔티티 순서 뒤집힘 · 동시 편집 409 · 로그아웃 시 큐 비움.

### 파생값

`diaryCount` · `recordedDays` · `emotionRecords` · `monthTopEmotion` · `monthChange` · `reportUnlock` 은 **서버 계산**을 기본으로 한다(같은 값이 여러 화면에 쓰이고, 기간마다 다른 값이라 클라이언트 중복 계산은 어긋나기 쉽다). 오프라인일 때만 캐시된 값을 보여준다.

`day.ts` — 하루 경계는 **04:00**. `date` 계산은 전부 이 유틸을 지난다.

---

## 5. 디자인 시스템 연동

`02_디자인시스템/theme.ts` 가 정본이고, FE 는 **복사본을 쓴다** (momentory-fe 는 별도 저장소라 상대 경로 import 가 안 된다).

```bash
npm run sync:theme    # ../02_디자인시스템/theme.ts → src/design/theme.ts (헤더에 "생성물" 주석)
```

색·크기·시간을 하드코딩하지 않는다. 어기면 ESLint 커스텀 룰(리터럴 hex 금지)이 잡는다.

### ⚠ 지금 있는 토큰 불일치 (상류 확인 필요)

MVP 리팩토링본 `momentory.css` 에는 있는데 `lib.mjs` → `theme.ts` 에는 **아직 없는** 값들:

| 토큰 | css 값 | theme.ts |
|---|---|---|
| `--textStrong` `--textBody` `--textCaption` `--textLegal` `--textAccent` `--textOnDark` | 글자색 6종 체계 | 다른 이름 체계(`textPrimary`/`textMuted`/`textSlogan`/`textLegalInk`) |
| `--primaryDeepPress` | `#9E5626` | 없음 |
| ~~`--dangerInk`~~ | `#9B3B2F` | ✅ **해결됨 (2026-08-05 · `R-40`)** — `lib.mjs` 등록 완료, `theme.ts` 에 `colors.dangerInk` 로 나온다. 오버라이드 불필요. **글자·테두리 전용이고 면을 채우지 않는다** |
| `.scr` 배경 | `120% 90% at 50% 18%` (S0·S1 만 구 값 유지) | `gradients.screen` 은 구 값만 |

**대응**: `05_도구/lib.mjs` 에 위 값을 반영하고 `export-theme.mjs` 를 다시 돌리는 것이 정공법이다. 그때까지 FE 는 `src/design/tokens.mvp.ts` 에 오버라이드를 모아 두고, 반영되면 그 파일을 지운다. (오버라이드를 화면 코드에 흩지 않는다.)

### 자산

- **Pretendard 폰트 파일이 `04_자산/` 에 없다** — README 는 `폰트/` 를 가리키지만 실제 폴더에는 캐릭터만 있다. 웹폰트 배포본에서 4 weight 를 받아 `assets/fonts/` 에 넣는다.
- 바바 이미지는 `04_자산/캐릭터/` 에서 필요한 것만 가져온다 — MVP 사용분: 얼굴 클로즈업 `01_기본표정`, 전체모습 `01_앉아서_인사`, 표정 `01_기쁨`. 투명 배경은 `.PNG`.

---

## 6. 계측

`ANALYTICS.md` 규칙은 **확정**이므로 그대로 심는다. 공통 속성 `screen_id`(필수) · `day_no` · `is_offline` 는 파사드가 자동으로 붙인다.

```ts
track('home_memo_add', { char_bucket: bucket(text.length) })
```

**보내지 않는 것**: 일기 본문 · 순간 본문 · 회고 대화 내용 · 감정 이름을 제외한 모든 자유 텍스트. 감정은 `emotion_id`(1~9) 숫자로만. 이 금지는 파사드에서 타입으로 막는다(자유 텍스트 필드를 받지 않는 이벤트 타입).

---

## 7. 마일스톤

| # | 내용 | 산출 |
|---|---|---|
| **M0** ✅ | 프로젝트 셋업 — Expo + TS strict + expo-router + lint/CI + `sync:theme` + Pretendard | 앱이 뜨고 폰트·배경 그라디언트가 시안과 같음 |
| **M1** | **P0 컴포넌트 13종** + **테스트 기반** | `ScreenBackground` `AppText` `AppButton` `Card` `ChatLayout` `BabaBubble` `AnswerBubble` `Avatar` `TypingDots` `ChipFlow` `InputRow` `ProgressDots` `BackChevron` · Jest + RNTL + CI 에 `test` 추가 |
| **M2** | 진입 + 온보딩 9화면 (`S0` `S1` `03`~`10`) | 소셜 로그인 3종 · 알림/캘린더 권한 · 온보딩 완주 · **인증 부트스트랩 테스트**(§3 5경로) |
| **M3** | 공용 컴포넌트(P1.5) + 홈 5화면 | `TabBar` `ScrollArea` `EmotionPill` `EmotionGrid` `Sheet` `ScheduleRow` — 일정/순간 CRUD + 아웃박스 · **아웃박스 테스트**(§4 5경로) |
| **M4** | 회고 7화면 | 채팅(스트리밍 포함) · 감정 필수 · 일기 생성 |
| **M5** | 보관함 5 + 리포트 1 + 마이 3 + **앱 잠금 게이트** | 캘린더/목록/일기 두 면/수정 · 주간 리포트 · 설정 · 토글과 잠금이 같은 마일스톤(§8) |
| **M6** | `invariants` 전수 테스트 · Maestro E2E · EAS 내부 배포 | |

**테스트는 M6 에 몰지 않는다.** 기반은 M1 에 세우고, 인증 부트스트랩·아웃박스처럼 **틀리면 조용히 데이터가 깨지는 것**은 그 기능을 만드는 마일스톤에서 함께 쓴다. M6 에 남는 것은 `states.mvp.json` 의 `invariants` 전수 검사와 E2E 뿐이다.

> 왜 그런가 — 아웃박스 중복 생성과 인증 폴백은 **화면에 오류를 띄우지 않는 설계**다(규칙 5). 테스트가 없으면 잘못돼도 아무도 모른다. 나중에 붙이려면 그때는 테스트하기 어려운 구조가 이미 굳어 있다.

M1 이 병목이자 지렛대다 — 여기서 만든 채팅 컴포넌트군이 온보딩과 회고를 동시에 덮는다.

---

## 8. 앱 잠금 — 토글과 잠금을 떼지 않는다

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

## 9. 지키는 규칙 (전 컴포넌트 · `COMPONENTS.md` §공통 규칙)

1. 감정은 `theme.emotions` 9종만. 이모지 척도로 대체하지 않는다.
2. 색·크기·시간을 하드코딩하지 않는다.
3. 탭 대상 44pt+, 선택지·칩 행 52pt, 칩 간격 8pt.
4. 모든 모션은 `theme.motion.spec.*`. Reduce Motion 시 opacity 120ms 만.
5. 오류·거부·실패는 한 줄 안내로 흡수 — 모달·재시도 버튼·경고 아이콘 금지.
6. 숫자로 압박하지 않는다 — 진행률·연속 일수·점수·배지 금지.
7. **선택 상태를 색만으로 표시하지 않는다** — 테두리 색과 굵기(2px)를 동시에 바꾼다.
8. 시안은 절대좌표 375×812지만 **구현은 flex**. 다른 폭에서 비율 스케일하지 않고 여백만 유지한다.
