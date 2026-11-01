# Expo Web 기반 Design Lab 전환 계획

> 조사 기준: 2026-10-14 작업 트리. 이 문서는 구현 제안이며 승인된 디자인 변경이나 구현 완료 기록이 아니다. 이번 단계에서 앱·Lab 소스와 설정은 변경하지 않는다.
>
> **2026-11-02 — Vite Lab(`design-lab/`)을 지웠다.** 캡처 38장과 화면 목록은 `expo-lab/` 이 넘겨받았고, CSS 정적 재현 화면과 `v0.2` 토큰 반입본은 옮기지 않고 버렸다(삭제 직전 커밋 `efa653e` 에 남아 있다). 아래 본문의 `design-lab/` 서술은 작성 당시 기록이다.

## 1. 현재 구조와 기준선

- 운영 앱은 루트 `package.json`의 Expo SDK 57, React Native 0.86, React 19.2.3, Expo Router로 구동한다. `app/`은 파일 기반 라우트, `src/components/ds/`와 `src/design/ds/`는 RN 컴포넌트·토큰, `src/features/`는 도메인·API·상태, `src/lib/`는 OS 및 앱 부트스트랩 경계다. `app.config.ts`가 네이티브 플러그인과 출시 환경 검사를 소유한다. `ios/`, `android/`는 prebuild 생성물이다.
- 현재 Lab은 별도 React DOM + Vite 앱(`design-lab/`)이다. 38개 라우트의 iPhone 13 mini 시뮬레이터 캡처를 한 페이지/개별 페이지에서 보여 주며, 기기 선택은 이미지 크기를 바꾼다. 이 이미지는 회귀 비교용 자산이지 공유 가능한 RN 화면 구현은 아니다. `design-lab/src/design-system/v0.2/`의 반입본과 `public/app-captures/`도 보존 대상이다.
- 루트에는 `react-dom`, `react-native-web`, `@expo/metro-runtime`이 직접 의존성으로 설치돼 있지 않다(`npm ls --depth=0` 확인). `app/`·`src/`에는 `.web.tsx` 등의 플랫폼별 파일도 없다. 루트 `tsconfig.json`은 `**/*.ts(x)`를 포함하므로 Lab 소스까지 검사한다.
- 홈 `app/(tabs)/home.tsx`는 RN 화면이지만 렌더링과 Zustand 조회, 일정 로드/변경, 회고 진입, Expo Router 이동, Amplitude 계측이 한 파일에 있다. `TabScreen`도 직접 `router.replace`를 부른다. `src/features/home/ui/{HomeCapybara,GrassButton,ScheduleList,WeekEmotionStrip}.tsx`와 DS 컴포넌트는 공유 후보지만 웹에서의 배치·제스처·폰트를 아직 검증하지 않았다.
- 루트 `AppProviders`는 폰트 외에도 알림 예약, 캘린더 전경 동기화, 날짜 전환, 분석 관찰을 시작한다. `(tabs)` 레이아웃은 인증 가드와 일기 조회를 시작한다. Lab이 이 루트 라우트/Provider를 그대로 재사용하면 Mock 전용이라는 경계가 무너진다.
- 2026-10-14 읽기 전용 `npm run typecheck` 결과는 실패다. Vite Lab의 `App.tsx`/`CurrentAppPreview.tsx`에서 `noUncheckedIndexedAccess` 관련 오류가 나고, 로컬 설치 트리에는 `expo-store-review`가 없어 모듈을 찾지 못한다. 이 실패를 새 Expo Web 작업의 회귀로 잘못 분류하지 않도록, 구현 전 `npm ci` 기준으로 재확인하고 기존 오류를 별도 정리한다. 이번 단계에서는 수정하지 않는다.
- 문서별 화면 수는 작성 시점이 달라 일치하지 않는다(`docs/redesign/SCREEN_INVENTORY.md` 36, 현재 Lab 목록 38, 오래된 README/설계 문서 31 등). 전환 범위는 **현행 라우트와 코드**로 다시 확정한다. 제품 규칙은 `docs/DESIGN.md` 우선, 그곳에 없는 문안은 `docs/spec/`을 참조하며 `docs/spec/**`와 `docs/api/openapi.json`은 직접 수정하지 않는다.

## 2. 권장 아키텍처와 공통 UI

가장 안전한 시작점은 **운영 Expo Router와 분리된 로컬 전용 Expo Web 호스트**를 같은 저장소에 두는 것이다. 예를 들어 `design-lab/expo-web/`에 전용 진입점·설정·Mock·A/B/C 선택기를 두고, RN UI는 루트 `src/`에서 import한다. npm workspace/Metro의 실제 경로 해석은 홈 스파이크에서 검증한다. 운영 `app/`에는 Lab 라우트를 추가하지 않는다. Lab은 앱의 인증/알림/캘린더 Provider를 import하지 않고, 브라우저에서 API 요청·분석 이벤트를 보내지 않는다. 별도 호스트가 어렵다고 확인될 때만 웹 전용 라우트를 재검토한다. 그 경우에도 `__DEV__` 분기만으로 운영 노출 방지를 증명하지 않는다.

```text
운영 app/(tabs)/home.tsx ── API/Zustand/라우팅/계측 어댑터 ─┐
                                                       ├─ 공통 HomeView + DS + assets
로컬 Expo Web Lab ─────── Mock/시안 선택/브라우저 액션 ────┘
기존 Vite Lab ──────────── 현행 캡처·v0.2 자산 회귀 기준 (유지)
```

- `HomeView`는 날짜·알림 상태·주간 감정·일정·로딩/빈 상태를 **타입이 있는 ViewModel**로 받고, `openNotifications`, `startRetro`, `addSchedule`, `toggleSchedule`, `reorderSchedule` 등의 콜백만 받는다. 시간·도메인 계산은 기존 순수 selector를 사용한다. 네트워크, 전역 store, `router`, analytics는 View에 넣지 않는다.
- 홈의 메뉴·확인 모달·드래그 상태처럼 화면 안에서 끝나는 표시 상태는 공유 View에 둘 수 있다. 실제 저장/이동은 콜백으로만 한다. `TabScreen`의 라우터 의존은 프레임과 이동 어댑터로 분리하거나 Lab 전용 프레임으로 감싸되, 홈 콘텐츠 컴포넌트를 중복 작성하지 않는다.
- 기존 DS/홈 UI는 우선 **직접 import한 하위 컴포넌트**부터 웹에서 검증한다. `src/components/ds/index.ts`의 광범위한 재수출은 `SocialButton`의 Apple SDK, `ChatDock`의 음성 입력 등 불필요한 모듈을 웹 의존 그래프에 끌 수 있으므로 스파이크에서는 leaf import를 사용한다.
- A/B/C는 동일한 `HomeViewModel`/액션 계약을 구현하는 RN 시안으로 Lab에서만 등록한다. 채택 전에는 운영 앱 import 경로와 분리한다. 채택 시 선택한 **RN 컴포넌트 파일을 공유 UI 위치로 승격**하고 운영 컨테이너가 그 파일을 import하게 한다. Lab도 승격된 같은 파일을 가리키게 하여 복제본 둘을 남기지 않는다. 시안 선택이 원격 플래그나 운영 설정에 섞이지 않게 한다.
- Mock은 Lab 전용 고정 fixture와 Lab 상태로 구성한다. 기존 `src/testing/fixtures.ts`는 테스트 전용이며 앱 코드에서 import를 금지하는 린트 규칙이 있으므로 Lab 데이터의 운영용 경로로 바꾸지 않는다. 개인정보나 실제 API 응답 덤프를 Lab에 넣지 않는다.

## 3. 변경이 필요한 파일(구현 단계의 예상 범위)

| 위치                                                                       | 예상 변경                                                                                     | 주의                                                                                           |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 루트 `package.json`, `package-lock.json`                                   | SDK 호환 `react-dom`, `react-native-web`, `@expo/metro-runtime` 및 Lab 실행 명령/워크스페이스 | `npx expo install`로 호환 버전을 정하고 `.npmrc`의 peer 충돌을 재검토                          |
| `design-lab/expo-web/` (신규)                                              | Expo Web 전용 엔트리, Mock, 기기 프레임, A/B/C 카탈로그, 웹 테스트                            | 운영 앱의 `app/` 라우트나 Provider를 사용하지 않음                                             |
| `app/(tabs)/home.tsx`                                                      | 기존 기능을 유지하는 데이터·이동·계측 어댑터로 축소                                           | 일정 API, 회고 분기, 토스트/모달 동작 회귀 테스트                                              |
| `src/features/home/ui/`                                                    | 공유 `HomeView`와 시안 계약, 필요한 순수 프레임 분리                                          | 현재 화면을 먼저 1:1로 옮긴 뒤 시안 추가                                                       |
| `src/components/ds/TabScreen.tsx` 또는 새 프레임                           | `router` 직접 호출과 표시 분리                                                                | 다른 4개 탭에 영향 없게 작은 단위로 변경                                                       |
| `src/components/ds/`·`src/design/ds/`                                      | 웹 레이아웃 차이가 실제 확인된 부분만 플랫폼별 파일/토큰 보완                                 | 토큰 값은 `docs/DESIGN.md`와 대조, raw hex 금지                                                |
| `tsconfig.json`, Lab 전용 TS 설정                                          | 루트 검사와 Vite/Expo Lab 검사 경계 정리                                                      | 기존 타입 오류의 숨김이 아닌 각 프로젝트별 검사 보장                                           |
| `app.config.ts`, `metro.config.js`                                         | **필요할 때만** 웹 설정/워크스페이스 해석 보완                                                | 릴리스 환경 검사·네이티브 플러그인 순서 보존, 임의 Metro 설정 지양                             |
| `docs/CONTRIBUTING.md`, `design-lab/README.md`, `design-lab/CLAUDE.md`, CI | Lab 경계·실행·품질 게이트·시안 채택 절차 문서화                                               | 현재 `design-lab/CLAUDE.md`의 “운영 코드 수정 금지”는 채택 단계의 명시적 예외/절차로 개정 필요 |

`ios/`, `android/`, `docs/spec/**`, `docs/api/openapi.json`, 기존 `assets/`, Vite의 캡처·v0.2 반입본은 이관을 이유로 직접 수정·삭제하지 않는다.

## 4. 네이티브 SDK 및 웹 호환성 위험

| 위험                               | 저장소의 실제 경로                                                                                                                           | 완화/검증                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 인증·보안 저장이 웹에서 로드됨     | `src/features/auth/model/auth.ts` → `expo-secure-store`; 카카오/구글/애플 SDK                                                                | Lab은 auth store/라우트를 import하지 않음. 필요 기능은 `.native/.web` 어댑터로 분리                                    |
| OS 서비스가 Lab 시작과 함께 실행됨 | `src/lib/providers.tsx` → 알림·캘린더·날짜 전환·AnalyticsObserver                                                                            | 전용 Lab 루트 사용. 네트워크/권한/계측 호출 0건 확인                                                                   |
| 네이티브 연동의 웹 구현 부재·차이  | `expo-calendar`, `expo-notifications`, `expo-location`, `expo-speech-recognition`, `expo-store-review`, `expo-web-browser`, Amplitude RN     | Lab은 표시 컴포넌트만 가져옴. 필요 시 `.web.ts` no-op/Mock, `.native.ts` 실제 SDK; 무조건적인 SDK import 금지          |
| 시각적 동일성 과대평가             | `src/design/ds/typography.ts`의 iOS 보정, `metrics.ts`의 Android 여백, `GrassButton` 이미지 늘림/애니메이션, `ScheduleList` responder 드래그 | 375/390/430 웹 실측 + iOS/Android 스크린샷 나란히 비교. 폰트, safe area, 그림자, 키보드, 긴 텍스트, 드래그를 별도 검증 |
| 웹 번들 의존 그래프 확장           | DS barrel 재수출, `TabScreen`의 라우터, 앱 루트 Provider                                                                                     | 홈 스파이크에서 직접 import와 번들/네트워크 검사, 플랫폼별 파일로 경계 고정                                            |
| 운영 환경 노출                     | Expo Router의 `app/`은 라우트 등록 범위                                                                                                      | Lab 호스트를 별도 엔트리/프로젝트로 유지. 운영 라우트 목록·릴리스 JS 번들에 Lab 카탈로그/Mock 없음 확인                |
| 패키지/도구 기준선 불안정          | 웹 의존성 미설치, `.npmrc`의 `legacy-peer-deps=true`, 현재 타입 검사 실패                                                                    | `npm ci`의 깨끗한 트리부터 확인. 루트·Lab 타입/빌드 검사를 분리하고 기준선 실패를 선행 해결                            |

`react-native-safe-area-context`, `react-native-svg`, `expo-image`, `expo-font`는 기존 UI의 핵심 의존성이지만 이 저장소의 웹 실행 결과는 아직 없다. 지원 여부를 추정해 전체 화면을 옮기지 말고 홈 스파이크에서 렌더와 자산 로딩을 실제 확인한다.

## 5. 단계별 구현·채택 계획

1. **기준선 고정**: 깨끗한 설치에서 타입/린트/테스트 상태 기록. 현재 Vite Lab 화면·38개 캡처·v0.2 자산을 보존하고 홈 스크린샷 기준을 정한다. 웹 패키지의 SDK 호환 버전만 결정한다.
2. **Expo Web 홈 스파이크**: 운영 라우트와 분리된 Lab 호스트를 최소 구성한다. 공통 토큰/폰트/이미지와 `HomeCapybara`, `GrassButton`, `WeekEmotionStrip`, `ScheduleList`가 브라우저에 뜨는지 확인한다. 원래 앱의 인증/OS 모듈/실제 API가 로드되지 않는지 확인한다. 실패 시 플랫폼별 어댑터 범위를 먼저 확정한다.
3. **공유 홈 추출**: 현재 홈 UI를 `HomeView`로 옮기고, 운영 라우트는 기존 store·API·analytics·router 콜백을 전달한다. Lab은 동일 컴포넌트에 Mock을 전달한다. **현재 홈과 동일한 UI/행동**을 확인하기 전 A/B/C 작업을 시작하지 않는다.
4. **독립 시안 A/B/C**: 같은 props 계약과 상태 매트릭스(기본·빈·다수 일정·완료·긴 글·오류/로딩)를 사용한다. 기기 폭, 키보드, 접근성, 모바일 차이를 각각 기록한다. 미채택 시안은 운영 import graph에 넣지 않는다.
5. **선택·승격**: 사용자가 시안을 채택하면 선택한 RN View를 공유 위치로 승격하고 운영 홈 어댑터에 연결한다. Lab도 승격본을 import한다. `docs/DESIGN.md`에 확정된 시각 규칙을 반영하고 제품 규칙과 다르면 `docs/PRODUCT.md`에 차이를 기록한다.
6. **확대 여부 결정**: 홈의 웹/네이티브 결과와 유지 비용을 평가한 뒤 다른 화면으로 확장한다. Vite Lab은 대조 가치가 없어지고 자산/기록 이전이 검증될 때까지 유지한다.

각 단계는 독립 PR과 명시적 합격 기준을 둔다. 홈 스파이크가 실패해도 기존 모바일 앱과 Vite Lab은 그대로 사용할 수 있어야 한다.

## 6. Vite Lab 보존·이전

- 전환 중 기존 `design-lab/`의 Vite 실행/빌드 명령과 캡처 목록은 유지한다. 새 Expo Web 호스트는 별도 경로/명령으로 추가하고 같은 포트를 강제하지 않는다.
- 기존 38개 캡처는 “현재 앱 기준 화면” 회귀 자료로 사용한다. RN 시안이 캡처를 화면 구현으로 쓰는 것은 금지한다. 예시 데이터 5개 화면의 배지는 비교 시에도 유지한다.
- `design-lab/src/design-system/v0.2/`, `design-lab/src/assets/`, `assets/`의 출처·해시·서체 라이선스 기록을 유지한다. 그림/서체를 새 호스트에 중복 복사하기보다 원본 경로에서 참조한다.
- Vite Lab 폐기는 별도 결정이다. 모든 화면/상태 이전, 웹·네이티브 비교, 문서 링크/자산 확인, 사용자 승인 전에는 삭제하지 않는다.

## 7. 예상 테스트와 출구 조건

- **웹**: `expo start --web`로 Lab 홈 표시, 새로고침/시안 전환/뒤로가기, 375·390·430 및 짧은 세로, 폰트·그림·safe area·스크롤·드래그·키보드, 개발자 콘솔 오류 0.
- **데이터 격리**: Lab Mock으로 기본/빈/다수/완료/오류 상태 재현; 실제 API·소셜 로그인·권한 요청·Amplitude 네트워크 호출 0.
- **코드 공유**: Lab과 앱이 동일 `HomeView` 파일을 import함을 정적 검사 및 렌더 테스트로 확인. 앱 쪽은 기존 API/store/라우트 콜백의 동작을 유지.
- **품질 게이트**: `docs/CONTRIBUTING.md`의 `npm ci`, typecheck, lint(경고 0), format:check, Jest, 시크릿 추적 검사. Lab 자체 타입/웹 빌드/인터랙션 검사도 CI에 추가하되 기준선 오류와 구분.
- **기기**: iOS/Android **디버그 빌드와 핵심 홈 동작**(일정 추가·수정·완료·삭제/숨기기·순서 변경·회고 이동)을 시뮬레이터에서 확인하고, 릴리스 빌드까지 확인한다. `scripts/screen-sweep.sh`는 자동 합격 판정이 아니므로 스크린샷을 사람이 대조한다.
- **운영 격리**: 출시 빌드의 라우트 목록에 Lab 경로가 없고 JS 번들에 Mock/A/B/C 선택기가 없으며, Lab 전용 환경변수·자산이 운영 앱에 포함되지 않음을 검사한다.
- **최종 보고**: 채택 시안, 공유 파일, 변경된 사용자 행동, 웹↔iOS↔Android 차이, 테스트/빌드 결과, 남은 위험을 문서로 남긴다.

## 공식 기술 근거

- [Expo 웹 개발](https://docs.expo.dev/workflow/web/): Expo Web/RNW 설치 및 실행.
- [Expo Router 플랫폼별 파일](https://docs.expo.dev/router/advanced/platform-specific-modules/): `.web.tsx` 및 모듈 분리 조건.
- [Expo 모노레포](https://docs.expo.dev/guides/monorepos/): workspace와 Metro 설정 원칙.
- [Expo 환경변수](https://docs.expo.dev/guides/environment-variables/): `EXPO_PUBLIC_` 값은 번들에 포함됨.
