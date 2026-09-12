# momentory-fe

모멘토리 앱의 React Native 프론트엔드 — 열고 → 여섯 가지 묻고 → 담고 →
밤에 돌아보고 → 일기가 남고 → 다시 읽는다. 상류 MVP 는 40화면이었고, 회고 채팅 v2 와
쉼터가 들어온 지금은 **라우트 31개**다(매핑: [`docs/PRODUCT.md`](docs/PRODUCT.md)).

**이 저장소 하나만 clone 하면 개발·실행·검증이 전부 된다.** 화면 스펙·값·상태 기계는
[`docs/spec/`](docs/spec/SNAPSHOT.md)에 반입돼 있고, 토큰과 폰트는 커밋돼 있다.

## 시작하기

```bash
nvm use              # .nvmrc — Node 22.14
npm ci
cp .env.example .env # 값은 팀의 빌드 환경 변수에서 받는다 (비밀이 아니다 — CONTRIBUTING §값 3등급)
npm start
```

공식 개발 환경은 **dev client** 다. 처음 한 번 `npm run ios` / `npm run android` 로
네이티브 앱을 설치하고, 이후 JS 작업은 `npm start` 로 진행한다. Expo Go 는 지원하지 않는다
(이유: [`docs/SETUP.md`](docs/SETUP.md) §0).

PR 을 열기 전 검증 — 전부 이 저장소만으로 돈다:

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

(`check:theme` 은 3세대 이관이 끝나면서 2026-08-20 에 사라졌다 — `PLAN.md` A-16.)

기준과 CI 단계는 [`docs/CONTRIBUTING.md` 「품질 게이트」](docs/CONTRIBUTING.md)가 정본이다.

## 스택

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (strict) · expo-router.
선택 이유와 대안은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 설계는 어디에 있나

화면을 만들 때 보는 것은 전부 저장소 안에 있다.

| 무엇                             | 어디                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **불변 규칙 · 범위 · 구현 순서** | [`docs/spec/RULES.md`](docs/spec/RULES.md) ← 1순위                                                                                                |
| 상태 기계 7개 · 엔티티 7개       | [`docs/spec/momentory.states.mvp.json`](docs/spec/momentory.states.mvp.json) · [`momentory.schema.mvp.json`](docs/spec/momentory.schema.mvp.json) |
| 화면별 스펙 · 문안               | [`docs/spec/screens/<ID>.md`](docs/spec/screens/)                                                                                                 |
| **디자인 SSOT** — 시각·화면 흐름 | [`docs/DESIGN.md`](docs/DESIGN.md) ← 스펙과 부딪히면 이쪽이 이긴다                                                                                |
| 값 (색·크기·반경·여백)           | [`src/design/ds/`](src/design/ds/index.ts) — 코드가 쓰는 토큰 정본                                                                                |
| 화면 ID ↔ 라우트 매핑            | [`docs/PRODUCT.md`](docs/PRODUCT.md)                                                                                                              |
| 서버 API 계약                    | [`docs/api/openapi.json`](docs/api/README.md) — 반입 스냅샷(`npm run sync:api`)                                                                   |

`docs/spec/` 은 상류 설계 저장소의 **반입 스냅샷**이다 — 직접 고치지 않는다.
반입 기준·해시는 [`docs/spec/SNAPSHOT.md`](docs/spec/SNAPSHOT.md).
⚠ **상류 접근은 더 이상 전제하지 않는다**(2026-08-14 · `PLAN.md` §0) — 재반입은 폐기됐고
`sync:theme` 은 지웠다. 값·규칙의 후속 결정은 이 저장소(`docs/DESIGN.md`)에서 한다.

## 문서

**처음이면 [`docs/SETUP.md`](docs/SETUP.md) → [`docs/spec/RULES.md`](docs/spec/RULES.md) → [`docs/TASKS.md`](docs/TASKS.md) 순서로 읽는다.**

- [`docs/SETUP.md`](docs/SETUP.md) — 개발 환경. Android/iOS 빌드 · 자주 막히는 곳
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — **작업 규칙의 정본.** 브랜치·커밋·PR·품질 게이트·값 3등급·생성물
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — 제품 계약 지도. 화면 매핑 · **상류와 차이 대장**
- [`docs/spec/SNAPSHOT.md`](docs/spec/SNAPSHOT.md) — 상류 스냅샷 대장 · 재반입 절차 (담당자)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 기술 설계 · 데이터 레이어 · BE 전환점 · 마일스톤
- [`docs/TASKS.md`](docs/TASKS.md) — 작업 상태 정본. 완료·보류·미구현 · 인수인계
- [`docs/DISCUSSION.md`](docs/DISCUSSION.md) — 미결 안건 — BE·팀·상류 결정 대기
- [`docs/DESIGN.md`](docs/DESIGN.md) — **디자인 SSOT.** 토큰·컴포넌트 규격 · 화면별 시각 규칙
- [`docs/api/README.md`](docs/api/README.md) — 서버 계약 스냅샷 · 어댑터 지도 · 오류 코드
- [`docs/ANALYTICS.md`](docs/ANALYTICS.md) — Amplitude 이벤트 사전 · 수집 경계
- [`docs/DATA-SECURITY.md`](docs/DATA-SECURITY.md) · [`docs/PLAY-DATA-SAFETY.md`](docs/PLAY-DATA-SAFETY.md) — 기기 저장 정책 · Play 양식 답안
- [`docs/archive/CODE-REVIEW.md`](docs/archive/CODE-REVIEW.md) — 2026-08-07 코드 리뷰 **기록**
- [`assets/fonts/README.md`](assets/fonts/README.md) — Pretendard 출처·해시·라이선스
- [`CLAUDE.md`](CLAUDE.md) — AI 도구용 길잡이. 규칙을 소유하지 않고 위 문서를 가리킨다

## 진행 — 화면·서버 연결 완료 · 출시 준비 중 (2026-09-12)

**M0~M5 완료.** 셋업 · 공용 컴포넌트 · 화면 전부 · **3세대 디자인 이관**(2026-08-20) ·
**서버 연결**(2026-08-09~) · **회고 채팅 v2**(2026-08-28) · **쉼터·감각연못**(2026-09-03~) ·
**계측**(Amplitude · 2026-09-05). 검증은 **76 스위트 / 1,127 테스트**가 통과한다.
마일스톤별 상세와 남은 일은 [`docs/TASKS.md`](docs/TASKS.md)가 정본이다.

**화면 완료가 곧 MVP 완료는 아니다.** 남은 것:

- **영속 저장(MMKV)** — 온보딩 초안·회고 대화가 아직 메모리다
- **아웃박스(M3-3)** — 서버에 멱등성 규약이 없다([`docs/DISCUSSION.md`](docs/DISCUSSION.md) §1-1)
- **회고 재개** — 대화 이력을 되읽는 엔드포인트가 없다(§1-2)
- 애플 `.p8` — 그전까지 탈퇴가 애플 연결 해제 없이 지나간다
- 앱 잠금 게이트 · M6(invariants 전수 테스트 · E2E · 배포)

> ⚠ **기기에 남는 것은 세션 토큰과 캘린더 동기화 상태뿐이다**(둘 다 `expo-secure-store`).
> 일기·회고·일정은 **서버가 정본**이라 앱을 껐다 켜도 남지만, 아직 **끝내지 않은** 회고
> 대화와 온보딩 초안은 사라진다 — MMKV 가 그 시점이다.
