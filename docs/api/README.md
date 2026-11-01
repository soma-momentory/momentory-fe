# 서버 API 계약 — 반입 스냅샷

> ⚠ **`openapi.json` 을 직접 고치지 않는다.** 개발 서버가 내주는 문서를 그대로 받은
> 것이라, 손으로 고치면 서버와 어긋난 채로 아무도 모르게 남는다.
> 갱신은 다시 받는 것으로만 한다 — `docs/spec/` 과 같은 규칙이다.

```bash
npm run sync:api                            # .env 의 EXPO_PUBLIC_API_BASE_URL 에서 받는다
MOMENTORY_API=http://127.0.0.1:8080 npm run sync:api   # 주소를 직접 줄 때
```

받고 나면 늘어난 · 사라진 엔드포인트를 줄로 찍어준다. **그 줄을 PR 본문에 옮겨 적는다** —
계약이 언제 무엇 때문에 바뀌었는지는 diff 만으로는 안 보인다.

> ✅ **2026-09-12 — 다시 대조했다** (BE `d456a98` 「회고 채팅 v2」). **스냅샷은 서버와 같다** —
> `openapi.json` 의 오퍼레이션 **33개**가 BE 컨트롤러의 매핑 33개와 하나도 어긋나지 않는다.
> 그중 **27개가 붙어 있고**, 안 붙은 여섯은 아래 표에 있다. 이 문서의 표들은 그 대조에서
> 나왔다 — 이번에도 낡아 있던 것은 스냅샷이 아니라 이 README 였다.
>
> 이전 대조: 2026-08-21(26개 · BE `40da034`) · 2026-08-24 재반입(32개).

## 왜 받아서 커밋하는가

계약이 서버에만 있으면 **서버가 꺼져 있는 동안 아무도 확인할 수 없고**, 어제와 무엇이
달라졌는지도 알 수 없다. 스냅샷을 커밋하면 git diff 가 그걸 말해준다.
`docs/TASKS.md` 가 「M2 이후를 막는 것」으로 적어둔 `docs/api/openapi.yaml` 이 이 파일이다.

파일 이름이 `.yaml` 이 아닌 이유: 서버가 springdoc 이라 `/v3/api-docs` 로 **JSON** 을 낸다.
번역하면 그 자체가 손으로 고친 사본이 된다.

## 이 문서가 계약의 전부는 아니다

OpenAPI 는 **모양**을 말하지만 다음은 말하지 않는다. 원래 셋이었고 **그 사이 둘이
닫혔다** — 남은 것은 첫 줄 하나다.

- ⛔ **멱등성 규약**(`Idempotency-Key` · `If-Match` · 409 처리) — [`DISCUSSION.md`](../DISCUSSION.md) §1-1.
  **서버에 아직 없다.** BE 전체에 `Idempotency-Key`·`If-Match`·`ETag` 를 읽는 자리가
  하나도 없다(2026-08-21 확인). M3-3 아웃박스가 이 답을 기다린다
- ✅ **기기 캘린더와 서버의 동기화 방향**(§1-4) — **닫혔다.**
  `POST /api/v1/schedules/sync` 가 화해(reconcile) 계약이고, `ScheduleResponse` 가
  `source`·`hidden` 을 노출한다
- △ **회고 대화의 안전 규칙·중단·재개 계약**(§1-2) — **안전 규칙은 닫혔다.**
  서버가 `ReplyDto.safetyLevel` 로 등급을 내려주고(`none` · `caution` · `risk` ·
  `imminent` — BE `SafetyLevel`), 위기 안내 뒤에도 **대화를 이어갈 수 있다**
  (`phase="safety_hold"` 는 `done=false` — BE `#53`). **재개는 여전히 없다** — 세션 상태는
  서버가 들고 있지만 **대화 이력을 되읽는 엔드포인트가 없다**(회고 계약은 `POST` 둘뿐이다)

**날짜 경계도 OpenAPI 가 말하지 않는다.** ⚠ **2026-09-12 현재 서버의 하루 경계는
KST 자정이 아니라 04:00 이다** — BE `DayBoundary`(`BOUNDARY_HOUR = 4`, `#45`)가
프론트 `src/lib/clock.ts` 와 **같은 값·같은 뜻**을 쓴다. 달 조회 창은 그대로 KST 기준이다
(`TimeZonePolicy` = `Asia/Seoul`). 아래 「경계가 갈리는 자리」를 먼저 본다.

## 어댑터가 계약을 읽는 자리

화면은 서버 모양을 보지 않는다. **`src/features/<도메인>/data/` 의 어댑터가 경계**이고,
각 어댑터 파일 머리의 JSDoc 이 그 엔드포인트에 대한 이 저장소 쪽 기록이다.

| 어댑터                                                  | 엔드포인트                                                                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/auth/data/kakaoAuthApi.ts`                | `POST /api/v1/auth/kakao`                                                                                                                                                  |
| `src/features/auth/data/appleAuthApi.ts`                | `POST /api/v1/auth/apple`                                                                                                                                                  |
| `src/features/auth/data/googleAuthApi.ts`               | `POST /api/v1/auth/google`                                                                                                                                                 |
| `src/features/auth/data/reissueApi.ts`                  | `POST /api/v1/auth/reissue`                                                                                                                                                |
| `src/features/auth/data/logoutApi.ts`                   | `POST /api/v1/auth/logout`                                                                                                                                                 |
| `src/features/auth/data/meApi.ts`                       | `GET /api/v1/users/me`                                                                                                                                                     |
| `src/features/auth/data/withdrawApi.ts`                 | `DELETE /api/v1/users/me`                                                                                                                                                  |
| `src/features/onboarding/data/optionsApi.ts`            | `GET /api/v1/onboarding/options`                                                                                                                                           |
| `src/features/onboarding/data/completeOnboardingApi.ts` | `PUT /api/v1/users/me/onboarding`                                                                                                                                          |
| `src/features/retro/data/retroApi.ts`                   | `POST /api/v1/retrospect` · `POST …/{id}/messages`                                                                                                                         |
| `src/features/home/data/scheduleApi.ts`                 | `GET`·`POST /api/v1/schedules` · `GET …/period` · `PATCH`·`DELETE …/{id}` · `PATCH …/{id}/visibility` · `PATCH …/order` · `PUT …/{id}/completion`                          |
| `src/features/calendar/data/calendarSyncApi.ts`         | `POST /api/v1/schedules/sync`                                                                                                                                              |
| `src/features/diary/data/diaryApi.ts`                   | `GET /api/v1/diaries` · `DELETE …/{id}` · `PUT …/by-retrospect/{retrospectId}` · `GET /api/v1/action-cards` · `PUT …/{id}/completion` · `DELETE /api/v1/action-cards/{id}` |
| `src/features/report/data/weeklyReportApi.ts`           | `GET /api/v1/reports/weekly`                                                                                                                                               |
| `src/features/rest/data/treasureApi.ts`                 | `POST /api/v1/treasures` · `GET /api/v1/treasures` (`?date=` 그날 · 없으면 전부)                                                                                           |
| `src/features/rest/data/worryApi.ts`                    | `POST /api/v1/worries` · `GET /api/v1/worries` (맡겨둔 걱정 전부 · 최신순)                                                                                                 |
| `src/features/rest/data/restRecordApi.ts`               | `POST /api/v1/rest-records` · `GET /api/v1/rest-records?content=` (쉼터별 · 최신순)                                                                                        |

> ✅ **`DELETE /api/v1/action-cards/{id}` 는 붙었다** (2026-08-24 계약 반입 → 연결).
> 이것이 [`PRODUCT.md` 「상류와 차이」](../PRODUCT.md) #25 를 닫았다 — 지운 카드 id 를
> 기기에 묘비로 남기던 `deletedCardStore.ts` 는 **사라졌고**, 다른 기기에서 지운 카드가
> 다시 보이는 일도 없다.

> ⚠ **옛 표의 마지막 줄(`src/features/diary/data/retrospectDiaryApi.ts` →
> `GET /api/v1/retrospect/{id}/diary`)은 둘 다 없다.** 엔드포인트는 2026-08-20 에
> 서버에서 사라졌고(`TASKS.md` 「남은 API 연결」), 파일은 `diaryApi.ts` 로 대체됐다.
> **BE 코드에는 그 경로를 가리키는 javadoc 이 아직 여섯 군데 남아 있다**
> (`ActionCardController` · `ActionCardResponse` · `ActionCardView` · `DiaryController` ·
> `DiaryResponse` · `DiaryView`) — 매핑은 없으므로 **출처 표시로만 읽는다.**
> BE 에 정리를 제기할 자리다.

## 아직 붙지 않은 것 — 여섯 (2026-09-12)

`openapi.json` 에는 있고 어댑터가 없다. 순서는 [`docs/TASKS.md`](../TASKS.md) 「남은 API 연결」을 본다.

| 엔드포인트                                | 왜 없나                                                                                                                                                               |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`·`PUT`·`DELETE /api/v1/memos/{date}` | **붙이지 않기로 했다**(2026-08-11 제품 결정) — 서버는 날짜당 하나(`{ content }`)인데 스키마 `Moment` 는 여럿이다. 그 뒤 순간 화면(`12-d`)까지 사라져 부를 자리가 없다 |
| `GET /api/v1/diaries/{id}`                | 월별 목록(`GET /api/v1/diaries`)이 본문까지 그대로 채워 줘서 부를 자리가 없다                                                                                         |
| `GET /api/v1/diaries/all`                 | 같은 이유 — 보관함은 **달 단위**로 받아 뒤로 훑는다(`diary.ts` 의 창)                                                                                                 |
| `GET /api/v1/action-cards/{id}`           | 같은 이유. 카드는 `retrospectId` 로 일기와 조인해 목록에서 세운다                                                                                                     |

## 경계가 갈리는 자리 — 알고 붙였다

| 무엇                       | 서버                                                                   | 프론트                                                                             |
| -------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 하루 경계                  | **04:00 KST** (`DayBoundary` · BE `#45`)                               | **04:00 앱-하루** (`src/lib/clock.ts`) — ✅ **같다**                               |
| 월 조회 창                 | `[그 달 1일 00:00 KST, 다음 달 1일 00:00 KST)` 반열림                  | `diaryApi.ts` 의 `kstDate` 가 **서버 경계에 맞춘다** — 여기는 어긋나지 않는다      |
| 회고 「하루 한 번」 판정   | **04:00 경계**로 오늘 일기가 있으면 `409` (BE `hasDiaryOn`)            | 같은 경계로 센다 — ✅ **더 이상 갈리지 않는다**                                    |
| 일정 감정                  | `emotion` **단수 nullable** · `completed=false` 에 감정을 보내면 400   | 감정을 고르면 마침이 함께 켜진다([`PRODUCT.md`](../PRODUCT.md) 「상류와 차이」 13) |
| 일정 수정·삭제             | `PATCH`·`DELETE /{id}` 는 **`source=MANUAL` 만** — 캘린더 일정은 `404` | 캘린더 일정은 `PATCH …/{id}/visibility` 로 **숨기기만** 한다                       |
| 캘린더 일정의 `externalId` | 화해 요청(`CalendarSyncEventRequest`)에만 있고 **응답에는 없다**       | `scheduleApi.ts` 가 `externalId: null` 로 둔다 — 화면이 원본 id 를 안 쓴다         |

✅ **자정~04시가 갈리던 문제는 닫혔다** (2026-09-12 대조 · BE `#45` 「하루 경계를 새벽
4시로」). 예전에는 22일 01:00 에 시작한 회고를 화면은 「21일」로, 서버는 「22일」로 세어
`409`(`ALREADY_RETROSPECTED_TODAY`)가 엇갈렸다. 지금은 **양쪽 다 04:00** 이다 —
BE `DayBoundary.toLocalDate()` 가 프론트 `clock.today()` 와 같은 규칙이다.
`retroApi.ts` 는 그 `409` 를 여전히 안내 한 줄로 흡수한다(다른 기기에서 이미 마친 경우).

## 오류 코드 — 서버가 실제로 내는 것 전부

`ApiErrorResponse` 는 `{ code, message }` 하나뿐이고 코드는 아래가 전부다
(BE `*ExceptionHandler` 전수 대조 · **2026-09-12 갱신** — 애플·구글이 붙으면서 열두 개가 늘었다).

| 코드                                                                                                                         | 상태  | 언제                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| `INVALID_REQUEST`                                                                                                            | `400` | 검증 실패 전반 · 잘못된 연·월 · 일정 순서 · 캘린더 화해 요청             |
| `KAKAO_EMAIL_CONSENT_REQUIRED` · `KAKAO_EMAIL_UNAVAILABLE`                                                                   | `400` | 카카오계정 이메일 동의가 없거나 인증된 이메일이 없다                     |
| `APPLE_EMAIL_UNAVAILABLE` · `GOOGLE_EMAIL_UNAVAILABLE`                                                                       | `400` | 〃 (애플 · 구글)                                                         |
| `AUTHENTICATION_REQUIRED`                                                                                                    | `401` | 토큰의 사용자를 서버가 못 찾을 때                                        |
| `KAKAO_TOKEN_INVALID` · `KAKAO_APP_ID_MISMATCH` · `KAKAO_USER_ID_MISMATCH`                                                   | `401` | 카카오 인증 실패 세 갈래                                                 |
| `APPLE_TOKEN_INVALID` · `APPLE_NONCE_MISMATCH` · `APPLE_CLIENT_ID_MISMATCH`                                                  | `401` | 애플 인증 실패 세 갈래 (nonce 재생 방지 포함)                            |
| `GOOGLE_TOKEN_INVALID` · `GOOGLE_CLIENT_ID_MISMATCH`                                                                         | `401` | 구글 인증 실패 두 갈래 (`aud`·`azp` 대조)                                |
| `REFRESH_TOKEN_INVALID` · `REFRESH_TOKEN_REVOKED` · `REFRESH_TOKEN_EXPIRED`                                                  | `401` | 갱신 실패 세 갈래                                                        |
| `ACCESS_DENIED`                                                                                                              | `403` | 인증은 됐는데 권한이 없다 (`JsonAccessDeniedHandler`)                    |
| `SCHEDULE_NOT_FOUND` · `DIARY_NOT_FOUND` · `ACTION_CARD_NOT_FOUND` · `DAILY_MEMO_NOT_FOUND` · `RETROSPECT_SESSION_NOT_FOUND` | `404` | 없거나 **남의 것**일 때 — 소유권 실패도 404 다(존재를 흘리지 않는다)     |
| `ALREADY_RETROSPECTED_TODAY`                                                                                                 | `409` | 오늘(**04:00 경계**) 이미 회고를 마쳤다 — `retroApi.ts` 가 안내로 받는다 |
| `APPLE_REVOKE_UNAVAILABLE`                                                                                                   | `500` | 탈퇴 때 애플 연결 해제 설정(`.p8`)이 없다 — ⛔ 발급 대기 중              |
| `KAKAO_API_SERVER_ERROR` · `KAKAO_API_RESPONSE_ERROR`                                                                        | `502` | 카카오 쪽 오류                                                           |
| `APPLE_API_RESPONSE_ERROR` · `GOOGLE_API_RESPONSE_ERROR`                                                                     | `502` | 애플 · 구글 응답을 처리할 수 없다                                        |
| `KAKAO_API_NETWORK_ERROR` · `APPLE_API_NETWORK_ERROR` · `GOOGLE_API_NETWORK_ERROR`                                           | `503` | 그 서비스에 닿지 못함                                                    |

⚠ **화면은 이 코드를 그대로 보여주지 않는다.** 어댑터가 사용자가 할 수 있는 일 기준으로
몇 갈래(`network` · `server` · `unauthorized` …)로 접고, 화면은 **한 줄 안내**로 흡수한다
(`RULES.md` 4 · 모달·재시도 버튼 금지).

**인증 없이 열린 경로는 넷뿐이다**(BE `SecurityConfiguration.PUBLIC_PATHS`):
`/actuator/health` · `/swagger-ui/**` · `/v3/api-docs/**` · `/api/v1/auth/**`.
나머지는 전부 Bearer 를 요구하고, 세션은 **stateless**(CSRF 없음)다.
access token 수명은 **30분**(`jwt.access-token-expiration: 30m`), refresh 수명은
배포 환경변수(`JWT_REFRESH_EXPIRATION`)라 저장소에서는 알 수 없다.

⚠ **`sync:api` 는 `/v3/api-docs` 를 그대로 받는다** — 그 경로가 `PUBLIC_PATHS` 라
토큰 없이도 받아진다. 스냅샷 갱신에 로그인이 필요 없다는 뜻이다.

## 직접 일기 쓰기 (2026-11-01 · 배포 전)

- `POST /api/v1/diaries`: `{ "original": "직접 쓴 본문", "emotion": "happy" }` → 201 `DiaryResponse`.
  인증된 사용자로 오늘(04:00 KST 경계) 일기를 생성한다. 본문은 공백 제외 한 글자 이상,
  최대 500자다. `emotion`은 사진 자리에서 사용자가 고른 소문자 감정 키이며 선택하지 않으면 생략한다. AI 세션·감정 추론·바람카드·자동 편지는 생성하지 않는다.
- `PUT /api/v1/diaries/{id}`: 같은 요청 → 200 `DiaryResponse`. 소유한 일기 본문만 수정한다.
- 직접 쓴 일기 응답은 `retrospectId`를 생략한다. 클라이언트는 `authoredBy: "user"`로 읽는다.
  기존 AI 일기는 `retrospectId`를 계속 포함하며 기존 회고 기준 수정 API도 유지한다.
- 400 `INVALID_REQUEST`(본문 누락·500자 초과·파싱 실패), 401 `AUTHENTICATION_REQUIRED`,
  생성 시 409 `ALREADY_RETROSPECTED_TODAY`, 수정 시 404 `DIARY_NOT_FOUND`를 반환한다.
- BE V33 마이그레이션은 `diaries.retrospect_id`의 NOT NULL만 해제한다. 기존 FK·회고당 UNIQUE는 유지한다.
  AI 완료와 직접 저장이 사용자 행 잠금을 공유해 동시 저장도 하루 한 장만 남긴다.

OpenAPI 생성물은 이 기능이 반영된 서버에서 `npm run sync:api`로 반입한다.

직접 작성 요청은 `DiaryCreateRequest`(본문·선택 감정), id 기반 본문 수정은 `DiaryWriteRequest`(본문만)를 사용한다.
선택 감정은 기존 10종 키만 허용하며, 잘못된 키는 400 `INVALID_REQUEST` / `감정을 확인해주세요.`로 거절한다.
선택한 감정은 `primaryEmotion`과 `emotions`에 함께 저장해 보관함 재조회 시 같은 사진을 표시한다.

직접 작성·본문 수정 시 기존 채팅의 사건 추출기(G1)를 한 번 호출한다. DB 트랜잭션 밖에서 추출하고,
본문·사용자 선택 감정·구조화 사건을 같은 트랜잭션에서 저장한다. 추출 실패나 사건 없는 글은 빈 사건 목록으로 저장한다.
V34의 `diaries.events_json`에는 사건 이름·요약과 실제 본문에 근거가 있는 감정만 보관한다. 별도 채팅 세션은 만들지 않는다.
편지의 욕구·행동 추천 입력에서 저장된 사건을 사용하며, 사진 감정이나 무감정 선택을 모델 추론으로 덮지 않는다.
본문 수정은 사건도 교체해 이전 본문의 사건을 추천에 재사용하지 않는다. 직접 작성·수정의 앱 대기 제한은 40초다.
