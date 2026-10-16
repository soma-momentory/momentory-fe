# Task 002: P5 알림함 FE 독립 구현 — 제안 계약 어댑터 · 세션 격리 store · 알림 팝오버

> 복구 기록: 아래 Task 본문은 원본 Harness 작성 시점의 BE `main` 상태를 기록한다.
> 후속 PR 후보는 BE `dev` d77d023의 `NotificationController`·DTO·OpenAPI 테스트와
> 대조했다. 이 커밋의 운영 배포 및 FE OpenAPI 스냅샷 반입은 확인되지 않았다.
> 아래 Push·PR 금지는 원본 Harness Worker 실행에 적용됐고, 이 복구 브랜치의 Draft PR은
> 별도 사용자 요청에 따라 준비한다. 원본 실행 기록은 변경하지 않는다.
> 독립 리뷰에서 토큰 조회 중 계정 전환 경합을 발견해 이 복구 브랜치에만 `src/lib/http.ts`와
> 그 회귀 테스트를 추가했다. 아래 원본 Task 허용 경로는 당시 Worker 범위의 기록이다.

## 요구사항

[`docs/redesign/HOME_V2_ROLLOUT_PLAN.md`](../docs/redesign/HOME_V2_ROLLOUT_PLAN.md)(이하 「계획」) **§5 · §6 P5 · §7.1 P5** 의
알림함을 **FE 안에서 독립적으로** 만든다. 기준 HEAD 는 최신 `origin/main`(`4c80a94` · P3 운영 홈 머지 뒤)이다.

⚠ **계약은 아직 없다.** 2026-10-16 확인 시 BE(`momentory-be`) main 에는 `GET /api/v1/notifications` ·
`GET /api/v1/notifications/unread` · `PATCH /api/v1/notifications/{id}/read` · `POST /api/v1/notifications/read`
컨트롤러도 OpenAPI 계약도 없다. FE 스냅샷 `docs/api/openapi.json` 에도 `notifications` 가 0건이다.
**계획 §5.2 는 제안 계약일 뿐이다** — 이 Task 는 그것을 **실제 계약처럼 문서에 적거나 `openapi.json` 에 넣지 않고**,
`inboxApi.ts` 한 파일 안에 「제안 계약(BE 미배포)」으로 격리한다. BE 가 다른 모양으로 배포되면 **그 파일 안쪽만** 바뀐다.

만드는 것:

1. **API 어댑터**(`inboxApi.ts`) — 제안 네 경로 · `authedRequest` 하나를 지난다 · 서버 응답 형태 검증 · 던지지 않는다
2. **내부 link 허용 목록**(`links.ts`) — 허용 밖 · 외부 URL 은 `null` 로 떨어뜨린다
3. **Zustand store**(`inbox.ts`) — 목록 · 다음 쪽 · 서버가 마지막으로 확인한 `hasUnread` · 보인 항목만 읽음 · 사용자/세션 세대 격리 · 늦은 응답 폐기
4. **알림 팝오버**(`InboxPopover.tsx`) — `HomeV2View` 와 **별도 컴포넌트** · 표시 전용 · 로딩/빈/실패 한 줄
5. **로그아웃 · 탈퇴 · 계정 전환 정리**(`auth.ts`) — inbox 를 비우고 세대를 올린다. 기존 동작 보존 · 순환 import 없음
6. **테스트** — 읽음 상태 · 보인 항목만 전송 · 실패 후 unread 유지 · 계정 격리

**하지 않는 것**(이 Task 의 허용 파일 밖이다 — 필요하면 리뷰 · 수동 항목으로 보고하고 임의로 고치지 않는다):

- 홈 연결 — `app/(tabs)/home.tsx` · `src/features/home/ui/v2/HomeV2View.tsx` 는 **수정 금지**. 그래서 이번 PR 에서 종은
  여전히 P3 대로 `/my` 로 가고 점은 늘 `false` 다. 팝오버를 홈 `overlay` 에 꽂는 것은 후속 Task 다
- `ReminderSheet` 추출 · `app/(tabs)/my.tsx` — 팝오버는 설정 아이콘의 **콜백만** 받는다
- 계측(`features/analytics/events.ts` · `docs/ANALYTICS.md`) · `docs/api/README.md` · `UX_STRUCTURE.md` · `DESIGN.md` · `PRODUCT.md` 갱신
- 기존 로컬 리마인더(`src/lib/notifications.ts` · `features/my/model/reminders.ts`)와 P3 운영 홈 — **변경 금지**(NB-1)
- P4 소유 파일(날씨 · `lib/location.ts` 등) · `docs/spec/**` · `docs/api/openapi.json` · 기존 Harness Core(`harness/**`) · BE 저장소

## 대상 범위

| 범위                   | 이번 Task                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| 앱 (Expo·React Native) | **예** — `src/features/notifications/**`(새로) · `src/features/auth/model/auth.ts`(정리 자리에 inbox 합류) |
| Vite Design Lab        | **아니오** — `design-lab/` 은 건드리지 않는다(`typecheck:lab` 회귀만 확인)                                 |
| Expo Web Design Lab    | **아니오** — `expo-lab/` 은 건드리지 않는다(`typecheck:expo-lab` 회귀만 확인)                              |

**변경 가능한 파일은 아래 여덟과 이 Task 문서뿐이다**(Parallel Harness `p5-inbox` 허용 목록):

```
src/features/notifications/data/inboxApi.ts
src/features/notifications/model/inbox.ts
src/features/notifications/model/links.ts
src/features/notifications/ui/InboxPopover.tsx
src/features/notifications/__tests__/inboxApi.test.ts
src/features/notifications/__tests__/inbox.test.ts
src/features/notifications/__tests__/InboxPopover.test.tsx
src/features/auth/model/auth.ts
```

## 관련 문서와 코드

먼저 [`docs/CONTRIBUTING.md`](../docs/CONTRIBUTING.md)(작업 규칙 · 품질 게이트 · 「로그·계측에도 남기지 않는 것」)와
[`CLAUDE.md`](../CLAUDE.md)를 읽는다. 범위별 시작 코드는 [`docs/HARNESS_NAV.md`](../docs/HARNESS_NAV.md) 「앱」 행이다.

| 무엇                   | 어디                                                                                                                                                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 알림함 정본(제안)      | 계획 §5.1(무엇이 항목인가 · NB-1 · NB-3) · **§5.2(제안 엔드포인트 · `Notification` 필드)** · §5.3(FE 구조 · 갱신 시점) · **§5.4(모달 · 상태 전이표 · MF-1A · MF-1B · MF-N1)** · §7.1 P5(테스트 문장)                   |
| 화면 문안 · 시각       | `docs/DESIGN.md` 「홈 v2」 「알림 모달(P5 목표)」(644행) · 종 낭독 이름(602행) · `docs/redesign/UX_STRUCTURE.md` §4 · §4.4(211행)                                                                                      |
| 불변 규칙              | `docs/spec/RULES.md` — 오류는 한 줄 · 모달·재시도·경고 아이콘 금지 · **숫자로 압박하지 않는다**(점에 숫자 없음 · OS 배지 없음) · 선택/읽지 않음을 색만으로 표시하지 않는다                                             |
| 서버 호출 통로         | `src/lib/http.ts` — `authedRequest(method, path, body?, { timeoutMs?, signal? })` · `{ ok, error }` 로 닫힘 · 204 는 `data: null` · **자기 fetch 래퍼 금지**                                                           |
| 어댑터 선례            | `src/features/auth/data/meApi.ts` · `src/features/home/data/scheduleApi.ts`(형태 검증 · 실패 코드 축약)                                                                                                                |
| 세대 폐기 선례         | `src/features/diary/model/diary.ts:212~217 · 495`(`generation` 클로저 — 「출발할 때의 세대와 지금이 같은가」)                                                                                                          |
| 정리 자리              | `src/features/auth/model/auth.ts` — `clearUserScopedStores`(359행 · `signOut` 874 · `withdraw` 907 · `syncMe` 의 `unauthorized` 678) · `adoptSession`(398) · `hydrate`(612) · `getAccessToken` 의 `evicted`(593)       |
| 순환 import 주의       | `auth.ts:92~99` 주석 — 사용자별 모듈이 `auth` 를 import 하는 방향이어야 한다. **이번에는 반대다**(`auth` 가 `inbox` 를 부른다) → `inbox.ts` · `inboxApi.ts` · `links.ts` 는 `@/features/auth/**` 를 import 하지 않는다 |
| 오버레이 · 앵커 선례   | `src/components/ds/Menu.tsx` — 화면 전체를 덮는 투명 레이어 · 바깥 탭 닫힘 · `anchoredMenuTop`. ⚠ 계획 §5.4 의 「`menuTopFromPageY` 재사용」은 `HomeV2View` 의 **prop** 이름이다 — 팝오버는 `top` 을 받기만 한다       |
| 공용 컴포넌트          | `src/components/ds/`(`Text` · `IconButton` · `Spinner` · `Card`) · 토큰 `src/design/ds/` — hex 금지 · 글자색 semantic 6종 · 폰트는 파일 이름                                                                           |
| 홈 v2 계약(읽기 전용)  | `src/features/home/ui/v2/types.ts` — `hasUnreadNotifications` · `onOpenNotifications` · `onOpenNotificationSettings` · `renderFrame(body, overlay)`. 후속 연결 때 팝오버가 이 `overlay` 에 들어간다                    |
| 라우트(허용 목록 후보) | `app/(tabs)/{rest,report,archive}.tsx` · `app/my/profile.tsx` · `PRODUCT.md` #42 (2) — `/rest` 는 그룹이 겹쳐 `/(tabs)/rest` 로 쓴다                                                                                   |
| 날짜 표기              | `src/lib/day.ts` · `src/lib/clock.ts`(「10월 15일」 — 새 포맷터를 만들기 전에 있는 것을 쓴다)                                                                                                                          |

## 구현 범위

### 1. `src/features/notifications/model/links.ts`

- 허용 내부 경로 목록 하나와 `toAllowedLink(raw: unknown): InboxLink | null` 하나. 초기 목록은 계획 §5.3 예시 넷
  (`/(tabs)/rest` · `/(tabs)/report` · `/(tabs)/archive` · `/my/profile`) — 아래 결정 D2.
- **정확 일치만** 통과한다. `/` 로 시작하지 않는 값 · 스킴(`http:` · `momentory:` · `//host`) · 쿼리/조각 · 앞뒤 공백 ·
  목록 밖 경로 · 문자열이 아닌 값은 전부 `null`. `/rest` 처럼 그룹이 겹치는 맨 경로는 받지 않는다(#42 (2)).
- 반환 타입은 expo-router 의 `Href` 로 바로 넘길 수 있는 리터럴 유니언으로 둔다(화면이 캐스팅하지 않게).

### 2. `src/features/notifications/data/inboxApi.ts`

- 머리 주석에 **「제안 계약 — 계획 §5.2 · BE 미배포(2026-10-16 확인) · `openapi.json` 에 없음」** 을 분명히 적는다.
  경로 문자열은 이 파일에만 둔다.
- 네 함수: `fetchNotifications({ cursor?, size? })`(`size` 기본 20 · 1~50 으로 자른다 · `cursor` 는 `encodeURIComponent`) ·
  `fetchUnread()` · `markNotificationRead(id)` · `markNotificationsRead(ids)`(빈 배열이면 요청하지 않고 성공 ·
  50개 초과는 호출부가 나누거나 여기서 거절 — 한쪽으로 정해 테스트로 고정).
- 결과는 `{ ok: true, data } | { ok: false, code }` — `code` 는 `unauthenticated` · `network` · `server` · `malformed` 정도로
  축약한다(선례 어댑터와 같은 결). **던지지 않는다.**
- **형태 검증**:
  - 목록: 본문이 객체 · `items` 배열 · `nextCursor` 는 문자열 또는 `null`. 항목 하나가 깨졌으면(`id` · `title` 비문자열 ·
    `createdAt` 이 ISO 로 안 읽힘 등) **그 항목만 버리고** 나머지를 남긴다(목록 전체를 실패로 만들지 않는다 — 판단을 주석에).
    본문 틀이 깨졌으면 `malformed`.
  - `id` 는 문자열(int64 문자열)만 · `type` 은 **열린 문자열**(모르는 값도 남긴다) · `body` 없음/`null` 은 빈 문자열 ·
    `readAt` 은 ISO 문자열 또는 `null` · `link` 는 `toAllowedLink` 를 통과한 것만(허용 밖은 `null` — 항목은 남는다).
  - unread: `{ hasUnread: boolean }` **만**. 숫자 · 문자열 `"true"` · 누락은 `malformed`(규칙 4 — 숫자를 받지 않는다).
  - 읽음 둘: 2xx 면 성공(본문 무시).
- 도메인 타입 `InboxNotification`(`id` · `type` · `kind: "notice" | "news" | "critical" | "other"` · `title` · `body` ·
  `createdAt` · `readAt` · `link`)을 여기 또는 `model/inbox.ts` 에 둔다. `CRITICAL_NOTICE` 는 이름표용 `kind` 로만 구분하고,
  `readAt` 이 있으면(가입 전 중요 공지의 기본 읽음 포함) 읽음으로 그린다 — 판정은 서버 몫이다(NB-3).
- 제목 · 본문 · link 를 로그 · 계측에 남기지 않는다(`CONTRIBUTING.md`).

### 3. `src/features/notifications/model/inbox.ts`(Zustand `useInbox`)

상태: `userId: number | null` · `sessionGen: number` · `hasUnread: boolean | null` · `items` · `nextCursor` ·
`status: "idle" | "loading" | "ready" | "failed"` · `loadingMore` · `isOpen` · `seenIds`(이번에 열린 동안 **실제로 보인** ID) ·
`unreadAtOpen`(이번 목록 응답에서 `readAt == null` 이던 ID — 「이번에 연 동안 읽지 않음 표시」 유지용).

동작(계획 §5.4 상태 전이표가 정본이다):

- `bindUser(userId)`(또는 `reset(nextUserId)`) — **신원은 `auth` 가 밀어 넣는다.** `inbox.ts` 는 `auth.ts` 를 import 하지
  않는다(순환 방지). 다른 사용자로 바뀌면 `reset` 과 같은 효과.
- `reset()` — `sessionGen += 1` · 목록 · `seenIds` · `nextCursor` · `unreadAtOpen` 을 비우고 `hasUnread = null` ·
  `isOpen = false`. **열려 있었어도 `POST /read` 를 보내지 않는다.**
- `refreshUnread()` · `open()`(첫 쪽 조회 · 점은 그대로) · `loadMore()`(`nextCursor` 있을 때만 · 중복 호출 무시) ·
  `markSeen(ids)`(열려 있고 `ready` 일 때만 · 목록에 있는 ID 만) · `close()` · `markRead(id)`(항목 누름 → `PATCH` → 성공 시 `refreshUnread()`).
- `close()` — `seenIds ∩ unreadAtOpen` 이 있으면 `POST /read`(**50개씩 나눠**) → 성공이든 실패든 **다시 보내지 않고**
  `refreshUnread()` 한 번. 없으면 바로 `refreshUnread()`. 목록 조회가 실패했으면 읽음을 보내지 않는다.
- **`hasUnread` 를 바꾸는 것은 성공한 서버 응답 둘뿐**: ① `GET /unread` 값(참 · 거짓) ② 목록 응답에 `readAt == null` 이
  하나라도 있으면 `true`(없다고 `false` 로 쓰지 않는다). 화면 동작과 **실패는 점을 바꾸지 않는다**(MF-1B · 옵티미스틱 없음).
- **늦은 응답 폐기 — 두 겹**:
  1. 세션: 요청은 출발 때의 `sessionGen` · `userId` 를 들고, 도착 때 지금 값과 하나라도 다르면 **성공이어도 버린다**
     (목록 · 다음 쪽 · `hasUnread` · `seenIds` 어디에도 반영 안 함 · 이어지는 `refreshUnread()` 도 부르지 않음 — MF-N1).
  2. 세션 안 순서: 네 요청이 공유하는 단조 증가 요청 번호. `hasUnread` 는 **마지막으로 반영한 응답보다 나중에 출발한**
     요청의 성공만 바꾼다(앞선 `GET /unread`(true)가 읽음 뒤 재조회(false)를 덮지 않게 · 앞선 목록의 `true` 가 뒤 `false` 를 덮지 않게).
     목록 응답은 `open()` 을 다시 부르거나 닫은 뒤 도착한 것을 반영하지 않는다(열림 세대).
- 폴링하지 않는다. 포커스 · 포그라운드 복귀 연결은 홈 연결 Task 몫이다(이번에는 store 가 `refreshUnread()` 만 내놓는다).

### 4. `src/features/notifications/ui/InboxPopover.tsx`

- **표시 전용** — store · API · 라우터 · 계측을 모른다(`HomeV2View` 와 같은 원칙). 호출자가 props 로 넘긴다:
  `items` · `status` · `unreadIds`(이번에 연 동안의 「읽지 않음」) · `hasMore` · `top`(앵커 아래 y) ·
  `onDismiss` · `onOpenSettings` · `onPressItem(item)` · `onEndReached` · `onSeen(ids)`.
- 자리: 화면 전체를 덮는 투명 레이어(바깥 탭 = `onDismiss`) 위에 카드 하나 — 폭 = 화면 − 32 · 최대 360 · 최대 높이 = 화면의 60%.
  Android 뒤로가기 = 닫기(가능한 방법을 쓰고 테스트 가능한 범위에서 검증). 크기 · 반경 · 여백 · 그림자는 `src/design/ds/` 값만.
- 머리: 「알림」 + 오른쪽 설정 `IconButton`(접근성 「알림 설정」 · 있는 Wanted 글리프만 — 없으면 만들지 않고 보고).
- 목록: `FlatList` · 끝에 닿으면 `onEndReached` · `onViewableItemsChanged` + `viewabilityConfig`
  (`itemVisiblePercentThreshold: 50` · `minimumViewTime: 500`)로 **보인 항목 ID 만** `onSeen` 에 넘긴다(MF-1A).
  콜백 · 설정은 렌더마다 새로 만들지 않는다(`FlatList` 제약).
- 항목: 제목(읽지 않음이면 **점 + 굵게** — 색만으로 표시하지 않는다 · 낭독 이름에 「읽지 않음」) · 본문 두 줄 말줄임 ·
  날짜(「10월 15일」) · `CRITICAL_NOTICE` 이름표(문안은 최소 · 아래 D4). `link` 가 있으면 누를 수 있고(`onPressItem`),
  없으면 눌러 펼쳐 본문 전체를 본다(펼침도 `onPressItem` 으로 알려 호출자가 `markRead` 를 부를 수 있게).
- 상태 한 줄: 불러오는 중 `Spinner` · 빈 목록 「아직 도착한 소식이 없어요」 · 실패 「알림을 불러오지 못했어요」 —
  **재시도 버튼 · 경고 아이콘 없음.** 숫자(개수)를 어디에도 그리지 않는다.

### 5. `src/features/auth/model/auth.ts`

- `useInbox` 를 import 해 **정리 자리에 합류**한다: `clearUserScopedStores` 에 `useInbox.getState().reset()` 한 줄
  (→ `signOut` · `withdraw` · `syncMe` 의 `unauthorized` 가 함께 받는다).
- 신원 주입: `adoptSession`(로그인 · 계정 전환)과 `hydrate`(세션 복원) · `signInDev` 에서 `useInbox.getState().bindUser(session.userId)`.
  `getAccessToken` 의 `evicted` 에서 inbox 를 비울지는 결정 D1.
- **기존 동작 보존**: 순서 · 반환값 · `await` 여부 · 분석 호출 · `status` 전이를 바꾸지 않는다. 기존
  `src/features/auth/__tests__/*.test.ts` 가 **수정 없이** 통과해야 한다(이 디렉터리는 허용 파일이 아니다).
- 순환 import 검사: `inbox.ts` → `inboxApi.ts` → `@/lib/http` → `auth.ts` 경로가 생긴다. `http.ts` 는 이미 `getAccessToken` 을
  위해 `auth.ts` 를 import 하므로, 모듈 평가 시점에 서로의 값을 쓰지 않는지(최상위에서 store 를 부르지 않는지) 확인하고,
  기존 `features/*/model` 이 `auth` 에 불려 가는 구조(예: `useDiary` → `diaryApi` → `http`)와 같은 모양인지 대조해 Task 결과에 적는다.

### 6. 테스트(계획 §7.1 P5 문장을 기준으로)

- `inboxApi.test.ts` — 「`hasUnread` 는 불리언이다 — 숫자를 받지 않는다」 · 「허용 목록 밖 `link`(외부 URL · `/rest` · 쿼리)는 버리고 항목은 남긴다」 ·
  「모르는 `type` 도 항목으로 남긴다」 · 「`CRITICAL_NOTICE` 에 이름표 · `readAt` 이 있으면 읽음」 · 「깨진 항목 하나만 버린다 / 틀이 깨지면 `malformed`」 ·
  「`POST /read` 는 적힌 ID 만 보낸다 · 빈 배열이면 요청하지 않는다」 · 「`size` 는 50 을 넘지 않는다」 · 네트워크 실패에서 던지지 않는다.
- `inbox.test.ts` — 상태 전이(MF-1): 「열어도 서버가 답하기 전에는 점이 그대로」 · 「목록에 미확인이 있으면 `true` · 없으면 그대로」 ·
  「보지 않고 닫은 항목은 다음에 열어도 읽지 않음」 · 「**보인 항목 중 미확인이던 것만** `POST /read`(50개 넘으면 나눠서)」 ·
  「`POST /read` 성공 뒤 `GET /unread` 값으로」 · 「`POST /read` 실패 → 다시 보내지 않고 재조회는 한 번」 · 「목록 실패 → 읽음 안 보냄」 ·
  「`PATCH` 성공 → `GET /unread` 값으로」 · **(MF-1B)** 「`GET /unread` 실패 → 마지막 확인 값 유지(`true`/`false` 둘 다)」 ·
  「한 번도 확인 못 한 `null` 은 점 없음」 · 「연속 실패: `true` → unread 실패 → 목록 성공 → read 실패 → 재조회 실패 → 켜진 채」 ·
  「복구: 다음 `GET /unread` 가 `false` 면 꺼진다」 · 순서: 「늦게 온 앞선 unread(true)가 뒤의 false 를 덮지 않는다」 ·
  「앞선 목록(미확인 있음)이 뒤의 unread(false)를 덮지 않는다」 · **(MF-N1)** 「A 의 unread 진행 중 `reset()` → 늦게 와도 `null`」 ·
  「A 의 목록 진행 중 `reset()` → B 의 store 에 A 항목이 끼지 않는다」 · 「A 의 `POST /read` 진행 중 `reset()` → 이어지는 재조회를 부르지 않는다」 ·
  **(MF-N1-R)** 「A unread 시작 → `reset()` → B unread 성공 `true` → A 늦은 응답 → B 의 `true` 유지」 · 「`reset()` 뒤 시작한 B 요청은 정상 반영」 ·
  「열린 채 `reset()` → 닫히고 읽음을 보내지 않는다」.
- `InboxPopover.test.tsx`(MF-1A) — 「보이는 항목만 `onSeen` 으로 넘긴다(viewability 콜백을 흉내 낸다)」 · 「빈 · 실패는 한 줄이고 재시도 버튼이 없다」 ·
  「로딩은 `Spinner`」 · 「읽지 않음은 점 + 굵게 + 낭독 이름(색만이 아니다)」 · 「바깥을 누르면 `onDismiss`」 · 「설정 아이콘 → `onOpenSettings`」 ·
  「link 있는 항목 → `onPressItem` · 없는 항목은 펼친다」 · 「숫자를 그리지 않는다」.
- 계정 격리(`auth.ts` 합류) — **`src/features/auth/__tests__/` 는 허용 파일이 아니다.** 그래서 `inbox.test.ts` 에서
  `useAuth.getState().signOut()` · `withdraw()`(성공 목) 뒤 inbox 가 `null` · 비었음 · 세대가 올라갔음을 확인한다
  (SecureStore · 어댑터 목은 기존 auth 테스트의 목 방식을 따른다). 넣기 어려우면 그 사실을 리뷰 항목으로 남긴다.

## 검증 기준

`docs/CONTRIBUTING.md` 「품질 게이트」 순서대로 **전부 통과**해야 한다(경고도 실패):

```bash
npm run typecheck
npm run typecheck:lab
npm run typecheck:expo-lab
npm run lint
npm run format:check
npm run test -- --ci
```

- 기존 스위트(특히 `src/features/auth/__tests__/*` · `app/(tabs)/__tests__/home*.test.tsx` · `report-my.test.tsx`)가 **수정 없이** 통과한다.
- `git diff --name-only origin/main` 이 위 허용 여덟 파일과 이 Task 문서뿐이다.
- `docs/api/openapi.json` · `docs/spec/**` 에 변경이 없다. 제안 계약이 **실제 계약처럼 적힌 곳이 없다**(`inboxApi.ts` 머리말만).
- Codex 리뷰는 Core 품질 게이트를 따른다.

**미검증으로 남긴다**(PR 설명 · 결과 보고에 그대로 적는다):

- 실제 BE 응답 — BE 에 경로가 없다. 배포되면 `npm run sync:api` 뒤 어댑터를 계약과 대조해야 한다.
- 두 기기 읽음 동기화 · 탈퇴 후 재가입 · 비행기 모드 · 30개 스크롤 · 같은 시각 발행 등 계획 §7.2 「알림함」 수동 항목 전부.
- 홈 연결(종 → 팝오버 · 점 · 포커스/복귀 갱신 · `ReminderSheet`) — 허용 파일 밖이라 후속 Task.

**금지**: Push · PR · Merge · 수동 확인 없는 승인. 계획 §6 「BE 가 배포되지 않았으면 P5 FE PR 은 머지하지 않는다」.

## 결정 필요 사항

| ID  | 질문                                                                                  | 추천                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 갱신이 `evicted` 로 끝나 `anonymous` 로 내려갈 때(`getAccessToken`) inbox 도 비우는가 | **비운다**(`useInbox.getState().reset()` 한 줄 추가) — 세션이 죽었는데 이전 사용자의 점 · 목록이 남지 않게. 다른 store 는 지금처럼 건드리지 않아 기존 동작은 그대로다 |
| D2  | 내부 link 허용 목록의 초기 집합                                                       | 계획 §5.3 예시 넷(`/(tabs)/rest` · `/(tabs)/report` · `/(tabs)/archive` · `/my/profile`) **정확 일치만**. 늘리는 것은 BE 와 운영 공지가 정해질 때                     |
| D3  | 팝오버 위치를 어떻게 받는가                                                           | 호출자가 계산한 `top` 하나(종 아래 y)만 받는다 — 뷰 안에서 측정하지 않는다. 홈 연결 Task 가 `menuTopFromPageY` 로 만든다                                              |
| D4  | `CRITICAL_NOTICE` 이름표 · 빈/실패 문안을 지금 확정하는가                             | 빈 · 실패는 계획 §5.4 문안 그대로 쓰고 CP-1 최종 검토 대상으로 남긴다. 이름표는 「중요」 한 단어 — 역시 CP-1 검토 항목                                                |

### 확정된 결정 (2026-10-16 · 사람의 결정 반영)

| ID  | 결정                                                                                                                                 | 반영한 곳                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| D1  | **A** — `evicted` 에서 `useInbox.getState().reset()` 한 줄만 추가한다. 다른 store 는 지금처럼 둔다                                   | `auth.ts` `getAccessToken` · `inbox.test.ts` 「갱신이 evicted 로 끝나면 비운다」           |
| D2  | **A** — 계획 예시 넷(`/(tabs)/rest` · `/(tabs)/report` · `/(tabs)/archive` · `/my/profile`) **정확 일치**                            | `links.ts` · `inboxApi.test.ts`                                                            |
| D3  | **A** — 호출자가 계산한 `top` 하나만 받는다                                                                                          | `InboxPopover.tsx` `Props.top`                                                             |
| D4  | **A** — 빈 · 실패는 계획 §5.4 문안 그대로, 이름표는 「중요」. 모두 CP-1 검토 항목으로 남긴다                                         | `InboxPopover.tsx` `INBOX_EMPTY_MESSAGE` · `INBOX_FAILED_MESSAGE` · `INBOX_CRITICAL_LABEL` |
| H1  | Wanted 세트에 톱니 글리프가 없다 — 설정 버튼은 **`clock` 을 유지**한다(글리프를 새로 만들지 않는다)                                  | `InboxPopover.tsx` 머리 설정 `IconButton`                                                  |
| H2  | 앱 서체(교보손글씨)는 굵기가 하나라 「점 + 굵게」가 서지 않는다 — **점 + 글자색 + 낭독 이름 「읽지 않음」** 으로 둔다(색만이 아니다) | `InboxPopover.tsx` 머리말 「규칙」 · 항목 렌더 · `InboxPopover.test.tsx`                   |
| H3  | D4 문안은 **최종이 아니다** — CP-1 검토 뒤 바꾼다                                                                                    | `InboxPopover.tsx` 문안 상수 주석 · 결과 보고의 수동 항목                                  |

위 「구현 범위 §4」 의 「점 + 굵게」 문장은 H2 로 대체된다.
