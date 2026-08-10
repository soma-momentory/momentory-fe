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

## 왜 받아서 커밋하는가

계약이 서버에만 있으면 **서버가 꺼져 있는 동안 아무도 확인할 수 없고**, 어제와 무엇이
달라졌는지도 알 수 없다. 스냅샷을 커밋하면 git diff 가 그걸 말해준다.
`docs/TASKS.md` 가 「M2 이후를 막는 것」으로 적어둔 `docs/api/openapi.yaml` 이 이 파일이다.

파일 이름이 `.yaml` 이 아닌 이유: 서버가 springdoc 이라 `/v3/api-docs` 로 **JSON** 을 낸다.
번역하면 그 자체가 손으로 고친 사본이 된다.

## 이 문서가 계약의 전부는 아니다

OpenAPI 는 **모양**을 말하지만 다음은 말하지 않는다 — 그 셋은 `docs/DISCUSSION.md` §1 에 있다.

- 멱등성 규약(`Idempotency-Key` · `If-Match` · 409 처리)
- 기기 캘린더와 서버의 동기화 방향(§1-4)
- 회고 대화의 안전 규칙·중단·재개 계약(§1-2)

## 어댑터가 계약을 읽는 자리

화면은 서버 모양을 보지 않는다. **`src/features/<도메인>/data/` 의 어댑터가 경계**이고,
각 어댑터 파일 머리의 JSDoc 이 그 엔드포인트에 대한 이 저장소 쪽 기록이다.

| 어댑터                                          | 엔드포인트                                         |
| ----------------------------------------------- | -------------------------------------------------- |
| `src/features/auth/data/kakaoAuthApi.ts`        | `POST /api/v1/auth/kakao`                          |
| `src/features/auth/data/reissueApi.ts`          | `POST /api/v1/auth/reissue`                        |
| `src/features/auth/data/logoutApi.ts`           | `POST /api/v1/auth/logout`                         |
| `src/features/auth/data/meApi.ts`               | `GET /api/v1/users/me`                             |
| `src/features/onboarding/data/optionsApi.ts`    | `GET /api/v1/onboarding/options`                   |
| `src/features/retro/data/retroApi.ts`           | `POST /api/v1/retrospect` · `POST …/{id}/messages` |
| `src/features/diary/data/retrospectDiaryApi.ts` | `GET /api/v1/retrospect/{id}/diary`                |

아직 붙지 않은 것(일정 6종 · `PUT /users/me/onboarding` · 하루 메모 3종)은
`openapi.json` 에는 있고 어댑터가 없다. 순서는 `docs/TASKS.md` 「남은 API 연결」을 본다.
