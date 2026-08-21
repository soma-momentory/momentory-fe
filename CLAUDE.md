# momentory-fe

모멘토리 앱의 React Native 프론트. **MVP 40화면**을 만든다 (2026-08-06 상류 v2 개정 — 30 → 40).

**이 저장소만으로 개발·검증이 전부 된다** — 화면 스펙·상태 기계·문안은 저장소 안
[`docs/spec/`](docs/spec/SNAPSHOT.md)(동결 스냅샷 · 직접 수정 금지), 시각 값과
화면 흐름은 [`docs/DESIGN.md`](docs/DESIGN.md)(디자인 SSOT)에 있다.
**상류 접근은 더 이상 전제하지 않는다** (2026-08-14 D8 — [`PLAN.md`](PLAN.md) §0).
재반입은 폐기됐고(`sync:theme` 은 2026-08-20 삭제), 규칙·값의 후속 결정은 이 저장소에서 한다.

> 🎨 **3세대 「Momentory DS」 전환이 끝났다** (2026-08-20 · `PLAN.md` A).
> **SSOT 는 [`docs/DESIGN.md`](docs/DESIGN.md) 하나다** (Wanted DS 구조 + Momentory 색).
> 화면 40장이 전부 3세대이고, 1·2세대 토큰과 반입 패키지는 지웠다.
>
> **`DESIGN.md` 가 우선이다**(결정 N0·N6) — `docs/spec/` 과 부딪히면 **문안까지 포함해**
> `DESIGN.md` 가 이긴다. 그래서 **확인 모달이 열렸고**(N2) `C1`·`A4` 가 사라졌다.
> ⚠ 단 「**오류**는 한 줄로 흡수 · 모달 금지」는 그대로다 — 모달은 되돌릴 수 없는
> **행동의 확인**에만 쓴다.
>
> ⚠ **`DESIGN.md` 가 말하지 않는 것은 `docs/spec/screens/` 에서 찾는다.** 시안은 화면
> 흐름과 시각을 정하지만 **화면별 문안 전부를 담고 있지는 않다** — 겹치면 시안이 이기고,
> 시안에 없으면 스펙이 유일한 출처다.
>
> ⚠ **반입 패키지(`*.dc.html` · 토큰 CSS · 아이콘 원본)는 지웠다**(A-18). 코드 주석에
> 남은 `Onboarding.dc.html` 같은 이름은 **그 판단이 어디서 왔는지의 출처 표시**이고,
> 파일은 더 이상 없다. 새 판단은 `DESIGN.md` 로 한다.
>
> ✅ **Phase 4-0 — 로그인 이관 완료 (2026-08-20)**. **기준 화면**이다: 여기서 정한 판정
> (`PLAN.md` A-7 표 — 워드마크 크기 · 마크 20 · 간격 · 문안 규칙)을 다음 화면들이 그대로 따른다.
> `SocialButton`·`GoogleMark`·`ds/color.ts` 의 `social` 이 함께 생겼다.
> **인증 로직은 손대지 않았다** — 기존 테스트 6개가 수정 없이 통과한다.
>
> ✅ **Phase 3 완료 (2026-08-20)** — 공용 컴포넌트 [`src/components/ds/`](src/components/ds/index.ts)
> 13개 + Wanted 아이콘 26개 + Google 마크. 화면은 이제 여기서 조립한다.
>
> ✅ **Phase 2 완료 (2026-08-20)** — 새 토큰 [`src/design/ds/`](src/design/ds/index.ts).
> **다크 모드는 넣지 않는다**(결정 N1). 대비 검수에서 **시안 값 여섯을 보정**했다 —
> `PLAN.md` A-5 표를 먼저 보고 쓴다.
>
> ✅ **Phase 1 완료 (2026-08-20)** — 도메인이 디자인에서 떨어졌다.
> `EmotionId`·감정 9종 이름의 정본은 이제 [`src/features/emotion/`](src/features/emotion/model/emotion.ts) 이고,
> `features/**`·`src/mocks/` 는 **`@/design/` 을 하나도 import 하지 않는다**(`features/*/ui/` 제외).
> 토큰에 섞여 있던 제품 규칙 셋(일정 5개 접기 · 「기타」 12자 · 일기 500자)도 도메인으로 옮겼다.

## 먼저 읽을 것 — 순서대로

**화면을 만들기 전에 반드시 본다.**

1. [`docs/spec/RULES.md`](docs/spec/RULES.md) — **1순위.** 범위 · 「원본과 다른 것」 표 · 불변 규칙 · 구현 순서
2. [`docs/spec/momentory.states.mvp.json`](docs/spec/momentory.states.mvp.json) — 상태 기계 7개. `states.<키>` 하나가 화면 하나
3. [`docs/spec/momentory.schema.mvp.json`](docs/spec/momentory.schema.mvp.json) — 엔티티 7개(`Report` 포함). `guard` 문장이 여기 필드로 번역된다
4. [`docs/spec/screens/<ID>.md`](docs/spec/screens/) — 화면별 스펙 (라우트 매핑: [`docs/PRODUCT.md`](docs/PRODUCT.md))
5. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 이 저장소의 기술 설계
6. [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 커밋 · 브랜치 · PR · 품질 게이트 · 시크릿 · 생성물

> ⚠ **쉼터는 범위에 들어왔다** (2026-08-14 D1) — 스펙 정본은
> [`docs/DESIGN.md`](docs/DESIGN.md) 「쉼터」다(상류 `R*` 아님 · 2세대 스냅샷은 A-19 에서 지웠다).
> 예외 화면(`E*` `X*`)은 여전히 범위 밖 — 마주치면 `PLAN.md` 에 결정을 기록하고 진행한다.
> 스펙 ID 가 겹치면(특히 `C4-b`) 항상 `docs/spec/` 것을 쓴다.

## 값을 찾는 순서 — Momentory DS 먼저 (2026-08-20 개정)

색·크기·반경·여백을 정할 때다. **위에서부터 보고, 없을 때만 아래로 내려간다.**

|     | 어디                                                 | 무엇                                                                            |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | [`docs/spec/screens/<ID>.md`](docs/spec/screens/)    | 그 화면의 규칙·**문안** — ⚠ `DESIGN.md` 와 겹치면 그쪽이 이긴다(N6)             |
| 2   | [`src/design/ds/`](src/design/ds/index.ts)           | **3세대 토큰 정본** — 코드에서 쓰는 값. `color` · `typography` · `metrics`      |
| 3   | [`docs/DESIGN.md`](docs/DESIGN.md)                   | **디자인 SSOT.** `ds/` 에 없는 값·규칙은 여기서 확인하고 `ds/` 에 이름을 만든다 |
| 4   | [`docs/spec/COMPONENTS.md`](docs/spec/COMPONENTS.md) | ⚠ **원본 기준.** 구조 참고용 — 배너를 먼저 읽는다                               |

**`ds/` 가 `DESIGN.md` 와 일부러 다른 자리가 있다** — 대비 검수에서 시안 값 여섯이
WCAG AA 미달이라 보정했다(`PLAN.md` A-5 표 · `ds/color.ts` 머리말). **특히 주 CTA 면은
`primary.heavy` 다** — 시안의 `#7C9E86` + 흰 글자는 2.91 이라 못 쓴다.
되돌리면 `ds/__tests__/contrast.test.ts` 가 깨진다.

**색은 여전히 하드코딩하지 않는다** — 린터가 `src/design/**` 밖의 hex 를 막는다.
새 색이 필요하면 `ds/` 에 **이름을 먼저 만들고** 쓴다.

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

- `docs/DESIGN.md` ← **디자인 SSOT.** 반입 스냅샷이었으나 패키지를 지우면서
  **이 저장소가 소유한다**(A-18) — 값·규칙이 바뀌면 여기를 고친다
- `docs/spec/**` ← 동결 스냅샷 — 직접 수정 금지
- `ios/` `android/` ← `app.config.ts`. `npx expo prebuild`

✅ **전환이 끝났다** (2026-08-20 · `PLAN.md` A-16). `theme.ts` · `tokens.mvp.ts` ·
`paper.ts` 와 `scripts/sync-theme.mjs`·`sync:theme`·`check:theme` 이 **전부 삭제됐다**.
이제 `src/design/` 에는 `ds/` 하나뿐이고, 화면은 전부 3세대다.

⚠ **디자인 파일에 제품 규칙을 넣지 않는다.** 토큰이 지워질 때 규칙이 조용히 사라진다 —
실제로 `tokens.mvp.ts` 안에 일정 접기(5) · 「기타」 12자 · 일기 500자가 섞여 있었고
2026-08-20 에 도메인으로 꺼냈다. 색·크기·시간만 `src/design/` 에 둔다.

## BE 는 마지막에 붙인다 (2026-08-07 결정)

> 🧹 **목 데이터를 전부 지웠다** (2026-08-21). `src/mocks/sample.ts` 와
> `features/*/data/sample*.ts` 셋이 사라졌다 — **화면이 그리는 값은 이제 서버에서
> 온 것뿐**이고, 서버가 주지 않는 것은 **비어 있다.**
>
> 지운 것과 그 자리에 남은 것:
>
> | 지운 샘플                                                      | 지금                                                                   |
> | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
> | 일기 12편 · 행동 카드 (보관함·쉼터·리포트)                     | 서버 `GET /diaries` — `useDiary.load()`                                |
> | 프로필 한 벌 (닉네임 「지현」 · 나이 · 관심사 · 캘린더 연결됨) | 서버 `GET /users/me` · 온보딩 완료 — 그전에는 **빈 값**                |
> | 순간 2개 (`Moment`)                                            | **없앴다** — 만드는 화면도 읽는 화면도 없다(타입만 남김)               |
> | 날씨 「맑음 · 27℃」                                            | **없앴다** — 계약에 날씨가 없다                                        |
> | 주간 해석 두 주치 (`W1`)                                       | **비어 있다** — 계약에 주간 리포트 엔드포인트가 없다. 세는 값은 나온다 |
> | 지난달 감정 집계 (`monthChange`)                               | **없앴다** — 부르는 화면이 없었다                                      |
>
> **화면 테스트가 쓰던 재료만** [`src/testing/fixtures.ts`](src/testing/fixtures.ts) 로
> 옮겼다 — 앱 코드가 그걸 import 하면 린터가 막는다(샘플이 조용히 되살아나는 길).
> 남은 도메인은 서버가 붙을 때까지 **빈 화면**이 정상이다.

**화면 40장을 먼저 만들고 서버 연결은 맨 끝에 한다**는 것이 원래 결정이었고, 그동안
데이터는 `src/mocks/sample.ts`(스키마 `meta.sampleData`)에서 왔다. 화면은 그때도
그걸 직접 읽지 않고 **`src/features/<도메인>/` 의 store 와 `data/`(repository·adapter)
경계를 지났다** — 그래서 샘플을 지울 때 **경계 안쪽만** 고치면 됐다.

모양을 스키마(`momentory.schema.mvp.json`)대로 맞추는 것이 조건이다 — 그래야
서버가 붙을 때 `data/` 안쪽만 바뀌고 화면은 그대로다. 화면이 데이터를 직접 들면
그때 컴포넌트를 다시 쓰게 된다. `Moment.syncState` 처럼 **스키마에 있는 필드는
지금 안 써도 타입에 둔다.** 날짜·시각은 `src/lib/clock.ts` 를 지난다 —
샘플 하루(2026-07-27)와 04:00 경계가 그 한 파일에 있다.

⚠ **인증 · 회고 대화 · 일정 · 일기 · 프로필이 붙었다** (2026-08-09 PR #46 부터).
**남은 것은 주간 리포트 해석 하나**이고 계약에 아직 엔드포인트가 없다 —
그 자리는 샘플로 메우지 않고 **비워 뒀다**(위 「목 데이터를 전부 지웠다」).
**서버 호출은 `src/lib/http.ts` 하나를 지난다** — `authedRequest` 가 Bearer 주입 ·
타임아웃 · 안전 파싱을 맡고 **던지지 않고 `{ ok, error }` 로 닫는다.** 응답의
형태 검증은 호출부(`data/` 어댑터) 몫이다. 다음 도메인을 붙일 때 **자기 `fetch`
래퍼를 만들지 않는다** — [`docs/TASKS.md`](docs/TASKS.md) 「둘이 부딪히는 곳」.

## 지금 어디까지 왔나

**정적 화면 40장이 전부 있다** (2026-08-07). 진입 2 · 온보딩 11 · 홈 5 · 회고 12 ·
보관함 6 · 리포트 1 · 마이 3. 화면 ID ↔ 라우트 매핑은 [`docs/PRODUCT.md`](docs/PRODUCT.md) 표가 정본이다.

⚠ **「화면 완료」와 「MVP 완료」는 다르다.** 남은 것은 **나머지 도메인의 BE 연결** ·
영속 저장(MMKV) · 소셜 SDK **나머지 둘**(카카오는 2026-08-07 연결 · 토큰 갱신은
2026-08-09 닫힘 — **HTTPS 만 대기**, [`DISCUSSION.md`](docs/DISCUSSION.md) §1-6) ·
OS 권한 중 **캘린더 연결**(알림은 2026-08-11 닫힘) · 계측 · 아웃박스 · 앱 잠금 게이트 ·
M6(invariants 전수 테스트 · E2E · 배포). 목록은 [`docs/TASKS.md`](docs/TASKS.md)
「화면 40장이 끝난 뒤 남은 것」에 있다.

**아직 갈 곳이 없는 줄은 눌리지 않게 둔다** — 연결 관리 · 약관 · 문의 · 회원 탈퇴.
눌리는데 아무 일도 없는 줄을 만들지 않는다(`TASKS.md` 「마이의 편집 경로」).
지금 있는 것은 아래와 같다 — 문서의 목표 구조를 이미 있는 것으로 착각하지 말 것.

```
app/_layout.tsx  app/index.tsx (S0)  app/(auth)/login.tsx (S1)
app/(onboarding)/{_layout, welcome, nickname, age, gender, interests, rest, retro-time, calendar, done}.tsx
                  = 03 · 04 · 05-a · 05-c · 06(+06-b·06-c) · 07 · 08 · 09 · 10(+10-b)
                  ← ⚠ 옛 `profile.tsx`(나이+성별 한 화면)가 **age · gender 둘로 갈렸다**
                    (2026-08-20 · 대화형은 질문 하나에 답 하나다 — PLAN.md A-9).
                    대화는 `features/onboarding/model/conversation.ts` 가 파생시키고
                    껍데기는 `components/onboarding/OnboardingChat` 하나다
app/(tabs)/{_layout, home, archive, report, my}.tsx = 12 · 12-b · A1 · A2 · W1 · M1 (한 파일이 두 상태씩)
app/home/{_layout, schedule/[id], schedule/new}.tsx
                                          = 12-c · 12-e — 투명 모달 시트
                                          (12-d 순간 입력은 2026-08-14 삭제 — PRODUCT.md #18)
app/retro/{_layout, intro, confirm, emotion, talk, draft, done}.tsx = C1~C7 (회고 12장)
                                          talk = C4~C4-e · draft = C6·C6-b (세그먼트 두 면)
app/diary/{_layout, [id]/index, [id]/edit}.tsx = A3 · A3-b · A3-c · A4
app/my/{_layout, profile, nickname, age, gender, interests, rest}.tsx
                                          = M3(목록) · M4~M8(항목별 수정)
                                          ← ⚠ 옛 `profile.tsx`(다섯 항목 일괄 편집)가
                                            **목록 + 다섯 라우트**로 갈렸다 (2026-08-20 ·
                                            PLAN.md A-10). 알림 설정은 화면이 아니라
                                            **시트**라 `app/(tabs)/my.tsx` 안에서 열린다
                                            (옛 `notify.tsx` 는 사라졌다)
src/design/ds/{color,typography,metrics,index}.ts
                                          ← **3세대 토큰 정본** — 여기만 hex 를 든다.
                                            다크 없음(N1) · 시안 값 여섯은 대비 보정됨
                                            (contrast.test.ts 가 고정한다)
src/design/{theme.ts, tokens.mvp.ts, paper.ts}
                                          ← 1·1.5·2세대. 안 옮긴 화면이 아직 쓴다 — 최종 삭제 대상
src/components/ds/{Text, Screen, GridBackground, Button, IconButton, SocialButton,
                   Card, TextField, Chip, TopNavigation, BottomNavigation,
                   BottomSheet, Modal}.tsx + icons/{Icon.tsx, paths.ts, GoogleMark.tsx}
                                          ← **3세대 공용 컴포넌트.** 새 화면은 여기서 조립한다.
                                            아이콘 26개는 Wanted 세트를 그대로 옮긴 것 —
                                            **없는 글리프를 만들지 않는다**(person 없음 → nav-my-page).
                                            Slider·WheelPicker·Calendar·Toast·Menu 는
                                            **쓰는 화면을 만들 때** 함께 만든다
src/components/primitives/{ScreenBackground, AppText, AppButton, Card,
                           InputRow, ProgressDots, BackChevron}.tsx
                                          ← 1·2세대 프리미티브. 안 옮긴 화면이 쓴다 — 삭제 대상
src/components/chat/{ChatLayout, BabaBubble, AnswerBubble, Avatar, TypingDots, ChipFlow,
                     DirectionChip, ChatInput, MeasureInput}.tsx
                                          ← 방향 칩 = 대화의 경계선 · 빠른 답변 칩 금지.
                                            MeasureInput = 서버가 ui:"measure" 를 줄 때의 눈금
src/components/common/{TabBar, TabScreen, EmotionPill, Sheet, EmotionGrid, Toggle, RetroNav,
                       SegBar, DirectionSheet, SectionLabel, ConfirmCard}.tsx
src/components/onboarding/{OnboardingTopBar, OtherRow}.tsx
                                          ← OtherRow = 「기타」 인라인 입력 줄.
                                            06-b · 07 · M2 가 나눠 쓴다
src/components/my/{SettingRow, BasicInfoEditor}.tsx
                                          ← 설정 한 줄(⚠ 공용 `ListCell` 이 오면 갈아탄다) +
                                            M4~M8 이 공유하는 껍데기(상단바 · 저장 · 실패 한 줄)
src/components/icons/LineIcons.tsx        ← 해·종·달·연필·체크 (이모지 금지)
src/components/archive/{CalendarMonth, DiaryPreviewCard, EmotionFilter}.tsx
src/components/diary/{ActionRow, ActionCardSection, DiaryBabaFace}.tsx ← C6-b·A3 공유
src/components/report/{WeeklySummaryCard, WeeklyEmotionGrid, ActionInsightCard}.tsx
src/features/emotion/model/emotion.ts     ← **감정 9종의 도메인 정본** — id·이름·EmotionId.
                                            **색은 여기 두지 않는다**(디자인 몫 · 세대마다 바뀐다).
                                            번호는 서버 enum 두 벌(retro EMOTION_KEYS ·
                                            home SCHEDULE_EMOTIONS)과 맞물려 있다 —
                                            바꾸면 그 두 표를 함께 고친다
src/features/home/{model/{day,types}.ts, data/scheduleApi.ts, ui/ScheduleRow.tsx}
                                          ← day.ts 가 MAX_VISIBLE_SCHEDULES(5) 도 든다 —
                                            「5개까지 펼치고 접는다」는 디자인이 아니라 제품 규칙
src/features/retro/{model/retro.ts, data/retroApi.ts}
                                          ← 대화는 서버가 주도한다 — store 는 시작 감정 ·
                                            세션 id · 버블 · 서버의 마지막 응답만 든다.
                                            고정 대사(FOLLOW_UPS·DRAFT_DEMO)는 사라졌다
src/features/diary/{model/{diary,types,selectors,deleteToast}.ts,
                    data/{diaryApi,deletedCardStore}.ts}
                                          ← 회고가 남기는 것: Diary + ActionCard.
                                            타입·selector·서버 변환이 store 와 분리돼 있다.
                                            deleteToast = 일기·행동카드가 **같은 삭제 문안**을 쓴다.
                                            deletedCardStore = **지운 행동카드의 묘비**(기기) —
                                            서버에 카드 삭제 계약이 없어 지운 id 를 남기고
                                            `load()` 가 걸러낸다. 못 남기면 삭제를 되돌린다
                                            (PRODUCT.md 상류와 차이 25). 서버에 삭제가
                                            생기면 이 파일이 사라진다
src/features/archive/model/archive.ts     ← 세는 것만. 연속 일수를 세지 않는다
src/features/report/{model/report.ts, data/reportRepository.ts} ← 주간 집계 · 해석 공급 경계
                                          ← 해석은 **비어 있다** — 계약에 주간 리포트가 없다
src/features/my/model/{settings,stats,reminders,basicInfo}.ts
                                          ← 알림/프로필 설정 · 전체 기간 집계 ·
                                            **설정 ↔ OS 예약 화해**. store 는 순수하게
                                            두고 reminders 가 구독해서 예약을 맞춘다 —
                                            화면이 예약을 부르지 않는다(값이 바뀌는
                                            자리가 넷이라 하나를 빠뜨린다).
                                            알림 문안도 여기 산다.
                                            basicInfo = **한 항목만 고쳐도 통째로 보낸다** —
                                            서버가 덮어쓰는 PUT 이라 M4~M8 이 각자
                                            나머지를 조립하면 하나가 조용히 지워진다
src/features/onboarding/{model/{draft, completion, options, submit}.ts,
                         data/{optionsApi, completeOnboardingApi}.ts}
                                          ← 답안 초안 · 완료 플래그(진입 분기) ·
                                            선택지(04·05-b·06·07 · M2 가 같은 목록을 본다) ·
                                            **서버 커밋**(10 과 M2 가 같은 PUT 을 지난다).
                                            관심사·성별·쉬는 방법은 **서버 코드를 그대로 든다** —
                                            우리 id 로 옮기면 서버가 새로 넣은 항목이
                                            조용히 사라진다(ARCHITECTURE §4).
                                            못 받으면 대역으로 그린다 — 온보딩은 멈추지 않는다.
                                            실패 문구는 submit.ts 한 곳(10·M2 가 나눠 쓴다)
src/features/auth/{model/auth.ts, data/{kakaoSdk,kakaoAuthApi,reissueApi,logoutApi}.ts}
                                          ← M2-0 부트스트랩(hydrate·가드·fail-closed) +
                                            M2-1 카카오 로그인 + 만료 토큰의 조용한 갱신
                                            (refresh 는 회전한다) + 로그아웃(서버 폐기).
                                            카카오 토큰은 서버로 한 번
                                            보내고 버린다 — SecureStore 에는 모멘토리 토큰만.
                                            로그아웃이 비우는 목록은 clearUserScopedStores 하나
src/testing/fixtures.ts                   ← **테스트 전용 고정값.** 옛 `src/mocks/sample.ts`
                                            자리다(2026-08-21 삭제) — 화면이 보는 값은 이제
                                            서버에서만 온다. 앱 코드가 import 하면 린터가 막는다
src/lib/providers.tsx   ← Provider 는 여기. _layout.tsx 가 아니다
src/lib/http.ts         ← 인증이 필요한 서버 호출의 단일 통로 — Bearer 주입 · 타임아웃 ·
                          안전 파싱. 던지지 않고 { ok, error } 로 닫는다.
                          형태 검증은 호출부(data/ 어댑터) 몫 — 각자 fetch 래퍼 금지
src/lib/config.ts       ← 서버 주소·앱 키의 단일 공급자(.env → app.config extra).
                          화면·repository 에 IP 를 적지 않는다
plugins/withInsecureDevApi.ts ← 개발 서버가 평문 HTTP 인 동안만 그 호스트에 예외.
                          https 로 바꾸면 아무것도 하지 않는다 (docs/SETUP.md §6)
src/lib/notifications.ts ← OS 알림의 단일 통로 — 권한 · 예약 화해. 던지지 않는다.
                          **문안을 모른다**(features/my/model/reminders.ts 몫) ·
                          배지 숫자를 올리지 않는다 · 전부 로컬 알림이다
src/lib/calendar.ts     ← 기기 캘린더의 단일 통로 — 권한 · 범위 조회 ·
                          externalId 정규화. 던지지 않는다(실패하면 빈 목록).
                          **아직 서버로 가지 않는다** — 계약에 externalId·source·
                          hidden 이 없다(DISCUSSION §1-4). 플랫폼 차이는 여기서만
src/lib/toast.ts        ← 토스트의 단일 통로 — 「끝난 일을 알리는 한 줄」이 뜨는 자리 하나.
                          `components/ds/ToastHost` 가 `providers.tsx` 에서 라우트 위에
                          그린다. **문안을 모른다**(삭제 문안은
                          `features/diary/model/deleteToast.ts`) · 큐를 두지 않는다
src/lib/clock.ts        ← 시각의 단일 공급자 — SampleClock(2026-07-27) ·
                          SystemClock(04:00 하루 경계) · fixedClock(테스트)
src/lib/day.ts          ← 날짜 표기. 계산은 clock.ts 가 한다
src/lib/time.ts         ← "21:30" ↔ "밤 9:30" — 시각을 말하는 곳은 전부 이걸 쓴다
```

설치된 것: expo-router · expo-dev-client · expo-font · react-native-svg · safe-area-context ·
**Zustand** · **expo-secure-store** · **@react-native-community/datetimepicker**
(08 OS 피커) · **@react-native-seoul/kakao-login** + **expo-build-properties**
(카카오 로그인) · **expo-notifications**(회고 시간 알림 — 전부 로컬) ·
**expo-calendar**(`09` 기기 캘린더 — **읽기만**)
— 넷 다 네이티브라 **dev client 재빌드 필요**.
**아직 없는 것: TanStack Query · MMKV · Reanimated · MSW.**
도입 시점은 `docs/ARCHITECTURE.md §1` 「도입 예정」 표에 있다.

> 진입·온보딩 13장은 **v2 기준으로 맞춰져 있다**(2026-08-07 따라잡기 완료).
> 남은 것(브랜드 마크 · 계측 · **앱을 다시 열었을 때의 홈 분기 영속화** 등)은
> `docs/TASKS.md` 「잔여」 절에 있다. 진입 분기 자체는 `app/index.tsx` 에 있고
> (세션 없음 → 로그인 · 온보딩 전 → 온보딩 · 완료 → 홈), **완료 플래그가 아직
> 메모리라 앱을 껐다 켜면 온보딩을 다시 본다**(`features/onboarding/model/completion.ts`).

CI 와 로컬 검증의 정본은 [`docs/CONTRIBUTING.md` 「품질 게이트」](docs/CONTRIBUTING.md)다.

다음으로 넘어가기 전에 닫혀야 하는 것:

| 막는 것           | 필요한 것                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| 아웃박스(M3-3)    | 멱등성 규약 — `DISCUSSION.md` §1-1. 계약의 **모양**은 닫혔다                                                        |
| M3 (첫 로컬 쓰기) | [`docs/DATA-SECURITY.md`](docs/DATA-SECURITY.md) ✅ 초안 — **팀 결정 둘**(§5-1 나이·성별 · §5-2 감정 동의)만 남았다 |

서버 API 계약은 [`docs/api/openapi.json`](docs/api/README.md) 에 있다 —
개발 서버에서 받은 **반입 스냅샷**이라 직접 고치지 않는다(`npm run sync:api`).

## 명령

```bash
npm start            npm run typecheck    npm run lint
npm run test         npm run format:check
npm run sync:api     # 서버 OpenAPI 계약 재반입 — docs/api/README.md
npm run android      # 공식 개발 환경인 dev client 빌드 — Expo Go 는 지원하지 않는다
```
