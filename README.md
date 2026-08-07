# momentory-fe

모멘토리 앱의 React Native 프론트엔드. **MVP 40화면** — 열고 → 여섯 가지 묻고 → 담고 →
밤에 돌아보고 → 일기가 남고 → 다시 읽는다.

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
npm run check:theme && npm run typecheck && npm run lint && npm run format:check && npm test
```

기준과 CI 단계는 [`docs/CONTRIBUTING.md` 「품질 게이트」](docs/CONTRIBUTING.md)가 정본이다.

## 스택

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (strict) · expo-router.
선택 이유와 대안은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 설계는 어디에 있나

화면을 만들 때 보는 것은 전부 저장소 안에 있다.

| 무엇                            | 어디                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP 40화면 규칙 · 구현 순서** | [`docs/spec/RULES.md`](docs/spec/RULES.md) ← 1순위                                                                                                |
| 상태 기계 7개 · 엔티티 7개      | [`docs/spec/momentory.states.mvp.json`](docs/spec/momentory.states.mvp.json) · [`momentory.schema.mvp.json`](docs/spec/momentory.schema.mvp.json) |
| 화면별 스펙                     | [`docs/spec/screens/<ID>.md`](docs/spec/screens/)                                                                                                 |
| 값 (색·크기·반경·여백)          | [`docs/spec/momentory.css`](docs/spec/momentory.css)                                                                                              |
| 화면 ID ↔ 라우트 매핑           | [`docs/PRODUCT.md`](docs/PRODUCT.md)                                                                                                              |

`docs/spec/` 은 상류 설계 저장소의 **반입 스냅샷**이다 — 직접 고치지 않는다.
반입 기준·해시·재반입 절차는 [`docs/spec/SNAPSHOT.md`](docs/spec/SNAPSHOT.md).
상류가 필요한 일은 재반입과 `npm run sync:theme` 뿐이고 담당자 전용이다.

## 문서

**처음이면 [`docs/SETUP.md`](docs/SETUP.md) → [`docs/spec/RULES.md`](docs/spec/RULES.md) → [`docs/TASKS.md`](docs/TASKS.md) 순서로 읽는다.**

- [`docs/SETUP.md`](docs/SETUP.md) — 개발 환경. Android/iOS 빌드 · 자주 막히는 곳
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — **작업 규칙의 정본.** 브랜치·커밋·PR·품질 게이트·값 3등급·생성물
- [`docs/PRODUCT.md`](docs/PRODUCT.md) — 제품 계약 지도. 화면 매핑 · **상류와 차이 대장**
- [`docs/spec/SNAPSHOT.md`](docs/spec/SNAPSHOT.md) — 상류 스냅샷 대장 · 재반입 절차 (담당자)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 기술 설계 · 데이터 레이어 · BE 전환점 · 마일스톤
- [`docs/TASKS.md`](docs/TASKS.md) — 작업 상태 정본. 완료·보류·미구현 · 인수인계
- [`docs/DISCUSSION.md`](docs/DISCUSSION.md) — 미결 안건 — BE·팀·상류 결정 대기
- [`docs/archive/CODE-REVIEW.md`](docs/archive/CODE-REVIEW.md) — 2026-08-07 코드 리뷰 **기록**
- [`assets/fonts/README.md`](assets/fonts/README.md) — Pretendard 출처·해시·라이선스
- [`CLAUDE.md`](CLAUDE.md) — AI 도구용 길잡이. 규칙을 소유하지 않고 위 문서를 가리킨다

## 진행 — 정적 화면 40장 완료 · MVP 는 아직

**M0~M5 완료** (2026-08-07): 셋업 · P0 컴포넌트 · 진입 2 · 온보딩 11 · 홈 5 ·
회고 12 · 보관함 6 · 리포트 1 · 마이 3. 마일스톤별 상세와 남은 일은
[`docs/TASKS.md`](docs/TASKS.md)가 정본이다.

**화면 완료가 곧 MVP 완료는 아니다.** 남은 것: **BE 연결**(지금은 전 화면이
`src/mocks/sample.ts` 데모 데이터를 feature store·repository 를 거쳐 읽는다) ·
영속 저장(MMKV) · 소셜 SDK · OS 권한(알림·캘린더) · 계측 · 아웃박스 · 앱 잠금 게이트 ·
M6(전수 테스트 · E2E · 배포) — 목록: [`docs/TASKS.md`](docs/TASKS.md) 「화면 40장이 끝난 뒤 남은 것」.

> ⚠ **아직 기기에 아무것도 남지 않는다.** 온보딩 초안·회고·일기가 전부 메모리라
> 앱을 끄면 사라진다 — MMKV 도입과 BE 연결이 그 시점이다.
