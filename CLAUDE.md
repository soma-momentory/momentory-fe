# momentory-fe

모멘토리 앱의 React Native 프론트. **MVP 40화면**을 만든다 (2026-08-06 상류 v2 개정 — 30 → 40).

**이 저장소만으로 개발·검증이 전부 된다** — 화면 스펙·값·상태 기계는 저장소 안
[`docs/spec/`](docs/spec/SNAPSHOT.md)(상류 반입 스냅샷 · 직접 수정 금지)에 있다.
상류 접근이 필요한 일은 재반입과 `sync:theme` 뿐이고 담당자 전용이다.

## 먼저 읽을 것 — 순서대로

**화면을 만들기 전에 반드시 본다.**

1. [`docs/spec/RULES.md`](docs/spec/RULES.md) — **1순위.** 범위 · 「원본과 다른 것」 표 · 불변 규칙 · 구현 순서
2. [`docs/spec/momentory.states.mvp.json`](docs/spec/momentory.states.mvp.json) — 상태 기계 7개. `states.<키>` 하나가 화면 하나
3. [`docs/spec/momentory.schema.mvp.json`](docs/spec/momentory.schema.mvp.json) — 엔티티 7개(`Report` 포함). `guard` 문장이 여기 필드로 번역된다
4. [`docs/spec/screens/<ID>.md`](docs/spec/screens/) — 화면별 스펙 (라우트 매핑: [`docs/PRODUCT.md`](docs/PRODUCT.md))
5. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 이 저장소의 기술 설계
6. [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 커밋 · 브랜치 · PR · 품질 게이트 · 시크릿 · 생성물

> ⚠ MVP 범위 밖 화면 — 예외(`E*` `X*`)·쉼터(`R*`) — 의 스펙은 상류 `01_화면설계/` 에만 있다.
> **규칙이 사라진 것은 아니다** — 마주치면 담당자에게 요청한다. 상류에는 MVP 와
> **같은 ID 로 내용이 다른** 문서가 있으니(특히 `C4-b`), 스펙은 항상 `docs/spec/` 것을 쓴다.

## 값을 찾는 순서 — MVP 먼저

색·크기·반경·여백을 정할 때다. **위에서부터 보고, 없을 때만 아래로 내려간다.**

|     | 어디                                                                    | 무엇                                                 |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| 1   | [`docs/spec/screens/<ID>.md`](docs/spec/screens/)                       | 그 화면의 규칙·문안                                  |
| 2   | [`docs/spec/momentory.css`](docs/spec/momentory.css)                    | **MVP 값 정본** — 색·크기·반경·여백                  |
| 3   | (상류 전용 — 담당자 경유) `05_도구/flows/9-mvp.mjs` · `ui.mjs`          | MVP 40화면 조립 (2번의 figma 번역)                   |
| 4   | [`docs/spec/COMPONENTS.md`](docs/spec/COMPONENTS.md) · (상류) `lib.mjs` | ⚠ **원본 기준.** 위에 없을 때만 — 배너를 먼저 읽는다 |

**`COMPONENTS.md` 의 P0 스펙 표는 원본을 서술한다.** 그대로 만들면 어긋난다 — 실제로 셋이 어긋났다:

| 컴포넌트       | COMPONENTS.md (원본)     | MVP 정본                       |
| -------------- | ------------------------ | ------------------------------ |
| `Card`         | r14 · 테두리 primary 30% | **r18 · ink 10% · 여백 15/17** |
| `ProgressDots` | gap 8                    | **gap 6**                      |
| `BackChevron`  | 글리프 26 · ink          | **19 · body**                  |

> **`S0`·`S1` 도 v2 부터 MVP 리팩토링 대상으로 구현돼 있다** — `9-mvp.mjs` 40화면에 들어 있다.
> 원본 값 예외는 **배경 그라디언트 구 값**(`115% 75% at 50% 26%`) 하나뿐이다.
> 워드마크 자간(.145→**.055em**)·소셜 버튼(54→**44 · r12 · 마크 왼쪽 16 절대 정렬**)은
> MVP 값으로 바뀌었다 — 「진입 2장은 원본 그대로」라는 옛 전제로 구현하지 않는다.
> ⚠ 단 상류 `R-42` 에는 그 옛 전제의 문장이 남아 있다 — 차이 기록:
> [`docs/PRODUCT.md` 「상류와 차이」](docs/PRODUCT.md) #2.

## 규칙의 정본은 여기가 아니다

이 파일은 **길잡이**다. 규칙을 여기에 옮겨 적으면 정본이 둘이 되고, 한쪽만 고쳐졌을 때
어느 쪽이 맞는지 알 수 없게 된다. 실제 규칙은 두 곳에 산다:

- **제품·디자인 규칙** → [`docs/spec/RULES.md`](docs/spec/RULES.md) (상류 스냅샷)
- **저장소 작업 규칙** → [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) (커밋·브랜치·PR·품질 게이트·시크릿·의존성·생성물)
- 구현이 스펙과 어긋나야 하면 [`docs/PRODUCT.md` 「상류와 차이」](docs/PRODUCT.md)에 기록한다 —
  코드에 조용히 반영하지 않는다. 상류 제기는 담당자 몫([`docs/spec/SNAPSHOT.md`](docs/spec/SNAPSHOT.md))

아래는 **자주 어기게 되는 것 다섯 개**의 요약일 뿐이다. 판단이 갈리면 위 두 문서를 본다.

1. **색·크기·시간을 하드코딩하지 않는다.** 린터가 hex 를 막는다 — `src/design/` 을 쓴다
2. 글자색은 semantic 6종만 (`text.strong` `body` `caption` `legal` `accent` `onDark`).
   `primary #C2703D` 는 **장식 전용**이고 글자가 얹히는 면은 `primaryDeep` 이다
3. **선택 상태를 색만으로 표시하지 않는다** — 테두리 굵기(1→2px)와 글자 굵기를 함께 바꾼다
4. **오류·거부·실패는 한 줄 안내로 흡수한다** — 모달·재시도·경고 아이콘 금지.
   **숫자로 압박하지 않는다** — 진행률·연속 일수·점수·배지 금지
5. 폰트는 `fontFamily: "Pretendard-Bold"` 처럼 **파일 이름**으로 (Android 는 `fontWeight` 가 안 먹는다)

## 생성물·반입물 — 직접 고치지 말 것

- `src/design/theme.ts` ← 상류 `05_도구/lib.mjs`. 재생성은 담당자(`npm run sync:theme` — [SNAPSHOT.md](docs/spec/SNAPSHOT.md))
- `docs/spec/**` ← 상류 반입 스냅샷. 재반입 절차로만 갱신
- `ios/` `android/` ← `app.config.ts`. `npx expo prebuild`

`src/design/tokens.mvp.ts` 는 **임시**다 — 상류가 semantic 6토큰을 `lib.mjs` 에
흡수하면 지운다. 오버라이드를 화면 코드에 흩지 않는다.

## BE 는 마지막에 붙인다 (2026-08-07 결정)

**화면 40장을 먼저 만들고 서버 연결은 맨 끝에 한다.** 그동안 데이터는
`src/mocks/sample.ts`(스키마 `meta.sampleData`)에서 오고, 화면은 그걸 직접
읽지 않고 **`src/features/<도메인>/` 의 store 와 `data/`(repository·adapter) 경계를
지난다** — 직접 import 는 린터(`no-restricted-imports`)가 막는다.

모양을 스키마(`momentory.schema.mvp.json`)대로 맞추는 것이 조건이다 — 그래야
서버가 붙을 때 `data/` 안쪽만 바뀌고 화면은 그대로다. 화면이 데이터를 직접 들면
그때 컴포넌트를 다시 쓰게 된다. `Moment.syncState` 처럼 **스키마에 있는 필드는
지금 안 써도 타입에 둔다.** 날짜·시각은 `src/lib/clock.ts` 를 지난다 —
샘플 하루(2026-07-27)와 04:00 경계가 그 한 파일에 있다.

## 지금 어디까지 왔나

**정적 화면 40장이 전부 있다** (2026-08-07). 진입 2 · 온보딩 11 · 홈 5 · 회고 12 ·
보관함 6 · 리포트 1 · 마이 3. 화면 ID ↔ 라우트 매핑은 [`docs/PRODUCT.md`](docs/PRODUCT.md) 표가 정본이다.

⚠ **「화면 완료」와 「MVP 완료」는 다르다.** 남은 것은 BE · 영속 저장(MMKV) ·
소셜 SDK · OS 권한(알림·**캘린더 연결**) · 계측 · 아웃박스 · 앱 잠금 게이트 ·
M6(invariants 전수 테스트 · E2E · 배포). 목록은 [`docs/TASKS.md`](docs/TASKS.md)
「화면 40장이 끝난 뒤 남은 것」에 있다.

**아직 갈 곳이 없는 줄은 눌리지 않게 둔다** — 연결 관리 · 약관 · 문의 · 회원 탈퇴.
눌리는데 아무 일도 없는 줄을 만들지 않는다(`TASKS.md` 「마이의 편집 경로」).
지금 있는 것은 아래와 같다 — 문서의 목표 구조를 이미 있는 것으로 착각하지 말 것.

```
app/_layout.tsx  app/index.tsx (S0)  app/(auth)/login.tsx (S1)
app/(onboarding)/{_layout, welcome, nickname, profile, interests, rest, retro-time, calendar, done}.tsx
                  = 03 · 04 · 05-b · 06(+06-b·06-c) · 07 · 08 · 09 · 10(+10-b)
app/(tabs)/{_layout, home, archive, report, my}.tsx = 12 · 12-b · A1 · A2 · W1 · M1 (한 파일이 두 상태씩)
app/home/{_layout, schedule/[id], schedule/new, moment/new}.tsx
                                          = 12-c · 12-e · 12-d — 투명 모달 시트
app/retro/{_layout, intro, confirm, emotion, talk, draft, done}.tsx = C1~C7 (회고 12장)
                                          talk = C4~C4-e · draft = C6·C6-b (세그먼트 두 면)
app/diary/{_layout, [id]/index, [id]/edit}.tsx = A3 · A3-b · A3-c · A4
app/my/{_layout, profile, notify}.tsx     = M2 · M3
src/design/{theme.ts, tokens.mvp.ts}
src/components/primitives/{ScreenBackground, AppText, AppButton, Card,
                           InputRow, ProgressDots, BackChevron}.tsx
src/components/chat/{ChatLayout, BabaBubble, AnswerBubble, Avatar, TypingDots, ChipFlow,
                     DirectionChip, ChatInput}.tsx ← 방향 칩 = 대화의 경계선 · 빠른 답변 칩 금지
src/components/common/{TabBar, TabScreen, EmotionPill, Sheet, EmotionGrid, Toggle, RetroNav,
                       SegBar, DirectionSheet, SectionLabel, ConfirmCard}.tsx
src/components/onboarding/OnboardingTopBar.tsx   src/components/my/SettingRow.tsx
src/components/icons/LineIcons.tsx        ← 해·종·달·연필·체크 (이모지 금지)
src/components/archive/{CalendarMonth, DiaryPreviewCard, EmotionFilter}.tsx
src/components/diary/{ActionRow, ActionCardSection, DiaryBabaFace}.tsx ← C6-b·A3 공유
src/components/report/{WeeklySummaryCard, WeeklyEmotionGrid, ActionInsightCard}.tsx
src/features/home/{model/{day,types}.ts, data/sampleRepository.ts, ui/ScheduleRow.tsx}
src/features/retro/model/retro.ts         ← 회고 한 벌 — 시작 감정·대화·방향
src/features/diary/{model/{diary,types,selectors}.ts, data/sampleAdapter.ts}
                                          ← 회고가 남기는 것: Diary + ActionCard.
                                            타입·selector·샘플 seed 가 store 와 분리돼 있다
src/features/archive/model/archive.ts     ← 세는 것만. 연속 일수를 세지 않는다
src/features/report/{model/report.ts, data/sampleRepository.ts} ← 주간 집계 · 해석 공급 경계
src/features/my/model/{settings,stats}.ts ← 알림/프로필 설정 · 전체 기간 집계
src/features/onboarding/model/{draft, completion}.ts ← 답안 초안 · 완료 플래그(진입 분기)
src/features/auth/model/auth.ts          ← M2-0 인증 부트스트랩 — hydrate·가드·fail-closed
src/mocks/sample.ts                       ← 데모 데이터 정본 (스키마 meta.sampleData).
                                            타입은 소유하지 않는다 — feature 가 소유.
                                            화면이 직접 import 하면 린터가 막는다
src/lib/providers.tsx   ← Provider 는 여기. _layout.tsx 가 아니다
src/lib/clock.ts        ← 시각의 단일 공급자 — SampleClock(2026-07-27) ·
                          SystemClock(04:00 하루 경계) · fixedClock(테스트)
src/lib/day.ts          ← 날짜 표기. 계산은 clock.ts 가 한다
src/lib/time.ts         ← "21:30" ↔ "밤 9:30" — 시각을 말하는 곳은 전부 이걸 쓴다
```

설치된 것: expo-router · expo-dev-client · expo-font · react-native-svg · safe-area-context ·
**Zustand** · **expo-secure-store** · **@react-native-community/datetimepicker**
(08 OS 피커 — 네이티브라 dev client 재빌드 필요).
**아직 없는 것: TanStack Query · MMKV · Reanimated · MSW.**
도입 시점은 `docs/ARCHITECTURE.md §1` 「도입 예정」 표에 있다.

> 진입·온보딩 13장은 **v2 기준으로 맞춰져 있다**(2026-08-07 따라잡기 완료).
> 남은 것(브랜드 마크 · 계측 · **앱을 다시 열었을 때의 홈 분기 영속화** 등)은
> `docs/TASKS.md` 「잔여」 절에 있다. 진입 분기 자체는 `app/index.tsx` 에 있고
> (세션 없음 → 로그인 · 온보딩 전 → 온보딩 · 완료 → 홈), **완료 플래그가 아직
> 메모리라 앱을 껐다 켜면 온보딩을 다시 본다**(`features/onboarding/model/completion.ts`).

CI 와 로컬 검증의 정본은 [`docs/CONTRIBUTING.md` 「품질 게이트」](docs/CONTRIBUTING.md)다.

다음으로 넘어가기 전에 닫혀야 하는 것:

| 막는 것           | 필요한 것                                                      |
| ----------------- | -------------------------------------------------------------- |
| M2 이후           | `docs/api/openapi.yaml` — BE 팀과 합의한 계약 + 멱등성 규약    |
| M3 (첫 로컬 쓰기) | `docs/DATA-SECURITY.md` — 민감 필드 저장 위치·암호화·삭제 보장 |

## 명령

```bash
npm start            npm run typecheck    npm run lint
npm run test         npm run format:check
npm run check:theme  # 생성물 자기 검증 — 상류 없이 돈다
npm run android      # 공식 개발 환경인 dev client 빌드 — Expo Go 는 지원하지 않는다
npm run sync:theme   # 담당자 전용 — docs/spec/SNAPSHOT.md
```
