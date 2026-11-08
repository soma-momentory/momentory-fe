> 🗄 기록 문서 — 2026-09-22 시점의 작업 묶음이다. 지금 코드의 정본은 `NAV.md` · 규칙은 `docs/CONTRIBUTING.md`.

# Goal

전체 문서 감사 명세인 `work-items/DOC-001/SPEC.md`에서 첫 자동화 실험에 적합한 네 가지 기계적 문서 정리만 분리해 실행 범위를 고정한다. 이 Batch는 Jest 수치, 제거된 datetimepicker 표기, dependency 정본 안내, CI 품질 게이트 표 번호만 다루며 실제 코드·설정·동작은 변경하지 않는다.

# Files Allowed To Modify

- `README.md`
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTRIBUTING.md`
- `docs/PRODUCT.md`

# Files Forbidden To Modify

- `work-items/DOC-001/SPEC.md`
- `work-items/DOC-001/BATCH-01.md`를 제외한 `work-items/**`
- `docs/spec/**`
- `docs/archive/**`
- `app/**`
- `src/**`
- `plugins/**`
- `package.json`
- `package-lock.json`
- `app.config.ts`
- `ios/**`
- `android/**`
- 위 “Files Allowed To Modify”에 없는 모든 기존 파일

# Exact Changes

## 1. Jest 현재 수치 최신화

- 파일: `README.md`, `CLAUDE.md`
- 찾아야 할 현재 내용: `76 스위트 / 1,127 테스트`라고 적힌 현재 검증 수치.
- 변경할 내용: suite 수는 유지하고 test 수만 `1,137`로 바꿔 `76 스위트 / 1,137 테스트`로 적는다. 주변의 마일스톤, 진행 상태, 날짜, 남은 작업 설명은 바꾸지 않는다.
- 근거: 2026-09-22에 `npm test -- --runInBand --ci --no-watchman`을 실행한 결과 `Test Suites: 76 passed, 76 total`, `Tests: 1137 passed, 1137 total`이었다. Jest 구성의 정본은 `package.json`, `jest.config.js`, `jest.setup.ts`다.

## 2. 제거된 datetimepicker의 현재 dependency 표기 제거

- 파일: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`
- 찾아야 할 현재 내용:
  - `CLAUDE.md`의 “설치된 것(`package.json` 기준 …)” 목록에 있는 `@react-native-community/datetimepicker`와 `08 OS 피커` 설명.
  - `docs/ARCHITECTURE.md`의 “지금 쓰는 것” 표에 있는 `OS 시간 선택 | @react-native-community/datetimepicker` 행과 native module/dev client 재빌드 설명.
  - `docs/PRODUCT.md`의 현재 route mapping에서 `08`의 비고로 적힌 `OS 시간 피커`.
- 변경할 내용:
  - `@react-native-community/datetimepicker`를 설치된/current dependency로 설명하는 내용을 제거한다.
  - 현재 시간 선택 구현을 repository 내부 `WheelPicker`를 사용하는 자체 3열 picker로 설명한다.
  - `CLAUDE.md`의 설치된 dependency 목록에서는 datetimepicker 항목만 제거하고, 다른 dependency 및 설명은 유지한다.
  - `docs/ARCHITECTURE.md`의 현재 stack 표에서는 해당 행을 `WheelPicker` 기반 구현으로 정정하되 외부 dependency나 native module인 것처럼 쓰지 않는다.
  - `docs/PRODUCT.md`의 `08` route 비고를 `WheelPicker` 기반 시간 선택으로 정정한다.
- 근거: `@react-native-community/datetimepicker`는 `package.json`과 `package-lock.json`에 없다. `app/(onboarding)/retro-time.tsx`와 `app/(tabs)/my.tsx`는 `src/components/ds/WheelPicker.tsx`에서 export된 `WheelPicker`를 사용한다.

## 3. 현재 dependency 설명을 package.json 기준과 일치시킴

- 파일: `CLAUDE.md`, `docs/ARCHITECTURE.md`
- 찾아야 할 현재 내용:
  - `CLAUDE.md`의 날짜가 붙은 장문 “설치된 것(`package.json` 기준 …)” 목록.
  - `docs/ARCHITECTURE.md`의 “지금 쓰는 것” 및 “도입 예정” dependency 설명 가운데 현재 설치 여부를 선언하는 문장.
- 변경할 내용:
  - dependency 설치 여부와 version의 정본은 `package.json`임을 명시한다.
  - 문서는 architecture 이해에 필요한 핵심 선택과 역할만 설명하고, 전체 dependency inventory를 중복 소유하지 않는 방향을 우선한다.
  - 전체 설치 목록을 유지해야 할 특별한 이유가 없다면 `CLAUDE.md`의 장문 목록을 `package.json` 정본 링크와 핵심 native/runtime dependency 요약으로 줄인다.
  - 현재 설치된 것으로 남기는 이름은 `package.json`에 실제 선언된 package만 사용한다.
  - TanStack Query, MMKV, Reanimated, MSW가 아직 설치되지 않았다는 현재 설명은 `package.json`과 일치하므로 유지한다.
  - dependency 추가·제거·version 변경, `package.json`/lockfile 수정은 하지 않는다.
- 근거: `package.json`에는 runtime dependencies 26개와 devDependencies 13개가 선언돼 있고, `npm ls --depth=0 --json`은 top-level 설치 트리를 오류 없이 확인했다. `@react-native-community/datetimepicker`는 선언돼 있지 않다.

## 4. CI 품질 게이트 표 번호 연속화

- 파일: `docs/CONTRIBUTING.md`
- 찾아야 할 현재 내용: “품질 게이트” 표의 순서 열 `1, 3, 4, 5, 6, 7`.
- 변경할 내용: 실행 순서를 유지한 채 번호만 `1, 2, 3, 4, 5, 6`으로 연속화한다.
  - `1` — `npm ci`
  - `2` — `npm run typecheck`
  - `3` — `npm run lint`
  - `4` — `npm run format:check`
  - `5` — `npm run test -- --ci`
  - `6` — 시크릿 추적 검사
- 근거: `.github/workflows/ci.yml`의 `check` job은 위 여섯 검사를 같은 순서로 실행한다. 현재 문서의 명령과 동작 설명은 workflow와 일치하며 번호만 불연속이다.

# Must Not Change

- `work-items/DOC-001/SPEC.md`의 전체 감사 내용.
- Jest script, Jest config, test code 또는 test 동작.
- dependency 선언, version, lockfile 또는 설치 상태.
- CI command, trigger, job, step, 실행 순서 또는 동작. 품질 게이트 표의 순서 번호 외에는 CI 내용을 바꾸지 않는다.
- `docs/ARCHITECTURE.md`의 대규모 route, routing model, data flow, milestone 또는 app-lock 정리.
- `docs/PRODUCT.md` 차이 대장의 상태·경로·역사 기록.
- HTTPS 또는 실제 API 배포 상태 설명.
- EAS, signing 또는 release 정책 설명.
- npm package version, Expo app version, iOS build number, Android version code 정책.
- Claude/Codex Stop-hook 또는 automation 설명.
- `SPEC.md`의 Open Questions에 해당하는 모든 사항.
- 역사적 문맥에서 제거된 datetimepicker를 과거 구현으로 명시한 기록. 이번 Batch는 이를 현재 dependency/current implementation으로 적은 부분만 고친다.
- 허용된 문서의 다른 진행 상태, 날짜, 마일스톤, 제품 결정 및 경로 설명.

# Acceptance Criteria

- `README.md`와 `CLAUDE.md`의 현재 Jest 수치가 모두 `76 suites / 1,137 tests`에 해당하며 `1,127`이 현재 수치로 남아 있지 않다.
- `CLAUDE.md`와 `docs/ARCHITECTURE.md`가 `@react-native-community/datetimepicker`를 현재 설치 dependency로 설명하지 않는다.
- `docs/PRODUCT.md`의 현재 `08` route 설명이 OS picker가 아니라 `WheelPicker` 구현과 일치한다.
- datetimepicker의 과거 사용·교체 이력을 명시적으로 설명하는 역사 기록은 삭제하지 않는다.
- dependency 설치 여부의 정본이 `package.json`임이 분명하고, 문서의 현재 dependency 이름이 `package.json`과 충돌하지 않는다.
- `package.json`과 `package-lock.json`에 변경이 없다.
- `docs/CONTRIBUTING.md`의 품질 게이트 표 번호가 `1`부터 `6`까지 연속적이다.
- CI 명령, 설명, 실행 순서 및 `.github/workflows/ci.yml`에 변경이 없다.
- route/milestone 대규모 정리, PRODUCT 차이 대장 상태 정리, HTTPS 판단, EAS/release 정책, version 정책, Claude/Codex automation, Open Questions는 변경하지 않는다.
- 변경 파일은 “Files Allowed To Modify”에 열거된 문서 중 실제 변경이 필요한 파일로 제한된다.
- 코드, 설정, test, spec, archive 및 기존 work-item 명세를 수정하지 않는다.
