# 홈 실제 UI 비교 — 기술 검증

## 공통 HomeView 전환 (2026-10-14)

운영 `app/(tabs)/home.tsx`와 Lab `src/current-home/MockPreview.tsx`는 이제 같은 `../src/features/home/ui/HomeView.tsx`의 화면 조립 코드를 사용한다. HomeView는 `HomeViewModel` 값과 `HomeViewActions` 콜백만 받고, UI 일시 상태(일정 펼침·드래그·메뉴·삭제 확인·토스트)만 관리한다. `renderFrame(body, overlay)`는 앱에서 기존 `TabScreen`을, Lab에서 `Screen`·`BottomNavigation` 가상 폰을 반환한다. `menuTopFromPageY`는 앱의 Safe Area 보정과 Lab 폰 위치 보정을 각각 담당한다. 순수 일정 표시 규칙은 `src/features/home/model/presentation.ts`로 분리했고 기존 `day.ts` export는 유지했다.

운영 어댑터는 기존 `useDay.load()` 마운트 시점, `useTodayContext()` 04:00 날짜 경계, 주간 감정 계산, CTA의 계측 후 라우팅, 일정 체크·수정·삭제·숨김·순서 변경, 탭의 `replace`를 유지한다. Lab은 서비스 어댑터를 import하지 않는다. Claude v2 5a~5f, 캡처, Vite Lab도 그대로다. 아래 “경계와 재사용”·“남은 차이와 위험”은 **공통화 이전 기술 검증 기록**이며 당시의 중복 구조 설명은 현재 상태가 아니다.

공통화 직후 자동 검증: 앱·Expo Lab·Vite Lab 타입 검사, 린트, 포맷 검사, 전체 Jest 103개 스위트/1328개 테스트 통과. Vite 빌드, 앱 및 Expo Lab의 웹·iOS·Android JS 번들 내보내기도 통과했다. Chrome에서 기존 홈과 Claude v2 5b를 375·390·402·430px로 렌더링해 날짜·CTA·카피바라·감정·일정·탭바 배치가 유지되는지 확인했다. 공통화 전후 390px 전체 화면을 육안 비교했을 때 기존 홈 폰 내부의 눈에 띄는 차이는 없었다. 다만 픽셀 단위 동일성은 측정하지 않았다. 브라우저 네트워크 기록에는 앱 API·분석 엔드포인트 호출이 없었다(Chrome 자체 Google 백그라운드 요청은 있었다).

iPhone 13 mini/iOS 26.5 시뮬레이터에서 Expo Go를 설치하고 Lab iOS 번들을 로드했다. 초기 Expo Go 개발 메뉴가 화면을 덮고 이 환경에 시뮬레이터 터치 주입 도구가 없어, 홈의 실제 터치·스크롤·메뉴 위치까지 검증하지 못했다. 당시 운영 iOS Debug 빌드는 삭제된 `Roboto-Medium.ttf`의 낡은 Xcode 참조 때문에 실패했다. 아래 복구 결과가 이 이전 상태를 대체한다. Android SDK·`adb`·에뮬레이터가 이 환경에 없어 Android 네이티브 빌드/실행은 하지 못했다. JS 번들 성공을 네이티브 성공으로 간주하지 않는다.

## iOS 로컬 빌드 복구 (2026-10-14)

커밋 `3bb1b3d`에서 로그인 버튼을 로고형으로 바꾸면서 Roboto 로더·Expo 설정·원본 폰트를 함께 삭제했다. 현재 `SocialButton`, `src/lib/providers.tsx`, `app.config.ts`는 Roboto를 사용하지 않는다. Git에서 제외되는 로컬 `ios/` 산출물만 예전 프로젝트 상태였다. `ios/app.xcodeproj/project.pbxproj`의 파일 참조·Resources 그룹·Copy Bundle Resources와 `ios/app/Info.plist`의 `UIAppFonts`에서 Roboto 한 항목씩 제거했다. 새로운 폰트 파일이나 서비스 코드 변경은 없다. 신선한 prebuild의 정본인 `app.config.ts`는 이미 다섯 폰트만 선언하므로 재생성할 필요가 없었다.

수정 후 iPhone 13 mini 대상 Debug 네이티브 빌드와 설치가 성공했다. 번들 `UIAppFonts`와 실제 `.app` 리소스에는 Pretendard 4종과 Kyobo 1종만 있고 Roboto는 없다. 운영 앱은 시뮬레이터에서 로그인 화면까지 실행돼 두 서체가 표시됐다. 당시에는 인증 세션과 터치 입력 도구가 없어 운영 홈·Lab 조작을 검증하지 못했다. 아래 후속 검증이 Lab의 이 제한을 대체한다. 개발 빌드에서 `expo-notifications`의 `ERR_NOTIFICATIONS_KEYCHAIN_ACCESS` 로그도 관찰됐으며, 화면 실행 자체는 이어졌다.

## iOS 네이티브 Lab 후속 검증 (2026-10-14)

iPhone 13 mini/iOS 26.5의 Expo Go SDK 57에서 Lab을 열고, 임시 디렉터리에 설치한 Maestro CLI로 iOS의 앱 열기 확인창과 Expo Go 첫 실행 안내·개발 메뉴를 실제 터치로 처리했다. 저장소의 앱·Lab 코드는 이 검증을 위해 수정하지 않았다. 시뮬레이터 화면의 바깥 스크롤과 가상 폰 내부 터치가 작동했다.

- 공통 HomeView의 Lab Mock 5d: 완료된 일정 체크를 해제하자 취소선이 사라지고 남은 일정 수가 1개에서 2개로 바뀌었다. 더보기 메뉴의 수정·삭제 항목, 삭제 확인 모달 열기·취소, 일정 추가 후 `Native QA` 행 표시, 수정 편집기 진입·취소를 확인했다. CTA와 쉼터 탭은 서비스 이동 대신 Lab Mock 메시지를 표시했다. 5a 빈 일정의 초대 문구도 네이티브에서 확인했다.
- Claude v2 5d: 날씨 스티커가 맑음에서 흐림으로 바뀌고, Mock 일정 추가와 체크 후 남은 일정 수 변경이 보였다. CTA와 탭도 Lab Mock 메시지만 표시했다. 기존 홈과 Claude 시안 모두 카피바라·날씨·종이 배경·하단 탭이 렌더링됐다.
- Safe Area: 외부 Lab 페이지는 iOS 상단 상태바와 홈 인디케이터를 침범하지 않았고, 375pt 시뮬레이터에서 가상 폰의 하단 탭이 잘리지 않았다. 다만 Expo Go의 파란 개발 도구 버튼이 가상 폰 오른쪽 위 알림 버튼을 가리므로 그 버튼의 터치는 판정할 수 없었다. 글꼴은 한글 글리프가 잘리지 않고 표시됐지만 웹과의 픽셀 단위 일치는 측정하지 않았다.
- 확인된 Lab 차이: 바깥 페이지를 스크롤한 상태에서 일정 더보기 메뉴가 누른 행 바로 아래가 아니라 약 80pt 위에 나타났다. 가상 폰의 축소·스크롤 좌표 변환이 원인일 가능성이 있으나 운영 앱에서도 같은 현상이 있는지는 미확인이다. Mock 일정 입력기의 키보드가 떠 있을 때 첫 저장·취소 탭은 키보드만 내렸고, 키보드를 내린 뒤 다시 탭하면 동작했다. 이를 네이티브 동등성 통과로 처리하지 않는다.

운영 앱은 기존 Kakao·Google·Apple 소셜 로그인과 인증 가드를 그대로 사용한다. 이 시점에는 인증된 테스트 계정이 없어 운영 홈을 검증하지 못했다. 아래 iPhone Air 후속 결과가 이 제한을 대체한다. Lab Mock 조작 결과를 운영 홈 검증 결과로 대신하지 않는다.

## iPhone Air 운영 홈 후속 검증 (2026-10-14)

사용자가 인증 가드를 변경하지 않고 직접 로그인한 iPhone Air/iOS 26.5 시뮬레이터에서 운영 앱 `kr.momentory.app`을 확인했다. 초기 홈은 일정 0개였다. Maestro로 화면을 실제 터치하고 `simctl` 스크린샷으로 배치를 확인했다. 날짜·요일·CTA·카피바라·주간 감정·빈 일정 문구·하단 5개 탭이 렌더링됐으며, 상태바와 홈 인디케이터가 콘텐츠를 가리지 않았다. 한글 글리프와 서체도 눈에 띄는 누락·잘림 없이 표시됐다. 앱과 Lab은 같은 `HomeView`를 사용하므로 주요 화면 조립·토큰은 일치했지만, 운영 데이터·리마인더 문구·시뮬레이터 크기와 Lab 가상 폰 프레임이 달라 픽셀 단위 동등성을 입증한 것은 아니다.

- 홈 본문 스와이프가 입력으로 처리됐고 쉼터 탭 이동 후 홈 복귀가 성공했다. 다만 빈 홈은 한 화면에 모두 들어와 실제 스크롤 거리·긴 일정 목록의 드래그/접기 동작은 이 계정에서 검증할 수 없었다.
- 사용자의 허락을 받아 수동 임시 일정 하나를 생성했다. 체크 후 `오늘 일정을 모두 마쳤어요.` 표시, 재체크 후 `1개 남음` 복귀를 확인했다. 더보기 메뉴의 수정·삭제 항목, 수정 화면 진입과 취소, 삭제 확인 모달의 취소 및 확인을 시험했다. 마지막에 임시 일정을 삭제해 빈 홈으로 복귀했고, 앱 재실행 후에도 빈 홈이 유지되며 접근성 트리에서 임시 제목이 사라진 것을 확인했다. 실제 일정 재정렬·캘린더 일정 숨김은 해당 fixture가 없어 미검증이다.
- CTA `지금 하루 돌아보기`는 운영 회고 첫 질문 화면으로 이동했고, `닫기` 후 홈으로 돌아왔다. 회고를 진행하거나 저장하지 않았다. 이는 화면 이동 검증이며 분석 이벤트의 서버 수신·정확한 순서/횟수를 실측한 것은 아니다(해당 순서는 자동 테스트에서 검증).
- **발견한 위치 차이:** 운영 앱의 더보기 메뉴가 누른 행의 아래가 아니라 행과 겹치며 약 50pt 위에서 시작했다. Lab에서도 메뉴 위치 어긋남이 관찰됐지만 가상 프레임·스크롤 조건이 달라 같은 원인이라고 확정할 수 없다. 운영 어댑터의 `menuTopFromPageY`가 `pageY - insets.top + space.md`를 계산하는 반면 `TabScreen`은 오버레이를 `Screen` 밖에 배치하므로 Safe Area를 중복 보정할 가능성이 있다. 이번 단계는 검증 범위라 디자인/서비스 코드를 수정하지 않았다.

현재 운영 홈은 원래대로 일정 0개이며 인증 상태도 유지된다. Android 네이티브 검증, 긴 목록 스크롤·드래그·5개 접기, 캘린더 일정 숨김, 알림 설정 화면, 실제 운영 이벤트 수신 확인은 남아 있다.

## HomeView 일정 메뉴 좌표 수정 및 재검증 (2026-10-14)

메뉴 오차는 세 계산이 겹친 결과였다. `ScheduleItem`은 행/버튼의 경계가 아닌 손가락의 `pageY`를 보냈고, 운영 홈은 화면 전체 오버레이에 다시 Safe Area 상단 인셋을 뺐다. Lab은 축소된 가상 폰의 `measureInWindow` 좌표를 축소 전 오버레이 좌표로 바꾸지 않았다. 이제 ⋮ 버튼의 `measureInWindow` 위·아래 경계를 읽고, 운영은 화면 좌표를 그대로, Lab은 폰 원점과 배율을 반영해 오버레이 좌표로 변환한다. 메뉴는 기본적으로 버튼 아래 8pt 간격에 띄우고, 탭바·홈 인디케이터 위 공간이 부족하면 버튼 위로 뒤집는다. 기존 단독 `Menu` 호출부는 이전 `top` 동작을 유지한다.

- 운영 iPhone Air/iOS 26.5: 일정 1개에서는 행 아래, 6개에서는 첫째·셋째 행 아래와 다섯째 행 위에 메뉴가 표시됐다. 6개 펼치기 후 본문 스크롤 상태에서 마지막 행 메뉴도 행 위에 표시됐고, 탭바/화면 밖으로 나가지 않았다. 외부 터치 닫기, 수정 진입·취소, 삭제 확인·취소를 다시 시험했다. 사용자 허락으로 추가한 임시 일정 6개는 모두 삭제했고 앱 재실행 후 빈 홈을 확인했다.
- Expo Lab iPhone 13 mini/iOS 26.5: 새 번들로 로드해 390pt 가상 폰의 5d 캘린더 일정 메뉴가 행 아래, 5e 하단 수동 일정 메뉴가 행 위에 표시되는 것을 확인했다. Lab의 바깥 페이지를 스크롤한 상태에서도 배치됐다. Expo Go의 기존 번들은 공유 UI 변경을 반영하지 않아 새 Metro 번들로 검증했다. 가상 폰 **내부**의 긴 목록 스크롤과 Android 네이티브 위치는 이번에 별도 실측하지 못했다.
- Expo Web: 375·390·402·430px 가상 폰에서 5b 단일 미완료 일정과 5e 첫째·중간·마지막 일정, 총 16개 조합의 메뉴/버튼 경계를 브라우저 DOM으로 측정했다. 각 경우 메뉴가 행 아래 또는 위에 양의 간격을 두고 표시됐고 가상 폰 오버레이 내부에 남았다. 브라우저에서는 메뉴 클릭 전 `scrollIntoView`로 대상 행까지 스크롤했다.

좌표·하단 뒤집기 단위 테스트와 운영 홈/Lab Mock 테스트를 추가·조정했다. 데이터 모델·API·Store·Claude v2·Vite Lab은 변경하지 않았다.

Git 정리 시점에 앱·Expo Lab·Vite Lab 타입 검사, ESLint, Prettier, Jest 103개 스위트/1330개 테스트, Vite 빌드, Expo Web 내보내기를 다시 실행해 통과했다. 이 자동 검증은 위의 iOS 실제 터치 결과를 대체하지 않으며 Android 네이티브 검증도 포함하지 않는다.

## iOS 재생성 재현성 (2026-10-14)

기존 `ios/`는 보존하고, `/tmp`의 별도 복사본에서 `.env` 없이 `expo prebuild --platform ios --no-install`, `pod install`, iPhone 13 mini 대상 Debug `xcodebuild`를 완료했다. 새 Xcode 프로젝트의 Copy Bundle Resources·`UIAppFonts`와 빌드된 `.app`에는 Pretendard 4종과 Kyobo 1종만 있으며 `Roboto-Medium.ttf` 참조는 없다. 현재 로컬 `ios/`의 폰트 목록과도 일치한다. 두 프로젝트의 iOS 최소 버전은 16.4, Swift 버전은 5.0, JS 엔진은 Hermes다. 따라서 현 `app.config.ts`로 신선하게 생성할 때 Roboto 문제가 재발할 가능성은 낮다. 이 임시 빌드는 `.env`를 복사하지 않았으므로 소셜 로그인 설정의 동등성까지 증명하지는 않는다. 기존 로컬 iOS 프로젝트의 Debug 빌드도 다시 통과했다.

이번 후속 검사에서 앱·Expo Lab 타입 검사, 린트, 포맷 검사, Jest 103개 스위트/1328개 테스트가 통과했다. Android SDK·`adb`·에뮬레이터가 없어 Android 네이티브 빌드·렌더·터치·메모리 검증은 남아 있다. 무시된 로컬 `android/`에는 이전 `Roboto-Medium.ttf` 산출물이 있지만 운영 소스·Expo 폰트 설정에는 참조가 없다.

## 이전 상태: 경계와 재사용

운영 홈 `app/(tabs)/home.tsx`는 렌더링과 `useDay.load()`의 일정 API 조회, `useDiary`·`useSettings` store, `expo-router` 이동, 분석 `track()`을 한 라우트에 둔다. 이를 Lab에 그대로 마운트하면 금지된 서비스 기능이 실행된다. 따라서 운영 라우트·store·Provider는 가져오지 않았다.

Lab 왼쪽 홈 `src/current-home/HomeView.tsx`는 `CurrentHomeModel`/`CurrentHomeActions` Props만 받는다. 운영 앱의 `Screen`, `BottomNavigation`, `Button`, `Card`, `Icon`, `Menu`, `Modal`, `SectionHeader`, `Text`, `Toast` 및 `HomeCapybara`, `GrassButton`, `ScheduleList`, `WeekEmotionStrip`, 디자인 토큰과 날짜 표시 유틸을 실제로 재사용한다. 라우트 의존 `TabScreen`만 가져오지 않고 `Screen`과 `BottomNavigation`으로 같은 껍데기를 구성했다. 홈의 화면 조립 코드와 일부 표시 계산은 운영 라우트와 별도로 유지된다. 따라서 현재 상태를 **운영 홈 전체와 동일 소스**라고 부르지 않는다.

`src/current-home/MockPreview.tsx`는 Claude 5a~5f의 일정 개수에 맞춘 독립 fixture와 메모리 상태를 제공한다. 일정 체크·추가·제목 수정·삭제·숨기기·순서 변경, 감정 날짜 선택, 카피바라 손짓은 동작한다. 회고·알림·다른 탭은 실제 탐색 대신 Lab 안내만 보인다. Mock 일정 편집기는 서비스의 별도 라우트 화면이 아니라 Lab 전용 입력 오버레이다. 원본 캡처 38개와 Vite Lab은 보존했다.

향후 채택 시에는 선택한 홈 프레젠테이션을 운영 앱이 소유하는 공용 UI 위치로 옮기고, 운영 `home.tsx`가 실제 데이터/행동을 Props로 주입하도록 분리해야 한다. 이 단계에서는 운영 코드·화면을 변경하지 않았으므로 채택 작업은 아직 아니다. 다른 화면도 같은 `model`/`actions` 경계로 점진적으로 추가한다.

## 이전 상태: 웹 검증

- `npm run lab:web -- --port 19018` 실행 및 Chrome 렌더링 확인. 기본 주소와 `#compare/home-main/claude-v2?device=390&scenario=5b`에서 기존 홈 RN UI와 Claude v2가 나란히 표시됐다.
- 375·390·402·430px × 5a~5f의 24개 조합에서 두 폰의 상태바·화면 렌더와 일정 있음/없음 상태를 DOM으로 확인했다. 브라우저에서 기존 홈의 미완료 일정을 클릭하자 “모두 완료” 표시로 바뀌었고 ⋮ 메뉴도 열렸다. Claude 시안의 날씨 스티커는 “맑음”에서 “흐림”으로 바뀌었다. 재로드부터 시나리오 변경까지 API·분석 주소 요청과 런타임 예외는 관찰되지 않았다.
- `expo export --platform all` 성공(웹·iOS·Android 번들). 38개 갤러리 캡처와 홈의 **원본 캡처 참고** 경로 유지.
- `npm run typecheck`, `npm run typecheck:lab`, `npm run typecheck:expo-lab`, `npm run lint`, `npm run format:check`, 전체 Jest 테스트 통과. 새 Mock 단위 테스트는 빈 상태·체크·추가를 다룬다.

## 이전 상태: 남은 차이와 위험

- 운영 홈은 기기 폭으로 `src/design/ds/typography.ts`의 글꼴 배율을 모듈 초기화 때 계산한다. PC 브라우저 안의 폰 프레임은 실제 `Dimensions.get('window')`가 아니므로 웹에서는 폰 크기를 바꿔도 운영 앱과 글꼴 배율이 정확히 같지 않을 수 있다. iOS/Android 실기·시뮬레이터에서 최종 시각 검증이 필요하다.
- 웹에서 일정 체크 효과는 React Native의 네이티브 애니메이션 모듈이 없어 JS 애니메이션으로 대체된다는 개발 서버 경고가 나온다. 체크 상태는 정상 변경되지만 효과의 프레임 타이밍은 모바일과 같다고 검증하지 않았다.
- 기존 홈 라우트와 Lab의 화면 조립부가 아직 중복이다. 향후 운영 홈을 공용 프레젠테이션에 연결하지 않는 한 변경이 자동 동기화되지는 않는다.
- 브라우저에서 일정 체크를 확인했지만 모바일 터치 드래그·모달·키보드·Android 레이아웃은 아직 확인하지 않았다. `expo export --platform web`은 iOS/Android 네이티브 빌드 검증을 대체하지 않는다.
- 공용 UI 일부가 DS barrel import를 사용하므로 웹 번들에 `expo-router` 모듈이 포함된다. 현재 홈 라우트나 서비스 store를 마운트하지 않고, API/인증/분석/알림 함수를 실행하지 않는다. 향후 번들 경계를 더 좁히려면 앱 공용 UI 내부 import 정리가 필요하며 이 단계에서는 운영 코드를 건드리지 않았다.
