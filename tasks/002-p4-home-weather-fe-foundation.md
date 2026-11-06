# Task 002: P4 홈 날씨 FE 기반 — 위치 통로 · 날씨 API 어댑터 · 상태 훅 · 스티커 매핑 (화면 연결 없음)

> 상태 (2026-11-06 대조): ✅ **FE 완료 · 운영 홈에 연결됨**(#184·#186 · `useHomeWeather`). ⛔ BE `#77`(`POST /api/v1/weather/current`)은 **dev 에만** 있다 — 운영 배포 대기. FE `docs/api/openapi.json`(개발 서버 반입)에는 들어와 있다.

> 복구 기록: 아래 Task 본문은 원본 Harness 작성 시점의 BE `main` 상태를 기록한다.
> 후속 PR 후보는 BE `dev` d77d023의 `CurrentWeatherController`·DTO·OpenAPI 테스트와
> 대조했다. 이 커밋의 운영 배포 및 FE OpenAPI 스냅샷 반입은 확인되지 않았다.
> 아래 Push·PR 금지는 원본 Harness Worker 실행에 적용됐고, 이 복구 브랜치의 Draft PR은
> 별도 사용자 요청에 따라 준비한다. 원본 실행 기록은 변경하지 않는다.
> 아래 Task의 「일기와 같은 번역표」는 당시 계획의 가정이다. BE `dev`에서 홈
> `WeatherCondition.label()`과 일기 `MetWeatherProvider.label()`은 별도 구현이다.

## 요구사항

홈 v2 운영 적용 계획(`docs/redesign/HOME_V2_ROLLOUT_PLAN.md`)의 **P4 날씨**를 FE 단독으로, **화면에 연결하지 않고**
준비한다. 기준은 최신 `origin/main`(`4c80a94` — P3 운영 홈 v2 전환 머지 직후)이다.

1. `src/lib/location.ts` 를 새로 만들어 위치의 **단일 통로**로 둔다 — 권한 읽기(묻지 않음) · 권한 요청 · 위치 서비스
   켜짐 여부(묻지 않음) · 12초 제한 위치 조회 · 좌표 소수 둘째 자리 반올림 · 유한수 검사. **던지지 않는다**,
   `expo-location` 은 **지연 require**(옛 dev client 보호 · `diaryWeather.ts` 선례).
2. `src/features/diary/data/diaryWeather.ts` 의 내부 `locate()` 를 위 통로로 바꾼다. **동작 불변** —
   `src/features/diary/data/__tests__/diaryWeather.test.ts` 를 **고치지 않고** 통과해야 한다.
3. `src/features/home/data/weatherApi.ts` — `authedRequest` 로 `POST /api/v1/weather/current`, 좌표는 **본문에만**,
   응답을 **엄격 검증**하고 실패는 전부 `{ kind: "unavailable" }` 로 닫는다(던지지 않는다).
4. `src/features/home/model/weather.ts`(타입 · 응답 정규화 · TTL · 갱신 시각 표기)와
   `src/features/home/model/useHomeWeather.ts`(권한 거부/철회 · 위치 서비스 · TTL 30분 · 포커스 · 포그라운드 복귀 ·
   하루 전환 · 로그아웃/계정 변경 · 조회 세대 `fetchGen` 으로 늦은 응답 무효화 · HW-3 첫 안내 상태).
5. `src/features/home/data/weatherIntroMemory.ts` — HW-3 「안내를 봤다」를 **사용자별 키**로 기기에 기억한다.
6. `src/features/home/ui/v2/weatherStickers.ts` — §4.3 **완전한 조건 코드별** 스티커 매핑(전용 그림 → 공통 그림
   허용 표 → 숨김, 자동 연쇄 없음 · 낮/밤 교차 없음).
7. `src/features/home/ui/v2/WeatherSticker.tsx` — PNG 스티커 **독립 컴포넌트**(매핑 없으면 아무것도 그리지 않음 ·
   접근성 이름/힌트 · 누름 콜백).
8. `src/components/weather/WeatherCreditSheet.tsx` — HW-5 출처(응답의 `source` · MET Norway 원본/CC BY 4.0 링크는
   `links.ts`)와 **갱신 시각** UI 시트.
9. `app.config.ts` 의 위치 목적 문안과 `docs/PLAY-DATA-SAFETY.md` 를 **현재 코드 증거**에 맞춰 점검한다.
10. 위치 거부 · 미매핑 코드 · API 실패 · 계정 격리 테스트를 쓴다.

⚠ **계약 상태(2026-10-16)** — BE `main` 에는 `POST /api/v1/weather/current` 가 **없다**(요구사항의 2026-10-16 확인 ·
FE 반입 스냅샷 `docs/api/openapi.json` 에도 날씨 경로는 `PUT /api/v1/diaries/{id}/weather` 하나뿐이다).
이 Task 의 BE 대조는 FE 쪽 `openapi.json` 으로만 했다 — Task 작성 세션에서 `momentory-be` 디렉터리 읽기가
샌드박스에 막혀 컨트롤러를 직접 열지 못했다(구현 담당이 읽기 전용으로 다시 확인한다 · 수정 금지).
그래서 계획 §4.1~§4.3 은 **제안 계약**이다. 코드 주석 · 테스트 이름 · 커밋 본문에서 「제안 계약(§4.1 · BE 미배포)」이라고
적고, 실제 계약이라고 주장하지 않는다. 계획 P4 의 선행(BE 배포 → `npm run sync:api` 첫 커밋)은 이 Task 에서
**충족되지 않으며**, 따라서 이 브랜치는 **머지 대상이 아니라 준비 브랜치**다(계획 §6 「BE 가 배포되지 않았으면 P4 FE PR 은
머지하지 않는다」).

**하지 않는 것**: 기존 P3 운영 홈 · `app/(tabs)/home.tsx` · `HomeV2View.tsx`(와 `HeroCard.tsx` 등 그 밖의 `ui/v2/*`) 수정,
`docs/spec/**` · `docs/api/openapi.json` 수정, Harness Core · BE 수정, Push · PR · Merge, 수동 확인 없는 승인.

## 대상 범위

**앱 (Expo · React Native)** 만. Vite Design Lab(`design-lab/`)과 Expo Web Design Lab(`expo-lab/`)은 변경하지 않는다
(Expo Lab 의 `HomeV2Preview.tsx` 는 `weather: null` 로 남는다). 랩 타입 검사는 회귀 확인용으로만 돌린다.

### 변경 가능한 파일(Parallel Harness Task `p4-weather` — 이 목록 밖은 수정 금지)

| 파일                                                     | 새로/고침                                                                   |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/lib/location.ts`                                    | 새로                                                                        |
| `src/lib/__tests__/location.test.ts`                     | 새로                                                                        |
| `src/features/diary/data/diaryWeather.ts`                | 고침(동작 불변)                                                             |
| `src/features/home/data/weatherApi.ts`                   | 새로                                                                        |
| `src/features/home/data/weatherIntroMemory.ts`           | 새로                                                                        |
| `src/features/home/model/weather.ts`                     | 새로                                                                        |
| `src/features/home/model/useHomeWeather.ts`              | 새로                                                                        |
| `src/features/home/ui/v2/weatherStickers.ts`             | 고침(P1 의 6장 표 → §4.3 완전 코드 표)                                      |
| `src/features/home/ui/v2/WeatherSticker.tsx`             | 새로                                                                        |
| `src/components/weather/WeatherCreditSheet.tsx`          | 새로(디렉터리도 새로 — 계획 §4.5 의 「고침」은 사실과 다르다, 아래 결정 D1) |
| `src/features/home/__tests__/weatherApi.test.ts`         | 새로                                                                        |
| `src/features/home/__tests__/weatherSticker.test.ts`     | 새로 — §7.1 의 조건 코드 → 그림 매핑 케이스                                 |
| `src/features/home/__tests__/weatherStickers.test.ts`    | 고침 — 자산 표 · `weatherStickerForKey`                                     |
| `src/features/home/__tests__/WeatherSticker.test.tsx`    | 새로 — 컴포넌트 · 크레딧 시트 렌더                                          |
| `src/features/home/__tests__/useHomeWeather.test.tsx`    | 새로                                                                        |
| `src/features/home/__tests__/weatherIntroMemory.test.ts` | 새로                                                                        |
| `app.config.ts`                                          | 점검 · (결정 D3 에 따라) 위치 목적 문안                                     |
| `docs/PLAY-DATA-SAFETY.md`                               | 점검 · 위치 줄 · 「위치」 절                                                |

예외: Harness Core 가 생성하는 이 Task 문서(`tasks/002-p4-home-weather-fe-foundation.md`).

⚠ macOS 는 파일 이름 대소문자를 구분하지 않는다 — `weatherSticker.test.ts` 와 `WeatherSticker.test.tsx` 는 **확장자가
달라** 공존하지만, 둘의 역할(위 표)을 섞지 않는다.

## 관련 문서와 코드

먼저 `docs/CONTRIBUTING.md`(작업 규칙 정본 — 커밋 · 품질 게이트 · 코드 규칙)를 읽고, `docs/HARNESS_NAV.md` 「앱」 줄을 따른다.

**정본 · 계획**

- `CLAUDE.md` — `src/lib/*` 「단일 통로 · 던지지 않는다」 관행, `features/**` 는 `@/design/` 금지(`ui/` 제외),
  「서버 호출은 `src/lib/http.ts` 하나를 지난다」, 기기 기억은 `deviceStorage.ts` 를 지난다.
- `harness/README.md` — Parallel M1: 허용 경로 밖 변경은 종료 후 검사에서 실패, Push · PR · Merge 없음.
- `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` — §0.2(HW-1~~5 · WX-1 · WX-2 · PV-0/1 · CP-1) · §1.4(일기 날씨 현행) ·
  §4.1~~§4.3(**제안** 계약 · 조건 코드 · 공통 그림 허용 표) · §4.4(일기와의 경계) · §4.5(FE 구조) · §4.6(흐름 · 숨김 규칙 표 ·
  MF-2B) · §4.7(권한 문구 · 정밀도) · §4.8(V1~V10) · §6 P4 · §7.1 P4 테스트 목록.
- `docs/redesign/UX_STRUCTURE.md` — A-11(기기에 남는 사용자 상태의 사용자별 격리) · V-10.
- `docs/DESIGN.md` — 「홈 v2」 날씨 스티커(640~~641행 · HW-4 「아무 말도 하지 않아요」) · 「일기 날씨 자동 기록」(1155~~1159행).
- `docs/spec/RULES.md` — 오류 · 거부는 모달 · 경고 아이콘 없이 흡수(홈은 그마저 말하지 않는다).
- `docs/PRODUCT.md` · `docs/ARCHITECTURE.md` · `docs/TASKS.md` — 「상류와 차이」 · 「둘이 부딪히는 곳」 확인용(수정하지 않음).

**시작 코드**

- `src/features/diary/data/diaryWeather.ts` — 지금의 `locate()`(요청 → 서비스 → `Accuracy.Balanced` · 12초 경주 ·
  타이머 정리 · 유한수 · `Math.round(x*100)/100` · require/예외는 `unavailable`) · 사용자/날짜 재확인.
- `src/features/diary/data/__tests__/diaryWeather.test.ts` — `expo-location` 목에 `requestForegroundPermissionsAsync` ·
  `hasServicesEnabledAsync` · `getCurrentPositionAsync` · `Accuracy.Balanced` **만** 있다. 일기 경로가 그 밖의 함수
  (`getForegroundPermissionsAsync` 등)를 부르면 이 테스트가 깨진다.
- `src/lib/http.ts` — `authedRequest<T>(method, path, body, { timeoutMs })` · `HttpResult` · 던지지 않음.
- `src/lib/appState.ts` `onForeground` · `src/lib/dayChange.ts` `onDayChange` · `src/lib/time.ts` `formatKoreanTime` ·
  `src/lib/day.ts` · `src/lib/clock.ts` · `src/lib/links.ts`(`weather` · `weatherLicense`).
- `src/lib/calendar.ts` · `src/lib/notifications.ts` — 「던지지 않는 OS 통로」 선례.
- `src/features/auth/model/auth.ts` — `currentUserId()`(세션의 `userId`) · `useAuth` 의 `status` ·
  `clearUserScopedStores`(탈퇴/로그아웃 정리 자리 · **이 Task 에서 수정 불가**).
- `src/features/rest/data/deviceStorage.ts` · `guideMemory.ts` — AsyncStorage 지연 require · 못 읽음 처리 선례.
- `src/features/home/ui/v2/types.ts` — `HomeWeatherView { label; temperatureC; stickerKey }`(P2 계약 · 수정 불가 파일 아님이지만
  허용 목록 밖이므로 **읽기만**).
- `src/features/home/ui/v2/weatherStickers.ts` + `__tests__/weatherStickers.test.ts` — P1 에서 승격한 6장(`clear.day` ·
  `cloudy` · `rain` · `snow` · `thunder` · `wind`)과 계열 × 낮/밤 표. 이 파일을 쓰는 앱 코드는 테스트뿐이다(2026-10-16 검색).
- `src/components/diary/WeatherCredit.tsx` — 일기 ⓘ 시트(MET Norway · CC BY 4.0 링크). **허용 목록 밖 — 읽기만**.
- `assets/home/v2/weather/{sunny,cloudy,rainy,snowy,thunder,windy}.png` · `assets/home/v2/README.md`.
- `app.config.ts:233~245` — `expo-location` 플러그인(`locationWhenInUsePermission` = iOS `NSLocationWhenInUseUsageDescription` ·
  백그라운드 끔). Android 는 이 문안을 OS 에 보이지 않는다(런타임 권한 대화상자에 앱 문구 자리가 없다).
- `docs/PLAY-DATA-SAFETY.md:58` — 「위치 … 아니요 · 코드에 경로가 없다」 — **현재 코드와 다르다**(1.3.0 의 일기 날씨가
  반올림 좌표를 `PUT /api/v1/diaries/{id}/weather` 로 보낸다).
- `docs/api/openapi.json` — 날씨 경로는 `/api/v1/diaries/{id}/weather` 하나(홈 경로 없음 · 수정 금지).

## 구현 범위

커밋은 아래 단위로 나눈다(제목 `type: 한국어 문장형` · scope 없음 · 본문에 「왜」와 테스트 수치 · 공저자 푸터).

### 1. `src/lib/location.ts` + 일기 리팩터 (`refactor:`)

```ts
export type LocationPermission = "granted" | "denied" | "undetermined";
export async function getLocationPermission(): Promise<LocationPermission>; // 묻지 않는다
export async function requestLocationPermission(): Promise<"granted" | "denied" | "unavailable">;
export async function isLocationServiceEnabled(): Promise<boolean>; // 묻지 않는다 · 실패 false
export type RoundedPosition =
  { kind: "located"; latitude: number; longitude: number } | { kind: "unavailable" };
export async function locateRounded(): Promise<RoundedPosition>; // 권한을 묻지 않는다
export function roundCoordinate(value: number): number; // 소수 둘째 자리
export const LOCATE_TIMEOUT_MS = 12_000;
```

- 모든 함수는 `expo-location` 을 **함수 안에서** require 하고 `try` 로 감싼다 — 모듈이 없거나 실패해도 던지지 않는다.
  `getLocationPermission` 은 실패 시 `"denied"`(묻지 않는 쪽으로 닫는다 · 안내도 띄우지 않는다),
  `requestLocationPermission` 은 실패 시 `"unavailable"`(일기의 현행 `catch → unavailable` 을 보존하기 위해서다).
- `getLocationPermission` 은 `getForegroundPermissionsAsync` 의 `status`(`granted`/`denied`/`undetermined`)를 그대로 옮긴다
  (`canAskAgain` 은 보지 않는다 — §4.6 「denied(다시 물을 수 있든 없든) → 숨김」).
- `locateRounded` 는 `hasServicesEnabledAsync` → `getCurrentPositionAsync({ accuracy: Accuracy.Balanced })` 와 12초 타이머
  경주 → **`finally` 에서 타이머 정리** → 유한수 검사 → `roundCoordinate`. 정밀도는 **`Balanced` 그대로**다
  (`Accuracy.Low` 로 낮추는 것은 §4.7 의 실기기 검증 뒤 — 결정 R5).
- 범위 검사(위도 −90~~90 · 경도 −180~~180)를 더해 범위 밖이면 `unavailable`.
- `diaryWeather.ts`: `locate()` 를 지우고 `requestLocationPermission()` → `denied` 면 `{kind:"denied"}`, `unavailable` 이면
  `{kind:"unavailable"}` → `locateRounded()` 로 바꾼다. **호출 순서 · 인자 · 결과 · 사용자/날짜 재확인은 그대로**.
  `diaryWeather.test.ts` 를 수정 없이 통과시킨다(허용 목록에도 없다).

### 2. `weatherApi.ts` · `model/weather.ts` (`feat:`)

- `model/weather.ts` — 타입은 **`Home*` 접두**로 새로 만들고 `features/home/model/types.ts` 의 `Weather` 는 import 하지도
  고치지도 않는다(MF-5 · 이 Task 의 diff 에 `types.ts` 가 없어야 한다).
  - `HomeWeatherCondition { code: string; family: string; intensity: "light" | "heavy" | null; showers: boolean; thunder: boolean; daylight: "day" | "night" | null; windy: boolean }`
  - `HomeWeather { condition; label: string; temperatureC: number | null; forecastTime: string; updatedAt: string; source: string }`
    — **좌표 · `symbolCode` · `sourceUrl` · `licenseUrl` 은 담지 않는다**(화면이 쓰지 않는 원문 · 서버 URL 은 열지 않는다 — §4.1).
  - `toHomeWeather(raw: unknown): HomeWeather | null` — **엄격 검증**: `condition` 객체 · `code`/`family` 비지 않은 문자열 ·
    `showers`/`thunder`/`windy` boolean(없으면 거절 — 결정 D4 참고) · `label`/`source` 비지 않은 문자열(trim) ·
    `temperatureC` 는 유한 정수 또는 `null` · `updatedAt`/`forecastTime` 은 `Date.parse` 가능한 ISO. 하나라도 틀리면 `null`.
    결과 객체는 **허용 필드만 새로 만들어** 응답에 좌표가 섞여 와도 옮겨지지 않는다.
  - `HOME_WEATHER_TTL_MS = 30 * 60_000` · `isWeatherFresh(fetchedAtMs, nowMs)`.
  - `formatWeatherUpdatedAt(updatedAtIso, nowMs)` — KST 기준 같은 달력 날이면 「밤 9:31 갱신」, 아니면
    「10월 14일 밤 11:31 갱신」(`formatKoreanTime` 재사용 · 결정 H1 · KST 고정 +09:00 · 04:00 하루 경계가 아니라 **달력 날** — 갱신 시각은
    「지금」의 사실이다). 기기 시간대에 따라 바뀌지 않음을 테스트한다.
  - 도메인 파일은 **자산 · `@/design` · `ui/` 를 모른다**.
- `data/weatherApi.ts` — **제안 계약(§4.1 · BE 미배포)** 이라고 머리말에 적는다.
  - `fetchCurrentWeather(position: { latitude; longitude }): Promise<{ kind: "ready"; weather: HomeWeather } | { kind: "unavailable" }>`
  - `authedRequest("POST", "/api/v1/weather/current", { latitude, longitude }, { timeoutMs: 10_000 })` — 좌표는 **본문에만**,
    경로 문자열은 상수이고 쿼리를 만들지 않는다. 보내기 전에 `roundCoordinate` 로 **한 번 더 반올림**하고 유한 · 범위 밖이면
    호출하지 않고 `unavailable`.
  - `!ok`(4xx/5xx · 401 갱신 실패 · 시간 초과 · 네트워크 · 파싱) 와 `toHomeWeather == null` 은 전부 `unavailable`. 오류 코드별
    분기(429 · 503 등)를 화면 결과로 만들지 않는다(HW-4 — 같은 결과 · 문구 없음).
  - 자기 `fetch` 래퍼 금지. 로그 · `console` 에 좌표를 남기지 않는다.

### 3. `weatherIntroMemory.ts` (`feat:`)

- 키 `home.weatherIntro.v1.<userId>` · `features/rest/data/deviceStorage.ts` 의 `storage()` 경유(결정 R6).
- `readWeatherIntroSeen(userId: number): Promise<boolean>` — 값이 있으면 `true`, 없으면 `false`, **못 읽으면 `true`**
  (묻지 않는 쪽이 안전 — §4.5). `markWeatherIntroSeen(userId)` · `clearWeatherIntroMemory(userId)` — 던지지 않는다.
- `userId` 를 모르는 경우는 **호출자(훅)** 가 읽지도 쓰지도 않는다. 함수 시그니처가 `number` 만 받게 해 실수를 막는다.
- 로그아웃은 지우지 않는다. **탈퇴 시 삭제 연결(`auth.ts` `clearUserScopedStores`)은 허용 목록 밖**이라 이 Task 에서는
  `clearWeatherIntroMemory` 를 내보내기만 하고, 연결은 「수동 · 후속 항목」으로 보고한다.

### 4. `useHomeWeather.ts` (`feat:`)

`useHomeWeather(): { status: "hidden" | "intro" | "ready"; weather: HomeWeather | null; acceptIntro(): Promise<void>; dismissIntro(): Promise<void> }`

- 점검 시점: **홈 포커스**(`expo-router` `useFocusEffect`) · **포그라운드 복귀**(`onForeground`) · **하루 전환**(`onDayChange`) —
  매번 **TTL 과 무관하게** `getLocationPermission()` 과(`granted` 일 때) `isLocationServiceEnabled()` 를 다시 읽는다(둘 다 묻지 않음).
- §4.6 흐름과 숨김 규칙 표를 그대로 구현한다:
  - `granted` 아님 / 서비스 꺼짐 → `fetchGen++` · 이전 값 버림 · `hidden` · 안내 없음(`denied`).
  - `granted` + 켜짐 + (값 없음 또는 TTL 지남 또는 직전에 무효화됨) → `locateRounded()` → `fetchCurrentWeather()`.
    진행 중에는 이전 스티커 유지, **실패면 즉시 `hidden`(이전 값 버림)**, 성공이면 새 값.
  - `granted` + 켜짐 + TTL 안 → 그대로(다시 조회하지 않음).
  - `undetermined` → `currentUserId()` 가 `null` 이면 `hidden`(안내 보류 · 기록 안 씀) · 안내를 이미 봤으면 `hidden` ·
    아니면 `intro`(0.6초 지연은 화면 쪽 몫 — 훅은 상태만 낸다. 다른 시트와의 우선순위도 화면 몫).
  - `acceptIntro` → 기록 저장 → `requestLocationPermission()` → `granted` 면 조회 흐름, 아니면 `hidden`.
    `dismissIntro` → 기록 저장 → `hidden`. 둘 다 그 시점의 `userId` 로 쓰고, 사용자가 바뀌었으면 쓰지 않는다.
- **조회 세대(MF-2B)**: 조회 시작 때 `gen` 을 받고, 결과는 `gen === 현재 fetchGen` 이고 **`currentUserId()` 가 시작 때와 같을 때만**
  반영한다(성공 · 실패 모두). 철회 · 서비스 꺼짐 · 로그아웃(`useAuth` 의 `status` 가 `authenticated` 가 아니게 됨) ·
  사용자 변경을 확인한 순간 `fetchGen++` · 값 비움. 중복 방지는 **같은 세대 안에서만**(무효화된 조회는 진행 중으로 치지 않는다).
- 실패 쿨다운(결정 D2): 실패 뒤 다음 조회까지의 간격은 결정에 따른다.
- 화면 시각(`Date.now()`)은 경과 시간이라 실제 시계를 쓴다(`auth.ts` 의 `nowMs` 와 같은 이유) — 테스트는 가짜 타이머/주입.
- 언마운트 시 구독(`onForeground` · `onDayChange`)을 해제하고 세대를 올린다.
- 계측(`weather_intro_result` 등 §5.6)은 `events.ts` 가 허용 목록 밖이라 **하지 않는다**(후속 항목).

### 5. `weatherStickers.ts` · `WeatherSticker.tsx` · `WeatherCreditSheet.tsx` (`feat:`)

- `weatherStickers.ts`
  - `WEATHER_STICKERS`(자산 6장 · `require` 는 **이 파일에만**)과 `weatherStickerForKey(key)` 는 유지한다(P2 의 `HomeWeatherView.stickerKey` 계약).
  - P1 의 `WEATHER_STICKER_BY_STATE` · `weatherStickerFor(kind, timeOfDay)`(계열 × 낮/밤 표)는 §4.3 「완전 코드만」과 맞지 않으므로
    **완전 코드 표로 대체**한다(결정 R3): `SHARED_STICKER_CODES`(§4.3 공통 그림 허용 표를 **글자 그대로** — `clear.day` 1 ·
    `cloudy` 1 · `rain` 9 · `snow` 9 · 비 뇌우 9 · 바람 하늘 7) 와 `stickerKeyForCondition(condition): StickerKey | null`.
  - 순서: ① `condition.code` 와 똑같은 키의 **전용 그림**(지금은 `clear.day` · `cloudy` 만 해당) → ② 허용 표의 그 코드 줄 →
    ③ `windy === true` 이고 코드가 바람 하늘 7개 중 하나면 `wind` — 단 ①②가 먼저(결정 D5) → ④ 그 밖 `null`.
    접두 자르기 · `family` 로 떨어지기 · 낮/밤 교차 · `hasOwnProperty` 를 거치지 않은 키 조회(`toString` 등) 없음.
  - `weatherStickerForCondition(condition) → { key, source } | null` 과 `toHomeWeatherView(weather) → HomeWeatherView | null`
    (`ui/v2/types.ts` 의 타입을 import · 매핑 없으면 `null`)을 내보내 다음 단계의 화면 연결이 한 줄이 되게 한다.
- `WeatherSticker.tsx` — props `{ weather: HomeWeatherView | null; onPress: () => void; style? }`. `weather == null` 이거나
  `weatherStickerForKey` 가 `null` 이면 **`null` 반환**(빈 틀 · 문구 없음). `expo-image` 로 PNG · 테이프 · 기울기는 `ds/homeV2.ts`
  토큰(`weatherTape` 등)을 쓰고 **hex 를 쓰지 않는다** · 기울기 7°/−4° 는 홈 화면 연결 때 `homeV2.tilt.weather` ·
  `weatherTape` 로 옮긴다(결정 H2)(새 값이 필요하면 `ds/` 가 허용 목록 밖이므로 보고). 접근성:
  `accessibilityRole="button"` · 이름 「날씨: 맑음 22도」(기온 `null` 이면 「날씨: 맑음」) · 힌트 「출처와 갱신 시각 보기」.
- `WeatherCreditSheet.tsx` — props `{ visible; onDismiss; source: string; label?: string; temperatureC?: number | null; updatedAt?: string }`.
  글로벌 `BottomSheet` + `NativeModal`(현 `WeatherCredit.tsx` 의 구조) · 「맑음 · 22℃」 · 「{source} 예보 · {갱신 시각}」 ·
  「MET Norway 원본 보기」(`openExternalLink("weather")`) · 「CC BY 4.0 라이선스 보기」(`weatherLicense`) · 「확인」.
  출처 이름은 **prop 의 `source` 를 그대로**(CP-1) — 링크 주소만 `links.ts`. 홈 문안은 「지금 있는 곳의 예보」이고 일기 문안
  (「일기를 기록한 시각의 예보」)과 다르다. 일기 ⓘ 는 이 Task 에서 그대로 둔다(결정 D1).
  모달 금지 규칙과의 관계: 이것은 오류 안내가 아니라 사용자가 연 정보 시트다(일기 ⓘ 선례).

### 6. `app.config.ts` · `docs/PLAY-DATA-SAFETY.md` 점검 (`chore:` · `docs:` — 각각 커밋)

- `app.config.ts`: 결정 D3 에 따른다. 어떤 경우에도 「위치는 저장하지 않습니다」 문장은 **넣지 않는다**(CP-1 · PV-1 미검증).
  `buildNumber` · `versionCode` 는 올리지 않는다 — 올리는 시점은 실제 업로드이고 이력표(`docs/SETUP.md` §8)가 허용 목록 밖이다.
  Android 는 이 문안이 OS 대화상자에 쓰이지 않는다는 사실과, `ACCESS_FINE_LOCATION` 제외(`blockedPermissions`) 검증이 실기기
  항목이라는 점을 주석이 아니라 **보고**로 남긴다.
- `docs/PLAY-DATA-SAFETY.md`:
  - 58행 「위치 … 아니요 · 코드에 경로가 없다」에서 위치를 떼어 **「확인 필요」 줄**로 고친다 — 코드 증거: 1.3.0 의 일기 날씨가
    `Accuracy.Balanced` 로 읽어 소수 둘째 자리로 반올림한 좌표를 HTTPS `PUT /api/v1/diaries/{id}/weather` 본문으로 보낸다
    (`diaryWeather.ts` · `lib/location.ts`). 홈 경로 `POST /api/v1/weather/current` 는 **제안이며 BE 에 없다**.
  - 「위치」 절을 새로 두고 §4.8 V1~~V10 을 표로 옮긴다: **FE 코드로 답할 수 있는 V1(기기 정밀도 — 코드상 `Balanced` · 실제 Android
    매니페스트 권한은 prebuild 결과 미확인)** · **V2(FE 반올림 — 코드)** 만 근거를 적고, V3~~V10 은 「미검증 — BE 코드 · 운영 로그 ·
    캐시 · MET 요청 · 콘솔 제출본 확인 필요(담당자)」로 둔다.
  - 「DB 미저장」 · 「일시적 처리」 · 「대략적 위치」 · 「공유 아님」 같은 **최종 답을 쓰지 않는다**. 콘솔 · 운영 로그 · 웹 처리방침을
    확인했다고 쓰지 않는다. 날짜(2026-10-16)와 「FE 코드 기준 · 서버 측 미검증」을 명시한다.
  - 문서 머리말의 경고 블록 형식(🔴 · ⚠)을 따른다.

### 7. 테스트 (`test:` 또는 해당 기능 커밋에 포함)

계획 §7.1 P4 목록 가운데 **허용 파일로 쓸 수 있는 것 전부**. 각 파일:

- `src/lib/__tests__/location.test.ts` — 권한 읽기는 `request*` 를 부르지 않는다 · `undetermined`/`denied` 그대로 · 모듈 require
  실패/예외 → 권한 `denied` · 요청 `unavailable` · 서비스 `false`(던지지 않음) · 서비스 꺼짐 → `locateRounded` `unavailable` ·
  12초 지나면 `unavailable` 이고 **타이머가 남지 않는다**(`jest.getTimerCount()`) · 소수 둘째 자리(`37.56789 → 37.57` · 음수 ·
  `.005` 경계) · `NaN`/`Infinity`/범위 밖 → `unavailable` · `locateRounded` 는 권한을 묻지 않는다.
- `src/features/home/__tests__/weatherApi.test.ts` — `POST` · 경로가 정확히 `/api/v1/weather/current` 이고 **경로에 `latitude` ·
  `longitude` · `?` 가 없다** · 본문은 `{ latitude, longitude }` 둘뿐이고 소수 둘째 자리 · `timeoutMs: 10_000` · §4.1 예시 응답 → ready ·
  필드 하나씩 빠지거나 타입이 틀리면 unavailable(`condition` 없음 · `family` 숫자 · `updatedAt` 파싱 불가 · `temperatureC` 소수/`NaN`/문자열 ·
  `label` 공백) · 4xx/5xx/429/503/시간 초과/네트워크 → unavailable · 응답에 `latitude`/`longitude` 가 와도 결과에 없다 · 유한하지 않은
  좌표는 호출하지 않는다.
- `src/features/home/__tests__/weatherSticker.test.ts` — §7.1 의 조건 → 그림 케이스 전부: 허용 표의 **모든 완전 코드를 하나씩** 기대 그림과
  대조(표를 테스트 안에 글자 그대로 다시 적는다) · `rain.thunder → thunder` · §4.1 예시 `rain.heavy.showers.thunder.night → thunder` ·
  `clear.night`/`fair.*`/`partly_cloudy.*`/`fog` → `null` · `snow.heavy.showers.thunder.night` · `sleet.light.thunder` · `sleet.showers.day` →
  `null` · `unknown` · 모르는 family · `toString`/`__proto__` → `null` · `windy` 는 하늘 7코드에서만 `wind` · `sleet` + `windy` → `null` ·
  `rain` + `windy` → `rain`(강수가 먼저) · 기존 6장이 모두 어떤 코드에 닿는다 · 「전용 그림이 생겨도 같은 코드만 바뀐다」(매핑 함수에
  전용 키 집합을 주입할 수 있게 하거나 표 구조로 검증).
- `src/features/home/__tests__/weatherStickers.test.ts` — 자산 6장 키 · `weatherStickerForKey`(있는 키 · 없는 키 · 프로토타입 키) ·
  `toHomeWeatherView`(매핑 없으면 `null` · 있으면 `label`/`temperatureC`/`stickerKey`).
- `src/features/home/__tests__/WeatherSticker.test.tsx` — `weather == null`·미매핑 키 → 아무것도 렌더하지 않음(문구 없음) · 접근성
  이름 「날씨: 맑음 22도」 / 「날씨: 맑음」 · 누르면 `onPress` · `WeatherCreditSheet` 가 `source` prop 그대로 · 「밤 9:31 갱신」/
  「10월 14일 밤 11:31 갱신」(결정 H1) · 링크가 `openExternalLink("weather")` · `("weatherLicense")` 를 부른다.
- `src/features/home/__tests__/useHomeWeather.test.tsx` — §7.1 의 훅 케이스 전부(허용 → 스티커 · undetermined + 미열람 → intro ·
  닫으면 다시 묻지 않음 · 거부 → hidden · 안내 없음 · TTL 안 재조회 없음 · 하루 전환 재조회 · 로그아웃 비움 · 다른 사용자 응답 버림 ·
  MF-2 실패 시 이전 값 버림 · TTL 재조회 중 이전 값 유지 후 실패면 숨김 · 복귀 때 `denied` → 조회 없이 숨김 · 서비스 꺼짐 → 숨김 ·
  복귀마다 `getLocationPermission`/`isLocationServiceEnabled` 호출 수 · 철회 후 재허용 시 TTL 남아도 재조회 · MF-2B 늦은 성공 버림
  (권한 철회 · 서비스 꺼짐 · 로그아웃 세 경우) · 무효화된 조회 중 새 조회가 시작되고 새 응답만 반영 · `userId` 모름 → intro 없음 ·
  기록 안 씀). `expo-router` 의 `useFocusEffect` · `@/lib/appState` · `@/lib/dayChange` · `@/lib/location` · `weatherApi` ·
  `@/features/auth/model/auth` 를 목으로 둔다.
- `src/features/home/__tests__/weatherIntroMemory.test.ts` — 키에 `userId` 포함 · A 가 본 뒤 B 는 `false` · A 다시 `true`(로그아웃은
  지우지 않음) · `clearWeatherIntroMemory(A)` 뒤 A `false` · B 는 남음 · 저장소 `getItem` 이 던지면 `true` · `setItem` 이 던져도 던지지 않음.

## 검증 기준

`docs/CONTRIBUTING.md` 「품질 게이트」 순서(Core 품질 게이트):

```bash
npm run typecheck
npm run typecheck:lab
npm run typecheck:expo-lab
npm run lint            # --max-warnings 0
npm run format:check
npm run test -- --ci
```

추가 자동 확인:

- `src/features/diary/data/__tests__/diaryWeather.test.ts` 가 **수정 없이** 통과(파일이 diff 에 없다).
- `git diff --name-only origin/main...HEAD` 가 위 허용 목록 + 이 Task 문서 안에만 있다. 특히 `app/(tabs)/home.tsx` ·
  `src/features/home/ui/v2/HomeV2View.tsx` · `HeroCard.tsx` · `src/features/home/model/types.ts` · `docs/spec/**` ·
  `docs/api/openapi.json` · `harness/**` 가 없다.
- `src/features/**`(ui 제외)의 `@/design` import 0 · `src/design/**` 밖 hex 0(린트).
- `grep -rn "weather/current" src` 의 결과가 `weatherApi.ts`(와 테스트)뿐 · 좌표를 URL · 로그에 넣는 코드가 없다.
- Codex 리뷰는 Core 품질 게이트의 절차를 따른다.

**미검증으로 남기는 수동 항목**(이 Task 에서 통과시키지 않는다 — 결과에 「미검증」으로 보고):

- 네이티브 실기기: iOS/Android 권한 대화상자 · 새 목적 문안 · 「정확한 위치」 끔 상태 · 위치 서비스 끔 · 비행기 모드 · 12초 시간 초과 ·
  VoiceOver/TalkBack 스티커 이름 · `Accuracy.Low` 충분성 · Android `ACCESS_FINE_LOCATION` 제외 가능성.
- 서버: BE 에 `POST /api/v1/weather/current` 배포 · `npm run sync:api` 반입 · 요청 본문 로깅 금지 · 캐시 보관 기간(§4.2) · V3~V10.
- 스토어: Play Console 데이터 보안 · App Store Connect 앱 개인정보 **제출본** · 웹 처리방침(`momentory.co.kr/privacy`) — 담당자 확인.
- 문안: HW-3 안내 · HW-5 시트 · 권한 문구의 CP-1 최종 검토(「저장하지 않아요」 포함 여부는 PV-1 뒤).

**허용 파일 밖이라 보고만 하는 후속 항목**(임의 수정 금지):

- `app/(tabs)/home.tsx` 에서 `useHomeWeather` → `toHomeWeatherView` → `model.weather` 연결 · HW-3 안내 시트 UI · HW-5 시트 열기.
- `HeroCard.tsx` 가 `WeatherSticker` 를 그리게 하기.
- `src/features/auth/model/auth.ts` — 탈퇴 시 `clearWeatherIntroMemory(userId)` · (필요하면) 로그아웃 시 날씨 비움.
- `src/components/diary/WeatherCredit.tsx` 가 `WeatherCreditSheet` 를 쓰게 하기(D1).
- `src/design/ds/homeV2.ts` 에 `homeV2.tilt.weather`(7°) · `homeV2.tilt.weatherTape`(−4°) 이름을 만들고
  `WeatherSticker.tsx` 가 쓰게 하기(H2 · 홈 화면 연결 때).
- `src/features/analytics/events.ts` · `docs/ANALYTICS.md` 의 §5.6 날씨 이벤트.
- `docs/api/README.md` · `docs/SETUP.md` §8(`buildNumber`/`versionCode`) · `docs/DESIGN.md` · `docs/PRODUCT.md` 「상류와 차이」 행.
- `deviceStorage.ts` 를 `src/lib/` 로 옮기는 정리(R6).

Push · PR · Merge 를 하지 않는다. 수동 확인 없이 승인 처리하지 않는다.

## 결정 필요 사항

없음 — D1~D5 · H1 · H2 는 2026-10-16 사람의 결정으로 확정됐다(아래 「이미 확정된 결정」).

## 이미 확정된 결정

| ID  | 결정                                                                                                                                                                       | 근거                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| R1  | 홈 날씨 계약은 **제안**이다 — BE `main` · `openapi.json` 에 `POST /api/v1/weather/current` 없음. 브랜치는 머지 대상이 아니다                                               | 요구사항(2026-10-16 확인) · `openapi.json` · 계획 §6 P4 선행         |
| R2  | 실패는 전부 스티커 숨김 · 문구 · 재시도 · 설정 이동 없음                                                                                                                   | 계획 HW-4 · `DESIGN.md` 640~641 · `RULES.md`                         |
| R3  | P1 의 계열 × 낮/밤 표를 §4.3 완전 코드 허용 표로 대체 · 자동 연쇄 · 낮/밤 교차 없음 · `require` 는 `weatherStickers.ts` 에만 · `model/` 은 자산을 모른다                   | 계획 §4.3 WX-1 · MF-WX1 · `CLAUDE.md` features 의 `@/design` 금지    |
| R4  | 홈 날씨 타입은 `Home*` 별도 · `types.ts` 의 `Weather` 를 고치지 않는다                                                                                                     | 계획 §4.5 · MF-5 · `ui/v2/types.ts` 주석                             |
| R5  | 위치 정밀도는 `Accuracy.Balanced` 유지 · 일기 동작 불변 · 일기의 「묻고 → 위치」 유지                                                                                      | 계획 §4.5 · §4.7(실기기 검증 뒤) · `diaryWeather.test.ts` 목         |
| R6  | 안내 기록은 `home.weatherIntro.v1.<userId>` · `features/rest/data/deviceStorage.ts` 경유 · 못 읽으면 「봤다」 · 로그아웃은 지우지 않음 · `userId` 는 `currentUserId()`     | 계획 §4.5 · UX A-11/V-10 · `CLAUDE.md` 「기기 기억은 deviceStorage」 |
| R7  | 좌표는 본문에만 · FE 반올림 후 BE 재반올림 전제 · 서버 URL(`sourceUrl`)을 열지 않고 `links.ts` 만 · 출처 이름은 응답 `source`                                              | 계획 WX-2 · §4.1 · CP-1                                              |
| R8  | 「저장하지 않는다」 · 스토어 최종 답을 문서 · 문안에 단정하지 않는다 — PV-1 검증 전                                                                                        | 계획 CP-1 · PV-0 · PV-1 · 요구사항                                   |
| R9  | 계측 · 화면 연결 · `auth.ts` 연결 · 빌드 번호는 이 Task 밖(보고만)                                                                                                         | Parallel Task 허용 목록 · `harness/README.md`                        |
| D1  | `WeatherCreditSheet` 는 **독립**으로 만들고 일기 ⓘ(`components/diary/WeatherCredit.tsx`)는 그대로 둔다 · 일기 전환은 후속                                                  | 사람의 결정(2026-10-16) · 허용 목록                                  |
| D2  | 조회 실패(4xx/5xx · 시간 초과 · 형태 이상 · 위치 unavailable)는 모두 **마지막 시도 시각부터 TTL 30분** 다시 묻지 않는다 · 권한 · 서비스로 숨겼다가 돌아오면 즉시 재조회    | 사람의 결정(2026-10-16) · `useHomeWeather.ts` `lastAttemptAt`        |
| D3  | 위치 목적 문안은 첫 문장만 「홈과 일기에 지금 있는 곳의 날씨를 보여 주기 위해 위치를 사용합니다.」 · 저장 문장 없음 · 빌드 번호 유지                                       | 사람의 결정(2026-10-16) · CP-1 최종 검토는 수동                      |
| D4  | 응답 `condition` 의 `showers` · `thunder` · `windy` 가 빠지거나 boolean 이 아니면 **거절**(unavailable → 스티커 숨김)                                                      | 사람의 결정(2026-10-16) · `weather.ts` `toHomeWeather`               |
| D5  | 전용 → 허용 표 → 바람 순: `clear.day`+windy → `sunny` · `cloudy`+windy → `cloudy` · `clear.night`+windy → 바람 그림(`wind`)                                                | 사람의 결정(2026-10-16) · `weatherStickers.ts`                       |
| H1  | HW-5 갱신 시각은 `formatKoreanTime` 표기 그대로 — 「밤 9:31 갱신」 · 「10월 14일 밤 11:31 갱신」(계획 예시의 「오후」가 아니다)                                            | 사람의 결정(2026-10-16) · 시각 표기의 단일 통로 `lib/time.ts`        |
| H2  | 스티커 7° · 테이프 −4° 기울기는 **홈 화면 연결 때** `homeV2.tilt.weather` · `weatherTape` 로 이름을 만든다 — 이 Task 는 `WeatherSticker.tsx` 안 값으로 둔다(`ds/` 허용 밖) | 사람의 결정(2026-10-16) · 후속 항목                                  |
