# Momentory Expo Design Lab

기존 Vite Lab의 실제 앱 화면 탐색과 Claude Design 홈 v2의 React Native 시안 실험을 하나의 개발 전용 Expo 진입점으로 묶었다. 운영 Expo Router·Provider·API에는 연결하지 않는다. 기존 `design-lab/`과 `design-imports/claude-home/`은 검증 및 별도 삭제 승인 전까지 그대로 유지한다.

## 실행

```bash
npm ci
npm run lab:web
```

터미널에 표시된 웹 주소를 연다. 첫 페이지는 38개 기존 앱 캡처를 그룹별로 펼친다. 카드를 선택하거나 **화면 선택 · 시안 비교**로 가면 기존 캡처를 크게 보고, 등록된 시안이 있으면 오른쪽에서 비교한다. 375·390·402·430px 화면 크기를 선택할 수 있다. 38개 캡처는 iPhone 13 mini(375×812pt)에서 찍었으므로 다른 크기에서는 이미지를 늘려 표시할 뿐 해당 기기에서 다시 캡처한 것은 아니다.

화면·시안·상태·기기 선택은 URL 해시에 저장된다. 예: `#compare/home-main/claude-v2?device=402&scenario=5e`. 새로고침과 브라우저 뒤로/앞으로에서 다시 열 수 있다. 이전 Expo Lab의 `?scenario=5e&device=402`, Vite Lab의 `#preview/home-main` 형식도 읽는다.

## 통합 범위와 확장 위치

| 영역           | 파일                                              | 역할                                                                  |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| 기존 화면 목록 | `src/catalog/screens.ts`                          | Vite Lab에서 이전한 7개 그룹·38개 화면명·경로·예시 데이터 표시        |
| 기존 캡처      | `assets/current-app/`, `src/catalog/captures.ts`  | Vite Lab PNG 38개 바이트 동일 복사본과 정적 RN 이미지 참조            |
| 기기 프레임    | `src/catalog/PhonePreview.tsx`                    | 실제 앱 캡처와 RN 시안의 공통 크기 선택·미리보기                      |
| 시안 등록      | `src/catalog/variants.tsx`                        | 화면 ID별 시안·상태 목록. 쉼터·보관함·회고 시안을 여기에 추가         |
| 홈 UI          | `src/claude-home/HomeView.tsx`, `variants.ts`     | 기존 5a–5f React Native UI와 동일 Props 계약. A/B/C 홈 시안 등록 자리 |
| Lab Mock       | `src/claude-home/MockPreview.tsx`, `scenarios.ts` | 일정 체크·추가·날씨 변경 등 로컬 상태와 가짜 액션만 제공              |
| 도구 UI        | `src/App.tsx`                                     | 전체 화면 목록, 그룹 바로가기, 단일 화면 선택, 시안 비교, URL 상태    |

시안이 없는 화면은 기존 캡처를 표시하고 오른쪽에 “시안 등록 대기 중”을 명시한다. 기존 화면을 임의의 RN UI로 재구현하지 않는다. 홈 UI는 표시 전용 `model`/`actions` Props를 유지하므로 추후 채택 시 Lab Mock 대신 실제 서비스 어댑터를 별도로 만들 수 있다. 현재 운영 화면에서는 import하지 않는다.

홈 A/B/C 시안은 동일한 `HomeVariantProps`를 구현해 `src/claude-home/variants.ts`에 추가하면 화면별 시안 선택기에 나타난다. 다른 화면은 해당 화면의 RN UI와 Lab Mock 어댑터를 분리해 만들고 `src/catalog/variants.tsx`에 화면 ID로 등록한다. 시안 등록만으로 서비스 앱에 반영되지 않는다.

캡처 다섯 장(`schedule-edit`, `retro-talk`, `retro-draft`, `diary-detail`, `report`)은 실제 앱에 예시 데이터를 넣어 찍은 이미지이며 배지로 구분한다. 캡처는 정지 이미지로서 로그인·API·키보드·OS 권한 동작을 제공하지 않는다.

## 검증과 남은 차이

```bash
npm run typecheck
npm run typecheck:lab
npm run typecheck:expo-lab
npm run lint
npm run format:check
npm test -- --ci
npm run build --prefix design-lab
cd expo-lab && npx expo export --platform all --output-dir /tmp/momentory-lab-export
```

Vite Lab의 CSS 기반 정적 화면 재현 코드는 이전하지 않았다. 38개 화면 모두 실제 캡처가 있어 중복 UI가 되고, Expo Lab은 캡처 자체를 사용한다. 웹에서는 38개 이미지 로딩, 그룹 이동·브라우저 뒤로가기, 홈 5a–5f와 네 화면 크기를 확인했다. iOS 시뮬레이터(iPhone Air, iOS 26.5)에서는 Expo Go로 전체 목록 첫 화면이 렌더링되는 것을 확인했고, 상태바 겹침은 Lab 안전 영역으로 보정했다. iOS의 비교 화면 상호작용과 Android 렌더는 아직 확인하지 않았다. iOS에서는 브라우저 해시 대신 내부 상태로 탐색한다. 홈 원본과의 시각 차이는 [시각 검증 기록](VISUAL_VALIDATION.md)에 있다.

캡처 38장은 압축 상태로 약 23MB다. 전체 목록은 한 페이지에 모두 렌더링하므로 저사양 모바일에서 이미지 메모리와 스크롤 성능을 추가 확인해야 한다.

Vite Lab은 아직 삭제 대상이 아니다. 38개 캡처 접근·탐색·비교와 홈 시안 검증이 충분히 끝나고 사용자가 제거를 승인한 뒤에만 삭제 여부를 결정한다.

## Vite Lab 정리 승인 기준

- Expo Lab에서 38개 화면의 그룹·제목·경로·예시 데이터 배지와 원본 캡처가 모두 일치하고, 각 화면의 비교 URL을 직접 열 수 있어야 한다. 캡처 복사본은 Vite 원본과 바이트 단위로 같아야 한다.
- 홈 5a–5f를 375·390·402·430px에서 확인하고, 화면·시안·상태·크기 선택과 브라우저 뒤로/앞으로를 검증해야 한다. iOS 비교 화면의 터치 동작, Android 렌더링, 저사양 기기의 38장 목록 성능은 아직 미검증이다.
- 앱·두 Lab의 타입 검사, 린트, 포맷 검사, 기존 앱 테스트, Expo Web 실행을 통과해야 한다. Vite를 지우기 전에는 Vite 타입 검사와 빌드도 통과해야 한다. Expo 번들 내보내기는 네이티브 빌드 검증을 대체하지 않는다.
- Vite 전용 CSS 정적 재현 화면과 `src/design-system/v0.2/`의 디자인 토큰·출처 기록은 Expo Lab으로 이전하지 않았다. 38개 현행 화면은 실기 캡처로 대체되지만, 고유 자료의 보존 장소와 필요 여부를 별도로 결정해야 한다. Vite의 상시 사이드바도 Expo Lab에서는 상단 탐색·선택기로 바뀌었다.
- 위 차이와 플랫폼 검증을 검토한 뒤 사용자의 **별도 제거 승인**을 받아야 한다.

승인 후 정리할 참조는 루트 `package.json`의 `typecheck:lab`, `.github/workflows/ci.yml`의 Vite 설치·검사 단계, `eslint.config.js`의 Vite 전용 규칙·무시 경로, `tsconfig.json`의 제외 경로, `harness/project.json`의 문서·검증·의존성·보호 경로·허용 명령, `docs/CONTRIBUTING.md`, `docs/HARNESS_NAV.md`, `docs/EXPO_WEB_DESIGN_LAB_PLAN.md`, 이 README의 Vite 관련 안내다. 그때 `design-lab/`과 별도 잠금 파일의 삭제 범위를 확인하되, 하네스 실행 기록과 원본 디자인 자료는 보존한다.
