# Momentory FE 하네스 탐색 문서

작업 규칙은 [`CONTRIBUTING.md`](CONTRIBUTING.md)가 우선이다. 이 문서는 Task를 시작할 때 어느 코드를 읽을지 안내한다. 제품과 디자인 판단은 기존 정본 문서에 따른다.

| 범위                   | 먼저 읽을 문서                                                         | 시작 코드와 검증                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 앱 (Expo·React Native) | `CLAUDE.md`, `docs/spec/RULES.md`, `docs/DESIGN.md`, `docs/PRODUCT.md` | `app/`, `src/`, 관련 `__tests__/`; `npm run typecheck`, `npm run lint`, `npm run test -- --ci`                   |
| Expo Lab               | `expo-lab/README.md`, `expo-lab/HANDOFF.md`, `docs/DESIGN.md`          | `expo-lab/src/shell/`(셸) · `src/frame/` · `src/fake-server/`; `npm run typecheck:expo-lab`, `npx jest expo-lab` |

`docs/EXPO_WEB_DESIGN_LAB_PLAN.md` 는 지난 계획(화면별 Mock · 캡처)이다 — 지금 Lab 은 실제 앱 전 라우트를 iframe 으로 띄운다(2026-11-02 · `expo-lab/README.md`).

공통 품질 게이트의 순서와 명령은 `docs/CONTRIBUTING.md`의 「품질 게이트」 표를 따른다. Task마다 관련 화면 스펙과 테스트 경로를 다시 확인한다. `docs/spec/`과 `docs/api/openapi.json`은 직접 수정하지 않는다.
