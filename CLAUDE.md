# momentory-fe

모멘토리 앱의 React Native 프론트. **MVP 40화면**을 만든다 (2026-08-06 상류 v2 개정 — 30 → 40).

## 먼저 읽을 것 — 순서대로

설계는 부모 저장소 `C:\SWM\momentory\` 에 있다. **화면을 만들기 전에 반드시 본다.**

1. `../09_MVP/docs/RULES.md` — **1순위.** 범위 · 「원본과 다른 것」 표 · 불변 규칙 · 구현 순서
2. `../09_MVP/스펙/momentory.states.mvp.json` — 상태 기계 7개. `states.<키>` 하나가 화면 하나
3. `../09_MVP/스펙/momentory.schema.mvp.json` — 엔티티 7개(`Report` 포함). `guard` 문장이 여기 필드로 번역된다
4. `../09_MVP/docs/<ID>.md` — 화면별 스펙
5. `docs/ARCHITECTURE.md` — 이 저장소의 기술 설계
6. `docs/CONTRIBUTING.md` — 커밋 · 시크릿 · 생성물 규칙

> ⚠ **`01_화면설계/` 와 `09_MVP/` 에 같은 ID 가 있고 내용이 다르다.**
> 우리가 만드는 것은 `09_MVP/` 다. 특히 `C4-b` 는 양쪽이 아예 다른 화면이다.
> 예외(`E*` `X*`)·쉼터(`R*`)는 MVP 범위 밖이지만 **규칙이 사라진 것은 아니다** — 마주치면 `01_화면설계/` 를 본다.

## 값을 찾는 순서 — MVP 먼저, 없으면 상류

색·크기·반경·여백을 정할 때다. **위에서부터 보고, 없을 때만 아래로 내려간다.**

| | 어디 | 무엇 |
|---|---|---|
| 1 | `../09_MVP/docs/<ID>.md` | 그 화면의 규칙·문안 |
| 2 | **`momentory.css`** | **MVP 값 정본** — 색·크기·반경·여백. `../07_반입/_archive/UXUI리팩토링_MVP_v2_20260806_반입완료/export/mvp/` (최신 반입 번들이 정본 — 새 반입이 오면 경로가 바뀐다) |
| 3 | `../05_도구/flows/9-mvp.mjs` · `ui.mjs` | MVP 40화면 조립 (2번의 figma 번역) |
| 4 | `../02_디자인시스템/COMPONENTS.md` · `../05_도구/lib.mjs` | ⚠ **원본 기준.** 위에 없을 때만 |

**`COMPONENTS.md` 의 P0 스펙 표는 원본을 서술한다.** 그대로 만들면 어긋난다 — 실제로 셋이 어긋났다:

| 컴포넌트 | COMPONENTS.md (원본) | MVP 정본 |
|---|---|---|
| `Card` | r14 · 테두리 primary 30% | **r18 · ink 10% · 여백 15/17** |
| `ProgressDots` | gap 8 | **gap 6** |
| `BackChevron` | 글리프 26 · ink | **19 · body** |

> **`S0`·`S1` 도 v2 부터 MVP 리팩토링 대상이다** — `9-mvp.mjs` 40화면에 들어 있다.
> 원본 값 예외는 **배경 그라디언트 구 값**(`115% 75% at 50% 26%`) 하나뿐이다.
> 워드마크 자간(.145→**.055em**)·소셜 버튼(54→**44 · r12 · 마크 왼쪽 16 절대 정렬**)은
> MVP 값으로 바뀌었다 — 「진입 2장은 원본 그대로」라는 옛 전제로 구현하지 않는다.

## 규칙의 정본은 여기가 아니다

이 파일은 **길잡이**다. 규칙을 여기에 옮겨 적으면 정본이 둘이 되고, 한쪽만 고쳐졌을 때
어느 쪽이 맞는지 알 수 없게 된다. 실제 규칙은 두 곳에 산다:

- **제품·디자인 규칙** → `../09_MVP/docs/RULES.md` (상류 정본)
- **저장소 작업 규칙** → [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) (커밋·시크릿·의존성·생성물)
- **3단 파이프라인 동기화** (클로드 디자인 → 피그마 → 구현) → `docs/CONTRIBUTING.md` 「상류 동기화」.
  구현이 스펙과 어긋나야 하면 상류 `06_운영문서/OPEN-ISSUES.md` 에 제기한다 — 코드에 조용히 반영하지 않는다

아래는 **자주 어기게 되는 것 다섯 개**의 요약일 뿐이다. 판단이 갈리면 위 두 문서를 본다.

1. **색·크기·시간을 하드코딩하지 않는다.** 린터가 hex 를 막는다 — `src/design/` 을 쓴다
2. 글자색은 semantic 6종만 (`text.strong` `body` `caption` `legal` `accent` `onDark`).
   `primary #C2703D` 는 **장식 전용**이고 글자가 얹히는 면은 `primaryDeep` 이다
3. **선택 상태를 색만으로 표시하지 않는다** — 테두리 굵기(1→2px)와 글자 굵기를 함께 바꾼다
4. **오류·거부·실패는 한 줄 안내로 흡수한다** — 모달·재시도·경고 아이콘 금지.
   **숫자로 압박하지 않는다** — 진행률·연속 일수·점수·배지 금지
5. 폰트는 `fontFamily: "Pretendard-Bold"` 처럼 **파일 이름**으로 (Android 는 `fontWeight` 가 안 먹는다)

## 생성물 — 직접 고치지 말 것

- `src/design/theme.ts` ← 상류 `05_도구/lib.mjs`. `npm run sync:theme`
- `ios/` `android/` ← `app.config.ts`. `npx expo prebuild`

`src/design/tokens.mvp.ts` 는 **임시**다 — 상류가 semantic 6토큰을 `lib.mjs` 에
흡수하면 지운다. 오버라이드를 화면 코드에 흩지 않는다.

## BE 는 마지막에 붙인다 (2026-08-07 결정)

**화면 40장을 먼저 만들고 서버 연결은 맨 끝에 한다.** 그동안 데이터는
`src/mocks/sample.ts`(스키마 `meta.sampleData`)에서 오고, 화면은 그걸 직접
읽지 않고 **`src/features/<도메인>/model/` store 를 지난다.**

모양을 스키마(`momentory.schema.mvp.json`)대로 맞추는 것이 조건이다 — 그래야
서버가 붙을 때 store 안쪽만 바뀌고 화면은 그대로다. 화면이 데이터를 직접 들면
그때 컴포넌트를 다시 쓰게 된다. `Moment.syncState` 처럼 **스키마에 있는 필드는
지금 안 써도 타입에 둔다.**

## 지금 어디까지 왔나

**M0·M1 완료. M2(진입·온보딩)·M3(홈)·M4(회고)·M5-1·M5-2(보관함·일기 상세) 화면
완료 — 40장 중 36장.** 남은 화면 4장: **리포트 `W1` · 마이 `M1` `M2` `M3`**.
외부 연동(소셜 SDK · OS 권한 · BE · 영속 저장 · 계측)은 별개로 남아 있다.
지금 있는 것은 아래와 같다 — 문서의 목표 구조를 이미 있는 것으로 착각하지 말 것.

```
app/_layout.tsx  app/index.tsx (S0)  app/(auth)/login.tsx (S1)
app/(onboarding)/{_layout, welcome, nickname, profile, interests, rest, retro-time, calendar, done}.tsx
                  = 03 · 04 · 05-b · 06(+06-b·06-c) · 07 · 08 · 09 · 10(+10-b)
src/design/{theme.ts, tokens.mvp.ts}
src/components/primitives/{ScreenBackground, AppText, AppButton, Card,
                           InputRow, ProgressDots, BackChevron}.tsx
src/components/chat/{ChatLayout, BabaBubble, AnswerBubble, Avatar, TypingDots, ChipFlow}.tsx
src/components/onboarding/OnboardingTopBar.tsx   src/components/icons/LineIcons.tsx
app/(tabs)/{_layout, home}.tsx                    ← M3 `12`·`12-b`
src/components/common/{TabBar, TabScreen, EmotionPill}.tsx
src/features/home/                               ← 홈 화면 상태·UI
app/(tabs)/{_layout, home, archive}.tsx   = 12 · 12-b · A1 · A2 (한 파일이 두 상태씩)
app/diary/{_layout, [id]/index, [id]/edit}.tsx = A3 · A3-b · A3-c · A4
src/components/archive/{CalendarMonth, DiaryPreviewCard, EmotionFilter}.tsx
src/features/archive/model/archive.ts     ← 세는 것만. 연속 일수를 세지 않는다
app/home/{_layout, schedule/[id], schedule/new, moment/new}.tsx
                                          = 12-c · 12-e · 12-d — 투명 모달 시트
app/retro/{_layout, intro, confirm, emotion, talk, draft, done}.tsx = C1~C7 (회고 12장)
                                          talk = C4~C4-e · draft = C6·C6-b (세그먼트 두 면)
src/features/diary/model/diary.ts         ← 회고가 남기는 것: Diary + ActionCard
src/components/common/SegBar.tsx          ← 일기 두 면 (보관함 A3 도 쓴다)
src/components/chat/DirectionChip.tsx     ← C4-d 방향 칩 (대화의 경계선)
src/components/chat/ChatInput.tsx         ← .inp 알약 + .send (빠른 답변 칩 금지)
src/components/common/DirectionSheet.tsx  ← C4-c · C4-c2 방향 4줄
src/components/common/{TabBar, TabScreen, EmotionPill, Sheet, EmotionGrid, Toggle, RetroNav}.tsx
src/components/icons/LineIcons.tsx        ← 해·종·달·연필·체크 (이모지 금지)
src/features/home/{model/day.ts, ui/ScheduleRow.tsx}
src/mocks/sample.ts                       ← 데모 데이터 정본 (스키마 meta.sampleData)
src/lib/day.ts                            ← 날짜. 하루 경계 04:00 은 M3 에 들어온다
src/features/onboarding/model/{draft, completion}.ts ← 답안 초안 · 완료 플래그(진입 분기)
src/features/auth/model/auth.ts          ← M2-0 인증 부트스트랩 — hydrate·가드·fail-closed
src/lib/providers.tsx   ← Provider 는 여기. _layout.tsx 가 아니다
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

CI 는 `check:theme` · `typecheck` · `lint` · `test` · 시크릿 검사를 돈다.

다음으로 넘어가기 전에 닫혀야 하는 것:

| 막는 것 | 필요한 것 |
|---|---|
| M2 이후 | `docs/api/openapi.yaml` — BE 팀과 합의한 계약 + 멱등성 규약 |
| M3 (첫 로컬 쓰기) | `docs/DATA-SECURITY.md` — 민감 필드 저장 위치·암호화·삭제 보장 |

## 명령

```bash
npm start            npm run typecheck    npm run lint
npm run sync:theme   npm run check:theme
npm run android      # 공식 개발 환경인 dev client 빌드 — Expo Go 는 지원하지 않는다
```
