# Goal

현재 repository의 코드와 설정을 기준으로 활성 문서의 오래된 서술을 최신화한다. 이 명세의 후속 작업은 확인 가능한 현재 상태만 반영하고, 역사적 기록은 현재 상태로 오해되지 않도록 구분하며, 코드·설정·archive/spec 문서는 변경하지 않는다.

# Verified Current State

- 2026-09-22에 `npm test -- --runInBand --ci --no-watchman`을 실행한 결과 **76 test suites / 1,137 tests / 0 snapshots**가 모두 통과했다. 최초의 기본 실행은 sandbox 밖 Watchman 상태 파일 권한 때문에 테스트 수집 전에 중단됐으며, `--no-watchman` 실행은 통과했다. `README.md`와 `CLAUDE.md`의 **76 suites / 1,127 tests**는 10 tests 오래됐다.
- Jest는 `jest.config.js`의 `jest-expo` preset, `jest.setup.ts`, `@/` → `src/` module mapping을 사용한다. `package.json`의 test script는 `jest`, watch script는 `jest --watch`다.
- `package.json`에는 runtime dependencies 26개와 devDependencies 13개가 선언돼 있다.
  - Runtime: `@amplitude/analytics-react-native`, `@react-native-async-storage/async-storage`, `@react-native-google-signin/google-signin`, `@react-native-seoul/kakao-login`, `expo`, `expo-apple-authentication`, `expo-build-properties`, `expo-calendar`, `expo-constants`, `expo-crypto`, `expo-dev-client`, `expo-font`, `expo-image`, `expo-linking`, `expo-notifications`, `expo-router`, `expo-secure-store`, `expo-splash-screen`, `expo-status-bar`, `expo-web-browser`, `react`, `react-native`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `zustand`.
  - Development: `@react-native/jest-preset`, `@testing-library/react-native`, `@types/jest`, `@types/node`, `@types/react`, `eslint`, `eslint-config-expo`, `eslint-config-prettier`, `jest`, `jest-expo`, `prettier`, `test-renderer`, `typescript`.
  - `npm ls --depth=0 --json`은 이 top-level 설치 트리를 오류 없이 확인했다.
- `@react-native-community/datetimepicker`는 `package.json`과 `package-lock.json`에 없다. `app/(onboarding)/retro-time.tsx`와 `src/components/ds/WheelPicker.tsx`에 따르면 온보딩과 마이의 시간 선택은 자체 `WheelPicker`로 교체됐다. 그러나 `docs/ARCHITECTURE.md`, `CLAUDE.md`, `docs/PRODUCT.md`는 이를 현재 설치 dependency 또는 현재 OS 시간 피커로 서술한다.
- 실제 라우트 page 파일은 `_layout.tsx`와 test 파일을 제외하면 31개다. `docs/PRODUCT.md`의 Markdown link target은 모두 존재하지만, 차이 대장 안에는 현재 경로/현재 구현처럼 읽히는 삭제 경로와 삭제 파일이 남아 있다.
- 현재 존재하지 않는 주요 경로는 `src/design/tokens.mvp.ts`, `src/design/paper.ts`, `docs/design/`, `docs/design/IMPORT.md`, `app/home/moment/`, `app/home/emotion/[id].tsx`, `app/rest/cards/[date].tsx`, `src/mocks/sample.ts`, `scripts/sync-theme.mjs`, `src/app/`이다. 삭제 사실이나 명시적으로 과거 목표 구조임을 설명하는 문맥은 역사적 기록이므로 오류가 아니다. 반면 `docs/PRODUCT.md` 차이 #1·#17·#18·#19 및 현재 상태 열은 일부를 아직 현재 경로/진행 상태로 취급한다.
- `docs/PRODUCT.md` 차이 #21은 본문에서 결정이 닫혔다고 쓰면서 상태는 `진행 중`이다. 현재 감정 정본 `src/features/emotion/model/emotion.ts`는 10종이며 `화남`과 `답답함`을 별도 항목으로 둔다. 이 변경은 같은 문서의 차이 #39에도 기록돼 있다.
- `docs/PRODUCT.md`의 현재 라우트 표는 `08`을 “OS 시간 피커”라고 설명하지만 실제 화면은 `WheelPicker`를 사용한다.
- `docs/ARCHITECTURE.md`의 “지금 쓰는 것” 표는 제거된 `@react-native-community/datetimepicker`를 포함한다. 같은 문서의 현재 라우팅 서술에는 삭제된 report unlock 조건(`diaryCount >= 7`)이 남아 있고, 현재 경로가 `/retro/confirm`인데 앱 잠금 절은 삭제된 `/retro/intro`를 딥링크 대상으로 든다.
- `docs/ARCHITECTURE.md`의 마일스톤 표는 상단 요약과 서로 충돌한다. M2 산출물은 소셜 로그인·알림·캘린더 권한을 대기 상태로 적지만 관련 dependencies, adapters, routes가 존재한다. M3 산출물은 삭제된 `12-d`와 순간 쓰기 경로를 현재 범위로 적는다. M5 산출물은 리포트가 서버에서 오지 않는다고 적지만 `src/features/report/data/weeklyReportApi.ts`가 있고 같은 문서의 파생값 절은 `GET /api/v1/reports/weekly`를 현재 상태로 설명한다.
- `docs/ARCHITECTURE.md`에는 HTTPS가 아직 비었거나 평문이라는 과거 서술이 남아 있다. 현재 `app.config.ts`는 production에서 `EXPO_PUBLIC_API_BASE_URL`이 유효한 HTTPS URL이 아니면 실패시키며, 실제 URL 값은 repository에 저장하지 않는다.
- CI는 `.github/workflows/ci.yml`의 단일 `check` job이다. `main` push와 모든 pull request에서 checkout → `.nvmrc` 기반 Node setup/npm cache → `npm ci` → typecheck → lint → format check → Jest CI → tracked secret filename 검사를 순서대로 실행한다. `docs/CONTRIBUTING.md`의 품질 게이트 내용은 이 절차와 일치한다. 표 순서 번호가 1, 3, 4, 5, 6, 7로 끊겨 있을 뿐 실행 단계의 누락을 뜻하지 않는다.
- repository에는 `eas.json`, EAS 관련 npm script, EAS build/submit GitHub Actions가 없다. `docs/ARCHITECTURE.md`는 EAS Build/Update와 EAS 내부 배포를 미래 M6로 적고, `docs/CONTRIBUTING.md`는 현재 빌드 환경 변수와 서명 키를 EAS가 관리한다고 단정한다.
- repository에서 확인되는 release 설정은 EAS가 아니라 로컬 native 생성/서명 경로다. `app.config.ts`는 Xcode 배포용 production prebuild, iOS `buildNumber: "3"`, Android `versionCode: 4`, production-only cleanup을 정의한다. `plugins/withReleaseSigning.ts`는 Android release signing 정보를 repository 밖 `~/.gradle/gradle.properties`의 `MOMENTORY_RELEASE_*`에서 읽도록 생성된 Gradle 파일을 변경한다. 정확한 사람 중심 release 절차와 외부 credential 보관 위치는 repository만으로 확정할 수 없다.
- `package.json` version은 `0.1.0`, `app.config.ts`의 Expo app version은 `0.1.1`이다. `app.config.ts`의 iOS build-number 주석에는 같은 version을 `0.1.0`이라고 적은 과거 문장이 있지만 설정 파일은 이번 작업의 변경 금지 대상이다.
- `.claude/settings.json`은 Claude Code `Stop` hook으로 `.claude/hooks/codex-review.mjs`를 등록한다. 설정은 repository에 추적된다. hook은 변경이 없으면 종료를 허용하고, code extension 변경이 있으면 typecheck/lint/test를 먼저 실행한 뒤 모든 변경 diff를 Codex CLI의 read-only review에 보낸다. Codex 미설치·미인증·timeout·실행/JSON 오류는 skip하고 종료를 허용한다. 기본 block 상한은 세션당 3회이며 설정과 실행 설명은 `.claude/hooks/codex-review.config.json` 및 `.claude/hooks/README.md`에 있다. 이 자동화는 GitHub Actions CI가 아니라 Claude Code 로컬 Stop hook이다.
- `CLAUDE.md`에는 위 Claude/Codex Stop-hook 자동화의 현재 설명이나 `.claude/hooks/README.md` 링크가 없다.
- 팀 결정에 따라 현재 production release는 EAS가 아니라 local Expo native prebuild와 Xcode/Gradle을 사용하며, store upload와 최종 release 판단은 `Release Operator`가 수행한다. EAS Build/Submit 자동화는 M6에서 검토할 향후 범위이고 EAS Update/OTA는 현재 범위 밖이다.
- 팀 결정에 따라 앱 release version의 정본은 `app.config.ts`다. 현재 package/app version 불일치는 설정을 수정하지 않고 별도 version 정리 작업으로 넘기며, 다음 release부터 두 version을 같게 유지한다.
- 팀 결정에 따라 M6는 **Release Automation**을 뜻한다. 수동 store release 가능 여부와 자동 build/submit 완료 여부를 분리하며, Maestro E2E와 invariant 검증은 M6가 아니라 별도 Quality Automation 영역이다.
- 팀 결정에 따라 App Lock은 `Deferred / Out of current scope`다. 현재 milestone의 활성 TODO로 취급하지 않는다.
- 팀 결정에 따라 현재 Claude Stop → local gates → Codex review hook은 향후 AI Development System으로 교체할 임시/legacy 자동화다.

# Files Allowed To Modify

- `README.md`
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/CONTRIBUTING.md`
- `docs/PRODUCT.md`

이 목록은 후속 문서 최신화 작업에만 적용된다. 이 조사 작업에서 생성하는 산출물은 `work-items/DOC-001/SPEC.md` 하나다.

# Files Forbidden To Modify

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

# Required Changes

## 1. Jest 통과 수치 최신화

- 대상 파일: `README.md`, `CLAUDE.md`
- 현재 잘못되었거나 오래된 내용: 두 문서가 현재 검증 결과를 `76 스위트 / 1,127 테스트`라고 적는다.
- 실제 현재 상태: 2026-09-22 실행 결과는 `76 passed suites / 1,137 passed tests / 0 snapshots`다.
- 어떻게 수정해야 하는지: 두 문서의 현재 수치를 76 suites / 1,137 tests로 맞춘다. 실행 환경 우회를 상시 test command로 오해하지 않도록 `--no-watchman`은 문서의 표준 명령에 추가하지 않는다.
- 판단 근거가 된 코드 또는 설정 파일: `package.json`, `jest.config.js`, `jest.setup.ts`, 실제 `npm test -- --runInBand --ci --no-watchman` 결과.

## 2. 제거된 datetimepicker를 현재 dependency에서 제거

- 대상 파일: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT.md`
- 현재 잘못되었거나 오래된 내용: `CLAUDE.md`의 설치 목록과 `docs/ARCHITECTURE.md`의 현재 stack 표가 `@react-native-community/datetimepicker`를 설치된 OS 피커로 든다. `docs/PRODUCT.md`의 현재 route mapping은 `08`을 OS 시간 피커라고 설명한다.
- 실제 현재 상태: 해당 package는 `package.json`/lockfile에 없으며 `08`과 마이 알림 설정은 repository의 `WheelPicker`를 사용한다.
- 어떻게 수정해야 하는지: 설치 dependency 목록에서 package를 제거하고 시간 선택 구현을 `src/components/ds/WheelPicker.tsx` 기반 자체 3열 picker로 설명한다. 제거 전환의 역사 자체는 삭제하지 말고 명시적으로 과거 문맥에만 남긴다.
- 판단 근거가 된 코드 또는 설정 파일: `package.json`, `package-lock.json`, `app/(onboarding)/retro-time.tsx`, `app/(tabs)/my.tsx`, `src/components/ds/WheelPicker.tsx`, `src/components/ds/index.ts`.

## 3. 현재 dependency 목록을 package.json과 일치시킴

- 대상 파일: `CLAUDE.md`, `docs/ARCHITECTURE.md`
- 현재 잘못되었거나 오래된 내용: 현재 설치 목록에 제거된 datetimepicker가 포함돼 있어 문서가 `package.json` 기준이라는 자기 설명과 어긋난다. 목록 갱신 날짜도 2026-09-12에 고정돼 있다.
- 실제 현재 상태: “Verified Current State”에 적은 runtime 26개/dev 13개가 선언돼 있다. 아직 없는 것으로 적힌 TanStack Query, MMKV, Reanimated, MSW는 top-level dependency에 없다.
- 어떻게 수정해야 하는지: 문서가 전체 package inventory를 소유한다면 현재 선언 목록과 정확히 맞추고, 핵심 stack만 설명한다면 “전체 목록은 package.json이 정본”이라고 범위를 명시한다. 제거된 package를 현재 목록에 남기지 않는다. 아직 없는 네 package의 상태는 유지한다.
- 판단 근거가 된 코드 또는 설정 파일: `package.json`, `package-lock.json`, `npm ls --depth=0 --json` 결과.

## 4. ARCHITECTURE의 현재 라우팅·데이터·마일스톤 정합성 복구

- 대상 파일: `docs/ARCHITECTURE.md`
- 현재 잘못되었거나 오래된 내용: 상류 40화면/4탭 설명이 현재 제품처럼 읽히고, machine state와 route가 1:1이라고 단정한다. report unlock 7편 조건, 삭제된 `/retro/intro`, M2의 소셜/권한 대기, M3의 `12-d`/순간 쓰기, M5의 “리포트가 서버에서 오지 않음”이 현재 구현과 어긋난다. “남은 것은 앱 잠금 게이트”와 “잠금 토글이 없어 지킬 것이 없음”도 문서 안에서 충돌한다.
- 실제 현재 상태: route page는 31개, 탭은 5개다. 회고 v2로 `C1`/`C3`가 없어졌고 `/retro/confirm`에서 시작한다. report는 처음부터 열리고 weekly API에서 데이터를 받는다. Moment는 타입만 남고 생성/조회 화면이 없다. 소셜 3종·로컬 알림·calendar sync 구현 파일과 dependencies가 있다. 앱 잠금 package와 toggle은 없다.
- 어떻게 수정해야 하는지: 상류 원본 구조와 현재 제품 구조를 명시적으로 분리한다. 현재 동작을 설명하는 절에서는 31 routes/5 tabs, v2 시작 route, unlock 제거, weekly server API, Moment 비사용 상태를 반영한다. 마일스톤 표의 완료/△ 표기와 산출 설명을 실제 구현과 맞추되, 과거 계획 문장은 “과거 목표 구조/당시 판단”이라는 경고 아래 보존할 수 있다. M6는 `Release Automation`으로 정의하고 Maestro E2E/invariant 검증은 별도 Quality Automation 영역으로 분리한다. App Lock은 `Deferred / Out of current scope`로 표시하고 현재 milestone의 활성 TODO에서 제거한다.
- 판단 근거가 된 코드 또는 설정 파일: `app/**` route files, `app/(tabs)/_layout.tsx`, `app/(tabs)/home.tsx`, `app/retro/**`, `app/(tabs)/report.tsx`, `src/features/report/data/weeklyReportApi.ts`, `src/features/home/model/day.ts`, `src/features/home/model/types.ts`, `package.json`, `docs/PRODUCT.md` route map.

## 5. HTTPS 현재 설명을 repository가 증명하는 범위로 제한

- 대상 파일: `docs/ARCHITECTURE.md`, 필요하면 같은 현황 표를 가진 `CLAUDE.md`
- 현재 잘못되었거나 오래된 내용: `docs/ARCHITECTURE.md`는 HTTPS가 비었고 아직 평문이라고 현재형으로 적는 반면 `CLAUDE.md`는 구체 production URL을 완료 항목으로 적는다. 실제 값은 repository에 없다.
- 실제 현재 상태: production config는 HTTPS URL을 강제하고 development에서는 비어 있거나 HTTP host 하나에만 native 예외를 열 수 있다. 배포된 API의 현재 실제 URL은 repository만으로 확인할 수 없다.
- 어떻게 수정해야 하는지: production은 HTTPS를 강제하고 실제 URL은 `EXPO_PUBLIC_API_BASE_URL`로 실행 환경에서 주입하며 development는 개발용 API 설정을 사용할 수 있다고 적는다. 구체 URL/실제 배포 상태는 repository에서 검증되지 않는 한 단정하지 않는다. 실제 production URL 문자열을 프로젝트 문서의 정본으로 만들지 않는다. 역사적 전환 기록을 남길 경우 현재 설정 설명과 분리한다.
- 판단 근거가 된 코드 또는 설정 파일: `app.config.ts`, `.env.example`, `plugins/withInsecureDevApi.ts`, `src/lib/config.ts`.

## 6. EAS와 실제 release 설정의 구분

- 대상 파일: `docs/CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `README.md`, `CLAUDE.md`
- 현재 잘못되었거나 오래된 내용: `docs/CONTRIBUTING.md`는 빌드 환경 변수와 signing key를 EAS가 관리한다고 현재형으로 단정한다. `docs/ARCHITECTURE.md`는 EAS Build/Update와 EAS 내부 배포를 M6의 배포 방식으로 적지만 EAS 구성은 없다. `README.md`/`CLAUDE.md`는 배포를 아직 남은 M6 작업으로 묶으면서 `CLAUDE.md` 자체는 store 제출 이력을 현재 사실로 적는다.
- 실제 현재 상태: `eas.json`, EAS npm scripts, EAS workflow가 없다. repository가 구현한 release 경로는 Xcode production prebuild validation과 repository 밖 Gradle properties를 사용하는 Android signing plugin이다. iOS build number 3과 Android version code 4가 설정돼 있고, code comments와 git history에는 store upload/resubmission 흔적이 있다.
- 어떻게 수정해야 하는지: 현재 release를 local native 방식으로 명시한다. iOS는 Expo native prebuild → Xcode signing → Xcode Archive → TestFlight/App Store Connect upload, Android는 Expo native prebuild → Gradle release build → repository 외부 signing credential → AAB → Play Console upload 순서다. 최종 공개·심사·testing/release 단계는 `Release Operator`가 수행한다고 적고 특정 팀원을 owner로 지정하지 않는다. secret/signing 실제 값은 repository 밖에 두고 repository에는 환경 변수 이름, credential 참조 설정, setup 방법, 필요한 credential 종류만 둘 수 있다는 원칙을 유지한다. EAS Build/Submit은 M6 `Release Automation`에서 검토할 향후 전환이고, TestFlight/Play 자동 전달은 M6 범위다. EAS Update/OTA는 현재 범위에 포함하지 않는다.
- 판단 근거가 된 코드 또는 설정 파일: `app.config.ts`, `plugins/withReleaseSigning.ts`, `plugins/withoutDevLauncherNetwork.ts`, `plugins/withoutDevOverlayPermission.ts`, `.github/workflows/ci.yml`, `package.json`, repository 내 `eas.json` 부재, git history의 release 관련 commits.

## 7. CI 설명의 정확한 유지와 순서 번호 정리

- 대상 파일: `docs/CONTRIBUTING.md`; 이를 요약하는 `README.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`는 정본 링크를 유지한다.
- 현재 잘못되었거나 오래된 내용: CI 명령 내용은 실제 workflow와 일치하지만 품질 게이트 표 순서가 1 다음 3으로 시작한다. 이는 누락 단계가 있는 것처럼 읽힌다.
- 실제 현재 상태: 실행 단계는 `npm ci`, typecheck, lint, format check, Jest CI, tracked-secret 검사 여섯 단계다. build, EAS, release job은 없다.
- 어떻게 수정해야 하는지: 명령과 순서는 유지하고 표 번호만 연속적으로 정리한다. CI에 없는 build/release/EAS 단계를 추가하거나 암시하지 않는다.
- 판단 근거가 된 코드 또는 설정 파일: `.github/workflows/ci.yml`, `package.json`, `.nvmrc`, `.npmrc`.

## 8. PRODUCT의 현재 route 설명과 오래된 차이 상태 정리

- 대상 파일: `docs/PRODUCT.md`
- 현재 잘못되었거나 오래된 내용:
  - route table의 `08`이 OS picker로 적혀 있다.
  - 차이 #1은 삭제된 `src/design/tokens.mvp.ts`를 “override 중”인 현재 임시 기록 자리로 두고 `열림`으로 표시한다.
  - 차이 #17은 완료 조건인 옛 token 삭제가 이미 일어났는데 삭제된 `docs/design/IMPORT.md`와 `src/design/paper.ts`를 임시 기록 자리로 두고 `진행 중`으로 표시한다.
  - 차이 #18은 `C1`/`C2`가 Moment를 읽는다고 적고 `진행 중`이지만 C1은 삭제됐고 C2 test는 “오늘의 순간”이 없음을 확인하며 Moment는 unused type만 남았다.
  - 차이 #19는 존재하지 않는 `app/home/emotion/[id].tsx`를 현재 route/임시 기록 자리로 두고 `진행 중`으로 표시한다. 현재 일정 수정 route는 `app/home/schedule/[id].tsx`이며 제목 편집만 담당하고 감정 선택 함수는 호출 화면이 없다.
  - 차이 #21은 본문에서 닫힘이라고 하면서 상태를 `진행 중`으로 표시하고, 이후 10-emotion 변경인 #39와도 충돌한다.
- 실제 현재 상태: 위 각 항목은 repository code와 차이 대장의 후속 행에서 완료·삭제·대체 상태를 확인할 수 있다.
- 어떻게 수정해야 하는지: `08`을 custom `WheelPicker`로 정정한다. #1·#17·#18·#19·#21은 역사적 결정의 원문 취지를 보존하면서 현재 후속 상태, 실제 임시 기록 자리 또는 “없음”, 대체된 route/구현, 닫힘/대체됨 상태를 명시한다. 삭제된 path를 현재 작업 위치처럼 제시하지 않는다. #21은 #39의 10-emotion 결정에 의해 superseded됐음을 연결한다.
- 판단 근거가 된 코드 또는 설정 파일: `src/design/ds/**`, `app/(onboarding)/retro-time.tsx`, `src/components/ds/WheelPicker.tsx`, `app/retro/confirm.tsx`, `app/retro/__tests__/retro.test.tsx`, `src/features/home/model/day.ts`, `src/features/home/model/types.ts`, `app/home/schedule/[id].tsx`, `src/features/emotion/model/emotion.ts`, 실제 file tree.

## 9. Claude/Codex legacy 자동화의 최소 현황 표시

- 대상 파일: `CLAUDE.md`; 작업 규칙 정본과 연결이 필요하면 `docs/CONTRIBUTING.md`에도 짧은 링크를 추가한다.
- 현재 잘못되었거나 오래된 내용: `CLAUDE.md`는 repository에 활성화된 Claude Code Stop hook의 존재와 임시/legacy 지위를 설명하지 않는다.
- 실제 현재 상태: tracked `.claude/settings.json`의 Stop hook이 `.claude/hooks/codex-review.mjs`를 실행한다. code change에만 local gates가 선행되며, diff review는 Codex read-only mode다. 인프라 실패는 skip, 실제 gate failure 또는 review findings는 block하되 세션 상한은 기본 3회다. GitHub Actions에는 Codex step이 없다.
- 어떻게 수정해야 하는지: 현재 로컬 Claude 개발 과정에 `Claude Stop → typecheck/lint/test → Codex review` 형태의 임시 Stop review automation이 있고 향후 새로운 Codex Manager / Claude Executor 구조로 교체 예정이라고 최소한으로만 적는다. 이를 장기 표준, remote CI 또는 완성된 AI Development System처럼 상세 문서화하지 않는다. `.claude/hooks/README.md`, review prompt, schema, config의 대규모 최신화는 이 Work Item에 포함하지 않는다. 새 Agent 개발 사이클과 기존 hook 제거/비활성화는 별도 Work Item으로 넘긴다.
- 판단 근거가 된 코드 또는 설정 파일: `.claude/settings.json`, `.claude/hooks/codex-review.mjs`, `.claude/hooks/codex-review.config.json`, `.claude/hooks/codex-review-prompt.md`, `.claude/hooks/codex-review-schema.json`, `.github/workflows/ci.yml`.

## 10. app/package version 차이를 문서에서 혼동하지 않음

- 대상 파일: release/version을 설명하는 `CLAUDE.md` 및 필요한 경우 `README.md`, `docs/ARCHITECTURE.md`, `docs/CONTRIBUTING.md`
- 현재 잘못되었거나 오래된 내용: repository에는 package version과 Expo app version이 다르지만 활성 문서에는 두 version의 역할 구분이 없다. `app.config.ts` 내부 주석도 app version의 과거 값 `0.1.0`을 포함하지만 이 작업에서 설정은 수정할 수 없다.
- 실제 현재 상태: npm package version은 `0.1.0`, Expo app version은 `0.1.1`, iOS build number는 `3`, Android version code는 `4`다.
- 어떻게 수정해야 하는지: `app.config.ts version`을 사용자에게 보이는 앱 release version 정본, `ios.buildNumber`/`android.versionCode`를 플랫폼 build 번호, `package.json version`을 Node project/package metadata로 구분한다. 현재 `0.1.0`/`0.1.1` 불일치는 이 문서 최신화에서 설정을 수정하지 않고 별도 version 정리 작업으로 넘긴다. 다음 release부터 `package.json.version`과 `app.config.ts version`을 같게 유지한다는 원칙을 문서화한다.
- 판단 근거가 된 코드 또는 설정 파일: `package.json`, `app.config.ts`.

# Must Preserve

- `docs/spec/**`이 동결된 상류 snapshot이고 직접 수정하지 않는다는 안내.
- `docs/archive/**`가 역사 기록이며 활성 현재 상태와 구분해 보존돼야 한다는 원칙.
- `docs/DESIGN.md`와 `src/design/ds/**`의 현재 디자인/token SSOT 역할.
- 현재 31 route 및 5-tab 구조, 회고 v2, 10-emotion domain, 쉼터/감각연못, weekly report server 연동에 대한 정확한 설명.
- `docs/PRODUCT.md` 차이 대장의 역사적 결정 근거. 오래된 행은 삭제보다 “닫힘”, “대체됨”, “후속 행 참조”처럼 현재 상태를 덧붙이는 방식을 우선한다.
- CI 정본이 `.github/workflows/ci.yml` 및 `docs/CONTRIBUTING.md`의 품질 게이트라는 구조와 실제 여섯 검사 단계.
- Expo Go가 아니라 dev client를 공식 개발 환경으로 쓴다는 안내.
- secret, 공개 식별자, signing key를 구분하고 repository에 실제 값을 commit하지 않는 규칙.
- production API URL의 HTTPS 강제, 환경 변수 기반 config, Android release signing 값이 repository 밖에 있다는 보안 경계.
- 현재 Claude Stop 기반 Codex review가 임시/legacy 자동화라는 지위. 상세 동작은 역사적 현재 상태로만 보존하고 장기 표준으로 승격하지 않는다.
- 현재 release는 local Xcode/Gradle 기반이고 최종 store 판단은 `Release Operator`가 수행한다는 정책.
- M6가 `Release Automation`이며 Quality Automation과 분리된다는 정책.
- App Lock이 `Deferred / Out of current scope`라는 결정.
- 아직 설치되지 않은 TanStack Query, MMKV, Reanimated, MSW와 실제로 미구현인 outbox/E2E를 설치·완료된 것으로 바꾸지 않는다.
- 과거 목표 구조나 삭제 이력을 명시적으로 역사 기록이라고 표시한 문장은 현재 path로 오인되지 않는 한 보존한다.

# Acceptance Criteria

- 활성 문서가 존재하지 않는 파일·directory를 현재 사용 경로, 현재 임시 기록 자리 또는 현재 구현 경로처럼 참조하지 않는다.
- 현재 dependency와 문서가 `package.json`/`package-lock.json`에 맞으며 제거된 `@react-native-community/datetimepicker`를 설치된 dependency로 적지 않는다.
- 현재 test 결과가 76 suites / 1,137 tests로 일치한다.
- 현재 CI 절차와 문서가 일치하며 GitHub Actions에 없는 EAS/build/release/Codex 단계를 CI 단계처럼 적지 않는다.
- EAS가 현재 사용 중이라고 단정하지 않으며, 현재 local native release 절차와 M6의 향후 EAS Build/Submit 검토를 구분한다. EAS Update/OTA는 현재 범위에 넣지 않는다.
- 이미 구현·삭제·대체된 작업을 현재 진행 중이라고 표시하지 않는다.
- Claude/Codex 자동화는 현재 로컬의 임시/legacy Stop review automation으로만 짧게 설명하며 장기 표준이나 remote CI로 표현하지 않는다.
- release 문서는 iOS local prebuild/Xcode Archive/App Store Connect 경로와 Android local prebuild/Gradle/AAB/Play Console 경로, repository 외부 credential, `Release Operator`의 최종 판단을 반영한다.
- M6는 `Release Automation`으로 정의되고 Manual Store Release, Automated Build/Submit, Quality Automation이 서로 구분된다.
- App Lock은 현재 milestone의 활성 TODO가 아니라 `Deferred / Out of current scope`로 표시된다.
- version 문서는 `app.config.ts`를 앱 release version 정본으로 두고 package metadata와 플랫폼 build 번호를 구분한다. 현재 설정 불일치는 변경하지 않고 별도 작업으로 남긴다.
- `docs/PRODUCT.md`의 route 수 31과 실제 page file 수가 일치하고, `08` 시간 선택 및 삭제된 route의 설명이 실제 코드와 맞는다.
- historical/archive 문서를 수정하지 않는다.
- `docs/spec/**`와 `docs/archive/**`를 수정하지 않는다.
- 코드 및 설정 파일을 수정하지 않는다.
- 허용된 문서 외에는 수정하지 않는다.
- `package.json`, `package-lock.json`, `app.config.ts`, `app/**`, `src/**`, `plugins/**`, `ios/**`, `android/**`에 변경이 없다.
- 역사적 맥락과 결정 근거는 보존하되 현재 상태와 시각적으로 구분한다.

# Resolved Decisions

## 1. EAS의 현재/향후 지위

- 기존 질문: EAS Build/Update/Submit을 앞으로 도입하기로 확정한 것인지, 과거 계획만 남은 것인지 repository만으로 판단할 수 없다.
- 팀 결정: EAS는 현재 배포 방식이 아니다. EAS Build/Submit은 M6에서 별도 검토·전환하며 EAS Update/OTA는 현재 범위에 포함하지 않는다.
- 문서 최신화 시 적용할 기준: 현재는 local native build/signing/store submission으로, 향후 목표는 EAS Build/Submit 자동화 검토로 구분한다. EAS가 이미 사용 중이라고 쓰지 않는다.
- 영향을 받는 후속 변경 항목: Required Changes 6, Acceptance Criteria의 EAS/release/M6 항목. `BATCH-01.md`에는 추가하지 않고 향후 Batch에서 처리한다.

## 2. iOS/Android release 운영 방식

- 기존 질문: 실제 iOS/Android release를 누가 어떤 명령과 checklist로 수행하는지, signing credential과 build environment values를 어느 외부 system이 관리하는지 repository만으로 판단할 수 없다.
- 팀 결정: iOS는 Expo native prebuild, Xcode signing/Archive, TestFlight/App Store Connect upload를 사용한다. Android는 Expo native prebuild, Gradle release build, repository 외부 signing credential, AAB, Play Console upload를 사용한다. 최종 공개·심사·testing/release는 `Release Operator`가 수행한다.
- 문서 최신화 시 적용할 기준: 특정 개인을 owner로 적지 않는다. secret/signing 실제 값은 repository에 저장하지 않고 환경 변수 이름, credential 참조 설정, setup 방법, 필요한 credential 종류만 문서화한다.
- 영향을 받는 후속 변경 항목: Required Changes 6, Must Preserve의 release/credential 항목, Acceptance Criteria의 release 항목. 향후 release Batch가 필요하다.

## 3. Production API URL 관리

- 기존 질문: 현재 production API의 실제 URL과 배포 상태는 repository에 값이 없으므로 확인할 수 없다. 확인 가능한 것은 production build가 HTTPS URL을 요구한다는 정책뿐이다.
- 팀 결정: production API URL 문자열은 프로젝트 문서의 정본으로 관리하지 않는다. 정본은 `EXPO_PUBLIC_API_BASE_URL`이며 production에서는 HTTPS를 강제한다.
- 문서 최신화 시 적용할 기준: 실제 URL은 실행 환경에서 주입하고 development에서는 개발용 API 설정을 사용할 수 있다고만 설명한다. repository에서 검증되지 않는 실제 주소나 배포 상태는 단정하지 않는다.
- 영향을 받는 후속 변경 항목: Required Changes 5. 향후 HTTPS/current-environment 문서 Batch에서 처리한다.

## 4. Version 정책

- 기존 질문: `package.json` version `0.1.0`과 Expo app version `0.1.1`을 의도적으로 분리 관리하는지, `app.config.ts`의 `0.1.0` 주석만 별도 설정 작업에서 고쳐야 하는지 repository만으로 판단할 수 없다.
- 팀 결정: 실제 앱 release version 정본은 `app.config.ts`다. `package.json version`은 Node metadata이며, 다음 release부터 `package.json.version`과 `app.config.ts version`을 같게 유지한다. 현재 불일치는 이번 문서 작업에서 설정을 수정하지 않는다.
- 문서 최신화 시 적용할 기준: 앱 version, iOS build number, Android version code, Node package metadata를 구분한다. 현재 설정 불일치는 별도 version 정리 작업으로 넘긴다.
- 영향을 받는 후속 변경 항목: Required Changes 10, Acceptance Criteria의 version 항목. 별도 version 정리 Work Item/Batch가 필요하다.

## 5. M6 Milestone

- 기존 질문: M6라는 milestone 이름을 계속 유지할지, 이미 발생한 store submission과 아직 없는 Maestro E2E/invariants/internal distribution을 별도 milestone로 재구성할지는 제품/팀 결정이 필요하다.
- 팀 결정: M6를 유지하고 의미를 `Release Automation`으로 바꾼다. Manual Store Release는 이미 가능하고 Automated Build/Submit은 미완료다. EAS 도입 검토와 TestFlight/Play 자동 전달이 M6 범위이며 Maestro E2E/invariant 검증은 별도 Quality Automation 영역이다.
- 문서 최신화 시 적용할 기준: 수동 release 가능과 자동화 완료를 분리하고 E2E/invariants를 M6 완료 조건에 섞지 않는다.
- 영향을 받는 후속 변경 항목: Required Changes 4와 6, Must Preserve 및 Acceptance Criteria의 M6 항목. 향후 architecture/release Batch가 필요하다.

## 6. App Lock 범위

- 기존 질문: 앱 잠금은 현재 package와 toggle이 모두 없다. 이를 남은 확정 범위로 볼지, toggle이 돌아올 때만 다시 여는 조건부 설계 기록으로 볼지는 repository만으로 결정할 수 없다.
- 팀 결정: App Lock은 현재 개발 범위에서 제외하며 `Deferred / Out of current scope`로 취급한다. 활성 TODO나 현재 milestone으로 두지 않는다.
- 문서 최신화 시 적용할 기준: 과거 아이디어·설계는 historical context로 남길 수 있으나 향후 새로운 Decision 없이는 작업 범위에 다시 포함하지 않는다.
- 영향을 받는 후속 변경 항목: Required Changes 4, Must Preserve와 Acceptance Criteria의 App Lock 항목. 향후 architecture/milestone Batch가 필요하다.

## 7. Claude/Codex Stop Hook의 지위

- 기존 질문: `.claude/hooks/README.md`는 현재 hook implementation과 대체로 일치하지만 이번 수정 허용 목록에 없다. 후속 문서 최신화에서 이 파일까지 별도 검토 대상으로 넓힐지는 별도 승인이 필요하다.
- 팀 결정: 현재 Claude Stop → typecheck/lint/test → Codex review 구조는 향후 AI Development System으로 교체할 임시/legacy 자동화다. 이번 문서 최신화에서는 현재 존재와 교체 예정만 최소한으로 기록하며 hook README, prompt, schema, config를 대규모 최신화하지 않는다.
- 문서 최신화 시 적용할 기준: 현재 구조를 장기 표준으로 새롭게 상세 문서화하지 않는다. Codex Manager, Claude Executor, Work Item, Verification, Git/PR/Merge Gate 및 기존 hook 제거/비활성화는 별도 Work Item에서 정의한다.
- 영향을 받는 후속 변경 항목: Required Changes 9, Must Preserve와 Acceptance Criteria의 Claude/Codex 항목. `BATCH-01.md`에는 추가하지 않고 별도 AI Development System Work Item/후속 Batch에서 처리한다.

# Open Questions

- 없음.
