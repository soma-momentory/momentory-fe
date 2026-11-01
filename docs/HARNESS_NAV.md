# Momentory FE 하네스 탐색 문서

작업 규칙은 [`CONTRIBUTING.md`](CONTRIBUTING.md)가 우선이다. 이 문서는 Task를 시작할 때 어느 코드를 읽을지 안내한다. 제품과 디자인 판단은 기존 정본 문서에 따른다.

| 범위                   | 먼저 읽을 문서                                                             | 시작 코드와 검증                                                                               |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 앱 (Expo·React Native) | `CLAUDE.md`, `docs/spec/RULES.md`, `docs/DESIGN.md`, `docs/PRODUCT.md`     | `app/`, `src/`, 관련 `__tests__/`; `npm run typecheck`, `npm run lint`, `npm run test -- --ci` |
| Expo Web Design Lab    | `docs/EXPO_WEB_DESIGN_LAB_PLAN.md`, `expo-lab/README.md`, `docs/DESIGN.md` | `expo-lab/src/`, `expo-lab/src/App.tsx`; `npm run typecheck:expo-lab`                          |

공통 품질 게이트의 순서와 명령은 `docs/CONTRIBUTING.md`의 「품질 게이트」 표를 따른다. Task마다 관련 화면 스펙과 테스트 경로를 다시 확인한다. `docs/spec/`과 `docs/api/openapi.json`은 직접 수정하지 않는다.
