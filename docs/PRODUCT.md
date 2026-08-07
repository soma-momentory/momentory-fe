# 제품 계약 지도

이 문서는 **지도**다 — 규칙 본문을 복제하지 않고, 무엇이 어디 있는지와
구현이 스펙과 어긋난 지점만 관리한다. 규칙 자체는 [`docs/spec/`](spec/SNAPSHOT.md)
스냅샷이 정본이다.

## 무엇이 어디 있나

| 찾는 것                                                    | 정본                                                                             |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 불변 규칙 · 범위 · 접근성 · 샘플 데이터 기준               | [`spec/RULES.md`](spec/RULES.md)                                                 |
| 상태 기계 7개 (화면 하나 = `states.<키>` 하나)             | [`spec/momentory.states.mvp.json`](spec/momentory.states.mvp.json)               |
| 엔티티 7개 · 파생값 8개 · 세지 않는 것 · `meta.sampleData` | [`spec/momentory.schema.mvp.json`](spec/momentory.schema.mvp.json)               |
| 값 (색·크기·반경·여백)                                     | [`spec/momentory.css`](spec/momentory.css) — 여기 없으면 아래 「값을 찾는 순서」 |
| 화면별 규칙·문안·계측 이름                                 | [`spec/screens/<ID>.md`](spec/screens/)                                          |
| 파트별 구현 사양 서술                                      | [`spec/범위.md`](spec/범위.md)                                                   |
| 컴포넌트 인벤토리 (⚠ 원본 기준 — 값은 css 가 이긴다)       | [`spec/COMPONENTS.md`](spec/COMPONENTS.md)                                       |
| 상류 미결·기본값(R-nn)                                     | [`spec/OPEN-ISSUES-요약.md`](spec/OPEN-ISSUES-요약.md)                           |
| RN 도메인 타입의 소유자                                    | `src/features/<도메인>/model/types.ts` — mock 이 아니라 feature 가 소유한다      |
| RN 토큰                                                    | `src/design/theme.ts`(생성물) + `src/design/tokens.mvp.ts`(상류 미반영분 임시)   |

**값을 찾는 순서** — 위에서부터 보고, 없을 때만 아래로 내려간다:

1. `spec/screens/<ID>.md` — 그 화면의 규칙·문안
2. `spec/momentory.css` — **MVP 값 정본**
3. (상류 전용 — 담당자 경유) `05_도구/flows/9-mvp.mjs` · `ui.mjs` — 2번의 figma 번역
4. (상류 전용 — 담당자 경유) `spec/COMPONENTS.md` · `05_도구/lib.mjs` — ⚠ **원본 기준**

## 화면 ID ↔ 라우트 매핑 (40화면)

| 파트   | 화면 ID                   | 라우트 파일                             | 비고                                                      |
| ------ | ------------------------- | --------------------------------------- | --------------------------------------------------------- |
| 진입   | `S0`                      | `app/index.tsx`                         | 진입 분기 (세션 없음→로그인 · 온보딩 전→온보딩 · 완료→홈) |
| 진입   | `S1`                      | `app/(auth)/login.tsx`                  | 카카오 연결됨 · Apple·Google 은 개발 통로                 |
| 온보딩 | `03`                      | `app/(onboarding)/welcome.tsx`          |                                                           |
| 온보딩 | `04`                      | `app/(onboarding)/nickname.tsx`         |                                                           |
| 온보딩 | `05-b`                    | `app/(onboarding)/profile.tsx`          | 나이·성별 (선택)                                          |
| 온보딩 | `06` `06-b` `06-c`        | `app/(onboarding)/interests.tsx`        | 한 파일이 세 상태                                         |
| 온보딩 | `07`                      | `app/(onboarding)/rest.tsx`             |                                                           |
| 온보딩 | `08`                      | `app/(onboarding)/retro-time.tsx`       | OS 시간 피커                                              |
| 온보딩 | `09`                      | `app/(onboarding)/calendar.tsx`         |                                                           |
| 온보딩 | `10` `10-b`               | `app/(onboarding)/done.tsx`             | 한 파일이 두 상태                                         |
| 홈     | `12` `12-b`               | `app/(tabs)/home.tsx`                   | 일정 있음/없음 — 별도 레이아웃 아님                       |
| 홈     | `12-c`                    | `app/home/schedule/[id].tsx`            | 투명 모달 시트                                            |
| 홈     | `12-d`                    | `app/home/moment/new.tsx`               | 〃                                                        |
| 홈     | `12-e`                    | `app/home/schedule/new.tsx`             | 〃                                                        |
| 회고   | `C1`                      | `app/retro/intro.tsx`                   |                                                           |
| 회고   | `C2`                      | `app/retro/confirm.tsx`                 | 홈과 같은 store·컴포넌트                                  |
| 회고   | `C3`                      | `app/retro/emotion.tsx`                 | 시작 감정 — 필수                                          |
| 회고   | `C4` `C4-b` `C4-d` `C4-e` | `app/retro/talk.tsx`                    | 같은 대화의 다른 순간 — 라우트를 나누지 않는다            |
| 회고   | `C4-c` `C4-c2`            | `app/retro/talk.tsx` (`DirectionSheet`) | 방향 시트                                                 |
| 회고   | `C6` `C6-b`               | `app/retro/draft.tsx`                   | 세그먼트 두 면                                            |
| 회고   | `C7`                      | `app/retro/done.tsx`                    |                                                           |
| 보관함 | `A1` `A2`                 | `app/(tabs)/archive.tsx`                | 달력/목록 — 세그먼트 두 면                                |
| 보관함 | `A3` `A3-b` `A3-c`        | `app/diary/[id]/index.tsx`              | 두 면 + 행동 카드 완료 상태                               |
| 보관함 | `A4`                      | `app/diary/[id]/edit.tsx`               | 내 문장·감정 태그만 수정                                  |
| 리포트 | `W1`                      | `app/(tabs)/report.tsx`                 | 일기 7편부터                                              |
| 마이   | `M1`                      | `app/(tabs)/my.tsx`                     |                                                           |
| 마이   | `M2`                      | `app/my/profile.tsx`                    | 기본 정보 섹션 포함 (아래 차이 대장)                      |
| 마이   | `M3`                      | `app/my/notify.tsx`                     |                                                           |

데이터 흐름·레이어 책임은 [`ARCHITECTURE.md`](ARCHITECTURE.md), 화면별 진행 상태는 [`TASKS.md`](TASKS.md).

## 상류와 차이 — 대장

구현이 스펙과 어긋나면 **코드에 조용히 반영하지 않고 여기 먼저 적는다.**
상류 제기·회신은 담당자가 한다(절차: [spec/SNAPSHOT.md](spec/SNAPSHOT.md)).
상류가 닫으면 임시 기록을 지운다 — 지우지 않으면 정본이 둘이 된다.

| #   | 차이                                                                                                                                                                                                                                                                                                 | 근거                                                       | 임시 기록 자리                            | 닫히는 조건                                        | 상태            |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------- | --------------- |
| 1   | `theme.radius` 에 18 이 없는 등 MVP 6토큰이 상류 `lib.mjs` 에 미등록 — `src/design/tokens.mvp.ts` 로 오버라이드 중                                                                                                                                                                                   | R-42                                                       | `src/design/tokens.mvp.ts`                | 상류가 lib.mjs 에 흡수 → 파일 삭제                 | 열림            |
| 2   | **S0·S1 적용 범위 모순** — 상류 R-42 는 "S0·S1 은 예외(원본 값)"라 하나, 그 서술은 `9-mvp.mjs` 가 28화면뿐이던 v2 반입 이전 전제로 보인다. v2 는 S0·S1 을 40화면에 포함했고 fe 는 **MVP 값으로 구현**했다(원본 값 예외는 배경 그라디언트 구 값 하나 · 워드마크 자간 .055em · 소셜 버튼 44 는 MVP 값) | fe CLAUDE.md 2026-08-07 따라잡기 vs 상류 R-42 (2026-08-06) | 코드는 fe 판단대로(MVP 값) — 이 행이 기록 | 담당자가 상류 OPEN-ISSUES 에 확인 요청 → 상류 회신 | **결정 대기**   |
| 3   | **파생값 계산 주체** — 스키마 `derived` 8개를 현재 전부 FE 가 계산한다(`features/{archive,report,my}/model/`). 구 설계 문서는 "서버 계산 기본"이었다                                                                                                                                                 | 실구현 · DISCUSSION §1-3                                   | `ARCHITECTURE.md` §4 에 현행 명시         | BE 계약(openapi.yaml) 확정 시 재결정               | 결정 대기       |
| 4   | `COMPONENTS.md` P0 표 3건 역전(Card·ProgressDots·BackChevron) — MVP 값으로 구현 완료, 문서에는 경고 배너 부착                                                                                                                                                                                        | R-42 해결 · R-43 상류 권고 ㉯                              | `spec/COMPONENTS.md` 배너                 | R-43 상류 확정 시 배너 문안 재확인                 | 닫힘(기록 유지) |
| 5   | `M2` 에 「기본 정보」 섹션 — 상류 시안에 없지만 상태 기계에 기본 정보 전용 화면이 없어 편집 invariant(온보딩 답변 전부 편집 가능)를 지키려 추가                                                                                                                                                      | `momentory.states.mvp.json` `my` 전이                      | `app/my/profile.tsx` 주석 · DISCUSSION §3 | 상류 확인                                          | 결정 대기       |
| 6   | `M1` 연결 관리 줄이 읽기 전용 — 상태 기계에 목적 화면이 없다                                                                                                                                                                                                                                         | 〃                                                         | `app/(tabs)/my.tsx` 주석 · DISCUSSION §3  | 상류 확인                                          | 결정 대기       |

| 7 | **`S1` 에 실패 안내 한 줄을 더했다** — 시안 `S1` 에는 오류 표시가 없다(실패·오프라인은 원본 `X1`·`X2` 이고 MVP 화면 밖). 실제 로그인이 붙자 카카오·서버 실패에 아무 반응이 없는 화면이 되어, `RULES.md` 4(「오류·거부·실패는 한 줄 안내로 흡수한다」)에 맞춰 버튼 아래 한 줄만 뒀다. 모달·재시도 버튼·경고 아이콘 없음 | `RULES.md` 4 · `S1.md` 「실패는 원본 X1」 | `app/(auth)/login.tsx` · `features/auth/model/auth.ts` 의 문구 표 | 상류가 `X1`·`X2` 문안을 MVP 로 반입 → 그 문구로 교체 | 결정 대기 |

새 행을 추가할 때: 차이·근거·임시 기록 자리·닫히는 조건을 전부 채운다 — 하나라도 비면 "조용한 이탈"이 된다.
