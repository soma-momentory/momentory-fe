# momentory-fe

모멘토리 앱의 React Native 프론트. 상류 MVP 는 **40화면**이었다 (2026-08-06 v2 개정 — 30 → 40).
그 뒤 **회고 채팅 v2**(2026-08-28 · `C1`·`C3` 가 사라지고 행동카드가 바람카드로)와
**쉼터**(탭 하나 + 감각연못)가 들어오면서 **화면 ID 와 라우트가 더는 1:1 이 아니다.**
지금 있는 것은 **라우트 31개**이고(아래 「지금 어디까지 왔나」), 화면 ID ↔ 라우트
매핑의 정본은 [`docs/PRODUCT.md`](docs/PRODUCT.md) 표다.

> 📌 **2026-09-12 — BE(`momentory-be` `d456a98`)와 FE(`80d1b89`) 코드를 대조해 문서를 한 바퀴 맞췄다.**
> 그 대조에서 바뀐 사실 여덟(자세한 것은 각 문서):
>
> | 무엇                | 지금                                                                                                                                             |
> | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
> | 회고                | **v2** — 일기 작성 → 분기점 → 감정 탐색. 시작 감정을 고르지 않는다(`C3` 삭제)                                                                    |
> | 감정                | **10종** (화남 9 · 답답함 10 분리 · 긍정→부정 재번호) — 9종이라 적힌 문서는 낡은 것                                                              |
> | 탭                  | **5칸** — 홈 · 쉼터 · 보관함 · 리포트 · 마이                                                                                                     |
> | 하루 경계           | **FE·BE 둘 다 04:00 KST** (BE `DayBoundary` · `#45`) — 「자정~4시가 갈린다」는 옛 서술이다                                                       |
> | 행동(바람)카드 삭제 | **서버 계약이 생겼다** — `DELETE /api/v1/action-cards/{id}`. 기기 묘비(`deletedCardStore`) 삭제                                                  |
> | 온보딩 완료 플래그  | **서버가 정본** — `GET /api/v1/users/me`. 껐다 켜도 온보딩이 되풀이되지 않는다                                                                   |
> | 계측                | **Amplitude 가 main 에 있다** — `src/features/analytics/` · [`docs/ANALYTICS.md`](docs/ANALYTICS.md)                                             |
> | 출시                | 스토어 제출 이력이 있다 — iOS `buildNumber 7` · Android `versionCode 10`(1.3.0 · 2026-10-14 · 둘 다 `app.config.ts` · 이력은 `docs/SETUP.md` §8) |

**이 저장소만으로 개발·검증이 전부 된다** — 화면 스펙·상태 기계·문안은 저장소 안
[`docs/spec/`](docs/spec/SNAPSHOT.md)(동결 스냅샷 · 직접 수정 금지), 시각 값과
화면 흐름은 [`docs/DESIGN.md`](docs/DESIGN.md)(디자인 SSOT)에 있다.
**상류 접근은 더 이상 전제하지 않는다** (2026-08-14 D8 — [`PLAN.md`](PLAN.md) §0).
재반입은 폐기됐고(`sync:theme` 은 2026-08-20 삭제), 규칙·값의 후속 결정은 이 저장소에서 한다.

> 🎨 **3세대 「Momentory DS」 전환이 끝났다** (2026-08-20 · `PLAN.md` A).
> **SSOT 는 [`docs/DESIGN.md`](docs/DESIGN.md) 하나다** (Wanted DS 구조 + Momentory 색).
> 화면이 전부 3세대이고, 1·2세대 토큰과 반입 패키지는 지웠다.
> 그 뒤에 들어온 것(카피바라·조약돌·감각연못 일러스트)도 전부 `DESIGN.md` 에 적혀 있다.
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
> `EmotionId`·감정 이름(**v2 부터 10종**)의 정본은 이제 [`src/features/emotion/`](src/features/emotion/model/emotion.ts) 이고,
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
> | 지운 샘플                                                      | 지금                                                                        |
> | -------------------------------------------------------------- | --------------------------------------------------------------------------- |
> | 일기 12편 · 행동 카드 (보관함·쉼터·리포트)                     | 서버 `GET /diaries` — `useDiary.load()`                                     |
> | 프로필 한 벌 (닉네임 「지현」 · 나이 · 관심사 · 캘린더 연결됨) | 서버 `GET /users/me` · 온보딩 완료 — 그전에는 **빈 값**                     |
> | 순간 2개 (`Moment`)                                            | **없앴다** — 만드는 화면도 읽는 화면도 없다(타입만 남김)                    |
> | 날씨 「맑음 · 27℃」                                            | **없앴다** — 계약에 날씨가 없다                                             |
> | 주간 해석 두 주치 (`W1`)                                       | 서버 `GET /reports/weekly` — 2026-08-24 에 붙었다(그전까지 **비어 있었다**) |
> | 지난달 감정 집계 (`monthChange`)                               | **없앴다** — 부르는 화면이 없었다                                           |
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

⚠ **도메인이 전부 붙었다** — 인증(소셜 셋·갱신·로그아웃·탈퇴) · 온보딩 · 일정 ·
기기 캘린더 화해 · 회고 대화(v2) · 일기 · 바람카드(수정·완료·삭제) · 프로필 · 주간 리포트
(2026-08-09 PR #46 부터 · 리포트는 08-24 · 구글은 08-25 · 회고 v2 는 08-28).
**화면이 읽는 도메인은 전부 서버가 정본이다.** 계약에 있는데 아직 안 붙인 것은
여섯뿐이다(하루 메모 셋 · 단건 조회 셋 — [`docs/api/README.md`](docs/api/README.md)).
주간 리포트는 `GET /reports/weekly` 한 번이 마음 일곱 칸 · 요약 멘트 · 일정 · 바람카드 ·
일기 셈을 한 벌로 준다 — 화면은 **아무것도 세지 않는다**.
**서버 호출은 `src/lib/http.ts` 하나를 지난다** — `authedRequest` 가 Bearer 주입 ·
타임아웃 · 안전 파싱을 맡고 **던지지 않고 `{ ok, error }` 로 닫는다.** 응답의
형태 검증은 호출부(`data/` 어댑터) 몫이다. 다음 도메인을 붙일 때 **자기 `fetch`
래퍼를 만들지 않는다** — [`docs/TASKS.md`](docs/TASKS.md) 「둘이 부딪히는 곳」.

## 지금 어디까지 왔나

**화면은 전부 있고, 도메인도 전부 서버에서 온다** (2026-09-12 대조).
라우트 31개 — 진입 2 · 온보딩 9 · 탭 5 · 홈 시트 2 · 회고 4 · 일기 1 · 쉼터 2 · 마이 6.
화면 ID ↔ 라우트 매핑은 [`docs/PRODUCT.md`](docs/PRODUCT.md) 표가 정본이다.
검증은 **76 스위트 / 1,137 테스트**가 통과하는 상태다(2026-09-22).

⚠ **「화면 완료」와 「MVP 완료」는 다르다.** 붙은 것과 남은 것:

| 붙었다                                                                                   | 남았다                                                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 소셜 셋 다 실제 로그인 (카카오 08-07 · 애플 08-24 · 구글 08-25) · 갱신 · 로그아웃 · 탈퇴 | 애플 `.p8` — 그전까지 **탈퇴가 연결 해제 없이** 지나간다      |
| HTTPS (`https://api.momentory.co.kr` · 08-25)                                            | 영속 저장(MMKV) — 회고·온보딩 초안이 아직 메모리다            |
| 온보딩 · 일정 · 캘린더 화해 · 회고 v2 · 일기 · 바람카드 · 주간 리포트 · 프로필           | 아웃박스(M3-3) — 멱등성 규약이 서버에 없다(`DISCUSSION` §1-1) |
| OS 권한 둘 다 (알림 08-11 · 캘린더 08-20 — 읽고 서버로 화해)                             | 회고 **재개**(§1-2) · 마이 전체 기간 집계(계약 없음)          |
| 계측 (Amplitude · 09-05 · main)                                                          | 앱 잠금 게이트 · M6(invariants 전수 · E2E · 배포)             |

목록의 정본은 [`docs/TASKS.md`](docs/TASKS.md) 「화면 40장이 끝난 뒤 남은 것」이다.

**아직 갈 곳이 없는 줄은 눌리지 않게 둔다** — 지금 남은 것은 **연결 관리** 하나다.
눌리는데 아무 일도 없는 줄을 만들지 않는다(`TASKS.md` 「마이의 편집 경로」).
⚠ **회원 탈퇴는 2026-08-23 에 붙었다**(`DELETE /api/v1/users/me` · 확인 시트에서
「회원탈퇴」를 따라 써야 실행된다).
⚠ **약관·문의는 2026-08-21 에 갈 곳이 생겼다** — 랜딩 페이지의 웹 문서를 앱 안
브라우저로 연다(`src/lib/links.ts` · `TASKS.md` 「2026-08-21 · 약관·문의」).
지금 있는 것은 아래와 같다 — 문서의 목표 구조를 이미 있는 것으로 착각하지 말 것.

```
app/_layout.tsx  app/index.tsx (S0)  app/(auth)/login.tsx (S1)
app/(onboarding)/{_layout, welcome, nickname, age, gender, interests, rest, retro-time, calendar, done}.tsx
                  = 03 · 04 · 05-a · 05-c · 06(+06-b·06-c) · 07 · 08 · 09 · 10(+10-b)
                  ← 옛 `profile.tsx`(나이+성별 한 화면)가 **age · gender 둘로 갈렸다**
                    (2026-08-20 · 대화형은 질문 하나에 답 하나다 — PLAN.md A-9).
                    대화는 `features/onboarding/model/conversation.ts` 가 파생시키고
                    껍데기는 `components/onboarding/OnboardingChat` 하나다
app/(tabs)/{_layout, home, rest, archive, report, my}.tsx
                  = 12 · 12-b · R1 · A1 · A2 · W1 · M1 (+ 알림 설정 시트)
                  ← **탭은 다섯이다**(홈 · 쉼터 · 보관함 · 리포트 · 마이).
                    탭바는 레이아웃이 아니라 화면이 그린다(`components/ds/TabScreen`) —
                    배경 그라디언트가 탭바 뒤까지 이어져야 해서다
app/home/{_layout, schedule/[id], schedule/new}.tsx
                  = 12-c · 12-e — 투명 모달 시트
                  (12-d 순간 입력은 2026-08-14 삭제 — PRODUCT.md #18)
app/retro/{_layout, confirm, talk, draft, done}.tsx
                  = C2 · C4* · C6 · C7 — **회고 채팅 v2** (2026-08-28)
                  ← `intro`(C1)·`emotion`(C3) 은 **없다**: v2 는 시작 감정을 묻지 않고
                    일기 작성부터 연다. talk 하나가 세 국면(일기 작성 → 분기점 →
                    감정 탐색)을 다 그린다 — 무엇을 그릴지는 서버의 `phase` 가 정한다
app/diary/{_layout, [id]/index}.tsx = A3 · A3-c
                  ← `[id]/edit`(A4)은 2026-08-20 에 지웠다(DESIGN.md N2 · PRODUCT.md #24·26)
app/rest/{_layout, cards/index, sense-pond, worry-box, worries, treasure-box, treasures, body-release, records}.tsx
                  = R2(날짜별 바람카드) · 감각연못 · 걱정상자(+ 맡겨둔 걱정) · 오늘의 보물함(+ 지난 보물) · 몸에 힘 빼기
                    · 쉼터별 이용 기록(`?content=`)
                  ← 쉼 콘텐츠 넷이 모두 화면을 가졌다(2026-10-05). 쓴 글을 서버에 남기는 것은 보물함
                    (`features/rest/data/treasureApi.ts` · `/api/v1/treasures`)과 걱정상자에서
                    **맡겨둔** 걱정(`worryApi.ts` · `/api/v1/worries` · 2026-10-13) 둘이다.
                    나갈 때 기분 쪽지 · 이용 기록은 넷 공통이다(2026-10-08 · `MoodExit` ·
                    `useRestRecord` · `/api/v1/rest-records` · DESIGN.md 「쉼 콘텐츠 공통 규칙」 7-1)
app/my/{_layout, profile, nickname, age, gender, interests, rest, inquiry}.tsx
                  = 기본 정보 목록 + 항목별 수정 다섯 + 문의하기(2026-10-13 · 그 전엔 Notion 폼 ·
                    `POST /api/v1/inquiries` · 답변은 메일로 · 관리 화면 없이 개발자가 DB 에서 읽는다)
                  ← ⚠ **코드 주석의 `M3`~`M8` 은 스펙 번호가 아니다.** 스펙(`spec/screens/`)은
                    M1·M2(회고 프로필)·M3(알림 설정) 셋뿐이고, 목록+다섯 라우트는 구현이
                    나눈 것이다(2026-08-20 · PLAN.md A-10). 알림 설정은 화면이 아니라
                    **시트**라 `app/(tabs)/my.tsx` 안에서 열린다
src/design/ds/{color,typography,metrics,pond,index}.ts
                                          ← **토큰 정본** — 여기만 hex 를 든다.
                                            다크 없음(N1) · 시안 값 여섯은 대비 보정됨
                                            (contrast.test.ts 가 고정한다) ·
                                            `pond.ts` 는 감각연못 장면 전용 값
src/components/ds/                        ← **공용 컴포넌트.** 새 화면은 여기서 조립한다
  Text Screen GridBackground Button IconButton SocialButton Card TextField SearchField
  Chip ChoiceGrid ListCell SectionHeader TopNavigation BottomNavigation TabScreen
  BottomSheet Modal Menu Toast ToastHost Spinner Slider WheelPicker Calendar
  ViewSwitcher SelectLift EmotionDot EmotionPebble EmotionSticker WeekEmptyDot
  ChatBubble ChatDock ChatScaffold
  icons/{Icon.tsx, paths.ts, GoogleMark.tsx}
                                          ← 아이콘은 Wanted 세트를 그대로 옮긴 것 —
                                            **없는 글리프를 만들지 않는다**(person 없음 → nav-my-page).
                                            채팅 3종(ChatBubble·ChatDock·ChatScaffold)이
                                            온보딩과 회고를 함께 덮는다 — 옛 `components/chat/`
                                            `components/common/` `components/primitives/` 는 없다
src/components/onboarding/{OnboardingChat, QuickReplies, OtherReplyInput, SkipButton}.tsx
src/components/my/BasicInfoEditor.tsx     ← 기본 정보 다섯 화면이 공유하는 껍데기
                                            (상단바 · 저장 · 실패 한 줄)
src/components/archive/{DayScheduleList, DiaryPreviewCard, EmotionFilter}.tsx
src/components/diary/{ActionCardSection, DiaryEmotionRow, WishCardFields}.tsx
                                          ← WishCardFields = 쉼터(R2)와 일기 상세(A3)가
                                            **같은 항목·같은 말**로 바람카드를 그린다
src/components/report/{WeekMoodSummary, WeekEmotionCard, WeekEmotionStack, WeekGround,
                       WeekWishCard, WeekCountList, WeekPickerSheet}.tsx
                                          ← 한 주 요약 한 문장(카드가 아니다 · 날짜 줄 아래) ·
                                            감정 더미 일곱(하루의 감정을 쌓는다 · WeekGround 가
                                            그 아래 모래 언덕을 깐다) ·
                                            바람카드(찾은 바람 알약 + 실천한 것) ·
                                            이번 주 기록(일정·일기 셈).
                                            **제목은 감정 카드에만 둔다**(2026-09-12) —
                                            나머지는 첫 줄이 곧 제 이름이다.
                                            비율(도넛·%)을 만들지 않는다 — 세는 값은 서버 것이다
src/components/rest/{RestActionCard, RestCardPressable, RestContentGrid}.tsx + pond/
                                          ← pond/ 는 감각연못 장면 조각(배경·수면·물결·
                                            감각 판·카피바라·「꾸욱」). 판정은 그리지 않는다
src/features/emotion/model/emotion.ts     ← **감정 10종의 도메인 정본** — id·이름·EmotionId.
                                            **색은 여기 두지 않는다**(디자인 몫).
                                            번호는 서버 enum 두 벌과 맞물려 있다 —
                                            retro `EMOTION_KEYS`(소문자 키)와 home
                                            `SCHEDULE_EMOTIONS`(대문자). ⚠ 일정 enum 은
                                            아직 `ANGRY_FRUSTRATED` 하나라 9·10 이 같은 코드다
src/features/home/{model/{day,dayRollover,types}.ts, data/scheduleApi.ts, ui/*}
                                          ← day.ts 가 MAX_VISIBLE_SCHEDULES(5) 도 든다 —
                                            「5개까지 펼치고 접는다」는 디자인이 아니라 제품 규칙.
                                            dayRollover = 04:00 에 하루가 넘어갈 때 하는 일
src/features/retro/{model/retro.ts, data/retroApi.ts, ui/{RetroBaba,RetroRug}.tsx}
                                          ← **대화는 서버가 주도한다** — store 는 세션 id ·
                                            버블 · 서버의 마지막 응답 · 완료 시 일기와
                                            **바람카드**만 든다. 시작 감정(`startEmotion`)은
                                            v2 에서 사라졌다
src/features/diary/{model/{diary,types,selectors,deleteToast}.ts, data/diaryApi.ts}
                                          ← 회고가 남기는 것: Diary + ActionCard(바람카드).
                                            deleteToast = 일기·바람카드가 **같은 삭제 문안**을 쓴다.
                                            ⚠ 옛 `deletedCardStore`(지운 카드의 기기 묘비)는
                                            **사라졌다** — 서버에 삭제 계약이 생겼다(2026-08-24)
src/features/calendar/{model/*, data/{calendarSyncApi,syncStateStore}.ts}
                                          ← 기기 캘린더 ↔ 서버 **화해**. 읽어 펴고(expand)
                                            좁히고(normalize) 해시로 「보낼 것이 있나」를
                                            서버에 묻지 않고 판정한다. 언제 도는지는
                                            foregroundSync 하나가 안다
src/features/archive/model/{archive,monthSchedules}.ts
                                          ← 세는 것만. 연속 일수를 세지 않는다
src/features/report/{model/{report,weeklyReport}.ts, data/weeklyReportApi.ts}
                                          ← 주간 리포트는 `GET /reports/weekly` 한 번이
                                            일곱 칸 · 요약 멘트 · 일정 · 카드 · 일기 셈을
                                            한 벌로 준다 — 화면은 **아무것도 세지 않는다**.
                                            report.ts 에 남은 것은 홈의 이번 주 감정 줄 계산뿐.
                                            **리포트는 처음부터 열려 있다**(PRODUCT.md 32)
src/features/rest/model/{cards,contents,sensePond}.ts
                                          ← 쉼터가 보는 것(바람카드) · 쉼 콘텐츠 넷 ·
                                            감각연못 진행(3-2-1)
src/features/my/{model/{settings,reminders,basicInfo}.ts, ui/ReminderRoute.tsx}
                                          ← 알림/프로필 설정 · **설정 ↔ OS 예약 화해** ·
                                            기본 정보(한 항목만 고쳐도 **통째로 보낸다** —
                                            서버가 덮어쓰는 PUT 이라 · 알림 시트도 같은 길) ·
                                            알림을 누르면 부른 화면으로 옮긴다
src/features/onboarding/{model/{draft,completion,options,conversation,submit}.ts,
                         data/{optionsApi,completeOnboardingApi}.ts}
                                          ← 답안 초안 · 완료 플래그(진입 분기 · **정본은 서버**) ·
                                            선택지(**서버 코드를 그대로 든다**) · 대화 파생 ·
                                            서버 커밋(온보딩과 마이가 같은 PUT 을 지난다)
src/features/auth/{model/auth.ts,
                   data/{kakaoSdk,kakaoAuthApi,appleSdk,appleAuthApi,googleSdk,googleAuthApi,
                         loginSession,reissueApi,logoutApi,meApi,withdrawApi}.ts}
                                          ← 부트스트랩(hydrate·가드·fail-closed) · 소셜 셋 ·
                                            조용한 갱신(refresh 회전) · 로그아웃(서버 폐기) ·
                                            `GET /users/me`(온보딩 완료의 정본) · 탈퇴.
                                            소셜 토큰은 서버로 한 번 보내고 버린다 —
                                            SecureStore 에는 모멘토리 토큰만.
                                            loginSession = 셋의 공통 전송·응답 검증,
                                            교환 뒤(저장·플래그·배웅)는 adoptSession 하나.
                                            애플: identityToken 하나 + nonce(해시는 애플로 ·
                                            원문은 서버로) · 탈퇴 revoke ⛔ `.p8` 대기.
                                            구글: idToken 하나 · **nonce 가 없다**(무료 모듈에
                                            넘길 자리가 없어 서버가 aud + azp 로 조인다) ·
                                            탈퇴 시 연결 해제는 앱이 한다(revokeAccess)
src/features/analytics/{index,client,amplitude,events,observation,
                        AnalyticsObserver,AnalyticsResource}.tsx
                                          ← **계측의 단일 통로**(2026-09-05 · Amplitude).
                                            키가 비면 꺼진다 · 개발 빌드는 기본 차단.
                                            **본문·감정·이름을 보내지 않는다** — 허용 목록을
                                            타입과 런타임 둘로 막는다(`events.ts`).
                                            사전은 `docs/ANALYTICS.md`
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
                          ⚠ **서버로 간다**(2026-08-20) — `POST /schedules/sync` 화해.
                          플랫폼 차이는 여기서만
src/lib/toast.ts        ← 토스트의 단일 통로 — 「끝난 일을 알리는 한 줄」이 뜨는 자리 하나.
                          `components/ds/ToastHost` 가 `providers.tsx` 에서 라우트 위에
                          그린다. **문안을 모른다**(삭제 문안은
                          `features/diary/model/deleteToast.ts`) · 큐를 두지 않는다
src/lib/links.ts        ← 앱 밖 웹 문서의 단일 통로 — **주소를 아는 곳은 여기 하나다**
                          (약관 · 개인정보 처리방침). `openBrowserAsync` 로
                          **앱 안에서** 연다(앱을 떠나면 로그인 흐름이 끊긴다) ·
                          던지지 않는다. 화면은 `"terms"` 같은 이름만 안다
src/lib/appState.ts     ← 앱이 **앞으로 돌아온 순간**의 단일 통로 — `onForeground`.
                          「백그라운드였다가 돌아왔다」를 어떤 상태 전이로 아는지는
                          여기서만 안다(iOS 는 inactive 를 거친다). 캘린더 화해가
                          이걸 타고 돈다(`features/calendar/model/foregroundSync.ts`)
src/lib/dayChange.ts    ← **하루가 넘어간 순간**(04:00)의 단일 통로 — `onDayChange`.
                          켠 채로 넘기면 타이머가, 백그라운드에서 넘어갔으면 복귀가
                          잡는다(둘 다 있어야 한 쪽을 안 놓친다). **날짜를 들고 있지
                          않다** — 정본은 `clock.today()` 이고 여기는 「바뀌었다」만 말한다
src/lib/clock.ts        ← 시각의 단일 공급자 — SystemClock(04:00 하루 경계) ·
                          fixedClock(테스트). ⚠ **서버도 같은 04:00 경계다**
                          (BE `DayBoundary` · 2026-09 대조)
src/lib/day.ts          ← 날짜 표기. 계산은 clock.ts 가 한다
src/lib/time.ts         ← "21:30" ↔ "밤 9:30" — 시각을 말하는 곳은 전부 이걸 쓴다
```

**설치 여부와 버전의 정본은 [`package.json`](package.json) 이다** — 여기 목록을
전체 인벤토리로 두지 않는다(둘이 어긋나면 어느 쪽이 맞는지 알 수 없게 된다).
아래는 **구조를 이해하는 데 필요한 것**만이다:

- 런타임 골격 — expo-router(라우팅) · **Zustand**(클라이언트 상태) ·
  react-native-svg(그라디언트) · expo-image(일러스트) · expo-font(Pretendard)
- 소셜 로그인 — **@react-native-seoul/kakao-login**(카카오) ·
  **expo-apple-authentication** + **expo-crypto**(`S1` 애플 로그인 — **iOS 전용** ·
  서버 교환·nonce 까지 연결됨 2026-08-24) ·
  **@react-native-google-signin/google-signin**(`S1` 구글 로그인 — 두 플랫폼 ·
  서버 교환까지 연결됨 2026-08-25 · **nonce 는 무료 모듈에 없다**)
- OS 경계 — **expo-secure-store**(모멘토리 토큰) ·
  **expo-notifications**(회고 시간 알림 — 전부 로컬) ·
  **expo-calendar**(`09` 기기 캘린더 — **읽기만** 하고, 읽은 것을 서버로 화해한다) ·
  **expo-web-browser**(약관·개인정보 처리방침을 **앱 안에서** 연다 — `src/lib/links.ts`) ·
  **expo-store-review**(스토어 별점 창 — 쉼터를 「나아졌어요」로 마치고 나올 때 · 120일 간격 ·
  `features/rest/data/storeReview.ts` · 2026-10-13) ·
  **expo-speech-recognition**(회고 입력의 음성 입력 — OS 인식기라 외부 STT 가 없다 ·
  `src/components/ds/voiceInput.ts`)
- 계측 — **@amplitude/analytics-react-native** + **@react-native-async-storage/async-storage**
  (2026-09-05 — AsyncStorage 는 Amplitude 가 요구해서 들어왔다. 앱 코드가 직접 쓰는 곳은
  **쉼터의 기기 기억 둘**이다 — 쉼 추천 `recommendMemory.ts` · 설명 카드를 본 쉼터 `guideMemory.ts`
  (둘 다 `features/rest/data/` · `deviceStorage.ts` 를 지난다 · 2026-10-12))

네이티브 모듈이 섞여 있어 **dev client 재빌드 필요**.
⚠ **`08` 회고 시간 선택은 외부 피커 모듈이 아니다** — `src/components/ds/WheelPicker.tsx`
의 3열 자체 구현을 쓴다(`app/(onboarding)/retro-time.tsx` · `app/(tabs)/my.tsx`).
**아직 없는 것: TanStack Query · MMKV · Reanimated · MSW.**
도입 시점은 `docs/ARCHITECTURE.md §1` 「도입 예정」 표에 있다.

> 진입 분기는 `app/index.tsx` 에 있다 — 세션 없음 → 로그인 · 온보딩 전 → 온보딩 ·
> 완료 → 홈. **완료 여부의 정본은 서버다**(`GET /api/v1/users/me` · `auth.ts` 의 `syncMe`)라
> 앱을 껐다 켜도 온보딩이 되풀이되지 않는다. **서버에 못 물어본 채로 켜지면**(오프라인 등)
> 완료 여부는 「모른다」(`null`)이고, 스플래시가 「인터넷 연결을 기다리고 있어요」 한 줄을
> 띄운 채 3초마다 다시 묻는다(2026-10-13 · `PRODUCT.md` #46).

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

scripts/screen-sweep.sh   # 화면 크기 훑기 — 기기 하나로 크기·글꼴 배율 다섯 벌을 재현해
                          # 라우트 전부를 찍는다. **판정하지 않는다**(스크립트 머리말 참조) —
                          # 찍은 것을 눈으로 대조하는 도구다. 로그인된 기기 + 로컬 BE 가 전제다

scripts/keyout-*.py       # 일러스트 원본에서 배경을 빼 앱 자산으로 만드는 일회성 도구
scripts/make-no-emotion-marks.py   # (카피바라 · 조약돌 · 감정 스티커 · 빈 얼굴)
                          # **빌드에 끼지 않는다** — 자산을 다시 만들 때만 손으로 돌린다
```
