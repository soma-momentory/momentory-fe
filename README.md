# momentory-fe

모멘토리 앱의 React Native 프론트엔드. **MVP 40화면** — 열고 → 여섯 가지 묻고 → 담고 →
밤에 돌아보고 → 일기가 남고 → 다시 읽는다.

## 시작하기

```bash
nvm use              # .nvmrc — Node 22.14
npm ci
cp .env.example .env # 값은 팀의 빌드 환경 변수에서 받는다 (비밀이 아니다 — CONTRIBUTING §값 3등급)
npm start
```

공식 개발 환경은 **dev client** 다. 처음 한 번 `npm run ios` / `npm run android` 로
네이티브 앱을 설치하고, 이후 JS 작업은 `npm start` 로 진행한다. Expo Go 는 지원하지 않는다.

## 스택

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (strict) · expo-router.
선택 이유와 대안은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 설계는 어디에 있나

이 저장소에 화면 스펙이 없다. 부모 저장소 `momentory` 가 갖는다.

| 무엇 | 어디 |
|---|---|
| **MVP 40화면 규칙 · 구현 순서** | `../09_MVP/docs/RULES.md` ← 1순위 |
| 상태 기계 7개 · 엔티티 7개 | `../09_MVP/스펙/` |
| 화면별 스펙 | `../09_MVP/docs/<ID>.md` |
| 눈으로 보기 | `../03_미리보기/MVP.html` |
| 토큰 정본 | `../02_디자인시스템/theme.ts` → `npm run sync:theme` |

### 빌드는 독립, 개발은 아니다

**빌드는 부모 없이 된다** — 테마와 폰트를 커밋해뒀으니 `npm ci && npm start` 가 그대로 돈다.
**하지만 화면을 만들려면 부모가 있어야 한다.** 위 표의 스펙·상태 기계·계측 규칙이 전부 저쪽에 있다.

지금 이 저장소가 맞춰져 있는 설계 기준:

| | |
|---|---|
| 범위 | `09_MVP` — MVP 40화면 (노드 1,684개) |
| 상류 번들 | `07_반입/_archive/UXUI리팩토링_MVP_v2_20260806_반입완료/export/mvp/` · 2026-08-06 반입 |
| 토큰 | `src/design/theme.ts` 헤더의 `@generated-from` 이 원본 커밋 SHA 를 들고 있다 |

> **커밋 SHA 를 여기 박지 않는 이유** — 부모 저장소에는 아직 리모트가 없다(로컬 전용).
> 가져올 수 없는 SHA 를 적으면 정확해 보이지만 아무도 그 커밋을 체크아웃할 수 없다.
> 부모에 리모트가 붙으면 그때 이 표에 `momentory@<sha>` 를 추가하고,
> CI 가 `theme.ts` 의 `@generated-from` 과 대조하게 만든다.
> 지금 유효한 대조 수단은 `npm run check:theme` 하나다 — 생성물이 손대졌는지까지만 본다.

## 문서

**처음이면 [`docs/SETUP.md`](docs/SETUP.md) → [`docs/TASKS.md`](docs/TASKS.md) 순서로 읽는다.**

- [`docs/SETUP.md`](docs/SETUP.md) — 개발 환경. Android/iOS 빌드 · 자주 막히는 곳 6개
- [`docs/TASKS.md`](docs/TASKS.md) — 작업 분해와 분담. 둘이 부딪히는 파일까지
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — **작업 규칙의 정본.** 커밋 · 값 3등급 · 의존성 · 생성물
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 기술 설계 · 데이터 레이어 · 아웃박스 계약 · 마일스톤
- [`assets/fonts/README.md`](assets/fonts/README.md) — Pretendard 출처·해시·라이선스
- [`CLAUDE.md`](CLAUDE.md) — AI 도구용 길잡이. 규칙을 소유하지 않고 위 문서를 가리킨다

## 진행

**M0·M1 완료** — 셋업 · git 위생 · Pretendard · 테마 동기화 · P0 컴포넌트(기본 3종 + 채팅 6종 + 진행 2종) · 테스트 기반.

**M2 진행 중** — 로그인(`S1`)과 온보딩 7장이 있다. 단 **구판(30화면) 기준으로 만들어져
상류 v2(2026-08-06 · 40화면) 따라잡기가 남아 있다** — 목록은
[`docs/TASKS.md` 「상류 v2 따라잡기」](docs/TASKS.md). 마일스톤과 각 단계의 선행 조건은
[`docs/ARCHITECTURE.md §7`](docs/ARCHITECTURE.md) 에 있다.
