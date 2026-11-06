# Task 001: 홈 v2 P0 정본 갱신 · P1 토큰·서체·자산 · P2 공유 뷰와 Expo Lab 연결

> 상태 (2026-11-06 대조): ✅ **완료** — P0~P2 는 #179(2026-10-15)로 main 에 들어갔다. 그 뒤 P3 도 운영에 들어갔다(#183). ⚠ 이 Task 의 Gaegu 는 2026-11-01 에 지웠다(#212). 지금 상태는 `docs/TASKS.md` 「홈 v2 운영 적용」.

## 요구사항

[`docs/redesign/HOME_V2_ROLLOUT_PLAN.md`](../docs/redesign/HOME_V2_ROLLOUT_PLAN.md)(이하 「계획」)의
**P0 · P1 · P2** 를 한 PR 로 구현한다. **운영 홈(`app/(tabs)/home.tsx` → 옛 `HomeView`)은 바꾸지 않는다** —
P3(운영 전환) · P4(날씨) · P5(알림함) · P6(정리)은 이 Task 범위가 아니다.

이번 요구에서 확정된 결정:

| ID  | 결정                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | **C** — P0 문서 다섯(`DESIGN.md` · `PRODUCT.md` · `PLAN.md` · `UX_STRUCTURE.md` · `TASKS.md`)을 모두 갱신하되, **현재 운영 상태**와 **목표 디자인(v2)** 을 구분해 적는다 |
| D2  | **B** — 주간 도크에서 **기록이 없는 날**은 `assets/emotion-pebble/no-emotion.png` 를 쓰고 접근성 이름은 「기록 없음」                                                    |
| D3  | **A** — P1 · P2 를 PR 하나로 묶되 **커밋은 Phase 별로 나눈다**(P0 문서 · P1 · P2)                                                                                        |
| D4  | **A** — 날씨 그림(`expo-lab/assets/claude-home/weather/*.png` · 6장 9.2MB)은 **P4 에서 최적화해 승격**한다. 이번에는 서체로 **Gaegu 만** 더한다                          |

이전 하네스 실행 기록(`harness/runs/20261014-234910/` 등 `FAILED` · `HUMAN_REVIEW_REQUIRED` 실행 전부)은
**읽지도 고치지도 지우지도 않는다.** 그 실행들의 「사람의 결정」은 이 Task 에 쓰지 않는다(계획 §0.3).

## 대상 범위

| 범위                   | 이번 Task                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 앱 (Expo·React Native) | **예** — 홈 전용 토큰 · Gaegu 등록 · Baba 자산 · `features/home/ui/v2/` 표시 전용 뷰 · `ScheduleList`/`ScheduleItem` 확장. **운영 홈 라우트는 그대로** |
| Expo Web Design Lab    | **예** — `expo-lab/src/claude-home/` 에 운영판 v2 변형 연결 · 앱 Gaegu 파일 사용 · `current-home/HomeView.tsx` 정리                                    |
| Vite Design Lab        | **아니오** — 계획 §1.6 「영향 없음」. `design-lab/` 은 건드리지 않는다(`typecheck:lab` 회귀만 확인)                                                    |

## 관련 문서와 코드

먼저 [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md)(커밋 · 브랜치 · 품질 게이트 · 생성물)와
[`docs/HARNESS_NAV.md`](../docs/HARNESS_NAV.md)를 읽는다.

**정본 · 근거 문서**

- 계획 — §0.2(결정 HD-1~~7 · HW · NB · WX · WK-1 · LY-1 · CP-1 · PV) · §1.3(일정 기능 S1~~S20) · §2(구성 · 문안 · 일정 · 도크 · Baba · 토큰) ·
  §6 P0/P1/P2 표 · §7.1 P1/P2 테스트 목록 · §8 정본 갱신 목록
- `CLAUDE.md` · `docs/spec/RULES.md`(불변 규칙: 숫자로 압박 금지 · 오류 한 줄 · 색만으로 상태 금지 · 5개 접기)
- `docs/DESIGN.md` 「홈」(499행~) · §2 Typography(79행~ · 「홈 날짜와 탭 제목은 손글씨」 122행) · 「일기 날씨 자동 기록」(1053행)
- `docs/PRODUCT.md` 「상류와 차이」(마지막 #47) · `PLAN.md` A-3(93~99행) · D9(574행) · D5(596행) · 717행
- `docs/redesign/UX_STRUCTURE.md` §4 · §4.1 · §4.4 · §9 · §11 A-1 · §14 · `docs/TASKS.md` 「둘이 부딪히는 곳」(1057행)
- `docs/spec/screens/12.md` · `12-b.md`(문안 — 겹치면 `DESIGN.md` 가 이긴다 · N6)
- `expo-lab/README.md` · `expo-lab/HOME_UI_VALIDATION.md` · `docs/EXPO_WEB_DESIGN_LAB_PLAN.md`
- `assets/fonts/README.md` · `assets/emotion-pebble/README.md`(`no-emotion.png` 의 현재 뜻 — 아래 결정 DN-1)

**시작 코드**

| 자리                                                                                                                      | 무엇                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `src/design/ds/index.ts` · `pond.ts` · `notebook.ts` · `diaryMemo.ts`                                                     | 화면 전용 토큰 선례 — `homeV2.ts` 를 같은 방식으로                                                                     |
| `src/design/ds/__tests__/contrast.test.ts`                                                                                | 대비 테스트 — 「홈 v2」 describe 추가                                                                                  |
| `src/lib/providers.tsx:104~116` · `src/lib/__tests__/providers.test.tsx`                                                  | `useFonts` 표 — Gaegu 두 줄 (⚠ 「둘이 부딪히는 곳」)                                                                   |
| `src/features/home/ui/HomeView.tsx` · `ScheduleList.tsx` · `ScheduleItem.tsx` · `CheckBurst.tsx` · `WeekEmotionStrip.tsx` | 운영 홈 — 일정 논리 재사용 원천. `ScheduleList.tsx:34~36 · 81 · 99 · 103 · 197~199 · 206 · 243` 이 `ROW_PITCH` 를 쓴다 |
| `src/features/home/model/presentation.ts` · `day.ts` · `src/features/report/model/report.ts`                              | `remainingLabel` · `MAX_VISIBLE_SCHEDULES` · `weekDays`                                                                |
| `src/components/ds/{EmotionPebble,WeekEmptyDot,TabScreen,Menu,Modal}.tsx`                                                 | 도크 조약돌 · 탭바 · 메뉴                                                                                              |
| `src/lib/time.ts` (`formatKoreanTime`)                                                                                    | 리마인더 시각 문안                                                                                                     |
| `expo-lab/src/claude-home/{HomeView,tokens,scenarios,MockPreview,variants}.ts(x)`                                         | v2 RN 번역 — 값의 1차 근거(Lab 전용 · 운영 import 금지)                                                                |
| `expo-lab/src/current-home/{MockPreview,HomeView}.tsx` · `__tests__/mockPreview.test.tsx`                                 | 운영 `HomeView` 를 Lab 에서 렌더하는 선례 · 옛 복사본                                                                  |
| `expo-lab/src/App.tsx:1 · 421~` · `expo-lab/package.json`                                                                 | Lab 의 Gaegu 로딩(`@expo-google-fonts/gaegu`)                                                                          |
| `expo-lab/assets/claude-home/baba/*.webp`(10장 · 188KB)                                                                   | Baba 레이어 원본                                                                                                       |
| `node_modules/@expo-google-fonts/gaegu/{400Regular,700Bold}/*.ttf` · `LICENSE_FONT`                                       | Gaegu 파일 출처(SIL OFL 1.1) — 앱에는 npm 의존성이 아니라 **파일로 커밋**                                              |

**테스트**: `app/(tabs)/__tests__/home.test.tsx`(운영 홈 — **수정 없이 통과**해야 한다) ·
`src/features/home/ui/__tests__/HomeView.test.tsx` · `src/features/home/__tests__/*` · `src/components/ds/__tests__/ds.test.tsx` ·
`expo-lab/src/current-home/__tests__/mockPreview.test.tsx`.

## 구현 범위

브랜치 `feat/home-v2-p1-p2`(CONTRIBUTING 「브랜치」 · scope 없는 type). 커밋은 **최소 셋**으로 나눈다(D3) —
각 커밋 단독으로 품질 게이트를 통과하게 한다.

### 커밋 1 — `docs:` P0 정본 갱신(D1 · 문서만)

원칙: **「현재 운영」과 「목표 v2(미적용 · 적용 Phase)」를 나란히 적는다.** 운영 홈이 바뀌지 않았으므로
현재 서술을 지우지 않고, v2 를 「목표」 절 · 열로 덧붙인다. 각 목표 항목에 적용 Phase(P2 Lab · P3 · P4 · P5)를 단다.

| 문서                              | 고칠 자리                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/DESIGN.md`                  | 「홈」 머리에 **현재 운영 / 목표 v2** 구분 표. 새 하위 절 「홈 v2 (목표 · P3 에서 운영 적용)」 — 구조(계획 §2.1) · 문안(§2.2 · HD-6) · 일정 기능 유지(HD-4) · 도크 하단 고정 · 빈 날 `no-emotion.png` + 「기록 없음」(WK-1 · D2) · Baba(손짓 없음 · 낭독기 숨김 · §2.5) · 홈 전용 토큰과 대비 보정(§2.6 표) · 날씨 스티커 · 알림 모달은 **P4 · P5 목표**로만. §2 Typography 에 「**홈 v2 만 Gaegu** 예외(HD-3) · 글로벌 서체는 그대로 · 손글씨 최소 14 적용」. 「일기 날씨 자동 기록」에 홈 날씨와의 경계(§4.4) 한 단락 — **P4 목표**로 표시 |
| `docs/PRODUCT.md` 「상류와 차이」 | 새 행 #48 홈 v2 구조 · 문안(`12.md` · `12-b.md` 대비) · #49 홈 날씨(P4 목표) · #50 알림함 · 종 목적지(`M3.md` 대비 · P5 목표) · #51 주간 감정 하단 고정 · 빈 날 표시. 각 행에 「지금은 운영 미적용 — 닫히는 조건: P3/P4/P5 머지」                                                                                                                                                                                                                                                                                                            |
| `PLAN.md`                         | A-3(99행) · D9(574행) · D5(596행) · 717행에 「2026-10-15 홈 v2 로 다시 바뀐다(계획 HD-1 · HD-6 · HD-7)」 메모 — **과거 기록은 지우지 않는다**                                                                                                                                                                                                                                                                                                                                                                                                |
| `docs/redesign/UX_STRUCTURE.md`   | §4 도식 · §4.1 표(종 · 3번 이번 주 감정) · §4.4(종 목적지) · §9 · §11 A-1(「이번 적용은 항상 고정 · 빈 날은 빈 조약돌 · U-5 때 재검토」) · §14 #2 · 새 행(종). 종은 「**현재**: `/my` · **목표(P5)**: 알림 모달 → 설정 아이콘 → 알림 설정 시트 · 마이 경로 유지」로 둘 다 적는다                                                                                                                                                                                                                                                             |
| `docs/TASKS.md`                   | 「홈 v2 운영 적용」 절 신설 — P0~~P6 표와 상태(P0~~P2 이 PR · P3~P6 남음 · PV-0 별도 트랙) · 「둘이 부딪히는 곳」에 `providers.tsx`(Gaegu) · `ScheduleList`(행 기하) · (P5 예정) `my.tsx` 시트 추출                                                                                                                                                                                                                                                                                                                                          |
| 계획 문서 머리 · 변경 이력        | 상태 줄을 「P0~P2 진행 · Task `tasks/001-home-v2-p1-p2-shared-view.md`」로 · 변경 이력 한 줄 · §2.4 의 「P1 에서 고른다」를 D2 결과로 닫는다                                                                                                                                                                                                                                                                                                                                                                                                 |

하지 않는 것: `docs/spec/**` · `docs/api/openapi.json`(생성물) · `ANALYTICS.md` · `PLAY-DATA-SAFETY.md` · `docs/api/README.md` ·
`docs/SETUP.md`(P4·P5 몫) · `CLAUDE.md`(P6 몫 · 보호 경로이므로 이번 Task 에서 수정하지 않음) ·
`SCREEN_INVENTORY.md`(현재 상태 기록 · 그대로). 홈 v2 공유 뷰의 현재 상태는 `docs/DESIGN.md` 와
`docs/TASKS.md` · `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` 에 기록한다.

### 커밋 2 — `feat:` P1 홈 전용 토큰 · Gaegu · Baba 자산

1. **`src/design/ds/homeV2.ts`(새로)** — 계획 §2.6 표의 이름으로 v2 값을 옮긴다(`paper` `grid` `card` `white` `ink` `muted` `green`
   `greenSoft` `today` `date` `weekday` `weatherTape` `separator` `emptyBorder` `shadow` `alert` `taskBorder` `taskDone`).
   **보정 둘**: `taskDone #A8988A → #7D6D5E` · `taskBorder #C9BBA8 → #998674`(머리말에 이유 · A-5 선례).
   `mood` 목 색(`tokens.ts:22`)은 **옮기지 않는다**(도크는 실제 감정 조약돌). `homeV2.type` 에 v2 크기(날짜 36 · 말풍선 25 ·
   일정 19 · 요일 18 · 도크 17/14 — 최소 14) · `homeV2.font = { regular: "Gaegu-Regular", bold: "Gaegu-Bold" }`.
   글로벌 `color.ts` · `typography.ts` 는 **건드리지 않는다**(HD-3). `index.ts` 에서 `homeV2` 로 내보낸다.
2. **`contrast.test.ts`** — `describe("홈 v2 — 종이 위 글자와 체크")`: `ink/paper` · `ink/date` · `ink/weekday` · `muted/card` ·
   `muted/paper` · `taskDone/card ≥ 4.5` · `white/green ≥ 4.5` · `taskBorder/card ≥ 3` · `alert/paper ≥ 3`. 테스트 제목은 §7.1 P1 초안을 따른다.
3. **Gaegu** — `node_modules/@expo-google-fonts/gaegu` 의 `Gaegu_400Regular.ttf` · `Gaegu_700Bold.ttf` 를
   `assets/fonts/Gaegu-Regular.ttf` · `Gaegu-Bold.ttf` 로 커밋. `assets/fonts/README.md`(서체 둘 → 셋 · 출처 · 패키지 버전 · 받은 날 ·
   sha256 · 「홈 v2 전용」) · `LICENSE.txt`(OFL 1.1 전문 추가). `providers.tsx` `useFonts` 에 `"Gaegu-Regular"` · `"Gaegu-Bold"`
   두 줄(**파일 이름 그대로** · 규칙 5). **앱 `package.json` 에 `@expo-google-fonts/gaegu` 를 넣지 않는다.** `providers.test.tsx` 가
   폰트 키를 검사하면 함께 갱신.
4. **Baba 자산** — `expo-lab/assets/claude-home/baba/*.webp` 를 `assets/home/v2/baba/` 로 복사(Lab 원본은 그대로 둔다 — 원본 변형이 쓴다).
   `assets/home/v2/README.md` 에 레이어 순서 · 출처(`design-imports/claude-home/…v2.dc.html`) · `base-ears-front.webp` 의 쌓는 자리
   (원본 HTML 에서 확인 · 쓰지 않으면 그 사실을 적고 복사하지 않는다)를 적는다. → 결정 DN-2.
5. **날씨 그림은 옮기지 않는다**(D4) — `assets/home/v2/weather/` 를 만들지 않는다. README 에 「P4 에서 최적화해 승격」 한 줄.

### 커밋 3 — `feat:` P2 홈 v2 공유 뷰 · Expo Lab 연결(날씨 · 알림 숨김)

1. **`src/features/home/ui/v2/`(새로 · 표시 전용)** — `HomeV2View` · `HomePaperGrid` · `DatePaper` · `HeroCard` · `Baba` · `WeekDock` ·
   `ScheduleSection`. store · router · 계측 · API 를 **import 하지 않는다**(옛 `HomeView` 와 같은 원칙). 색은 `homeV2` 만 · hex 금지.
   - 레이아웃: 계획 §2.1 · §2.4 의 **`listOnly` 기본 모드만**(바깥 비스크롤 `View` → 고정 영역 → 목록 `ScrollView` → 도크 절대 배치 ·
     목록 `paddingBottom` 에 도크 높이). LY-1 `wholeBody` 전환 · `homeLayout.ts` 는 **P3 몫** — 이번엔 만들지 않는다.
   - 탭바: 글로벌 `TabScreen` 그대로(v2 `PaperTabBar` 미채택). 모눈은 body 안 절대 배치를 먼저 시도한다(§2.6 끝 · `TabScreen` 슬롯 추가는 P3 판단).
   - 문안: 계획 §2.2 표 그대로 — 말풍선 「오늘 하루는 / 어땠어요?」 · 리마인더 켜짐 「{formatKoreanTime(time)}엔 제가 / 먼저 말 걸어요」
     (**하드코딩 금지** · `\n` 은 시각 뒤에만) · 꺼짐 「편할 때 언제든 / 돌아볼 수 있어요」 · CTA 「하루 돌아보기 ›」(접근성 이름
     「하루 돌아보기」 · ›는 장식 · 화면의 유일한 주 CTA) · 「오늘 일정」 + `remainingLabel` · 「+ 추가」 · 빈 일정 v2 문안 ·
     「오늘 일정을 모두 마쳤어요.」 · 「이번 주 / 감정」.
   - Baba: 레이어 9장 · 장식(`accessibilityElementsHidden` · `importantForAccessibility="no-hide-descendants"` · `pointerEvents="none"`) · **손짓 없음**(§2.5).
   - `WeekDock`: `weekDays()` 결과를 받는다. 감정 있음 → `EmotionPebble`(대표 감정) · **기록 없음 → `no-emotion.png` · 접근성 「{요일} · 기록 없음」**(D2) ·
     일기 있음 · 감정 없음 → 결정 DN-1. 오늘 = 형광(`homeV2.today`) **과 굵기**. 칸을 누르면 감정 이름이 서는 동작은 도크 위쪽 말풍선.
     **기록이 없는 주도 항상 일곱 칸**(WK-1).
   - 계약(§6 P2): `model.weather: HomeWeatherView | null`(P2 는 늘 `null` → **스티커 자리를 그리지 않는다** · 문구 없음) ·
     `model.hasUnreadNotifications: boolean`(늘 `false` → 점 없음 · 종 접근성 이름 「알림」) · `actions.onOpenNotifications` ·
     `actions.onOpenNotificationSettings` · `actions.onOpenWeatherInfo`. `HomeWeatherView` 는 **표시용 최소 타입**(`label` · `temperatureC` 등)을
     `ui/v2/` 안에 두고 `model/types.ts` 의 `Weather` 는 import 하지도 고치지도 않는다(MF-5).
2. **`ScheduleList` · `ScheduleItem`** — 논리는 하나, 겉모습만 둘(§2.3).
   - `appearance?: "ds" | "paper"`(기본 `"ds"`) — `"paper"` 는 v2 원형 체크 24 · 테두리 1.75 · 완료 = 녹색 면 + ✓ + 취소선 + 글자색 · 히트 44 유지 ·
     ⋮ 메뉴 · `CheckBurst` · 끌기 · 접근성 이동 동작 그대로.
   - **행 기하**: 고정 `ROW_PITCH` 를 실측 `pitch` 하나로(첫 줄 `onLayout` 높이 + 간격 20 · 초기값 `ROW_CONTENT × PixelRatio.getFontScale()` + 20).
     줄 `top` · 목록 높이 · 빈 슬롯 · 끌기 칸 수 · 비켜서는 거리 · 줄 높이 여섯 자리가 전부 `pitch` 를 쓴다. 끄는 도중 바뀐 `pitch` 는 끌기가 끝난 뒤 반영.
     `onRowPitch?` 로 올린다. 내보내던 `ROW_PITCH` 는 「배율 1 기본값」으로만 남긴다. → 결정 DN-3(운영 홈 영향).
3. **Expo Lab**
   - `expo-lab/src/claude-home/variants.ts` 에 **운영판 v2** 변형 추가 — 5a~5f 시나리오를 `HomeV2View` 의 props 로 바꾸는 Lab 어댑터
     (`MockPreview.tsx` 또는 새 `HomeV2Preview.tsx`)를 거친다. 원본 `ClaudeHomeView` 는 「시안 원본」 변형으로 **남겨 비교**한다.
     Lab 어댑터는 운영 store · API 를 import 하지 않는다(`current-home/MockPreview.tsx` 선례).
   - `expo-lab/src/App.tsx` 의 `useFonts` 에 앱 파일(`assets/fonts/Gaegu-*.ttf`)을 `"Gaegu-Regular"` · `"Gaegu-Bold"` 로 등록한다.
     원본 변형이 쓰는 `Gaegu_400Regular` · `Gaegu_700Bold` 이름 처리는 결정 DN-4.
   - `expo-lab/src/current-home/HomeView.tsx` — 저장소 검색으로 참조 0 을 확인하면 삭제(계획 §1.6). 참조가 있으면 남기고 PR 에 적는다.
   - `expo-lab/README.md` · `HOME_UI_VALIDATION.md` — 변형 목록 · 캡처 절차(시안 원본 · 운영판 v2 · 현행 × 5a~5f).

### 범위 밖(하지 않는다)

`app/(tabs)/home.tsx` 와 `app/**` 전부 · 옛 `HomeView` · `GrassButton` · `HomeCapybara` · `WeekEmotionStrip` 삭제(P6) · `homeLayout.ts`(P3) ·
날씨(`lib/location.ts` · `weatherApi` · `useHomeWeather` · `WeatherSticker` · 날씨 그림 · `app.config.ts` 권한 문구 — P4) ·
알림함(`features/notifications/**` · `ReminderSheet` 추출 · `my.tsx` — P5) · 계측 이벤트 추가 · `package.json` 의존성 변경 ·
`docs/spec/**` · `docs/api/openapi.json` · `design-lab/**` · `harness/runs/**`.

## 검증 기준

`docs/CONTRIBUTING.md` 「품질 게이트」를 순서대로 — **각 커밋 끝에서** 그리고 PR 전에 한 번 더:

```bash
npm run typecheck
npm run typecheck:lab
npm run typecheck:expo-lab
npm run lint            # 경고 0
npm run format:check
npm run test -- --ci
```

**자동 검증(새로 · 갱신)**

- P1 `src/design/ds/__tests__/contrast.test.ts` — 「홈 v2 — 마친 일정 글자는 카드 위 4.5 를 넘는다(v2 `#A8988A` 2.63 로 되돌리면 깨진다)」 ·
  「홈 v2 — 체크 테두리 · 읽지 않음 점은 3:1 을 넘는다」 · 「잉크 · 보조 글자는 종이 · 날짜 종이 · 요일 종이 · 카드 위 4.5」 · 「CTA 흰 글자 4.5」. 기존 대비 테스트 회귀 없음
- P1 `providers.test.tsx` — Gaegu 두 키가 등록된다(파일 이름 그대로)
- P2 `src/features/home/__tests__/homeV2View.test.tsx` — 계획 §7.1 P2 목록 전부: 표시 전용(모듈 목킹 없이 렌더) · 리마인더 21:30 / 07:00 ·
  알림 꺼짐 문안 · `weather == null` 이면 스티커 자리 없음 · `hasUnreadNotifications == false` 면 점 · 「읽지 않은」 이름 없음 · Baba 낭독기 숨김 ·
  주 버튼 「하루 돌아보기」 하나 · 도크는 기록이 없어도 일곱 칸 · 빈 날 「기록 없음」 + `no-emotion` 이미지(D2) · 감정 있는 날 접근성 이름 유지 ·
  일정 기능(체크 · ⋮ 메뉴 · 접기 「N개 더 보기」 · 「N개 남음」/「모두 완료」 · 진행률 · 배지 · 감정 알약 없음) — S1~S20 중 뷰에 해당하는 것
- P2 `src/features/home/__tests__/scheduleList.test.tsx` — §7.1 P2 「행 기하」 다섯 항목(첫 줄 48 일 때 `top` · 높이 · 빈 슬롯이 새 `pitch` ·
  `dy = 2.4 × pitch` 면 두 칸 · 비켜서는 거리 = `pitch` · 끄는 도중 `pitch` 변화 무시 · `onRowPitch` 값 = 배치 값 · 접근성 이동은 한 칸씩)
- Expo Lab — 「claude-home 운영판 변형이 공유 뷰를 Mock 으로 렌더한다 · 운영 모듈(store · API)을 import 하지 않는다」
- **회귀(수정 없이 통과)**: `app/(tabs)/__tests__/home.test.tsx` 전부 · `src/features/home/ui/__tests__/HomeView.test.tsx` ·
  `expo-lab/src/current-home/__tests__/mockPreview.test.tsx` · `src/components/ds/__tests__/ds.test.tsx`. 이 중 하나라도 고쳐야 하면 멈추고 PR 에 이유를 적는다
- 린트: `src/design/**` 밖 hex 0 · 앱 코드가 `expo-lab/**` · `src/testing/fixtures` 를 import 하지 않는다 · `features/home/ui/v2` 밖에서 `HomeV2View` 를 쓰는 앱 코드 없음

**수동 확인**

- Expo Lab(`npm run lab:web`)에서 시안 원본 · 운영판 v2 · 현행을 5a~5f 로 나란히 캡처(`HOME_UI_VALIDATION.md` 절차) — 문안 · 보정 색 차이 · 도크 빈 날
- Gaegu 두 굵기가 다르게 그려지는가(웹 Lab · 가능하면 Android dev client — `fontWeight` 무시 확인)
- 운영 홈이 그대로인가(dev client 홈 진입 · 배율 1 에서 일정 끌기 · 메뉴 · 큰 글꼴에서 줄 겹침이 줄었는가 — DN-3)
- 자산 용량(Gaegu 두 파일 · Baba 9~10장) · 라이선스 문구
- `git status` 로 `harness/runs/**` · `design-lab/**` · `app/**` · `docs/spec/**` 에 변경이 없음을 확인
- PR 본문: 템플릿 8항목 · 커밋 셋 · 스위트/테스트 수 · 「둘이 부딪히는 곳」(`providers.tsx` · `ScheduleList`) 공유 · P3 이전엔 운영 미적용이라는 점

## 결정 필요 사항

| ID   | 질문                                                                                                                                                                                                                                                 | 추천                                                                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DN-1 | `no-emotion.png` 는 지금 「**일기는 있는데 감정이 없는 날**」(접근성 「기록 있음」)의 그림이다(`EmotionPebble.tsx:29~59` · `home.test.tsx:126` 「안 쓴 날과 갈린다」). D2 로 **기록 없는 날**도 같은 그림이 되면 v2 도크에서 두 상태를 어떻게 가르나 | v2 도크 한정: 두 상태 모두 `no-emotion.png` · 접근성 이름으로 가른다(「기록 없음」/「기록 있음」) · 운영 `WeekEmotionStrip`·리포트는 그대로. 시각 구분은 P3 전환 전 Lab 캡처로 재검토 |
| DN-2 | D4 「이번에는 Gaegu 만 추가」가 Baba 레이어(188KB) 승격까지 미루라는 뜻인가                                                                                                                                                                          | Baba 는 P1 에서 승격(HD-6 · P2 공유 뷰가 그린다). D4 는 날씨 그림에만 적용                                                                                                            |
| DN-3 | `ScheduleList` 실측 `pitch` 는 운영 홈도 쓰는 컴포넌트를 바꾼다 — 「운영 홈은 교체하지 않는다」와 부딪히나                                                                                                                                           | 이 PR 에 포함(계획 P2) — 배율 1 에서 동작 동일 · 기존 테스트 무수정 통과 조건 · 큰 글꼴 줄 겹침을 줄이는 개선임을 PR 에 명시                                                          |
| DN-4 | Lab 의 `@expo-google-fonts/gaegu` 의존성 — 앱 파일로 바꾼 뒤 의존성을 지우나                                                                                                                                                                         | 지우지 않는다(lockfile 변경 회피) — 원본 변형의 `Gaegu_400Regular`/`Gaegu_700Bold` 이름도 앱 ttf 로 등록해 한 파일만 쓰게 하고, 의존성 제거는 P6 정리로                               |
