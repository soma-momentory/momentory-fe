# Momentory Expo Design Lab

기존 Vite Lab의 화면 탐색과 Claude Design 홈 v2의 React Native 시안 실험을 하나의 개발 전용 Expo 진입점으로 묶었다. 홈 비교에서는 기존 앱의 실제 React Native UI 부품을 Lab Mock 데이터로 렌더링한다. 운영 Expo Router·Provider·API에는 연결하지 않는다. 기존 `design-lab/`과 `design-imports/claude-home/`은 검증 및 별도 삭제 승인 전까지 그대로 유지한다.

## 실행

```bash
npm ci
npm run lab:web
```

## Design Studio 2.0

```bash
cd expo-lab
npx expo start --web --port 8085
```

정확한 주소: `http://localhost:8085/#studio/home-main` (쉼터 `rest-hub`, 보관함 `archive`, 마이 `my-main`, 리포트 `report`). 왼쪽에서 화면·Mock 상태·편집 컴포넌트를, 가운데에서 375/390/402/430pt·글씨 배율·확대를, 오른쪽에서 등록된 속성을 선택한다. A는 운영 기본 설정, B는 현재 Draft다. 두 패널은 같은 공유 React Native View와 Mock 조건으로 시작하며 조작 상태는 각각 독립적이다.

Draft는 브라우저 `localStorage`에 자동 저장된다. 오른쪽에서 시안을 복제·전환하고 Undo/Redo·초기화·JSON 내보내기/가져오기를 실행한다. 운영 앱은 `src/design/studioApproved.json`만 사용하며 브라우저 편집은 Git 파일을 바꾸지 않는다. 내보낸 파일로 운영 변경을 준비할 때는 저장소 루트에서 다음 명령을 실행한다.

```bash
node expo-lab/scripts/apply-design.mjs path/to/export.json
node expo-lab/scripts/apply-design.mjs path/to/export.json --write
git diff -- src/design/studioApproved.json
npm run typecheck && npm run test:visual
```

첫 명령은 변경 Diff만 출력한다. `--write`를 명시한 두 번째 명령만 승인된 기본 설정 파일을 갱신한다. Git Diff와 테스트를 검토해 별도 PR로 적용한다. [검증 기록](STUDIO_VALIDATION.md)에 편집 범위와 측정 결과가 있다.

터미널에 표시된 웹 주소를 연다. 첫 페이지는 홈 UI 비교다. 왼쪽의 기존(운영) 홈 RN UI와 오른쪽 홈 시안 변형을 나란히 조작한다. 오른쪽 변형은 둘이다 — **시안 원본 · Claude Design v2**(`claude-v2`)와 **운영판 v2 · 공유 뷰**(`app-v2`, 2026-10-15 · 홈 v2 계획 P2). **기존 앱 · 전체 화면**에서 38개 기존 앱 캡처를 그룹별로 보고, 홈의 **원본 캡처 참고** 선택기로 이전 캡처를 다시 볼 수 있다. 다른 37개 화면은 단계적으로 이전하기 전까지 캡처만 표시한다. 375·390·402·430px 화면 크기를 선택할 수 있다. 캡처 38개는 iPhone 13 mini(375×812pt)에서 찍었으므로 다른 크기에서는 이미지를 늘려 표시할 뿐 해당 기기에서 다시 캡처한 것은 아니다.

화면·시안·상태·기기 선택은 URL 해시에 저장된다. 예: `#compare/home-main/claude-v2?device=402&scenario=5e`. 새로고침과 브라우저 뒤로/앞으로에서 다시 열 수 있다. 이전 Expo Lab의 `?scenario=5e&device=402`, Vite Lab의 `#preview/home-main` 형식도 읽는다.

## 통합 범위와 확장 위치

| 영역           | 파일                                                                             | 역할                                                                 |
| -------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 기존 화면 목록 | `src/catalog/screens.ts`                                                         | Vite Lab에서 이전한 7개 그룹·38개 화면명·경로·예시 데이터 표시       |
| 기존 캡처      | `assets/current-app/`, `src/catalog/captures.ts`                                 | Vite Lab PNG 38개 바이트 동일 복사본과 상세 비교용 원본 참조         |
| 갤러리 축소본  | `assets/current-app-thumbnails/`, `src/catalog/thumbnails.ts`                    | 540px PNG 38개. 목록에서만 사용하고 상세는 원본을 사용               |
| 기기 프레임    | `src/catalog/PhonePreview.tsx`                                                   | 실제 앱 캡처와 RN 시안의 공통 크기 선택·미리보기                     |
| 시안 등록      | `src/catalog/variants.tsx`                                                       | 화면 ID별 시안·상태 목록. 쉼터·보관함·회고 시안을 여기에 추가        |
| 홈 UI          | `src/claude-home/HomeView.tsx`, `variants.ts`                                    | 시안 원본 5a–5f RN UI(`design`)와 운영판 v2(`app`) 두 갈래 변형 등록 |
| 운영판 v2      | `../src/features/home/ui/v2/HomeV2View.tsx`, `src/claude-home/HomeV2Preview.tsx` | 앱이 소유한 홈 v2 공유 뷰 + Lab Mock 어댑터                          |
| Lab Mock       | `src/claude-home/MockPreview.tsx`, `scenarios.ts`                                | 일정 체크·추가·날씨 변경 등 로컬 상태와 가짜 액션만 제공             |
| 기존 홈 RN UI  | `../src/features/home/ui/HomeView.tsx`, `src/current-home/MockPreview.tsx`       | 운영 앱과 동일한 화면 조립 코드, Lab 전용 Mock 데이터·행동           |
| 도구 UI        | `src/App.tsx`                                                                    | 가상화된 목록, 그룹 바로가기, 단일 화면 선택, 시안 비교, URL 상태    |

시안이 없는 화면은 기존 캡처를 표시하고 오른쪽에 “시안 등록 대기 중”을 명시한다. 홈 이외의 기존 화면은 아직 RN UI로 이전하지 않는다. 왼쪽의 기존 홈은 보존된 `src/features/home/ui/HomeView.tsx`를 Lab Mock으로 그린다. 운영 라우트는 P3에서 오른쪽 **운영판 v2**와 같은 `src/features/home/ui/v2/HomeV2View.tsx`로 전환했다. 운영 라우트만 Store·API·Router·Analytics를 연결하고 Lab은 Mock만 주입한다. Claude 홈 UI는 「시안 원본」 변형으로 남고 운영 화면에서는 import하지 않는다. 앱은 Lab을 import하지 않는다(`eslint.config.js`가 막는다). 자세한 의존성·제약·검증은 [홈 UI 이전 기록](HOME_UI_VALIDATION.md)에 있다.

홈 시안은 `src/claude-home/variants.ts` 에 추가하면 화면별 시안 선택기에 나타난다 — 시안 번역이면 `kind: "design"`(`HomeVariantProps` 구현), 앱 공유 뷰를 Mock 으로 그리면 `kind: "app"`(`{ scenarioId, onMessage, scale }` 어댑터). 다른 화면은 해당 화면의 RN UI와 Lab Mock 어댑터를 분리해 만들고 `src/catalog/variants.tsx`에 화면 ID로 등록한다. 시안 등록만으로 서비스 앱에 반영되지 않는다.

캡처 다섯 장(`schedule-edit`, `retro-talk`, `retro-draft`, `diary-detail`, `report`)은 실제 앱에 예시 데이터를 넣어 찍은 이미지이며 배지로 구분한다. 캡처는 정지 이미지로서 로그인·API·키보드·OS 권한 동작을 제공하지 않는다.

## 서체 — 앱과 같은 Gaegu 파일 (2026-10-15)

Lab 은 `@expo-google-fonts/gaegu` 를 더 이상 쓰지 않는다(결정 DN-4). `src/App.tsx` 가 앱의 `assets/fonts/Gaegu-Regular.ttf` ·
`Gaegu-Bold.ttf` 를 **앱과 같은 이름**(`"Gaegu-Regular"` · `"Gaegu-Bold"`)으로 등록하고, 시안 원본(`claude-home/tokens.ts`)도 그 이름을 쓴다.
파일은 그 의존성 0.4.1 의 400 · 700 파일을 이름만 바꾼 것이라(sha256 은 `assets/fonts/README.md`) 시안 원본의 굵기와 시각은 그대로다.

## 운영 홈 UI 시나리오 (P1)

`app-v2` 변형은 운영 라우트 `app/(tabs)/home.tsx`와 동일한 `HomeV2View`를 사용한다. 화면 크기 375·390·402·430pt, 일정 0·2·5·10개와 긴 제목, 날씨 11가지, 알림 6가지, 일반/큰 글씨를 선택할 수 있다. 예: `#compare/home-main/app-v2?device=375&scenario=5g&weather=thunder&inbox=long&type=large`. 선택한 상태는 URL 해시에 저장된다.

날씨는 운영 `toHomeWeatherView` 매핑을 통과하며 야간·미매핑·데이터 없음·로딩·오류는 운영 정책처럼 스티커를 표시하지 않는다. 알림은 운영 `InboxPopover`를 사용하고, 팝오버 안에서 읽음 처리해도 Lab의 메모리 상태만 바뀐다. 일정 추가·수정은 운영 `ScheduleEditBar`를 열어 Lab의 일정 배열만 바꾼다. 삭제 확인·체크·접기·펼치기도 같은 공유 UI에서 조작한다. 긴 일정 제목은 운영 정책상 한 줄로 줄이되 접근성 이름에는 전체 제목이 남는다.

Lab Web의 큰 글씨 선택은 공유 DS 글자와 홈 레이아웃에 1.3배 프리뷰 배율을 적용한다. 앱의 실제 OS 글꼴 크기 설정이나 네이티브 접근성을 대체하지 않는다. 현재 main의 운영 홈은 `src/design/ds/typography.ts`의 교보 손글씨 2025를 쓴다. Pretendard 4종은 로그인 화면만 쓰므로 홈 시나리오에서는 적용되지 않는다. Lab은 홈에 필요한 교보 손글씨와 Gaegu를 앱과 같은 자산 파일에서 등록한다. iOS·Android의 글꼴 렌더링·화면 터치·키보드·권한은 실제 시뮬레이터에서 최종 확인해야 한다.

## 홈 v2 비교 캡처 절차

[홈 UI 기술 검증](HOME_UI_VALIDATION.md) 「홈 v2 운영판 비교」 절을 따른다 — **시안 원본 · 운영판 v2 · 현행** 세 폰을 5a~5f 로 나란히 찍는다.

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

Vite Lab의 CSS 기반 정적 화면 재현 코드는 이전하지 않았다. 38개 화면 모두 실제 캡처가 있어 중복 UI가 되고, Expo Lab은 캡처 자체를 사용한다. 웹에서는 38개 비교 URL, 그룹 이동·브라우저 뒤로가기, 홈 5a–5f와 네 화면 크기를 확인했다. iOS 시뮬레이터(iPhone Air, iOS 26.5)에서는 Expo Go로 목록 첫 화면을 확인했고, 실행 중인 버튼 콜백으로 38개 화면 탐색을 확인했다. 실제 터치·스크롤과 Android 렌더는 아직 확인하지 않았다. iOS에서는 브라우저 해시 대신 내부 상태로 탐색한다. 홈 원본과의 시각 차이는 [시각 검증 기록](VISUAL_VALIDATION.md)에 있다.

목록은 `FlatList`로 필요한 행만 렌더링하고 540px 축소본을 쓴다. 상세 비교는 선택한 화면의 원본만 렌더링한다. 원본 38장은 압축 23.10MiB, 축소본은 8.45MiB다. 전후 측정과 한계는 [이미지 성능 검증 기록](PERFORMANCE_VALIDATION.md)에 있다. 저사양 모바일의 실제 터치 스크롤과 이미지 캐시 잔류는 추가 확인해야 한다.

Vite Lab은 아직 삭제 대상이 아니다. 38개 캡처 접근·탐색·비교와 홈 시안 검증이 충분히 끝나고 사용자가 제거를 승인한 뒤에만 삭제 여부를 결정한다.

## Vite Lab 정리 승인 기준

- Expo Lab에서 38개 화면의 그룹·제목·경로·예시 데이터 배지와 원본 캡처가 모두 일치하고, 각 화면의 비교 URL을 직접 열 수 있어야 한다. 캡처 복사본은 Vite 원본과 바이트 단위로 같아야 한다.
- 홈 5a–5f를 375·390·402·430px에서 확인하고, 화면·시안·상태·크기 선택과 브라우저 뒤로/앞으로를 검증해야 한다. iOS 비교 화면의 실제 터치 동작, Android 렌더링, 저사양 기기의 목록 스크롤 성능은 아직 미검증이다.
- 앱·두 Lab의 타입 검사, 린트, 포맷 검사, 기존 앱 테스트, Expo Web 실행을 통과해야 한다. Vite를 지우기 전에는 Vite 타입 검사와 빌드도 통과해야 한다. Expo 번들 내보내기는 네이티브 빌드 검증을 대체하지 않는다.
- Vite 전용 CSS 정적 재현 화면과 `src/design-system/v0.2/`의 디자인 토큰·출처 기록은 Expo Lab으로 이전하지 않았다. 38개 현행 화면은 실기 캡처로 대체되지만, 고유 자료의 보존 장소와 필요 여부를 별도로 결정해야 한다. Vite의 상시 사이드바도 Expo Lab에서는 상단 탐색·선택기로 바뀌었다.
- 위 차이와 플랫폼 검증을 검토한 뒤 사용자의 **별도 제거 승인**을 받아야 한다.

승인 후 정리할 참조는 루트 `package.json`의 `typecheck:lab`, `.github/workflows/ci.yml`의 Vite 설치·검사 단계, `eslint.config.js`의 Vite 전용 규칙·무시 경로, `tsconfig.json`의 제외 경로, `harness/project.json`의 문서·검증·의존성·보호 경로·허용 명령, `docs/CONTRIBUTING.md`, `docs/HARNESS_NAV.md`, `docs/EXPO_WEB_DESIGN_LAB_PLAN.md`, 이 README의 Vite 관련 안내다. 그때 `design-lab/`과 별도 잠금 파일의 삭제 범위를 확인하되, 하네스 실행 기록과 원본 디자인 자료는 보존한다.
