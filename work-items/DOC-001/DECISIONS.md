# DOC-001 Team Decisions

> 🗄 기록 문서 — 2026-09-22 문서 감사(DOC-001)의 팀 결정이다. 그 뒤 바뀐 것은 `docs/CONTRIBUTING.md` · `docs/SETUP.md` 가 정본이다.

이 문서는 `work-items/DOC-001/SPEC.md`의 Open Questions에 대한 팀 결정이다.

Codex와 Claude는 아래 결정을 현재 프로젝트 정책으로 취급한다.

---

## 1. EAS Build / Submit / Update

### Decision

EAS는 **현재 사용 중인 배포 방식이 아니다.**

현재 production release는 기존의 로컬 Xcode / Gradle 기반 방식을 현재 상태로 문서화한다.

다만 앞으로 개발 환경 자동화를 구축하면서 **EAS Build / Submit 도입을 별도 작업으로 검토 및 전환한다.**

현재 문서에서는 다음과 같이 구분한다.

- 현재: local native build / signing / store submission
- 향후: EAS 기반 build / submit 자동화 검토
- EAS Update / OTA: 현재 범위에 포함하지 않음

EAS가 이미 사용 중이라고 문서화하지 않는다.

---

## 2. iOS / Android Release 운영 방식

### Decision

현재 release 방식은 다음을 기준으로 한다.

### iOS

- Expo native prebuild
- Xcode signing
- Xcode Archive
- TestFlight / App Store Connect 업로드
- 최종 공개 및 심사 제출은 사람이 수행

### Android

- Expo native prebuild
- Gradle release build
- repository 외부 signing credential 사용
- AAB 생성
- Play Console 업로드
- 최종 testing/release 단계는 사람이 수행

### Credential 원칙

Secret, signing key, password, certificate 실제 값은 repository에 저장하지 않는다.

Repository에는 다음만 존재할 수 있다.

- 환경 변수 이름
- credential을 참조하는 설정
- setup 방법
- 필요한 외부 credential 종류

특정 팀원 개인을 release owner로 문서화하지 않는다.

역할명은 `Release Operator`로 정의한다.

향후 EAS로 전환하면 이 정책을 별도 Work Item에서 변경한다.

---

## 3. Production API URL

### Decision

실제 production API URL 문자열을 프로젝트 문서의 정본으로 관리하지 않는다.

정본은 다음 환경 변수다.

`EXPO_PUBLIC_API_BASE_URL`

Production에서는 반드시 HTTPS URL이어야 한다.

문서에서는 다음까지만 설명한다.

- production은 HTTPS를 강제한다.
- 실제 URL은 실행 환경에서 주입한다.
- development에서는 개발용 API 설정을 사용할 수 있다.

실제 production 서버 주소나 현재 배포 상태는 repository에서 검증되지 않는 한 단정하지 않는다.

---

## 4. Version 정책

### Decision

Momentory의 실제 앱 release version 정본은 `app.config.ts`로 한다.

구분은 다음과 같다.

- `app.config.ts version`

  - 사용자에게 보이는 앱 버전

- `ios.buildNumber`

  - iOS build 번호

- `android.versionCode`

  - Android build 번호

- `package.json version`

  - Node project/package metadata

다만 혼란을 줄이기 위해 **다음 release부터 `package.json.version`과 `app.config.ts version`은 동일하게 유지하는 것을 원칙으로 한다.**

현재 존재하는:

- package version `0.1.0`
- app version `0.1.1`

불일치는 이번 문서 최신화 작업에서 설정 파일을 수정하지 않는다.

별도의 version 정리 작업으로 처리한다.

---

## 5. M6 Milestone

### Decision

M6를 삭제하지 않고 의미를 명확하게 변경한다.

M6의 의미는:

**Release Automation**

으로 정의한다.

이미 앱을 스토어에 수동 제출한 사실과 자동화 완료 여부를 분리한다.

따라서:

- Manual Store Release: 이미 가능
- Automated Build / Submit: 미완료
- EAS 도입: M6에서 검토
- TestFlight / Play 자동 전달: M6 범위

Maestro E2E, invariant 검증 등은 M6 완료 조건에 섞지 않는다.

테스트 자동화는 별도의 Quality Automation 영역으로 관리한다.

---

## 6. App Lock

### Decision

App Lock은 **현재 개발 범위에서 제외한다.**

현재 package, setting toggle, 구현 route가 존재하지 않으므로 활성 TODO나 현재 milestone으로 취급하지 않는다.

문서에서는 다음처럼 취급한다.

`Deferred / Out of current scope`

향후 필요성이 다시 논의되면 새로운 Decision을 통해 다시 작업 범위에 포함한다.

과거 아이디어나 설계 기록은 historical context로 남길 수 있다.

---

## 7. 기존 Claude → Codex Stop Hook

### Decision

현재 `.claude/hooks/**` 기반의:

`Claude Stop → typecheck/lint/test → Codex review`

구조는 **향후 AI Development System으로 교체할 임시/legacy 자동화**로 취급한다.

따라서 이번 문서 최신화에서 현재 Stop Hook을 장기적인 표준 개발 방식처럼 새롭게 상세 문서화하지 않는다.

현재 동작을 설명해야 한다면:

> 현재 로컬 Claude 개발 과정에는 임시 Stop review automation이 존재하며 향후 새로운 Codex Manager / Claude Executor 구조로 교체 예정이다.

정도로만 기록한다.

`.claude/hooks/README.md`, review prompt, schema, config를 현재 구조에 맞춰 대규모 최신화하지 않는다.

새 Agent 개발 사이클을 설계하는 별도 Work Item에서:

- 기존 Hook 제거 또는 비활성화
- Codex Manager 역할
- Claude Executor 역할
- Work Item
- Verification
- Git / PR / Merge Gate

를 새롭게 정의한다.

---

# Resulting Policy

현재 프로젝트 상태와 앞으로의 목표를 다음처럼 구분한다.

## Current

- Local native development
- Local Xcode / Gradle release
- GitHub Actions quality CI
- Claude Stop 기반 legacy Codex review
- 사람의 최종 store/release 판단

## Target

- Team Decision
- Codex Manager
- Function Spec / Approved Design
- Claude Executor
- Claude + Codex Verification
- Git lifecycle gates
- Human final approval
- Build / Submit automation

현재 문서는 `Current`를 사실대로 설명한다.

`Target`을 이미 구현된 상태처럼 작성하지 않는다.
