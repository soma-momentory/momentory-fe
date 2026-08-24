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

> ✅ **2026-08-21 — 스냅샷과 서버 코드를 직접 대조했다** (BE `40da034` 「캘린더 일정
> 동기화 API 추가」). **`openapi.json` 은 서버와 정확히 같다** — 엔드포인트 **26개**,
> 스키마 41개가 컨트롤러·DTO 와 하나도 어긋나지 않는다. 이 문서의 아래 표들은
> 그 대조에서 나온 것이고, **어긋나 있던 것은 스냅샷이 아니라 이 README 였다.**

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
- △ **회고 대화의 안전 규칙·중단·재개 계약**(§1-2) — **안전 규칙만 닫혔다.**
  서버가 `ReplyDto.safetyLevel` 로 등급을 내려준다(`none` · `caution` · `risk` ·
  `imminent` — BE `SafetyLevel`). **재개는 아직 없다** — 세션 상태는 서버가
  `state_json` 에 들고 있지만 **대화 이력을 되읽는 엔드포인트가 없다**(회고 계약은
  `POST` 둘뿐이다)

**날짜 경계도 OpenAPI 가 말하지 않는다.** 서버의 하루·달 경계는 전부 **KST 자정**이다
(BE `TimeZonePolicy` = `Asia/Seoul`). 아래 「경계가 갈리는 자리」를 먼저 본다.

## 어댑터가 계약을 읽는 자리

화면은 서버 모양을 보지 않는다. **`src/features/<도메인>/data/` 의 어댑터가 경계**이고,
각 어댑터 파일 머리의 JSDoc 이 그 엔드포인트에 대한 이 저장소 쪽 기록이다.

| 어댑터                                                  | 엔드포인트                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/auth/data/kakaoAuthApi.ts`                | `POST /api/v1/auth/kakao`                                                                                                             |
| `src/features/auth/data/appleAuthApi.ts`                | `POST /api/v1/auth/apple`                                                                                                             |
| `src/features/auth/data/reissueApi.ts`                  | `POST /api/v1/auth/reissue`                                                                                                           |
| `src/features/auth/data/logoutApi.ts`                   | `POST /api/v1/auth/logout`                                                                                                            |
| `src/features/auth/data/meApi.ts`                       | `GET /api/v1/users/me`                                                                                                                |
| `src/features/onboarding/data/optionsApi.ts`            | `GET /api/v1/onboarding/options`                                                                                                      |
| `src/features/onboarding/data/completeOnboardingApi.ts` | `PUT /api/v1/users/me/onboarding`                                                                                                     |
| `src/features/retro/data/retroApi.ts`                   | `POST /api/v1/retrospect` · `POST …/{id}/messages`                                                                                    |
| `src/features/home/data/scheduleApi.ts`                 | `GET`·`POST /api/v1/schedules` · `PATCH`·`DELETE …/{id}` · `PATCH …/{id}/visibility` · `PATCH …/order` · `PUT …/{id}/completion`      |
| `src/features/calendar/data/calendarSyncApi.ts`         | `POST /api/v1/schedules/sync`                                                                                                         |
| `src/features/diary/data/diaryApi.ts`                   | `GET /api/v1/diaries` · `DELETE …/{id}` · `PUT …/by-retrospect/{retrospectId}` · `GET /api/v1/action-cards` · `PUT …/{id}/completion` |

> ⚠ **2026-08-24 재반입 — 스냅샷은 이제 오퍼레이션 32개다.**
> `MOMENTORY_API=http://127.0.0.1:8080 npm run sync:api` 로 개발 서버에서 다시 받았고,
> 받기 전 커밋된 스냅샷은 30개였다. **늘어난 둘**은 스크립트가 찍어 준 그대로다:
>
> - **`POST /api/v1/auth/apple`** — 애플 로그인. 같은 날 `appleAuthApi.ts` 로 **붙였다**
>   ([`DISCUSSION.md`](../DISCUSSION.md) §1-10)
> - **`DELETE /api/v1/action-cards/{id}`** — 행동 카드 삭제. **아직 안 붙였다.**
>   이것은 [`PRODUCT.md` 「상류와 차이」](../PRODUCT.md) #25 를 닫을 수 있는
>   엔드포인트다 — 지금 FE 는 서버에 삭제 계약이 없다는 전제로 지운 카드 id 를 기기에
>   묘비로 남기고 있고(`deletedCardStore.ts`), 그래서 **다른 기기에서는 지운 카드가
>   다시 보인다.** 붙이면 그 파일이 사라진다
>
> ⚠ **위 「26개 중 21개」는 2026-08-21 기준이고, 이번에 다시 세지 않았다.**
> 어댑터 표에 애플 한 줄을 더했을 뿐이다 — 표 자체도 그때 이후 BE 가 낸 것들
> (주간 리포트 · 회원탈퇴 · 일기 전체 목록 · 기간별 일정 등)을 아직 반영하지 않았다.
> **숫자를 고치려면 어댑터를 하나씩 열어 대조해야 한다** — 경로 문자열이 템플릿으로
> 조립되는 곳이 있어(`…/{id}/completion`) 문자열 검색으로는 세어지지 않는다.
> 그 대조는 하지 않았으므로 낡은 채로 둔다.

> ⚠ **옛 표의 마지막 줄(`src/features/diary/data/retrospectDiaryApi.ts` →
> `GET /api/v1/retrospect/{id}/diary`)은 둘 다 없다.** 엔드포인트는 2026-08-20 에
> 서버에서 사라졌고(`TASKS.md` 「남은 API 연결」), 파일은 `diaryApi.ts` 로 대체됐다.
> **BE 코드에는 그 경로를 가리키는 javadoc 이 아직 여섯 군데 남아 있다**
> (`ActionCardController` · `ActionCardResponse` · `ActionCardView` · `DiaryController` ·
> `DiaryResponse` · `DiaryView`) — 매핑은 없으므로 **출처 표시로만 읽는다.**
> BE 에 정리를 제기할 자리다.

## 아직 붙지 않은 것 — 다섯

`openapi.json` 에는 있고 어댑터가 없다. 순서는 [`docs/TASKS.md`](../TASKS.md) 「남은 API 연결」을 본다.

| 엔드포인트                                | 왜 없나                                                                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `GET`·`PUT`·`DELETE /api/v1/memos/{date}` | **붙이지 않기로 했다**(2026-08-11 제품 결정) — 서버는 날짜당 하나(`{ content }`)인데 스키마 `Moment` 는 여럿이다 |
| `GET /api/v1/diaries/{id}`                | 월별 목록(`GET /api/v1/diaries`)이 본문까지 그대로 채워 줘서 부를 자리가 없다                                    |
| `GET /api/v1/action-cards/{id}`           | 같은 이유. 카드는 `retrospectId` 로 일기와 조인해 목록에서 세운다                                                |

## 경계가 갈리는 자리 — 알고 붙였다

| 무엇                       | 서버                                                                   | 프론트                                                                             |
| -------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 하루 경계                  | **KST 자정** (`TimeZonePolicy`)                                        | **04:00 앱-하루** (`src/lib/clock.ts`)                                             |
| 월 조회 창                 | `[그 달 1일 00:00 KST, 다음 달 1일 00:00 KST)` 반열림                  | `diaryApi.ts` 의 `kstDate` 가 **서버 경계에 맞춘다** — 여기는 어긋나지 않는다      |
| 회고 「하루 한 번」 판정   | **KST 자정** 기준으로 오늘 일기가 있으면 `409` (BE `hasDiaryOn`)       | 화면은 앱-하루(04:00)로 센다 — ⚠ **자정~04시에 두 판정이 갈린다**                  |
| 일정 감정                  | `emotion` **단수 nullable** · `completed=false` 에 감정을 보내면 400   | 감정을 고르면 마침이 함께 켜진다([`PRODUCT.md`](../PRODUCT.md) 「상류와 차이」 13) |
| 일정 수정·삭제             | `PATCH`·`DELETE /{id}` 는 **`source=MANUAL` 만** — 캘린더 일정은 `404` | 캘린더 일정은 `PATCH …/{id}/visibility` 로 **숨기기만** 한다                       |
| 캘린더 일정의 `externalId` | 화해 요청(`CalendarSyncEventRequest`)에만 있고 **응답에는 없다**       | `scheduleApi.ts` 가 `externalId: null` 로 둔다 — 화면이 원본 id 를 안 쓴다         |

⚠ **자정~04시가 실제로 갈린다.** 22일 01:00 에 사용자가 회고를 시작하면 화면은 「21일의
회고」로 세지만 서버는 **22일**로 판정한다. 21일 23:00 에 이미 회고를 마쳤다면 화면은
「오늘 했다」로 막으려 하고 서버는 **허용**한다. 반대로 22일 02:00 에 마쳤다면 화면은
새 하루로 보고 서버가 `409` 로 막는다. `retroApi.ts` 가 그 `409`
(`ALREADY_RETROSPECTED_TODAY`)를 안내 한 줄로 흡수하고 있어 **깨지지는 않지만**,
경계를 맞출지 말지는 열린 결정이다.

## 오류 코드 — 서버가 실제로 내는 것 전부

`ApiErrorResponse` 는 `{ code, message }` 하나뿐이고 코드는 아래가 전부다
(BE `*ExceptionHandler` 전수 대조 · 2026-08-21).

| 코드                                                                                                                         | 상태  | 언제                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------- |
| `INVALID_REQUEST`                                                                                                            | `400` | 검증 실패 전반 · 잘못된 연·월 · 일정 순서 · 캘린더 화해 요청         |
| `AUTHENTICATION_REQUIRED`                                                                                                    | `401` | 토큰의 사용자를 서버가 못 찾을 때                                    |
| `KAKAO_TOKEN_INVALID` · `KAKAO_APP_ID_MISMATCH` · `KAKAO_USER_ID_MISMATCH`                                                   | `401` | 카카오 인증 실패 세 갈래                                             |
| `REFRESH_TOKEN_INVALID` · `REFRESH_TOKEN_REVOKED` · `REFRESH_TOKEN_EXPIRED`                                                  | `401` | 갱신 실패 세 갈래                                                    |
| `SCHEDULE_NOT_FOUND` · `DIARY_NOT_FOUND` · `ACTION_CARD_NOT_FOUND` · `DAILY_MEMO_NOT_FOUND` · `RETROSPECT_SESSION_NOT_FOUND` | `404` | 없거나 **남의 것**일 때 — 소유권 실패도 404 다(존재를 흘리지 않는다) |
| `ALREADY_RETROSPECTED_TODAY`                                                                                                 | `409` | 오늘(KST) 이미 회고를 마쳤다 — `retroApi.ts` 가 안내로 받는다        |
| `KAKAO_API_SERVER_ERROR` · `KAKAO_API_RESPONSE_ERROR`                                                                        | `502` | 카카오 쪽 오류                                                       |
| `KAKAO_API_NETWORK_ERROR`                                                                                                    | `503` | 카카오에 닿지 못함                                                   |

**인증 없이 열린 경로는 넷뿐이다**(BE `SecurityConfiguration.PUBLIC_PATHS`):
`/actuator/health` · `/swagger-ui/**` · `/v3/api-docs/**` · `/api/v1/auth/**`.
나머지는 전부 Bearer 를 요구하고, 세션은 **stateless**(CSRF 없음)다.
access token 수명은 **30분**(`jwt.access-token-expiration: 30m`), refresh 수명은
배포 환경변수(`JWT_REFRESH_EXPIRATION`)라 저장소에서는 알 수 없다.

⚠ **`sync:api` 는 `/v3/api-docs` 를 그대로 받는다** — 그 경로가 `PUBLIC_PATHS` 라
토큰 없이도 받아진다. 스냅샷 갱신에 로그인이 필요 없다는 뜻이다.
